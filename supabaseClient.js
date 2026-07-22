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
