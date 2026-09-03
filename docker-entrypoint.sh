#!/bin/sh
set -e

# Gera env-config.js com as variaveis do container em runtime.
cat > /usr/share/nginx/html/env-config.js <<INNER
window.__env = {
  VITE_SUPABASE_URL: '${VITE_SUPABASE_URL}',
  VITE_SUPABASE_PUBLISHABLE_KEY: '${VITE_SUPABASE_PUBLISHABLE_KEY}',
};
INNER

echo "env-config.js gerado (VITE_SUPABASE_URL=${VITE_SUPABASE_URL})"
exec nginx -g 'daemon off;'
