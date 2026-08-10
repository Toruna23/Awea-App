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
  const [activeItem, setActiveItem] = useState(null);
  const [wifiModalOpen, setWifiModalOpen] = useState(false);
  const [wifiUnlocked, setWifiUnlocked] = useState(false);
  const [wifiSubmitting, setWifiSubmitting] = useState(false);
  const [wifiError, setWifiError] = useState("");

  const isPro = restaurant.tier === "pro";
  const rewards = restaurant.rewards_status;
  const hasWifi = restaurant.wifi_ssid && restaurant.wifi_password;
  const socials = [
    { key: "instagram", url: restaurant.instagram_url },
    { key: "tiktok", url: restaurant.tiktok_url },
    { key: "facebook", url: restaurant.facebook_url },
    { key: "google", url: restaurant.google_review_url },
  ].filter((s) => s.url);

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

  async function handleWifiUnlock(formData) {
    setWifiSubmitting(true);
    setWifiError("");
    const supabase = createClient();

    const { error: insertError } = await supabase.from("wifi_signups").insert({
      restaurant_id: restaurant.id,
      full_name: formData.name,
      email: formData.email || null,
      phone: formData.phone,
    });

    setWifiSubmitting(false);
    if (insertError) {
      setWifiError("Something went wrong — please try again.");
      return;
    }
    setWifiUnlocked(true);
    setWifiModalOpen(false);
  }

  return (
    <main className="min-h-screen flex justify-center py-6 px-3">
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .rise-item { animation: riseIn 0.4s ease both; }
        .float-icon { display: inline-block; animation: floaty 2.4s ease-in-out infinite; }
      `}</style>

      <div className="w-full max-w-md bg-white rounded-3xl border border-line shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-line">
          <div className="font-display text-3xl font-black text-amber">{restaurant.name}</div>
          {restaurant.slogan && (
            <div className="font-display italic text-sm mt-1">{restaurant.slogan}</div>
          )}
          {restaurant.address && (
            <div className="text-muted text-xs mt-1.5">{restaurant.address}</div>
          )}
        </div>

        {hasWifi && (
          <button
            onClick={() => !wifiUnlocked && setWifiModalOpen(true)}
            className="flex items-center justify-between w-[calc(100%-32px)] mx-4 mt-3.5 bg-amber/10 border border-amber rounded-xl px-3 py-2.5 text-left text-sm"
          >
            <span><span className="float-icon">📶</span> {wifiUnlocked ? "WiFi unlocked" : "Get the WiFi code"}</span>
            {!wifiUnlocked && <span className="text-amber text-xs font-bold">Tap to unlock</span>}
          </button>
        )}
        {wifiUnlocked && (
          <div className="mx-4 mt-2 bg-amber/10 border border-amber rounded-xl px-3 py-2.5 text-sm">
            <div><b>{restaurant.wifi_ssid}</b></div>
            <div className="text-muted text-xs mt-0.5">Password: <span className="font-mono">{restaurant.wifi_password}</span></div>
          </div>
        )}

        {rewards === "trial" && !joined && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 w-[calc(100%-32px)] mx-4 mt-3 bg-sage/10 border border-sage rounded-xl px-3 py-2.5 text-left text-sm"
          >
            <span className="float-icon">🎁</span>
            <span>Join {restaurant.name} Rewards — get 10% off today&apos;s bill</span>
          </button>
        )}
        {rewards === "trial" && joined && (
          <div className="mx-4 mt-3 bg-sage/10 border border-sage rounded-xl px-3 py-2.5 text-sm">
            ✓ You&apos;re in — your code is <b>{code}</b>
          </div>
        )}
        {rewards === "locked" && (
          <div className="mx-4 mt-3 bg-line/40 border border-dashed border-line rounded-xl px-3 py-2.5 text-muted text-xs">
            🔒 Rewards program paused for now — ask your host
          </div>
        )}

        {/* Categories */}
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

        {/* Items */}
        <div className="px-4 pt-3 pb-6 flex flex-col gap-3">
          {items
            .filter((i) => i.category_id === cat)
            .map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setActiveItem(item)}
                style={{ animationDelay: `${idx * 60}ms` }}
                className="rise-item flex gap-3 bg-white border border-line rounded-xl p-3 shadow-sm text-left active:scale-[0.98] transition-transform"
              >
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
              </button>
            ))}
          {items.filter((i) => i.category_id === cat).length === 0 && (
            <div className="text-muted text-sm text-center py-8">No items in this category yet.</div>
          )}
        </div>

        {/* Social bar */}
        {socials.length > 0 && (
          <div className="flex justify-center gap-5 border-t border-line py-4">
            {socials.map((s) => (
              <a key={s.key} href={s.url} target="_blank" rel="noreferrer" className="text-cream">
                <SocialIcon type={s.key} />
              </a>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <JoinModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleJoin}
          submitting={submitting}
          error={error}
          restaurantName={restaurant.name}
        />
      )}

      {wifiModalOpen && (
        <WifiModal
          restaurantName={restaurant.name}
          onClose={() => setWifiModalOpen(false)}
          onSubmit={handleWifiUnlock}
          submitting={wifiSubmitting}
          error={wifiError}
        />
      )}

      {activeItem && <ItemModal item={activeItem} onClose={() => setActiveItem(null)} />}
    </main>
  );
}

function ItemModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "riseIn 0.25s ease both" }}
      >
        <div className="w-full aspect-square bg-line/40">
          {item.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-5">
          <div className="font-display text-xl font-bold">{item.name}</div>
          {item.description && <div className="text-muted text-sm mt-2">{item.description}</div>}
          <div className="text-amber font-bold text-lg mt-3">R{item.price}</div>
          <button onClick={onClose} className="mt-4 text-muted text-xs border border-line rounded-lg px-4 py-2">Close</button>
        </div>
      </div>
    </div>
  );
}

function JoinModal({ onClose, joinRewards, restaurantName, onSubmit, submitting, error }) {
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

function WifiModal({ restaurantName, onClose, onSubmit, submitting, error }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const canSubmit = name && phone && !submitting;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5">
        <div className="flex justify-between items-center">
          <div className="font-display text-lg font-semibold">Get the {restaurantName} WiFi</div>
          <button onClick={onClose} className="text-muted text-xl leading-none">×</button>
        </div>
        <p className="text-muted text-xs mt-1 mb-4">Just your name and number, and we&apos;ll reveal the code.</p>

        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
        <input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
        <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-3" />

        {error && <div className="text-rust text-xs mb-3">{error}</div>}

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ name, email, phone })}
          className={`w-full rounded-lg py-3 text-sm font-bold ${canSubmit ? "bg-amber text-white" : "bg-line text-muted"}`}
        >
          {submitting ? "Unlocking..." : "Reveal WiFi code"}
        </button>
      </div>
    </div>
  );
}

function SocialIcon({ type }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "currentColor" };
  if (type === "instagram") return (
    <svg {...common}><path d="M12 2c2.7 0 3.05.01 4.12.06 1.06.05 1.79.22 2.43.47a4.9 4.9 0 0 1 1.77 1.15 4.9 4.9 0 0 1 1.15 1.77c.25.64.42 1.37.47 2.43C21.99 8.95 22 9.3 22 12s-.01 3.05-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47C15.05 21.99 14.7 22 12 22s-3.05-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.05 2 14.7 2 12s.01-3.05.06-4.12c.05-1.06.22-1.79.47-2.43A4.9 4.9 0 0 1 3.68 3.68 4.9 4.9 0 0 1 5.45 2.53c.64-.25 1.37-.42 2.43-.47C8.95 2.01 9.3 2 12 2Zm0 2c-2.65 0-2.97.01-4.02.06-.86.04-1.33.18-1.64.3-.41.16-.71.35-1.02.66-.31.31-.5.61-.66 1.02-.12.31-.26.78-.3 1.64C4.31 9.03 4.3 9.35 4.3 12s.01 2.97.06 4.02c.04.86.18 1.33.3 1.64.16.41.35.71.66 1.02.31.31.61.5 1.02.66.31.12.78.26 1.64.3 1.05.05 1.37.06 4.02.06s2.97-.01 4.02-.06c.86-.04 1.33-.18 1.64-.3.41-.16.71-.35 1.02-.66.31-.31.5-.61.66-1.02.12-.31.26-.78.3-1.64.05-1.05.06-1.37.06-4.02s-.01-2.97-.06-4.02c-.04-.86-.18-1.33-.3-1.64a2.9 2.9 0 0 0-.66-1.02 2.9 2.9 0 0 0-1.02-.66c-.31-.12-.78-.26-1.64-.3C14.97 4.31 14.65 4.3 12 4.3Zm0 3.4a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6Zm0 2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Zm4.5-3.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg>
  );
  if (type === "facebook") return (
    <svg {...common}><path d="M13.5 21v-7.5H16l.4-3H13.5V8.4c0-.87.24-1.46 1.5-1.46H16.5V4.3C16.24 4.27 15.36 4.2 14.32 4.2c-2.16 0-3.64 1.32-3.64 3.74v2.56H8.2v3h2.48V21h2.82Z"/></svg>
  );
  if (type === "tiktok") return (
    <svg {...common}><path d="M14.5 2h2.6c.14 1.28.7 2.4 1.7 3.2 1 .8 2.2 1.2 3.5 1.2v2.7c-1.4 0-2.7-.4-3.9-1.1v6.6c0 3.5-2.85 6.4-6.4 6.4A6.4 6.4 0 0 1 5.6 14.6c0-3.4 2.6-6.2 6-6.4v2.75a3.65 3.65 0 1 0 3.4 3.65V2Z"/></svg>
  );
  return (
    <svg {...common}><path d="M21.35 11.1H12v2.9h5.35c-.5 2.6-2.75 4.2-5.35 4.2A5.7 5.7 0 0 1 6.3 12.5 5.7 5.7 0 0 1 12 6.8c1.5 0 2.85.55 3.9 1.5l2.2-2.2C16.65 4.6 14.5 3.7 12 3.7 6.9 3.7 2.8 7.8 2.8 12.5S6.9 21.3 12 21.3c5.1 0 8.65-3.6 8.65-8.65 0-.58-.06-1.02-.15-1.55Z"/></svg>
  );
}