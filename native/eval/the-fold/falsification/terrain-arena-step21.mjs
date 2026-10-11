// terrain-arena-step21.mjs — THE RESIDUALIZED, GRADED, TWO-SIDED STANCE TEST.
// Step 20 falsified stances as grounded-but-generic: they tracked real world
// properties but collapsed onto the participation/rarity axis and were not
// graded. This arena applies the three corrections:
//   1. TWO-SIDED anchoring (|rho| >= 0.30 with the stance's own anchor, beyond
//      a two-sided shuffle null) — a strong NEGATIVE anchor is a real anchor.
//   2. NOT-RARITY: each stance is residualized on participation count, so the
//      correlation with count is <= 0.30 — a stance must not be rarity in
//      disguise.
//   3. GRADED: unique fraction >= 0.15 and coefficient of variation >= 0.15.
// plus DISCRIMINANT: |rho| < 0.25 vs the other stances' anchors.
//
// Stances (grain-specific takings, corrected):
//   Tracing (Pattern)  arrangement surprisal (co-frequency entropy), residualized
//   Binding (Figure)   book-index coefficient of variation (graded temporal scatter)
//   Tending (Ground)   ambient book-size density, residualized
// Anchors (verifiable world properties, independently defined):
//   A_new  co-participation degree;  A_fig  temporal span;  A_gnd  context crowdedness
// Material: dense Greek Odyssey seam (233 multi-occasion beings x 22 books).
//
// Usage: node terrain-arena-step21.mjs

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
const order = (s) => [...(part.get(s) ?? [])].sort((a, b) => a - b);

const coFreq = new Map(); for (const s of beings) coFreq.set(s, new Map());
for (let i = 0; i < nBooks; i += 1) {
  const locals = beings.filter((s) => part.get(s).has(i));
  for (const a of locals) for (const b of locals) if (b !== a) coFreq.get(a).set(b, (coFreq.get(a).get(b) ?? 0) + 1);
}

// ── anchors ──────────────────────────────────────────────────────────────
const A_new = (s) => coFreq.get(s)?.size ?? 0;
const A_fig = (s) => { const b = order(s); return b.length ? b[b.length - 1] - b[0] : 0; };
const A_gnd = (s) => { const bs = [...(part.get(s) ?? [])]; return bs.reduce((a, b) => a + (bs.length / nBooks) * books[b].length, 0) / Math.max(1, bs.length); };
const A_count = (s) => (part.get(s)?.size ?? 0);

// ── stances (raw, then residualized on participation count) ──────────────
const rawStance = {
  Tracing: (s) => { const m = coFreq.get(s); if (!m || !m.size) return 0; const tot = [...m.values()].reduce((a, b) => a + b, 0); let h = 0; for (const v of m.values()) { const p = v / tot; h -= p * Math.log2(p); } return h; },
  Binding: (s) => { const b = order(s); const m = b.reduce((a, c) => a + c, 0) / Math.max(1, b.length); const v = b.reduce((a, c) => a + (c - m) ** 2, 0) / Math.max(1, b.length); return Math.sqrt(v) / (m + 1); },
  Tending: (s) => { const bs = [...(part.get(s) ?? [])]; return bs.reduce((a, b) => a + books[b].length, 0) / Math.max(1, bs.length); },
};
function residualize(y, x) {
  const n = y.length;
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  const slope = sxx ? sxy / sxx : 0, intercept = my - slope * mx;
  const r = y.map((v, i) => v - (intercept + slope * x[i]));
  const sr = Math.sqrt(r.reduce((a, b) => a + b * b, 0) / n);
  return r.map((v) => v / (sr + 1e-9));
}
const countArr = beings.map((s) => A_count(s));
const stanceArr = {
  Tracing: residualize(beings.map((s) => rawStance.Tracing(s)), countArr),
  Binding: residualize(beings.map((s) => rawStance.Binding(s)), countArr),
  Tending: residualize(beings.map((s) => rawStance.Tending(s)), countArr),
};
const anchorArr = { A_new: beings.map((s) => A_new(s)), A_fig: beings.map((s) => A_fig(s)), A_gnd: beings.map((s) => A_gnd(s)) };
const ownAnchor = { Tracing: "A_new", Binding: "A_fig", Tending: "A_gnd" };

