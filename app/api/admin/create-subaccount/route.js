import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  const { restaurant_id, business_name, settlement_bank, account_number, percentage_charge } = await request.json();

  if (!restaurant_id || !business_name || !settlement_bank || !account_number) {
    return Response.json({ error: "Missing details." }, { status: 400 });
  }

  const res = await fetch("https://api.paystack.co/subaccount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name,
      settlement_bank,
      account_number,
      percentage_charge: Number(percentage_charge) || 0,
    }),
  });

  const data = await res.json();
  if (!data.status) {
    return Response.json({ error: data.message || "Paystack rejected these details." }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("restaurant_payment_settings").upsert({
    restaurant_id,
    paystack_subaccount_code: data.data.subaccount_code,
    paystack_percentage_charge: Number(percentage_charge) || 0,
  });

  return Response.json({ subaccount_code: data.data.subaccount_code });
}