import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Investment } from "@/hooks/useInvestments";
import { Dividend } from "./DividendsWidget";

interface DividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Dividend, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'investment'>) => void;
  dividend: Dividend | null;
  investments: Investment[];
}

const typeOptions = [
  { value: "dividend", label: "Dividendo" },
  { value: "jcp", label: "JCP (Juros sobre Capital Próprio)" },
  { value: "rental", label: "Aluguel (FII)" },
];

export function DividendModal({
  isOpen,
  onClose,
  onSave,
  dividend,
  investments,
}: DividendModalProps) {
  const [investmentId, setInvestmentId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [type, setType] = useState<"dividend" | "jcp" | "rental">("dividend");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (dividend) {
      setInvestmentId(dividend.investment_id || "");
      setAmount(String(dividend.amount));
      setPaymentDate(dividend.payment_date);
      setType(dividend.type as "dividend" | "jcp" | "rental");
      setNotes(dividend.notes || "");
    } else {
      setInvestmentId("");
      setAmount("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setType("dividend");
      setNotes("");
    }
  }, [dividend, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !paymentDate) return;

    onSave({
      investment_id: investmentId || null,
      amount: parseFloat(amount),
      payment_date: paymentDate,
      type,
      notes: notes || null,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {dividend ? "Editar Dividendo" : "Registrar Dividendo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="investment">Ativo</Label>
            <Select value={investmentId} onValueChange={setInvestmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ativo" />
              </SelectTrigger>
              <SelectContent>
                {investments.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.ticker} - {inv.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data do Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Provento</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o dividendo..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {dividend ? "Salvar" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
