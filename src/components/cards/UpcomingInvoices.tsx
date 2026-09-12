import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarClock } from 'lucide-react';
import { useUpcomingInvoices } from '@/hooks/useUpcomingInvoices';

interface Props {
  cardId?: string;
  months?: number;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fmtMonth = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

/** Tabela "Proximas faturas": comprometido (parcelas) e estimado (recorrentes), mes a mes. */
export function UpcomingInvoices({ cardId, months = 6 }: Props) {
  const { projection, byPerson, loading } = useUpcomingInvoices(cardId, months);
  // Pseudo-pessoas sem projecao (ex.: "Pagamentos") nao viram coluna.
  const people = Object.keys(byPerson).filter((p) => byPerson[p].some((m) => m.committed + m.estimated !== 0)).sort((a, b) => {
    const ta = byPerson[a].reduce((s, m) => s + m.committed + m.estimated, 0);
    const tb = byPerson[b].reduce((s, m) => s + m.committed + m.estimated, 0);
    return tb - ta;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4" /> Próximas faturas
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Comprometido</span> = parcelas já assumidas (valor certo).{' '}
          <span className="font-medium text-foreground">Estimado</span> = gastos que se repetem nas suas faturas.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : projection.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Importe uma fatura para ver a projeção.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  {people.map((p) => <TableHead key={p} className="text-right whitespace-nowrap">{p}</TableHead>)}
                  <TableHead className="text-right">Comprometido</TableHead>
                  <TableHead className="text-right">Estimado</TableHead>
                  <TableHead className="text-right">Provável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projection.map((m, k) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{fmtMonth(m.month)}</TableCell>
                    {people.map((p) => {
                      const v = byPerson[p][k];
                      return (
                        <TableCell key={p} className="text-right whitespace-nowrap" title={`${fmt(v.committed)} parcelas + ${fmt(v.estimated)} estimado`}>
                          {fmt(v.committed + v.estimated)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right whitespace-nowrap">{fmt(m.committed)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap text-muted-foreground">{fmt(m.estimated)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap font-semibold">{fmt(m.committed + m.estimated)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {people.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">Colunas por pessoa = provável (parcelas + estimado). Passe o mouse para ver a divisão.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
