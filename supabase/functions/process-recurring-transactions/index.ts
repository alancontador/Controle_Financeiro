import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecurringTransaction {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: string;
  frequency: string;
  day_of_month: number | null;
  day_of_week: number | null;
  notes: string | null;
  is_active: boolean;
  next_execution_date: string;
  end_date: string | null;
  installments_total: number | null;
  installments_done: number;
}

/** Proxima data a partir de uma data ISO (aaaa-mm-dd), sem fuso: tudo em UTC. */
export function nextExecutionDate(frequency: string, current: string, dayOfMonth?: number | null): string {
  const [y, m, d] = current.split("-").map(Number);
  let next: Date;
  switch (frequency) {
    case "daily":
      next = new Date(Date.UTC(y, m - 1, d + 1));
      break;
    case "weekly":
      next = new Date(Date.UTC(y, m - 1, d + 7));
      break;
    case "yearly":
      next = new Date(Date.UTC(y + 1, m - 1, Math.min(d, daysInMonth(y + 1, m))));
      break;
    default: {
      // mensal: mesmo dia no mes seguinte, encurtando para o ultimo dia se nao existir (31 -> 30, 28/29)
      const wanted = dayOfMonth ?? d;
      const ny = m === 12 ? y + 1 : y;
      const nm = m === 12 ? 1 : m + 1;
      next = new Date(Date.UTC(ny, nm - 1, Math.min(wanted, daysInMonth(ny, nm))));
    }
  }
  return next.toISOString().slice(0, 10);
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Ate quando gerar hoje: uma recorrencia atrasada ha 3 meses gera as 3 ocorrencias de uma vez. */
const MAX_CATCH_UP = 36;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Pode ser chamada pelo app (so as recorrencias do usuario logado, identificado
    // pelo JWT) ou pelo cron com a chave anon (todas).
    let onlyUser: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (authHeader.startsWith("Bearer ") && authHeader.slice(7) !== anonKey) {
      const asUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data } = await asUser.auth.getUser();
      if (data.user) onlyUser = data.user.id;
    }

    const today = new Date().toISOString().slice(0, 10);
    let query = supabase
      .from("recurring_transactions")
      .select("*")
      .eq("is_active", true)
      .lte("next_execution_date", today);
    if (onlyUser) query = query.eq("user_id", onlyUser);
    const { data: recurringTransactions, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    const results = { processed: 0, created: 0, finished: 0, errors: 0 };

    for (const recurring of (recurringTransactions ?? []) as RecurringTransaction[]) {
      try {
        let next = recurring.next_execution_date;
        let done = recurring.installments_done ?? 0;
        let active = true;
        let guard = 0;

        while (next <= today && active && guard++ < MAX_CATCH_UP) {
          // Prazo final: nao gera ocorrencia depois da data limite.
          if (recurring.end_date && next > recurring.end_date) { active = false; break; }
          if (recurring.installments_total && done >= recurring.installments_total) { active = false; break; }

          const seq = recurring.installments_total ? ` (${done + 1}/${recurring.installments_total})` : "";
          const { error: insertError } = await supabase.from("transactions").insert({
            user_id: recurring.user_id,
            category_id: recurring.category_id,
            description: `${recurring.description}${seq}`,
            amount: recurring.amount,
            type: recurring.type,
            date: next,
            notes: recurring.notes ? `${recurring.notes} (Recorrente)` : "(Recorrente)",
            recurring_id: recurring.id,
          });
          if (insertError) {
            console.error(`Error creating transaction for recurring ${recurring.id}:`, insertError);
            results.errors++;
            break;
          }
          results.created++;
          done++;
          next = nextExecutionDate(recurring.frequency, next, recurring.day_of_month);

          if (recurring.installments_total && done >= recurring.installments_total) active = false;
          if (recurring.end_date && next > recurring.end_date) active = false;
        }

        const { error: updateError } = await supabase
          .from("recurring_transactions")
          .update({
            next_execution_date: next,
            installments_done: done,
            is_active: active,
            last_executed_at: new Date().toISOString(),
          })
          .eq("id", recurring.id);
        if (updateError) console.error(`Error updating recurring transaction ${recurring.id}:`, updateError);
        if (!active) results.finished++;
        results.processed++;
      } catch (error) {
        console.error(`Error processing recurring transaction ${recurring.id}:`, error);
        results.errors++;
      }
    }

    console.log("Processing complete:", results);
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in process-recurring-transactions:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
