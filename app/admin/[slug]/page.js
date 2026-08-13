import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdminMenuEditor from "./AdminMenuEditor";

export const revalidate = 0;

export default async function AdminRestaurantPage({ params }) {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!restaurant) return notFound();

  const { data: paymentSettings } = await supabase
    .from("restaurant_payment_settings")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .single();

  const restaurantWithPayment = { ...restaurant, ...paymentSettings };

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order");

  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order");

  const { data: signups } = await supabase
    .from("rewards_signups")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="min-h-screen px-5 py-6 max-w-2xl mx-auto">
      <Link href="/admin" className="text-muted text-xs">← All restaurants</Link>
      <div className="font-display text-2xl font-black mt-2">{restaurant.name}</div>
      <a href={`/r/${restaurant.slug}`} target="_blank" className="text-amber text-xs underline">
        View live menu → /r/{restaurant.slug}
      </a>

      <AdminMenuEditor restaurant={restaurantWithPayment} categories={categories || []} items={items || []} />

      <div className="mt-10">
        <div className="font-display font-semibold mb-2">Rewards signups ({signups?.length ?? 0} shown, most recent 20)</div>
        <div className="flex flex-col gap-2">
          {(signups || []).map((s) => (
            <div key={s.id} className="bg-white border border-line rounded-lg p-3 text-xs flex justify-between">
              <div>
                <div className="font-medium">{s.full_name}</div>
                <div className="text-muted">{s.email} · {s.phone}</div>
              </div>
              <div className="text-right">
                <div className="font-mono">{s.reward_code}</div>
                <div className="text-muted">{s.marketing_opt_in ? "opted in to marketing" : "rewards only"}</div>
                <div className="text-amber font-semibold mt-0.5">{s.visit_count || 1} visit{(s.visit_count || 1) !== 1 ? "s" : ""}</div>
              </div>
            </div>
          ))}
          {(!signups || signups.length === 0) && (
            <div className="text-muted text-sm">No signups yet.</div>
          )}
        </div>
      </div>
    </main>
  );
}
