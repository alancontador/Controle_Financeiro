# Revisão ponta a ponta — 2026-09-18

Problemas relatados pelo usuário e o que foi encontrado ao reproduzir em produção
(usuário de teste, larguras 390 / 1024 / 1180 / 1366).

## Diagnóstico

| Relato | Causa encontrada | Correção |
|---|---|---|
| Scroll de alguns formulários não funciona | `HierarchicalCategorySelector` é um Popover dentro de Dialog: o bloqueio de scroll do Dialog (react-remove-scroll) engole a roda do mouse na lista de categorias | `<Popover modal>` (o popover passa a ter o próprio bloqueio) |
| Página rola para os lados | Dashboard a 1024px: header estoura 12px (busca + botões sem `min-w-0`); Relatórios no celular: lista de abas mais larga que a tela; tabelas de fatura/relatório com 7 colunas em cards de ~800px | header com `min-w-0`/quebra; abas roláveis; `overflow-x: clip` no `body` como rede de segurança; menu recolhível libera 192px |
| Menu lateral recolhido depois de um tempo | não existia | sidebar recolhe para trilho de ícones após 8 s sem interação; expande ao passar o mouse; botão de fixar; preferência em `localStorage`; `--sidebar-w` move o conteúdo |
| Tesoura não aparece na revisão da fatura importada | só existia na tela da fatura | botão de dividir na revisão; a divisão vai junto no `importInvoice` e é lembrada em `attribution_memory` |
| Dashboards não atualizam | cada hook busca uma vez no `mount` e nada avisa os outros; dashboard fixo no mês corrente (faturas importadas são do mês anterior) | barramento `dataEvents` (toda mutação notifica; hooks refazem a busca, também ao voltar o foco da aba); seletor de mês no dashboard |
| Receitas não sincronizam | receita recorrente ("Salário") nunca virou transação: a função só roda às 06:00 UTC, cria UMA ocorrência por dia mesmo atrasada, e a modal gravava a próxima execução um mês à frente | função recalcula todas as ocorrências vencidas de uma vez; app dispara a função ao abrir e ao salvar recorrência; modal calcula a próxima data pelo dia do mês |
| Prazo final / nº de parcelas na recorrência | não existia | colunas `end_date`, `installments_total`, `installments_done`; UI "Duração: sem fim / até data / N parcelas"; descrição "(3/10)"; desativa ao terminar |
| Editar pessoas cadastradas | só cadastrar/remover terceiros | editar nome/tipo/observações; renomear propaga (RPC `rename_person`) e guarda o nome da fatura como apelido para as próximas importações |
| Cadastro / recuperar senha como no Conciliação Pro | login só com e-mail/senha, sem recuperação | abas Entrar / Criar conta / Recuperar; confirmação de e-mail com reenvio; `/reset-password` (link PKCE, sessão implícita ou código OTP) |
| UX, gráficos e análises | — | seletor de mês; cartões de estatística com comparação; tooltips em R$; estados vazios com orientação |

## Ordem de execução

1. Recorrências (migração + função + modal + disparo no app)
2. `dataEvents` + dashboard por mês + header
3. Layout: sidebar recolhível, popover modal, overflow, abas
4. Divisão na revisão da fatura
5. Pessoas: editar / renomear / apelidos
6. Auth: cadastro, confirmação, recuperação de senha + config do Supabase
7. Polimento de UX/gráficos
8. tsc / vitest / build / deploy / E2E com usuário de teste (apagado ao final)

Observação: há trabalho de Open Finance (Pluggy) não commitado de outra sessão no
mesmo checkout. Não é tocado nem commitado aqui; commits desta revisão adicionam
só os arquivos desta revisão (para `App.tsx`/`Sidebar.tsx`, só o hunk próprio).
