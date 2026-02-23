import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Plus, ArrowLeft, Upload, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useInvoices } from '@/hooks/useCreditCards';
import { AddItemModal } from '@/components/cards/AddItemModal';
import { ImportExcelModal } from '@/components/cards/ImportExcelModal';
import { ImportPdfModal } from '@/components/cards/ImportPdfModal';

const CardInvoices = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    card, invoices, holders, items, loading,
    fetchItems, createInvoice, addItem, addItemsBatch, updatePreviousBalance,
  } = useInvoices(cardId || '');

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

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

  // Group items by holder
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.holder_name]) acc[item.holder_name] = [];
    acc[item.holder_name].push(item);
    return acc;
  }, {});

  const openInvoiceTotal = invoices
    .filter(i => i.status === 'OPEN')
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const available = card.total_limit - openInvoiceTotal;

  const handleAddItem = async (item: any) => {
    if (selectedInvoiceId) await addItem(selectedInvoiceId, item);
  };

  const handleExcelImport = async (importItems: any[]) => {
    if (selectedInvoiceId) await addItemsBatch(selectedInvoiceId, importItems);
  };

  const handlePdfImport = async (importItems: any[], prevBalance: number) => {
    if (selectedInvoiceId) {
      await addItemsBatch(selectedInvoiceId, importItems);
      if (prevBalance > 0) await updatePreviousBalance(selectedInvoiceId, prevBalance);
    }
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
                    {isOpen && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setAddModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-1" /> Adicionar Lançamento
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setExcelModalOpen(true)}>
                          <FileSpreadsheet className="w-4 h-4 mr-1" /> Importar Excel/CSV
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPdfModalOpen(true)}>
                          <Upload className="w-4 h-4 mr-1" /> Importar PDF Bradesco
                        </Button>
                      </div>
                    )}
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
                      {Object.entries(grouped).map(([holder, hItems]) => {
                        const holderTotal = hItems.reduce((s, i) => s + Number(i.amount), 0);
                        return (
                          <div key={holder} className="mb-6">
                            <h3 className="font-semibold text-foreground mb-2">{holder}</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Parcela</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {hItems.map(item => (
                                  <TableRow key={item.id}>
                                    <TableCell>{fmtDateShort(item.transaction_date)}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>
                                      {item.installment_current && item.installment_total
                                        ? `${item.installment_current}/${item.installment_total}`
                                        : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">{fmt(Number(item.amount))}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <p className="text-sm font-medium text-right mt-1 text-foreground">
                              Total {holder}: {fmt(holderTotal)}
                            </p>
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
          holders={holders}
        />
        <ImportExcelModal
          open={excelModalOpen}
          onClose={() => setExcelModalOpen(false)}
          onConfirm={handleExcelImport}
          holders={holders}
        />
        <ImportPdfModal
          open={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          onConfirm={handlePdfImport}
        />
      </main>
    </div>
  );
};

export default CardInvoices;
