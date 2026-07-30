import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-email-utility-token",
};

interface EmailMessage {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Uint8Array;
    contentType: string;
    cid: string;
  }>;
}

let smtpTransporter: ReturnType<typeof nodemailer.createTransport> | undefined;
let smtpTransporterKey = "";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function sendWithSmtp(message: EmailMessage) {
  const host = Deno.env.get("EMAIL_HOST") || "smtp.gmail.com";
  const user = Deno.env.get("EMAIL_USER") || Deno.env.get("SMTP_USER");
  const password = Deno.env.get("EMAIL_PASS");
  const port = Number(Deno.env.get("EMAIL_PORT") || "465");

  if (!user || !password) throw new Error("Gmail SMTP credentials are not configured");

  const transporterKey = `${host}:${port}:${user}`;
  if (!smtpTransporter || smtpTransporterKey !== transporterKey) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      rateDelta: 1_000,
      rateLimit: 4,
      auth: { user, pass: password },
      tls: { minVersion: "TLSv1.2" },
    });
    smtpTransporterKey = transporterKey;
  }

  const from = Deno.env.get("SMTP_FROM") || `CMDA Nigeria <${user}>`;
  return smtpTransporter.sendMail({ ...message, from });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      registrationId,
      source: requestedSource,
      attendeeType: requestedAttendeeType,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const callerToken = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const suppliedUtilityToken = req.headers.get("x-email-utility-token") ?? "";
    const configuredUtilityToken = Deno.env.get("EMAIL_UTILITY_TOKEN") ?? "";
    const trustedUtilityRequest = callerToken === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      || (
        configuredUtilityToken.length >= 32
        && suppliedUtilityToken === configuredUtilityToken
      );
    let trustedAdminRequest = false;
    if (!trustedUtilityRequest && callerToken) {
      const { data: authData } = await supabase.auth.getUser(callerToken);
      const userEmail = authData.user?.email;
      if (userEmail) {
        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("id")
          .ilike("email", userEmail)
          .eq("isActive", true)
          .eq("role", "super_admin")
          .limit(1)
          .maybeSingle();
        trustedAdminRequest = Boolean(adminUser);
      }
    }
    const source = trustedAdminRequest
      || (requestedSource === "utility" && trustedUtilityRequest)
      ? "utility"
      : "system";

    const { data: reg, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (fetchError || !reg) throw new Error("Registration not found");

    const attendeeType = requestedAttendeeType === "spouse" ? "spouse" : "primary";
    const isSpousePass = attendeeType === "spouse";
    if (
      requestedAttendeeType !== undefined
      && requestedAttendeeType !== "primary"
      && requestedAttendeeType !== "spouse"
    ) {
      throw new Error("Invalid attendee type");
    }
    if (isSpousePass && reg.category !== "doctor-with-spouse") {
      throw new Error("This registration does not include a spouse");
    }
    if (
      isSpousePass
      && (
        !reg.spouseFirstName?.trim()
        || !reg.spouseSurname?.trim()
        || !reg.spouseEmail?.trim()
      )
    ) {
      throw new Error("Spouse details are incomplete");
    }
    if (isSpousePass && reg.paymentStatus !== "paid") {
      throw new Error("Only paid spouse registrations can receive a pass");
    }

    const participantFirstName = isSpousePass ? reg.spouseFirstName : reg.firstName;
    const participantSurname = isSpousePass ? reg.spouseSurname : reg.surname;
    const participantEmail = isSpousePass ? reg.spouseEmail : reg.email;
    const passFilename = isSpousePass ? "spouse-conference-pass.png" : "conference-pass.png";
    const emailSubject = isSpousePass
      ? "CMDA Conference 2026 - Your Spouse Conference Pass"
      : "CMDA Conference 2026 - Registration Confirmed";

    const resendFrom = Deno.env.get("RESEND_FROM")
      || Deno.env.get("EMAIL_FROM")
      || "CMDA Nigeria <conference@dnconference.cmdanigeria.net>";

    const qrCodeData = JSON.stringify({
      registrationId: reg.id,
      attendeeType,
      email: participantEmail,
      name: `${participantFirstName} ${participantSurname}`,
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
    const qrContentId = `${attendeeType}-conference-pass-${reg.id}`;
    let qrCodeContent: Uint8Array | undefined;
    if (!isVirtual) {
      const qrResponse = await fetch(qrCodeUrl);
      if (!qrResponse.ok) {
        throw new Error(`Could not generate conference QR code: ${qrResponse.status}`);
      }
      qrCodeContent = new Uint8Array(await qrResponse.arrayBuffer());
    }

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
      <h1>Registration Confirmed</h1>
      <p>CMDA National Conference 2026</p>
    </div>
    <div class="content">
      <h2>Dear ${participantFirstName} ${participantSurname},</h2>
      <p>${isSpousePass
        ? `Your participation under ${reg.firstName} ${reg.surname}'s Doctor with Spouse booking is confirmed.`
        : 'Thank you for registering for the CMDA National Conference 2026. Your payment has been successfully processed.'
      }</p>
      
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Registration ID:</span>
          <span>${reg.id}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Category:</span>
          <span>${isSpousePass ? 'Spouse - Doctor with Spouse' : categoryLabels[reg.category] || reg.category}</span>
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
        <h3 style="color: #2e7d32;">Virtual Participation</h3>
        <p>You will receive a meeting link via email before the conference begins.</p>
        <p style="margin-top: 15px; color: #666;">Please keep this email for your records.</p>
      </div>

      <div class="important">
        <strong>Important:</strong>
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
        <img src="cid:${qrContentId}" alt="Conference Pass QR Code" style="display: block; width: 300px; max-width: 100%; height: auto; margin: 20px auto;" />
        <p style="font-size: 13px;">
          Your conference pass is also attached as <strong>${passFilename}</strong>.
        </p>
      </div>

      <div class="important">
        <strong>Important:</strong>
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
      <p>Replies are monitored at conference@cmdanigeria.org.</p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `CMDA National Conference 2026\n\n` +
      `Dear ${participantFirstName} ${participantSurname},\n\n` +
      (isSpousePass
        ? `Your participation under ${reg.firstName} ${reg.surname}'s Doctor with Spouse booking is confirmed.\n`
        : `Your registration is confirmed.\n`) +
      `Registration ID: ${reg.id}\n` +
      `Category: ${isSpousePass ? 'Spouse - Doctor with Spouse' : categoryLabels[reg.category] || reg.category}\n` +
      `Amount Paid: ₦${reg.totalAmount?.toLocaleString()}\n` +
      `Payment Reference: ${reg.paymentReference}\n\n` +
      (isVirtual ?
        `You are registered for virtual participation.\nA meeting link will be sent to you before the event.\n` :
        `Your QR conference pass is attached as ${passFilename}.\nPlease present it at check-in.\n`
      );

    let provider = "resend";
    if (source === "utility") {
      if (Deno.env.get("EMAIL_UTILITY_FORCE_SMTP") === "true") {
        provider = "smtp";
      } else {
        const { data: reservedProvider, error: reservationError } = await supabase
          .rpc("reserve_confirmation_email_provider", { p_source: source });
        if (reservationError) throw reservationError;
        provider = reservedProvider;
      }
    }

    if (provider === "limit_reached") {
      throw new Error("Daily email utility limit reached");
    }

    const message = {
      to: participantEmail,
      replyTo: "conference@cmdanigeria.org",
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
      attachments: qrCodeContent
        ? [{
          filename: passFilename,
          content: qrCodeContent,
          contentType: "image/png",
          cid: qrContentId,
        }]
        : undefined,
    };

    let messageId: string | undefined;
    try {
      if (provider === "smtp") {
        const smtpResult = await sendWithSmtp(message);
        messageId = smtpResult.messageId;
      } else {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (!resendKey) throw new Error("RESEND_API_KEY not configured");

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
            "User-Agent": "CMDA-Conference/1.0",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [message.to],
            reply_to: message.replyTo,
            subject: message.subject,
            text: message.text,
            html: message.html,
            attachments: message.attachments?.map((attachment) => ({
              filename: attachment.filename,
              content: bytesToBase64(attachment.content),
              content_type: attachment.contentType,
              content_id: attachment.cid,
            })),
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || result.error || `Resend API error: ${response.status}`);
        }
        messageId = result.id;
      }
    } catch (deliveryError) {
      if (source === "utility") {
        await supabase.rpc("release_confirmation_email_provider", {
          p_source: source,
          p_provider: provider,
        });
      }

      const errorMessage = deliveryError instanceof Error
        ? deliveryError.message
        : "Email delivery failed";
      await supabase.from("email_logs").insert({
        recipientEmail: participantEmail,
        subject: emailSubject,
        status: "failed",
        errorMessage,
        registrationId: reg.id,
        attendeeType,
        source,
        provider,
      });
      throw deliveryError;
    }

    await supabase.from("email_logs").insert({
      recipientEmail: participantEmail,
      subject: emailSubject,
      status: "sent",
      registrationId: reg.id,
      attendeeType,
      source,
      provider,
    });

    return new Response(
      JSON.stringify({ status: "sent", id: messageId, provider, attendeeType }),
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
