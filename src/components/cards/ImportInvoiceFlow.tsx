import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractPdfLines } from '@/lib/pdf/extractText';
import { parseBradescoFatura, type BradescoParseResult } from '@/lib/pdf/bradesco';
import { CardModal, type CardFormData } from '@/components/cards/CardModal';
import { ImportPdfModal, type ImportedInvoiceItem } from '@/components/cards/ImportPdfModal';
import { useInvoiceImport, type Categorization } from '@/hooks/useInvoiceImport';
import { usePeople } from '@/hooks/usePeople';
import type { CardKind, InvoiceCard } from '@/lib/cards/kinds';
import type { CreditCard, Invoice } from '@/hooks/useCreditCards';

interface Props {
  cards: CreditCard[];
  createCard: (data: CardFormData) => Promise<CreditCard | null | undefined>;
  onImported: (cardId: string, invoiceId: string) => void;
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** Sugestao de cadastro a partir do cabecalho da fatura. */
function cardFromHeader(parsed: BradescoParseResult): Partial<CardFormData> {
  const { header, dueDate } = parsed;
  const brandLabel = header.brandLabel ? titleCase(header.brandLabel) : header.brand;
  return {
    nickname: `${header.bank} ${brandLabel}`,
    brand: header.brand,
    issuer_bank: header.bank,
    last_four_digits: header.lastFour ?? '',
    total_limit: header.limit,
    closing_day: header.closingDate ? Number(header.closingDate.slice(8, 10)) : undefined,
    due_day: dueDate ? Number(dueDate.slice(8, 10)) : undefined,
    holder_name: header.holders[0] ?? '',
  };
}

/**
 * Botao "Importar fatura" da aba Cartoes e o fluxo que ele dispara:
 * PDF -> cartao (existente ou cadastro pre-preenchido) -> fatura duplicada? -> revisao -> importa.
 */
export function ImportInvoiceFlow({ cards, createCard, onImported }: Props) {
  const { toast } = useToast();
  const { findCardByLastFour, findExistingInvoice, importInvoice, loadCategorization, loadKnownKinds } = useInvoiceImport();
  const { people } = usePeople();
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<BradescoParseResult | null>(null);
  const [categorization, setCategorization] = useState<Categorization | null>(null);
  const [knownKinds, setKnownKinds] = useState<Map<string, CardKind>>(new Map());
  const [cardId, setCardId] = useState<string | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [duplicate, setDuplicate] = useState<Invoice | null>(null);
  const [replace, setReplace] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  // Os dialogs chamam onClose/onOpenChange(false) tanto ao cancelar quanto ao
  // avancar (salvar, substituir). Estes refs dizem se o fechamento foi um avanco.
  const savingCardRef = useRef(false);
  const replacingRef = useRef(false);

  const resetAll = () => {
    replacingRef.current = false;
    setParsed(null);
    setCategorization(null);
    setKnownKinds(new Map());
    setCardId(null);
    setCardModalOpen(false);
    setDuplicate(null);
    setReplace(false);
    setReviewOpen(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const result = parseBradescoFatura(await extractPdfLines(await file.arrayBuffer()));
      if (result.error) {
        toast({ title: 'Não foi possível ler a fatura', description: result.error, variant: 'destructive' });
        return;
      }
      if (!result.header.closingDate) {
        toast({
          title: 'Fatura sem data de fechamento',
          description: 'Não encontrei a data de fechamento no PDF; importe pela tela da fatura escolhendo o período.',
          variant: 'destructive',
        });
        return;
      }
      setParsed(result);
      setCategorization(await loadCategorization());
      const existing = findCardByLastFour(cards, result.header.lastFour);
      if (existing) {
        await continueWithCard(existing.id, result);
      } else {
        setCardModalOpen(true);
      }
    } catch (err) {
      toast({
        title: 'Erro ao processar o PDF',
        description: err instanceof Error ? err.message : 'formato incompatível',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCardSaved = async (data: CardFormData) => {
    if (!parsed) return;
    savingCardRef.current = true;
    setBusy(true);
    const card = await createCard(data);
    setBusy(false);
    savingCardRef.current = false;
    if (!card) return resetAll();
    await continueWithCard(card.id, parsed);
  };

  /** Com o cartao resolvido: checa duplicidade e abre a revisao. */
  const continueWithCard = async (id: string, result: BradescoParseResult) => {
    setCardId(id);
    setKnownKinds(await loadKnownKinds(id));
    const existing = await findExistingInvoice(id, result.header.closingDate!);
    if (existing) {
      setDuplicate(existing);
    } else {
      setReviewOpen(true);
    }
  };

  const handleConfirm = async (items: ImportedInvoiceItem[], previousBalance: number, cards: InvoiceCard[]) => {
    if (!parsed || !cardId || !categorization) return;
    setBusy(true);
    const outcome = await importInvoice(
      { cardId, header: parsed.header, items, previousBalance, closingDate: parsed.header.closingDate!, categorization, cards },
      { replace },
    );
    setBusy(false);
    if (outcome.status === 'ok') {
      onImported(cardId, outcome.invoiceId);
    } else if (outcome.status === 'duplicate') {
      // A fatura apareceu entre a checagem e a confirmacao: nao sobrescreve em silencio.
      toast({ title: 'Fatura já importada', description: 'Abra a fatura e escolha Substituir para reimportar.', variant: 'destructive' });
    }
    // O modal de revisao chama onClose (resetAll) ao terminar.
  };

  const fmtDate = (d: string) => d.split('-').reverse().join('/');

  return (
    <>
      <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        Importar fatura
      </Button>
      <Input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />

      <CardModal
        open={cardModalOpen}
        onClose={() => { setCardModalOpen(false); if (!savingCardRef.current) resetAll(); }}
        onSave={handleCardSaved}
        initial={parsed ? cardFromHeader(parsed) : undefined}
        title="Confirme os dados do cartão"
      />

      <AlertDialog open={!!duplicate} onOpenChange={(o) => { if (!o && !replacingRef.current) resetAll(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esta fatura já foi importada</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma fatura deste cartão com fechamento em {duplicate ? fmtDate(duplicate.period_end) : ''}.
              Substituir apaga os lançamentos atuais dela e importa os do PDF de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { replacingRef.current = true; setReplace(true); setDuplicate(null); setReviewOpen(true); }}>
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportPdfModal
        open={reviewOpen}
        parsed={parsed}
        categoryOptions={categorization?.options}
        suggest={categorization?.suggest}
        knownKinds={knownKinds}
        people={people}
        onClose={resetAll}
        onConfirm={handleConfirm}
      />
    </>
  );
}
