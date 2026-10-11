// terrain-arena-step19b.mjs — STANCE DISCRIMINATION ON A DENSE SEAM. Step 19
// FALSIFIED G1 on the sparse Rigveda: three Relate-stances (Tracing/Binding/
// Tending) all collapse onto rarity — the material lacked the density to
// separate "arrangement who you ride with" from "figure how you flicker."
// The enriched Greek Odyssey seam (388 beings, hub-rich, dense participation
// across 22 books) has that structure. Re-run G1 there: do the three stances
// produce genuinely different orderings of the SAME beings?
//   Tracing (Pattern) arrangement entropy of who the being repeatedly co-appears with
//   Binding (Figure)  turnover of the being's appearances across book-halves
//   Tending (Ground)  ambient density of the books the being appears in
// G1 held iff max pairwise Spearman < 0.9 (the stances are distinct takings).
//
// Usage: node terrain-arena-step19b.mjs

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
const nameCount = new Map();
for (const b of nameTier) nameCount.set(b.stem, (nameCount.get(b.stem) ?? 0) + 1);
const names = new Set([...nameCount.keys()].filter((s) => !STOP.has(s) && nameCount.get(s) >= 2));

const part = new Map(); // stem -> Set(bookIndex)
for (let i = 0; i < books.length; i += 1) {
  for (const b of greek.greekBeings(books[i], posPrior, { minOccurrences: 1 })) {
    if (STOP.has(b.stem)) continue;
    if (!part.has(b.stem)) part.set(b.stem, new Set());
    part.get(b.stem).add(i);
  }
  for (const stem of names) if (nameTier.some((n) => n.i === i && n.stem === stem)) {
    if (!part.has(stem)) part.set(stem, new Set());
    part.get(stem).add(i);
  }
}
const beings = [...part.keys()].filter((s) => (part.get(s)?.size ?? 0) >= 2); // multi-occasion only: dense

// TRACING (Pattern): arrangement entropy of co-appearance partners per being
const coFreq = new Map();
for (const s of beings) coFreq.set(s, new Map());
for (let i = 0; i < nBooks; i += 1) {
  const locals = beings.filter((s) => part.get(s).has(i));
  for (const a of locals) for (const b of locals) if (b !== a) coFreq.get(a).set(b, (coFreq.get(a).get(b) ?? 0) + 1);
}
const tracing = (s) => {
  const m = coFreq.get(s); if (!m || !m.size) return 1;
  const tot = [...m.values()].reduce((a, b) => a + b, 0);
  let h = 0; for (const v of m.values()) { const p = v / tot; h -= p * Math.log2(p); }
  return m.size === 1 ? 1 : h / Math.log2(m.size);
};

// BINDING (Figure): turnover of appearances across book-halves
const halfOf = (b) => (b < nBooks / 2 ? 0 : 1);
const binding = (s) => {
  const counts = [0, 0];
  for (const b of part.get(s) ?? []) counts[halfOf(b)] += 1;
  const mean = (counts[0] + counts[1]) / 2;
  const v = ((counts[0] - mean) ** 2 + (counts[1] - mean) ** 2) / 2;
  return -Math.log2(Math.sqrt(v) / (mean + 1) + 0.01) / Math.log2(2);
};

// TENDING (Ground): ambient density of the books the being appears in
const bookSize = books.map((b) => b.length);
const tending = (s) => {
  const ds = [...(part.get(s) ?? [])].map((b) => bookSize[b]);
  const m = ds.reduce((a, b) => a + b, 0) / ds.length;
  return Math.log2(m) / Math.log2(Math.max(...bookSize));
};

const stances = { Tracing: tracing, Binding: binding, Tending: tending };
const order = (name) => beings.map((s) => s).sort((a, b) => stances[name](b) - stances[name](a));
const rank = (arr) => { const m = new Map(); arr.forEach((r, i) => m.set(r, i)); return m; };
const spearman = (a, b, into) => {
  const ra = rank(a), rb = rank(b);
  const n = into.length;
  let d2 = 0; for (const r of into) { const d = (ra.get(r) ?? 0) - (rb.get(r) ?? 0); d2 += d * d; }
  return 1 - (6 * d2) / (n * (n * n - 1));
};
const inj = [...beings];
const corr = {
  Tracing_vs_Binding: +spearman(order("Tracing"), order("Binding"), inj).toFixed(3),
  Tracing_vs_Tending: +spearman(order("Tracing"), order("Tending"), inj).toFixed(3),
  Binding_vs_Tending: +spearman(order("Binding"), order("Tending"), inj).toFixed(3),
};
const G1 = { held: Math.max(...Object.values(corr)) < 0.9, corr };

const verdict = G1.held
  ? { verdict: "CONFIRMED", claim: `on a dense real seam, the three Relate-stances are genuinely distinct takings of the SAME beings: max pairwise Spearman ${Math.max(...Object.values(corr))} — stance is real, not a collapsed label.` }
  : { verdict: "FALSIFIED", claim: `even on the dense Odyssey seam the stances collapse (max Spearman ${Math.max(...Object.values(corr))}) — stance remained a fiction in these operationalizations.` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep19b@1",
  material: { books: nBooks, beings: beings.length },
  G1,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["Stance scorings are mechanical (arrangement-entropy / half-turnover / book-density); declared, not fitted.", "Being tier = noun-heads + data-derived proper names, multi-occasion only."],
}, null, 2));