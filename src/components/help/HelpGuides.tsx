import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lightbulb } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HELP_GUIDES, guideForRoute } from "@/lib/help";

interface Props {
  page: string;
  /** Fecha o painel ao navegar para outra tela. */
  onNavigate: () => void;
}

export function HelpGuides({ page, onNavigate }: Props) {
  // Abre ja no guia da tela atual; o estado e local para o usuario poder
  // fechar/abrir outros sem o painel "puxar" de volta.
  const [open, setOpen] = useState<string | undefined>(() => guideForRoute(page)?.id ?? "primeiros-passos");
  const current = guideForRoute(page)?.id;

  return (
    <Accordion type="single" collapsible value={open} onValueChange={setOpen} className="pr-1">
      {HELP_GUIDES.map((guide) => {
        const isHere = guide.id === current;
        const showLink = !isHere && guide.route !== "/cartoes/";
        return (
          <AccordionItem key={guide.id} value={guide.id} className="border-border">
            <AccordionTrigger className="py-3 text-left text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                {guide.title}
                {isHere && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    esta tela
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              <p className="mb-3">{guide.summary}</p>
              <ol className="space-y-2">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed text-foreground/90">{step}</span>
                  </li>
                ))}
              </ol>
              {guide.tips?.length ? (
                <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
                  {guide.tips.map((tip, i) => (
                    <p key={i} className="flex gap-2 leading-relaxed [&+&]:mt-1.5">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      <span>{tip}</span>
                    </p>
                  ))}
                </div>
              ) : null}
              {showLink && (
                <Link
                  to={guide.route}
                  onClick={onNavigate}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Ir para {guide.title}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
