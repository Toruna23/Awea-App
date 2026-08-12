          <div className="mx-5 mt-3 bg-line/40 border border-dashed border-line rounded-xl px-3 py-2.5 text-muted text-xs">
            Rewards program paused for now — ask your host
          </div>
        )}

        {/* Categories */}
        <div className="hide-scrollbar flex gap-2 px-4 pt-4 overflow-x-auto">
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

        {!canOrder && (
          <div className="px-4 pt-2.5 text-muted text-xs italic">
            Browse below, then just tell your waiter what you&apos;d like.
          </div>
        )}

        {/* Items */}
        <div className="px-4 pt-3 pb-24 flex flex-col gap-3">
          {itemsInCat.map((item, idx) => (
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
          {itemsInCat.length === 0 && (
            <div className="text-muted text-sm text-center py-8">No items in this category yet.</div>
          )}
        </div>

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
        <ItemModal item={activeItem} onClose={() => setActiveItem(null)} onPrev={() => goToOffset(-1)} onNext={() => goToOffset(1)} canNavigate={itemsInCat.length > 1} />
      )}

      {checkoutOpen && (
        <CheckoutModal
          restaurant={restaurant}
          cart={cart}
          items={items}
          cartTotal={cartTotal}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </main>
  );
}

function ItemModal({ item, onClose, onPrev, onNext, canNavigate }) {
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