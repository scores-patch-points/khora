// opencode-trail.mjs — layer 3: stale tool results become opaque handles, except the ones the TRAIL says will come back.
//
// The trail is the leaf-cutter's rule (archon `atta`): a path is reinforced by every pass over it and evaporates with age.
// Measured on 80 real opencode sessions (600 points, 766 re-reads, ~23 files in play): the share of re-read files that a
// predictor had in its top 5 was random 28%, decayed trail 78.9%, recency 78.6%, frequency 76.4%, DMD 75-78% — so the rule
// is the plain decayed trail (gamma 0.7), and DMD, however it is tuned, converges onto it and never beats it.
//
//   plan({ results, now })   which tool results stay verbatim (the top `keep` KEYS by trail, each key's latest result only)
//                            and which become a handle. A key is what a result is ABOUT: the path it read.
//   handleOf(id)             `r` + five base36 chars of a hash of the result's id: OPAQUE (nothing about the content, turn
//                            or path) and DETERMINISTIC (the same result has the same handle on every call, so a stub never
//                            changes the prompt prefix by itself).
//   shouldCompact(...)       THE COST GATE. Rewriting an old message invalidates the prompt cache from there on; at the
//                            measured prices a cache read is ~2% of an uncached input token, so compaction pays only when the
//                            cache is already cold (idle past its TTL) or the prompt is near the window. Otherwise: no change.
//   Monotone: a result once pointerized stays pointerized (`already`), so each result flips at most once.
// Toggle: FOLD_TRAIL=1. Pure: no fetch, no fs.
import crypto from "node:crypto";

export const trailEnabled = (env = process.env) => env.FOLD_TRAIL === "1";
export const TRAIL_DEFAULTS = Object.freeze({ keep: 5, gamma: 0.7 });

export const handleOf = (id, taken = new Set()) => {
  const h = crypto.createHash("sha1").update(String(id)).digest();
  for (let len = 5; len <= 12; len++) {
    const hd = `r${BigInt("0x" + h.subarray(0, 8).toString("hex")).toString(36).padStart(len, "0").slice(0, len)}`;
    if (!taken.has(hd)) return hd;
  }
  return `r${h.toString("hex").slice(0, 16)}`;
};

/** results: [{ id, key, step }] in the order they appeared; `now` is the current step. */
export function plan({ results = [], now = null, keep = TRAIL_DEFAULTS.keep, gamma = TRAIL_DEFAULTS.gamma, already = new Set() } = {}) {
  const at = now ?? (results.length ? Math.max(...results.map((r) => r.step)) : 0);
  const score = new Map(), latest = new Map();
  for (const r of results) {
    score.set(r.key, (score.get(r.key) ?? 0) + gamma ** Math.max(0, at - r.step));
    latest.set(r.key, r); // the last result for a key is the one that stands for it
  }
  const top = [...score].sort((a, b) => b[1] - a[1] || latest.get(b[0]).step - latest.get(a[0]).step).slice(0, keep).map(([k]) => k);
  const live = new Set(top.map((k) => latest.get(k).id));
  const keepIds = new Set(), point = new Map(), taken = new Set();
  for (const r of results) {
    if (live.has(r.id) && !already.has(r.id)) keepIds.add(r.id);
    else { const hd = handleOf(r.id, taken); taken.add(hd); point.set(r.id, hd); }
  }
  return { keep: keepIds, point, scores: Object.fromEntries(score) };
}

export const stub = (handle, chars) => `[${chars} chars kept out; SNIP ${handle}]`;

/** The cost gate. `idleMs` since this session's last request; `tokens` the prompt's size estimate; `window` its model's. */
export function shouldCompact({ idleMs = 0, tokens = 0, window = 200_000, env = process.env } = {}) {
  const ttl = Number(env.FOLD_TRAIL_IDLE_MS ?? 300_000); // the provider's cache lifetime: past it nothing is cached to lose
  const pressure = Number(env.FOLD_TRAIL_PRESSURE ?? 0.5); // share of the window at which waiting costs more than the re-read
  if (idleMs >= ttl) return { go: true, why: "cache_cold" };
  if (window > 0 && tokens >= pressure * window) return { go: true, why: "window_pressure" };
  return { go: false, why: "cache_warm" };
}
