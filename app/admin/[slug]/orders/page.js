import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import OrdersLive from "./OrdersLive";

export const revalidate = 0;

export default async function OrdersPage({ params }) {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();

  if (!restaurant) return notFound();

  return (
    <main className="min-h-screen px-5 py-6 max-w-2xl mx-auto">
      <Link href={`/admin/${restaurant.slug}`} className="text-muted text-xs">← Back to {restaurant.name}</Link>
      <div className="font-display text-2xl font-black mt-2 mb-1">Live Orders</div>
      <div className="text-muted text-xs mb-4">Refreshes automatically every 10 seconds.</div>
      <OrdersLive restaurantId={restaurant.id} />
    </main>
  );
}