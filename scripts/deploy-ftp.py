#!/usr/bin/env python
"""
Publica o app na hospedagem compartilhada (Hostinger) por FTP.

Quando usar: a VPS e o caminho normal (`scripts/deploy.sh` por SSH). Este aqui
e o plano B / hospedagem estatica - o app e uma SPA e todo o backend fica no
Supabase, entao basta subir o `dist/`.

    FTP_HOST=ftp.vest9.com.br FTP_USER=... FTP_PASS=... python scripts/deploy-ftp.py

Por padrao constroi a partir do HEAD do git num diretorio temporario, nao da
pasta de trabalho: evita publicar codigo nao commitado (ja houve trabalho de
outra sessao convivendo no mesmo checkout, com migracao nao aplicada).
Use --aqui para publicar o `dist/` da pasta atual.

Pegadinhas desta hospedagem, descobertas na marra:
- FTPS autentica mas trava no canal de dados: usar FTP simples.
- A conexao cai no meio do lote: reenviar cada arquivo ate 4 vezes, reconectando.
- Conferir o tamanho de cada arquivo no servidor depois de enviar.
- A raiz do FTP e a pasta do site; `--limpar` apaga o que sobrou de versoes
  anteriores (os nomes dos assets levam hash).
"""
import ftplib
import os
import posixpath
import shutil
import subprocess
import sys
import tempfile
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = os.environ.get('FTP_HOST')
USER = os.environ.get('FTP_USER')
PWD = os.environ.get('FTP_PASS')

HTACCESS = """<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
</IfModule>
# O worker do pdf.js (leitura das faturas) quebra se vier como octet-stream.
AddType application/javascript .mjs
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
<FilesMatch "\\.(js|mjs|css|woff2|png|jpg|svg|ico)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "^(index\\.html|env-config\\.js)$">
  Header set Cache-Control "no-cache"
</FilesMatch>
"""


def read_env(path):
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def build_from_head():
    """Exporta o HEAD para um temporario e constroi la (node_modules por junction/symlink)."""
    tmp = tempfile.mkdtemp(prefix='cf-build-')
    tar = os.path.join(tmp, 'head.tar')
    subprocess.run(['git', '-C', REPO, 'archive', 'HEAD', '-o', tar], check=True)
    src = os.path.join(tmp, 'src-tree')
    os.makedirs(src)
    shutil.unpack_archive(tar, src, 'tar')
    os.remove(tar)
    shutil.copy(os.path.join(REPO, '.env'), os.path.join(src, '.env'))
    link = os.path.join(src, 'node_modules')
    target = os.path.join(REPO, 'node_modules')
    if sys.platform == 'win32':
        subprocess.run(['cmd', '/c', 'mklink', '/J', link, target], check=True, capture_output=True)
    else:
        os.symlink(target, link)
    subprocess.run(['npx', 'vite', 'build'], cwd=src, check=True, shell=(sys.platform == 'win32'))
    return os.path.join(src, 'dist'), tmp


def write_runtime_files(dist):
    with open(os.path.join(dist, '.htaccess'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(HTACCESS)
    env = read_env(os.path.join(REPO, '.env'))
    url = env.get('VITE_SUPABASE_URL', '')
    key = env.get('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    if not url or not key:
        sys.exit('.env sem VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY')
    with open(os.path.join(dist, 'env-config.js'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(
            '// Configuracao do app na hospedagem estatica (chave publica anon do Supabase).\n'
            'window.__env = {\n'
            f"  VITE_SUPABASE_URL: '{url}',\n"
            f"  VITE_SUPABASE_PUBLISHABLE_KEY: '{key}',\n"
            '};\n'
        )


def connect():
    f = ftplib.FTP(HOST, timeout=60)
    f.login(USER, PWD)
    f.set_pasv(True)
    return f


def ensure_dir(f, path):
    if not path or path == '.':
        return
    try:
        f.mkd(path)
    except ftplib.error_perm as e:
        if not str(e).startswith('550'):
            raise


def remote_files(f, path='.'):
    out = {}
    try:
        entries = list(f.mlsd(path))
    except Exception:
        return out
    for name, facts in entries:
        if name in ('.', '..'):
            continue
        full = posixpath.join(path, name) if path != '.' else name
        if facts.get('type') == 'dir':
            out.update(remote_files(f, full))
        elif facts.get('type') == 'file':
            out[full] = int(facts.get('size', -1))
    return out


def upload(dist, limpar):
    local = []
    for dirpath, _dirs, filenames in os.walk(dist):
        for fn in filenames:
            abs_p = os.path.join(dirpath, fn)
            rel = os.path.relpath(abs_p, dist).replace(os.sep, '/')
            local.append((rel, abs_p, os.path.getsize(abs_p)))
    local.sort()
    print(f'{len(local)} arquivos para enviar')

    f = connect()
    antes = remote_files(f)
    dirs = sorted({posixpath.dirname(r) for r, _, _ in local if posixpath.dirname(r)})
    for d in dirs:
        ensure_dir(f, d)

    falhas = []
    for rel, abs_p, size in local:
        for tentativa in range(1, 5):
            try:
                with open(abs_p, 'rb') as fh:
                    f.storbinary('STOR ' + rel, fh)
                if f.size(rel) != size:
                    raise IOError('tamanho diferente no servidor')
                print(f'  ok {rel} ({size} B)')
                break
            except Exception as e:
                print(f'  !! {rel} tentativa {tentativa}: {e}')
                time.sleep(2)
                try:
                    f.quit()
                except Exception:
                    pass
                f = connect()
                for d in dirs:
                    ensure_dir(f, d)
        else:
            falhas.append(rel)

    if limpar:
        novos = {r for r, _, _ in local}
        for antigo in sorted(antes, reverse=True):
            if antigo not in novos:
                try:
                    f.delete(antigo)
                    print('  - removido', antigo)
                except Exception as e:
                    print('  ? nao removeu', antigo, e)
    try:
        f.quit()
    except Exception:
        pass
    return falhas


def main():
    if not (HOST and USER and PWD):
        sys.exit('defina FTP_HOST, FTP_USER e FTP_PASS no ambiente')
    aqui = '--aqui' in sys.argv
    limpar = '--manter' not in sys.argv
    tmp = None
    if aqui:
        dist = os.path.join(REPO, 'dist')
        if not os.path.isdir(dist):
            sys.exit('dist/ nao existe; rode npm run build ou tire o --aqui')
    else:
        dist, tmp = build_from_head()
    write_runtime_files(dist)
    falhas = upload(dist, limpar)
    if tmp:
        shutil.rmtree(tmp, ignore_errors=True)
    print('\nfalhas:', falhas or 'nenhuma')
    sys.exit(1 if falhas else 0)


main()
