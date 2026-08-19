"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminMenuEditor({ restaurant, categories, items, isPlatformAdmin }) {
  const router = useRouter();
  const supabase = createClient();
  const [newCatName, setNewCatName] = useState("");
  const [newItem, setNewItem] = useState({ category_id: categories[0]?.id || "", name: "", description: "", price: "", image_url: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [links, setLinks] = useState({
    instagram_url: restaurant.instagram_url || "",
    tiktok_url: restaurant.tiktok_url || "",
    facebook_url: restaurant.facebook_url || "",
    google_review_url: restaurant.google_review_url || "",
    wifi_ssid: restaurant.wifi_ssid || "",
    wifi_password: restaurant.wifi_password || "",
    logo_url: restaurant.logo_url || "",
    cover_image_url: restaurant.cover_image_url || "",
  });
  const [savingLinks, setSavingLinks] = useState(false);

  async function saveLinks() {
    setSavingLinks(true);
    await supabase.from("restaurants").update(links).eq("id", restaurant.id);
    setSavingLinks(false);
    router.refresh();
  }

   const [paystack, setPaystack] = useState({
    business_name: restaurant.name || "",
    settlement_bank: "",
    account_number: "",
    percentage_charge: restaurant.paystack_percentage_charge || 0,
  });
  const [savingPaystack, setSavingPaystack] = useState(false);
  const [paystackError, setPaystackError] = useState("");
  const [paystackSuccess, setPaystackSuccess] = useState(restaurant.paystack_subaccount_code ? true : false);

  async function savePaystack() {
    setSavingPaystack(true);
    setPaystackError("");
    try {
      const res = await fetch("/api/admin/create-subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurant.id, ...paystack }),
      });
      const data = await res.json();
      setSavingPaystack(false);
      if (!res.ok) {
        setPaystackError(data.error || "Something went wrong.");
        return;
      }
      setPaystackSuccess(true);
      router.refresh();
    } catch {
      setSavingPaystack(false);
      setPaystackError("Something went wrong — please try again.");
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    await supabase.from("menu_categories").insert({
      restaurant_id: restaurant.id,
      name: newCatName.trim(),
      sort_order: categories.length,
    });
    setNewCatName("");
    router.refresh();
  }

  async function addItem() {
    if (!newItem.name.trim() || !newItem.category_id || !newItem.price) return;
    await supabase.from("menu_items").insert({
      restaurant_id: restaurant.id,
      category_id: newItem.category_id,
      name: newItem.name.trim(),
      description: newItem.description.trim(),
      price: Number(newItem.price),
      image_url: newItem.image_url.trim() || null,
      sort_order: items.length,
    });
    setNewItem({ category_id: newItem.category_id, name: "", description: "", price: "", image_url: "" });
    router.refresh();
  }

  async function deleteItem(id) {
    await supabase.from("menu_items").delete().eq("id", id);
    router.refresh();
  }

  async function updateSettings(field, value) {
    setSavingSettings(true);
    await supabase.from("restaurants").update({ [field]: value }).eq("id", restaurant.id);
    setSavingSettings(false);
    router.refresh();
  }

  return (
    <div className="mt-6">
{/* Tier / rewards controls — platform admin only */}
      {isPlatformAdmin && (
        <div className="bg-white border border-line rounded-xl p-4 mb-6">
          <div className="font-display font-semibold mb-3 text-sm">Plan settings</div>
          <div className="flex gap-6 text-xs">
            <div>
              <div className="text-muted mb-1">Tier</div>
              <select
                defaultValue={restaurant.tier}
                onChange={(e) => updateSettings("tier", e.target.value)}
                className="border border-line rounded-lg px-2 py-1"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <div className="text-muted mb-1">Rewards</div>
              <select
                defaultValue={restaurant.rewards_status}
                onChange={(e) => updateSettings("rewards_status", e.target.value)}
                className="border border-line rounded-lg px-2 py-1"
              >
                <option value="off">Off</option>
                <option value="trial">Trial</option>
                <option value="active">Active (paid)</option>
                <option value="locked">Locked (trial ended)</option>
              </select>
            </div>
          </div>
          {savingSettings && <div className="text-muted text-xs mt-2">Saving...</div>}
        </div>
      )}

      {/* Socials, Google review, WiFi */}
      <div className="bg-white border border-line rounded-xl p-4 mb-6">
        <div className="font-display font-semibold mb-3 text-sm">Socials, review link & WiFi</div>
        {[
          ["logo_url", "Logo image URL"],
          ["cover_image_url", "Header food photo URL"],
          ["instagram_url", "Instagram URL"],
          ["tiktok_url", "TikTok URL"],
          ["facebook_url", "Facebook URL"],
          ["google_review_url", "Google review link"],
          ["whatsapp_url", "WhatsApp catalog link"],
          ["wifi_ssid", "WiFi network name"],
          ["wifi_password", "WiFi password"],
        ].map(([field, label]) => (
          <input
            key={field}
            placeholder={label}
            value={links[field]}
            onChange={(e) => setLinks({ ...links, [field]: e.target.value })}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
          />
        ))}
        <button onClick={saveLinks} className="w-full bg-amber text-white rounded-lg py-2 text-sm font-bold">
          {savingLinks ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Paystack payment settings */}
      <div className="bg-white border border-line rounded-xl p-4 mb-6">
        <div className="font-display font-semibold mb-3 text-sm">Paystack payment settings</div>
        <div className="text-muted text-xs mb-3">
          Enter this restaurant&apos;s own bank details — Paystack settles their share directly, it never touches your balance.
        </div>
        {paystackSuccess && (
          <div className="text-sage text-xs mb-3">✓ Payments are set up for this restaurant.</div>
        )}
     {isPlatformAdmin && (
          <input
            placeholder="Awea's cut % (0 = restaurant gets 100%)"
            type="number"
            value={paystack.percentage_charge}
            onChange={(e) => setPaystack({ ...paystack, percentage_charge: e.target.value })}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
          />
        )}
        <input
          placeholder="Settlement bank code (e.g. 632005 for FNB)"
          value={paystack.settlement_bank}
          onChange={(e) => setPaystack({ ...paystack, settlement_bank: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
        />
        <input
          placeholder="Bank account number"
          value={paystack.account_number}
          onChange={(e) => setPaystack({ ...paystack, account_number: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
        />
        <input
          placeholder="Awea's cut % (0 = restaurant gets 100%)"
          type="number"
          value={paystack.percentage_charge}
          onChange={(e) => setPaystack({ ...paystack, percentage_charge: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
        />
        {paystackError && <div className="text-rust text-xs mb-2">{paystackError}</div>}
        <button onClick={savePaystack} disabled={savingPaystack} className="w-full bg-amber text-white rounded-lg py-2 text-sm font-bold">
          {savingPaystack ? "Setting up..." : "Save payment details"}
        </button>
      </div>

      {/* Categories */}
      <div className="font-display font-semibold mb-2">Categories</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories.map((c) => (
          <span key={c.id} className="text-xs px-2.5 py-1 rounded-full bg-line/40">{c.name}</span>
        ))}
      </div>
      <div className="flex gap-2 mb-6">
        <input
          placeholder="New category name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
          className="flex-1 border border-line rounded-lg px-3 py-2 text-sm"
        />
        <button onClick={addCategory} className="bg-amber text-white rounded-lg px-3 text-sm font-bold">Add</button>
      </div>

      {/* Items */}
      <div className="font-display font-semibold mb-2">Menu items</div>
      <div className="flex flex-col gap-2 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center bg-white border border-line rounded-lg p-3 text-xs">
            <div>
              <div className="font-medium">{item.name} — R{item.price}</div>
              <div className="text-muted">{categories.find((c) => c.id === item.category_id)?.name}</div>
            </div>
            <button onClick={() => deleteItem(item.id)} className="text-rust">Delete</button>
          </div>
        ))}
      </div>

      <div className="bg-white border border-line rounded-xl p-4">
        <div className="font-display font-semibold mb-2 text-sm">Add menu item</div>
        <select
          value={newItem.category_id}
          onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
        >
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2" />
        <input placeholder="Description" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2" />
        <input placeholder="Price (R)" type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2" />
        <input placeholder="Image URL (optional)" value={newItem.image_url} onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3" />
        <button onClick={addItem} className="w-full bg-amber text-white rounded-lg py-2.5 text-sm font-bold">Add item</button>
      </div>
    </div>
  );
}