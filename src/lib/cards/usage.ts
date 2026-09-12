/**
 * Quanto do limite esta em uso, do jeito que o banco calcula: o saldo das
 * faturas ainda nao pagas MAIS as parcelas futuras ja assumidas (que o banco
 * reserva do limite). So a fatura mais recente de cada cartao entra no calculo
 * das parcelas, porque cada fatura carrega todas as parcelas em andamento.
 *
 * O que fica de fora, por nao estar em nenhuma fatura importada: compras
 * feitas depois do ultimo fechamento. Elas entram quando a proxima fatura for
 * importada.
 */

export interface UsageInvoice {
  id: string;
  card_id: string;
  period_end: string;
  status: string;
  total_amount: number;
}

export interface UsageItem {
  invoice_id: string;
  amount: number;
  installment_current: number | null;
  installment_total: number | null;
}

export interface CardUsage {
  openInvoices: number;
  futureInstallments: number;
  used: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeCardUsage(invoices: UsageInvoice[], items: UsageItem[]): Record<string, CardUsage> {
  const out: Record<string, CardUsage> = {};
  const latestByCard = new Map<string, UsageInvoice>();

  for (const inv of invoices) {
    const u = (out[inv.card_id] ??= { openInvoices: 0, futureInstallments: 0, used: 0 });
    if (inv.status !== 'PAID') u.openInvoices += Number(inv.total_amount);
    const cur = latestByCard.get(inv.card_id);
    if (!cur || inv.period_end > cur.period_end) latestByCard.set(inv.card_id, inv);
  }

  const latestIds = new Map([...latestByCard.values()].map((inv) => [inv.id, inv.card_id]));
  for (const it of items) {
    const cardId = latestIds.get(it.invoice_id);
    if (!cardId || !it.installment_current || !it.installment_total) continue;
    out[cardId].futureInstallments += Number(it.amount) * (it.installment_total - it.installment_current);
  }

  for (const u of Object.values(out)) {
    u.openInvoices = round2(u.openInvoices);
    u.futureInstallments = round2(u.futureInstallments);
    u.used = round2(u.openInvoices + u.futureInstallments);
  }
  return out;
}