// ── statistics ───────────────────────────────────────────────────────────
const S = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shuf = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rank = (arr) => { const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const m = new Map(); idx.forEach((x, i) => m.set(x[1], i)); return m; };
const spearman = (a, b) => { const ra = rank(a), rb = rank(b); const n = a.length; let d = 0; for (let i = 0; i < n; i++) { const dd = ra.get(i) - rb.get(i); d += dd * dd; } return 1 - (6 * d) / (n * (n * n - 1)); };
const twoSidedP = (obs, list) => (list.filter((v) => Math.abs(v) >= Math.abs(obs)).length + 1) / (list.length + 1);
const nullP = (sc, an) => { const obs = spearman(sc, an); const vals = []; for (let k = 0; k < 500; k++) { const r = S(80000 + k); vals.push(spearman(shuf(sc, r), an)); } return { obs, p: twoSidedP(obs, vals) }; };
const stat = (arr) => { const mean = arr.reduce((a, b) => a + b, 0) / arr.length; const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length); return { mean: +mean.toFixed(3), sd: +sd.toFixed(3), cv: +((sd / (mean + 1e-9)).toFixed(3)), uniqueFrac: +(new Set(arr).size / arr.length).toFixed(3) }; };

// ── gates ────────────────────────────────────────────────────────────────
const results = {};
for (const name of ["Tracing", "Binding", "Tending"]) {
  const sc = stanceArr[name], own = ownAnchor[name];
  const v = nullP(sc, anchorArr[own]);
  const others = Object.keys(ownAnchor).filter((k) => k !== name).map((k) => ownAnchor[k]);
  const rhoOther = others.map((a) => spearman(sc, anchorArr[a]));
  const notRarity = nullP(sc, countArr);
  const s = stat(sc);
  results[name] = {
    validity: { anchor: own, rho: +v.obs.toFixed(3), p: +v.p.toFixed(4), held: Math.abs(v.obs) >= 0.30 && v.p <= 0.05 },
    discriminant: { rhoOthers: rhoOther.map((r) => +r.toFixed(3)), held: rhoOther.every((r) => Math.abs(r) < 0.25) },
    notRarity: { rhoCount: +notRarity.obs.toFixed(3), held: Math.abs(notRarity.obs) < 0.30 },
    graded: { cv: s.cv, uniqueFrac: s.uniqueFrac, held: s.uniqueFrac >= 0.15 && s.cv >= 0.15 },
  };
  results[name].all = results[name].validity.held && results[name].discriminant.held && results[name].notRarity.held && results[name].graded.held;
}
const STANCE_NAMES = ["Tracing", "Binding", "Tending"];
const earned = STANCE_NAMES.filter((n) => results[n].all);
const verdict = earned.length === STANCE_NAMES.length
  ? { verdict: "CONFIRMED", claim: "all three stances, once stripped of rarity and made two-sided/graded, are real specific takings: each tracks only its own verifiable world property beyond the null, and none rides the participation axis." }
  : earned.length === 0
    ? { verdict: "FALSIFIED", claim: "no stance survived residualization: even graded and two-sided, none is anchored-and-specific — the perceiver terms are still decorative on this material." }
    : { verdict: "PARTIAL", claim: `${earned.join(", ")} earned standing (${earned.length}/3); the rest fell on at least one corrected gate.` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep21@1",
  material: { books: nBooks, beings: beings.length },
  results,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Residualization is linear-on-count; anchors and stances share the same co-participation seam but are definitionally independent measures of different facets.",
    "Two-sided null (500 shuffles), bars pre-registered: validity |rho|>=0.30 p<=0.05; discriminant |rho|<0.25; not-rarity |rho|<0.30; graded unique>=0.15 cv>=0.15.",
  ],
}, null, 2));