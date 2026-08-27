"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const STATUS_LABEL = {
  scheduled: (c) => `Scheduled for ${new Date(c.scheduled_for).toLocaleString()}`,
  sending: () => "Sending now...",
  sent: (c) => `${c.success_count} sent, ${c.failure_count} blocked, of ${c.recipient_count} total`,
  failed: () => "Failed to send",
};

export default function CampaignHistory({ initialHistory }) {
  const [history, setHistory] = useState(initialHistory || []);
  const [openId, setOpenId] = useState(null);

  async function handleDelete(id) {
    if (!window.confirm("Delete this newsletter? This can't be undone.")) return;
    const supabase = createClient();
    await supabase.from("campaigns").delete().eq("id", id);
    setHistory((h) => h.filter((c) => c.id !== id));
  }

  if (history.length === 0) {
    return <div className="text-muted text-sm">No campaigns sent yet.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {history.map((c) => (
        <div key={c.id} className="bg-white border border-line rounded-lg p-3 text-xs">
          <div className="flex justify-between items-start gap-2">
            <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="text-left flex-1">
              <div className="font-medium">{c.subject}</div>
              <div className="text-muted mt-1">{(STATUS_LABEL[c.status] || STATUS_LABEL.sent)(c)}</div>
            </button>
            <button onClick={() => handleDelete(c.id)} className="text-rust whitespace-nowrap">Delete</button>
          </div>
          {openId === c.id && (
            <div className="mt-3 border-t border-line pt-3">
              {c.header_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.header_image_url} alt="" className="w-full h-24 object-cover rounded mb-2" />
              )}
              <div dangerouslySetInnerHTML={{ __html: c.body }} />
              {c.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image_url} alt="" className="w-full h-24 object-cover rounded mt-2" />
              )}
              {c.cta_text && (
                <div className="mt-2 inline-block bg-amber text-white rounded px-3 py-1.5 font-bold">{c.cta_text}</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}