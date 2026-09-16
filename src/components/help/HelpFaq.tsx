import { useMemo, useState } from "react";
import { MessageCircleQuestion, Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { faqForRoute, searchFaq } from "@/lib/help";

interface Props {
  page: string;
  /** Leva a pergunta digitada para o chat quando o FAQ nao tem resposta. */
  onAskSupport: (question: string) => void;
}

export function HelpFaq({ page, onAskSupport }: Props) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => searchFaq(query, faqForRoute(page)), [query, page]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar dúvida… (ex.: fatura, pessoa, limite)"
          className="pl-9"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {items.length ? (
          <Accordion type="single" collapsible>
            {items.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id} className="border-border">
                <AccordionTrigger className="py-3 text-left text-sm hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
            <MessageCircleQuestion className="h-8 w-8 text-muted-foreground/60" />
            <p>Nenhuma dúvida cadastrada bate com “{query}”.</p>
            <Button variant="outline" size="sm" onClick={() => onAskSupport(query)}>
              Perguntar ao suporte
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
