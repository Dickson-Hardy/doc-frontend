CREATE OR REPLACE FUNCTION public.current_user_has_admin_role(
  p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      AND "isActive" = true
      AND role = ANY (p_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_has_admin_role(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_admin_role(text[]) TO authenticated;

DROP POLICY IF EXISTS "Authenticated full access registrations"
  ON public.registrations;
DROP POLICY IF EXISTS "Active staff read registrations"
  ON public.registrations;
DROP POLICY IF EXISTS "Super admins update registrations"
  ON public.registrations;
DROP POLICY IF EXISTS "Super admins delete registrations"
  ON public.registrations;

CREATE POLICY "Active staff read registrations"
  ON public.registrations
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_has_admin_role(ARRAY['super_admin', 'scanner'])
  );

CREATE POLICY "Super admins update registrations"
  ON public.registrations
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_has_admin_role(ARRAY['super_admin'])
  )
  WITH CHECK (
    public.current_user_has_admin_role(ARRAY['super_admin'])
  );

CREATE POLICY "Super admins delete registrations"
  ON public.registrations
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_has_admin_role(ARRAY['super_admin'])
  );

DROP POLICY IF EXISTS "Authenticated full access app_settings"
  ON public.app_settings;
DROP POLICY IF EXISTS "Active super admins manage app settings"
  ON public.app_settings;

CREATE POLICY "Active super admins manage app settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (
    public.current_user_has_admin_role(ARRAY['super_admin'])
  )
  WITH CHECK (
    public.current_user_has_admin_role(ARRAY['super_admin'])
  );

DROP POLICY IF EXISTS "Authenticated read email_logs"
  ON public.email_logs;
DROP POLICY IF EXISTS "Active super admins read email logs"
  ON public.email_logs;

CREATE POLICY "Active super admins read email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_has_admin_role(ARRAY['super_admin'])
  );

DROP POLICY IF EXISTS "Authenticated read admin_users"
  ON public.admin_users;
DROP POLICY IF EXISTS "Active super admins manage admin users"
  ON public.admin_users;

CREATE POLICY "Active super admins manage admin users"
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (
    public.current_user_has_admin_role(ARRAY['super_admin'])
  )
  WITH CHECK (
    public.current_user_has_admin_role(ARRAY['super_admin'])
  );

DROP POLICY IF EXISTS "Authenticated read participation check-ins"
  ON public.participation_check_ins;
DROP POLICY IF EXISTS "Active staff read participation check-ins"
  ON public.participation_check_ins;

CREATE POLICY "Active staff read participation check-ins"
  ON public.participation_check_ins
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_has_admin_role(ARRAY['super_admin', 'scanner'])
  );

CREATE TABLE IF NOT EXISTS public.manual_payment_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL
    REFERENCES public.registrations(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('confirmed', 'reverted')),
  previous_status text NOT NULL,
  new_status text NOT NULL,
  previous_paid_at timestamptz,
  new_paid_at timestamptz,
  amount numeric NOT NULL,
  reason text NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_payment_audits_registration_created_idx
  ON public.manual_payment_audits (registration_id, created_at DESC);

ALTER TABLE public.manual_payment_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.manual_payment_audits FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.manual_payment_audits FROM authenticated;
GRANT SELECT ON TABLE public.manual_payment_audits TO authenticated;

DROP POLICY IF EXISTS "Super admins read manual payment audits"
  ON public.manual_payment_audits;

CREATE POLICY "Super admins read manual payment audits"
  ON public.manual_payment_audits
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_has_admin_role(ARRAY['super_admin'])
  );

