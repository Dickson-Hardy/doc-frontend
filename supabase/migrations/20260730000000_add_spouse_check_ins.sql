ALTER TABLE public.participation_check_ins
  ADD COLUMN IF NOT EXISTS attendee_type text;

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS "attendeeType" text NOT NULL DEFAULT 'primary';

ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_attendee_type_check;
ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_attendee_type_check
  CHECK ("attendeeType" IN ('primary', 'spouse'));

UPDATE public.participation_check_ins
SET attendee_type = 'primary'
WHERE attendee_type IS NULL;

ALTER TABLE public.participation_check_ins
  ALTER COLUMN attendee_type SET DEFAULT 'primary',
  ALTER COLUMN attendee_type SET NOT NULL;

ALTER TABLE public.participation_check_ins
  DROP CONSTRAINT IF EXISTS participation_check_ins_attendee_type_check;
ALTER TABLE public.participation_check_ins
  ADD CONSTRAINT participation_check_ins_attendee_type_check
  CHECK (attendee_type IN ('primary', 'spouse'));

ALTER TABLE public.participation_check_ins
  DROP CONSTRAINT IF EXISTS participation_check_ins_registration_id_key;
ALTER TABLE public.participation_check_ins
  DROP CONSTRAINT IF EXISTS participation_check_ins_registration_attendee_key;
ALTER TABLE public.participation_check_ins
  ADD CONSTRAINT participation_check_ins_registration_attendee_key
  UNIQUE (registration_id, attendee_type);

DROP FUNCTION IF EXISTS public.check_in_registration(uuid, text);

