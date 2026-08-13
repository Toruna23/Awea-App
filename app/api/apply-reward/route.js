import { createAdminClient } from "@/lib/supabase/admin";

const REWARD_DISCOUNT_PCT = 10;

export async function POST(request) {
  const { restaurant_id, code } = await request.json();

  if (!restaurant_id || !code) {
    return Response.json({ valid: false });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("rewards_signups")
    .select("id, visit_count")
    .eq("restaurant_id", restaurant_id)
    .ilike("reward_code", code.trim())
    .maybeSingle();

  if (!data) {
    return Response.json({ valid: false });
  }

  return Response.json({ valid: true, discount_pct: REWARD_DISCOUNT_PCT, visit_count: data.visit_count || 1 });
}