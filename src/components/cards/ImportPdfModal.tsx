import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { extractPdfLines } from '@/lib/pdf/extractText';
import { parseBradescoFatura, type BradescoItem, type BradescoParseResult } from '@/lib/pdf/bradesco';
import { CARD_CATEGORIES } from '@/lib/pdf/autoCategory';
import { CARD_KINDS, CARD_KIND_LABEL, classifyInvoiceCards, type CardKind, type InvoiceCard } from '@/lib/cards/kinds';

/** Item no formato que a tabela invoice_items espera. */
export type ImportedInvoiceItem = BradescoItem & { is_previous_balance: boolean };

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: ImportedInvoiceItem[], previousBalance: number, cards: InvoiceCard[]) => void | Promise<void>;
  /** Resultado ja lido (fluxo da aba Cartoes): pula a escolha do arquivo e vai direto para a revisao. */
  parsed?: BradescoParseResult | null;
  /** Lista de categorias oferecida na revisao. Padrao: a lista fixa do cartao. */
  categoryOptions?: string[];
  /** Sugestao de categoria por descricao (memoria + regras). Se ausente, fica a do parser. */
  suggest?: (description: string) => string;
  /** Tipos de cartao ja escolhidos antes, por numero (lembrados em card_holders). */
  knownKinds?: ReadonlyMap<string, CardKind>;
}

type Conferencia = Pick<BradescoParseResult, 'totalFatura' | 'parsedTotal' | 'cardTotals' | 'dueDate'>;

const sameCents = (a: number, b: number) => Math.abs(a - b) < 0.005;

