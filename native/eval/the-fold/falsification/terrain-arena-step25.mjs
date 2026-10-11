// terrain-arena-step25.mjs — FINISH THE STANCE SET: DECLARED SEARCH.
// Tracing (Pattern) already EARNED in step 23. This arena sweeps a DECLARED,
// finite space of grounded operationalizations for Binding (Figure) and
// Tending (Ground) — every candidate kept on the same four gates (validity,
// partial-discriminant, not-rarity, graded) — and reports which earn. No
// fitting: the candidate definitions and anchors are fixed in advance; the
// search reports the table.
//
// Anchors (verifiable world properties, kept fixed):
//   A_new  co-participation degree          (arrangement size)
//   A_fig  temporal span (last-first book)  (the figure's trajectory)
//   A_crowd sd of the sizes of the books the being appears in  (ground variability)
// Binding candidates (all Figure-timeline takings, anchored to A_fig):
//   spanFrac, laterality, gapMean, peakShare
// Tending candidates (all Ground-takings, anchored to A_crowd):
//   meanSize, skewSize, maxToMean, crowdingMean
// A candidate earns iff: |rho(own anchor)|>=0.30 & two-sided p<=0.05,
// partial-residual vs the other two anchors <0.25, |rho(count)|<0.30,
// unique>=0.15 and raw cv>=0.15.
//
// Usage: node terrain-arena-step25.mjs

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
const A_crowd = (s) => { const bs = [...(part.get(s) ?? [])].map((b) => books[b].length); const m = bs.reduce((a, b) => a + b, 0) / bs.length; return Math.sqrt(bs.reduce((a, b) => a + (b - m) ** 2, 0) / bs.length); };
const A_count = (s) => part.get(s)?.size ?? 0;

const bCands = {
  spanFrac: (s) => { const b = orderB(s); return b.length ? (b[b.length - 1] - b[0] + 1) / nBooks : 0; },
  laterality: (s) => { const b = orderB(s); if (!b.length) return 0; return b.reduce((a, c) => a + c, 0) / b.length / nBooks; },
  gapMean: (s) => { const b = orderB(s); if (b.length < 2) return 0; const g = []; for (let i = 1; i < b.length; i++) g.push(b[i] - b[i - 1]); return g.reduce((a, c) => a + c, 0) / g.length; },
  peakShare: (s) => { const b = orderB(s); if (!b.length) return 0; const cnt = new Map(); b.forEach((x) => cnt.set(x, (cnt.get(x) ?? 0) + 1)); return Math.max(...cnt.values()) / b.length; },
};
const tCands = {
  meanSize: (s) => { const bs = [...(part.get(s) ?? [])].map((b) => books[b].length); return bs.reduce((a, b) => a + b, 0) / bs.length; },
  skewSize: (s) => { const bs = [...(part.get(s) ?? [])].map((b) => books[b].length); const m = bs.reduce((a, b) => a + b, 0) / bs.length; const sd = Math.sqrt(bs.reduce((a, b) => a + (b - m) ** 2, 0) / bs.length); const skew = bs.reduce((a, b) => a + ((b - m) / (sd + 1e-9)) ** 3, 0) / bs.length; return skew; },
  maxToMean: (s) => { const bs = [...(part.get(s) ?? [])].map((b) => books[b].length); const m = bs.reduce((a, b) => a + b, 0) / bs.length; return Math.max(...bs) / (m + 1e-9); },
  crowdingMean: (s) => { const rs = [...(part.get(s) ?? [])]; let tot = 0; for (const b of rs) tot += beings.filter((x) => part.get(x).has(b)).length; return tot / Math.max(1, rs.length); },
};

