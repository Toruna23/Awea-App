import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const expectedSignature = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return new Response("Invalid signature", { status: 403 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createAdminClient();

  if (event.event === "charge.success") {
    const reference = event.data.reference;

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("transaction_reference", reference)
      .single();

    if (order) {
      await supabase
        .from("orders")
        .update({ status: "complete" })
        .eq("transaction_reference", reference);

      if (order.reward_code) {
        const { data: signup } = await supabase
          .from("rewards_signups")
          .select("id, redeemed_count")
          .eq("restaurant_id", order.restaurant_id)
          .ilike("reward_code", order.reward_code)
          .maybeSingle();

        if (signup) {
          await supabase
            .from("rewards_signups")
            .update({ redeemed_count: (signup.redeemed_count || 0) + 1 })
            .eq("id", signup.id);
        }
      }
    }
  }

  return new Response("OK", { status: 200 });
}