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
    const users = db.collection("users");
    const user = await users.findOne({ email });

    await client.close();

    if (!user) {
      return new Response(
        JSON.stringify({ member: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        member: {
          id: user._id?.toString(),
          email: user.email,
          surname: user.lastName || user.surname || "",
          firstName: user.firstName || "",
          otherNames: user.middleName || "",
          age: user.age || null,
          sex: user.gender || "",
          phone: user.phone || "",
          chapter: user.region || user.chapter || "",
          state: user.region || user.state || "",
          isCmdaMember: user.subscribed || false,
          currentLeadershipPost: user.currentLeadershipPost || "",
          previousLeadershipPost: user.previousLeadershipPost || "",
          category: user.category || "",
          chapterOfGraduation: user.chapterOfGraduation || user.region || "",
          yearsInPractice: user.yearsInPractice || null,
          _metadata: {
            membershipId: user.membershipId || "",
            role: user.role || "",
            licenseNumber: user.licenseNumber || "",
            specialty: user.specialty || "",
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
