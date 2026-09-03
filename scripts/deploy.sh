#!/bin/sh
# Deploy do Controle Financeiro na VPS.
#
# Rode NA VPS:   ssh hostinger-vps 'sh /opt/controle-financeiro/scripts/deploy.sh'
# Ou de fora:    ssh hostinger-vps 'cd /opt/controle-financeiro && git pull && sh scripts/deploy.sh'
#
# O app roda como servico Docker Swarm proprio (fora dos projetos do EasyPanel,
# que estao no teto da licenca) e e roteado pelo Traefik via
# /etc/easypanel/traefik/config/controle-financeiro.yaml.
set -e

REPO_DIR=/opt/controle-financeiro
IMAGE=127.0.0.1:5000/controle-financeiro
SERVICE=controle-financeiro

cd "$REPO_DIR"

echo "==> Atualizando o codigo"
git fetch --depth 1 origin main
git reset --hard origin/main

echo "==> Build da imagem"
docker build -t "$IMAGE:latest" .

echo "==> Publicando no registry interno"
docker push "$IMAGE:latest"

echo "==> Atualizando o servico"
# --force porque a tag e sempre :latest; sem isso o swarm nao vê mudanca.
docker service update --force --image "$IMAGE:latest" "$SERVICE"

echo "==> Pronto. Estado do servico:"
docker service ls --filter name="$SERVICE"
