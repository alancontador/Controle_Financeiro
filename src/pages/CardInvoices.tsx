import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Plus, ArrowLeft, Upload, FileSpreadsheet, Trash2, Scissors } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCreditCards, useInvoices } from '@/hooks/useCreditCards';
import { useInvoiceImport, type Categorization, type ImportableItem } from '@/hooks/useInvoiceImport';
import { usePeople } from '@/hooks/usePeople';
import { SplitItemDialog } from '@/components/cards/SplitItemDialog';
import { isPaymentLine } from '@/lib/cards/mirror';
import type { InvoiceItem } from '@/hooks/useCreditCards';
import type { AttributionMemory } from '@/lib/cards/attribution';
import { UpcomingInvoices } from '@/components/cards/UpcomingInvoices';
import { CARD_KIND_LABEL, type CardKind, type InvoiceCard } from '@/lib/cards/kinds';
import { AddItemModal } from '@/components/cards/AddItemModal';
import { ImportExcelModal } from '@/components/cards/ImportExcelModal';
import { ImportPdfModal } from '@/components/cards/ImportPdfModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CardInvoices = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    card, invoices, holders, items, loading,
    fetchAll, fetchItems, createInvoice, deleteInvoice, addItem, addItemsBatch, updatePreviousBalance, reassignItem,
    splits, setItemSplits,
  } = useInvoices(cardId || '');
  const [splittingItem, setSplittingItem] = useState<InvoiceItem | null>(null);
  const { names: householdPeople, thirdParties } = usePeople();
  const { usage: usageByCard } = useCreditCards();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { loadCategorization, loadKnownKinds, loadAttribution, ensureHolders, writeItems } = useInvoiceImport();
  const [attribution, setAttribution] = useState<AttributionMemory>(new Map());
  const [categorization, setCategorization] = useState<Categorization | null>(null);
  const [knownKinds, setKnownKinds] = useState<Map<string, CardKind>>(new Map());

  const openPdfModal = async () => {
    const [cat, kinds, attr] = await Promise.all([loadCategorization(), loadKnownKinds(cardId || ''), loadAttribution()]);
    setCategorization(cat);
    setKnownKinds(kinds);
    setAttribution(attr);
    setPdfModalOpen(true);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Auto-select first invoice
  useEffect(() => {
    if (invoices.length > 0 && !selectedInvoiceId) {
      const openInv = invoices.find(i => i.status === 'OPEN');
      setSelectedInvoiceId(openInv?.id || invoices[0].id);
    }
  }, [invoices, selectedInvoiceId]);

  // Fetch items when invoice selected
  useEffect(() => {
    if (selectedInvoiceId) fetchItems(selectedInvoiceId);
  }, [selectedInvoiceId, fetchItems]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cartão não encontrado.</p>
      </div>
    );
  }

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);
  const isOpen = selectedInvoice?.status === 'OPEN';

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };
  const fmtDateShort = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}`;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Em Aberto</Badge>;
      case 'CLOSED': return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Fechada</Badge>;
      case 'PAID': return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Paga</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Pessoa -> cartao (numero) -> lancamentos. Itens sem numero (pagamentos ou
  // lancamentos manuais) ficam direto na pessoa.
  const people: { name: string; cards: { lastFour: string; kind: CardKind | null; items: typeof items }[] }[] = [];
  for (const item of items) {
    let person = people.find(p => p.name === item.holder_name);
    if (!person) { person = { name: item.holder_name, cards: [] }; people.push(person); }
    const key = item.card_last_four ?? '';
    let cardGroup = person.cards.find(c => c.lastFour === key);
    if (!cardGroup) { cardGroup = { lastFour: key, kind: item.card_kind, items: [] }; person.cards.push(cardGroup); }
    cardGroup.items.push(item);
  }
  const grouped = Object.fromEntries(people.map(p => [p.name, p.cards.flatMap(c => c.items)]));
  // card_holders tem uma linha por cartao; os modais de lancamento manual querem pessoas.
  const uniqueHolders = holders.filter((h, i, arr) => arr.findIndex(o => o.holder_name === h.holder_name) === i);

  // Mesmo calculo do banco: faturas nao pagas + parcelas futuras da fatura mais recente.
  const cardUsage = usageByCard[card.id];
  const openInvoiceTotal = cardUsage?.used ?? invoices
    .filter(i => i.status !== 'PAID')
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const available = card.total_limit - openInvoiceTotal;

  const handleAddItem = async (item: any) => {
    if (selectedInvoiceId) await addItem(selectedInvoiceId, item);
  };

  const handleExcelImport = async (importItems: any[]) => {
    if (selectedInvoiceId) await addItemsBatch(selectedInvoiceId, importItems);
  };

  const handlePdfImport = async (importItems: ImportableItem[], prevBalance: number, cards: InvoiceCard[]) => {
    if (!selectedInvoiceId || !categorization || !cardId) return;
    await ensureHolders(cardId, cards);
    const ok = await writeItems(selectedInvoiceId, importItems, categorization, cards, attribution);
    if (!ok) return;
    if (prevBalance > 0) await updatePreviousBalance(selectedInvoiceId, prevBalance);
    await fetchItems(selectedInvoiceId);
    await fetchAll();
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cartoes')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                {card.nickname} <span className="text-muted-foreground font-normal text-lg">**** {card.last_four_digits}</span>
              </h1>
              <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                <span>Limite: {fmt(card.total_limit)}</span>
                <span>Disponível: <span className={available < 0 ? 'text-destructive' : 'text-accent'}>{fmt(available)}</span></span>
              </div>
            </div>
            <Button onClick={createInvoice}>
              <Plus className="w-4 h-4 mr-2" /> Nova Fatura
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Invoice selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Faturas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {/* Mobile dropdown */}
                <div className="lg:hidden">
                  <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {invoices.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {fmtDate(inv.period_start)} - {fmtDate(inv.period_end)} {inv.status === 'OPEN' ? '(Aberta)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Desktop list */}
                <div className="hidden lg:block space-y-1">
                  {invoices.map(inv => (
                    <button
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedInvoiceId === inv.id
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{fmtDate(inv.period_start)} - {fmtDate(inv.period_end)}</span>
                      </div>
                      <div className="mt-1">{statusBadge(inv.status)}</div>
                    </button>
                  ))}
                </div>
                {invoices.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma fatura.</p>
                )}
              </CardContent>
            </Card>
            <div className="mt-4">
              <UpcomingInvoices cardId={cardId} months={6} />
            </div>
          </div>

          {/* Invoice details */}
          <div className="lg:col-span-3">
            {selectedInvoice ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        Período: {fmtDate(selectedInvoice.period_start)} - {fmtDate(selectedInvoice.period_end)}
                      </CardTitle>
                      <div className="mt-1">{statusBadge(selectedInvoice.status)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isOpen && (
                        <>
                          <Button size="sm" onClick={() => setAddModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" /> Adicionar Lançamento
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setExcelModalOpen(true)}>
                            <FileSpreadsheet className="w-4 h-4 mr-1" /> Importar Excel/CSV
                          </Button>
                          <Button size="sm" variant="outline" onClick={openPdfModal}>
                            <Upload className="w-4 h-4 mr-1" /> Importar PDF Bradesco
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setConfirmDeleteOpen(true)} title="Excluir fatura">
                        <Trash2 className="w-4 h-4 mr-1 text-destructive" /> Excluir fatura
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedInvoice.previous_balance > 0 && (
                    <div className="bg-muted rounded-lg p-3 mb-4">
                      <p className="text-sm">Saldo Anterior: <strong>{fmt(selectedInvoice.previous_balance)}</strong></p>
                    </div>
                  )}

                  {Object.keys(grouped).length === 0 && items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum lançamento nesta fatura.</p>
                  ) : (
                    <>
                      {people.map(person => {
                        const personTotal = person.cards.reduce((t, c) => t + c.items.reduce((u, i) => u + Number(i.amount), 0), 0);
                        return (
                          <div key={person.name} className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-foreground text-base">{person.name}</h3>
                              {person.cards.length > 1 && (
                                <span className="text-sm text-muted-foreground">
                                  Total {person.name}: <span className="font-medium text-foreground">{fmt(personTotal)}</span>
                                </span>
                              )}
                            </div>
                            {person.cards.map(cardGroup => {
                              const cardTotal = cardGroup.items.reduce((t, i) => t + Number(i.amount), 0);
                              const label = cardGroup.lastFour
                                ? `${cardGroup.kind ? CARD_KIND_LABEL[cardGroup.kind] : 'Cartão'} •••• ${cardGroup.lastFour}`
                                : null;
                              return (
                                <div key={cardGroup.lastFour || 'sem-cartao'} className="mb-4 rounded-lg border border-border/60 p-3">
                                  {label && <p className="text-sm font-medium mb-2">{label}</p>}
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Responsável</TableHead>
                                        <TableHead>Parcela</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {cardGroup.items.map(item => (
                                        <TableRow key={item.id}>
                                          <TableCell className="whitespace-nowrap">{fmtDateShort(item.transaction_date)}</TableCell>
                                          <TableCell>{item.description}</TableCell>
                                          <TableCell className="text-muted-foreground">{item.category}</TableCell>
                                          <TableCell>
                                            {item.holder_name === 'Pagamentos' || isPaymentLine(item.description) ? (
                                              <span className="text-muted-foreground">-</span>
                                            ) : splits[item.id]?.length ? (
                                              <button
                                                type="button"
                                                onClick={() => setSplittingItem(item)}
                                                className="text-xs text-left text-primary hover:underline flex items-center gap-1"
                                                title="Editar divisão"
                                              >
                                                <Scissors className="w-3 h-3 shrink-0" />
                                                <span>
                                                  {splits[item.id].map((s) => `${s.person.split(' ')[0]} ${Math.round((s.amount / Number(item.amount)) * 100)}%`).join(' · ')}
                                                </span>
                                              </button>
                                            ) : (
                                              <Select
                                                value={item.assigned_to || item.holder_name}
                                                onValueChange={(v) => reassignItem(item, v === item.holder_name ? null : v)}
                                              >
                                                <SelectTrigger className={`h-8 text-xs w-[190px] inline-flex ${item.assigned_to ? 'border-primary/60 text-primary' : ''}`} title={item.assigned_to ? `Compra no cartão de ${item.holder_name}, realocada` : 'Quem é responsável por esta despesa'}>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {[...new Set([item.holder_name, ...householdPeople])].map((p) => (
                                                    <SelectItem key={p} value={p}>{p}{p === item.holder_name ? ' (titular do cartão)' : thirdParties.has(p) ? ' (terceiro)' : ''}</SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            )}
                                            {item.holder_name !== 'Pagamentos' && !isPaymentLine(item.description) && !splits[item.id]?.length && (
                                              <button
                                                type="button"
                                                onClick={() => setSplittingItem(item)}
                                                className="ml-1 inline-flex items-center text-muted-foreground hover:text-primary align-middle"
                                                title="Dividir entre pessoas"
                                                aria-label="Dividir entre pessoas"
                                              >
                                                <Scissors className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {item.installment_current && item.installment_total
                                              ? `${item.installment_current}/${item.installment_total}`
                                              : '-'}
                                          </TableCell>
                                          <TableCell className={`text-right whitespace-nowrap ${Number(item.amount) < 0 ? 'text-emerald-600' : ''}`}>{fmt(Number(item.amount))}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  <p className="text-sm font-medium text-right mt-1 text-foreground">
                                    {label ?? person.name}: {fmt(cardTotal)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                      <div className="border-t pt-4 mt-4">
                        <p className="text-right font-bold text-lg text-foreground">
                          Total Geral: {fmt(Number(selectedInvoice.total_amount))}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecione ou crie uma fatura.
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <AddItemModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSave={handleAddItem}
          holders={uniqueHolders}
        />
        <ImportExcelModal
          open={excelModalOpen}
          onClose={() => setExcelModalOpen(false)}
          onConfirm={handleExcelImport}
          holders={uniqueHolders}
        />
        <SplitItemDialog
          item={splittingItem}
          current={splittingItem ? splits[splittingItem.id] ?? [] : []}
          people={householdPeople}
          thirdParties={thirdParties}
          onClose={() => setSplittingItem(null)}
          onSave={(shares) => (splittingItem ? setItemSplits(splittingItem, shares) : Promise.resolve(false))}
        />

        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir esta fatura?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedInvoice
                  ? `Período ${fmtDate(selectedInvoice.period_start)} a ${fmtDate(selectedInvoice.period_end)}. `
                  : ''}
                Apaga todos os lançamentos dela e as despesas geradas a partir deles. Não dá para desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (!selectedInvoiceId) return;
                  const ok = await deleteInvoice(selectedInvoiceId);
                  if (ok) setSelectedInvoiceId('');
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ImportPdfModal
          open={pdfModalOpen}
          categoryOptions={categorization?.options}
          suggest={categorization?.suggest}
          knownKinds={knownKinds}
          people={householdPeople}
          attribution={attribution}
          onClose={() => setPdfModalOpen(false)}
          onConfirm={handlePdfImport}
        />
      </main>
    </div>
  );
};

export default CardInvoices;
