import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai@2.19.0";
import { APP_NAME, knowledgeBaseText } from "../_shared/help-content.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mesmo modelo/camada gratuita do analyze-finances.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

// Limites do que o front pode mandar: o historico e reenviado inteiro a cada
// mensagem, entao isso segura o tamanho do prompt (e a cota gratuita).
const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 2000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Você é o assistente de suporte do ${APP_NAME}, um app de controle financeiro pessoal (transações, categorias, orçamentos, metas, cartões de crédito com importação de fatura em PDF, pessoas da casa, investimentos, relatórios e insights com IA).

Seu trabalho: tirar dúvidas sobre como usar o app, dar passo a passo e explicar por que o app se comporta de certo jeito.

Regras:
- Responda SEMPRE em português brasileiro, de forma direta e amigável. Trate o usuário por "você".
- Baseie-se APENAS na base de conhecimento abaixo. Se a resposta não estiver lá, diga que não tem essa informação e sugira o caminho mais próximo (tela ou ação) — nunca invente funcionalidade, botão ou tela.
- Quando for um "como fazer", responda em passos numerados curtos, citando o nome da tela e do botão como aparecem no app (ex.: Cartões > Importar fatura).
- Seja breve: no máximo ~8 linhas, a não ser que o usuário peça um guia completo.
- Você não tem acesso aos dados financeiros do usuário; se ele perguntar sobre os próprios números, explique onde ver no app.
- Não dê conselho de investimento nem recomendação financeira específica; para análise dos gastos, aponte a tela Insights.
- Formatação: texto simples, listas com "-" ou "1.", e **negrito** só para nomes de telas/botões. Sem tabelas, sem títulos em markdown.
- Se o usuário relatar um problema que parece bug (erro, número errado, fatura não reconhecida), peça os detalhes úteis (qual tela, qual banco, o que esperava ver) e diga que o relato vai ajudar a corrigir.

Base de conhecimento:

${knowledgeBaseText()}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // So usuario logado conversa com o suporte (a cota da IA e compartilhada).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    let body: { messages?: unknown; page?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      // sem body: cai na validacao abaixo
    }

    const messages: ChatMessage[] = Array.isArray(body.messages)
      ? (body.messages as unknown[])
        .filter((m): m is ChatMessage =>
          !!m && typeof m === "object" &&
          ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
          typeof (m as ChatMessage).content === "string" && (m as ChatMessage).content.trim().length > 0
        )
        .slice(-MAX_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
      : [];

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return new Response(
        JSON.stringify({ error: "Envie ao menos uma mensagem do usuário." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Tela em que o usuario esta: ajuda o modelo a escolher o guia certo.
    const page = typeof body.page === "string" ? body.page.slice(0, 200) : "";
    const contents = messages.map((m, i) => {
      const isLast = i === messages.length - 1;
      const text = isLast && page && m.role === "user"
        ? `[O usuário está na tela ${page}]\n${m.content}`
        : m.content;
      return { role: m.role === "user" ? "user" : "model", parts: [{ text }] };
    });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY nao esta configurada");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    let reply: string | undefined;
    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      });
      reply = result.text;
    } catch (err) {
      // Mesmo tratamento do analyze-finances: 429 da camada gratuita e esperado.
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number; code?: number })?.status ??
        (err as { status?: number; code?: number })?.code;

      if (status === 429 || /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
        return new Response(
          JSON.stringify({ error: "O suporte está ocupado agora. Tente de novo em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 401 || status === 403 || /API key|UNAUTHENTICATED|PERMISSION_DENIED/i.test(msg)) {
        return new Response(
          JSON.stringify({ error: "Chave da API inválida. Verifique a configuração do serviço." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("Erro na chamada ao Gemini:", msg);
      throw new Error("Falha ao obter resposta do suporte");
    }

    if (!reply || !reply.trim()) {
      throw new Error("Não consegui responder a essa mensagem. Tente reformular.");
    }

    return new Response(JSON.stringify({ reply: reply.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
