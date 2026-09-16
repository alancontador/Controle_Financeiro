import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bot, Loader2, RotateCcw, SendHorizontal, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { useSupportChat } from "@/hooks/useSupportChat";
import { suggestionsForRoute } from "@/lib/help";
import { SimpleMarkdown } from "./SimpleMarkdown";

interface Props {
  /** Rota atual, usada nas sugestoes de pergunta. */
  page: string;
  /** Estado do chat vive no HelpWidget para sobreviver a troca de aba. */
  chat: ReturnType<typeof useSupportChat>;
}

export function SupportChat({ page, chat }: Props) {
  const { messages, sending, send, retry, clear } = chat;
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  const submit = async () => {
    const text = draft;
    setDraft("");
    await send(text);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  // Sugestoes so no comeco da conversa, para nao poluir depois.
  const showSuggestions = messages.length <= 1 && !sending;
  // Erro na ultima resposta, ou pergunta sem resposta (erro nao e persistido,
  // entao apos reload sobra so a pergunta): oferece reenviar.
  const last = messages[messages.length - 1];
  const lastFailed = !!last && (last.error || last.role === "user");

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="space-y-3 py-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                  m.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : m.error
                      ? "rounded-bl-md border border-destructive/40 bg-destructive/10 text-foreground"
                      : "rounded-bl-md bg-secondary text-foreground",
                )}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                ) : (
                  <SimpleMarkdown text={m.content} />
                )}
              </div>
              {m.role === "user" && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Suporte digitando…
            </div>
          )}

          {lastFailed && !sending && (
            <div className="flex justify-start">
              <Button variant="outline" size="sm" onClick={() => void retry()}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Tentar de novo
              </Button>
            </div>
          )}

          {showSuggestions && (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestionsForRoute(page).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escreva sua dúvida… (Enter envia)"
            rows={2}
            maxLength={2000}
            className="min-h-[44px] resize-none text-sm"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={() => void submit()}
            disabled={sending || !draft.trim()}
            aria-label="Enviar"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Assistente com IA. Confira informações importantes.</span>
          {messages.length > 1 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Limpar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
