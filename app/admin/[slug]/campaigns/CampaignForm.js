"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CampaignForm({ restaurantId }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
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
        body: JSON.stringify({ restaurant_id: restaurantId, subject, body }),
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
        className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
      />
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