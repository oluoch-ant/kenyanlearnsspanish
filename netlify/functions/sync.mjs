/* ============================ SYNC FUNCTION ============================
 *
 * POST /api/sync   { state }  ->  { state: merged, updatedAt }
 * GET  /api/sync              ->  { state, updatedAt }   (pull only)
 *
 * Auth: a single shared passphrase in the SYNC_SECRET environment variable, sent by the
 * client as an x-sync-secret header. That is the right amount of auth for one person with
 * two devices. The passphrase does still live in localStorage on each device — but unlike a
 * GitHub token, all it unlocks is this one blob of Spanish verb reps. That's the entire
 * blast radius, and that's why we're not putting an account-scoped token in the browser.
 *
 * The merge happens HERE, not on the client: read the blob, merge the incoming state into it,
 * write it back, hand the merged result to whoever asked. One merge, one place, and both
 * devices converge on the same answer no matter what order they turn up in.
 */
import { getStore } from "@netlify/blobs";
import { mergeState } from "./merge.mjs";

const STORE = "spanish-progress";
const KEY = "state";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/* constant-time compare, so the passphrase can't be guessed a character at a time */
function safeEqual(a = "", b = "") {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async (req) => {
  const expected = process.env.SYNC_SECRET || "";
  if (!expected) return json({ error: "SYNC_SECRET is not set on this site" }, 500);
  if (!safeEqual(req.headers.get("x-sync-secret") || "", expected)) {
    return json({ error: "unauthorized" }, 401);
  }

  // STRONG consistency is not optional here. Blobs defaults to eventual consistency (updates
  // propagate "within 60 seconds"), which silently breaks read-merge-write: the read comes back
  // stale, we merge into an out-of-date copy, and the other device's reps are lost. This exact
  // bug ate the phone's reps in the first live test. Strong reads cost a few ms. Worth it.
  const store = getStore({ name: STORE, consistency: "strong" });

  if (req.method === "GET") {
    const saved = await store.get(KEY, { type: "json" });
    return json({ state: saved?.state ?? null, updatedAt: saved?.updatedAt ?? null });
  }

  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  if (!body || typeof body.state !== "object" || body.state === null) {
    return json({ error: "expected { state }" }, 400);
  }
  // a state without the mastery maps is almost certainly a bug or a truncated request —
  // refuse it rather than let it overwrite good data with an empty shell
  const s = body.state;
  if (typeof s.cards !== "object" || typeof s.verbs !== "object") {
    return json({ error: "state does not look like Spanish Teacher progress" }, 400);
  }

  const saved = await store.get(KEY, { type: "json" });
  const merged = mergeState(saved?.state ?? null, s);
  const payload = { v: 1, updatedAt: new Date().toISOString(), state: merged };
  await store.setJSON(KEY, payload);

  return json({ state: merged, updatedAt: payload.updatedAt });
};

export const config = { path: "/api/sync" };
