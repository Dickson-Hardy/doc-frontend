import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { reference } = await req.json();
    if (typeof reference !== "string" || !reference.trim()) {
      return jsonResponse({ error: "Payment reference is required" }, 400);
    }

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not set");

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference.trim())}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const result = await response.json();
    const transaction = result.data;

    if (!response.ok || !result.status || transaction?.status !== "success") {
      return jsonResponse({
        status: "failed",
        message: result.message || "Payment has not been completed",
        data: { reference: reference.trim(), status: transaction?.status || "failed" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: registration, error: registrationError } = await supabase
      .from("registrations")
      .select("id, email, totalAmount, paymentStatus")
      .eq("paymentReference", reference.trim())
      .maybeSingle();

    if (registrationError) throw registrationError;
    if (!registration) {
      return jsonResponse({ error: "Registration not found for this payment" }, 404);
    }

    const expectedAmountKobo = Number(registration.totalAmount) * 100;
    const paidAmountKobo = Number(transaction.amount);
    const customerEmail = transaction.customer?.email;

    if (transaction.currency !== "NGN" || paidAmountKobo !== expectedAmountKobo) {
      return jsonResponse({ error: "Transaction amount or currency mismatch" }, 400);
    }
    if (
      typeof customerEmail === "string" &&
      customerEmail.toLowerCase() !== registration.email.toLowerCase()
    ) {
      return jsonResponse({ error: "Transaction email mismatch" }, 400);
    }

    if (registration.paymentStatus !== "paid") {
      const paidAt = transaction.paid_at || new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from("registrations")
        .update({ paymentStatus: "paid", paidAt })
        .eq("id", registration.id)
        .neq("paymentStatus", "paid")
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;
      if (updated) {
        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: { registrationId: registration.id },
        });
        if (emailError) console.error("Confirmation email failed:", emailError.message);
      }
    }

    return jsonResponse({
      status: "success",
      message: "Payment verified successfully",
      data: {
        reference: transaction.reference,
        amount: paidAmountKobo / 100,
        currency: transaction.currency,
        paidAt: transaction.paid_at,
      },
    });
  } catch (error) {
    console.error("Paystack verification error:", error.message);
    return jsonResponse({ error: "Payment verification failed" }, 500);
  }
});
