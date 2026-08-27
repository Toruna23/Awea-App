import { createAdminClient } from "@/lib/supabase/admin";
import { sendCampaignToRestaurant } from "@/lib/sendCampaign";

export async function GET(request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const { data: due } = await admin
    .from("campaigns")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString());

  const results = [];
  for (const campaign of due || []) {
    await admin.from("campaigns").update({ status: "sending" }).eq("id", campaign.id);
    const result = await sendCampaignToRestaurant(admin, campaign);
    await admin.from("campaigns").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      recipient_count: result.recipient_count,
      success_count: result.success_count,
      failure_count: result.failure_count,
    }).eq("id", campaign.id);
    results.push({ id: campaign.id, ...result });
  }

  return Response.json({ processed: results.length, results });
}