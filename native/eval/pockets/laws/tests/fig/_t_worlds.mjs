// tests/fig/_t_worlds.mjs — custom synthetic worlds for the "fig" family that plant exactly one phenomenon each (the planted loader has none of: introduction frame, convergence, episodic figure density).
// All worlds: iid Zipf(1.0) over 5000 types as background, unit lengths lognormal (median 9, sigma 0.55, 2..45), documents of ~1000 tokens. Types are "w<rank0>" (rank0 = 0 is the commonest). Deterministic (rngOf/seedOf).
import { rngOf, seedOf } from "../../../lib/pocket.mjs";
const V = 5000, cdf = new Float64Array(V); let S = 0; for (let i = 0; i < V; i++) { S += 1 / (i + 1); cdf[i] = S; }
const tools = (id) => {
  const rnd = rngOf(seedOf("fig-world", id)), gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const zipf = () => { const u = rnd() * S; let lo = 0, hi = V - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] > u) hi = m; else lo = m + 1; } return lo; };
  const len = () => Math.max(3, Math.min(45, Math.round(Math.exp(Math.log(9) + 0.55 * gauss()))));
  return { rnd, zipf, len, base: () => Array.from({ length: len() }, zipf) };
};
const finish = (id, units) => { let n = 0, d = 0, dn = 0; const docOf = units.map((u) => { const r = d; dn += u.length; if (dn >= 1000) { d++; dn = 0; } return r; }); return { id, which: "custom", units: units.map((u) => u.map((x) => "w" + x)), docOf }; };

/** INTRO: nFig figure types (default 600, ids 5000..,  never produced by the Zipf background, so their first occurrence IS the introduction); each is introduced once, at a random unit in the first `span` share of the units, with one of the 3 commonest types immediately before it (the introducer frame); afterwards it is re-mentioned
 *  (any position, iid neighbours) only while it is among the 100 most recent introductions. Planted: left company of introductions of recurring types is COMMONER than usual (introLeft < 0). */
export function introWorld(id, N = 60000, nFig = 600, span = 0.5) {
  const { rnd, zipf, base } = tools(id), units = [], sched = new Map(), nU = Math.round(N / 10.4);
  for (let f = 0; f < nFig; f++) { const k = Math.floor(rnd() * (nU * span)); if (!sched.has(k)) sched.set(k, []); sched.get(k).push(5000 + f); }
  const intro = [];
  for (let k = 0; k < nU; k++) {
    const u = base();
    for (const f of sched.get(k) || []) { const p = 1 + Math.floor(rnd() * (u.length - 1)); u[p - 1] = Math.floor(rnd() * 3); u[p] = f; intro.push(f); }
    if (intro.length && rnd() < 0.5) { const f = intro[Math.max(0, intro.length - 1 - Math.floor(rnd() * 100))]; u[Math.floor(rnd() * u.length)] = f; }
    units.push(u);
  }
  return finish(id, units);
}
/** CONVERGE: 40 figure types (ids 5000..5039, exclusive to the planted mentions), each unit holds a mention of a random one with p = 0.3. dir +1: its neighbours are iid for mentions 1..6 and then ALWAYS the same two types (company converges);
 *  dir -1: always the same two types for mentions 1..6, iid afterwards (the company opens). */
export function convergeWorld(id, dir, N = 60000) {
  const { rnd, zipf, base } = tools(id), units = [], cnt = new Int32Array(40), L = Array.from({ length: 40 }, () => zipf()), R = Array.from({ length: 40 }, () => zipf());
  for (let n = 0; n < N; ) {
    const u = base();
    if (rnd() < 0.3) { const f = Math.floor(rnd() * 40), p = 1 + Math.floor(rnd() * (u.length - 2)), fixed = dir > 0 ? cnt[f] >= 6 : cnt[f] < 6; cnt[f]++; u[p] = 5000 + f; if (fixed) { u[p - 1] = L[f]; u[p + 1] = R[f]; } }
    units.push(u); n += u.length;
  }
  return finish(id, units);
}
/** CLUSTER: stretches of 150 units alternate: DENSE (each unit holds 3 mentions of that stretch's own 30 exclusive figure types) and SPARSE (iid only). Planted: figure density is episodic (fano > null). */
export function clusterWorld(id, N = 60000) {
  const { rnd, zipf, base } = tools(id), units = []; let set = [], n = 0;
  for (let k = 0; n < N; k++) {
    if (k % 150 === 0) set = Array.from({ length: 30 }, () => 5000 + Math.floor(rnd() * 3000));
    const u = base(), dense = Math.floor(k / 150) % 2 === 0;
    if (dense) for (let m = 0; m < 3; m++) u[Math.floor(rnd() * u.length)] = set[Math.floor(rnd() * 30)];
    units.push(u); n += u.length;
  }
  return finish(id, units);
}

/** INTRO-ALL: every recurring type is framed. Background = Zipf(1.0) over 50 function-like types (ids 0..49). 2000 figure types (ids 5000..6999) are each introduced once with one of the 3 commonest background types
 *  immediately before (side "left") or after (side "right") them, then re-mentioned 3 times within the next 100 units with iid neighbours; 2000 hapax types (ids 10000..11999) occur once with iid neighbours.
 *  Planted: the company of first occurrences of recurring types differs from that of hapax on ONE side only. */
export function introAllWorld(id, side, N = 60000) {
  const rnd = rngOf(seedOf("fig-world", id)), gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()), W = 50, c = new Float64Array(W); let s = 0;
  for (let i = 0; i < W; i++) { s += 1 / (i + 1); c[i] = s; }
  const bg = () => { const u = rnd() * s; let lo = 0, hi = W - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] > u) hi = m; else lo = m + 1; } return lo; };
  const len = () => Math.max(4, Math.min(30, Math.round(Math.exp(Math.log(9) + 0.45 * gauss())))), units = []; let n = 0;
  while (n < N) { const u = Array.from({ length: len() }, bg); units.push(u); n += u.length; }
  const nU = units.length, plan = Array.from({ length: nU }, () => []);
  for (let f = 0; f < 2000; f++) { const k = Math.floor(rnd() * (nU - 101)); plan[k].push([5000 + f, 1]); for (let m = 0; m < 3; m++) plan[k + 1 + Math.floor(rnd() * 100)].push([5000 + f, 0]); }
  for (let h = 0; h < 2000; h++) plan[Math.floor(rnd() * nU)].push([10000 + h, 0]);
  for (let k = 0; k < nU; k++) for (const [t, framed] of plan[k]) {
    const u = units[k], p = 1 + Math.floor(rnd() * (u.length - 2)); u[p] = t;
    if (framed) { if (side === "left") u[p - 1] = Math.floor(rnd() * 3); else u[p + 1] = Math.floor(rnd() * 3); }
  }
  return finish(id, units);
}
