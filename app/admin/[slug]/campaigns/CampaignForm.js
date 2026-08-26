"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CampaignForm({ restaurantId }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          subject,
          body,
          header_image_url: headerImageUrl,
          image_url: imageUrl,
          cta_text: ctaText,
          cta_url: ctaUrl,
        }),
      });
      const data = await res.json();
      setSending(false);
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setResult(data);
      setSubject("");
      setBody("");
      setHeaderImageUrl("");
      setImageUrl("");
      setCtaText("");
      setCtaUrl("");
      router.refresh();
    } catch {
      setSending(false);
      setError("Something went wrong — please try again.");
    }
  }

  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="font-display font-semibold mb-3 text-sm">Send a special</div>

      <input
        placeholder="Header image URL (optional — shows at the very top)"
        value={headerImageUrl}
        onChange={(e) => setHeaderImageUrl(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
      />
      <input
        placeholder="Subject (e.g. Braai Friday — R30 off after 6pm)"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
      />
      <textarea
        placeholder="Write your message..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
      />
      <input
        placeholder="Extra image URL (optional — shows below the message)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
      />

      <div className="text-muted text-xs mt-2 mb-1">Button link (optional)</div>
      <div className="flex gap-2 mb-3">
        <input
          placeholder="Button text, e.g. View Menu"
          value={ctaText}
          onChange={(e) => setCtaText(e.target.value)}
          className="flex-1 border border-line rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="https://..."
          value={ctaUrl}
          onChange={(e) => setCtaUrl(e.target.value)}
          className="flex-1 border border-line rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {error && <div className="text-rust text-xs mb-2">{error}</div>}
      {result && (
        <div className="text-sage text-xs mb-2">
          Sent to {result.success_count} of {result.recipient_count} — {result.failure_count} blocked (test mode).
        </div>
      )}
      <button
        onClick={handleSend}
        disabled={sending || !subject.trim() || !body.trim()}
        className="w-full bg-amber text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send"}
      </button>
    </div>
  );
}