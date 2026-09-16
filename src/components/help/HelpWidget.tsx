import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, HelpCircle, Mail, MessageCircle, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSupportChat } from "@/hooks/useSupportChat";
import { supportContacts } from "@/lib/help/support-contact";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SupportChat } from "./SupportChat";
import { HelpGuides } from "./HelpGuides";
import { HelpFaq } from "./HelpFaq";

type Tab = "chat" | "guias" | "duvidas";

/**
 * Botao "?" fixo no canto inferior direito de todas as telas logadas. Abre um
 * painel lateral com o chat de suporte, os guias passo a passo e o FAQ.
 * O estado do chat fica aqui (e nao na aba) para a conversa nao sumir ao
 * trocar de aba ou fechar o painel.
 */
export function HelpWidget() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const chat = useSupportChat(pathname);
  const contacts = supportContacts();

  // Atalho: "?" (Shift+/) abre a ajuda fora de campos de texto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!user) return null;

  const askSupport = (question: string) => {
    setTab("chat");
    void chat.send(question);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            aria-label="Ajuda e suporte"
            onClick={() => setOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className={cn(
              "fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full lg:bottom-6 lg:right-6 lg:h-14 lg:w-14",
              "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg glow-primary",
              "text-2xl font-bold leading-none select-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            ?
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="left">Ajuda e suporte</TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
            <SheetTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <HelpCircle className="h-4 w-4" />
              </span>
              Central de ajuda
            </SheetTitle>
            <SheetDescription>
              Tire dúvidas, veja o passo a passo de cada tela ou fale com o suporte.
            </SheetDescription>
          </SheetHeader>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="mx-5 mt-4 grid grid-cols-3">
              <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
                <MessageSquareText className="h-3.5 w-3.5" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="guias" className="gap-1.5 text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5" />
                Passo a passo
              </TabsTrigger>
              <TabsTrigger value="duvidas" className="gap-1.5 text-xs sm:text-sm">
                <HelpCircle className="h-3.5 w-3.5" />
                Dúvidas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-0 min-h-0 flex-1 px-5 pb-4 pt-2 data-[state=inactive]:hidden">
              <SupportChat page={pathname} chat={chat} />
            </TabsContent>
            <TabsContent value="guias" className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2 data-[state=inactive]:hidden">
              <HelpGuides page={pathname} onNavigate={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="duvidas" className="mt-0 min-h-0 flex-1 px-5 pb-4 pt-2 data-[state=inactive]:hidden">
              <HelpFaq page={pathname} onAskSupport={askSupport} />
            </TabsContent>
          </Tabs>

          {contacts.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
              <span>Prefere falar com uma pessoa?</span>
              <div className="flex gap-2">
                {contacts.map((c) => (
                  <a
                    key={c.kind}
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 font-medium text-foreground transition-colors hover:border-primary/40"
                  >
                    {c.kind === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
