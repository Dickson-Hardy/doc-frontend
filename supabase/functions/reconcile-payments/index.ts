import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const BATCH_SIZE = 10;
const MAX_REGISTRATIONS = 100;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function safeEqual(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }
  return difference === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const reconcileToken = Deno.env.get("RECONCILE_TOKEN");
    const suppliedToken = req.headers.get("x-reconcile-token") ?? "";
    if (!reconcileToken || !(await safeEqual(suppliedToken, reconcileToken))) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) throw new Error("PAYSTACK_SECRET_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: pending, error: fetchError } = await supabase
      .from("registrations")
      .select("id, email, totalAmount, paymentReference")
      .eq("paymentStatus", "pending")
      .not("paymentReference", "is", null)
      .order("lastPaymentCheckAt", { ascending: true, nullsFirst: true })
      .order("createdAt", { ascending: false })
      .limit(MAX_REGISTRATIONS);

    if (fetchError) throw fetchError;

    let confirmed = 0;
    let failedChecks = 0;

    for (let offset = 0; offset < (pending?.length ?? 0); offset += BATCH_SIZE) {
      const batch = pending!.slice(offset, offset + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(async (registration) => {
        const checkedAt = new Date().toISOString();

        try {
          const response = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(registration.paymentReference)}`,
            { headers: { Authorization: `Bearer ${paystackSecret}` } },
          );
          const result = await response.json();
          const transaction = result.data;

          if (!response.ok || !result.status || transaction?.status !== "success") return false;

          const expectedAmount = Number(registration.totalAmount) * 100;
          const customerEmail = transaction.customer?.email;
          if (transaction.currency !== "NGN" || Number(transaction.amount) !== expectedAmount) return false;
          if (typeof customerEmail === "string" && customerEmail.toLowerCase() !== registration.email.toLowerCase()) return false;

          const { data: updated, error: updateError } = await supabase
            .from("registrations")
            .update({
              paymentStatus: "paid",
              paidAt: transaction.paid_at || checkedAt,
              lastPaymentCheckAt: checkedAt,
            })
            .eq("id", registration.id)
            .eq("paymentStatus", "pending")
            .select("id")
            .maybeSingle();

          if (updateError) throw updateError;
          if (!updated) return false;

          const { error: emailError } = await supabase.functions.invoke("send-email", {
            body: { registrationId: registration.id },
          });
          if (emailError) console.error("Confirmation email failed:", emailError.message);
          return true;
        } finally {
          await supabase
            .from("registrations")
            .update({ lastPaymentCheckAt: checkedAt })
            .eq("id", registration.id)
            .eq("paymentStatus", "pending");
        }
      }));

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) confirmed += 1;
        if (result.status === "rejected") failedChecks += 1;
      }
    }

    return jsonResponse({
      checked: pending?.length ?? 0,
      confirmed,
      failedChecks,
    });
  } catch (error) {
    console.error("Payment reconciliation error:", error.message);
    return jsonResponse({ error: "Payment reconciliation failed" }, 500);
  }
});
