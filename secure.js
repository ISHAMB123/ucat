/* ================================================================== */
/*  ON-DEVICE ENCRYPTION                                               */
/*                                                                     */
/*  Used for the small interview performance history (the feedback     */
/*  DNA). The AES-GCM key is generated as NON-EXTRACTABLE and kept in  */
/*  IndexedDB, so its raw bytes are never exposed to page scripts and  */
/*  the ciphertext in localStorage cannot be read back by inspecting   */
/*  storage alone. Everything here runs in the browser; none of this   */
/*  data is ever sent anywhere.                                        */
/*                                                                     */
/*  This protects against casual inspection and other-origin access,  */
/*  not against someone with full control of the device (the key must  */
/*  live on the device to be usable). The real guarantee is that the   */
/*  data never leaves the machine in the first place.                 */
/*                                                                     */
/*  Degrades to a no-op where crypto or IndexedDB is missing (e.g. a   */
/*  test runner): secureSave returns false, secureLoad returns the     */
/*  fallback, and callers must tolerate that.                          */
/* ================================================================== */

const DB_NAME = "tempo-secure";
const STORE = "keys";
const KEY_ID = "ivdna-key-v1";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("no-indexeddb")); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("idb-open"));
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

async function getKey() {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) throw new Error("no-subtle");
  const db = await openDb();
  let key = await idbGet(db, KEY_ID);
  if (!key) {
    /* extractable = false: the key object works for encrypt/decrypt but its
       bytes can never be exported by any script. */
    key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await idbPut(db, KEY_ID, key);
  }
  return key;
}

function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(str) {
  const s = atob(str);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export async function secureSave(name, value) {
  try {
    const key = await getKey();
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(value));
    const ct = await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    localStorage.setItem(name, JSON.stringify({ v: 1, iv: toB64(iv), ct: toB64(ct) }));
    return true;
  } catch (e) {
    return false;
  }
}

export async function secureLoad(name, fallback) {
  try {
    const raw = localStorage.getItem(name);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.iv || !parsed.ct) return fallback;
    const key = await getKey();
    const pt = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(parsed.iv) }, key, fromB64(parsed.ct),
    );
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (e) {
    return fallback;
  }
}
