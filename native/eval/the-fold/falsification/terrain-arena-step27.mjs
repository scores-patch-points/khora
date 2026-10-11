// terrain-arena-step27.mjs — THE OTHER SIX STANCES (step 27). The Relate triad
// (Tracing/Binding/Tending) EARNED. This arena runs all six remaining stances
// through the SAME four gates + discriminant against ALL prior anchors (A_new,
// A_fig, A_crowd) + the already-earned stances' anchors (not needed: the prior
// three ARE their anchors). One declared, doctrine-grounded operationalization
// each. Verdict = earned subset; honest PARTIAL expected.
//
// Differentiate (cut apart)
//   Clearing  (Ground)   the field's distinctive boundary: contextDistinct =
//                        1 - mean overlap of its co-book set with others';
//                        anchor A_uniq = #partners it alone has.
//   Dissecting (Figure)  cutting the individual apart: maxPresenceStretch =
//                        longest continuous presence-run; anchored (negatively)
//                        to A_runs = #presence segments (two-sided).
//   Unraveling (Pattern) cutting the arrangement: halfSplit = fraction of its
//                        partner-pairs within the same poem-half; anchored to
//                        A_mixed = #cross-half partner-pairs.
// Generate (bring into being)
//   Cultivating (Ground) nurture: fraction of its appearances that introduce
//                        a NEW co-being; anchored A_grows = #new co-beings it
//                        introduced.
//   Making (Figure)      novel links: fraction of its pairings that are
//                        FIRST occurrences in the poem; anchored A_first = #firsts.
//   Composing (Pattern)  ensembleSpawn: fraction of its books whose co-set is
//                        newly formed; anchored A_spawn = #new co-sets.
// Four gates as always: |rho(own)|>=0.30 & p<=0.05; partial-residual vs the
// other anchors <0.25; |rho(count)|<0.30; unique>=0.15 & raw cv>=0.15.
//
// Usage: node terrain-arena-step27.mjs

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
const half = (b) => (b < nBooks / 2 ? 0 : 1);

// helper caches
const coSet = new Map(beings.map((s) => [s, new Set([...orderB(s)].map((b) => `${s}:${b}`))]));
const runsOf = (s) => { const b = orderB(s); if (!b.length) return []; const r = []; let start = b[0], prev = b[0]; for (let i = 1; i < b.length; i++) { if (b[i] === prev + 1) { prev = b[i]; continue; } r.push([start, prev]); start = b[i]; prev = b[i]; } r.push([start, prev]); return r; };
const pairsByIdx = (s) => { const b = orderB(s); const out = []; for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) out.push([b[i], b[j]]); return out; };
const partnerPairs = new Map();
for (const s of beings) partnerPairs.set(s, pairsByIdx(s));

const A_count = (s) => part.get(s)?.size ?? 0;
// prior anchors (earned stance anchors) for the discriminant test
const A_new = (s) => { const seen = new Set(); for (const [i, p] of partnerPairs.get(s)) { void i; seen.add(p); } return seen.size; };
const A_fig = (s) => { const b = orderB(s); return b.length ? b[b.length - 1] - b[0] : 0; };
const A_crowd = (s) => { const bs = [...(part.get(s) ?? [])].map((b) => books[b].length); const m = bs.reduce((a, b) => a + b, 0) / bs.length; return Math.sqrt(bs.reduce((a, b) => a + (b - m) ** 2, 0) / bs.length); };

// partner book-overlap for Clearing (context distinctness)
const booksOf = (s) => new Set(orderB(s));
// new co-beings introduced by being s in book b
const coInBook = new Map();
for (let b = 0; b < nBooks; b += 1) { const L = beings.filter((x) => part.get(x).has(b)); coInBook.set(b, new Set(L)); }
// first-time pairings in the poem
const firstPair = new Map();
{ const seen = new Set(); for (let b = 0; b < nBooks; b += 1) { const L = coInBook.get(b); const arr = [...L]; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { const k = `${arr[i]}|${arr[j]}`; if (!seen.has(k)) { if (!firstPair.has(arr[i])) firstPair.set(arr[i], 0); if (!firstPair.has(arr[j])) firstPair.set(arr[j], 0); firstPair.set(arr[i], firstPair.get(arr[i]) + 1); firstPair.set(arr[j], firstPair.get(arr[j]) + 1); } seen.add(k); } } }
// new co-sets appearing in a book (the set of co-beings has never been seen before)
const newSetPerBook = new Map();
{ const seen = new Map(); for (let b = 0; b < nBooks; b += 1) { const key = [...coInBook.get(b)].sort().join("|"); if (!seen.has(key)) seen.set(key, b); if (b === seen.get(key)) { void 0; } } }
const newSetBooks = new Set();
{ const seen = new Set(); for (let b = 0; b < nBooks; b += 1) { const key = [...coInBook.get(b)].sort().join("|"); if (!seen.has(key)) newSetBooks.add(b); seen.add(key); } }

