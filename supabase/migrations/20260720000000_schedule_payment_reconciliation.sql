CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'reconcile-payments-every-5-minutes';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'reconcile-payments-every-5-minutes',
  '*/5 * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://sfsmorwxipeuvdriqzft.supabase.co/functions/v1/reconcile-payments',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-reconcile-token', (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'reconcile_payments_token'
          LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $job$
);
