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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data } = await supabase
      .from("registrations")
      .select("*")
      .eq("email", email)
      .order("createdAt", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return new Response(
        JSON.stringify({ exists: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Late fee based on CURRENT date — flat ₦10,000 if paying after deadline
    const baseFee = CATEGORY_FEES[data.category] || 0;
    const isLate = new Date() > DEADLINE;
    const lateFee = isLate ? 10000 : 0;
    const correctTotal = baseFee + lateFee;

    // Update if amounts are stale
    if (correctTotal !== data.totalAmount || baseFee !== data.baseFee || lateFee !== data.lateFee) {
      await supabase
        .from("registrations")
        .update({ baseFee, lateFee, totalAmount: correctTotal })
        .eq("id", data.id);
      data.totalAmount = correctTotal;
      data.baseFee = baseFee;
      data.lateFee = lateFee;
    }

    return new Response(
      JSON.stringify({
        exists: true,
        status: data.paymentStatus,
        registrationId: data.id,
        paymentReference: data.paymentReference,
        registration: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
