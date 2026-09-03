import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai@2.19.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Modelo do Gemini. Sobrescrevivel por env para poder subir de versao sem deploy
// de codigo; gemini-2.5-flash e o que roda na camada gratuita.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

// Formato da resposta da IA. O front (useInsights / componentes de Insights)
// depende desta forma exata, entao mudar aqui exige mudar la tambem.
//
// Atencao: o responseSchema do Gemini aceita so um subconjunto do JSON Schema
// (type, properties, required, items, enum, description, min/max). NAO use
// additionalProperties aqui - a API rejeita.
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
      },
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
      description: "Proximas acoes recomendadas (2 a 4 itens)",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          timeframe: { type: "string" },
        },
        required: ["action", "priority", "timeframe"],
      },
    },
  },
  required: ["summary", "patterns", "savings_tips", "monthly_trend", "action_items"],
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY nao esta configurada");
    }

    console.log(`Chamando o Gemini (${GEMINI_MODEL}) para a analise financeira...`);

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    let rawText: string | undefined;
    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Analise os dados financeiros abaixo e forneca insights detalhados:\n\n${financialContext}`,
        config: {
          systemInstruction: `Voce e um consultor financeiro pessoal especializado em analise de gastos e economia. Seu papel e analisar os dados financeiros do usuario e fornecer insights acionaveis.

Responda SEMPRE em portugues brasileiro.

Diretrizes:
1. Seja especifico e pratico nas sugestoes
2. Use os dados reais para fazer comparacoes e identificar padroes
3. Priorize sugestoes por impacto financeiro
4. Seja encorajador mas realista
5. Identifique tanto pontos positivos quanto areas de melhoria`,
          responseMimeType: "application/json",
          responseSchema: INSIGHTS_SCHEMA,
        },
      });
      rawText = result.text;
    } catch (err) {
      // A camada gratuita do Gemini tem limite de requisicoes, entao o 429 e um
      // caso esperado e nao um bug: vira mensagem propria para a UI.
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number; code?: number })?.status ??
        (err as { status?: number; code?: number })?.code;

      if (status === 429 || /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
        return new Response(
          JSON.stringify({ error: "Limite de requisicoes atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 401 || status === 403 || /API key|UNAUTHENTICATED|PERMISSION_DENIED/i.test(msg)) {
        return new Response(
          JSON.stringify({ error: "Chave da API invalida. Verifique a configuracao do servico." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Erro na chamada ao Gemini:", msg);
      throw new Error("Falha ao obter a analise da IA");
    }

    if (!rawText) {
      // Resposta vazia costuma ser bloqueio por filtro de seguranca.
      console.error("Gemini retornou resposta vazia");
      throw new Error("Nao foi possivel gerar a analise para estes dados");
    }

    let insights;
    try {
      // responseMimeType application/json ja devolve JSON puro, mas tirar cercas
      // de markdown evita quebrar caso o modelo escape do formato.
      insights = JSON.parse(rawText.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      console.error("JSON invalido vindo do Gemini:", rawText.slice(0, 500));
      throw new Error("Resposta da IA em formato inesperado");
    }

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
