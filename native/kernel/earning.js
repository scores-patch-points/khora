// earning.js — HOW SIGNAL IS EARNED FROM NOISE, the same in every medium. Kernel law, medium-blind: items are indices, scores are numbers.
//
// What text, still images, learning words from scenes and motion in video taught, each separately, then found to be one shape:
//
//   1 A NULL NAMES WHAT IT DESTROYS AND WHAT IT KEEPS. Every null that worked destroyed exactly one thing and kept the rest:
//       text      second ends shuffled across the ground       destroys which end goes with which   keeps every end's frequency  (expect.js)
//       image     the frame's own pixels shuffled              destroys arrangement                 keeps the intensities        (seer edges)
//       learning  captions shuffled across images              destroys which words go with which scene  keeps each word's frequency
//       video     each pair's scores scattered over the grid   destroys WHERE                       keeps how much each pair scored
//     A null that destroys nothing measures nothing, and one that keeps nothing is too easy to beat. So a null is DECLARED (nullOf) and refused
//     when it names neither. The destroyed thing is the RESPECT the signal is in: "beats the scatter null" means "is signal in WHERE".
//   2 EXCHANGEABLE ONLY AMONG LIKES. Noise does not hit every item alike (it costs a smooth patch's sharpness more than a busy one's; a common
//     word co-occurs with everything). A null moves a score only among items of the same STRATUM, which the caller declares. Measured: without
//     strata, pure sensor noise on a still texture made two "figures"; with texture strata, none.
//   3 CONTINUITY IS THE PATTERN. One moment's difference is cheap (and a sum that one moment carries is not continuity: the loudest moment is left out); a difference that comes back, pair after pair, half after half, at the same
//     item, is what beats a scatter null (continuity). This is Pattern in the Ground/Figure/Pattern sense, and INS in the helix: an instance is
//     minted when the same thing keeps turning up.
//   4 BELIEVED ABOUT NOTHING ALONE. Many instruments may look (ants); an item is SIGNAL only when MORE of them land on it than chance co-location
//     allows (each one's flags scattered independently) AND they are at least two different MECHANISMS (two names for one decoder are one
//     reading: signal.js's lesson). Adding instruments raises the bar, never lowers it.
//   5 EVERYTHING ELSE IS NOISE, which is not nothing: NUL ∅, a difference that does not make a difference for this perceiver. The verdict is a
//     kernel kind (commitments.js DIFFERENCE), so a cell can carry it.
// The ground (what the perceiver itself contributes: a camera's motion, a page's frequencies) is the caller's to subtract first; what is
// earned here is the residue that resists it.
import { DIFFERENCE } from "./commitments.js";

export const REFUSALS = Object.freeze({
  NO_DESTROYS: "null_destroys_nothing",     // law 1: a null must name what it destroys
  NO_KEEPS: "null_keeps_nothing",           // law 1: and what it keeps
  UNDECLARED: "undeclared_number",          // draws, q are the caller's
  NO_STRATA: "strata_length_mismatch",
  NO_MECHANISM: "instrument_without_mechanism",
});
export class EarningRefusal extends Error { constructor(code, detail) { super(`${code}: ${detail}`); this.code = code; } }

export const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const quantile = (xs, q) => { const s = Float64Array.from(xs).sort(); return s.length ? s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] : 0; };

/** nullOf({ destroys, keeps, within, draws, q }) → a frozen, declared null (law 1). within: the strata it shuffles inside, if any. */
export function nullOf({ destroys, keeps, within = null, draws, q }) {
  if (!destroys) throw new EarningRefusal(REFUSALS.NO_DESTROYS, "say what the null destroys (that is the respect the signal is in)");
  if (!keeps) throw new EarningRefusal(REFUSALS.NO_KEEPS, "say what the null keeps");
  if (!Number.isFinite(draws) || !(q > 0 && q < 1)) throw new EarningRefusal(REFUSALS.UNDECLARED, "draws and q are declared by the caller");
  return Object.freeze({ destroys, keeps, within, draws, q, text: `destroys ${destroys}; keeps ${keeps}${within ? `; shuffled only within ${within}` : ""}; ${draws} draws, q ${q}` });
}

/** difference(observed, ceiling) → the kernel's verdict on one item: SIGNAL (○) when it beats the null's ceiling, else NOISE (∅) */
export const difference = (observed, ceiling) => (observed > ceiling ? DIFFERENCE.SIGNAL : DIFFERENCE.NOISE);

/**
 * continuity(fields, { strata, draws, q, seed }) — law 3 with laws 1–2. fields: one array of per-item scores per moment (pair, half, situation),
 * all the same length. An item's observed value is its sum over moments less its loudest
 * moment (so no one moment can carry it: a single spike is not continuity, a difference that comes back is); the null
 * rebuilds that sum from a random item OF THE SAME STRATUM at each moment. Returns { sums, ceilings (per stratum), flags (1 = signal), verdicts, null }.
 */
