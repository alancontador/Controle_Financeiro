import { useEffect, useRef } from 'react';

/**
 * Barramento simples de "os dados mudaram". Os hooks de dados buscam uma vez
 * no mount e nao conversam entre si; sem isto, uma transacao criada no
 * cabecalho nao aparecia no dashboard e uma fatura importada nao mexia nos
 * numeros ate recarregar a pagina. Toda mutacao chama `notifyDataChanged()`;
 * quem exibe dados usa `useDataChanged(refetch)`, que tambem refaz a busca
 * quando a aba volta a ficar visivel.
 */
const EVENT = 'fin:data-changed';

export type DataScope = 'transactions' | 'cards' | 'people' | 'budgets' | 'goals' | 'categories' | 'recurring' | 'investments' | 'all';

export function notifyDataChanged(scope: DataScope = 'all') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DataScope>(EVENT, { detail: scope }));
}

/**
 * Refaz a busca quando algum dado muda (em qualquer escopo listado, ou em
 * qualquer um se `scopes` for omitido) e quando a aba volta ao foco.
 */
export function useDataChanged(refetch: () => void | Promise<unknown>, scopes?: DataScope[]) {
  const ref = useRef(refetch);
  ref.current = refetch;
  const key = scopes?.join(',') ?? '';
  useEffect(() => {
    const wanted = key ? key.split(',') : null;
    const onChange = (e: Event) => {
      const scope = (e as CustomEvent<DataScope>).detail ?? 'all';
      if (!wanted || scope === 'all' || wanted.includes(scope)) void ref.current();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void ref.current(); };
    window.addEventListener(EVENT, onChange);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(EVENT, onChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key]);
}
