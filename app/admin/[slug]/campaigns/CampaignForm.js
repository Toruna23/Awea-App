"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const QUILL_MODULES = {
  toolbar: [["bold", "italic"], [{ align: [] }], ["link"], ["clean"]],
};

export default function CampaignForm({ restaurantId }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const headerFileRef = useRef(null);
  const imageFileRef = useRef(null);

  async function uploadFile(file, setUrl, setUploading) {
    setUploading(true);
    const supabase = createClient();
    const path = `campaigns/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("menu-images").upload(path, file);
    if (uploadError) {
      setError("Image upload failed — please try again.");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSend() {
    const plainBody = body.replace(/<[^>]+>/g, "").trim();
    if (!subject.trim() || !plainBody) return;
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
    <div className="bg-white border border-line rounded-xl p-4 overflow-hidden">
      <div className="font-display font-semibold mb-3 text-sm">Send a special</div>

      <div className="mb-3">
        <input ref={headerFileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0], setHeaderImageUrl, setUploadingHeader)} />
        {headerImageUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={headerImageUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
            <button onClick={() => setHeaderImageUrl("")} className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full px-2 py-1">Remove</button>
          </div>
        ) : (
          <button onClick={() => headerFileRef.current?.click()} disabled={uploadingHeader}
            className="w-full border border-dashed border-line rounded-lg py-3 text-xs text-muted flex items-center justify-center gap-2">
            📎 {uploadingHeader ? "Uploading..." : "Add header image from your device"}
          </button>
        )}
      </div>

      <input
        placeholder="Subject (e.g. Braai Friday — R30 off after 6pm)"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
      />

      <div className="mb-3">
        <ReactQuill
          theme="snow"
          value={body}
          onChange={setBody}
          modules={QUILL_MODULES}
          placeholder="Write your message... select text to bold, italic, align, or link it"
        />
      </div>

      <div className="mb-3">
        <input ref={imageFileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0], setImageUrl, setUploadingImage)} />
        {imageUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
            <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full px-2 py-1">Remove</button>
          </div>
        ) : (
          <button onClick={() => imageFileRef.current?.click()} disabled={uploadingImage}
            className="w-full border border-dashed border-line rounded-lg py-3 text-xs text-muted flex items-center justify-center gap-2">
            📎 {uploadingImage ? "Uploading..." : "Add another image from your device"}
          </button>
        )}
      </div>

      <div className="text-muted text-xs mb-1">Button link (optional)</div>
      <input
        placeholder="Button text, e.g. View Menu"
        value={ctaText}
        onChange={(e) => setCtaText(e.target.value)}
        className="w-full min-w-0 border border-line rounded-lg px-3 py-2 text-sm mb-2 box-border"
      />
      <input
        placeholder="https://..."
        value={ctaUrl}
        onChange={(e) => setCtaUrl(e.target.value)}
        className="w-full min-w-0 border border-line rounded-lg px-3 py-2 text-sm mb-3 box-border"
      />

      {error && <div className="text-rust text-xs mb-2">{error}</div>}
      {result && (
        <div className="text-sage text-xs mb-2">
          Sent to {result.success_count} of {result.recipient_count} — {result.failure_count} blocked (test mode).
        </div>
      )}
      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full bg-amber text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send"}
      </button>
    </div>
  );
}