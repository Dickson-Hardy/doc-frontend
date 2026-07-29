CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.scanner_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) >= 2),
  email text,
  phone text,
  code_lookup text NOT NULL UNIQUE,
  code_hash text NOT NULL,
  code_hint text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scanner_access_codes_active_expiry_idx
  ON public.scanner_access_codes (is_active, expires_at);

CREATE TABLE IF NOT EXISTS public.scanner_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id uuid NOT NULL
    REFERENCES public.scanner_access_codes(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS scanner_sessions_access_active_idx
  ON public.scanner_sessions (access_code_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.scanner_login_attempts (
  device_hash text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scanner_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_login_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.scanner_access_codes FROM anon;
REVOKE ALL ON TABLE public.scanner_sessions FROM anon;
REVOKE ALL ON TABLE public.scanner_login_attempts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.scanner_access_codes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.scanner_sessions FROM authenticated;
GRANT SELECT ON TABLE public.scanner_access_codes TO authenticated;
GRANT SELECT ON TABLE public.scanner_sessions TO authenticated;

DROP POLICY IF EXISTS "Super admins read scanner access codes"
  ON public.scanner_access_codes;
CREATE POLICY "Super admins read scanner access codes"
  ON public.scanner_access_codes
  FOR SELECT
  TO authenticated
  USING (public.current_user_has_admin_role(ARRAY['super_admin']));

DROP POLICY IF EXISTS "Super admins read scanner sessions"
  ON public.scanner_sessions;
CREATE POLICY "Super admins read scanner sessions"
  ON public.scanner_sessions
  FOR SELECT
  TO authenticated
  USING (public.current_user_has_admin_role(ARRAY['super_admin']));

ALTER TABLE public.participation_check_ins
  ADD COLUMN IF NOT EXISTS scanner_access_code_id uuid
    REFERENCES public.scanner_access_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scanner_name text;

CREATE INDEX IF NOT EXISTS participation_check_ins_scanner_access_idx
  ON public.participation_check_ins (scanner_access_code_id, scanned_at DESC);

CREATE OR REPLACE FUNCTION public.generate_scanner_access_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT
    'CMDA-'
    || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 4))
    || '-'
    || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 5, 4))
    || '-'
    || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 9, 4));
$$;

