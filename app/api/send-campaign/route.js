import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  const { restaurant_id, subject, body } = await request.json();
  if (!restaurant_id || !subject || !body) {
    return Response.json({ error: "Missing details." }, { status: 400 });
  }

  const { data: allowed } = await supabase.rpc("has_restaurant_access", { rid: restaurant_id });
  if (!allowed) {
    return Response.json({ error: "Not authorized for this restaurant." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: restaurant } = await admin.from("restaurants").select("name").eq("id", restaurant_id).single();
  const { data: recipients } = await admin
    .from("rewards_signups")
    .select("email")
    .eq("restaurant_id", restaurant_id)
    .eq("marketing_opt_in", true);

  const list = recipients || [];
  let successCount = 0;
  let failureCount = 0;

  for (const r of list) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${restaurant?.name || "Awea"} <onboarding@resend.dev>`,
          to: [r.email],
          subject,
          html: `<div style="font-family: sans-serif; white-space: pre-wrap;">${body}</div>`,
        }),
      });
      if (res.ok) successCount++; else failureCount++;
    } catch {
      failureCount++;
    }
    await new Promise((resolve) => setTimeout(resolve, 550));
  }

  await admin.from("campaigns").insert({
    restaurant_id,
    subject,
    body,
    recipient_count: list.length,
    success_count: successCount,
    failure_count: failureCount,
  });

  return Response.json({ recipient_count: list.length, success_count: successCount, failure_count: failureCount });
}