CREATE FUNCTION public.check_in_registration(
  p_registration_id uuid,
  p_scan_source text DEFAULT 'qr',
  p_attendee_type text DEFAULT NULL
)
RETURNS TABLE (
  check_in_id uuid,
  already_checked_in boolean,
  scanned_at timestamptz,
  first_name text,
  surname text,
  email text,
  category text,
  payment_status text,
  attendee_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_registration public.registrations%ROWTYPE;
  v_check_in public.participation_check_ins%ROWTYPE;
  v_attendee_type text := lower(NULLIF(trim(COALESCE(p_attendee_type, '')), ''));
  v_already_checked_in boolean := false;
BEGIN
  IF NOT public.current_user_has_admin_role(ARRAY['super_admin', 'scanner']) THEN
    RAISE EXCEPTION 'Active scanner access required' USING ERRCODE = '42501';
  END IF;

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

  IF v_registration.category = 'doctor-with-spouse'
    AND v_attendee_type = 'select' THEN
    RAISE EXCEPTION 'Attendee choice required for Doctor with Spouse registration'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_attendee_type IS NULL OR v_attendee_type = 'select' THEN
    v_attendee_type := 'primary';
  END IF;

  IF v_attendee_type NOT IN ('primary', 'spouse') THEN
    RAISE EXCEPTION 'Invalid attendee type' USING ERRCODE = '22023';
  END IF;

  IF v_attendee_type = 'spouse' THEN
    IF v_registration.category <> 'doctor-with-spouse' THEN
      RAISE EXCEPTION 'This registration does not include a spouse'
        USING ERRCODE = '23514';
    END IF;

    IF NULLIF(trim(COALESCE(v_registration."spouseFirstName", '')), '') IS NULL
      OR NULLIF(trim(COALESCE(v_registration."spouseSurname", '')), '') IS NULL
      OR NULLIF(trim(COALESCE(v_registration."spouseEmail", '')), '') IS NULL THEN
      RAISE EXCEPTION 'Spouse details are incomplete'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.participation_check_ins (
    registration_id,
    attendee_type,
    scanned_by,
    scanner_email,
    scan_source
  )
  VALUES (
    p_registration_id,
    v_attendee_type,
    auth.uid(),
    auth.jwt() ->> 'email',
    p_scan_source
  )
  ON CONFLICT ON CONSTRAINT participation_check_ins_registration_attendee_key DO NOTHING
  RETURNING *
  INTO v_check_in;

  IF v_check_in.id IS NULL THEN
    v_already_checked_in := true;

    SELECT *
    INTO v_check_in
    FROM public.participation_check_ins AS existing_check_in
    WHERE existing_check_in.registration_id = p_registration_id
      AND existing_check_in.attendee_type = v_attendee_type;
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
    CASE
      WHEN v_attendee_type = 'spouse' THEN v_registration."spouseFirstName"::text
      ELSE v_registration."firstName"::text
    END,
    CASE
      WHEN v_attendee_type = 'spouse' THEN v_registration."spouseSurname"::text
      ELSE v_registration.surname::text
    END,
    CASE
      WHEN v_attendee_type = 'spouse' THEN v_registration."spouseEmail"::text
      ELSE v_registration.email::text
    END,
    v_registration.category::text,
    v_registration."paymentStatus"::text,
    v_attendee_type;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_registration(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_registration(uuid, text, text)
  TO authenticated;

DROP FUNCTION IF EXISTS public.check_in_registration_with_scanner_session(
  text,
  text,
  uuid,
  text
);

CREATE FUNCTION public.check_in_registration_with_scanner_session(
  p_session_token text,
  p_device_id text,
  p_registration_id uuid,
  p_scan_source text DEFAULT 'qr',
  p_attendee_type text DEFAULT NULL
)
RETURNS TABLE (
  check_in_id uuid,
  already_checked_in boolean,
  scanned_at timestamptz,
  first_name text,
  surname text,
  email text,
  category text,
  payment_status text,
  attendee_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scanner record;
  v_registration public.registrations%ROWTYPE;
  v_check_in public.participation_check_ins%ROWTYPE;
  v_attendee_type text := lower(NULLIF(trim(COALESCE(p_attendee_type, '')), ''));
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

  IF v_registration.category = 'doctor-with-spouse'
    AND v_attendee_type = 'select' THEN
    RAISE EXCEPTION 'Attendee choice required for Doctor with Spouse registration'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_attendee_type IS NULL OR v_attendee_type = 'select' THEN
    v_attendee_type := 'primary';
  END IF;

  IF v_attendee_type NOT IN ('primary', 'spouse') THEN
    RAISE EXCEPTION 'Invalid attendee type' USING ERRCODE = '22023';
  END IF;

  IF v_attendee_type = 'spouse' THEN
    IF v_registration.category <> 'doctor-with-spouse' THEN
      RAISE EXCEPTION 'This registration does not include a spouse'
        USING ERRCODE = '23514';
    END IF;

    IF NULLIF(trim(COALESCE(v_registration."spouseFirstName", '')), '') IS NULL
      OR NULLIF(trim(COALESCE(v_registration."spouseSurname", '')), '') IS NULL
      OR NULLIF(trim(COALESCE(v_registration."spouseEmail", '')), '') IS NULL THEN
      RAISE EXCEPTION 'Spouse details are incomplete'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.participation_check_ins (
    registration_id,
    attendee_type,
    scanner_email,
    scanner_access_code_id,
    scanner_name,
    scan_source
  )
  VALUES (
    p_registration_id,
    v_attendee_type,
    v_scanner.access_email,
    v_scanner.access_code_id,
    v_scanner.access_name,
    p_scan_source
  )
  ON CONFLICT ON CONSTRAINT participation_check_ins_registration_attendee_key DO NOTHING
  RETURNING * INTO v_check_in;

  IF v_check_in.id IS NULL THEN
    v_already_checked_in := true;

    SELECT *
    INTO v_check_in
    FROM public.participation_check_ins AS existing_check_in
    WHERE existing_check_in.registration_id = p_registration_id
      AND existing_check_in.attendee_type = v_attendee_type;
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
    CASE
      WHEN v_attendee_type = 'spouse' THEN v_registration."spouseFirstName"::text
      ELSE v_registration."firstName"::text
    END,
    CASE
      WHEN v_attendee_type = 'spouse' THEN v_registration."spouseSurname"::text
      ELSE v_registration.surname::text
    END,
    CASE
      WHEN v_attendee_type = 'spouse' THEN v_registration."spouseEmail"::text
      ELSE v_registration.email::text
    END,
    v_registration.category::text,
    v_registration."paymentStatus"::text,
    v_attendee_type;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_registration_with_scanner_session(
  text,
  text,
  uuid,
  text,
  text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_registration_with_scanner_session(
  text,
  text,
  uuid,
  text,
  text
) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_scanner_participation_check_ins(
  text,
  text,
  integer,
  integer
);

CREATE FUNCTION public.get_scanner_participation_check_ins(
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
  attendee_type text,
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
    check_in.attendee_type,
    CASE
      WHEN check_in.attendee_type = 'spouse' THEN registration."spouseFirstName"::text
      ELSE registration."firstName"::text
    END,
    CASE
      WHEN check_in.attendee_type = 'spouse' THEN registration."spouseSurname"::text
      ELSE registration.surname::text
    END,
    CASE
      WHEN check_in.attendee_type = 'spouse' THEN registration."spouseEmail"::text
      ELSE registration.email::text
    END,
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

REVOKE ALL ON FUNCTION public.get_scanner_participation_check_ins(
  text,
  text,
  integer,
  integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scanner_participation_check_ins(
  text,
  text,
  integer,
  integer
) TO anon, authenticated;
