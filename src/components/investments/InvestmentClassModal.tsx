import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestmentClass } from "@/hooks/useInvestments";

interface InvestmentClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<InvestmentClass, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  investmentClass?: InvestmentClass | null;
}

const colorOptions = [
  'hsl(255 75% 64%)',
  'hsl(160 100% 39%)',
  'hsl(35 100% 50%)',
  'hsl(200 100% 50%)',
  'hsl(340 82% 52%)',
  'hsl(280 100% 60%)',
  'hsl(45 100% 50%)',
  'hsl(180 100% 40%)',
];

export function InvestmentClassModal({ isOpen, onClose, onSave, investmentClass }: InvestmentClassModalProps) {
  const [name, setName] = useState('');
  const [targetAllocation, setTargetAllocation] = useState('0');
  const [color, setColor] = useState(colorOptions[0]);

  useEffect(() => {
    if (investmentClass) {
      setName(investmentClass.name);
      setTargetAllocation(investmentClass.target_allocation.toString());
      setColor(investmentClass.color);
    } else {
      setName('');
      setTargetAllocation('0');
      setColor(colorOptions[0]);
    }
  }, [investmentClass, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      target_allocation: parseFloat(targetAllocation) || 0,
      color,
      icon: null,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {investmentClass ? 'Editar Classe de Ativo' : 'Nova Classe de Ativo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ações BR, Renda Fixa..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocation">Alocação Alvo (%)</Label>
            <Input
              id="allocation"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={targetAllocation}
              onChange={(e) => setTargetAllocation(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {investmentClass ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}