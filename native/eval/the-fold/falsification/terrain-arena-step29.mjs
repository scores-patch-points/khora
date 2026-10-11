// terrain-arena-step29.mjs — STANCE-USEFULNESS (consequence leg). The four
// gates proved stances are IDENTIFIABLE takings — anchored, count-free, graded,
// distinct. Now the user demand: prove USEFULNESS — does taking the frontier
// under an earned stance change a held-out future TEXTURE outcome? Extracted
// stances (like the being tiers before): Tracing = arrangement entropy,
// Binding = weighted edge-ownership, Tending = crowding, all on the frontier.
// Future textures (from FUTURE buckets only):
//   T_arr  future co-arrangement entropy shifts >= median
//   T_bound the being owns a future big-transition bucket
//   T_crowd future crowding shifts >= median
// Gates per stance: effect(stance, own target) >= 0.15 & shuffle-p <= 0.05 AND
// strictly beats count-baseline + the other stances on its own target.
// Verdict CONFIRMED = all three useful; PARTIAL = the useful subset.
//
// Usage: node terrain-arena-step29.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));

const MAXAT = Math.max(...corpus.edges.map((e) => e.at ?? 0));
const FRONT = Math.floor(0.6 * MAXAT);
const refs = corpus.referents.map((r) => r.hash);
const bucket = (at) => Math.floor((at ?? 0) / 50);
const MAXB = bucket(MAXAT) + 1;
const FRONTB = bucket(FRONT);

const appear = new Map(refs.map((r) => [r, new Set()]));
for (const e of corpus.edges) { const b = bucket(e.at ?? 0); if (e.subject) appear.get(e.subject)?.add(b); if (e.object) appear.get(e.object)?.add(b); }

const coAt = (b) => { const s = new Set(); for (const e of corpus.edges) if (bucket(e.at ?? 0) === b) { if (e.subject) s.add(e.subject); if (e.object) s.add(e.object); } return s; };

function arrangementEntropy(r, lo, hi) {
  const co = new Map();
  for (let b = lo; b <= hi; b += 1) if ((appear.get(r) ?? new Set()).has(b)) for (const o of coAt(b)) if (o !== r) co.set(o, (co.get(o) ?? 0) + 1);
  if (!co.size) return 0;
  const tot = [...co.values()].reduce((a, b) => a + b, 0);
  let h = 0; for (const v of co.values()) { const p = v / tot; h -= p * Math.log2(p); }
  return co.size === 1 ? 1 : h / Math.log2(co.size);
}
function crowding(r, lo, hi) {
  let n = 0, tot = 0;
  for (let b = lo; b <= hi; b += 1) if ((appear.get(r) ?? new Set()).has(b)) { tot += coAt(b).size - 1; n += 1; }
  return n ? tot / n : 0;
}
function edgeOwnership(r, lo, hi) {
  const boundaries = [];
  for (let b = lo; b < hi; b += 1) { let t = 0; for (const s of refs) if ((appear.get(s) ?? new Set()).has(b) !== (appear.get(s) ?? new Set()).has(b + 1)) t += 1; boundaries.push(t); }
  let num = 0, den = boundaries.reduce((a, b) => a + b, 0);
  for (let b = lo; b < hi; b += 1) { const L = (appear.get(r) ?? new Set()).has(b), R = (appear.get(r) ?? new Set()).has(b + 1); if (L !== R) num += boundaries[b - lo]; }
  return den ? num / den : 0;
}
const A_count = (r) => [...(appear.get(r) ?? new Set())].filter((b) => b <= FRONTB).length;

const participating = refs.filter((r) => A_count(r) > 0);
const stances = { Tracing: (r) => arrangementEntropy(r, 0, FRONTB), Binding: (r) => edgeOwnership(r, 0, FRONTB), Tending: (r) => crowding(r, 0, FRONTB) };

