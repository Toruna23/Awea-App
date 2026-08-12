import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

export async function POST(request) {
  const form = await request.formData();
  const data = Object.fromEntries(form.entries());

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("transaction_reference", data.TransactionReference)
    .single();

  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  const { data: paymentSettings } = await supabase
    .from("restaurant_payment_settings")
    .select("ozow_private_key")
    .eq("restaurant_id", order.restaurant_id)
    .single();

  // Verify this notification genuinely came from Ozow using their shared private key
  const hashString = [
    data.SiteCode,
    data.TransactionId,
    data.TransactionReference,
    data.Amount,
    data.Status,
    paymentSettings?.ozow_private_key || "",
  ].join("").toLowerCase();

  const expectedHash = createHash("sha512").update(hashString).digest("hex");

  if (expectedHash !== (data.Hash || "").toLowerCase()) {
    return new Response("Invalid signature", { status: 403 });
  }

  const newStatus = data.Status === "Complete" ? "complete" : data.Status === "Cancelled" ? "cancelled" : "error";

  await supabase
    .from("orders")
    .update({ status: newStatus, ozow_transaction_id: data.TransactionId })
    .eq("transaction_reference", data.TransactionReference);

  return new Response("OK", { status: 200 });
}
