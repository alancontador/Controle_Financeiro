import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { COMMON_PERSON } from '@/lib/people';

/**
 * Pessoas da casa: os nomes que aparecem como titulares/adicionais nos cartoes
 * do usuario, mais os que ja foram usados em transacoes. "Casa/Comum" fecha a
 * lista para o que nao tem dono.
 */
export function usePeople() {
  const { user } = useAuth();
  const [people, setPeople] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [holdersRes, txRes] = await Promise.all([
      supabase.from('card_holders').select('holder_name'),
      supabase.from('transactions').select('holder_name').eq('user_id', user.id).not('holder_name', 'is', null).limit(1000),
    ]);
    const names = new Set<string>();
    for (const h of holdersRes.data ?? []) if (h.holder_name?.trim()) names.add(h.holder_name.trim());
    for (const t of txRes.data ?? []) if (t.holder_name?.trim()) names.add(t.holder_name.trim());
    names.delete(COMMON_PERSON);
    setPeople([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { people, loading, refetch: fetch, COMMON_PERSON };
}
