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

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      await supabase.from("email_logs").insert({
        recipientEmail: reg.email,
        subject: "Registration Confirmed - CMDA Conference 2026",
        status: "failed",
        errorMessage: "RESEND_API_KEY not configured",
        registrationId: reg.id,
      });
      throw new Error("RESEND_API_KEY not configured");
    }

    const fromEmail = Deno.env.get("EMAIL_FROM") || "CMDA Conference <conference@dnconference.cmdanigeria.net>";

    const qrCodeData = JSON.stringify({
      registrationId: reg.id,
      email: reg.email,
      name: `${reg.firstName} ${reg.surname}`,
      verified: false,
    });
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData)}`;

    const categoryLabels: Record<string, string> = {
      'student': 'Student',
      'junior-doctor': 'Junior Doctor',
      'senior-doctor': 'Senior Doctor',
      'doctor-with-spouse': 'Doctor with Spouse',
      'virtual-student': 'Virtual - Student',
      'virtual-junior-doctor': 'Virtual - Junior Doctor',
      'virtual-senior-doctor': 'Virtual - Senior Doctor',
    };

    const isVirtual = reg.category?.startsWith('virtual-');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 10px; }
    .details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #667eea; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    .important { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Registration Confirmed!</h1>
      <p>CMDA National Conference 2026</p>
    </div>
    <div class="content">
      <h2>Dear ${reg.firstName} ${reg.surname},</h2>
      <p>Thank you for registering for the CMDA National Conference 2026. Your payment has been successfully processed.</p>
      
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Registration ID:</span>
          <span>${reg.id}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Category:</span>
          <span>${categoryLabels[reg.category] || reg.category}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Paid:</span>
          <span>₦${reg.totalAmount?.toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Reference:</span>
          <span>${reg.paymentReference}</span>
        </div>
      </div>

      ${isVirtual ? `
      <div class="qr-section" style="background: #e8f5e9; border: 2px solid #4caf50;">
        <h3 style="color: #2e7d32;">🖥️ Virtual Participation</h3>
        <p>You will receive a meeting link via email before the conference begins.</p>
        <p style="margin-top: 15px; color: #666;">Please keep this email for your records.</p>
      </div>

      <div class="important">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>A meeting link will be sent to you before the event</li>
          <li>Ensure your email address is correct</li>
          <li>Keep your registration ID for reference</li>
        </ul>
      </div>
      ` : `
      <div class="qr-section">
        <h3>Your Conference Pass</h3>
        <p>Please present this QR code at the conference venue for check-in:</p>
        <img src="${qrCodeUrl}" alt="Conference Pass QR Code" style="max-width: 300px; margin: 20px auto;" />
      </div>

      <div class="important">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>Save this email or take a screenshot of the QR code</li>
          <li>Present the QR code at registration desk on arrival</li>
          <li>Keep your registration ID for reference</li>
        </ul>
      </div>
      `}

      <p>We look forward to ${isVirtual ? 'welcoming you online' : 'seeing you at the conference'}!</p>
      <p>For any inquiries, please contact us at <a href="mailto:conference@cmdanigeria.org">conference@cmdanigeria.org</a></p>
    </div>
    <div class="footer">
      <p>© 2026 Christian Medical & Dental Association of Nigeria</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `CMDA National Conference 2026\n\n` +
      `Dear ${reg.firstName} ${reg.surname},\n\n` +
      `Your registration is confirmed.\n` +
      `Registration ID: ${reg.id}\n` +
      `Category: ${categoryLabels[reg.category] || reg.category}\n` +
      `Amount Paid: ₦${reg.totalAmount?.toLocaleString()}\n` +
      `Payment Reference: ${reg.paymentReference}\n\n` +
      (isVirtual ?
        `You are registered for virtual participation.\nA meeting link will be sent to you before the event.\n` :
        `Your QR code: ${qrCodeUrl}\nPlease present it at check-in.\n`
      );

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [reg.email],
        subject: "CMDA Conference 2026 - Registration Confirmed",
        text: textContent,
        html: htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || `Resend API error: ${response.status}`);
    }

    await supabase.from("email_logs").insert({
      recipientEmail: reg.email,
      subject: "Registration Confirmed - CMDA Conference 2026",
      status: "sent",
      registrationId: reg.id,
    });

    return new Response(
      JSON.stringify({ status: "sent", id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
