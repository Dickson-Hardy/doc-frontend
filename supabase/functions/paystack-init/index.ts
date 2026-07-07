import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEADLINE = new Date("2026-06-30T23:59:59+01:00");

function calculateAmount(storedBaseFee: number, storedLateFee: number): { baseFee: number; lateFee: number; total: number } {
  const baseFee = storedBaseFee || 0;
  const isLate = new Date() > DEADLINE;
  const lateFee = isLate && !storedLateFee ? 10000 : (storedLateFee || 0);
  return { baseFee, lateFee, total: baseFee + lateFee };
}

function generateRef() {
  return `CMDA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, reference, metadata } = await req.json();

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Look up the full registration by the reference the frontend sent
    const { data: reg, error: regError } = await supabase
      .from("registrations")
      .select("id, category, createdAt, totalAmount, baseFee, lateFee, paymentReference, splitCode, paymentStatus")
      .eq("paymentReference", reference)
      .single();

    // Also look up by registration ID from metadata as fallback
    let registration = reg;
    if (regError || !reg) {
      // Try looking up by ID from metadata
      const regId = metadata?.registrationId || metadata?.custom_fields?.find((f: any) => f.variable_name === 'registration_id')?.value;
      if (regId) {
        const { data: byId } = await supabase
          .from("registrations")
          .select("id, category, createdAt, totalAmount, baseFee, lateFee, paymentReference, splitCode, paymentStatus")
          .eq("id", regId)
          .single();
        registration = byId;
      }
    }

    if (!registration) {
      throw new Error("Registration not found for this payment reference");
    }

    // If already paid, just return success without hitting Paystack
    if (registration.paymentStatus === "paid") {
      return new Response(JSON.stringify({
        status: true,
        message: "Registration is already paid",
        data: { already_paid: true },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use stored baseFee, only add late fee if not already applied
    const { baseFee, lateFee, total } = calculateAmount(registration.baseFee, registration.lateFee);

    // Update registration if amounts changed
    if (total !== registration.totalAmount || baseFee !== registration.baseFee || lateFee !== registration.lateFee) {
      await supabase
        .from("registrations")
        .update({ baseFee, lateFee, totalAmount: total })
        .eq("id", registration.id);
    }

    // STEP 1: Verify existing reference on Paystack first
    // If it was already initialized and paid, we catch that here
    const existingRef = registration.paymentReference;
    if (existingRef) {
      try {
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${existingRef}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const verifyData = await verifyRes.json();

        if (verifyData.status && verifyData.data?.status === "success") {
          // Already paid! Update DB
          await supabase
            .from("registrations")
            .update({ paymentStatus: "paid", paidAt: new Date().toISOString() })
            .eq("id", registration.id);

          return new Response(JSON.stringify({
            status: true,
            message: "Payment already completed",
            data: { already_paid: true, authorization_url: null },
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // If the reference was initialized but abandoned/pending, try to reuse it
        if (verifyData.status && (verifyData.data?.status === "pending" || verifyData.data?.status === "abandoned")) {
          // Try initializing with the existing reference first
          const initBody: any = {
            email,
            amount: total * 100,
            reference: existingRef,
            metadata,
          };
          if (registration.splitCode) initBody.split_code = registration.splitCode;

          const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${secretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(initBody),
          });
          const initData = await initRes.json();

          // If Paystack accepted the existing reference, use it
          if (initData.status && initData.data?.authorization_url) {
            return new Response(JSON.stringify(initData), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // Otherwise fall through to generate fresh reference
        }
      } catch {
        // If verify fails (e.g., reference never existed), fall through to init with fresh ref
      }
    }

    // STEP 2: Generate fresh reference and initialize
    let attempts = 0;
    let lastError = null;

    while (attempts < 3) {
      const freshRef = generateRef();

      const body: any = {
        email,
        amount: total * 100,
        reference: freshRef,
        metadata,
      };
      if (registration.splitCode) body.split_code = registration.splitCode;

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.status && data.data?.authorization_url) {
        // Success — update registration with the new reference
        await supabase
          .from("registrations")
          .update({ paymentReference: freshRef })
          .eq("id", registration.id);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      lastError = data.message || "Failed to initialize payment";
      attempts++;
    }

    throw new Error(`Payment initialization failed after ${attempts} attempts: ${lastError}`);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
