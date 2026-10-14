// scene/omnilingual-concepts.mjs — OMNILINGUAL CONCEPTS, as HYPERLEXICON ROWS, from the UDHR parallel.  (2026-10-14)
//
//   node eval/the-fold/scene/omnilingual-concepts.mjs [--out <prior path>]
//
// "Use the hyperlexicon to create omnilingual concepts" (the user, 2026-10-14). The hyperlexicon is the ledger of what the reading
// may take as established, each row with a giver and witnesses at byte addresses (kernel/hyperlexicon.js). A concept that is the
// same across languages is exactly that kind of thing: an IDENTITY, not a string — δικαιοσύνη, justice, justicia, справедливость
// are one concept because the same article says them, not because they look alike. So each omnilingual concept is a set of
// hyperlexicon rows `concept:<pivot> — <lang>:<form>`, standing `candidate` (measured, not yet given by a charter-bound giver),
// with the UDHR paragraphs it was pinned at as witnesses — `<file>#<byte>` into that language's own text — and the permutation
// null that admitted it recorded.
//
// HOW A FORM IS PINNED (Champollion: the Rosetta is the GRID, never content):
//   1. The UDHR's paragraphs are aligned across languages — by index where the counts agree, by a monotone length alignment
//      where they differ. Each aligned paragraph is a UNIT.
//   2. A word's APPEARANCE is the set of units it occurs in. A word in one unit pins nothing; a word in a quarter of the units
//      is a function word (the UDHR's own ~91 units make both bounds a counting fact, not a taste).
//   3. A foreign word is pinned to a pivot word when each is the OTHER's UNIQUE best match by cosine of appearance (mutual best, no
//      tie) AND the cosine exceeds the best that any of 10 permutations of the foreign units reached for that pivot word.
//   4. CLOSURE — a concept pinned in A and in B should also pin A to B DIRECTLY. That is a held-out agreement the pivot never saw;
//      its rate over language pairs is reported against a random-partner null. A grid that is only English-shaped fails it.
//
// Languages whose words cannot be split on whitespace (Han, Kana, Thai …) are left out and listed: a gap, never a guess.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const UDHR = "/Users/mlacy/Documents/3.0/Zenodotus/06-government-legal/un-udhr";
const OUT = path.resolve(opt("--out", "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-omnilingual-concepts-v1.json"));
const PIVOT = "eng";
const SEED = 20261014, PERMS = 10, CLOSURE_PAIRS = 60;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ς/g, "σ");
const wordsOf = (s) => (fold(s).match(/\p{L}{3,}/gu) ?? []);
const popcount = (x) => { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; };

// paragraphs, each with its BYTE offset in the file (the witness address)
function parasOf(file) {
  const raw = fs.readFileSync(file, "utf8");
  const fm = /^---[\s\S]*?\n---\n/.exec(raw); const base = fm ? fm[0].length : 0;
  const text = raw.slice(base);
  const out = []; const re = /\S[\s\S]*?(?=\n\s*\n|$)/g; let m;
  while ((m = re.exec(text)) !== null) { const p = m[0].replace(/\s+/g, " ").trim(); if (p) out.push({ text: p, byte: Buffer.byteLength(raw.slice(0, base + m.index), "utf8") }); }
  while (out.length && /^(Universal Declaration|Language:|Adopted:|Publisher:)/.test(out[0].text)) out.shift();
  return out;
}
function align(a, b) {
  if (a.length === b.length) return a.map((_, i) => [i, i]);
  const r = b.reduce((s, x) => s + x.text.length, 0) / a.reduce((s, x) => s + x.text.length, 0);
  const cost = (i, j) => Math.abs(Math.log(((b[j].text.length + 8) / (a[i].text.length + 8)) / r));
  const n = a.length, m = b.length, INF = 1e9, skip = 1.2;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF)); const T = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  D[0][0] = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (i < n && j < m && D[i][j] + cost(i, j) < D[i + 1][j + 1]) { D[i + 1][j + 1] = D[i][j] + cost(i, j); T[i + 1][j + 1] = 1; }
    if (i < n && D[i][j] + skip < D[i + 1][j]) { D[i + 1][j] = D[i][j] + skip; T[i + 1][j] = 2; }
    if (j < m && D[i][j] + skip < D[i][j + 1]) { D[i][j + 1] = D[i][j] + skip; T[i][j + 1] = 3; }
  }
  const out = []; let i = n, j = m;
  while (i > 0 || j > 0) { const t = T[i][j]; if (t === 1) { out.push([i - 1, j - 1]); i--; j--; } else if (t === 2) i--; else j--; }
  return out.reverse();
}

