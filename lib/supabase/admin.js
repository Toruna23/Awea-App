import { createClient } from "@supabase/supabase-js";

// Uses the SERVICE ROLE key — this bypasses Row Level Security entirely.
// Only ever import this inside app/api/** route handlers, never in a
// "use client" component or anything that ships to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
