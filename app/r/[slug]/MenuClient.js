"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function genCode(prefix) {
  return `${prefix.toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export default function MenuClient({ restaurant, categories, items }) {
  const [cat, setCat] = useState(categories[0]?.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isPro = restaurant.tier === "pro";
  const rewards = restaurant.rewards_status;

  async function handleJoin(formData) {
    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const rewardCode = genCode(restaurant.slug);

    const { error: insertError } = await supabase.from("rewards_signups").insert({
      restaurant_id: restaurant.id,
      full_name: formData.name,
      email: formData.email,
      phone: formData.phone,
      reward_code: rewardCode,
      marketing_opt_in: formData.marketing,
    });

    setSubmitting(false);
    if (insertError) {
      setError("Something went wrong — please try again.");
      return;
    }
    setCode(rewardCode);
    setJoined(true);
    setModalOpen(false);
  }

  return (
    <main className="min-h-screen flex justify-center py-6 px-3">
      <div className="w-full max-w-md bg-white rounded-3xl border border-line shadow-xl overflow-hidden">
        <div className="px-5 pt-6 pb-4 border-b border-line">
          <div className="font-display text-3xl font-black text-amber">{restaurant.name}</div>
          {restaurant.slogan && (
            <div className="font-display italic text-sm mt-1">{restaurant.slogan}</div>
          )}
          {restaurant.address && (
            <div className="text-muted text-xs mt-1.5">{restaurant.address}</div>
          )}
        </div>

        {rewards === "trial" && !joined && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 w-[calc(100%-32px)] mx-4 mt-3.5 bg-sage/10 border border-sage rounded-xl px-3 py-2.5 text-left text-sm"
          >
            🎁 Join {restaurant.name} Rewards — get 10% off today&apos;s bill
          </button>
        )}
        {joined && (
          <div className="mx-4 mt-3.5 bg-sage/10 border border-sage rounded-xl px-3 py-2.5 text-sm">
            ✓ You&apos;re in — your code is <b>{code}</b>
          </div>
        )}
        {rewards === "locked" && (
          <div className="mx-4 mt-3.5 bg-line/40 border border-dashed border-line rounded-xl px-3 py-2.5 text-muted text-xs">
            🔒 Rewards program paused for now — ask your host
          </div>
        )}

        <div className="flex gap-2 px-4 pt-4 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full border text-xs font-medium ${
                cat === c.id ? "bg-amber border-amber text-white" : "border-line text-muted"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {!isPro && (
          <div className="px-4 pt-2.5 text-muted text-xs italic">
            Browse below, then just tell your waiter what you&apos;d like.
          </div>
        )}

        <div className="px-4 pt-3 pb-8 flex flex-col gap-3">
          {items
            .filter((i) => i.category_id === cat)
            .map((item) => (
              <div key={item.id} className="flex gap-3 bg-white border border-line rounded-xl p-3 shadow-sm">
                <div className="w-14 h-14 rounded-lg bg-line/40 overflow-hidden flex-shrink-0">
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <div className="font-display font-semibold text-sm">{item.name}</div>
                    <div className="text-amber font-bold text-sm whitespace-nowrap">R{item.price}</div>
                  </div>
                  {item.description && (
                    <div className="text-muted text-xs mt-0.5">{item.description}</div>
                  )}
                </div>
              </div>
            ))}
          {items.filter((i) => i.category_id === cat).length === 0 && (
            <div className="text-muted text-sm text-center py-8">No items in this category yet.</div>
          )}
        </div>
      </div>

      {modalOpen && (
        <JoinModal
          restaurantName={restaurant.name}
          onClose={() => setModalOpen(false)}
          onSubmit={handleJoin}
          submitting={submitting}
          error={error}
        />
      )}
    </main>
  );
}

function JoinModal({ restaurantName, onClose, onSubmit, submitting, error }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rewardsConsent, setRewardsConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const canSubmit = rewardsConsent && name && email && phone && !submitting;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5">
        <div className="flex justify-between items-center">
          <div className="font-display text-lg font-semibold">Join {restaurantName} Rewards</div>
          <button onClick={onClose} className="text-muted text-xl leading-none">×</button>
        </div>
        <p className="text-muted text-xs mt-1 mb-4">
          Get 10% off today&apos;s bill and rewards on future visits.
        </p>

        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
        <input placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
        <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-3" />

        <label className="flex gap-2 items-start text-xs text-muted mt-2 cursor-pointer">
          <input type="checkbox" checked={rewardsConsent} onChange={(e) => setRewardsConsent(e.target.checked)} className="mt-0.5" />
          <span>I agree to join the {restaurantName} Rewards programme and accept the terms.</span>
        </label>
        <label className="flex gap-2 items-start text-xs text-muted mt-2.5 cursor-pointer">
          <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} className="mt-0.5" />
          <span>Send me offers and specials from {restaurantName} via email, SMS, or WhatsApp.</span>
        </label>

        {error && <div className="text-rust text-xs mt-3">{error}</div>}

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ name, email, phone, marketing: marketingConsent })}
          className={`w-full mt-4 rounded-lg py-3 text-sm font-bold ${
            canSubmit ? "bg-amber text-white" : "bg-line text-muted"
          }`}
        >
          {submitting ? "Joining..." : "Join & get my discount"}
        </button>
      </div>
    </div>
  );
}