import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { registrationId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: reg, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (fetchError || !reg) throw new Error("Registration not found");

    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpUser = Deno.env.get("SMTP_USER");
    const emailFrom = Deno.env.get("EMAIL_FROM") || "CMDA Conference <conference@cmdanigeria.org>";

    if (!smtpPass || !smtpUser) {
      await supabase.from("email_logs").insert({
        recipientEmail: reg.email,
        subject: `Registration Confirmed - CMDA Conference 2026`,
        status: "failed",
        errorMessage: "SMTP not configured",
        registrationId: reg.id,
      });
      throw new Error("SMTP not configured");
    }

    const qrData = JSON.stringify({ id: reg.id, name: `${reg.firstName} ${reg.surname}`, category: reg.category });

    const htmlContent = `
      <h1>CMDA National Conference 2026 - Registration Confirmed</h1>
      <p>Dear ${reg.firstName} ${reg.surname},</p>
      <p>Your registration has been confirmed!</p>
      <ul>
        <li>Category: ${reg.category}</li>
        <li>Registration ID: ${reg.id}</li>
        <li>Payment Reference: ${reg.paymentReference}</li>
        <li>Amount Paid: ₦${reg.totalAmount?.toLocaleString()}</li>
      </ul>
      <p>Conference Details:</p>
      <ul>
        <li>Date: 30th July – 2nd August, 2026</li>
        <li>Venue: Covenant University, Ota</li>
        <li>Theme: Excellence for Impact</li>
      </ul>
      <p>Please present your QR code at the registration desk on arrival.</p>
    `;

    const response = await fetch("https://api.mailgun.net/v3/messages", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${smtpUser}:${smtpPass}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        from: emailFrom,
        to: reg.email,
        subject: `CMDA Conference 2026 - Registration Confirmed`,
        html: htmlContent,
      }).toString(),
    }).catch(() => null);

    const status = response?.ok ? "sent" : "failed";
    const errorMessage = response?.ok ? null : "Email delivery failed";

    await supabase.from("email_logs").insert({
      recipientEmail: reg.email,
      subject: `Registration Confirmed - CMDA Conference 2026`,
      status,
      errorMessage,
      registrationId: reg.id,
    });

    return new Response(
      JSON.stringify({ status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
