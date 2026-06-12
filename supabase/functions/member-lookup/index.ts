const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    const mongoUri = Deno.env.get("MONGODB_URI");
    if (!mongoUri) throw new Error("MONGODB_URI not set");

    const { MongoClient } = await import("npm:mongodb@6");
    const client = new MongoClient(mongoUri);
    await client.connect();

    const db = client.db("live");
    const members = db.collection("members");
    const member = await members.findOne({ email });

    await client.close();

    if (!member) {
      return new Response(
        JSON.stringify({ member: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        member: {
          id: member._id?.toString(),
          email: member.email,
          surname: member.surname,
          firstName: member.firstName,
          otherNames: member.otherNames || "",
          age: member.age,
          sex: member.sex,
          phone: member.phone,
          chapter: member.chapter,
          state: member.state || member.chapter,
          isCmdaMember: member.isCmdaMember,
          currentLeadershipPost: member.currentLeadershipPost || "",
          previousLeadershipPost: member.previousLeadershipPost || "",
          category: member.category,
          chapterOfGraduation: member.chapterOfGraduation || member.chapter,
          yearsInPractice: member.yearsInPractice,
          _metadata: {
            membershipId: member.membershipId,
            role: member.role,
            licenseNumber: member.licenseNumber,
            specialty: member.specialty,
          },
        },
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
