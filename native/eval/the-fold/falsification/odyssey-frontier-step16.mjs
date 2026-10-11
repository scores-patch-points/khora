// odyssey-frontier-step16.mjs — STEP 16: the temporal-frontier holdout.
// Step 15's random book-holdout diluted the signal on a short seam (22 books).
// This uses the TRUE future question the seam was built for: TRAIN on the
// first 14 books (the frontier), PREDICT participation in books 15-22. Same
// three readings, same earn bar (effect >= 0.15, shuffle-p <= 0.05):
//   networkMulti   being in >= 2 of books 1-14 -> books 15-22 participation
//   networkActive  being in >= 1 of books 1-14 -> future participation
//   kindMembership company-model basins over books 1-14 -> future participation
// Shuffle controls permute the reading assignment among beings, preserving
// marginals; the TEST outcome (books 15-22) stays fixed.
//
// Usage: node odyssey-frontier-step16.mjs

import { readFile } from "node:fs/promises";

const O = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt";
const KH = "/Users/mlacy/Documents/3.0/khora";
const greek = await import(`${KH}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(await readFile("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const raw = (await readFile(O, "utf8")).replace(/^---[\s\S]*?\n---\n/, "");
const heads = [...raw.matchAll(/Οδύσσεια\/([α-ω])/g)];
const books = [];
for (let i = 0; i < heads.length; i += 1) books.push(raw.slice(heads[i].index, i + 1 < heads.length ? heads[i + 1].index : raw.length));
const FRONTIER = 14; // train books 0..13, test books 14..21 (future)

const STOP = new Set(["οἱ", "ὅ", "μιν", "τά", "τῷ", "τίς", "τὶς", "τοῦ", "τὸν", "τῆς", "τὰ", "οἷ", "ᾅ", "ὃ", "ὴ", "οὓς", "ᾧ", "ἧ", "μένος", "υἱὸν", "μῆνιν", "ἄνδρα"]);
const part = new Map();
for (let i = 0; i < books.length; i += 1) {
  for (const b of greek.greekBeings(books[i], posPrior, { minOccurrences: 1 })) {
    if (STOP.has(b.stem)) continue;
    if (!part.has(b.stem)) part.set(b.stem, new Set());
    part.get(b.stem).add(i);
  }
}
const beings = [...part.keys()];
const nBooks = books.length;
const hubs = beings.filter((s) => part.get(s).size / nBooks > 0.4);
const inFrontier = (s) => [...part.get(s)].some((b) => b < FRONTIER);
const inFuture = (s) => [...part.get(s)].some((b) => b >= FRONTIER);

const rng = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const shuffled = (xs, r) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const frontDeg = new Map(beings.map((s) => [s, [...part.get(s)].filter((b) => b < FRONTIER).length]));
const multi = (s) => (frontDeg.get(s) ?? 0) >= 2;
const active = (s) => (frontDeg.get(s) ?? 0) >= 1;

// company-model Kind basins over the FRONTIER books
const coFeat = new Map();
for (const s of beings) if (active(s)) coFeat.set(s, new Map());
for (let b = 0; b < FRONTIER; b++) {
  const locals = beings.filter((s) => part.get(s).has(b));
  for (const a of locals) for (const c of locals) if (c !== a) coFeat.get(a).set(`co:${c}`, (coFeat.get(a).get(`co:${c}`) ?? 0) + 1);
}
const entityFeatures = new Map();
for (const [s, m] of coFeat) {
  const mm = new Map();
  for (const [sig, count] of m) mm.set(sig, { signature: sig, featureKey: "co", featureValue: sig.slice(3), evidenceIds: new Set(Array.from({ length: Math.min(count, 12) }, (_, i) => `${s}:${sig}:${i}`)), firstAt: 0, lastAt: 0, witnessRefs: [] });
  entityFeatures.set(s, mm);
}
const entity = await import(`${KH}/native/kernel/entity-kind-induction.js`);
const kindInd = entity.induceEntityKindCandidates(entityFeatures, { population: "odyssey:frontier", permutations: 40, minKindSize: 3, minPrevalence: 0 });
const basinSet = new Set(); for (const c of kindInd.candidates) for (const s of c.memberRefs) basinSet.add(s);

const test = (pred) => {
  const pairs = beings.map((s) => [(pred(s) ? 1 : 0), inFuture(s) ? 1 : 0]);
  const pos = pairs.filter(([p]) => p === 1), neg = pairs.filter(([p]) => p === 0);
  const posRate = pos.length ? pos.filter(([, l]) => l === 1).length / pos.length : null;
  const negRate = neg.length ? neg.filter(([, l]) => l === 1).length / neg.length : null;
  return { posN: pos.length, negN: neg.length, posRate, negRate, effect: posRate == null || negRate == null ? null : posRate - negRate, base: beings.filter((s) => inFuture(s)).length / beings.length };
};
const shuffleP = (rolesOf) => {
  const roles = beings.map((s) => (rolesOf(s) ? 1 : 0));
  const ys = beings.map((s) => (inFuture(s) ? 1 : 0));
  const observed = test(rolesOf).effect ?? 0;
  const effs = [];
  for (let k = 0; k < 500; k++) {
    const perm = shuffled(roles, rng(60000 + k));
    const pos = [], neg = [];
    for (let i = 0; i < perm.length; i++) (perm[i] === 1 ? pos : neg).push(ys[i]);
    const posR = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : null;
    const negR = neg.length ? neg.reduce((a, b) => a + b, 0) / neg.length : null;
    effs.push((posR == null || negR == null) ? 0 : posR - negR);
  }
  return { p: (effs.filter((e) => e >= observed).length + 1) / (effs.length + 1) };
};

const reads = {
  networkMulti: { ...test(multi), shuffleP: shuffleP(multi).p },
  networkActive: { ...test(active), shuffleP: shuffleP(active).p },
  kindMembership: { ...test((s) => basinSet.has(s)), shuffleP: shuffleP((s) => basinSet.has(s)).p },
};
const earns = (r) => (r.effect ?? -Infinity) >= 0.15 && r.shuffleP <= 0.05;
const winners = Object.entries(reads).filter(([, v]) => earns(v));
const best = winners.length ? winners.sort((a, b) => b[1].effect - a[1].effect)[0][0] : null;

const verdict = best
  ? { verdict: "CONFIRMED", claim: `on the Odyssey's temporal frontier, ${best} earns standing (effect ${reads[best].effect.toFixed(3)}, shuffle-p ${reads[best].shuffleP.toFixed(3)}): multi-occasion participation in books 1-14 predicts participation in books 15-22.` }
  : { verdict: "FALSIFIED", claim: `no reading earned standing on the temporal frontier: ${JSON.stringify(Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, { eff: +(v.effect ?? 0).toFixed(3), sp: +(v.shuffleP ?? 0).toFixed(3) }])))}` };

console.log(JSON.stringify({
  schema: "EOOdysseyFrontierStep16@1",
  seam: { books: nBooks, frontier: FRONTIER, future: nBooks - FRONTIER, beings: beings.length, hubs: hubs, degreeTop: [...part.values()].map((s) => s.size).sort((a, b) => b - a).slice(0, 10) },
  reads: Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, { effect: v.effect == null ? null : +v.effect.toFixed(3), posRate: +(v.posRate ?? 0).toFixed(3), negRate: +(v.negRate ?? 0).toFixed(3), posN: v.posN, negN: v.negN, base: +v.base.toFixed(3), shuffleP: +v.shuffleP.toFixed(4) }])),
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Temporal frontier: train = books 1-14, test/book future = 15-22; the test outcome is fixed, only the reading assignment is shuffled.",
    "Same beings/pipeline as step 15 (noun-class article-noun heads, STOP-filtered), minus triage for the frontier.",
  ],
}, null, 2));