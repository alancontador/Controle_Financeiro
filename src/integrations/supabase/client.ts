import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Em producao as variaveis sao injetadas em runtime pelo docker-entrypoint.sh
// (window.__env); em desenvolvimento vem do .env via Vite.
declare global {
  interface Window {
    __env?: {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_PUBLISHABLE_KEY?: string;
    };
  }
}

const SUPABASE_URL =
  window.__env?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
  window.__env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    'Supabase nao configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'placeholder',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
