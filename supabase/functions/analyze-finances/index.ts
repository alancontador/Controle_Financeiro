import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.123.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Formato da resposta da IA. O front (useInsights / componentes de Insights)
// depende desta forma exata, entao mudar aqui exige mudar la tambem.
const INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        health_score: { type: "number", description: "Pontuacao de saude financeira de 0 a 100" },
        health_status: { type: "string", enum: ["excellent", "good", "attention", "critical"] },
        main_message: { type: "string", description: "Mensagem principal de ate 2 frases" },
      },
      required: ["health_score", "health_status", "main_message"],
      additionalProperties: false,
    },
    patterns: {
      type: "array",
      description: "Padroes identificados nos gastos (3 a 5 itens)",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          type: { type: "string", enum: ["positive", "negative", "neutral"] },
          category: { type: "string" },
        },
        required: ["title", "description", "type", "category"],
        additionalProperties: false,
      },
    },
    savings_tips: {
      type: "array",
      description: "Sugestoes de economia ordenadas por impacto (3 a 5 itens)",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          potential_savings: { type: "number", description: "Economia potencial em reais" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          category: { type: "string" },
        },
        required: ["title", "description", "potential_savings", "difficulty", "category"],
        additionalProperties: false,
      },
    },
    monthly_trend: {
      type: "object",
      properties: {
        trend: { type: "string", enum: ["improving", "stable", "declining"] },
        description: { type: "string" },
      },
      required: ["trend", "description"],
      additionalProperties: false,
    },
    action_items: {
      type: "array",
      description: "Proximas acoes recomendadas (2 a 4 itens)",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          timeframe: { type: "string" },
        },
        required: ["action", "priority", "timeframe"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "patterns", "savings_tips", "monthly_trend", "action_items"],
  additionalProperties: false,
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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY nao esta configurada");
    }

    console.log("Chamando a API da Anthropic para a analise financeira...");

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    let message;
    try {
      message = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 16000,
        system: `Voce e um consultor financeiro pessoal especializado em analise de gastos e economia. Seu papel e analisar os dados financeiros do usuario e fornecer insights acionaveis.

Responda SEMPRE em portugues brasileiro.

Diretrizes:
1. Seja especifico e pratico nas sugestoes
2. Use os dados reais para fazer comparacoes e identificar padroes
3. Priorize sugestoes por impacto financeiro
4. Seja encorajador mas realista
5. Identifique tanto pontos positivos quanto areas de melhoria`,
        messages: [
          {
            role: "user",
            content: `Analise os dados financeiros abaixo e forneca insights detalhados:\n\n${financialContext}`,
          },
        ],
        output_config: {
          format: { type: "json_schema", schema: INSIGHTS_SCHEMA },
        },
      });
    } catch (err) {
      // Erros da API viram status HTTP proprios para a UI diferenciar
      // "tente de novo" de "arrume a configuracao".
      if (err instanceof Anthropic.RateLimitError) {
        return new Response(
          JSON.stringify({ error: "Limite de requisicoes atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (err instanceof Anthropic.AuthenticationError) {
        return new Response(
          JSON.stringify({ error: "Chave da API invalida. Verifique a configuracao do servico." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (err instanceof Anthropic.APIError) {
        console.error("Erro da API Anthropic:", err.status, err.message);
        throw new Error("Falha ao obter a analise da IA");
      }
      throw err;
    }

    if (message.stop_reason === "refusal") {
      console.error("Requisicao recusada:", message.stop_details);
      throw new Error("Nao foi possivel gerar a analise para estes dados");
    }

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta da IA em formato inesperado");
    }

    const insights = JSON.parse(textBlock.text);

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
