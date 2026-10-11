// odyssey-enriched-step18.mjs — STEP 18: the enriched seam. Step 16 falsified
// the temporal frontier on the noun-head seam — whose population lacked the
// actual cast (Odysseus, Zeus, Athena absent; the treebank prior has no proper
// names). The RAW TEXT orthographically marks proper names: mid-sentence
// capital initials (Καλυψώ, Διός, Μοῦσα) where the rest of the edition is
// lowercase. This arena ADDS that data-derived name tier (no injected lexicon)
// to the noun-beings, and re-runs the temporal-frontier falsifier:
//   books 1-14 (train) -> participation in books 15-22 (future).
// Readings:
//   networkMulti   being in >= 2 of books 1-14 -> future participation
//   kindMembership company-model basins over frontier books -> future
//   roleMulti      being holds >= 2 distinct subject/object clause-refs in the
//                  frontier (predication-role reading) -> future
// Bars: effect >= 0.15, shuffle-p <= 0.05, strictly best.
//
// Usage: node odyssey-enriched-step18.mjs

import { readFile } from "node:fs/promises";

const O = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt";
const KH = "/Users/mlacy/Documents/3.0/khora";
const greek = await import(`${KH}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(await readFile("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(await readFile("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));
const raw = (await readFile(O, "utf8")).replace(/^---[\s\S]*?\n---\n/, "");
const heads = [...raw.matchAll(/Οδύσσεια\/([α-ω])/g)];
const books = [];
for (let i = 0; i < heads.length; i += 1) books.push(raw.slice(heads[i].index, i + 1 < heads.length ? heads[i + 1].index : raw.length));
const FRONTIER = 14;
const ALL = greek.confirmedVerbSet(posPrior);

const STOP = new Set(["οἱ", "ὅ", "μιν", "τά", "τῷ", "τίς", "τὶς", "τοῦ", "τὸν", "τῆς", "τὰ", "οἷ", "ᾅ", "ὃ", "ὴ", "οὓς", "ᾧ", "ἧ", "μένος", "υἱὸν", "μῆνιν", "ἄνδρα"]);

// ── the DATA-DERIVED proper-name tier: mid-sentence capital initials ─────
const CAP = /^[\u0391-\u03A9][\u03B1-\u03C9\u0391-\u03A9ἀ-ῼ]*/u;
const nameTier = [];
for (let i = 0; i < books.length; i += 1) {
  const text = books[i];
  const toks = [...text.matchAll(/\p{L}+/gu)].map((m) => ({ w: m[0], i: m.index }));
  for (let t = 0; t < toks.length; t += 1) {
    const x = toks[t];
    if (!CAP.test(x.w)) continue;
    const prev = text.slice(Math.max(0, x.i - 1), x.i);
    // sentence-initial capitals are the edition's start-of-line convention,
    // not names: require a mid-sentence context (preceded by a non-separator,
    // or a following space + lowercase word)
    const after = toks[t + 1];
    const inside = /[^.;—\n©]/.test(prev);
    const continues = after && /^\p{Ll}/u.test(after.w);
    if (inside || continues) nameTier.push({ i, w: x.w, stem: String(x.w).toLowerCase() });
  }
}
const nameCount = new Map();
for (const n of nameTier) nameCount.set(n.stem, (nameCount.get(n.stem) ?? 0) + 1);
const names = [...nameCount.keys()].filter((s) => !STOP.has(s) && (nameCount.get(s) ?? 0) >= 2);

// ── population: noun-beings (step-15 tier) UNION proper names ────────────
const part = new Map(); // stem -> Set(book index)
for (let i = 0; i < books.length; i += 1) {
  for (const b of greek.greekBeings(books[i], posPrior, { minOccurrences: 1 })) {
    if (STOP.has(b.stem)) continue;
    if (!part.has(b.stem)) part.set(b.stem, new Set());
    part.get(b.stem).add(i);
  }
  for (const stem of names) {
    // a name "participates" in a book if it is capitalized there enough
    const inBook = nameTier.filter((n) => n.i === i && n.stem === stem).length;
    if (inBook >= 1) { if (!part.has(stem)) part.set(stem, new Set()); part.get(stem).add(i); }
  }
}
const beings = [...part.keys()];
const inFrontier = (s) => [...(part.get(s) ?? [])].some((b) => b < FRONTIER);
const inFuture = (s) => [...(part.get(s) ?? [])].some((b) => b >= FRONTIER);
const hubs = beings.filter((s) => (part.get(s)?.size ?? 0) / books.length > 0.4);

// ── readings on FRONTIER books ───────────────────────────────────────────
const frontDeg = new Map(beings.map((s) => [s, [...(part.get(s) ?? [])].filter((b) => b < FRONTIER).length]));
const multi = (s) => (frontDeg.get(s) ?? 0) >= 2;

// role reading: subject/object clause refs across frontier books
const refsByBeing = new Map();
for (let i = 0; i < FRONTIER; i++) {
  const localBeings = beings.filter((s) => part.get(s).has(i));
  const beingList = localBeings.map((s) => ({ stem: s }));
  for (const sent of books[i].split(/(?<=[.;—])/g)) {
    if (sent.trim().length < 4) continue;
    for (const c of greek.greekClauses(sent.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20, beings: beingList })) {
      for (const ref of [c.subjectRef, c.objectRef]) {
        if (!ref) continue;
        const stem = ref.replace(/^ref:grc:auto:/, "");
        if (!refsByBeing.has(stem)) refsByBeing.set(stem, new Set());
        refsByBeing.get(stem).add(`${c.verb ?? "?"}${c.objectRef === ref ? ":o" : ":s"}`);
      }
    }
  }
}
const roleMulti = (s) => (refsByBeing.get(s)?.size ?? 0) >= 2;

// kind membership: company-model basins over frontier books
const coFeat = new Map();
for (const s of beings) if (inFrontier(s)) coFeat.set(s, new Map());
for (let i = 0; i < FRONTIER; i++) {
  const locals = beings.filter((s) => part.get(s).has(i));
  for (const a of locals) if (coFeat.has(a)) for (const c of locals) if (c !== a) coFeat.get(a).set(`co:${c}`, (coFeat.get(a).get(`co:${c}`) ?? 0) + 1);
}
const ent = new Map();
for (const [s, m] of coFeat) {
  const mm = new Map();
  for (const [sig, count] of m) mm.set(sig, { signature: sig, featureKey: "co", featureValue: sig.slice(3), evidenceIds: new Set(Array.from({ length: Math.min(count, 12) }, (_, i) => `${s}:${sig}:${i}`)), firstAt: 0, lastAt: 0, witnessRefs: [] });
  ent.set(s, mm);
}
const entity = await import(`${KH}/native/kernel/entity-kind-induction.js`);
const kindInd = entity.induceEntityKindCandidates(ent, { population: "odyssey:enriched", permutations: 40, minKindSize: 3, minPrevalence: 0 });
const basinSet = new Set(); for (const c of kindInd.candidates) for (const r of c.memberRefs) basinSet.add(r);

const rng = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const shuffled = (xs, r) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
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
    const perm = shuffled(roles, rng(63000 + k));
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
  roleMulti: { ...test(roleMulti), shuffleP: shuffleP(roleMulti).p },
  kindMembership: { ...test((s) => basinSet.has(s)), shuffleP: shuffleP((s) => basinSet.has(s)).p },
};
const earns = (r) => (r.effect ?? -Infinity) >= 0.15 && r.shuffleP <= 0.05;
const winners = Object.entries(reads).filter(([, v]) => earns(v));
const best = winners.length ? winners.sort((a, b) => b[1].effect - a[1].effect)[0][0] : null;

const verdict = best
  ? { verdict: "CONFIRMED", claim: `with the cast in, on the enriched seam, ${best} earns on the temporal frontier (effect ${reads[best].effect.toFixed(3)}, shuffle-p ${reads[best].shuffleP.toFixed(3)}) — the null breaks where it should: when the actors themselves are in the population.` }
  : { verdict: "FALSIFIED", claim: `even with the proper-name tier added, no reading earns on the temporal frontier: ${JSON.stringify(Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, { eff: +(v.effect ?? 0).toFixed(3), sp: +(v.shuffleP ?? 0).toFixed(3) }])))} — the mechanical null holds against co-occurrence, membership, degree, topology, AND roles with the cast present.` };

console.log(JSON.stringify({
  schema: "EOOdysseyEnrichedStep18@1",
  seam: { books: books.length, frontier: FRONTIER, beings: beings.length, properNames: names.length, hubs: hubs, hubNames: hubs.slice(0, 10), degreeTop: [...part.values()].map((s) => s.size).sort((a, b) => b - a).slice(0, 12) },
  reads: Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, { effect: v.effect == null ? null : +v.effect.toFixed(3), posRate: +(v.posRate ?? 0).toFixed(3), negRate: +(v.negRate ?? 0).toFixed(3), posN: v.posN, negN: v.negN, base: +v.base.toFixed(3), shuffleP: +v.shuffleP.toFixed(4) }])),
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Proper-name tier is DATA-DERIVED (mid-sentence capital initials in the lowercase-polytonic edition), not an injected lexicon; names requiring >= 2 poems.",
    "Identical temporal-frontier instrument and bars to steps 15/16/16b/17; the population is the only change.",
  ],
}, null, 2));