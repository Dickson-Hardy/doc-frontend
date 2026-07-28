import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 1100;
const MAX_RECIPIENTS = 100;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "");
    if (!accessToken) return jsonResponse({ error: "Authentication required" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    const userEmail = authData.user?.email;
    if (authError || !userEmail) return jsonResponse({ error: "Invalid session" }, 401);

    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("id")
      .ilike("email", userEmail)
      .eq("isActive", true)
      .limit(1)
      .maybeSingle();

    if (adminError) throw adminError;
    if (!adminUser) return jsonResponse({ error: "Admin access required" }, 403);

    const requestBody = await req.json();
    const registrationIds = Array.from(new Set(
      (Array.isArray(requestBody.registrationIds) ? requestBody.registrationIds : [])
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ));

    if (registrationIds.length === 0) {
      return jsonResponse({ error: "Select at least one registration" }, 400);
    }
    if (registrationIds.length > MAX_RECIPIENTS) {
      return jsonResponse({ error: `A maximum of ${MAX_RECIPIENTS} recipients is allowed` }, 400);
    }

    const { data: registrations, error: registrationsError } = await supabase
      .from("registrations")
      .select("id, email")
      .in("id", registrationIds)
      .eq("paymentStatus", "paid");

    if (registrationsError) throw registrationsError;

    const paidRegistrationIds = new Set((registrations ?? []).map((registration) => registration.id));
    const results: Array<{
      registrationId: string;
      email?: string;
      status: "sent" | "failed";
      message?: string;
    }> = registrationIds
      .filter((id) => !paidRegistrationIds.has(id))
      .map((id) => ({
        registrationId: id,
        status: "failed",
        message: "Registration not found or payment is not confirmed",
      }));

    for (let offset = 0; offset < (registrations?.length ?? 0); offset += BATCH_SIZE) {
      const batch = registrations!.slice(offset, offset + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(async (registration) => {
        try {
          const { data, error } = await supabase.functions.invoke("send-email", {
            body: { registrationId: registration.id, source: "utility" },
          });

          if (error || data?.error) {
            return {
              registrationId: registration.id,
              email: registration.email,
              status: "failed" as const,
              message: data?.error || error?.message || "Email could not be sent",
            };
          }

          return {
            registrationId: registration.id,
            email: registration.email,
            status: "sent" as const,
          };
        } catch (error) {
          return {
            registrationId: registration.id,
            email: registration.email,
            status: "failed" as const,
            message: error instanceof Error ? error.message : "Email could not be sent",
          };
        }
      }));

      results.push(...batchResults);
      if (offset + BATCH_SIZE < registrations!.length) {
        await wait(BATCH_DELAY_MS);
      }
    }

    const sent = results.filter((result) => result.status === "sent").length;
    return jsonResponse({
      status: "completed",
      requested: registrationIds.length,
      sent,
      failed: results.length - sent,
      results,
    });
  } catch (error) {
    console.error("Bulk confirmation email error:", error.message);
    return jsonResponse({ error: "Bulk confirmation emails could not be sent" }, 500);
  }
});
