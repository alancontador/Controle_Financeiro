import { supabase } from '@/integrations/supabase/client';
import { notifyDataChanged } from '@/lib/dataEvents';

let lastRun = 0;
/**
 * Gera agora as ocorrencias vencidas do usuario logado (a funcao roda no
 * servidor; o cron diario continua como garantia). Chamada ao abrir o app e
 * ao salvar uma recorrencia; no maximo uma vez por minuto.
 */
export async function processRecurringNow(force = false): Promise<number> {
  if (!force && Date.now() - lastRun < 60_000) return 0;
  lastRun = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke<{ results?: { created?: number } }>('process-recurring-transactions', { body: {} });
    if (error) return 0;
    const created = data?.results?.created ?? 0;
    if (created > 0) notifyDataChanged('transactions');
    return created;
  } catch {
    return 0;
  }
}
