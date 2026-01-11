import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Fetch user's transactions from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: transactions, error: transError } = await supabase
      .from("transactions")
      .select("*, category:categories(*)")
      .eq("user_id", user.id)
      .gte("date", sixMonthsAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (transError) {
      console.error("Error fetching transactions:", transError);
      throw new Error("Failed to fetch transactions");
    }

    // Fetch user's budgets
    const { data: budgets, error: budgetError } = await supabase
      .from("budgets")
      .select("*, category:categories(*)")
      .eq("user_id", user.id);

    if (budgetError) {
      console.error("Error fetching budgets:", budgetError);
    }

    // Prepare financial summary for AI
    const totalIncome = transactions
      ?.filter((t: any) => t.type === "income")
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;
    
    const totalExpenses = transactions
      ?.filter((t: any) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    transactions?.filter((t: any) => t.type === "expense").forEach((t: any) => {
      const catName = t.category?.name || "Outros";
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Number(t.amount);
    });

    // Group by month
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    transactions?.forEach((t: any) => {
      const month = t.date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 };
      }
      if (t.type === "income") {
        monthlyData[month].income += Number(t.amount);
      } else {
        monthlyData[month].expenses += Number(t.amount);
      }
    });

    const financialContext = `
Dados Financeiros do Usuário (últimos 6 meses):

RESUMO GERAL:
- Receita Total: R$ ${totalIncome.toFixed(2)}
- Despesas Totais: R$ ${totalExpenses.toFixed(2)}
- Saldo: R$ ${(totalIncome - totalExpenses).toFixed(2)}
- Número de Transações: ${transactions?.length || 0}

GASTOS POR CATEGORIA:
${Object.entries(expensesByCategory)
  .sort(([, a], [, b]) => (b as number) - (a as number))
  .map(([cat, amount]) => `- ${cat}: R$ ${(amount as number).toFixed(2)} (${((amount as number / totalExpenses) * 100).toFixed(1)}%)`)
  .join("\n")}

EVOLUÇÃO MENSAL:
${Object.entries(monthlyData)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, data]) => `- ${month}: Receita R$ ${data.income.toFixed(2)}, Despesas R$ ${data.expenses.toFixed(2)}, Saldo R$ ${(data.income - data.expenses).toFixed(2)}`)
  .join("\n")}

ORÇAMENTOS DEFINIDOS:
${budgets?.length ? budgets.map((b: any) => `- ${b.category?.name || "Categoria"}: R$ ${b.amount} (${b.period})`).join("\n") : "Nenhum orçamento definido"}
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling AI gateway for financial analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um consultor financeiro pessoal especializado em análise de gastos e economia. Seu papel é analisar os dados financeiros do usuário e fornecer insights acionáveis.

Responda SEMPRE em português brasileiro usando formato JSON estruturado através da função fornecida.

Diretrizes:
1. Seja específico e prático nas sugestões
2. Use os dados reais para fazer comparações e identificar padrões
3. Priorize sugestões por impacto financeiro
4. Seja encorajador mas realista
5. Identifique tanto pontos positivos quanto áreas de melhoria`,
          },
          {
            role: "user",
            content: `Analise os dados financeiros abaixo e forneça insights detalhados:\n\n${financialContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_financial_insights",
              description: "Fornecer análise financeira estruturada com insights e sugestões",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "object",
                    properties: {
                      health_score: { type: "number", description: "Pontuação de saúde financeira de 0 a 100" },
                      health_status: { type: "string", enum: ["excellent", "good", "attention", "critical"], description: "Status geral" },
                      main_message: { type: "string", description: "Mensagem principal de até 2 frases" },
                    },
                    required: ["health_score", "health_status", "main_message"],
                  },
                  patterns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        type: { type: "string", enum: ["positive", "negative", "neutral"] },
                        category: { type: "string" },
                      },
                      required: ["title", "description", "type"],
                    },
                    description: "Padrões identificados nos gastos (3-5 itens)",
                  },
                  savings_tips: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        potential_savings: { type: "number", description: "Economia potencial em reais" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        category: { type: "string" },
                      },
                      required: ["title", "description", "potential_savings", "difficulty"],
                    },
                    description: "Sugestões de economia ordenadas por impacto (3-5 itens)",
                  },
                  monthly_trend: {
                    type: "object",
                    properties: {
                      trend: { type: "string", enum: ["improving", "stable", "declining"] },
                      description: { type: "string" },
                    },
                    required: ["trend", "description"],
                  },
                  action_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        timeframe: { type: "string" },
                      },
                      required: ["action", "priority", "timeframe"],
                    },
                    description: "Próximas ações recomendadas (2-4 itens)",
                  },
                },
                required: ["summary", "patterns", "savings_tips", "monthly_trend", "action_items"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_financial_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI analysis");
    }

    const aiResponse = await response.json();
    console.log("AI response received:", JSON.stringify(aiResponse).substring(0, 500));

    // Extract the function call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "provide_financial_insights") {
      throw new Error("Invalid AI response format");
    }

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ insights, rawData: { totalIncome, totalExpenses, expensesByCategory } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analyze finances error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