CREATE OR REPLACE FUNCTION public.confirm_registration_payment_manually(
  p_registration_id uuid,
  p_reason text
)
RETURNS TABLE (
  audit_id uuid,
  registration_id uuid,
  payment_status text,
  paid_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_registration public.registrations%ROWTYPE;
  v_paid_at timestamptz := now();
  v_audit_id uuid;
BEGIN
  IF NOT public.current_user_has_admin_role(ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'Super admin access required' USING ERRCODE = '42501';
  END IF;

  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'A confirmation reason of at least 5 characters is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_registration
  FROM public.registrations
  WHERE id = p_registration_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_registration."paymentStatus" = 'paid' THEN
    RAISE EXCEPTION 'Registration is already marked as paid'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.registrations
  SET
    "paymentStatus" = 'paid',
    "paidAt" = v_paid_at
  WHERE id = p_registration_id;

  INSERT INTO public.manual_payment_audits (
    registration_id,
    action,
    previous_status,
    new_status,
    previous_paid_at,
    new_paid_at,
    amount,
    reason,
    performed_by,
    performed_by_email
  )
  VALUES (
    p_registration_id,
    'confirmed',
    v_registration."paymentStatus",
    'paid',
    v_registration."paidAt",
    v_paid_at,
    v_registration."totalAmount",
    trim(p_reason),
    auth.uid(),
    auth.jwt() ->> 'email'
  )
  RETURNING id INTO v_audit_id;

  RETURN QUERY
  SELECT v_audit_id, p_registration_id, 'paid'::text, v_paid_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_manual_payment_confirmation(
  p_audit_id uuid,
  p_reason text
)
RETURNS TABLE (
  registration_id uuid,
  payment_status text,
  paid_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_confirmation public.manual_payment_audits%ROWTYPE;
  v_registration public.registrations%ROWTYPE;
BEGIN
  IF NOT public.current_user_has_admin_role(ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'Super admin access required' USING ERRCODE = '42501';
  END IF;

  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'A reversal reason of at least 5 characters is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_confirmation
  FROM public.manual_payment_audits AS payment_audit
  WHERE payment_audit.id = p_audit_id
    AND payment_audit.action = 'confirmed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Manual confirmation audit entry not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.manual_payment_audits AS later_audit
    WHERE later_audit.registration_id = v_confirmation.registration_id
      AND later_audit.action = 'reverted'
      AND later_audit.created_at > v_confirmation.created_at
  ) THEN
    RAISE EXCEPTION 'This manual confirmation has already been reverted'
      USING ERRCODE = '23514';
  END IF;

  SELECT *
  INTO v_registration
  FROM public.registrations
  WHERE id = v_confirmation.registration_id
  FOR UPDATE;

  IF v_registration."paymentStatus" <> 'paid'
     OR v_registration."paidAt" IS DISTINCT FROM v_confirmation.new_paid_at THEN
    RAISE EXCEPTION 'Payment changed after manual confirmation and cannot be safely reverted'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.registrations
  SET
    "paymentStatus" = v_confirmation.previous_status,
    "paidAt" = v_confirmation.previous_paid_at,
    "lastPaymentCheckAt" = now()
  WHERE id = v_confirmation.registration_id;

  INSERT INTO public.manual_payment_audits (
    registration_id,
    action,
    previous_status,
    new_status,
    previous_paid_at,
    new_paid_at,
    amount,
    reason,
    performed_by,
    performed_by_email
  )
  VALUES (
    v_confirmation.registration_id,
    'reverted',
    'paid',
    v_confirmation.previous_status,
    v_confirmation.new_paid_at,
    v_confirmation.previous_paid_at,
    v_confirmation.amount,
    trim(p_reason),
    auth.uid(),
    auth.jwt() ->> 'email'
  );

  RETURN QUERY
  SELECT
    v_confirmation.registration_id,
    v_confirmation.previous_status,
    v_confirmation.previous_paid_at;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_registration_payment_manually(uuid, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revert_manual_payment_confirmation(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_registration_payment_manually(uuid, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_manual_payment_confirmation(uuid, text)
  TO authenticated;

ALTER TABLE public.participation_check_ins
  DROP CONSTRAINT IF EXISTS participation_check_ins_scan_source_check;
ALTER TABLE public.participation_check_ins
  ADD CONSTRAINT participation_check_ins_scan_source_check
  CHECK (scan_source IN ('qr', 'image_upload', 'manual', 'legacy'));

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

REVOKE ALL ON FUNCTION public.check_in_registration(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_registration(uuid, text) TO authenticated;
