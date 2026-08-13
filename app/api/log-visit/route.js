import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const { restaurant_id, code } = await request.json();
  if (!restaurant_id || !code) {
    return Response.json({ error: "Missing details." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: signup } = await supabase
    .from("rewards_signups")
    .select("id, visit_count")
    .eq("restaurant_id", restaurant_id)
    .ilike("reward_code", code.trim())
    .maybeSingle();

  if (!signup) {
    return Response.json({ error: "Reward code not found." }, { status: 404 });
  }

  const newCount = (signup.visit_count || 1) + 1;

  await supabase
    .from("rewards_signups")
    .update({ visit_count: newCount })
    .eq("id", signup.id);

  return Response.json({ visit_count: newCount });
}