// freshness.mjs — Organ 3: stale-vs-live semantics.
//
// Data revalidates on a schedule; the badge always says which it is.
// States: fresh (age <= ttl), stale (ttl < age <= 3*ttl, still shown,
// badge carries last-good time), expired (older — named gap, not silent
// old rows). Pure. The app's refresh loop calls label(); the badge text
// is computed here so every app says it the same way.
export const FRESHNESS_SCHEMA = "Freshness@1";

export function label(fetchedAtMs, nowMs, ttlMs) {
  const age = nowMs - fetchedAtMs;
  if (!(age >= 0)) return { state: "unknown", badge: "time unknown" };
  if (age <= ttlMs) return { state: "fresh", badge: "updated " + Math.floor(age / 1000) + "s ago" };
  if (age <= 3 * ttlMs) {
    return {
      state: "stale",
      badge: "stale — last good " + new Date(fetchedAtMs).toUTCString(),
    };
  }
  return { state: "expired", badge: "data expired — refresh failed (named gap)" };
}

export function selftest() {
  const t = (n, c) => { if (!c) { console.error("FAIL", n); process.exitCode = 1; } else console.log("ok", n); };
  const NOW = 1_000_000, TTL = 60_000;
  t("fresh", label(NOW - 10_000, NOW, TTL).state === "fresh");
  t("stale carries last-good", label(NOW - 120_000, NOW, TTL).state === "stale");
  t("expired gaps", label(NOW - 300_000, NOW, TTL).state === "expired");
  t("future unknown", label(NOW + 5_000, NOW, TTL).state === "unknown");
}
