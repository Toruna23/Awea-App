import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = createClient();

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*, menu_items(count), rewards_signups(count)")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen px-5 py-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="font-display text-2xl font-black text-amber">Awea Admin</div>
        <LogoutButton />
      </div>

      <div className="flex flex-col gap-3">
        {(restaurants || []).map((r) => (
          <Link
            key={r.id}
            href={`/admin/${r.slug}`}
            className="block bg-white border border-line rounded-xl p-4 shadow-sm hover:border-amber"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-display font-semibold">{r.name}</div>
                <div className="text-muted text-xs mt-0.5">/r/{r.slug}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-line/50 capitalize">{r.tier}</span>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted">
              <span>{r.menu_items?.[0]?.count ?? 0} menu items</span>
              <span>{r.rewards_signups?.[0]?.count ?? 0} rewards signups</span>
              <span className="capitalize">rewards: {r.rewards_status}</span>
            </div>
          </Link>
        ))}
        {(!restaurants || restaurants.length === 0) && (
          <div className="text-muted text-sm">No restaurants yet. Add one directly in Supabase to get started, or extend this dashboard with an "add restaurant" form.</div>
        )}
      </div>
    </main>
  );
}