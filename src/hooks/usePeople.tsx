import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { COMMON_PERSON } from '@/lib/people';

export type PersonKind = 'household' | 'third_party';

export interface Person {
  name: string;
  kind: PersonKind;
  /** Presente so para pessoas cadastradas na tabela people (terceiros). */
  id?: string;
  notes?: string | null;
}

/**
 * Pessoas: as da casa vem dos cartoes (titulares e adicionais) e de transacoes
 * ja atribuidas; os terceiros (quem usa o cartao emprestado e paga depois)
 * sao cadastrados na tabela people. Compras de terceiros nao viram despesa do
 * usuario - vao para o controle de recebiveis.
 */
export function usePeople() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [holdersRes, txRes, peopleRes] = await Promise.all([
      supabase.from('card_holders').select('holder_name'),
      supabase.from('transactions').select('holder_name').eq('user_id', user.id).not('holder_name', 'is', null).limit(1000),
      supabase.from('people').select('id, name, kind, notes').eq('user_id', user.id).order('name'),
    ]);
    const registered = (peopleRes.data ?? []).map((p) => ({ id: p.id, name: p.name.trim(), kind: p.kind as PersonKind, notes: p.notes }));
    const thirdNames = new Set(registered.filter((p) => p.kind === 'third_party').map((p) => p.name));

    const household = new Set<string>();
    for (const h of holdersRes.data ?? []) if (h.holder_name?.trim()) household.add(h.holder_name.trim());
    for (const t of txRes.data ?? []) if (t.holder_name?.trim() && !thirdNames.has(t.holder_name.trim())) household.add(t.holder_name.trim());
    for (const p of registered) if (p.kind === 'household') household.add(p.name);
    household.delete(COMMON_PERSON);

    const list: Person[] = [
      ...[...household].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((name) => ({ name, kind: 'household' as PersonKind, ...(registered.find((p) => p.name === name) ?? {}) })),
      ...registered.filter((p) => p.kind === 'third_party').sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    ];
    setPeople(list);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addThirdParty = async (name: string, notes?: string) => {
    if (!user) return false;
    const clean = name.trim();
    if (!clean) return false;
    const { error } = await supabase.from('people').insert({ user_id: user.id, name: clean, kind: 'third_party', notes: notes?.trim() || null });
    if (error) {
      toast({ title: 'Erro ao cadastrar pessoa', description: error.code === '23505' ? 'Já existe uma pessoa com esse nome.' : error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: `${clean} cadastrado(a)` });
    await fetch();
    return true;
  };

  const removeThirdParty = async (id: string) => {
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover pessoa', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetch();
    return true;
  };

  const names = people.map((p) => p.name);
  const thirdParties = new Set(people.filter((p) => p.kind === 'third_party').map((p) => p.name));

  return { people, names, thirdParties, loading, refetch: fetch, addThirdParty, removeThirdParty, COMMON_PERSON };
}

/** Nomes dos terceiros, para quem so precisa decidir "e despesa minha ou recebivel?". */
export async function loadThirdPartySet(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('people').select('name').eq('user_id', userId).eq('kind', 'third_party');
  return new Set((data ?? []).map((p) => p.name.trim()));
}
