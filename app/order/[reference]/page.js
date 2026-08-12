import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function OrderStatusPage({ params }) {
  const supabase = createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, restaurants(name, slug)")
    .eq("transaction_reference", params.reference)
    .single();

  if (!order) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="text-muted">We couldn&apos;t find that order.</div>
      </main>
    );
  }

  const label = {
    pending: { text: "Payment pending — this can take a moment.", color: "text-muted" },
    complete: { text: "Payment successful — thank you!", color: "text-sage" },
    cancelled: { text: "Payment was cancelled.", color: "text-muted" },
    error: { text: "Payment failed — please try again.", color: "text-rust" },
  }[order.status];

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white border border-line rounded-2xl p-6 text-center shadow-sm">
        <div className="font-display text-xl font-bold">{order.restaurants?.name}</div>
        <div className={`mt-3 font-semibold ${label.color}`}>{label.text}</div>
        <div className="text-muted text-sm mt-3">Order total: R{order.total}</div>
        {order.restaurants?.slug && (
          <a href={`/r/${order.restaurants.slug}`} className="inline-block mt-5 text-amber text-sm underline">
            Back to menu
          </a>
        )}
      </div>
    </main>
  );
}
