CREATE TABLE IF NOT EXISTS public.participation_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL
    REFERENCES public.registrations(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scanner_email text,
  scan_source text NOT NULL DEFAULT 'qr'
    CHECK (scan_source IN ('qr', 'image_upload', 'legacy')),
  CONSTRAINT participation_check_ins_registration_id_key UNIQUE (registration_id)
);

CREATE INDEX IF NOT EXISTS participation_check_ins_scanned_at_idx
  ON public.participation_check_ins (scanned_at DESC);

ALTER TABLE public.participation_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read participation check-ins"
  ON public.participation_check_ins;

CREATE POLICY "Authenticated read participation check-ins"
  ON public.participation_check_ins
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.participation_check_ins FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.participation_check_ins FROM authenticated;
GRANT SELECT ON TABLE public.participation_check_ins TO authenticated;

-- Preserve check-ins recorded before the audit table was introduced.
INSERT INTO public.participation_check_ins (
  registration_id,
  scanned_at,
  scan_source
)
SELECT
  id,
  COALESCE("verifiedAt", now()),
  'legacy'
FROM public.registrations
WHERE COALESCE("attendanceVerified", false) = true
ON CONFLICT (registration_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_in_registration(
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
SET search_path = public, auth
AS $$
DECLARE
  v_registration public.registrations%ROWTYPE;
  v_check_in public.participation_check_ins%ROWTYPE;
  v_already_checked_in boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_scan_source NOT IN ('qr', 'image_upload') THEN
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
    scanned_by,
    scanner_email,
    scan_source
  )
  VALUES (
    p_registration_id,
    auth.uid(),
    auth.jwt() ->> 'email',
    p_scan_source
  )
  ON CONFLICT (registration_id) DO NOTHING
  RETURNING *
  INTO v_check_in;

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

REVOKE ALL ON FUNCTION public.check_in_registration(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_in_registration(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_in_registration(uuid, text) TO authenticated;
