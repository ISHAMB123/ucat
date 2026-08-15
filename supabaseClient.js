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
      .select("active, product, expires_at, credits")
      .maybeSingle();
    if (error || !data) return null;
    /* A time-limited trial stays active only until it expires. Full-access
       rows have no expiry. Never grant an expired row. */
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return { ...data, active: false };
    }
    return data;
  } catch (e) {
    return null;
  }
}

/* Ask the server for a one-day free trial. The serverless function verifies
   the signed-in user, checks that neither the email nor the network has had a
   trial, and (if clear) writes a time-limited entitlement. Returns
   { ok, expires_at } or { ok:false, reason }. The trial unlocks the app but
   grants no credits, so the paid AI features still need a purchase. */
/* A coarse, stable device signal (not personally identifying on its own):
   a hash of browser and screen characteristics. Sent with the trial request
   so one machine cannot farm trials by clearing storage or using new emails.
   Best-effort; returns "" if anything is unavailable. */
async function deviceFingerprint() {
  try {
    const s = window.screen || {};
    const parts = [
      navigator.userAgent, navigator.language, navigator.platform || "",
      `${s.width}x${s.height}x${s.colorDepth}`,
      new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 0, navigator.deviceMemory || 0,
    ].join("|");
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  } catch (e) {
    return "";
  }
}

/* The signed-in user's Supabase access token, or "" when there is no backend
   or no session. Sent to the serverless functions so they can verify the real
   email server-side (it cannot be spoofed from the browser). */
export async function authToken() {
  if (!supabase) return "";
  try {
    const { data } = await supabase.auth.getSession();
    return (data && data.session && data.session.access_token) || "";
  } catch (e) {
    return "";
  }
}

/* Authorise one AI interview server-side. Asks /api/interview-start to charge
   the interview cost against the server credit ledger and return a signed token
   that /api/interview requires, so the interview cannot be run for free.
   Returns the function's JSON:
     { ok:true, token, credits, master }         charged (or master, uncharged)
     { ok:false, reason:"insufficient" }          not enough credits
     { ok:false, reason:"not_configured" | ... }  backend not deployed / other
   On "not_configured" (or any non-insufficient failure) the caller should fall
   back to its local credit charge, so the app keeps working before deploy. */
export async function startInterview(meta) {
  if (!supabase) return { ok: false, reason: "not_configured" };
  try {
    const token = await authToken();
    if (!token) return { ok: false, reason: "not_signed_in" };
    const r = await fetch("/api/interview-start", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(meta || {}),
    });
    return await r.json().catch(() => ({ ok: false, reason: "bad_response" }));
  } catch (e) {
    return { ok: false, reason: "error" };
  }
}

export async function startTrial() {
  if (!supabase) return { ok: false, reason: "not_configured" };
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess && sess.session && sess.session.access_token;
    if (!token) return { ok: false, reason: "not_signed_in" };
    const fingerprint = await deviceFingerprint();
    const r = await fetch("/api/trial", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint }),
    });
    return await r.json().catch(() => ({ ok: false, reason: "bad_response" }));
  } catch (e) {
    return { ok: false, reason: "error" };
  }
}
