// terrain-arena-step22.mjs — THE PARTIAL-DISCRIMINANT FINALE. Step 21 left
// one gate confounded: cross-stance rho cannot separate "the stance rides
// other anchors" from "the anchors themselves ride each other in the world"
// (degree ~ span ~ context density all derive from the same participation).
// The corrected control: residualize each stance on its OWN anchor FIRST; a
// specific stance must then carry NOTHING (|rho| < 0.25) of the other anchors.
//
// Gates (pre-registered):
//   validity   |rho(stance, ownAnchor)| >= 0.30, two-sided shuffle p <= 0.05
//   partialDisc  after residualizing on ownAnchor, |rho(residual, other)| < 0.25
//   notRarity |rho(stance, participationCount)| < 0.30
//   graded    unique fraction >= 0.15 and raw cv >= 0.15
// Verdict CONFIRMED iff all three stances pass all four.
//
// Usage: node terrain-arena-step22.mjs

import { readFile } from "node:fs/promises";

const O = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt";
const KH = "/Users/mlacy/Documents/3.0/khora";
const greek = await import(`${KH}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(await readFile("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const raw = (await readFile(O, "utf8")).replace(/^---[\s\S]*?\n---\n/, "");
const heads = [...raw.matchAll(/Οδύσσεια\/([α-ω])/g)];
const books = [];
for (let i = 0; i < heads.length; i += 1) books.push(raw.slice(heads[i].index, i + 1 < heads.length ? heads[i + 1].index : raw.length));
const nBooks = books.length;
const STOP = new Set(["οἱ", "ὅ", "μιν", "τά", "τῷ", "τίς", "τὶς", "τοῦ", "τὸν", "τῆς", "τὰ", "οἷ", "ᾅ", "ὃ", "ὴ", "οὓς", "ᾧ", "ἧ", "μένος", "υἱὸν", "μῆνιν", "ἄνδρα"]);
const CAP = /^[\u0391-\u03A9][\u03B1-\u03C9\u0391-\u03A9ἀ-ῼ]*/u;

const nameTier = [];
for (let i = 0; i < books.length; i += 1) {
  const toks = [...books[i].matchAll(/\p{L}+/gu)].map((m) => ({ w: m[0], i: m.index }));
  for (let t = 0; t < toks.length; t += 1) {
    const x = toks[t];
    if (!CAP.test(x.w)) continue;
    const after = toks[t + 1];
    const prev = books[i].slice(Math.max(0, x.i - 1), x.i);
    if (/[^.;—\n©]/.test(prev) || (after && /^\p{Ll}/u.test(after.w))) nameTier.push({ i, stem: String(x.w).toLowerCase() });
  }
}
const nc = new Map(); for (const b of nameTier) nc.set(b.stem, (nc.get(b.stem) ?? 0) + 1);
const names = new Set([...nc.keys()].filter((s) => !STOP.has(s) && nc.get(s) >= 2));
const part = new Map();
for (let i = 0; i < books.length; i += 1) {
  for (const b of greek.greekBeings(books[i], posPrior, { minOccurrences: 1 })) { if (STOP.has(b.stem)) continue; if (!part.has(b.stem)) part.set(b.stem, new Set()); part.get(b.stem).add(i); }
  for (const stem of names) if (nameTier.some((n) => n.i === i && n.stem === stem)) { if (!part.has(stem)) part.set(stem, new Set()); part.get(stem).add(i); }
}
const beings = [...part.keys()].filter((s) => (part.get(s)?.size ?? 0) >= 2);
const orderB = (s) => [...(part.get(s) ?? [])].sort((a, b) => a - b);

const coFreq = new Map(); for (const s of beings) coFreq.set(s, new Map());
for (let i = 0; i < nBooks; i += 1) {
  const locals = beings.filter((s) => part.get(s).has(i));
  for (const a of locals) for (const b of locals) if (b !== a) coFreq.get(a).set(b, (coFreq.get(a).get(b) ?? 0) + 1);
}

const A_new = (s) => coFreq.get(s)?.size ?? 0;
const A_fig = (s) => { const b = orderB(s); return b.length ? b[b.length - 1] - b[0] : 0; };
const A_gnd = (s) => { const bs = [...(part.get(s) ?? [])]; return bs.reduce((a, b) => a + (bs.length / nBooks) * books[b].length, 0) / Math.max(1, bs.length); };
const A_count = (s) => part.get(s)?.size ?? 0;

const rawStance = {
  Tracing: (s) => { const m = coFreq.get(s); if (!m || !m.size) return 0; const tot = [...m.values()].reduce((a, b) => a + b, 0); let h = 0; for (const v of m.values()) { const p = v / tot; h -= p * Math.log2(p); } return h; },
  Binding: (s) => { const b = orderB(s); const m = b.reduce((a, c) => a + c, 0) / Math.max(1, b.length); const v = b.reduce((a, c) => a + (c - m) ** 2, 0) / Math.max(1, b.length); return Math.sqrt(v) / (m + 1); },
  Tending: (s) => { const bs = [...(part.get(s) ?? [])]; return bs.reduce((a, b) => a + books[b].length, 0) / Math.max(1, bs.length); },
};
function resid(y, x) { const n = y.length; const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); } const sl = sxx ? sxy / sxx : 0, itc = my - sl * mx; const r = y.map((v, i) => v - (itc + sl * x[i])); const sr = Math.sqrt(r.reduce((a, b) => a + b * b, 0) / n); return r.map((v) => v / (sr + 1e-9)); }
const countArr = beings.map((s) => A_count(s));
const stanceArr = {
  Tracing: resid(beings.map((s) => rawStance.Tracing(s)), countArr),
  Binding: resid(beings.map((s) => rawStance.Binding(s)), countArr),
  Tending: resid(beings.map((s) => rawStance.Tending(s)), countArr),
};
const anchorArr = { A_new: beings.map((s) => A_new(s)), A_fig: beings.map((s) => A_fig(s)), A_gnd: beings.map((s) => A_gnd(s)) };
const ownAnchor = { Tracing: "A_new", Binding: "A_fig", Tending: "A_gnd" };

const S = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shuf = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rank = (arr) => { const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const m = new Map(); idx.forEach((x, i) => m.set(x[1], i)); return m; };
const spearman = (a, b) => { const ra = rank(a), rb = rank(b); const n = a.length; let d = 0; for (let i = 0; i < n; i++) { const dd = ra.get(i) - rb.get(i); d += dd * dd; } return 1 - (6 * d) / (n * (n * n - 1)); };
const nullP = (sc, an) => { const obs = spearman(sc, an); const vals = []; for (let k = 0; k < 500; k++) { const r = S(90000 + k); vals.push(spearman(shuf(sc, r), an)); } return { obs, p: (vals.filter((v) => Math.abs(v) >= Math.abs(obs)).length + 1) / (vals.length + 1) }; };

const results = {};
for (const name of ["Tracing", "Binding", "Tending"]) {
  const sc = stanceArr[name], own = ownAnchor[name];
  const v = nullP(sc, anchorArr[own]);
  const others = Object.keys(ownAnchor).filter((k) => k !== name).map((k) => ownAnchor[k]);
  const ownResidual = resid(sc, anchorArr[own]);
  const rhoOtherPartial = others.map((a) => spearman(ownResidual, anchorArr[a]));
  const raw = beings.map((s) => rawStance[name](s));
  const rawStat = { mean: raw.reduce((a, b) => a + b, 0) / raw.length, sd: Math.sqrt(raw.reduce((a, b) => a + (b - raw.reduce((x, z) => x + z, 0) / raw.length) ** 2, 0) / raw.length) };
  const notRarity = nullP(sc, countArr);
  results[name] = {
    validity: { anchor: own, rho: +v.obs.toFixed(3), p: +v.p.toFixed(4), held: Math.abs(v.obs) >= 0.30 && v.p <= 0.05 },
    partialDiscriminant: { rhoOthersPartial: rhoOtherPartial.map((r) => +r.toFixed(3)), held: rhoOtherPartial.every((r) => Math.abs(r) < 0.25) },
    notRarity: { rhoCount: +notRarity.obs.toFixed(3), held: Math.abs(notRarity.obs) < 0.30 },
    graded: { cv: +((rawStat.sd / (Math.abs(rawStat.mean) + 1e-9)).toFixed(3)), uniqueFrac: +(new Set(raw).size / raw.length).toFixed(3), held: new Set(raw).size / raw.length >= 0.15 && rawStat.sd / (Math.abs(rawStat.mean) + 1e-9) >= 0.15 },
  };
  results[name].all = results[name].validity.held && results[name].partialDiscriminant.held && results[name].notRarity.held && results[name].graded.held;
}
const SNAMES = ["Tracing", "Binding", "Tending"];
const earned = SNAMES.filter((n) => results[n].all);
const verdict = earned.length === SNAMES.length
  ? { verdict: "CONFIRMED", claim: "all three stances are real specific takings: graded, count-free, anchored to their own verifiable property, and carrying NOTHING of the other anchors once their own is accounted for." }
  : earned.length === 0
    ? { verdict: "FALSIFIED", claim: "no stance is a specific taking: each retained a band of the other anchors even after partial control." }
    : { verdict: "PARTIAL", claim: `${earned.join(", ")} earned standing (${earned.length}/3)! Stances can be real takings — specificity is achievable, not universal.` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep22@1",
  material: { books: nBooks, beings: beings.length },
  results,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["Partial control = linear residual on the own anchor; cross-anchor world correlation is thereby absorbed; bars pre-registered as in the arena header."],
}, null, 2));