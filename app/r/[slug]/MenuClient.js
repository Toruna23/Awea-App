"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function genCode(prefix) {
  return `${prefix.toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

const TIP_OPTIONS = [0, 10, 15, 20];

export default function MenuClient({ restaurant, categories, items }) {
  const [cat, setCat] = useState(categories[0]?.id);
  const [search, setSearch] = useState("");
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
  const [cart, setCart] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [returningMember, setReturningMember] = useState(null);
  const [loggingVisit, setLoggingVisit] = useState(false);

  const trialActive = restaurant.trial_ends_at && new Date(restaurant.trial_ends_at) > new Date();
  const canOrder = restaurant.tier === "pro" || trialActive;
  const rewards = restaurant.rewards_status;
  const hasWifi = restaurant.wifi_ssid && restaurant.wifi_password;
  const socials = [
    { key: "instagram", url: restaurant.instagram_url },
    { key: "tiktok", url: restaurant.tiktok_url },
    { key: "facebook", url: restaurant.facebook_url },
    { key: "whatsapp", url: restaurant.whatsapp_url },
    { key: "google", url: restaurant.google_review_url },
  ].filter((s) => s.url);

  const itemsInCat = items.filter((i) => i.category_id === cat);
  const searchResults = search.trim()
    ? items.filter((i) => {
        const q = search.trim().toLowerCase();
        const catName = categories.find((c) => c.id === i.category_id)?.name || "";
        return i.name.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
      })
    : null;
  const displayedItems = searchResults || itemsInCat;
  const activeIndex = activeItem ? displayedItems.findIndex((i) => i.id === activeItem.id) : -1;
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce(
    (sum, [id, qty]) => sum + qty * items.find((i) => i.id === id).price, 0
  );

  function adjustCart(id, delta) {
    setCart((c) => {
      const next = Math.max(0, (c[id] || 0) + delta);
      const copy = { ...c };
      if (next === 0) delete copy[id]; else copy[id] = next;
      return copy;
    });
  }

  function goToOffset(offset) {
    if (activeIndex === -1 || displayedItems.length < 2) return;
    const next = (activeIndex + offset + displayedItems.length) % displayedItems.length;
    setActiveItem(displayedItems[next]);
  }

  useEffect(() => {
    const storedCode = window.localStorage.getItem(`awea_reward_${restaurant.slug}`);
    if (!storedCode) return;
    fetch("/api/apply-reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurant_id: restaurant.id, code: storedCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setReturningMember({ code: storedCode, visitCount: data.visit_count });
        } else {
          window.localStorage.removeItem(`awea_reward_${restaurant.slug}`);
        }
      })
      .catch(() => {});
  }, [restaurant.id, restaurant.slug]);

  async function handleLogVisit() {
    if (!returningMember) return;
    setLoggingVisit(true);
    try {
      const res = await fetch("/api/log-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurant.id, code: returningMember.code }),
      });
      const data = await res.json();
      if (res.ok) {
        setReturningMember({ ...returningMember, visitCount: data.visit_count });
      }
    } catch {}
    setLoggingVisit(false);
  }

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
      setError("Something went wrong, please try again.");
      return;
    }
    setCode(rewardCode);
    setJoined(true);
    setModalOpen(false);
    window.localStorage.setItem(`awea_reward_${restaurant.slug}`, rewardCode);
    setReturningMember({ code: rewardCode, visitCount: 1 });
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
      setWifiError("Something went wrong, please try again.");
      return;
    }
    setWifiUnlocked(true);
    setWifiModalOpen(false);
  }

  return (
    <main className="min-h-screen flex justify-center py-6 px-3">
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .rise-item { animation: riseIn 0.4s ease both; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="w-full max-w-md bg-white rounded-3xl border border-line shadow-xl overflow-hidden relative">
        {/* Hero header: food photo with logo/name centered on top */}
        <div className="relative w-full h-52 bg-line">
          {restaurant.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.35))" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            {restaurant.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow mb-2" />
            )}
            <div className="font-display text-3xl font-black text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
              {restaurant.name}
            </div>
            {restaurant.slogan && (
              <div className="font-display italic text-sm text-white/90 mt-1">{restaurant.slogan}</div>
            )}
          </div>
        </div>

        {/* Address (left) + WiFi button (right) */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-muted text-xs">{restaurant.address}</div>
          {hasWifi && (
            <button
              onClick={() => !wifiUnlocked && setWifiModalOpen(true)}
              className="text-amber text-xs font-bold border border-amber rounded-full px-3 py-1.5 whitespace-nowrap"
            >
              {wifiUnlocked ? "WiFi unlocked" : "WiFi"}
            </button>
          )}
        </div>
        {wifiUnlocked && (
          <div className="mx-5 mt-2 bg-amber/10 border border-amber rounded-xl px-3 py-2.5 text-sm">
            <div><b>{restaurant.wifi_ssid}</b></div>
            <div className="text-muted text-xs mt-0.5">Password: <span className="font-mono">{restaurant.wifi_password}</span></div>
          </div>
        )}

        {rewards === "trial" && !joined && !returningMember && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 w-[calc(100%-40px)] mx-5 mt-3 bg-sage/10 border border-sage rounded-xl px-3 py-2.5 text-left text-sm"
          >
            <span>Join {restaurant.name} Rewards for 10% off today&apos;s bill</span>
          </button>
        )}
        {rewards === "trial" && joined && (
          <div className="mx-5 mt-3 bg-sage/10 border border-sage rounded-xl px-3 py-2.5 text-sm">
            You&apos;re in — your code is <b>{code}</b>
          </div>
        )}
        {rewards === "trial" && !joined && returningMember && (
          <div className="mx-5 mt-3 bg-sage/10 border border-sage rounded-xl px-3 py-2.5 text-sm flex items-center justify-between gap-2">
            <span>Welcome back — visit #{returningMember.visitCount}</span>
            <button
              onClick={handleLogVisit}
              disabled={loggingVisit}
              className="text-sage text-xs font-bold border border-sage rounded-full px-3 py-1 whitespace-nowrap"
            >
              {loggingVisit ? "..." : "Log this visit"}
            </button>
          </div>
        )}{rewards === "locked" && (
          <div className="mx-5 mt-3 bg-line/40 border border-dashed border-line rounded-xl px-3 py-2.5 text-muted text-xs">
            Rewards program paused for now — ask your host
          </div>
        {/* Search */}
        <div className="px-4 pt-4">
          <input
            placeholder="Search products or categories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Categories */}
        {!searchResults && (
          <div className="hide-scrollbar flex gap-2 px-4 pt-3 overflow-x-auto">
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
        )}
        {searchResults && (
          <div className="px-4 pt-3 text-muted text-xs">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &quot;{search}&quot;
          </div>
        )}

       {!canOrder && (
          <div className="px-4 pt-2.5 text-muted text-xs italic">
            {restaurant.browse_note || "Browse below, then just tell your waiter what you'd like."}
          </div>
        )}

        {/* Items */}
        <div className="px-4 pt-3 pb-24 flex flex-col gap-3">
          {displayedItems.map((item, idx) => (
            <div
              key={item.id}
              style={{ animationDelay: `${idx * 60}ms` }}
              className="rise-item flex gap-3 bg-white border border-line rounded-xl p-3 shadow-sm"
            >
              <button onClick={() => setActiveItem(item)} className="flex gap-3 flex-1 text-left">
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
              {canOrder && (
                <div className="flex items-center gap-2 self-end">
                  <button onClick={() => adjustCart(item.id, -1)} className="w-6 h-6 rounded-md border border-line text-xs">−</button>
                  <span className="text-xs w-4 text-center">{cart[item.id] || 0}</span>
                  <button onClick={() => adjustCart(item.id, 1)} className="w-6 h-6 rounded-md border border-line text-xs">+</button>
                </div>
              )}
            </div>
          ))}
          {displayedItems.length === 0 && (
            <div className="text-muted text-sm text-center py-8">
              {searchResults ? "No matches found." : "No items in this category yet."}
            </div>
          )}

        {canOrder && cartCount > 0 && (
          <button
            onClick={() => setCheckoutOpen(true)}
            className="absolute bottom-4 left-4 right-4 bg-amber text-white rounded-xl py-3.5 text-sm font-bold shadow-lg"
          >
            View order · R{cartTotal.toFixed(2)} ({cartCount})
          </button>
        )}

        {/* Social + Google review bar */}
        {socials.length > 0 && (
          <div className="flex justify-center gap-5 border-t border-line py-4">
            {socials.map((s) => (
              <a key={s.key} href={s.url} target="_blank" rel="noreferrer" className="text-amber">
                <SocialIcon type={s.key} />
              </a>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <JoinModal onClose={() => setModalOpen(false)} onSubmit={handleJoin} submitting={submitting} error={error} restaurantName={restaurant.name} />
      )}

      {wifiModalOpen && (
        <WifiModal restaurantName={restaurant.name} onClose={() => setWifiModalOpen(false)} onSubmit={handleWifiUnlock} submitting={wifiSubmitting} error={wifiError} />
      )}

      {activeItem && (
        <ItemModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onPrev={() => goToOffset(-1)}
          onNext={() => goToOffset(1)}
          canNavigate={displayedItems.length > 1}
          canOrder={canOrder}
          qty={cart[activeItem.id] || 0}
          onAdjust={(delta) => adjustCart(activeItem.id, delta)}
        />
      )}

      {checkoutOpen && (
        <CheckoutModal
          restaurant={restaurant}
          cart={cart}
          items={items}
          cartTotal={cartTotal}
          onClose={() => setCheckoutOpen(false)}
          initialRewardCode={returningMember?.code || (joined ? code : null)}
        />
      )}
    </main>
  );
}

function ItemModal({ item, onClose, onPrev, onNext, canNavigate, canOrder, qty, onAdjust }) {
  const touchStartX = useRef(null);
  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (!canNavigate || Math.abs(deltaX) < 40) return;
    if (deltaX < 0) onNext(); else onPrev();
  }
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden text-center" onClick={(e) => e.stopPropagation()} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ animation: "riseIn 0.25s ease both" }}>
        <div className="w-full aspect-square bg-line/40">
          {item.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" draggable={false} />
          )}
        </div>
        <div className="p-5">
          <div className="font-display text-xl font-bold">{item.name}</div>
          {item.description && <div className="text-muted text-sm mt-2">{item.description}</div>}
          <div className="text-amber font-bold text-lg mt-3">R{item.price}</div>
          {canOrder && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button onClick={() => onAdjust(-1)} className="w-9 h-9 rounded-lg border border-line text-lg">−</button>
              <span className="text-base font-semibold w-6 text-center">{qty}</span>
              <button onClick={() => onAdjust(1)} className="w-9 h-9 rounded-lg border border-line text-lg">+</button>
            </div>
          )}
          {canNavigate && <div className="text-muted text-xs mt-3">Swipe left or right for more</div>}
          <button onClick={onClose} className="mt-4 text-muted text-xs border border-line rounded-lg px-4 py-2">Close</button>
        </div>
      </div>
    </div>
  );
}

function JoinModal({ onClose, restaurantName, onSubmit, submitting, error }) {
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
        <p className="text-muted text-xs mt-1 mb-4">Get 10% off today&apos;s bill and rewards on future visits.</p>
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
        <input placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
        <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-3" />
        <label className="flex gap-2 items-start text-xs text-muted mt-2 cursor-pointer">
          <input type="checkbox" checked={rewardsConsent} onChange={(e) => setRewardsConsent(e.target.checked)} className="mt-0.5" />
          <span>I agree to join the {restaurantName} Rewards programme and accept the terms.</span>
        </label>
        <label className="flex gap-2 items-start text-xs text-muted mt-2.5 cursor-pointer">
          <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} className="mt-0.5" />
          <span>Send me offers and specials from {restaurantName} via email, SMS, or WhatsApp.</span>
        </label>
        {error && <div className="text-rust text-xs mt-3">{error}</div>}
        <button disabled={!canSubmit} onClick={() => onSubmit({ name, email, phone, marketing: marketingConsent })} className={`w-full mt-4 rounded-lg py-3 text-sm font-bold ${canSubmit ? "bg-amber text-white" : "bg-line text-muted"}`}>
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
  const canSubmit = name && phone && !submitting;return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5">
        <div className="flex justify-between items-center">
          <div className="font-display text-lg font-semibold">Get the {restaurantName} WiFi</div>
          <button onClick={onClose} className="text-muted text-xl leading-none">×</button>
        </div>
        <p className="text-muted text-xs mt-1 mb-4">Just your name and number, and we&apos;ll reveal the code.</p>
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
        <input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
        <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-3" />
        {error && <div className="text-rust text-xs mb-3">{error}</div>}
        <button disabled={!canSubmit} onClick={() => onSubmit({ name, email, phone })} className={`w-full rounded-lg py-3 text-sm font-bold ${canSubmit ? "bg-amber text-white" : "bg-line text-muted"}`}>
          {submitting ? "Unlocking..." : "Reveal WiFi code"}
        </button>
      </div>
    </div>
  );
}

function CheckoutModal({ restaurant, cart, items, cartTotal, onClose, initialRewardCode }) {
  const [tipPct, setTipPct] = useState(10);
  const [customTip, setCustomTip] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef(null);
const [rewardCode, setRewardCode] = useState(initialRewardCode || "");
  const [tableNumber, setTableNumber] = useState("");
  const [rewardStatus, setRewardStatus] = useState(null);
  const [discountPct, setDiscountPct] = useState(0);

  useEffect(() => {
    if (initialRewardCode) handleApplyReward(initialRewardCode);
  }, []);

  const tipAmount = customTip !== "" ? Number(customTip) : Math.round(cartTotal * (tipPct / 100) * 100) / 100;
  const discountAmount = rewardStatus === "valid" ? Math.round(cartTotal * (discountPct / 100) * 100) / 100 : 0;
  const total = Math.round((cartTotal - discountAmount + tipAmount) * 100) / 100;

  async function handleApplyReward(codeOverride) {
    const codeToCheck = codeOverride || rewardCode;
    if (!codeToCheck.trim()) return;
    setRewardStatus("checking");
    try {
      const res = await fetch("/api/apply-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurant.id, code: codeToCheck }),
      });
      const data = await res.json();
      if (data.valid) {
        setRewardStatus("valid");
        setDiscountPct(data.discount_pct);
      } else {
        setRewardStatus("invalid");
      }
    } catch {
      setRewardStatus("invalid");
    }
  }

  async function handlePay() {
    setLoading(true);
    setError("");
    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const item = items.find((i) => i.id === id);
      return { id, name: item.name, price: item.price, qty };
    });

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          items: orderItems,
          tip: tipAmount,
          customer_name: name,
          customer_phone: phone,
          table_number: tableNumber,
          origin: window.location.origin,
          reward_code: rewardStatus === "valid" ? rewardCode.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Something went wrong.");
        return;
      }
      window.location.href = data.authorization_url;
    } catch {
      setLoading(false);
      setError("Something went wrong — please try again.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <div className="font-display text-lg font-semibold">Your order</div>
          <button onClick={onClose} className="text-muted text-xl leading-none">×</button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {Object.entries(cart).map(([id, qty]) => {
            const item = items.find((i) => i.id === id);
            return (
              <div key={id} className="flex justify-between text-sm">
                <span>{qty} × {item.name}</span>
                <span>R{(item.price * qty).toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-line mt-3 pt-3 text-sm flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span>R{cartTotal.toFixed(2)}</span>
        </div>

        <div className="mt-4">
          <div className="text-muted text-xs mb-2">Have a rewards code?</div>
          <div className="flex gap-2">
            <input
              placeholder="Reward code"
              value={rewardCode}
              onChange={(e) => { setRewardCode(e.target.value); setRewardStatus(null); }}
              className="flex-1 border border-line rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleApplyReward}
              disabled={rewardStatus === "checking"}
              className="bg-sage text-white rounded-lg px-4 text-sm font-bold"
            >
              {rewardStatus === "checking" ? "..." : "Apply"}
            </button>
          </div>
          {rewardStatus === "valid" && (
            <div className="text-sage text-xs mt-1.5">Code applied — {discountPct}% off</div>
          )}
          {rewardStatus === "invalid" && (
            <div className="text-rust text-xs mt-1.5">That code isn&apos;t valid for this restaurant</div>
          )}
        </div>

        {discountAmount > 0 && (
          <div className="text-sm flex justify-between mt-3">
            <span className="text-muted">Discount</span>
            <span className="text-sage">−R{discountAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="mt-4">
          <div className="text-muted text-xs mb-2">Add a tip for your waiter</div>
          <div className="flex gap-2">
            {TIP_OPTIONS.map((pct) => (
              <button
                key={pct}
                onClick={() => { setTipPct(pct); setCustomTip(""); }}
                className={`flex-1 rounded-lg border py-2 text-xs font-bold ${
                  customTip === "" && tipPct === pct ? "bg-amber border-amber text-white" : "border-line text-muted"
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
          <input
            placeholder="Custom amount (R)"
            type="number"
            value={customTip}
            onChange={(e) => setCustomTip(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm mt-2"
          /></div>

        <div className="border-t border-line mt-4 pt-3 text-base flex justify-between font-bold">
          <span>Total</span>
          <span className="text-amber">R{total.toFixed(2)}</span>
        </div>

        <div className="mt-4">
          <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
          <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2" />
          <input placeholder="Table number" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-3" />
        </div>

        {error && <div className="text-rust text-xs mb-3">{error}</div>}

        <button
          disabled={!name || !phone || loading}
          onClick={handlePay}
          className={`w-full rounded-lg py-3.5 text-sm font-bold ${name && phone && !loading ? "bg-amber text-white" : "bg-line text-muted"}`}
        >
          {loading ? "Preparing payment..." : `Pay R${total.toFixed(2)}`}
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
  if (type === "whatsapp") return (
    <svg {...common}><path d="M17.5 14.4c-.3-.15-1.75-.87-2-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.63-.93-2.24-.24-.58-.5-.5-.68-.5h-.58c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.08 4.5.7.3 1.26.48 1.7.62.7.22 1.35.19 1.85.12.56-.08 1.75-.72 2-1.4.24-.7.24-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.53 3.66 1.44 5.17L2 22l4.97-1.4A9.94 9.94 0 0 0 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2Zm0 18.2c-1.7 0-3.28-.5-4.62-1.36l-.33-.2-3.06.86.82-3-.22-.34A8.17 8.17 0 0 1 3.8 12c0-4.53 3.68-8.2 8.2-8.2s8.2 3.67 8.2 8.2-3.67 8.2-8.2 8.2Z"/></svg>
  );
  return (
    <svg {...common}><path d="M21.35 11.1H12v2.9h5.35c-.5 2.6-2.75 4.2-5.35 4.2A5.7 5.7 0 0 1 6.3 12.5 5.7 5.7 0 0 1 12 6.8c1.5 0 2.85.55 3.9 1.5l2.2-2.2C16.65 4.6 14.5 3.7 12 3.7 6.9 3.7 2.8 7.8 2.8 12.5S6.9 21.3 12 21.3c5.1 0 8.65-3.6 8.65-8.65 0-.58-.06-1.02-.15-1.55Z"/></svg>
  );
}