export function continuity(fields, { strata = null, stratumName = "one stratum", draws, q, seed = 0 }) {
  const n = fields[0]?.length ?? 0, st = strata ?? new Array(n).fill(0);
  if (st.length !== n) throw new EarningRefusal(REFUSALS.NO_STRATA, `${st.length} strata for ${n} items`);
  const nul = nullOf({ destroys: "where (which item) each moment's score fell", keeps: "how much each moment scored", within: strata ? stratumName : null, draws, q });
  const members = new Map(); st.forEach((s, i) => { if (!members.has(s)) members.set(s, []); members.get(s).push(i); });
  // NOT CARRIED BY ONE MOMENT: the statistic is an item's sum over moments LESS its single loudest moment. A difference that keeps coming back
  // keeps almost all of its sum; a single spike, however loud, keeps none of it. The null computes the same statistic on scattered draws.
  const stat = (vals) => { let s = 0, mx = -Infinity; for (const v of vals) { s += v; if (v > mx) mx = v; } return vals.length > 1 ? s - mx : s; };
  const rnd = lcg(seed), sums = Float64Array.from({ length: n }, (_, i) => stat(fields.map((f) => f[i])));
  const ceilings = new Map();
  for (const [s, m] of members) { const xs = []; for (let d = 0; d < draws; d++) xs.push(stat(fields.map((f) => f[m[Math.floor(rnd() * m.length)]]))); ceilings.set(s, quantile(xs, q)); }
  const flags = Uint8Array.from(sums, (v, i) => (v > ceilings.get(st[i]) ? 1 : 0));
  return { sums, ceilings: Object.fromEntries(ceilings), flags, verdicts: Array.from(sums, (v, i) => difference(v, ceilings.get(st[i])).op), null: nul };
}

/**
 * agree(instruments, { draws, q, seed, minMechanisms }) — law 4. instruments: [{ name, mechanism, flags }] over the same items. An item is SIGNAL
 * when more instruments flag it than the scattered-flags null's q-quantile allows (and at least 2), by >= minMechanisms distinct mechanisms.
 * With `neighbors` (item → adjacent items: the caller's medium, never this file's), agreement also counts as a REGION: connected items
 * where >= minMechanisms agree form a component, and a component larger than the largest that scattered flags make (q-quantile over the
 * draws) is signal whole. Two instruments that each flag much of the field agree somewhere by chance; they do not by chance agree on a
 * connected region. Returns { items, need, regionCeiling, regions, counts, verdicts, null }.
 */
export function agree(instruments, { draws, q, seed = 0, minMechanisms = 2, neighbors = null }) {
  for (const a of instruments) if (!a.mechanism) throw new EarningRefusal(REFUSALS.NO_MECHANISM, `instrument ${a.name} names no mechanism`);
  const nul = nullOf({ destroys: "where each instrument's flags fell (their co-location)", keeps: "how many items each instrument flagged", draws, q });
  const n = instruments[0]?.flags.length ?? 0, rnd = lcg(seed), counts = new Int32Array(n); for (const a of instruments) a.flags.forEach((f, i) => (counts[i] += f ? 1 : 0));
  const mechAt = (flagsOf, i) => new Set(instruments.filter((_, k) => flagsOf[k][i]).map((a) => a.mechanism)).size;
  // components of items where >= 2 mechanisms agree, joined through the caller's neighbours (only when neighbours are given)
  const components = (flagsOf) => { if (!neighbors) return []; const ok = new Uint8Array(n); for (let i = 0; i < n; i++) ok[i] = mechAt(flagsOf, i) >= minMechanisms ? 1 : 0; const seen = new Uint8Array(n), out = []; for (let i = 0; i < n; i++) { if (!ok[i] || seen[i]) continue; const comp = [], stack = [i]; seen[i] = 1; while (stack.length) { const x = stack.pop(); comp.push(x); for (const y of neighbors(x)) if (y >= 0 && y < n && ok[y] && !seen[y]) { seen[y] = 1; stack.push(y); } } out.push(comp); } return out; };
  const xs = [], sizes = [];
  for (let d = 0; d < draws; d++) {
    const c = new Int32Array(n), fl = instruments.map(() => new Uint8Array(n));
    instruments.forEach((a, k) => { const m = a.flags.reduce((s, f) => s + (f ? 1 : 0), 0), picked = new Set(); while (picked.size < Math.min(m, n)) picked.add(Math.floor(rnd() * n)); for (const i of picked) { c[i]++; fl[k][i] = 1; } });
    const step = Math.max(1, Math.floor(n / 64)); for (let i = 0; i < n; i += step) xs.push(c[i]);
    if (neighbors) { const cs = components(fl); sizes.push(cs.reduce((mx, cc) => Math.max(mx, cc.length), 0)); }
  }
  const need = Math.max(2, quantile(xs, q) + 1), keep = new Set();
  for (let i = 0; i < n; i++) if (counts[i] >= need && mechAt(instruments.map((a) => a.flags), i) >= minMechanisms) keep.add(i);
  // a REGION of agreement larger than the largest one scattered flags make (q-quantile over draws) is signal, every item of it
  const regionCeiling = neighbors ? quantile(sizes, q) : null, regions = [];
  if (neighbors) for (const cc of components(instruments.map((a) => a.flags))) if (cc.length > regionCeiling) { regions.push(cc); for (const i of cc) keep.add(i); }
  const items = [...keep].sort((a, b) => a - b), verdicts = Array.from({ length: n }, (_, i) => (keep.has(i) ? DIFFERENCE.SIGNAL.op : DIFFERENCE.NOISE.op));
  return { items, need, regionCeiling, regions: regions.length, counts, verdicts, null: nul };
}

