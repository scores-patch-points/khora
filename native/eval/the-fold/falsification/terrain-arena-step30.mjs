// terrain-arena-step30.mjs — REAL-OUTCOME STANCE TEST (Eviction-Overwatch).
// The last frontier: stances forecasting a consequence THE WORLD CARES ABOUT,
// not textual recurrence. Landlords are multi-occasion actors (they hold many
// properties = their "scenes"); the held-out outcome is FUTURE EVICTIONS at
// their late properties. Stances read the landgrave's EARLY portfolio:
//   Tracing  arrangement entropy of co-owners (with whom it rides across its properties)
//   Binding  ownership edge-share (fraction of early properties it owns alone)
//   Tending  context crowding (mean co-owners per early property)
// count    = portfolio size (the rarity axis).
// Outcome y = the landlord's LATE portfolio contains at least one eviction.
// Gates (mirror step 29): effect(top-quartile) >= 0.15, 500-draw shuffle
// p <= 0.05, STRICTLY beats count-baseline AND its stance-peers on the outcome.
// Material: property-landlord export, temporal cut 2025-06-30.
//
// Usage: node terrain-arena-step30.mjs /Users/mlacy/Documents/3.0/Eviction-Overwatch/exports/property-landlord-export-2026-09-03T23-22-28-012Z.json

import { readFile } from "node:fs/promises";

const pathTo = process.argv[2] || "/Users/mlacy/Documents/3.0/Eviction-Overwatch/exports/property-landlord-export-2026-09-03T23-22-28-012Z.json";
const exportData = JSON.parse(await readFile(pathTo, "utf8"));
const props = exportData.properties ?? exportData;
const CUT = Date.parse("2025-06-30T00:00:00Z");
const parseDate = (s) => { if (!s) return NaN; const [, m, d, y] = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s)) || []; return y ? Date.parse(`${y}-${m}-${d}T00:00:00Z`) : NaN; };
const landM = () => { // landlord -> { early: propertys, late: propertys }
  const L = new Map();
  for (const p of props) {
    const name = String(p.primaryLandlord ?? "").trim().toUpperCase();
    if (!name) continue;
    if (!L.has(name)) L.set(name, { early: [], late: [] });
    const t = parseDate(p.firstFileDate);
    if (Number.isFinite(t) && t > CUT) L.get(name).late.push(p);
    else L.get(name).early.push(p);
  }
  return L;
};
const L = landM();
const landlords = [...L.keys()].filter((n) => L.get(n).early.length >= 2);

// stance scorings over the early portfolio
const entropy = (counts) => { const tot = counts.reduce((a, b) => a + b, 0); if (tot <= 0) return 0; let h = 0; for (const v of counts) { const p = v / tot; h -= p * Math.log2(p); } return h; };
const traceScore = (p) => { // co-owner frequency across early props
  const co = new Map();
  for (const pr of p) for (const o of pr.landlordsBreakdown ?? []) { const n = String(o.name ?? "").trim().toUpperCase(); if (n) co.set(n, (co.get(n) ?? 0) + (o.count ?? 1)); }
  const vals = [...co.values()];
  return vals.length ? entropy(vals) / Math.log2(vals.length + 1) : 0;
};
const bindScore = (p) => { let sole = 0; for (const pr of p) if ((pr.landlordsBreakdown ?? []).length <= 1) sole += 1; return p.length ? sole / p.length : 0; };
const tendScore = (p) => { if (!p.length) return 0; return p.reduce((a, pr) => a + (pr.landlordsBreakdown ?? []).length, 0) / p.length; };
const countScore = (p) => p.length;
const outcome = (Lb) => Lb.late.some((pr) => (pr.evictionCount ?? 0) > 0);
const y = landlords.map((n) => (outcome(L.get(n)) ? 1 : 0));
const earlyArr = landlords.map((n) => L.get(n).early);

const sc = {
  Tracing: earlyArr.map(traceScore),
  Binding: earlyArr.map(bindScore),
  Tending: earlyArr.map(tendScore),
  Count: earlyArr.map(countScore),
};

const S = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shuf = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function effectOf(arr, ys) {
  const cut = [...arr].sort((a, b) => a - b)[Math.floor(arr.length * 0.75)];
  let pp = 0, nn = 0, ph = 0, nh = 0;
  for (let i = 0; i < arr.length; i++) (arr[i] >= cut ? (pp++, ph += ys[i]) : (nn++, nh += ys[i]));
  if (!pp || !nn) return { effect: 0, pos: 0, neg: 0 };
  return { effect: ph / pp - nh / nn, pos: ph / pp, neg: nh / nn };
}
function shuffleP(arr, ys) {
  const obs = effectOf(arr, ys).effect;
  const vals = [];
  for (let k = 0; k < 500; k++) { const perm = shuf(arr, S(160000 + k)); vals.push(effectOf(perm, ys).effect); }
  return (vals.filter((v) => v >= obs).length + 1) / (vals.length + 1);
}
const nullP = (arr, ys) => { const obs = effectOf(arr, ys).effect; const vals = []; for (let k = 0; k < 500; k++) { const perm = shuf(arr, S(165000 + k)); vals.push(effectOf(perm, ys).effect); } return (vals.filter((v) => v >= obs).length + 1) / (vals.length + 1); };

const countE = effectOf(sc.Count, y).effect;
const results = {};
for (const name of ["Tracing", "Binding", "Tending"]) {
  const e = effectOf(sc[name], y);
  const sp = shuffleP(sc[name], y);
  const peers = Object.keys(sc).filter((k) => k !== name && k !== "Count").map((k) => +effectOf(sc[k], y).effect.toFixed(3));
  const eff = +e.effect.toFixed(3);
  results[name] = { effect: eff, posRate: +e.pos.toFixed(3), negRate: +e.neg.toFixed(3), countBaseline: +countE.toFixed(3), peers, shuffleP: +sp.toFixed(4), useful: e.effect >= 0.15 && sp <= 0.05 && eff > countE && peers.every((x) => eff > x + 0.1) };
}
const earned = Object.keys(results).filter((n) => results[n].useful);
const verdict = earned.length === 3
  ? { verdict: "CONFIRMED", claim: "all three stances earn their keep on a REAL consequence: each forecasts late evictions at the owned portfolio, beating portfolio-size, its stance-peers, and a shuffled null — the how you take predicts the world that cares." }
  : earned.length === 0
    ? { verdict: "FALSIFIED", claim: "no stance added out-of-sample eviction prediction beyond portfolio size, its peers, and the null — identifiable, not useful, on real consequence." }
    : { verdict: "PARTIAL", claim: `${earned.join(", ")} forecast real evictions (${earned.length}/3); the rest did not beat count + peers + null.` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep30@1",
  material: { properties: props.length, landlords: landlords.length, baseEvictRate: +(y.reduce((a, b) => a + b, 0) / y.length).toFixed(3) },
  results,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["Outcome = any late eviction (documented consequence); temporal cut 2025-06-30 on firstFileDate; landlords with >= 2 early properties; gates mirror step 29 with a p75 split."],
}, null, 2));