// ── the six stances + their anchors ──────────────────────────────────────
const D = {
  Clearing: {
    score: (s) => { const mine = booksOf(s); let tot = 0; for (const o of beings) if (o !== s) { const ov = booksOf(o); let inter = 0; for (const b of mine) if (ov.has(b)) inter++; tot += inter / new Set([...mine, ...ov]).size; } return 1 - tot / (beings.length - 1); },
    anchor: (s) => { const mine = booksOf(s); let uniq = 0; for (const b of mine) { let anyOther = false; for (const o of beings) if (o !== s && part.get(o).has(b)) { anyOther = true; break; } if (!anyOther) uniq++; } return uniq; },
  },
  Dissecting: {
    score: (s) => { const rs = runsOf(s).map(([a, b]) => b - a + 1); return rs.length ? Math.max(...rs) : 0; },
    anchor: (s) => runsOf(s).length,
  },
  Unraveling: {
    score: (s) => { const p = partnerPairs.get(s); if (!p.length) return 0; const same = p.filter(([a, b]) => half(a) === half(b)).length; return same / p.length; },
    anchor: (s) => p_.filter(([a, b]) => half(a) !== half(b)).length,
  },
  Cultivating: {
    score: (s) => { const b = orderB(s); let intro = 0; for (const bb of b) for (const x of coInBook.get(bb)) if (x !== s && !part.get(x).has(bb - 1)) { intro++; break; } return b.length ? intro / b.length : 0; },
    anchor: (s) => { let n = 0; for (const bb of orderB(s)) for (const x of coInBook.get(bb)) if (x !== s && !part.get(x).has(bb - 1)) { n++; } return n; },
  },
  Making: {
    score: (s) => { const total = partnerPairs.get(s).length; const first = (firstPair.get(s) ?? 0); return total ? Math.min(1, first / Math.max(1, total)) : 0; },
    anchor: (s) => firstPair.get(s) ?? 0,
  },
  Composing: {
    score: (s) => { const b = orderB(s); let ns = 0; for (const bb of b) if (newSetBooks.has(bb)) ns++; return b.length ? ns / b.length : 0; },
    anchor: (s) => orderB(s).filter((bb) => newSetBooks.has(bb)).length,
  },
};
// helper to de-lint Unraveling anchor (avoids referencing p_ inside object literal before def):
Object.defineProperty(D.Unraveling, "anchor", { value: (s) => { const p = partnerPairs.get(s); if (!p.length) return 0; return p.filter(([a, b]) => half(a) !== half(b)).length; }, configurable: true, enumerable: true });

const stances = Object.keys(D);
const PRIOR_ANCHORS = ["A_new", "A_fig", "A_crowd"];
const priorArr = { A_new: beings.map((s) => A_new(s)), A_fig: beings.map((s) => A_fig(s)), A_crowd: beings.map((s) => A_crowd(s)) };
const countArr = beings.map((s) => A_count(s));

const S = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shuf = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rank = (arr) => { const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const m = new Map(); idx.forEach((x, i) => m.set(x[1], i)); return m; };
const spearman = (a, b) => { const ra = rank(a), rb = rank(b); const n = a.length; let d = 0; for (let i = 0; i < n; i++) { const dd = ra.get(i) - rb.get(i); d += dd * dd; } return 1 - (6 * d) / (n * (n * n - 1)); };
const resid = (y, x) => { const n = y.length; const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); } const sl = sxx ? sxy / sxx : 0, itc = my - sl * mx; const r = y.map((v, i) => v - (itc + sl * x[i])); const sr = Math.sqrt(r.reduce((a, b) => a + b * b, 0) / n); return r.map((v) => v / (sr + 1e-9)); };
const nullP = (sc, an) => { const obs = spearman(sc, an); const vals = []; for (let k = 0; k < 300; k++) { const r = S(130000 + k); vals.push(spearman(shuf(sc, r), an)); } return { obs, p: (vals.filter((v) => Math.abs(v) >= Math.abs(obs)).length + 1) / (vals.length + 1) }; };

const results = {};
for (const name of stances) {
  const raw = beings.map((s) => (D[name].score(s) ?? 0));
  const anch = beings.map((s) => (D[name].anchor(s) ?? 0));
  const sc = resid(raw, countArr);
  const v = nullP(sc, anch);
  const ownRes = resid(sc, anch);
  const partials = [priorArr.A_new, priorArr.A_fig, priorArr.A_crowd].map((an) => spearman(ownRes, an));
  const nr = nullP(sc, countArr);
  const rm = raw.reduce((a, b) => a + b, 0) / raw.length;
  const rsd = Math.sqrt(raw.reduce((a, b) => a + (b - rm) ** 2, 0) / raw.length);
  results[name] = {
    validity: { rho: +v.obs.toFixed(3), p: +v.p.toFixed(4), held: Math.abs(v.obs) >= 0.30 && v.p <= 0.05 },
    partialDiscriminant: { rhoOthers: partials.map((r) => +r.toFixed(3)), held: partials.every((r) => Math.abs(r) < 0.25) },
    notRarity: { rhoCount: +nr.obs.toFixed(3), held: Math.abs(nr.obs) < 0.30 },
    graded: { cv: +(rsd / (Math.abs(rm) + 1e-9)).toFixed(3), uniq: +(new Set(raw).size / raw.length).toFixed(3), held: new Set(raw).size / raw.length >= 0.15 && rsd / (Math.abs(rm) + 1e-9) >= 0.15 },
  };
  results[name].earned = results[name].validity.held && results[name].partialDiscriminant.held && results[name].notRarity.held && results[name].graded.held;
}
const earnedList = stances.filter((n) => results[n].earned);
const verdict = earnedList.length === stances.length
  ? { verdict: "CONFIRMED", claim: `all six remaining stances earned — the full 9-stance set is complete.` }
  : earnedList.length === 0
    ? { verdict: "FALSIFIED", claim: "none of the six remaining stances earned; each failed at least one named gate on this material." }
    : { verdict: "PARTIAL", claim: `${earnedList.join(", ")} earned (${earnedList.length}/6); the rest failed the named gates — see the table.` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep27@1",
  material: { books: nBooks, beings: beings.length },
  results,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["One declared operationalization per stance (doctrine-grounded); 300-draw two-sided nulls; discriminant tested against the three prior-earned anchors; bars pre-registered as in the header."],
}, null, 2));