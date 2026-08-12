import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

export async function POST(request) {
  const body = await request.json();
  const { restaurant_id, items, tip, customer_name, customer_phone, origin } = body;

  if (!restaurant_id || !items || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "Missing order details." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up this restaurant's own Ozow credentials (private table, service role only)
  const { data: paymentSettings } = await supabase
    .from("restaurant_payment_settings")
    .select("*")
    .eq("restaurant_id", restaurant_id)
    .single();

  if (!paymentSettings?.ozow_site_code || !paymentSettings?.ozow_private_key) {
    return Response.json(
      { error: "Online payment isn't set up for this restaurant yet." },
      { status: 400 }
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tipAmount = Number(tip) || 0;
  const total = Math.round((subtotal + tipAmount) * 100) / 100;
  const transactionReference = `AWEA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { error: insertError } = await supabase.from("orders").insert({
    restaurant_id,
    items,
    subtotal,
    tip: tipAmount,
    total,
    transaction_reference: transactionReference,
    customer_name: customer_name || null,
    customer_phone: customer_phone || null,
    status: "pending",
  });

  if (insertError) {
    return Response.json({ error: "Could not create the order." }, { status: 500 });
  }

  const siteCode = paymentSettings.ozow_site_code;
  const countryCode = "ZA";
  const currencyCode = "ZAR";
  const amount = total.toFixed(2);
  const isTest = paymentSettings.is_test ? "true" : "false";
  const notifyUrl = `${origin}/api/ozow-webhook`;
  const successUrl = `${origin}/order/${transactionReference}?status=success`;
  const cancelUrl = `${origin}/order/${transactionReference}?status=cancelled`;
  const errorUrl = `${origin}/order/${transactionReference}?status=error`;

  // Ozow requires these fields concatenated in this exact order, lowercased, hashed with SHA512
  const hashString = [
    siteCode,
    countryCode,
    currencyCode,
    amount,
    transactionReference,
    "", // bankReference (optional, left blank)
    "", // optional1-5
    "",
    "",
    "",
    "",
    notifyUrl,
    successUrl,
    errorUrl,
    cancelUrl,
    isTest,
    paymentSettings.ozow_private_key,
  ].join("").toLowerCase();

  const hash = createHash("sha512").update(hashString).digest("hex");

  return Response.json({
    postUrl: "https://pay.ozow.com/",
    fields: {
      SiteCode: siteCode,
      CountryCode: countryCode,
      CurrencyCode: currencyCode,
      Amount: amount,
      TransactionReference: transactionReference,
      NotifyUrl: notifyUrl,
      SuccessUrl: successUrl,
      ErrorUrl: errorUrl,
      CancelUrl: cancelUrl,
      IsTest: isTest,
      HashCheck: hash,
    },
  });
}
