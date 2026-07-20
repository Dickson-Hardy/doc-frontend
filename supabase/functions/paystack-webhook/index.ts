import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{128}$/i.test(hex)) return null;

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

async function hasValidSignature(rawBody: string, signature: string, secret: string) {
  const signatureBytes = hexToBytes(signature);
  if (!signatureBytes) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(rawBody),
  );
}

function getRegistrationId(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return null;
  if (typeof metadata.registration_id === "string") return metadata.registration_id;

  const customFields = Array.isArray(metadata.custom_fields) ? metadata.custom_fields : [];
  const registrationField = customFields.find(
    (field) => field && typeof field === "object" && (field as Record<string, unknown>).variable_name === "registration_id",
  ) as Record<string, unknown> | undefined;

  return typeof registrationField?.value === "string" ? registrationField.value : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not set");

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") ?? "";
    if (!(await hasValidSignature(rawBody, signature, secretKey))) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    const event = JSON.parse(rawBody);
    if (event.event !== "charge.success") {
      return jsonResponse({ received: true, ignored: true });
    }

    const transaction = event.data ?? {};
    const reference = transaction.reference;
    if (typeof reference !== "string" || !reference) {
      return jsonResponse({ error: "Missing transaction reference" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let { data: registration } = await supabase
      .from("registrations")
      .select("id, email, totalAmount, paymentStatus")
      .eq("paymentReference", reference)
      .maybeSingle();

    if (!registration) {
      const registrationId = getRegistrationId(transaction.metadata);
      if (registrationId) {
        const result = await supabase
          .from("registrations")
          .select("id, email, totalAmount, paymentStatus")
          .eq("id", registrationId)
          .maybeSingle();
        registration = result.data;
      }
    }

    if (!registration) {
      return jsonResponse({ error: "Registration not found" }, 404);
    }

    const expectedAmount = Number(registration.totalAmount) * 100;
    const customerEmail = transaction.customer?.email;
    if (transaction.currency !== "NGN" || Number(transaction.amount) !== expectedAmount) {
      return jsonResponse({ error: "Transaction amount or currency mismatch" }, 400);
    }
    if (typeof customerEmail === "string" && customerEmail.toLowerCase() !== registration.email.toLowerCase()) {
      return jsonResponse({ error: "Transaction email mismatch" }, 400);
    }

    if (registration.paymentStatus === "paid") {
      return jsonResponse({ received: true, alreadyProcessed: true });
    }

    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        paymentStatus: "paid",
        paymentReference: reference,
        paidAt: transaction.paid_at || new Date().toISOString(),
      })
      .eq("id", registration.id);

    if (updateError) throw updateError;

    const { error: emailError } = await supabase.functions.invoke("send-email", {
      body: { registrationId: registration.id },
    });
    if (emailError) console.error("Confirmation email failed:", emailError.message);

    return jsonResponse({ received: true, verified: true });
  } catch (error) {
    console.error("Paystack webhook error:", error.message);
    return jsonResponse({ error: "Webhook processing failed" }, 500);
  }
});
