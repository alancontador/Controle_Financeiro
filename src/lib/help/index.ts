// Base de conhecimento do painel de ajuda. O conteudo mora em
// supabase/functions/_shared para a edge function support-chat responder a
// partir do mesmo texto que o usuario ve nos guias e no FAQ.
import {
  HELP_GUIDES,
  HELP_FAQ,
  type HelpGuide,
  type HelpFaq,
} from "../../../supabase/functions/_shared/help-content";

export { HELP_GUIDES, HELP_FAQ };
export type { HelpGuide, HelpFaq };

/** Rota casa com o guia: "/" so exato; as demais por prefixo. */
export function routeMatches(guideRoute: string, pathname: string): boolean {
  if (guideRoute === "/") return pathname === "/";
  return pathname.startsWith(guideRoute);
}

/**
 * Guia mais especifico para a tela atual (o de prefixo mais longo), para o
 * painel abrir ja no lugar certo. "Primeiros passos" e generico e fica de fora.
 */
export function guideForRoute(pathname: string): HelpGuide | undefined {
  return HELP_GUIDES
    .filter((g) => g.id !== "primeiros-passos" && routeMatches(g.route, pathname))
    .sort((a, b) => b.route.length - a.route.length)[0];
}

/** FAQ com as duvidas da tela atual primeiro. */
export function faqForRoute(pathname: string): HelpFaq[] {
  const here = HELP_FAQ.filter((f) => f.route && routeMatches(f.route, pathname));
  const rest = HELP_FAQ.filter((f) => !here.includes(f));
  return [...here, ...rest];
}

/** Sugestoes de pergunta para o chat, de acordo com a tela. */
export function suggestionsForRoute(pathname: string): string[] {
  const guide = guideForRoute(pathname);
  const faqs = faqForRoute(pathname).slice(0, 2).map((f) => f.question);
  const base = guide ? [`Como uso a tela ${guide.title}?`] : ["Por onde eu começo?"];
  return [...base, ...faqs].slice(0, 3);
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Busca simples (sem acento, sem caixa) em pergunta e resposta. */
export function searchFaq(query: string, items: HelpFaq[] = HELP_FAQ): HelpFaq[] {
  const q = normalize(query.trim());
  if (!q) return items;
  const terms = q.split(/\s+/);
  return items.filter((f) => {
    const hay = normalize(`${f.question} ${f.answer}`);
    return terms.every((t) => hay.includes(t));
  });
}
