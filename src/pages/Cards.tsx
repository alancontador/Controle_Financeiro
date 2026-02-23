import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCreditCards } from '@/hooks/useCreditCards';
import { CreditCardVisual } from '@/components/cards/CreditCardVisual';
import { CardModal } from '@/components/cards/CardModal';
import type { CreditCard as CreditCardType } from '@/hooks/useCreditCards';

const Cards = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { cards, loading, openInvoiceTotals, createCard, updateCard } = useCreditCards();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);

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

  const handleSave = (data: any) => {
    if (editingCard) {
      const { holder_name, ...rest } = data;
      updateCard(editingCard.id, rest);
    } else {
      createCard(data);
    }
    setEditingCard(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Meus Cartões</h1>
              <p className="text-muted-foreground text-sm mt-1">Gerencie seus cartões de crédito</p>
            </div>
            <Button onClick={() => { setEditingCard(null); setModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Cartão
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum cartão cadastrado.</p>
            <Button className="mt-4" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Cadastrar Cartão
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card, i) => (
              <motion.div key={card.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <CreditCardVisual
                  card={card}
                  usedAmount={openInvoiceTotals[card.id] || 0}
                  onEdit={() => { setEditingCard(card); setModalOpen(true); }}
                  onViewInvoices={() => navigate(`/cartoes/${card.id}/faturas`)}
                />
              </motion.div>
            ))}
          </div>
        )}

        <CardModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingCard(null); }}
          onSave={handleSave}
          card={editingCard}
        />
      </main>
    </div>
  );
};

export default Cards;
