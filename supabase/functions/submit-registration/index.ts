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
    const body = await req.json();
    const { email, surname, firstName, category } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: existing } = await supabase
      .from("registrations")
      .select("id, paymentStatus")
      .eq("email", email)
      .single();

    if (existing && existing.paymentStatus === "paid") {
      throw new Error("A paid registration already exists for this email");
    }

    if (existing && existing.paymentStatus === "pending") {
      await supabase.from("registrations").delete().eq("id", existing.id);
    }

    const reference = `CMDA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    let baseFee = 0;
    switch (category) {
      case "student": baseFee = 11000; break;
      case "junior-doctor": baseFee = 30000; break;
      case "senior-doctor": baseFee = 50000; break;
      case "doctor-with-spouse": baseFee = 85000; break;
      case "virtual-student": baseFee = 11000; break;
      case "virtual-junior-doctor": baseFee = 30000; break;
      case "virtual-senior-doctor": baseFee = 50000; break;
    }

    const now = new Date();
    const deadline = new Date("2026-05-18T23:59:59+01:00");
    const isVirtual = category?.startsWith("virtual-");
    const lateFee = (now > deadline && !isVirtual) ? 10000 : 0;

    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "paystack_split_code")
      .single();

    const { data: registration, error: insertError } = await supabase
      .from("registrations")
      .insert({
        email,
        surname,
        firstName,
        otherNames: body.otherNames || null,
        age: body.age,
        sex: body.sex,
        phone: body.phone,
        chapter: body.chapter,
        state: body.state || null,
        currentLeadershipPost: body.currentLeadershipPost || null,
        previousLeadershipPost: body.previousLeadershipPost || null,
        category,
        chapterOfGraduation: body.chapterOfGraduation || null,
        spouseSurname: body.spouseSurname || null,
        spouseFirstName: body.spouseFirstName || null,
        spouseOtherNames: body.spouseOtherNames || null,
        spouseEmail: body.spouseEmail || null,
        dateOfArrival: body.dateOfArrival || null,
        accommodationType: body.accommodationType || null,
        covenantRoomType: body.covenantRoomType || null,
        temperanceRoomType: body.temperanceRoomType || null,
        roomSharing: body.roomSharing || null,
        roommateName: body.roommateName || null,
        hasAbstract: body.hasAbstract || false,
        presentationTitle: body.presentationTitle || null,
        abstractFileUrl: body.abstractFileUrl || null,
        baseFee,
        lateFee,
        totalAmount: baseFee + lateFee,
        paymentStatus: "pending",
        paymentReference: reference,
        splitCode: settings?.value || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ reference, registrationId: registration.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
