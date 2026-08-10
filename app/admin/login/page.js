"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleLogin} className="w-full max-w-xs bg-white border border-line rounded-2xl p-6 shadow-sm">
        <div className="font-display text-2xl font-black text-amber mb-1">Awea</div>
        <div className="text-muted text-sm mb-5">Admin sign in</div>
        <input
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-2"
        />
        <input
          type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 text-sm mb-3"
        />
        {error && <div className="text-rust text-xs mb-3">{error}</div>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-amber text-white rounded-lg py-2.5 text-sm font-bold"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}