export function ImportPdfModal({ open, onClose, onConfirm, parsed, categoryOptions, suggest, knownKinds }: Props) {
  const [items, setItems] = useState<BradescoItem[]>([]);
  const [cards, setCards] = useState<InvoiceCard[]>([]);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setItems([]);
    setCards([]);
    setPreviousBalance(0);
    setConferencia(null);
    setError('');
  };

  const applyResult = (result: BradescoParseResult) => {
    setItems(suggest ? result.items.map((i) => ({ ...i, category: suggest(i.description) })) : result.items);
    setCards(classifyInvoiceCards(result.header, knownKinds));
    setPreviousBalance(result.previousBalance);
    setConferencia(result);
  };

  useEffect(() => {
    if (open && parsed && !parsed.error) applyResult(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so re-aplica quando o resultado muda
  }, [open, parsed]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const lines = await extractPdfLines(await file.arrayBuffer());
      const result = parseBradescoFatura(lines);

      if (result.error) {
        setError(result.error);
      } else {
        applyResult(result);
      }
    } catch (err) {
      setError('Erro ao processar o PDF: ' + (err instanceof Error ? err.message : 'formato incompatível'));
    } finally {
      setLoading(false);
      // Permite selecionar o mesmo arquivo de novo depois de um erro.
      e.target.value = '';
    }
  };

  const updateItemCategory = (index: number, category: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, category } : item));
  };

  const updateItemDesc = (index: number, description: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, description } : item));
  };

  const updateCardKind = (lastFour: string, kind: CardKind) => {
    setCards(prev => prev.map(c => c.lastFour === lastFour ? { ...c, kind } : c));
  };

  const handleConfirm = async () => {
    const mapped: ImportedInvoiceItem[] = items.map(item => ({ ...item, is_previous_balance: false }));
    setLoading(true);
    try {
      // Espera a gravacao terminar antes de fechar, para o erro (se houver) aparecer com o modal aberto.
      await onConfirm(mapped, previousBalance, cards);
    } finally {
      setLoading(false);
    }
    reset();
    onClose();
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  // Pessoa -> cartao (numero) -> lancamentos, na ordem em que aparecem na fatura.
  // Lancamentos fora de bloco de cartao (pagamentos) ficam na pessoa, sem cartao.
  const people: { name: string; cards: { lastFour: string; items: BradescoItem[] }[] }[] = [];
  for (const item of items) {
    let person = people.find(p => p.name === item.holder_name);
    if (!person) { person = { name: item.holder_name, cards: [] }; people.push(person); }
    const key = item.card_last_four ?? '';
    let card = person.cards.find(c => c.lastFour === key);
    if (!card) { card = { lastFour: key, items: [] }; person.cards.push(card); }
    card.items.push(item);
  }
  const kindOf = (lastFour: string) => cards.find(c => c.lastFour === lastFour)?.kind;

  const total = items.reduce((s, i) => s + i.amount, 0) + previousBalance;
  const totalOk = conferencia?.totalFatura !== undefined && sameCents(conferencia.parsedTotal, conferencia.totalFatura);
  const cardsOk = conferencia?.cardTotals.every(c => sameCents(c.declared, c.parsed)) ?? false;

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Fatura PDF (Bradesco)</DialogTitle>
        </DialogHeader>

        {!parsed && (
          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={loading}>
              <Upload className="w-4 h-4 mr-1" /> {loading ? 'Processando...' : 'Selecionar PDF'}
            </Button>
            <Input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-destructive flex items-start gap-1">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <>
            {conferencia && (
              <div className={`rounded-lg p-3 mb-4 border ${totalOk && cardsOk ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                  {totalOk && cardsOk
                    ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Conferência: os valores lidos batem com os declarados na fatura</>
                    : <><XCircle className="w-4 h-4 text-amber-600" /> Conferência: há diferença entre o que foi lido e o que a fatura declara — revise antes de confirmar</>}
                </p>
                <ul className="text-sm space-y-0.5">
                  {conferencia.dueDate && <li>Vencimento: {fmtDate(conferencia.dueDate)}</li>}
                  {previousBalance > 0 && <li>Saldo anterior: {fmt(previousBalance)}</li>}
                  {conferencia.cardTotals.map(c => (
                    <li key={`${c.holder}-${c.lastFour}`} className="flex items-center gap-1">
                      {sameCents(c.declared, c.parsed)
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      {c.holder} •••• {c.lastFour}: lido {fmt(c.parsed)} · fatura {fmt(c.declared)}
                    </li>
                  ))}
                  {conferencia.totalFatura !== undefined && (
                    <li className="flex items-center gap-1 font-medium">
                      {totalOk
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      Total da fatura: lido {fmt(conferencia.parsedTotal)} · fatura {fmt(conferencia.totalFatura)}
                    </li>
                  )}
                </ul>
              </div>
            )}

            {people.map(person => {
              const personTotal = person.cards.reduce((s, c) => s + c.items.reduce((t, i) => t + i.amount, 0), 0);
              return (
                <div key={person.name} className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-base">{person.name}</h3>
                    {person.cards.length > 1 && (
                      <span className="text-sm text-muted-foreground">Total {person.name}: <span className="font-medium text-foreground">{fmt(personTotal)}</span></span>
                    )}
                  </div>
                  {person.cards.map(card => {
                    const cardTotal = card.items.reduce((s, i) => s + i.amount, 0);
                    const startIndex = items.indexOf(card.items[0]);
                    const kind = kindOf(card.lastFour);
                    return (
                      <div key={card.lastFour || 'sem-cartao'} className="mb-4 rounded-lg border border-border/60 p-3">
                        {card.lastFour && (
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-sm font-medium">•••• {card.lastFour}</span>
                            <Select value={kind ?? 'principal'} onValueChange={v => updateCardKind(card.lastFour, v as CardKind)}>
                              <SelectTrigger className="h-8 text-sm w-[220px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CARD_KINDS.map(k => <SelectItem key={k} value={k}>{CARD_KIND_LABEL[k]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground">tipo inferido da fatura — ajuste se precisar; fica lembrado por número</span>
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Parcela</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead>Categoria</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {card.items.map((item, idx) => {
                              const globalIdx = startIndex + idx;
                              return (
                                <TableRow key={idx}>
                                  <TableCell className="whitespace-nowrap">{fmtDate(item.transaction_date)}</TableCell>
                                  <TableCell>
                                    <Input
                                      value={item.description}
                                      onChange={e => updateItemDesc(globalIdx, e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {item.installment_current && item.installment_total
                                      ? `${item.installment_current}/${item.installment_total}`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className={`text-right whitespace-nowrap ${item.amount < 0 ? 'text-emerald-600' : ''}`}>{fmt(item.amount)}</TableCell>
                                  <TableCell>
                                    <Select value={item.category} onValueChange={v => updateItemCategory(globalIdx, v)}>
                                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {(categoryOptions ?? CARD_CATEGORIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        <p className="text-sm font-medium text-right mt-1">
                          {card.lastFour ? `${CARD_KIND_LABEL[kind ?? 'principal']} •••• ${card.lastFour}` : person.name}: {fmt(cardTotal)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="border-t pt-4 flex justify-between items-center">
              <p className="font-bold text-lg">Total Geral: {fmt(total)}</p>
              <Button onClick={handleConfirm} disabled={loading}>{loading ? 'Importando...' : 'Confirmar Importação'}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
