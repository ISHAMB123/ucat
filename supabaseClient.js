import { createClient } from "@supabase/supabase-js";
import { useSupabaseSharedBackend } from "./storage.js";

/* ------------------------------ SUPABASE ------------------------- */
/* Reads the project URL and anon key from the environment (Vite      */
/* exposes VITE_-prefixed vars to the browser; these two are meant to */
/* be public and are protected by Row Level Security, not secrecy).   */
/* When they are absent, supabase is null and the app runs in its     */
/* local-only mode: progress on localStorage, leaderboards per device.*/

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const supabaseEnabled = supabase !== null;

/* When configured, register Supabase as the shared backend so the
   weekly leaderboard becomes genuinely global. This side effect runs
   once, at import, before any component reads sharedIsGlobal(). */
if (supabase) useSupabaseSharedBackend(supabase);

/* Server-verified access check. Reads the signed-in user's row from the
   entitlements table (see supabase/schema.sql), which only the Stripe
   webhook can write. Returns { active, product } or null when there is no
   backend, no session, or no paid row. This is what unlock should key off
   once the backend is live, replacing the client-trust access code and the
   ?checkout=success flag. Never throws. */
export async function getEntitlement() {
  if (!supabase) return null;
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess || !sess.session) return null;
    const { data, error } = await supabase
      .from("entitlements")
      .select("active, product")
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch (e) {
    return null;
  }
}
