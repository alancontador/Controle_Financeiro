import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { COMMON_PERSON, buildAliasMap, effectivePerson, type AliasMap } from '@/lib/people';
import { itemToTransaction, MIRROR_NOTE } from '@/lib/cards/mirror';
import { notifyDataChanged, useDataChanged } from '@/lib/dataEvents';


export type PersonKind = 'household' | 'third_party';

export interface Person {
  name: string;
  kind: PersonKind;
  /** Presente so para pessoas cadastradas na tabela people (terceiros). */
  id?: string;
  notes?: string | null;
  /** Nomes antigos (como vem na fatura) que apontam para esta pessoa. */
  aliases?: string[];
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
  // Primeira carga mostra o loading; as atualizacoes por evento sao silenciosas (sem piscar).
  const hasLoaded = useRef(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    if (!hasLoaded.current) setLoading(true);
    const [holdersRes, txRes, peopleRes] = await Promise.all([
      supabase.from('card_holders').select('holder_name'),
      supabase.from('transactions').select('holder_name').eq('user_id', user.id).not('holder_name', 'is', null).limit(1000),
      supabase.from('people').select('id, name, kind, notes, aliases').eq('user_id', user.id).order('name'),
    ]);
    const registered = (peopleRes.data ?? []).map((p) => ({ id: p.id, name: p.name.trim(), kind: p.kind as PersonKind, notes: p.notes, aliases: p.aliases ?? [] }));
    const aliasOf = buildAliasMap(registered);
    const canon = (n: string) => aliasOf.get(n.trim().toUpperCase().replace(/\s+/g, ' ')) ?? n.trim();
    const thirdNames = new Set(registered.filter((p) => p.kind === 'third_party').map((p) => p.name));

    const household = new Set<string>();
    for (const h of holdersRes.data ?? []) if (h.holder_name?.trim()) household.add(canon(h.holder_name));
    for (const t of txRes.data ?? []) if (t.holder_name?.trim() && !thirdNames.has(canon(t.holder_name))) household.add(canon(t.holder_name));
    for (const n of thirdNames) household.delete(n);
    for (const p of registered) if (p.kind === 'household') household.add(p.name);
    household.delete(COMMON_PERSON);

    const list: Person[] = [
      ...[...household].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((name) => ({ name, kind: 'household' as PersonKind, ...(registered.find((p) => p.name === name) ?? {}) })),
      ...registered.filter((p) => p.kind === 'third_party').sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    ];
    setPeople(list);
    setLoading(false);
    hasLoaded.current = true;
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  useDataChanged(fetch, ['people', 'cards']);

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
    notifyDataChanged('people');
    await fetch();
    return true;
  };

  const removeThirdParty = async (id: string) => {
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover pessoa', description: error.message, variant: 'destructive' });
      return false;
    }
    notifyDataChanged('people');
    await fetch();
    return true;
  };

  /**
   * Edita uma pessoa. Renomear propaga para faturas, transacoes, pagamentos e
   * memoria (RPC rename_person) e guarda o nome antigo como apelido, para a
   * proxima fatura importada cair nesta pessoa. Mudar casa <-> terceiro
   * re-espelha as compras dela (terceiro nao tem despesa; casa tem).
   */
  const updatePerson = async (person: Person, changes: { name: string; kind: PersonKind; notes?: string | null }) => {
    if (!user) return false;
    const newName = changes.name.trim();
    if (!newName) return false;
    const renamed = newName !== person.name;
    if (renamed && people.some((p) => p.name === newName)) {
      toast({ title: 'Já existe uma pessoa com esse nome', variant: 'destructive' });
      return false;
    }
    if (renamed) {
      const { error } = await supabase.rpc('rename_person', { p_old: person.name, p_new: newName });
      if (error) {
        toast({ title: 'Erro ao renomear', description: error.message, variant: 'destructive' });
        return false;
      }
    }
    const aliases = [...new Set([...(person.aliases ?? []), ...(renamed ? [person.name] : [])])].filter((a) => a !== newName);
    const row = { user_id: user.id, name: newName, kind: changes.kind, notes: changes.notes?.trim() || null, aliases };
    const { error } = person.id
      ? await supabase.from('people').update(row).eq('id', person.id)
      : await supabase.from('people').insert(row);
    if (error) {
      toast({ title: 'Erro ao salvar pessoa', description: error.message, variant: 'destructive' });
      return false;
    }
    if (changes.kind !== person.kind) await remirrorPerson(newName, changes.kind === 'third_party');
    toast({ title: renamed ? `${person.name} agora é ${newName}` : 'Pessoa atualizada' });
    notifyDataChanged('people');
    await fetch();
    return true;
  };

  /** Refaz as despesas espelhadas das compras de uma pessoa depois de mudar casa <-> terceiro. */
  const remirrorPerson = async (name: string, isThirdParty: boolean) => {
    if (!user) return;
    const { data: items } = await supabase
      .from('invoice_items')
      .select('id, holder_name, assigned_to, card_last_four, description, amount, transaction_date, category_id, splits:invoice_item_splits(person, amount)')
      .or(`holder_name.eq.${JSON.stringify(name)},assigned_to.eq.${JSON.stringify(name)}`);
    const { data: splitItems } = await supabase.from('invoice_item_splits').select('item_id').eq('person', name);
    const ids = new Set([...(items ?? []).map((i) => i.id), ...(splitItems ?? []).map((s) => s.item_id)]);
    if (ids.size === 0) return;
    const { data: all } = await supabase
      .from('invoice_items')
      .select('id, holder_name, assigned_to, card_last_four, description, amount, transaction_date, category_id, splits:invoice_item_splits(person, amount)')
      .in('id', [...ids]);
    const thirdParties = await loadThirdPartySet(user.id);
    if (isThirdParty) thirdParties.add(name); else thirdParties.delete(name);
    await supabase.from('transactions').delete().in('invoice_item_id', [...ids]);
    const rows = (all ?? []).flatMap((row) => {
      const item = { ...row, amount: Number(row.amount) };
      const shares = (row.splits ?? []) as { person: string; amount: number }[];
      if (shares.length > 0) {
        const base = itemToTransaction({ ...item, assigned_to: null }, user.id);
        return base ? shares.filter((s) => !thirdParties.has(s.person)).map((s) => ({ ...base, holder_name: s.person, amount: Number(s.amount), notes: `${MIRROR_NOTE} · dividido` })) : [];
      }
      const t = itemToTransaction(item, user.id, thirdParties);
      return t ? [t] : [];
    });
    if (rows.length) await supabase.from('transactions').insert(rows);
    void effectivePerson;
  };

  const names = people.map((p) => p.name);
  const thirdParties = new Set(people.filter((p) => p.kind === 'third_party').map((p) => p.name));

  return { people, names, thirdParties, loading, refetch: fetch, addThirdParty, removeThirdParty, updatePerson, COMMON_PERSON };
}

/** Apelidos (nome na fatura -> nome escolhido), para a importacao. */
export async function loadAliasMap(userId: string): Promise<AliasMap> {
  const { data } = await supabase.from('people').select('name, aliases').eq('user_id', userId);
  return buildAliasMap(data ?? []);
}

/** Nomes dos terceiros, para quem so precisa decidir "e despesa minha ou recebivel?". */
export async function loadThirdPartySet(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('people').select('name').eq('user_id', userId).eq('kind', 'third_party');
  return new Set((data ?? []).map((p) => p.name.trim()));
}
