-- Roda a funcao de transacoes recorrentes todo dia as 06:00 UTC (03:00 BRT).
-- O agendamento original vivia no Lovable e nao veio nas migrations. A chave
-- abaixo e a anon (publica, a mesma servida ao navegador); a funcao tem
-- verify_jwt = false e usa a service role internamente.
select cron.unschedule(jobid) from cron.job where jobname = 'process-recurring-transactions-daily';
select cron.schedule(
  'process-recurring-transactions-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://pscyowgeyuzpecfcwabw.supabase.co/functions/v1/process-recurring-transactions',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzY3lvd2dleXV6cGVjZmN3YWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzczNDIsImV4cCI6MjEwNDc1MzM0Mn0.rHRjRHzBiNHmWdEzixw92LLWGG3TC8mHXHrSwyI4nek"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