const E = parasOf(path.join(UDHR, `udhr-${PIVOT}.txt`));
const U = E.length, WORDS32 = Math.ceil(U / 32);
// appearance as bitsets in the PIVOT's unit frame
const bitsOf = (paras, pairs, side) => {
  const m = new Map();
  for (const [i, j] of pairs) for (const w of new Set(wordsOf((side === 0 ? E[i] : paras[j]).text))) { let b = m.get(w); if (!b) m.set(w, (b = new Uint32Array(WORDS32))); b[i >>> 5] |= 1 << (i & 31); }
  return m;
};
const cnt = (b) => { let n = 0; for (const x of b) n += popcount(x); return n; };
const cosB = (a, na, b, nb) => { let s = 0; for (let k = 0; k < WORDS32; k++) s += popcount(a[k] & b[k]); return s / Math.sqrt(na * nb); };
const live = (m) => [...m.entries()].map(([w, b]) => ({ w, b, n: cnt(b) })).filter((x) => x.n >= 2 && x.n <= U * 0.25);

const files = fs.readdirSync(UDHR).filter((f) => /^udhr-[a-z0-9_]+\.txt$/.test(f)).sort();
const concepts = new Map();                              // pivot word → { forms: { lang: {form, cos, units} } }
const perLang = {}; const skipped = {};
const langData = new Map();                              // lang → { paras, pairs, bits } for the closure check
const pe = bitsOf(E, E.map((_, i) => [i, i]), 0);
const peL = live(pe);
for (const f of files) {
  const L = f.replace(/^udhr-/, "").replace(/\.txt$/, "");
  if (L === PIVOT) continue;
  let P; try { P = parasOf(path.join(UDHR, f)); } catch { skipped[L] = "unreadable"; continue; }
  if (P.length < 60 || P.length > 140) { skipped[L] = `${P.length} paragraphs`; continue; }
  const pairs = align(E, P);
  const fo = bitsOf(P, pairs, 1);
  const foL = live(fo);
  if (foL.length < 120) { skipped[L] = `${foL.length} usable words (not whitespace-delimited)`; continue; }
  // permutation null: the foreign side's unit labels permuted (the same for every word)
  const permBest = new Map(peL.map((x) => [x.w, 0]));
  const units = [...new Set(pairs.map((p) => p[0]))];
  for (let d = 0; d < PERMS; d++) {
    const mapU = new Map(units.map((u, i) => [u, units[(i * 7 + d * 13 + 1 + (i % (d + 2))) % units.length]]));
    const foP = foL.map((x) => { const b = new Uint32Array(WORDS32); for (let u = 0; u < U; u++) if (x.b[u >>> 5] & (1 << (u & 31))) { const v = mapU.get(u) ?? u; b[v >>> 5] |= 1 << (v & 31); } return { w: x.w, b, n: x.n }; });
    for (const e of peL) { let best = 0; for (const v of foP) { const c = cosB(e.b, e.n, v.b, v.n); if (c > best) best = c; } if (best > permBest.get(e.w)) permBest.set(e.w, best); }
  }
  const bestF = new Map(), bestE = new Map();
  // UNIQUE best only: words whose appearance is the same set of units tie at cosine 1, and an arbitrary pick among ties is not a pin
  // (a first version admitted them and its closure was inflated by the same arbitrary order on both sides)
  for (const e of peL) { let b = 0, b2 = 0, bv = null; for (const v of foL) { const c = cosB(e.b, e.n, v.b, v.n); if (c > b) { b2 = b; b = c; bv = v; } else if (c > b2) b2 = c; } bestF.set(e.w, [b > b2 ? bv : null, b]); }
  for (const v of foL) { let b = 0, b2 = 0, be = null; for (const e of peL) { const c = cosB(e.b, e.n, v.b, v.n); if (c > b) { b2 = b; b = c; be = e; } else if (c > b2) b2 = c; } bestE.set(v.w, b > b2 ? be : null); }
  let admitted = 0;
  for (const e of peL) {
    const [v, c] = bestF.get(e.w); if (!v || bestE.get(v.w)?.w !== e.w || c <= permBest.get(e.w)) continue;
    let k = concepts.get(e.w); if (!k) concepts.set(e.w, (k = { forms: {} }));
    // the witnesses: the paragraphs (by byte address in this language's own file) where the form and the pivot word co-occur
    const w = [];
    for (const [i, j] of pairs) if ((e.b[i >>> 5] & (1 << (i & 31))) && (v.b[i >>> 5] & (1 << (i & 31)))) { w.push(`udhr-${L}.txt#${P[j].byte}`); if (w.length >= 3) break; }
    k.forms[L] = { form: v.w, cos: +c.toFixed(3), null: +permBest.get(e.w).toFixed(3), units: Math.min(e.n, v.n), witnesses: w };
    admitted += 1;
  }
  perLang[L] = { paragraphs: P.length, usableWords: foL.length, admitted };
  langData.set(L, { foL, fo });
}
const langs = Object.keys(perLang);
const multi = [...concepts.entries()].filter(([, k]) => Object.keys(k.forms).length >= 2);
console.log(`UDHR: ${files.length} translations · ${langs.length} aligned and pinned · ${Object.keys(skipped).length} left out (${Object.entries(skipped).slice(0, 6).map(([l, w]) => `${l}: ${w}`).join("; ")}${Object.keys(skipped).length > 6 ? "; …" : ""})`);
console.log(`concepts: ${concepts.size} pivot words pinned in ≥1 language · ${multi.length} in ≥2 · widest ${Math.max(0, ...multi.map(([, k]) => Object.keys(k.forms).length))} languages`);

