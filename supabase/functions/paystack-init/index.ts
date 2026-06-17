import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_FEES: Record<string, number> = {
  "student": 15000,
  "junior-doctor": 35000,
  "senior-doctor": 50000,
  "doctor-with-spouse": 80000,
};

const DEADLINE = new Date("2026-06-30T23:59:59+01:00");

function calculateAmount(category: string): { baseFee: number; lateFee: number; total: number } {
  const baseFee = CATEGORY_FEES[category] || 0;
  const isLate = new Date() > DEADLINE;
  const lateFee = isLate ? 10000 : 0;
  return { baseFee, lateFee, total: baseFee + lateFee };
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

    // Look up the full registration
    const { data: reg, error: regError } = await supabase
      .from("registrations")
      .select("id, category, createdAt, totalAmount, baseFee, lateFee, paymentReference, splitCode")
      .eq("paymentReference", reference)
      .single();

    if (regError || !reg) {
      throw new Error("Registration not found for this payment reference");
    }

    // Recalculate amount based on current date (late fee applies if paying after deadline)
    const { baseFee, lateFee, total } = calculateAmount(reg.category);

    // Update registration if amounts changed
    if (total !== reg.totalAmount || baseFee !== reg.baseFee || lateFee !== reg.lateFee) {
      await supabase
        .from("registrations")
        .update({ baseFee, lateFee, totalAmount: total })
        .eq("id", reg.id);
    }

    // Generate fresh reference to avoid Paystack rejecting reused ones
    const freshRef = `CMDA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Update the registration with the new reference
    await supabase
      .from("registrations")
      .update({ paymentReference: freshRef })
      .eq("id", reg.id);

    const body: any = {
      email,
      amount: total * 100,
      reference: freshRef,
      metadata,
    };

    if (reg.splitCode) {
      body.split_code = reg.splitCode;
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
