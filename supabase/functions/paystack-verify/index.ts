import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference } = await req.json();

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not set");

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (result.status && result.data?.status === "success") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabase
        .from("registrations")
        .update({
          paymentStatus: "paid",
          paidAt: new Date().toISOString(),
        })
        .eq("paymentReference", reference);

      const { data: reg } = await supabase
        .from("registrations")
        .select("*")
        .eq("paymentReference", reference)
        .single();

      if (reg) {
        await supabase.from("email_logs").insert({
          recipientEmail: reg.email,
          subject: `Registration Confirmed - CMDA Conference 2026`,
          status: "sent",
          registrationId: reg.id,
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: result.data?.status === "success" ? "success" : "failed",
        message: result.message,
        data: result.data,
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
