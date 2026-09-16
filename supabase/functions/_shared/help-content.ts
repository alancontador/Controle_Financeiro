// Base de conhecimento do suporte do FinControl.
//
// E lida em dois lugares: pelo front (painel de ajuda: guias e FAQ) e pela
// edge function support-chat (vira o contexto do assistente). Por isso o
// arquivo nao pode importar nada - precisa rodar igual no Vite e no Deno.
//
// Ao criar ou mudar uma funcionalidade do app, atualize aqui tambem: e daqui
// que o suporte responde.

export interface HelpGuide {
  id: string;
  /** Rota da tela a que o guia se refere (prefixo; "/" so casa exato). */
  route: string;
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
}

export interface HelpFaq {
  id: string;
  question: string;
  answer: string;
  /** Rota relacionada, para o painel priorizar as duvidas da tela atual. */
  route?: string;
}

export const APP_NAME = "FinControl";

export const HELP_GUIDES: HelpGuide[] = [
  {
    id: "primeiros-passos",
    route: "/",
    title: "Primeiros passos",
    summary: "O caminho mais curto para o app começar a mostrar números de verdade.",
    steps: [
      "Confira suas categorias em Categorias: o app já vem com um conjunto inicial, mas você pode renomear, criar subcategorias e trocar ícone e cor.",
      "Cadastre seus cartões em Cartões > Novo Cartão (nome, banco, limite, dia de fechamento e dia de vencimento). Se preferir, pule este passo: ao importar a primeira fatura em PDF o cadastro vem pré-preenchido.",
      "Importe a fatura mais recente de cada cartão em Cartões > Importar fatura (PDF do Bradesco, Nubank, Itaú ou Inter). As compras viram despesas nas datas em que aconteceram, já com categoria sugerida.",
      "Lance o que não passa pelo cartão em Transações > Nova Transação (salário, aluguel, Pix, dinheiro) ou traga tudo de uma vez por Importar (CSV/Excel).",
      "Marque as contas fixas como Recorrentes em Transações > Recorrentes: o app gera os lançamentos automaticamente todo dia.",
      "Defina um limite por categoria em Orçamentos e acompanhe no Dashboard quanto ainda cabe no mês.",
    ],
    tips: [
      "Dashboard e Calendário resumem o mês; Relatórios e Insights olham para o histórico.",
      "Tudo o que você cadastra é privado da sua conta.",
    ],
  },
  {
    id: "dashboard",
    route: "/",
    title: "Dashboard",
    summary: "Visão geral: saldo, receitas e despesas do mês, gastos por categoria e por pessoa.",
    steps: [
      "Os quatro cartões do topo mostram saldo total, receitas, despesas e a variação em relação ao mês anterior.",
      "Evolução do saldo e Despesas por categoria usam as transações do mês; o detalhe por categoria fica em Relatórios.",
      "Próximas faturas projeta o que vai vencer nos cartões (parcelas já assumidas + gastos recorrentes) e compara com a sua renda média.",
      "Gastos por pessoa mostra quem da casa gastou mais no último mês com dados.",
      "Alertas de orçamento aparecem quando uma categoria passa do limite definido em Orçamentos.",
      "Use o botão Nova Transação no cabeçalho para lançar algo sem sair da tela.",
    ],
  },
  {
    id: "transacoes",
    route: "/transactions",
    title: "Transações",
    summary: "Lançar, editar, filtrar, importar e exportar receitas e despesas.",
    steps: [
      "Clique em Nova Transação, escolha Receita ou Despesa, preencha descrição, valor, data e categoria. O campo Pessoa é opcional: vazio significa Casa/Comum.",
      "Use a busca e os filtros (tipo, categoria, pessoa, período) para achar um lançamento; clique nele para editar ou excluir.",
      "Importar aceita CSV ou Excel com colunas Descrição, Valor, Tipo (Receita/Despesa), Categoria, Data e Notas. Datas em DD/MM/AAAA ou AAAA-MM-DD.",
      "Exportar gera CSV ou Excel com o que está filtrado na tela.",
      "Em Recorrentes, cadastre contas fixas (diária, semanal, mensal ou anual). O app cria os lançamentos automaticamente na data certa.",
    ],
    tips: [
      "Quando você escolhe a categoria de uma despesa, o app lembra: a próxima compra com a mesma descrição já vem sugerida.",
      "Despesas que vieram de fatura de cartão mostram o cartão e a pessoa; editar a pessoa aqui também atualiza a fatura.",
    ],
  },
  {
    id: "cartoes",
    route: "/cartoes",
    title: "Cartões de crédito",
    summary: "Cadastro dos cartões, uso do limite, quem gasta mais e projeção das próximas faturas.",
    steps: [
      "Novo Cartão: informe nome, banco, limite total, dia de fechamento e dia de vencimento. São esses dias que definem em qual fatura cada compra cai.",
      "Importar fatura: envie o PDF baixado no app do banco. O app identifica o cartão pelo final do número (ou pré-preenche o cadastro se for novo), detecta o banco e mostra a revisão.",
      "Na revisão, confira categoria e responsável de cada compra. Você pode realocar uma compra para outra pessoa ou dividir entre pessoas antes de confirmar.",
      "Ao confirmar, as compras viram despesas em Transações na data da compra. O pagamento da fatura não vira transação (senão contaria em dobro).",
      "Clique em um cartão para ver as faturas, os lançamentos de cada uma e adicionar lançamentos manuais ou por Excel/CSV.",
      "Próximas faturas projeta os meses seguintes: parcelas restantes da fatura mais recente + gastos recorrentes, com uma coluna por pessoa.",
    ],
    tips: [
      "Bancos reconhecidos no PDF: Bradesco, Nubank, Itaú e Inter. Outros bancos: use Importar Excel/CSV dentro da fatura (há um template para baixar).",
      "Limite utilizado = faturas não pagas + parcelas futuras. Compras feitas depois do fechamento só entram na próxima fatura, por isso pode diferir um pouco do app do banco.",
      "Importar a mesma fatura de novo: o app avisa que ela já existe e pergunta se quer substituir.",
    ],
  },
  {
    id: "faturas",
    route: "/cartoes/",
    title: "Faturas de um cartão",
    summary: "Detalhe de cada fatura: lançamentos, responsável, divisão entre pessoas e status.",
    steps: [
      "Cada fatura mostra status (Em aberto, Fechada ou Paga), total, saldo anterior e limite disponível.",
      "Nova Fatura cria uma fatura manual; Adicionar Lançamento inclui uma compra à mão; Importar PDF ou Importar Excel/CSV trazem em lote.",
      "A coluna Responsável permite realocar a compra para outra pessoa da casa ou para um terceiro. O app lembra a escolha para a mesma loja e para as próximas parcelas.",
      "O ícone de tesoura divide uma compra entre pessoas (por valor; as partes precisam fechar o total). A fatura mantém um lançamento só; as despesas espelhadas viram uma por parte.",
      "Excluir uma fatura remove também as despesas espelhadas em Transações.",
    ],
  },
  {
    id: "pessoas",
    route: "/pessoas",
    title: "Pessoas e terceiros",
    summary: "Quem gasta o que na casa e o controle do que terceiros devem pelo uso do cartão.",
    steps: [
      "Casa lista as pessoas que aparecem nos cartões e nas transações. Compras sem dono ficam em Casa/Comum.",
      "Terceiros são pessoas de fora da casa que usam seu cartão (ex.: um parente). Cadastre em Terceiros > Cadastrar.",
      "Ao atribuir uma compra a um terceiro (na fatura ou na revisão da importação), ela NÃO entra nas suas despesas: vira um valor a receber.",
      "Registrar pagamento abate do saldo a receber do terceiro. O total a receber aparece no topo.",
    ],
    tips: [
      "Despesa manual (fora de fatura) atribuída a terceiro ainda conta como despesa sua; a regra de 'a receber' vale para compras de fatura.",
    ],
  },
  {
    id: "categorias",
    route: "/categories",
    title: "Categorias",
    summary: "Organização de receitas e despesas com subcategorias, ícones e cores.",
    steps: [
      "Nova Categoria: escolha o tipo (receita ou despesa), nome, ícone e cor.",
      "Para criar uma subcategoria, selecione uma categoria pai no formulário.",
      "Edite ou exclua pela própria lista. Ao excluir, as transações ficam sem categoria — reclassifique em Transações.",
    ],
    tips: [
      "Na importação de fatura o app sugere categoria por palavra-chave (mercado, farmácia, combustível, streaming...) e pela sua memória de escolhas.",
    ],
  },
  {
    id: "orcamentos",
    route: "/budgets",
    title: "Orçamentos",
    summary: "Limite mensal por categoria e acompanhamento do quanto já foi gasto.",
    steps: [
      "Novo Orçamento: escolha a categoria e o limite mensal em reais.",
      "A barra de progresso mostra o gasto do mês contra o limite; o topo resume orçamento total, gasto e disponível.",
      "Quando uma categoria passa do limite, um alerta aparece também no Dashboard.",
    ],
  },
  {
    id: "metas",
    route: "/goals",
    title: "Metas",
    summary: "Objetivos de economia com aportes e progresso.",
    steps: [
      "Nova Meta: nome, valor alvo, prazo e uma descrição opcional.",
      "Adicionar Aporte registra quanto você guardou; o progresso atualiza na hora.",
      "Metas concluídas vão para a aba própria; o topo mostra total economizado e progresso geral.",
    ],
  },
  {
    id: "investimentos",
    route: "/investments",
    title: "Investimentos",
    summary: "Carteira de ativos, cotações, dividendos e simulador de aposentadoria.",
    steps: [
      "Adicionar: informe o ativo (ticker, ex.: PETR4 ou AAPL), quantidade, preço médio e, se quiser, uma classe (Ações BR, Renda Fixa...).",
      "Atualizar busca as cotações atuais e recalcula patrimônio e rentabilidade.",
      "Dividendos: registre os proventos recebidos para acompanhar a renda passiva.",
      "Importar/Exportar aceitam CSV e Excel (há um modelo para baixar).",
      "O simulador de aposentadoria projeta o patrimônio a partir do aporte mensal e da rentabilidade esperada.",
    ],
  },
  {
    id: "calendario",
    route: "/calendar",
    title: "Calendário",
    summary: "Receitas e despesas dia a dia, com tendências, previsão e comparação entre meses.",
    steps: [
      "Navegue entre os meses; cada dia mostra o que entrou e saiu.",
      "Tendências compara os últimos meses; Previsão estima o fechamento do mês com base nos recorrentes; Comparação põe dois meses lado a lado.",
    ],
  },
  {
    id: "relatorios",
    route: "/reports",
    title: "Relatórios",
    summary: "Análise por período, por categoria e por pessoa, com exportação em PDF.",
    steps: [
      "Navegue entre os meses com as setas. Os gráficos mostram receitas x despesas, evolução e distribuição por categoria.",
      "Pessoas mostra o gasto de cada um da casa no período.",
      "Exportar PDF gera o relatório para guardar ou compartilhar.",
    ],
  },
  {
    id: "insights",
    route: "/insights",
    title: "Insights (IA)",
    summary: "Análise inteligente dos últimos 6 meses: saúde financeira, padrões, dicas de economia e diagnóstico por pessoa.",
    steps: [
      "Clique em Atualizar Análise. O app envia um resumo dos seus números (totais, categorias, orçamentos, pessoas e projeção de faturas) para a IA.",
      "Leia a pontuação de saúde financeira, os padrões encontrados, as sugestões de economia com valor estimado e as próximas ações.",
      "Por pessoa aponta onde está o gargalo de cada um e o que ajustar.",
    ],
    tips: [
      "A IA usa camada gratuita: se aparecer 'limite de requisições', espere alguns minutos e tente de novo.",
      "Quanto mais histórico (faturas importadas, recorrentes, categorias certas), mais útil a análise.",
    ],
  },
  {
    id: "configuracoes",
    route: "/settings",
    title: "Configurações",
    summary: "Perfil, foto, moeda, idioma, tema e notificações.",
    steps: [
      "Perfil: nome e foto. O e-mail é o da conta e não muda aqui.",
      "Preferências: moeda (BRL, USD, EUR), idioma e tema claro/escuro.",
      "Notificações: ligue ou desligue os avisos.",
      "Sair fica no rodapé do menu lateral.",
    ],
  },
  {
    id: "contas",
    route: "/contas",
    title: "Contas bancárias (Open Finance)",
    summary: "Conecte seus bancos e as movimentações entram sozinhas, com saldo atualizado e categoria sugerida.",
    steps: [
      "Em Contas, clique em Conectar conta bancária. Leia o resumo do que será compartilhado (contas, saldos, cartões e movimentações), marque que entendeu e clique em Escolher banco.",
      "Escolha a instituição na janela do provedor e faça login no ambiente do próprio banco (Open Finance regulado pelo Banco Central). O app nunca vê sua senha.",
      "Autorize o compartilhamento no banco e volte. A conta aparece em Contas com o status Sincronizando; a primeira importação traz até 12 meses de histórico e pode levar alguns minutos.",
      "As movimentações viram receitas e despesas em Transações, já com categoria (sua memória e regras vêm antes das sugestões do banco). Compras de cartão conectado entram em Cartões, na fatura certa.",
      "Transferências entre suas próprias contas e pagamentos de fatura são reconhecidos e NÃO contam como despesa ou receita. Eles aparecem no extrato da conta (clique na conta) marcados como tal.",
      "A sincronização é automática (a cada 12 h e quando o banco avisa que há novidades). Use Sincronizar agora para forçar; há um intervalo mínimo entre pedidos.",
      "Para parar de compartilhar, use Desconectar: o consentimento é revogado no provedor e as movimentações já importadas continuam no app.",
    ],
    tips: [
      "Status Atenção necessária ou Consentimento expirado: clique em Autorizar novamente — o banco pede uma nova autorização de tempos em tempos.",
      "A categoria que você escolhe à mão numa transação importada nunca é alterada pela sincronização.",
      "Em Categorias > Regras automáticas você cria regras como “contém UBER → Transporte”, aplicadas às próximas importações.",
      "Se você também importa a fatura em PDF do mesmo cartão, as compras não duplicam: o app cruza pelo valor, data e descrição.",
    ],
  },
];

