function emailSafeHtml(html) {
  return html
    .replace(/<p class="ql-align-center">/g, '<p style="text-align:center;">')
    .replace(/<p class="ql-align-right">/g, '<p style="text-align:right;">')
    .replace(/<p class="ql-align-justify">/g, '<p style="text-align:justify;">');
}

export async function sendCampaignToRestaurant(admin, campaign) {
  const { data: restaurant } = await admin.from("restaurants").select("name").eq("id", campaign.restaurant_id).single();
  const { data: recipients } = await admin
    .from("rewards_signups")
    .select("email")
    .eq("restaurant_id", campaign.restaurant_id)
    .eq("marketing_opt_in", true);

  const list = recipients || [];
  let successCount = 0;
  let failureCount = 0;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      ${campaign.header_image_url ? `<img src="${campaign.header_image_url}" alt="" style="width:100%; border-radius: 8px;" />` : ""}
      <div style="margin-top: 16px; color: #241F17; line-height: 1.5;">${emailSafeHtml(campaign.body)}</div>
      ${campaign.image_url ? `<img src="${campaign.image_url}" alt="" style="width:100%; border-radius: 8px; margin-top: 16px;" />` : ""}
      ${campaign.cta_text && campaign.cta_url ? `<div style="margin-top: 20px;"><a href="${campaign.cta_url}" style="background:#C98A2E; color:#fff; padding: 12px 20px; border-radius: 8px; text-decoration:none; display:inline-block; font-weight:bold;">${campaign.cta_text}</a></div>` : ""}
    </div>
  `;

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
          subject: campaign.subject,
          html,
        }),
      });
      if (res.ok) successCount++; else failureCount++;
    } catch {
      failureCount++;
    }
    await new Promise((resolve) => setTimeout(resolve, 550));
  }

  return { recipient_count: list.length, success_count: successCount, failure_count: failureCount };
}
