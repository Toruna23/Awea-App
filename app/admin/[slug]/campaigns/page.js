import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import CampaignForm from "./CampaignForm";
import CampaignHistory from "./CampaignHistory";

export const revalidate = 0;

export default async function CampaignsPage({ params }) {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();

  if (!restaurant) return notFound();

  const { count: subscriberCount } = await supabase
    .from("rewards_signups")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id)
    .eq("marketing_opt_in", true);

  const { data: history } = await supabase
    .from("campaigns")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("sent_at", { ascending: false })
    .limit(20);

  return (
    <main className="min-h-screen px-5 py-6 max-w-2xl mx-auto">
      <Link href={`/admin/${restaurant.slug}`} className="text-muted text-xs">← Back to {restaurant.name}</Link>
      <div className="font-display text-2xl font-black mt-2 mb-1">Email Specials</div>
      <div className="text-muted text-xs mb-4">
        {subscriberCount || 0} customer{subscriberCount === 1 ? "" : "s"} opted in to marketing emails.
      </div>

      <div className="bg-amber/10 border border-amber rounded-xl p-3 text-xs mb-4">
        Test mode: only your own Resend account email will actually receive anything right now. Everyone else shows as &quot;blocked&quot; until a real domain is verified.
      </div>

      <CampaignForm restaurantId={restaurant.id} />

    <div className="font-display font-semibold mt-8 mb-2">Past & scheduled newsletters</div>
      <CampaignHistory initialHistory={history} /> 
    </main>
  );
}