REVOKE ALL ON FUNCTION public.generate_scanner_access_code() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_scanner_access(
  p_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS TABLE (
  access_id uuid,
  access_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_code text;
  v_id uuid;
  v_expiry timestamptz;
BEGIN
  IF NOT public.current_user_has_admin_role(ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'Super admin access required' USING ERRCODE = '42501';
  END IF;

  IF length(trim(COALESCE(p_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Scanner name is required' USING ERRCODE = '22023';
  END IF;

  v_expiry := COALESCE(p_expires_at, now() + interval '7 days');
  IF v_expiry <= now() THEN
    RAISE EXCEPTION 'Expiry must be in the future' USING ERRCODE = '22023';
  END IF;

  LOOP
    v_code := public.generate_scanner_access_code();
    BEGIN
      INSERT INTO public.scanner_access_codes (
        name,
        email,
        phone,
        code_lookup,
        code_hash,
        code_hint,
        expires_at,
        created_by
      )
      VALUES (
        trim(p_name),
        NULLIF(lower(trim(COALESCE(p_email, ''))), ''),
        NULLIF(trim(COALESCE(p_phone, '')), ''),
        encode(extensions.digest(v_code, 'sha256'), 'hex'),
        extensions.crypt(v_code, extensions.gen_salt('bf', 10)),
        right(v_code, 4),
        v_expiry,
        auth.uid()
      )
      RETURNING id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Extremely unlikely; generate another code.
    END;
  END LOOP;

  RETURN QUERY SELECT v_id, v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_scanner_access_code(
  p_access_id uuid
)
RETURNS TABLE (
  access_id uuid,
  access_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT public.current_user_has_admin_role(ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'Super admin access required' USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM public.scanner_access_codes
  WHERE id = p_access_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scanner access record not found' USING ERRCODE = 'P0002';
  END IF;

  LOOP
    v_code := public.generate_scanner_access_code();
    BEGIN
      UPDATE public.scanner_access_codes
      SET
        code_lookup = encode(extensions.digest(v_code, 'sha256'), 'hex'),
        code_hash = extensions.crypt(v_code, extensions.gen_salt('bf', 10)),
        code_hint = right(v_code, 4),
        is_active = true,
        updated_at = now()
      WHERE id = p_access_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Extremely unlikely; generate another code.
    END;
  END LOOP;

  UPDATE public.scanner_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE access_code_id = p_access_id
    AND revoked_at IS NULL;

  RETURN QUERY SELECT p_access_id, v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_scanner_access_status(
  p_access_id uuid,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_has_admin_role(ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'Super admin access required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.scanner_access_codes
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_access_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scanner access record not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT p_is_active THEN
    UPDATE public.scanner_sessions
    SET revoked_at = COALESCE(revoked_at, now())
    WHERE access_code_id = p_access_id
      AND revoked_at IS NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_scanner_access_device(
  p_access_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_has_admin_role(ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'Super admin access required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.scanner_access_codes WHERE id = p_access_id
  ) THEN
    RAISE EXCEPTION 'Scanner access record not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.scanner_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE access_code_id = p_access_id
    AND revoked_at IS NULL;
END;
$$;

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
  FROM public.scanner_login_attempts
  WHERE device_hash = v_device_hash;

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
  FROM public.scanner_access_codes
  WHERE code_lookup = encode(extensions.digest(v_normalized_code, 'sha256'), 'hex')
    AND code_hash = extensions.crypt(v_normalized_code, code_hash)
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

  DELETE FROM public.scanner_login_attempts
  WHERE device_hash = v_device_hash;

  UPDATE public.scanner_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE access_code_id = v_access.id
    AND revoked_at IS NULL;

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

CREATE OR REPLACE FUNCTION public.require_scanner_session(
  p_session_token text,
  p_device_id text
)
RETURNS TABLE (
  access_code_id uuid,
  access_name text,
  access_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.scanner_sessions%ROWTYPE;
  v_access public.scanner_access_codes%ROWTYPE;
BEGIN
  SELECT *
  INTO v_session
  FROM public.scanner_sessions
  WHERE token_hash = encode(extensions.digest(COALESCE(p_session_token, ''), 'sha256'), 'hex')
    AND device_hash = encode(extensions.digest(COALESCE(p_device_id, ''), 'sha256'), 'hex')
    AND revoked_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scanner session expired. Sign in again.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_access
  FROM public.scanner_access_codes
  WHERE id = v_session.access_code_id
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scanner access is no longer active.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.scanner_sessions
  SET last_used_at = now()
  WHERE id = v_session.id;

  RETURN QUERY SELECT v_access.id, v_access.name, v_access.email;
END;
$$;

REVOKE ALL ON FUNCTION public.require_scanner_session(text, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_in_registration_with_scanner_session(
  p_session_token text,
  p_device_id text,
  p_registration_id uuid,
  p_scan_source text DEFAULT 'qr'
)
RETURNS TABLE (
  check_in_id uuid,
  already_checked_in boolean,
  scanned_at timestamptz,
  first_name text,
  surname text,
  email text,
  category text,
  payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scanner record;
  v_registration public.registrations%ROWTYPE;
  v_check_in public.participation_check_ins%ROWTYPE;
  v_already_checked_in boolean := false;
BEGIN
  SELECT * INTO v_scanner
  FROM public.require_scanner_session(p_session_token, p_device_id);

  IF p_scan_source NOT IN ('qr', 'image_upload', 'manual') THEN
    RAISE EXCEPTION 'Invalid scan source' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_registration
  FROM public.registrations
  WHERE id = p_registration_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_registration."paymentStatus" <> 'paid' THEN
    RAISE EXCEPTION 'Only paid registrations can be checked in'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.participation_check_ins (
    registration_id,
    scanner_email,
    scanner_access_code_id,
    scanner_name,
    scan_source
  )
  VALUES (
    p_registration_id,
    v_scanner.access_email,
    v_scanner.access_code_id,
    v_scanner.access_name,
    p_scan_source
  )
  ON CONFLICT (registration_id) DO NOTHING
  RETURNING * INTO v_check_in;

  IF v_check_in.id IS NULL THEN
    v_already_checked_in := true;
    SELECT *
    INTO v_check_in
    FROM public.participation_check_ins
    WHERE registration_id = p_registration_id;
  END IF;

  UPDATE public.registrations
  SET
    "attendanceVerified" = true,
    "verifiedAt" = COALESCE("verifiedAt", v_check_in.scanned_at)
  WHERE id = p_registration_id;

  RETURN QUERY
  SELECT
    v_check_in.id,
    v_already_checked_in,
    v_check_in.scanned_at,
    v_registration."firstName"::text,
    v_registration.surname::text,
    v_registration.email::text,
    v_registration.category::text,
    v_registration."paymentStatus"::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_scanner_participation_check_ins(
  p_session_token text,
  p_device_id text,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  registration_id uuid,
  scanned_at timestamptz,
  scanner_email text,
  scanner_name text,
  scan_source text,
  first_name text,
  surname text,
  participant_email text,
  category text,
  payment_status text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scanner record;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_offset integer := GREATEST(COALESCE(p_page, 1) - 1, 0) * v_limit;
BEGIN
  SELECT * INTO v_scanner
  FROM public.require_scanner_session(p_session_token, p_device_id);

  RETURN QUERY
  SELECT
    check_in.id,
    check_in.registration_id,
    check_in.scanned_at,
    check_in.scanner_email,
    check_in.scanner_name,
    check_in.scan_source,
    registration."firstName"::text,
    registration.surname::text,
    registration.email::text,
    registration.category::text,
    registration."paymentStatus"::text,
    count(*) OVER ()
  FROM public.participation_check_ins AS check_in
  JOIN public.registrations AS registration
    ON registration.id = check_in.registration_id
  WHERE check_in.scanner_access_code_id = v_scanner.access_code_id
  ORDER BY check_in.scanned_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.logout_scanner_session(
  p_session_token text,
  p_device_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.scanner_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE token_hash = encode(extensions.digest(COALESCE(p_session_token, ''), 'sha256'), 'hex')
    AND device_hash = encode(extensions.digest(COALESCE(p_device_id, ''), 'sha256'), 'hex')
    AND revoked_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.create_scanner_access(text, text, text, timestamptz)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_scanner_access_code(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_scanner_access_status(uuid, boolean)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_scanner_access_device(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_scanner_access(text, text, text, timestamptz)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_scanner_access_code(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_scanner_access_status(uuid, boolean)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_scanner_access_device(uuid)
  TO authenticated;

REVOKE ALL ON FUNCTION public.login_scanner_with_code(text, text)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_in_registration_with_scanner_session(text, text, uuid, text)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_scanner_participation_check_ins(text, text, integer, integer)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.logout_scanner_session(text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_scanner_with_code(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_registration_with_scanner_session(text, text, uuid, text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scanner_participation_check_ins(text, text, integer, integer)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.logout_scanner_session(text, text) TO anon, authenticated;
