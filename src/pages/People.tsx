import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Users, UserPlus, Trash2, HandCoins, Home, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { usePeople, type Person, type PersonKind } from '@/hooks/usePeople';
import { useReceivables } from '@/hooks/useReceivables';
import { toIsoDate } from '@/lib/dates';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => d.split('-').reverse().join('/');
const toNumber = (s: string) => {
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const People = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { people, loading, addThirdParty, removeThirdParty, updatePerson, refetch } = usePeople();
  const { receivables, charges, payments, loading: loadingRecv, addPayment, deletePayment, refetch: refetchRecv } = useReceivables();

  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(toIsoDate(new Date()));
  const [payNotes, setPayNotes] = useState('');
  const [removing, setRemoving] = useState<Person | null>(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [editName, setEditName] = useState('');
  const [editKind, setEditKind] = useState<PersonKind>('household');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const openEdit = (p: Person) => { setEditing(p); setEditName(p.name); setEditKind(p.kind); setEditNotes(p.notes ?? ''); };
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    const ok = await updatePerson(editing, { name: editName, kind: editKind, notes: editNotes });
    setSavingEdit(false);
    if (ok) { setEditing(null); refetchRecv(); }
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const household = people.filter((p) => p.kind === 'household');
  const third = people.filter((p) => p.kind === 'third_party');
  const balanceOf = (name: string) => receivables.find((r) => r.person === name);
  const totalOwed = receivables.reduce((s, r) => s + Math.max(0, r.balance), 0);

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await addThirdParty(newName, newNotes)) {
      setNewName('');
      setNewNotes('');
      refetchRecv();
    }
  };

  const submitPayment = async () => {
    if (!paying) return;
    const amount = toNumber(payAmount);
    if (amount <= 0) return;
    if (await addPayment(paying, amount, payDate, payNotes)) {
      setPaying(null);
      setPayAmount('');
      setPayNotes('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:ml-[var(--sidebar-w,16rem)] transition-[margin] duration-200 p-4 lg:p-8 pt-20 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" /> Pessoas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quem gasta nos seus cartões. Pessoas da casa entram nas suas análises; terceiros não — o que compram vira valor a receber.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Casa */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Home className="w-4 h-4" /> Casa</CardTitle>
                <p className="text-xs text-muted-foreground">Titulares e adicionais dos seus cartões. Gastos delas contam nas suas análises.</p>
              </CardHeader>
              <CardContent>
                {household.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Importe uma fatura para as pessoas da casa aparecerem.</p>
                ) : (
                  <ul className="space-y-1">
                    {household.map((p) => (
                      <li key={p.name} className="text-sm font-medium flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                        <span className="min-w-0">
                          <span className="block truncate">{p.name}</span>
                          {p.aliases && p.aliases.length > 0 && <span className="block text-[11px] text-muted-foreground font-normal truncate">na fatura: {p.aliases.join(', ')}</span>}
                          {p.notes && <span className="block text-xs text-muted-foreground font-normal truncate">{p.notes}</span>}
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => openEdit(p)} aria-label={`Editar ${p.name}`} title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Terceiros */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><HandCoins className="w-4 h-4" /> Terceiros</CardTitle>
                      <p className="text-xs text-muted-foreground">Quem usa seu cartão e te paga depois. As compras deles não entram nas suas despesas.</p>
                    </div>
                    {receivables.length > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total a receber</p>
                        <p className="text-lg font-bold">{fmt(totalOwed)}</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={submitNew} className="flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-1 w-full">
                      <Label htmlFor="new-person" className="text-xs">Nome</Label>
                      <Input id="new-person" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Carlos (cunhado)" required />
                    </div>
                    <div className="flex-1 w-full">
                      <Label htmlFor="new-notes" className="text-xs">Observação (opcional)</Label>
                      <Input id="new-notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Como te paga, etc." />
                    </div>
                    <Button type="submit"><UserPlus className="w-4 h-4 mr-1" /> Cadastrar</Button>
                  </form>

                  {third.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum terceiro cadastrado. Cadastre alguém acima e depois atribua compras a ele na fatura (Responsável ou Dividir).</p>
                  ) : (
                    <div className="space-y-3">
                      {third.map((p) => {
                        const r = balanceOf(p.name);
                        const open = expanded === p.name;
                        const myCharges = charges.filter((c) => c.person === p.name);
                        const myPayments = payments.filter((x) => x.person === p.name);
                        return (
                          <div key={p.name} className="rounded-lg border border-border/60">
                            <div className="flex items-center justify-between gap-3 p-3">
                              <button type="button" className="flex-1 text-left" onClick={() => setExpanded(open ? null : p.name)}>
                                <p className="font-medium flex items-center gap-2">
                                  {p.name}
                                  {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                </p>
                                {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {loadingRecv ? '…' : `comprou ${fmt(r?.charged ?? 0)} · pagou ${fmt(r?.paid ?? 0)}`}
                                </p>
                              </button>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">{(r?.balance ?? 0) < 0 ? 'crédito' : 'deve'}</p>
                                <p className={`font-bold ${(r?.balance ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(Math.abs(r?.balance ?? 0))}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => { setPaying(p.name); setPayAmount(r && r.balance > 0 ? r.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''); }}>
                                  <HandCoins className="w-3.5 h-3.5 mr-1" /> Pagamento
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => openEdit(p)} aria-label={`Editar ${p.name}`} title="Editar pessoa">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setRemoving(p)} aria-label={`Remover ${p.name}`} title="Remover pessoa">
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            {open && (
                              <div className="border-t border-border/60 p-3 space-y-4">
                                <div>
                                  <p className="text-xs font-medium mb-1">Compras atribuídas</p>
                                  {myCharges.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Nenhuma. Na fatura, escolha {p.name} como Responsável (ou numa divisão).</p>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Data</TableHead>
                                          <TableHead>Descrição</TableHead>
                                          <TableHead>Cartão</TableHead>
                                          <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {myCharges.map((c) => (
                                          <TableRow key={c.id}>
                                            <TableCell className="whitespace-nowrap">{fmtDate(c.date)}</TableCell>
                                            <TableCell>{c.description}{c.split ? <span className="text-xs text-muted-foreground"> (parte)</span> : ''}</TableCell>
                                            <TableCell className="text-muted-foreground whitespace-nowrap">•••• {c.card_last_four ?? '—'} · {c.card_holder.split(' ')[0]}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{fmt(c.amount)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-medium mb-1">Pagamentos recebidos</p>
                                  {myPayments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Nenhum ainda.</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {myPayments.map((x) => (
                                        <li key={x.id} className="flex items-center justify-between text-sm">
                                          <span>{fmtDate(x.date)}{x.notes ? <span className="text-muted-foreground"> · {x.notes}</span> : ''}</span>
                                          <span className="flex items-center gap-2">
                                            <span className="text-emerald-600">{fmt(x.amount)}</span>
                                            <button type="button" onClick={() => deletePayment(x.id)} className="text-muted-foreground hover:text-destructive" title="Excluir pagamento" aria-label="Excluir pagamento">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Registrar pagamento */}
        <Dialog open={!!paying} onOpenChange={(o) => { if (!o) setPaying(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar pagamento</DialogTitle>
              <DialogDescription>{paying} te pagou:</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pay-amount">Valor</Label>
                <Input id="pay-amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0,00" inputMode="decimal" />
              </div>
              <div>
                <Label htmlFor="pay-date">Data</Label>
                <Input id="pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pay-notes">Observação (opcional)</Label>
                <Input id="pay-notes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Pix, dinheiro…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaying(null)}>Cancelar</Button>
              <Button onClick={submitPayment} disabled={toNumber(payAmount) <= 0}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remover terceiro */}
        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitEdit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4" /> Editar pessoa</DialogTitle>
              <DialogDescription>
                Renomear atualiza faturas, transações e pagamentos já lançados. O nome antigo fica guardado para as próximas faturas importadas caírem nesta pessoa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div>
                <Label htmlFor="edit-name" className="text-xs">Nome</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} required autoFocus />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={editKind} onValueChange={(v) => setEditKind(v as PersonKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="household">Casa — gastos contam nas minhas análises</SelectItem>
                    <SelectItem value="third_party">Terceiro — me paga depois (não é despesa minha)</SelectItem>
                  </SelectContent>
                </Select>
                {editing && editKind !== editing.kind && (
                  <p className="text-xs text-amber-600 mt-1">Mudar o tipo refaz as despesas das compras desta pessoa nas transações.</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-notes" className="text-xs">Observação</Label>
                <Textarea id="edit-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} placeholder="Como te paga, parentesco, etc." />
              </div>
              {editing?.aliases && editing.aliases.length > 0 && (
                <p className="text-xs text-muted-foreground">Também reconhecido como: {editing.aliases.join(', ')}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>Cancelar</Button>
              <Button type="submit" disabled={savingEdit || !editName.trim()}>{savingEdit ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover {removing?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                As compras já atribuídas continuam com o nome dela na fatura, mas deixam de ser tratadas como de terceiro e passam a contar como despesa sua. Os pagamentos registrados ficam guardados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { if (removing?.id) { await removeThirdParty(removing.id); refetch(); refetchRecv(); } setRemoving(null); }}>
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default People;