// ── CLOSURE: pinned to the pivot in A and in B → does A pin to B directly (mutual best, above its own permutation null)? ──────────
let tested = 0, closed = 0, nullClosed = 0;
const pairsLang = []; for (let i = 0; i < langs.length; i++) for (let j = i + 1; j < langs.length; j++) pairsLang.push([langs[i], langs[j]]);
for (let n = 0; n < CLOSURE_PAIRS && pairsLang.length; n++) {
  const [A, B] = pairsLang.splice(Math.floor(rnd() * pairsLang.length), 1)[0];
  const both = multi.filter(([, k]) => k.forms[A] && k.forms[B]).slice(0, 25);
  if (!both.length) continue;
  const a = langData.get(A), b = langData.get(B);
  const bitsA = new Map(a.foL.map((x) => [x.w, x])), bitsB = new Map(b.foL.map((x) => [x.w, x]));
  for (const [, k] of both) {
    const xa = bitsA.get(k.forms[A].form), xb = bitsB.get(k.forms[B].form); if (!xa || !xb) continue;
    tested += 1;
    // direct: is xb the best partner of xa among B's words (and the reverse)?
    let bestB = null, bc = 0, bc2 = 0; for (const v of b.foL) { const c = cosB(xa.b, xa.n, v.b, v.n); if (c > bc) { bc2 = bc; bc = c; bestB = v; } else if (c > bc2) bc2 = c; }
    if (bestB && bc > bc2 && bestB.w === xb.w) closed += 1;
    const rv = b.foL[Math.floor(rnd() * b.foL.length)];                    // null: a random partner would be the best with probability 1/|B|
    if (bestB && bestB.w === rv.w) nullClosed += 1;
  }
}
console.log(`closure: of ${tested} concepts pinned in both A and B through English, ${closed} (${(100 * closed / (tested || 1)).toFixed(0)}%) also pin A to B directly as best match · random-partner null ${nullClosed}`);

// ── the rows ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const entries = [];
for (const [w, k] of [...concepts.entries()].sort()) for (const [L, x] of Object.entries(k.forms).sort()) {
  entries.push({ left: `concept:${w}`, right: `${L}:${x.form}`, standing: "candidate", giver: "UDHR parallel — paragraph-aligned appearance, mutual best, above its own permutation null", witnesses: x.witnesses, meta: { pivot: PIVOT, cosine: x.cos, permutationNull: x.null, units: x.units } });
}
const prior = {
  schema: "HyperlexiconPrior@1", kind: "omnilingual-concepts",
  giver: `corpus:udhr (06-government-legal/un-udhr, ${langs.length} aligned translations; pivot ${PIVOT}) — Champollion's grid`,
  standing: "candidate",
  source: "Zenodotus/06-government-legal/un-udhr/udhr-*.txt",
  measured: {
    translations: files.length, languagesPinned: langs.length, languagesLeftOut: skipped, conceptsPinned: concepts.size, conceptsInTwoOrMore: multi.length,
    rows: entries.length, closure: { tested, closed, randomPartnerNull: nullClosed }, perLanguage: perLang,
  },
  entries,
  history: [{ at: new Date().toISOString(), event: "born", note: "first omnilingual concept inventory from the UDHR parallel; candidates until a charter-bound giver gives them" }],
  falsifying_control: "a row whose witness (<file>#<byte>) does not resolve to a paragraph of that language's text holding the form; a rerun that is not byte-identical; closure at or below the random-partner null; or a concept that is only English-shaped (pinned in one language).",
};
fs.writeFileSync(OUT, JSON.stringify(prior, null, 0) + "\n");
console.log(`rows ${entries.length} → ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
const ex = [...multi].sort((a, b) => Object.keys(b[1].forms).length - Object.keys(a[1].forms).length).slice(0, 12);
for (const [w, k] of ex) console.log(`  ${w.padEnd(14)} ${Object.keys(k.forms).length} langs  ${Object.entries(k.forms).slice(0, 6).map(([L, x]) => `${L}:${x.form}`).join("  ")}`);
