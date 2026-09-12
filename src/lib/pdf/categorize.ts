/**
 * Sugestao de categoria para lancamentos de cartao, em tres niveis:
 * 1. memoria - o que o usuario ja categorizou com a mesma descricao (vence sempre);
 * 2. regras por palavra-chave, das mais especificas para as mais genericas;
 * 3. "Outros".
 *
 * Os nomes de categoria sao os das categorias padrao do app (useCategories),
 * para o lancamento cair direto na categoria certa do usuario.
 */

export type CategorySource = 'memory' | 'rule' | 'fallback';

export interface CategorySuggestion {
  category: string;
  source: CategorySource;
}

/** Descricao -> categoria, com a descricao ja normalizada por `normalizeDescription`. */
export type CategoryMemory = ReadonlyMap<string, string>;

export const FALLBACK_CATEGORY = 'Outros';

/**
 * Chave estavel para reconhecer "a mesma compra" entre faturas: maiusculas,
 * sem acento, sem parcela ("09/10"), sem numeros de loja/terminal ("617",
 * "PAULO497"), espacos unicos. Numeros que abrem a palavra ficam (99APP).
 */
export function normalizeDescription(description: string): string {
  return description
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\d{1,2}\/\d{1,2}(?=\s|$)/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/(?<=[A-Z])\d+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Palavra-chave: casa por palavra inteira; com `*` no fim casa o inicio da
 * palavra (VET* pega VET e VETERINARIA); com `*` no inicio casa o fim
 * (*MALL pega MARLEYMALL). Frases sao permitidas.
 */
interface Rule {
  category: string;
  keywords: string[];
}

/** Ordem importa: a primeira regra que casar vence, entao as especificas vem antes. */
export const CATEGORY_RULES: Rule[] = [
  { category: 'Pets', keywords: ['PET*', 'VET*', 'XVET', 'PETZ', 'COBASI', 'RACAO', 'ZOO*'] },
  { category: 'Tarifas Bancárias', keywords: ['IOF', 'ANUIDADE', 'JUROS', 'ENCARGO*', 'TARIFA*', 'MULTA', 'SEGURO PROTECAO'] },
  {
    category: 'Assinaturas e Serviços',
    keywords: [
      'APPLE', 'ICLOUD', 'NETFLIX', 'SPOTIFY', 'DISNEY', 'HBO', 'AMAZON PRIME', 'PRIME VIDEO', 'GLOBOPLAY',
      'PARAMOUNT', 'DEEZER', 'YOUTUBE', 'GOOGLE', 'MICROSOFT', 'ADOBE', 'CANVA', 'DROPBOX', 'OPENAI', 'CHATGPT',
      'ANTHROPIC', 'HOSTINGER*', 'GODADDY', 'REGISTRO BR', 'NOTION', 'ZOOM', 'LINKEDIN',
    ],
  },
  { category: 'Educação', keywords: ['HOTMART', 'UDEMY', 'ALURA', 'COURSERA', 'KIWIFY', 'EDUZZ', 'ESCOLA', 'CURSO*', 'FACULDADE', 'UNIVERSIDADE', 'COLEGIO', 'LIVRARIA'] },
  {
    category: 'Saúde',
    keywords: [
      'DROGARIA', 'DROGA*', 'FARMACIA', 'FARMA*', 'DROGASIL', 'RAIA', 'PAGUE MENOS', 'ULTRAFARMA', 'HOSPITAL',
      'CLINICA', 'LABORATORIO', 'MEDIC*', 'DENTISTA', 'DENTAL*', 'ODONTO*', 'FLEURY', 'DASA', 'UNIMED', 'PSICOLOG*', 'FISIOTERAP*',
    ],
  },
  {
    category: 'Transporte',
    keywords: [
      'POSTO', 'COMBUSTIVEL', 'SHELL', 'IPIRANGA', 'PETROBRAS', 'UBER', '99APP', 'CABIFY', 'ESTACIONAM*', 'PARK*',
      'PEDAGIO', 'SEM PARAR', 'CONECTCAR', 'VELOE', 'METRO', 'CPTM', 'LAVA RAPIDO', 'LAVA JATO', 'AUTO CENTER',
      'CENTRO AUTOMOTIVO', 'PNEU*', 'MECANIC*', 'OFICINA', 'LOCALIZA', 'MOVIDA', 'UNIDAS', 'MOTO*', 'YAMAHA', 'HONDA',
    ],
  },
  {
    category: 'Mercado',
    keywords: [
      'MERCADO', 'SUPERMERC*', 'ATACAD*', 'EXTRA', 'CARREFOUR', 'ASSAI', 'PAO DE ACUCAR', 'HORTIFRUTI', 'SACOLAO',
      'MERCEARIA', 'EMPORIO', 'QUITANDA', 'HIPERMERC*', 'BIG', 'TENDA', 'MAKRO', 'OBA', 'ACOUGUE', 'PEIXARIA',
    ],
  },
  {
    category: 'Restaurantes',
    keywords: [
      'RESTAUR*', 'LANCHON*', 'PADARIA', 'PIZZA*', 'BURGER', 'HAMBURG*', 'IFOOD', 'RAPPI', 'SUSHI', 'CHURRASC*',
      'BAR', 'ADEGA', 'CAFE', 'CAFETERIA', 'MCDONALD*', 'MC DONALD*', 'BURGER KING', 'SUBWAY', 'OUTBACK', 'ACAI',
      'SORVET*', 'DOCERIA', 'CONFEITARIA', 'BISTRO', 'GRILL', 'CANTINA', 'PASTEL*', 'ESFIHA', 'CHOPP', 'CERVEJ*', 'TEMAKERIA',
    ],
  },
  { category: 'Esportes', keywords: ['DECATHLON', 'CENTAURO', 'NETSHOES', 'ACADEMIA', 'SMARTFIT', 'SMART FIT', 'BLUEFIT', 'CROSSFIT', 'GYM', 'BIKE', 'CICL*', 'NATACAO'] },
  {
    category: 'Vestuário',
    keywords: ['RENNER', 'RIACHUELO', 'C&A', 'CEA', 'ZARA', 'HERING', 'MARISA', 'BESNI', 'PERNAMBUCANAS', 'CALCADO*', 'SAPAT*', 'BOUTIQUE', 'MODA', 'ROUPA*', 'TORRA', 'ARTWALK'],
  },
  {
    category: 'Cuidados Pessoais',
    keywords: ['SALAO', 'CABELE*', 'BARBEAR*', 'BARBER*', 'LASER', 'ESTETIC*', 'SPA', 'MANICURE', 'DEPIL*', 'NATURA', 'BOTICARIO', 'SEPHORA', 'PERFUM*', 'COSMETIC*'],
  },
  {
    category: 'Compras',
    keywords: [
      'MAGALU', 'MAGAZINE LUIZA', 'AMERICANAS', 'MERCADO LIVRE', 'MERCADOLIVRE', 'SHOPEE', 'ALIEXPRESS', 'SHEIN',
      'TIKTOK SHOP', 'AMAZON', 'CASAS BAHIA', 'KABUM', 'LEROY', 'TELHANORTE', 'KALUNGA', 'PAPELARIA', 'SHOP', 'LOJA*', '*MALL', 'ALIANCA*', 'JOALHERIA',
    ],
  },
  { category: 'Lazer', keywords: ['CINEMA', 'CINEMARK', 'KINOPLEX', 'TEATRO', 'INGRESSO*', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'PARQUE', 'CLUBE'] },
  { category: 'Casa', keywords: ['CONDOMIN*', 'ALUGUEL', 'ENEL', 'CPFL', 'CEMIG', 'COPEL', 'CELESC', 'SABESP', 'COMGAS', 'VIVO', 'CLARO', 'TIM', 'NET', 'INTERNET'] },
  { category: 'Viagens', keywords: ['HOTEL', 'POUSADA', 'AIRBNB', 'BOOKING', 'LATAM', 'GOL', 'AZUL', 'DECOLAR', 'CVC', '123MILHAS', 'HOSTEL'] },
];

/** Icone e cor para criar, no cadastro do usuario, uma categoria-alvo que ainda nao exista. */
export const DEFAULT_CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  Pets: { icon: 'PawPrint', color: '#A78BFA' },
  'Tarifas Bancárias': { icon: 'Building', color: '#4B5563' },
  'Assinaturas e Serviços': { icon: 'CalendarCheck', color: '#A855F7' },
  Educação: { icon: 'GraduationCap', color: '#8B5CF6' },
  Saúde: { icon: 'HeartPulse', color: '#EF4444' },
  Transporte: { icon: 'Car', color: '#6366F1' },
  Mercado: { icon: 'ShoppingCart', color: '#FB923C' },
  Restaurantes: { icon: 'ChefHat', color: '#EA580C' },
  Esportes: { icon: 'Dumbbell', color: '#22C55E' },
  Vestuário: { icon: 'Shirt', color: '#DB2777' },
  'Cuidados Pessoais': { icon: 'Sparkles', color: '#EC4899' },
  Compras: { icon: 'ShoppingBag', color: '#D946EF' },
  Lazer: { icon: 'Gamepad2', color: '#06B6D4' },
  Casa: { icon: 'Home', color: '#EF4444' },
  Viagens: { icon: 'Plane', color: '#0EA5E9' },
  Outros: { icon: 'MoreHorizontal', color: '#9CA3AF' },
};

/** Todas as categorias que as regras podem sugerir (para garantir que existam no cadastro). */
export const RULE_CATEGORIES: string[] = [...new Set([...CATEGORY_RULES.map((r) => r.category), FALLBACK_CATEGORY])];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const compiled = CATEGORY_RULES.map((rule) => ({
  category: rule.category,
  patterns: rule.keywords.map((kw) => {
    if (kw.startsWith('*')) return new RegExp(`${escapeRe(kw.slice(1))}\\b`);
    if (kw.endsWith('*')) return new RegExp(`\\b${escapeRe(kw.slice(0, -1))}`);
    return new RegExp(`\\b${escapeRe(kw)}\\b`);
  }),
}));

export function suggestCategory(description: string, memory: CategoryMemory): CategorySuggestion {
  const key = normalizeDescription(description);

  const remembered = memory.get(key);
  if (remembered) return { category: remembered, source: 'memory' };

  for (const rule of compiled) {
    if (rule.patterns.some((p) => p.test(key))) return { category: rule.category, source: 'rule' };
  }

  return { category: FALLBACK_CATEGORY, source: 'fallback' };
}
