import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SupportMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Mensagem do assistente que falhou: mostra o erro e permite tentar de novo. */
  error?: boolean;
}

const STORAGE_KEY = "fincontrol.support-chat";
// Quantas mensagens guardar/enviar: a edge function corta em 16, entao mandar
// mais so gasta banda.
const HISTORY_LIMIT = 16;

const WELCOME: SupportMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Oi! Sou o suporte do FinControl. Posso explicar como usar qualquer tela, dar um passo a passo ou tirar dúvidas sobre faturas, pessoas, orçamentos e o resto. O que você precisa?",
};

function load(): SupportMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Conversa com a edge function support-chat. O historico fica no localStorage
 * para sobreviver ao fechar do painel e ao reload, mas e por navegador.
 */
export function useSupportChat(page: string) {
  const [messages, setMessages] = useState<SupportMessage[]>(load);
  const [sending, setSending] = useState(false);
  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => {
    try {
      // Nao persiste erros: ao reabrir, a conversa fica limpa para tentar de novo.
      const clean = messages.filter((m) => !m.error).slice(-(HISTORY_LIMIT + 1));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // localStorage indisponivel (modo privado etc.): segue so em memoria
    }
  }, [messages]);

  const ask = useCallback(async (history: SupportMessage[]) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: {
          page: pageRef.current,
          messages: history
            .filter((m) => m.id !== WELCOME.id && !m.error)
            .slice(-HISTORY_LIMIT)
            .map((m) => ({ role: m.role, content: m.content })),
        },
      });

      // Erros HTTP (429, 500) vem em `error` com o corpo JSON no context.
      let message = data?.error as string | undefined;
      if (error && !message) {
        const ctx = (error as { context?: Response }).context;
        try {
          message = ctx ? (await ctx.clone().json())?.error : undefined;
        } catch {
          // corpo nao era JSON
        }
        // Sem corpo JSON e falha de rede/funcao indisponivel: a mensagem do
        // SDK vem em ingles ("Failed to send a request..."), entao traduz.
        message ??= error.name === "FunctionsFetchError"
          ? "Não consegui falar com o suporte agora. Verifique sua conexão e tente de novo."
          : error.message;
      }
      if (message) throw new Error(message);
      if (!data?.reply) throw new Error("Resposta vazia do suporte.");

      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: data.reply }]);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Não consegui falar com o suporte agora.";
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: text, error: true }]);
    } finally {
      setSending(false);
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      const next = [...messages.filter((m) => !m.error), { id: newId(), role: "user" as const, content }];
      setMessages(next);
      await ask(next);
    },
    [messages, sending, ask],
  );

  /** Reenvia a ultima pergunta depois de um erro. */
  const retry = useCallback(async () => {
    if (sending) return;
    const clean = messages.filter((m) => !m.error);
    if (clean[clean.length - 1]?.role !== "user") return;
    setMessages(clean);
    await ask(clean);
  }, [messages, sending, ask]);

  const clear = useCallback(() => setMessages([WELCOME]), []);

  return { messages, sending, send, retry, clear };
}
