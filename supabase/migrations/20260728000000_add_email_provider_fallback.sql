ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS provider text;

CREATE TABLE IF NOT EXISTS public.email_delivery_counters (
  counter_date date NOT NULL,
  source text NOT NULL,
  provider text NOT NULL,
  reserved_count integer NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (counter_date, source, provider),
  CHECK (source IN ('utility')),
  CHECK (provider IN ('resend', 'smtp'))
);

ALTER TABLE public.email_delivery_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_delivery_counters FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_confirmation_email_provider(
  p_source text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  v_provider text;
BEGIN
  IF p_source <> 'utility' THEN
    RETURN 'resend';
  END IF;

  INSERT INTO public.email_delivery_counters (
    counter_date,
    source,
    provider,
    reserved_count
  )
  VALUES
    (v_today, 'utility', 'resend', 0),
    (v_today, 'utility', 'smtp', 0)
  ON CONFLICT (counter_date, source, provider) DO NOTHING;

  UPDATE public.email_delivery_counters
  SET
    reserved_count = reserved_count + 1,
    updated_at = now()
  WHERE counter_date = v_today
    AND source = 'utility'
    AND provider = 'resend'
    AND reserved_count < 100
  RETURNING provider INTO v_provider;

  IF v_provider IS NOT NULL THEN
    RETURN v_provider;
  END IF;

  -- A personal Gmail account is limited to 500 messages/day. Keep a
  -- 100-message safety buffer for normal mailbox use and retries.
  UPDATE public.email_delivery_counters
  SET
    reserved_count = reserved_count + 1,
    updated_at = now()
  WHERE counter_date = v_today
    AND source = 'utility'
    AND provider = 'smtp'
    AND reserved_count < 400
  RETURNING provider INTO v_provider;

  RETURN COALESCE(v_provider, 'limit_reached');
END;
$$;

CREATE OR REPLACE FUNCTION public.release_confirmation_email_provider(
  p_source text,
  p_provider text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.email_delivery_counters
  SET
    reserved_count = GREATEST(reserved_count - 1, 0),
    updated_at = now()
  WHERE counter_date = (now() AT TIME ZONE 'Africa/Lagos')::date
    AND source = p_source
    AND provider = p_provider;
$$;

REVOKE ALL ON FUNCTION public.reserve_confirmation_email_provider(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_confirmation_email_provider(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_confirmation_email_provider(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_confirmation_email_provider(text, text) TO service_role;