const MED = (arr) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
function futureTexture(r) {
  const fEnt = arrangementEntropy(r, FRONTB + 1, MAXB);
  const boundaries = [];
  for (let b = FRONTB + 1; b < MAXB; b += 1) { let t = 0; for (const s of refs) if ((appear.get(s) ?? new Set()).has(b) !== (appear.get(s) ?? new Set()).has(b + 1)) t += 1; boundaries.push(t); }
  const BIG = boundaries.length ? boundaries.slice().sort((a, b) => a - b)[Math.floor(boundaries.length * 0.75)] : 0;
  let ownsBig = false;
  for (let b = FRONTB + 1; b < MAXB; b += 1) if ((appear.get(r) ?? new Set()).has(b) !== (appear.get(r) ?? new Set()).has(b + 1) && boundaries[b - (FRONTB + 1)] >= BIG) { ownsBig = true; break; }
  return { fEnt, ownsBig: ownsBig ? 1 : 0, fCrowd: crowding(r, FRONTB + 1, MAXB) };
}
const tcache = new Map(participating.map((r) => [r, futureTexture(r)]));
const entShift = (r) => Math.abs(tcache.get(r).fEnt - arrangementEntropy(r, 0, FRONTB));
const crowdShift = (r) => Math.abs(tcache.get(r).fCrowd - crowding(r, 0, FRONTB));
const medEnt = MED(participating.map(entShift));
const medCrowd = MED(participating.map(crowdShift));
const targets = {
  T_arr: (r) => (entShift(r) >= medEnt ? 1 : 0),
  T_bound: (r) => tcache.get(r).ownsBig,
  T_crowd: (r) => (crowdShift(r) >= medCrowd ? 1 : 0),
};
const ownTarget = { Tracing: "T_arr", Binding: "T_bound", Tending: "T_crowd" };

const S = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shuf = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function effectOf(scoreFn, targetFn) {
  const sc = participating.map(scoreFn);
  const q75 = [80, Math.floor(sc.length * 0.75)][1];
  const cut = [...sc].sort((a, b) => a - b)[q75];
  const pos = participating.filter((_, i) => sc[i] >= cut);
  const neg = participating.filter((_, i) => sc[i] < cut);
  if (!pos.length || !neg.length) return { effect: 0, pos: 0, neg: 0 };
  const pr = pos.filter((r) => targetFn(r) === 1).length / pos.length;
  const nr = neg.filter((r) => targetFn(r) === 1).length / neg.length;
  return { effect: pr - nr, pos: pr, neg: nr };
}
function shuffleP(scoreFn, targetFn) {
  const effect = effectOf(scoreFn, targetFn).effect;
  const raw = participating.map(scoreFn);
  const ys = participating.map((r) => targetFn(r));
  const vals = [];
  for (let k = 0; k < 500; k++) {
    const perm = shuffled(raw, createSeededRng(150000 + k));
    const q75 = Math.floor(perm.length * 0.75);
    const cut = [...perm].sort((a, b) => a - b)[q75];
    let p = 0, n = 0, ph = 0, nh = 0;
    for (let i = 0; i < perm.length; i++) (perm[i] >= cut ? (p++, ph += ys[i]) : (n++, nh += ys[i]));
    vals.push(p && n ? ph / p - nh / n : 0);
  }
  return (vals.filter((v) => v >= effect).length + 1) / (vals.length + 1);
}

const results = {};
for (const name of Object.keys(stances)) {
  const t = ownTarget[name];
  const e = effectOf(stances[name], targets[t]);
  const sp = shuffleP(stances[name], targets[t]);
  const peer = Object.keys(stances).filter((k) => k !== name).map((k) => +effectOf(stances[k], targets[t]).effect.toFixed(3));
  const count = +effectOf((r) => A_count(r), targets[t]).effect.toFixed(3);
  const eff = +e.effect.toFixed(3);
  results[name] = {
    target: t, effect: eff, posRate: +e.pos.toFixed(3), negRate: +e.neg.toFixed(3),
    countBaseline: count, peers: peer, shuffleP: +sp.toFixed(4),
    useful: e.effect >= 0.15 && sp <= 0.05 && eff > count && peer.every((x) => eff > x + 0.1),
  };
}
const earned = Object.keys(results).filter((n) => results[n].useful);
const verdict = earned.length === 3
  ? { verdict: "CONFIRMED", claim: "all three earned stances are USEFUL: each forecasts its own future texture, strictly beating the count-only retention, its stance-peers, and its shuffle null — the how you take does something held-out." }
  : earned.length === 0
    ? { verdict: "FALSIFIED", claim: "no earned stance is yet useful — identifiable but not consequential on this material." }
    : { verdict: "PARTIAL", claim: `${earned.join(", ")} proven USEFUL (${earned.length}/3); the rest are identifiable-but-not-yet-consequential — see the table.` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep29@1",
  material: { referents: participating.length, frontierBuckets: FRONTB + 1, futureBuckets: MAXB - FRONTB },
  results,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["Future textures are mechanical targets from future buckets only; participant-conditioned top-half split; 500-draw shuffle nulls; bars pre-registered (effect>=0.15, p<=0.05, beats count + peers by 0.1)."],
}, null, 2));