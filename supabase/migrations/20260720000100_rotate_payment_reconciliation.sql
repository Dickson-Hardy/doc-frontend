ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS "lastPaymentCheckAt" timestamptz;

CREATE INDEX IF NOT EXISTS registrations_pending_payment_check_idx
  ON public.registrations ("lastPaymentCheckAt" ASC NULLS FIRST, "createdAt" DESC)
  WHERE "paymentStatus" = 'pending' AND "paymentReference" IS NOT NULL;
