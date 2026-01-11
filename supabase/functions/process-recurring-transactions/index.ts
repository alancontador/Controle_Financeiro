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
}

function calculateNextExecutionDate(
  frequency: string,
  currentDate: Date,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): string {
  const next = new Date(currentDate);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth) {
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDayOfMonth));
      }
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];
    console.log(`Processing recurring transactions for date: ${today}`);

    // Get all active recurring transactions that need to be executed
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("is_active", true)
      .lte("next_execution_date", today);

    if (fetchError) {
      console.error("Error fetching recurring transactions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${recurringTransactions?.length || 0} recurring transactions to process`);

    const results = {
      processed: 0,
      created: 0,
      errors: 0,
    };

    if (recurringTransactions && recurringTransactions.length > 0) {
      for (const recurring of recurringTransactions as RecurringTransaction[]) {
        try {
          // Create the transaction
          const { error: insertError } = await supabase.from("transactions").insert({
            user_id: recurring.user_id,
            category_id: recurring.category_id,
            description: recurring.description,
            amount: recurring.amount,
            type: recurring.type,
            date: recurring.next_execution_date,
            notes: recurring.notes ? `${recurring.notes} (Recorrente)` : "(Recorrente)",
          });

          if (insertError) {
            console.error(`Error creating transaction for recurring ${recurring.id}:`, insertError);
            results.errors++;
            continue;
          }

          results.created++;

          // Calculate next execution date
          const nextDate = calculateNextExecutionDate(
            recurring.frequency,
            new Date(recurring.next_execution_date),
            recurring.day_of_month,
            recurring.day_of_week
          );

          // Update the recurring transaction
          const { error: updateError } = await supabase
            .from("recurring_transactions")
            .update({
              next_execution_date: nextDate,
              last_executed_at: new Date().toISOString(),
            })
            .eq("id", recurring.id);

          if (updateError) {
            console.error(`Error updating recurring transaction ${recurring.id}:`, updateError);
          }

          results.processed++;
          console.log(`Processed recurring transaction ${recurring.id}, next execution: ${nextDate}`);
        } catch (error) {
          console.error(`Error processing recurring transaction ${recurring.id}:`, error);
          results.errors++;
        }
      }
    }

    console.log(`Processing complete:`, results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in process-recurring-transactions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