export const HELP_FAQ: HelpFaq[] = [
  {
    id: "of-senha",
    route: "/contas",
    question: "O app pede minha senha do banco?",
    answer: "Não. A autorização acontece no site ou app do próprio banco, pelo Open Finance regulado pelo Banco Central. O app recebe apenas os dados que você autorizou compartilhar e nunca guarda senha, CPF ou número completo da conta.",
  },
  {
    id: "of-duplicado",
    route: "/contas",
    question: "Sincronizei duas vezes. Vai duplicar transações?",
    answer: "Não. Cada movimentação tem uma identificação única e uma “impressão digital” (data, valor, descrição). Sincronizações repetidas, reconexões e avisos duplicados do banco não criam lançamentos repetidos.",
  },
  {
    id: "of-transferencia",
    route: "/contas",
    question: "Transferi dinheiro entre minhas contas e não apareceu como despesa. Por quê?",
    answer: "É proposital: transferência entre contas suas não é gasto nem ganho. O app reconhece as duas pontas (mesmo valor, contas diferentes, datas próximas, indícios de Pix/TED) e deixa ambas fora do resultado. Elas aparecem no extrato da conta como Transferência interna.",
  },
  {
    id: "of-reauth",
    route: "/contas",
    question: "A conta ficou com “Atenção necessária”. O que faço?",
    answer: "O banco precisa de uma nova autorização (consentimento expirado, senha alterada ou acesso revogado no app do banco). Clique em Autorizar novamente e conclua no ambiente do banco. Nada do que já foi importado se perde.",
  },
  {
    id: "of-desconectar",
    route: "/contas",
    question: "O que acontece quando eu desconecto uma conta?",
    answer: "O consentimento é revogado no provedor e a sincronização para. As movimentações já importadas continuam no app; se quiser, exclua-as em Transações. Você também pode revogar direto no app do seu banco.",
  },
  {
    id: "faq-fatura-bancos",
    route: "/cartoes",
    question: "Quais bancos o app lê no PDF da fatura?",
    answer:
      "Bradesco, Nubank, Itaú e Inter. Baixe o PDF pelo app ou site do banco e envie em Cartões > Importar fatura. Para outros bancos, abra a fatura do cartão e use Importar Excel/CSV (tem um template para baixar).",
  },
  {
    id: "faq-fatura-nao-reconhecida",
    route: "/cartoes",
    question: "Enviei o PDF e o app não reconheceu a fatura. E agora?",
    answer:
      "Confira se é o PDF original do banco (não uma foto nem 'impressão para PDF') e se é a fatura completa. PDFs protegidos por senha precisam ser abertos e salvos sem senha antes. Se continuar, importe por Excel/CSV e conte para o suporte qual é o banco — novos layouts são adicionados.",
  },
  {
    id: "faq-pagamento-fatura",
    route: "/cartoes",
    question: "Por que o pagamento da fatura não aparece como despesa?",
    answer:
      "Porque as compras do cartão já viraram despesas nas datas em que aconteceram. Se o pagamento também entrasse, o gasto contaria duas vezes. Estornos entram como despesa negativa.",
  },
  {
    id: "faq-limite-diferente",
    route: "/cartoes",
    question: "O limite utilizado está diferente do app do banco. Está errado?",
    answer:
      "Normalmente não. O app soma faturas não pagas + parcelas futuras (o banco reserva as parcelas). Compras feitas depois do último fechamento só aparecem quando você importar a próxima fatura — a diferença residual é isso.",
  },
  {
    id: "faq-fatura-duplicada",
    route: "/cartoes",
    question: "Importei a mesma fatura duas vezes. Duplicou?",
    answer:
      "Não: o app detecta a fatura do mesmo período e pergunta se quer substituir. Ao substituir, as despesas espelhadas antigas são removidas e recriadas. Suas escolhas de categoria e de responsável ficam lembradas.",
  },
  {
    id: "faq-pessoa",
    route: "/pessoas",
    question: "Como sei quem da casa gasta mais?",
    answer:
      "Importe as faturas: cada compra vem com o titular do cartão. Veja em Cartões (Quem gasta mais), no Dashboard (Gastos por pessoa), em Relatórios (Pessoas) e em Insights (diagnóstico por pessoa). Compras sem dono ficam em Casa/Comum.",
  },
  {
    id: "faq-realocar",
    route: "/cartoes/",
    question: "A compra está no meu cartão mas foi de outra pessoa. Como mudo?",
    answer:
      "Na fatura, troque o Responsável na linha da compra (ou na revisão da importação). Para repartir, use a tesoura e divida entre pessoas. O app lembra a escolha para a mesma loja e para as parcelas seguintes.",
  },
  {
    id: "faq-terceiro",
    route: "/pessoas",
    question: "Alguém de fora usa meu cartão e me paga depois. Como controlo?",
    answer:
      "Cadastre a pessoa em Pessoas > Terceiros. Atribua as compras a ela na fatura: elas saem das suas despesas e viram valor a receber. Quando ela pagar, use Registrar pagamento.",
  },
  {
    id: "faq-categoria-sugerida",
    route: "/categories",
    question: "Como o app escolhe a categoria das compras da fatura?",
    answer:
      "Primeiro pela sua memória: se você já classificou aquela descrição, repete. Depois por palavras-chave (supermercado, farmácia, posto, streaming etc.). Você sempre pode corrigir na revisão ou depois em Transações — e a correção vira memória.",
  },
  {
    id: "faq-recorrentes",
    route: "/transactions",
    question: "Cadastrei uma recorrente e o lançamento não apareceu.",
    answer:
      "Os lançamentos recorrentes são gerados uma vez por dia, na data prevista. Confira a data de início e a frequência em Transações > Recorrentes. Lançamentos passados não são gerados retroativamente — lance à mão se precisar.",
  },
  {
    id: "faq-importar-csv",
    route: "/transactions",
    question: "Que formato o arquivo de importação de transações precisa ter?",
    answer:
      "CSV ou Excel (.xlsx/.xls) com colunas Descrição, Valor, Tipo (Receita/Despesa), Categoria, Data e Notas. Datas em DD/MM/AAAA ou AAAA-MM-DD. A primeira linha deve ser o cabeçalho.",
  },
  {
    id: "faq-insights-erro",
    route: "/insights",
    question: "Insights mostra erro ou 'limite de requisições'.",
    answer:
      "A análise usa uma IA com cota gratuita. 'Limite de requisições' passa em alguns minutos. Se aparecer erro de chave ou configuração, o serviço precisa de ajuste do lado do suporte — avise pelo chat.",
  },
  {
    id: "faq-saldo",
    route: "/",
    question: "O saldo total do Dashboard não bate com minha conta bancária.",
    answer:
      "O saldo é a soma de receitas menos despesas lançadas no app; ele não lê sua conta. Para bater, lance o saldo inicial como receita, mantenha receitas e despesas em dia e importe as faturas.",
  },
  {
    id: "faq-excluir-cartao",
    route: "/cartoes",
    question: "O que acontece se eu excluir um cartão?",
    answer:
      "Todas as faturas, lançamentos e despesas espelhadas daquele cartão são removidos. Não tem como desfazer — se só quer parar de usar, deixe o cartão sem novas faturas.",
  },
  {
    id: "faq-tema",
    route: "/settings",
    question: "Como troco para o modo claro/escuro?",
    answer: "Em Configurações > Preferências > Tema, ou pelo botão de sol/lua no cabeçalho do Dashboard.",
  },
  {
    id: "faq-privacidade",
    question: "Meus dados ficam visíveis para outras pessoas?",
    answer:
      "Não. Cada conta vê apenas os próprios dados. A análise de Insights e o chat de suporte enviam apenas um resumo (sem documentos) para a IA, e nada é usado para treinar modelos.",
  },
];

/** Texto da base de conhecimento no formato que a edge function entrega ao modelo. */
export function knowledgeBaseText(): string {
  const guides = HELP_GUIDES.map((g) => {
    const steps = g.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const tips = g.tips?.length ? `\nDicas:\n${g.tips.map((t) => `- ${t}`).join("\n")}` : "";
    return `### ${g.title} (tela ${g.route})\n${g.summary}\n${steps}${tips}`;
  });
  const faq = HELP_FAQ.map((f) => `P: ${f.question}\nR: ${f.answer}`);
  return `## Guias por tela\n\n${guides.join("\n\n")}\n\n## Dúvidas frequentes\n\n${faq.join("\n\n")}`;
}
