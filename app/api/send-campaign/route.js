import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCampaignToRestaurant } from "@/lib/sendCampaign";

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  const { restaurant_id, subject, body, header_image_url, image_url, cta_text, cta_url, scheduled_for } = await request.json();
  if (!restaurant_id || !subject || !body) {
    return Response.json({ error: "Missing details." }, { status: 400 });
  }

  const { data: allowed } = await supabase.rpc("has_restaurant_access", { rid: restaurant_id });
  if (!allowed) {
    return Response.json({ error: "Not authorized for this restaurant." }, { status: 403 });
  }

  const admin = createAdminClient();
  const isFutureSchedule = scheduled_for && new Date(scheduled_for) > new Date();

  const baseRow = {
    restaurant_id,
    subject,
    body,
    header_image_url: header_image_url || null,
    image_url: image_url || null,
    cta_text: cta_text || null,
    cta_url: cta_url || null,
  };

  if (isFutureSchedule) {
    await admin.from("campaigns").insert({
      ...baseRow,
      scheduled_for,
      status: "scheduled",
      recipient_count: 0,
      success_count: 0,
      failure_count: 0,
    });
    return Response.json({ scheduled: true });
  }

  const result = await sendCampaignToRestaurant(admin, baseRow);

  await admin.from("campaigns").insert({
    ...baseRow,
    status: "sent",
    recipient_count: result.recipient_count,
    success_count: result.success_count,
    failure_count: result.failure_count,
  });

  return Response.json(result);
}