// Sobrescrito em runtime pelo docker-entrypoint.sh dentro do container.
// Em desenvolvimento local os valores vem do .env (Vite).
window.__env = {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_PUBLISHABLE_KEY: '',
};
