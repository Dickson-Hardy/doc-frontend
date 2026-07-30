CREATE TABLE IF NOT EXISTS public.payment_amount_correction_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL
    REFERENCES public.registrations(id) ON DELETE RESTRICT,
  payment_reference text NOT NULL,
  category text NOT NULL,
  previous_base_fee integer NOT NULL,
  previous_late_fee integer NOT NULL,
  previous_total_amount integer NOT NULL,
  paystack_amount integer NOT NULL,
  corrected_base_fee integer NOT NULL,
  corrected_late_fee integer NOT NULL,
  corrected_total_amount integer NOT NULL,
  correction_group text NOT NULL,
  reason text NOT NULL,
  corrected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_amount_correction_audits_registration_key
    UNIQUE (registration_id),
  CONSTRAINT payment_amount_correction_audits_amounts_check
    CHECK (
      previous_base_fee >= 0
      AND previous_late_fee >= 0
      AND previous_total_amount >= 0
      AND paystack_amount >= 0
      AND corrected_base_fee >= 0
      AND corrected_late_fee >= 0
      AND corrected_total_amount >= 0
      AND corrected_total_amount = paystack_amount
      AND corrected_base_fee + corrected_late_fee = corrected_total_amount
    )
);

CREATE INDEX IF NOT EXISTS payment_amount_correction_audits_corrected_at_idx
  ON public.payment_amount_correction_audits (corrected_at DESC);

ALTER TABLE public.payment_amount_correction_audits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_amount_correction_audits
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.payment_amount_correction_audits
  TO authenticated;

DROP POLICY IF EXISTS "Super admins read payment amount correction audits"
  ON public.payment_amount_correction_audits;
CREATE POLICY "Super admins read payment amount correction audits"
  ON public.payment_amount_correction_audits
  FOR SELECT
  TO authenticated
  USING (public.current_user_has_admin_role(ARRAY['super_admin']));
