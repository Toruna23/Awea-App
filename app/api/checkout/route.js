import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const body = await request.json();
  const { restaurant_id, items, tip, customer_name, customer_phone, table_number, origin, reward_code } = body;

  if (!restaurant_id || !items || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "Missing order details." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: paymentSettings } = await supabase
    .from("restaurant_payment_settings")
    .select("*")
    .eq("restaurant_id", restaurant_id)
    .single();

  if (!paymentSettings?.paystack_subaccount_code) {
    return Response.json(
      { error: "Online payment isn't set up for this restaurant yet." },
      { status: 400 }
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  let discount = 0;
  let verifiedRewardCode = null;
  if (reward_code) {
    const { data: signup } = await supabase
      .from("rewards_signups")
      .select("id")
      .eq("restaurant_id", restaurant_id)
      .ilike("reward_code", reward_code.trim())
      .maybeSingle();

    if (signup) {
      discount = Math.round(subtotal * 0.10 * 100) / 100;
      verifiedRewardCode = reward_code.trim();
    }
  }

  const tipAmount = Number(tip) || 0;
  const total = Math.round((subtotal - discount + tipAmount) * 100) / 100;
  const transactionReference = `AWEA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { error: insertError } = await supabase.from("orders").insert({
    restaurant_id,
    items,
    subtotal,
    tip: tipAmount,
    discount,
    reward_code: verifiedRewardCode,
    total,
    transaction_reference: transactionReference,
    customer_phone: customer_phone || null,
    table_number: table_number || null,
    customer_phone: customer_phone || null,
    status: "pending",
  });

  if (insertError) {
    return Response.json({ error: "Could not create the order." }, { status: 500 });
  }

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `${transactionReference}@awea-guest.com`,
      amount: Math.round(total * 100),
      currency: "ZAR",
      reference: transactionReference,
      callback_url: `${origin}/order/${transactionReference}`,
      subaccount: paymentSettings.paystack_subaccount_code,
    }),
  });

  const paystackData = await paystackRes.json();

  if (!paystackData.status) {
    return Response.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }

  return Response.json({ authorization_url: paystackData.data.authorization_url });
}