/* ================================================================== */
/*  STORAGE ADAPTER                                                    */
/*                                                                     */
/*  The app used to call window.storage, which only exists inside the  */
/*  Claude artifact preview. In a real browser that object is not      */
/*  there, so every read returned the fallback and every write         */
/*  silently did nothing: students lost all progress on refresh, and   */
/*  a student who had paid lost their unlock too.                      */
/*                                                                     */
/*  This adapter detects what the environment actually provides and    */
/*  never throws:                                                      */
/*    per-device data  -> localStorage, falling back to an in-memory   */
/*                        map when localStorage is blocked.            */
/*    shared data      -> a registered shared backend (Supabase) if    */
/*                        one has been configured, otherwise the same  */
/*                        per-device driver so the app still works.     */
/*                                                                     */
/*  sharedIsGlobal() reports whether shared reads and writes really    */
/*  reach other devices, so the leaderboard UI can tell the truth      */
/*  instead of implying a global board that does not exist yet.        */
/* ================================================================== */

/* ---- pick a per-device driver that cannot throw ---- */

function makeMemoryDriver() {
  const map = new Map();
  return {
    name: "memory",
    async get(key) { return map.has(key) ? map.get(key) : null; },
    async set(key, value) { map.set(key, value); },
    async remove(key) { map.delete(key); },
  };
}

function makeLocalStorageDriver() {
  return {
    name: "localStorage",
    async get(key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    async set(key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) { /* quota or blocked */ }
    },
    async remove(key) {
      try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
    },
  };
}

function localStorageWorks() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const probe = "ucat:__probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch (e) {
    return false;
  }
}

const localDriver = localStorageWorks() ? makeLocalStorageDriver() : makeMemoryDriver();

/* ---- shared backend, registered at runtime when Supabase exists ---- */

let sharedDriver = null;   /* null means: no real shared backend yet */

/* Register a shared backend. It must expose async get(key) and
   async set(key, value) that persist across devices. Returns nothing.
   Passing a falsy value clears it and reverts shared to device-only. */
export function registerSharedBackend(driver) {
  sharedDriver = driver && typeof driver.get === "function" && typeof driver.set === "function" ? driver : null;
}

/* True only when a real cross-device backend is live. The leaderboard
   copy keys off this so it never claims to be global when it is not. */
export function sharedIsGlobal() {
  return sharedDriver !== null;
}

/* Convenience: wire a Supabase client as the shared backend. The client
   is created by the caller (see AuthScreen wiring) so this module stays
   dependency free. Expects a table `kv` with columns key (text, primary
   key) and value (text). Never throws; on any failure shared falls back
   to device-only. */
export function useSupabaseSharedBackend(supabase, table = "kv") {
  if (!supabase || !supabase.from) { registerSharedBackend(null); return; }
  registerSharedBackend({
    async get(key) {
      try {
        const { data, error } = await supabase.from(table).select("value").eq("key", key).maybeSingle();
        if (error || !data) return null;
        return data.value;
      } catch (e) { return null; }
    },
    async set(key, value) {
      try { await supabase.from(table).upsert({ key, value }); } catch (e) { /* ignore */ }
    },
  });
}

/* ---- per-device JSON helpers (drop-in for the old getJSON/setJSON) ---- */

export async function getJSON(key, fallback) {
  const raw = await localDriver.get(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

export async function setJSON(key, value) {
  try { await localDriver.set(key, JSON.stringify(value)); } catch (e) { /* never throw */ }
}

export async function removeKey(key) {
  await localDriver.remove(key);
}

/* ---- shared JSON helpers (leaderboard). Fall back to the device    ---- */
/* ---- driver when no shared backend is registered.                  ---- */

export async function getSharedJSON(key, fallback) {
  const driver = sharedDriver || localDriver;
  try {
    const raw = await driver.get(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export async function setSharedJSON(key, value) {
  const driver = sharedDriver || localDriver;
  try { await driver.set(key, JSON.stringify(value)); } catch (e) { /* never throw */ }
}

/* Which per-device driver won, for diagnostics and the storage notice. */
export function localDriverName() {
  return localDriver.name;
}
