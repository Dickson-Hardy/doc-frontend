CREATE OR REPLACE FUNCTION public.login_scanner_with_code(
  p_code text,
  p_device_id text
)
RETURNS TABLE (
  session_token text,
  scanner_id uuid,
  scanner_name text,
  scanner_email text,
  expires_at timestamptz,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_code text := upper(trim(COALESCE(p_code, '')));
  v_device_hash text;
  v_access public.scanner_access_codes%ROWTYPE;
  v_attempt public.scanner_login_attempts%ROWTYPE;
  v_token text;
  v_session_expiry timestamptz;
  v_next_failed_count integer;
BEGIN
  IF length(COALESCE(p_device_id, '')) < 16 THEN
    RAISE EXCEPTION 'A valid device identifier is required' USING ERRCODE = '22023';
  END IF;

  v_device_hash := encode(extensions.digest(p_device_id, 'sha256'), 'hex');

  SELECT *
  INTO v_attempt
  FROM public.scanner_login_attempts AS login_attempt
  WHERE login_attempt.device_hash = v_device_hash;

  IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until > now() THEN
    RETURN QUERY
    SELECT
      NULL::text,
      NULL::uuid,
      NULL::text,
      NULL::text,
      NULL::timestamptz,
      'Too many attempts. Try again in 15 minutes.'::text;
    RETURN;
  END IF;

  SELECT *
  INTO v_access
  FROM public.scanner_access_codes AS scanner_access
  WHERE scanner_access.code_lookup = encode(extensions.digest(v_normalized_code, 'sha256'), 'hex')
    AND scanner_access.code_hash = extensions.crypt(v_normalized_code, scanner_access.code_hash)
  FOR UPDATE;

  IF NOT FOUND OR NOT v_access.is_active OR v_access.expires_at <= now() THEN
    v_next_failed_count := CASE
      WHEN v_attempt.device_hash IS NULL
        OR v_attempt.window_started_at < now() - interval '15 minutes'
        THEN 1
      ELSE v_attempt.failed_count + 1
    END;

    INSERT INTO public.scanner_login_attempts (
      device_hash,
      failed_count,
      window_started_at,
      locked_until,
      updated_at
    )
    VALUES (
      v_device_hash,
      v_next_failed_count,
      CASE
        WHEN v_attempt.device_hash IS NULL
          OR v_attempt.window_started_at < now() - interval '15 minutes'
          THEN now()
        ELSE v_attempt.window_started_at
      END,
      CASE
        WHEN v_next_failed_count >= 5 THEN now() + interval '15 minutes'
        ELSE NULL
      END,
      now()
    )
    ON CONFLICT (device_hash) DO UPDATE
    SET
      failed_count = EXCLUDED.failed_count,
      window_started_at = EXCLUDED.window_started_at,
      locked_until = EXCLUDED.locked_until,
      updated_at = now();

    RETURN QUERY
    SELECT
      NULL::text,
      NULL::uuid,
      NULL::text,
      NULL::text,
      NULL::timestamptz,
      'Invalid or expired scanner code'::text;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.scanner_sessions AS active_session
    WHERE active_session.access_code_id = v_access.id
      AND active_session.revoked_at IS NULL
      AND active_session.expires_at > now()
      AND active_session.device_hash <> v_device_hash
  ) THEN
    RETURN QUERY
    SELECT
      NULL::text,
      NULL::uuid,
      NULL::text,
      NULL::text,
      NULL::timestamptz,
      'This code is active on another device. Ask an admin to reset it.'::text;
    RETURN;
  END IF;

  DELETE FROM public.scanner_login_attempts AS login_attempt
  WHERE login_attempt.device_hash = v_device_hash;

  UPDATE public.scanner_sessions AS scanner_session
  SET revoked_at = COALESCE(scanner_session.revoked_at, now())
  WHERE scanner_session.access_code_id = v_access.id
    AND scanner_session.revoked_at IS NULL;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_session_expiry := LEAST(v_access.expires_at, now() + interval '12 hours');

  INSERT INTO public.scanner_sessions (
    access_code_id,
    token_hash,
    device_hash,
    expires_at
  )
  VALUES (
    v_access.id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_device_hash,
    v_session_expiry
  );

  RETURN QUERY
  SELECT
    v_token,
    v_access.id,
    v_access.name,
    v_access.email,
    v_session_expiry,
    NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.login_scanner_with_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_scanner_with_code(text, text)
  TO anon, authenticated;