// ── THE STARTLE: the loudest moment is not thrown away, it is another kind of signal ──────────────────────────────────────────────────────
// Continuity leaves each item's loudest moment out, so that no single moment can make a Pattern. That moment is not noise: it is a STARTLE,
// a difference in the dynamics of differences (a DMD of DMDs). The fields given here are already differences (an instrument's scores, moment
// by moment). Their DYNAMICS are fitted by Dynamic Mode Decomposition (kernel/dmd.js) on the PAST ONLY (the prefix up to moment k; nothing
// from the future), and used to PREDICT moment k+1. With few moments a fitted model cannot yet expect things to stay as they are, so PERSISTENCE (moment k
// again) predicts too; the residue is what NEITHER predicted (whichever prediction came closer). An item is STARTLED at a
// moment when its residue lies beyond that moment's Tukey upper fence (Q3 + 1.5·IQR over the moment's residues, within its stratum: the same
// declared rule as everywhere else). A steady difference is predicted and does not startle; the moment something new happens does.
import { economySVD, matmul, transpose } from "./dmd.js";
/** startle(fields, { strata, minPast }) → { moments: [{ at, startled: [items], residue, whole }], byItem: Map(item → [moments]), rule } */
export function startle(fields, { strata = null, minPast = 1 } = {}) {
  const n = fields[0]?.length ?? 0, st = strata ?? new Array(n).fill(0), members = new Map(); st.forEach((s, i) => { if (!members.has(s)) members.set(s, []); members.get(s).push(i); });
  const col = (k) => fields[k].map((v) => [v]), moments = [], byItem = new Map(), shaken = new Set();
  for (let k = minPast; k + 1 < fields.length; k++) {
    // the dynamics are learned only from transitions between moments that did not startle as a whole: a cut teaches nothing about what comes next
    const steps = []; for (let j = 0; j < k; j++) if (!shaken.has(j) && !shaken.has(j + 1)) steps.push(j);
    let pred = new Array(n).fill(0);
    if (steps.length) {
      const X = Array.from({ length: n }, (_, i) => steps.map((j) => fields[j][i])), Xp = Array.from({ length: n }, (_, i) => steps.map((j) => fields[j + 1][i]));
      const { U, s, V, rank } = economySVD(X, { rank: Infinity, relTol: 1e-9 });
      if (rank > 0) { const At = matmul(matmul(transpose(U), Xp), V).map((row) => row.map((v, c) => v / s[c])), z = matmul(transpose(U), col(k)), p = matmul(U, matmul(At, z)); pred = p.map((r) => r[0]); }
    } else pred = fields[k];
    const res = fields[k + 1].map((v, i) => { const a = v - pred[i], b = v - fields[k][i]; return Math.abs(a) <= Math.abs(b) ? a : b; }), startled = [];
    for (const m of members.values()) { const xs = m.map((i) => res[i]), q1 = quantile(xs, 0.25), q3 = quantile(xs, 0.75), fence = q3 + 1.5 * (q3 - q1); for (const i of m) if (res[i] > fence && res[i] > 0) startled.push(i); }
    const residue = Math.sqrt(res.reduce((a, v) => a + v * v, 0));
    // the WHOLE MOMENT startles (a cut: the world changed, not a thing in it) when its residue lies beyond Tukey's FAR-OUT fence (Q3 + 3·IQR)
    // of the residues of the unshaken moments before it, judged once at least 4 exist
    const past = moments.filter((m) => !m.whole).map((m) => m.raw); let whole = null;
    if (past.length >= 4) { const q1 = quantile(past, 0.25), q3 = quantile(past, 0.75); whole = residue > q3 + 3 * (q3 - q1); if (whole) shaken.add(k + 1); }
    moments.push({ at: k + 1, startled, residue: +residue.toFixed(3), raw: residue, whole });
    for (const i of startled) { if (!byItem.has(i)) byItem.set(i, []); byItem.get(i).push(k + 1); }
  }
  for (const m of moments) delete m.raw;
  return { moments, byItem, rule: `dynamics fitted by DMD on moments 0..k only, predicting k+1; startled = residue beyond the moment's Tukey upper fence${strata ? " within its stratum" : ""}` };
}
