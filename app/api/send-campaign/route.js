import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function emailSafeHtml(html) {
  return html
    .replace(/<p class="ql-align-center">/g, '<p style="text-align:center;">')
    .replace(/<p class="ql-align-right">/g, '<p style="text-align:right;">')
    .replace(/<p class="ql-align-justify">/g, '<p style="text-align:justify;">');
}

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  const { restaurant_id, subject, body, header_image_url, image_url, cta_text, cta_url } = await request.json();
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

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      ${header_image_url ? `<img src="${header_image_url}" alt="" style="width:100%; border-radius: 8px;" />` : ""}
      <div style="margin-top: 16px; color: #241F17; line-height: 1.5;">${emailSafeHtml(body)}</div>
      ${image_url ? `<img src="${image_url}" alt="" style="width:100%; border-radius: 8px; margin-top: 16px;" />` : ""}
      ${cta_text && cta_url ? `<div style="margin-top: 20px;"><a href="${cta_url}" style="background:#C98A2E; color:#fff; padding: 12px 20px; border-radius: 8px; text-decoration:none; display:inline-block; font-weight:bold;">${cta_text}</a></div>` : ""}
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
          subject,
          html,
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
    header_image_url: header_image_url || null,
    image_url: image_url || null,
    cta_text: cta_text || null,
    cta_url: cta_url || null,
    recipient_count: list.length,
    success_count: successCount,
    failure_count: failureCount,
  });

  return Response.json({ recipient_count: list.length, success_count: successCount, failure_count: failureCount });
}