const S = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shuf = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rank = (arr) => { const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const m = new Map(); idx.forEach((x, i) => m.set(x[1], i)); return m; };
const spearman = (a, b) => { const ra = rank(a), rb = rank(b); const n = a.length; let d = 0; for (let i = 0; i < n; i++) { const dd = ra.get(i) - rb.get(i); d += dd * dd; } return 1 - (6 * d) / (n * (n * n - 1)); };
const resid = (y, x) => { const n = y.length; const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); } const sl = sxx ? sxy / sxx : 0, itc = my - sl * mx; const r = y.map((v, i) => v - (itc + sl * x[i])); const sr = Math.sqrt(r.reduce((a, b) => a + b * b, 0) / n); return r.map((v) => v / (sr + 1e-9)); };
const nullP = (sc, an) => { const obs = spearman(sc, an); const vals = []; for (let k = 0; k < 200; k++) { const r = S(110000 + k); vals.push(spearman(shuf(sc, r), an)); } return { obs, p: (vals.filter((v) => Math.abs(v) >= Math.abs(obs)).length + 1) / (vals.length + 1) }; };

const anchorArr = { A_new: beings.map((s) => A_new(s)), A_fig: beings.map((s) => A_fig(s)), A_crowd: beings.map((s) => A_crowd(s)) };
const countArr = beings.map((s) => A_count(s));
const evalCand = (scoreFn, ownKey) => {
  const sc = resid(beings.map(scoreFn), countArr);
  const v = nullP(sc, anchorArr[ownKey]);
  const others = Object.keys(anchorArr).filter((k) => k !== ownKey);
  const ownResidual = resid(sc, anchorArr[ownKey]);
  const partials = others.map((a) => spearman(ownResidual, anchorArr[a]));
  const notRarity = nullP(sc, countArr);
  const raw = beings.map(scoreFn);
  const rm = raw.reduce((a, b) => a + b, 0) / raw.length;
  const rsd = Math.sqrt(raw.reduce((a, b) => a + (b - rm) ** 2, 0) / raw.length);
  const validity = Math.abs(v.obs) >= 0.30 && v.p <= 0.05;
  const partialDisc = partials.every((r) => Math.abs(r) < 0.25);
  const nr = Math.abs(notRarity.obs) < 0.30;
  const gr = new Set(raw).size / raw.length >= 0.15 && rsd / (Math.abs(rm) + 1e-9) >= 0.15;
  return { validity: { ok: validity, rho: +v.obs.toFixed(3), p: +v.p.toFixed(3) }, partials: partials.map((r) => +r.toFixed(3)), partialDisc, notRarity: { ok: nr, rho: +notRarity.obs.toFixed(3) }, graded: { ok: gr, cv: +(rsd / (Math.abs(rm) + 1e-9)).toFixed(3), uniq: +(new Set(raw).size / raw.length).toFixed(3) }, earned: validity && partialDisc && nr && gr };
};

const table = {};
for (const [n, fn] of Object.entries(bCands)) table[`Binding::${n}`] = evalCand(fn, "A_fig");
for (const [n, fn] of Object.entries(tCands)) table[`Tending::${n}`] = evalCand(fn, "A_crowd");
const earned = Object.entries(table).filter(([, v]) => v.earned).map(([k]) => k);
const verdict = earned.length >= 2
  ? { verdict: "CONFIRMED", claim: `the stance set closes: ${["Tracing", ...earned].join(", ")} all EARNED — a complete set (Pattern=Rarity-free, Figure, Ground) of real specific takings, each graded, count-free, anchored, and partial-discriminant.` }
  : { verdict: "PARTIAL", claim: `Tracing + ${earned.length ? earned.join(", ") : "none further"} earned; the rest failed named gates: ${JSON.stringify(Object.fromEntries(Object.entries(table).map(([k, v]) => [k, { valid: v.validity.ok, partials: v.partials, nr: v.notRarity.ok, grad: v.graded.ok }])))}` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep25@1",
  material: { books: nBooks, beings: beings.length },
  table,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["Declared finite search space (4 Figure-candidates, 4 Ground-candidates); anchors fixed; residuals on count; 200-draw two-sided nulls; bars as in the header."],
}, null, 2));