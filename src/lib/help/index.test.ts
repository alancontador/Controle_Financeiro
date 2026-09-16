import { describe, expect, it } from "vitest";
import { HELP_FAQ, HELP_GUIDES, faqForRoute, guideForRoute, searchFaq, suggestionsForRoute } from "./index";

describe("guideForRoute", () => {
  it("abre o guia da tela atual e prefere o prefixo mais especifico", () => {
    expect(guideForRoute("/")?.id).toBe("dashboard");
    expect(guideForRoute("/cartoes")?.id).toBe("cartoes");
    expect(guideForRoute("/cartoes/abc/faturas")?.id).toBe("faturas");
    expect(guideForRoute("/transactions")?.id).toBe("transacoes");
  });

  it("nao casa o dashboard com outras rotas nem inventa guia", () => {
    expect(guideForRoute("/rota-inexistente")).toBeUndefined();
  });
});

describe("faqForRoute", () => {
  it("poe as duvidas da tela atual primeiro sem perder nenhuma", () => {
    const list = faqForRoute("/pessoas");
    expect(list).toHaveLength(HELP_FAQ.length);
    expect(list[0].route).toBe("/pessoas");
    const firstOther = list.findIndex((f) => f.route !== "/pessoas");
    expect(list.slice(firstOther).some((f) => f.route === "/pessoas")).toBe(false);
  });
});

describe("searchFaq", () => {
  it("ignora acento e caixa", () => {
    const hits = searchFaq("LIMITE utilizado");
    expect(hits.map((f) => f.id)).toContain("faq-limite-diferente");
    expect(searchFaq("terceiro").map((f) => f.id)).toContain("faq-terceiro");
    expect(searchFaq("TERCEIRÓ")).toEqual(searchFaq("terceiro"));
  });

  it("exige todas as palavras e devolve tudo para busca vazia", () => {
    expect(searchFaq("fatura xyznaoexiste")).toHaveLength(0);
    expect(searchFaq("   ")).toHaveLength(HELP_FAQ.length);
  });
});

describe("suggestionsForRoute", () => {
  it("sugere ate 3 perguntas ligadas a tela", () => {
    const s = suggestionsForRoute("/cartoes");
    expect(s.length).toBeLessThanOrEqual(3);
    expect(s[0]).toContain("Cartões");
  });
});

describe("conteudo", () => {
  it("todo guia tem passos e ids unicos", () => {
    const ids = new Set([...HELP_GUIDES.map((g) => g.id), ...HELP_FAQ.map((f) => f.id)]);
    expect(ids.size).toBe(HELP_GUIDES.length + HELP_FAQ.length);
    for (const g of HELP_GUIDES) expect(g.steps.length).toBeGreaterThan(0);
  });
});
