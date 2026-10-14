// scene/republic-parallel-concepts.mjs — THE REPUBLIC AS ITS OWN ROSETTA: Greek ↔ English concepts, as hyperlexicon rows.  (2026-10-14)
//
//   node eval/the-fold/scene/republic-parallel-concepts.mjs
//
// The UDHR grid (omnilingual-concepts.mjs) pins 140 concepts of a 91-paragraph document; of the Greek Republic's 10,121 words only
// 2.0% landed on one, mostly articles and prepositions. The Republic is, however, itself a parallel text: Wikisource's Πολιτεία
// carries every Stephanus section ([ 327a ] … [ 621d ], 1,027 markers) and Jowett's English prints the Stephanus sections
// (*327B* … *621D*). ~295 aligned pages of Plato's own vocabulary — justice, the soul, the city, law, the good, the tyrant — is the
// grid the question actually needs. Same method (Champollion: the parallel is the grid, the pin is by company across units):
//
//   unit        a Stephanus page (Greek sections a–e pooled)
//   appearance  the set of pages a word (Greek: its first five letters once folded, pooling inflections; English: a light stem)
//               occurs in. A word in <3 pages pins nothing; one in a quarter of them is a function word.
//   pin         a Greek stem and an English stem are pinned when each is the OTHER's UNIQUE best by cosine of appearance AND the
//               cosine exceeds the best that any of 20 permutations of the Greek pages reached for that English stem.
//   control     FIT on the odd pages, TEST on the even ones: for each pin, among held-out pages where the Greek stem appears, how
//               often does the English stem? Read against the same rate for English stems of the same frequency (the lift).
//
// Output is a hyperlexicon prior (HyperlexiconPrior@1, kind omnilingual-concepts), rows `concept:<english> — grc:<form>` with
// witnesses `<file>#<byte>` into BOTH texts, standing `candidate`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GREEK = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/plato-republic.txt";
const ENGLISH = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const OUT = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/plato-republic-concepts-v1.json";
const SEED = 20261014, PERMS = 20;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ς/g, "σ");
const bytes = (s) => Buffer.byteLength(s, "utf8");
const popcount = (x) => { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; };

// ── the units: Stephanus pages ─────────────────────────────────────────────────────────────────────────────────────────
const gRaw = fs.readFileSync(GREEK, "utf8");
const gPages = new Map();                                   // page number → { text, byte }
{
  const re = /\[ (\d{3})[a-e] \]/g; const marks = []; let m;
  while ((m = re.exec(gRaw)) !== null) marks.push({ page: Number(m[1]), idx: m.index, end: m.index + m[0].length });
  for (let i = 0; i < marks.length; i++) {
    const t = gRaw.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].idx : gRaw.length);
    const g = gPages.get(marks[i].page) ?? { text: "", byte: bytes(gRaw.slice(0, marks[i].idx)) };
    g.text += " " + t; gPages.set(marks[i].page, g);
  }
}
const eRaw = fs.readFileSync(ENGLISH, "utf8");
const ePages = new Map();
{
  // Jowett prints the Stephanus section in the text as *327B*, *327C* … (the {n} markers are his own page numbers)
  const start = eRaw.indexOf("I went down yesterday to the Piraeus");
  const re = /\*(\d{3})[A-Ea-e]?\*/g; re.lastIndex = start; const marks = []; let m, last = 326;
  // monotone non-decreasing; a book boundary jumps (445 → 449), so there is no step bound
  while ((m = re.exec(eRaw)) !== null) { const p = Number(m[1]); if (p >= last && p <= 621) { marks.push({ page: p, idx: m.index, end: m.index + m[0].length }); last = p; } }
  const first = marks[0] ? marks[0].idx : start;
  ePages.set(327, { text: eRaw.slice(start, first), byte: bytes(eRaw.slice(0, start)) });          // the opening, before *327B*, is 327a
  for (let i = 0; i < marks.length; i++) {
    const t = eRaw.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].idx : Math.min(eRaw.length, marks[i].end + 6000));
    const e = ePages.get(marks[i].page) ?? { text: "", byte: bytes(eRaw.slice(0, marks[i].idx)) };
    e.text += " " + t; ePages.set(marks[i].page, e);
  }
}
const pages = [...gPages.keys()].filter((p) => ePages.has(p) && gPages.get(p).text.trim().length > 40 && ePages.get(p).text.trim().length > 40).sort((a, b) => a - b);
const U = pages.length, W32 = Math.ceil(U / 32);
console.log(`Stephanus pages: Greek ${gPages.size}, English ${ePages.size}, aligned ${U} (${pages[0]}–${pages[U - 1]})`);

// ── stems ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const gStem = (w) => (w.length >= 6 ? w.slice(0, 5) : w);
const eStem = (w) => { let s = w; for (const [re, r] of [[/ies$/, "y"], [/ing$/, ""], [/ed$/, ""], [/ly$/, ""], [/s$/, ""]]) if (s.length > 5 && re.test(s)) { s = s.replace(re, r); break; } return s; };
const STOP_E = new Set("the and that was for with this have had they were but not you are his her from she him there when what which would about out then them said one all their been who will more very like just into over than some could also thus yes certainly shall must much".split(" "));
const toks = (text, lang) => (lang === "g" ? (fold(text).match(/\p{L}{3,}/gu) ?? []).map(gStem) : (text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !STOP_E.has(w)).map(eStem));
const bits = (side, idxSet) => {
  const m = new Map(); const form = new Map();
  pages.forEach((p, i) => {
    if (idxSet && !idxSet.has(i)) return;
    const t = (side === "g" ? gPages : ePages).get(p).text;
    const raw = side === "g" ? (fold(t).match(/\p{L}{3,}/gu) ?? []) : (t.toLowerCase().match(/[a-z]{3,}/g) ?? []);
    for (const w of new Set(raw)) {
      if (side === "e" && STOP_E.has(w)) continue;
      const k = side === "g" ? gStem(w) : eStem(w);
      let b = m.get(k); if (!b) m.set(k, (b = new Uint32Array(W32))); b[i >>> 5] |= 1 << (i & 31);
      form.set(k, form.get(k) ?? w);
    }
  });
  return { m, form };
};
const cnt = (b) => { let n = 0; for (const x of b) n += popcount(x); return n; };
const cosB = (a, na, b, nb) => { let s = 0; for (let k = 0; k < W32; k++) s += popcount(a[k] & b[k]); return s / Math.sqrt(na * nb); };
const live = (m, lo, hi) => [...m.entries()].map(([w, b]) => ({ w, b, n: cnt(b) })).filter((x) => x.n >= lo && x.n <= hi);

function pin(idx, label) {
  const G = bits("g", idx), E = bits("e", idx);
  const nU = idx ? idx.size : U, hi = nU * 0.25;
  const gl = live(G.m, 3, hi), el = live(E.m, 3, hi);
  const permBest = new Map(el.map((x) => [x.w, 0]));
  const units = idx ? [...idx] : pages.map((_, i) => i);
  for (let d = 0; d < PERMS; d++) {
    const shuf = units.slice(); for (let i = shuf.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [shuf[i], shuf[j]] = [shuf[j], shuf[i]]; }
    const mapU = new Map(units.map((u, i) => [u, shuf[i]]));
    const gP = gl.map((x) => { const b = new Uint32Array(W32); for (const u of units) if (x.b[u >>> 5] & (1 << (u & 31))) { const v = mapU.get(u); b[v >>> 5] |= 1 << (v & 31); } return { w: x.w, b, n: x.n }; });
    for (const e of el) { let best = 0; for (const g of gP) { const c = cosB(e.b, e.n, g.b, g.n); if (c > best) best = c; } if (best > permBest.get(e.w)) permBest.set(e.w, best); }
  }
  const bestG = new Map(), bestE = new Map();
  for (const e of el) { let b = 0, b2 = 0, bg = null; for (const g of gl) { const c = cosB(e.b, e.n, g.b, g.n); if (c > b) { b2 = b; b = c; bg = g; } else if (c > b2) b2 = c; } bestG.set(e.w, [b > b2 ? bg : null, b]); }
  for (const g of gl) { let b = 0, b2 = 0, be = null; for (const e of el) { const c = cosB(e.b, e.n, g.b, g.n); if (c > b) { b2 = b; b = c; be = e; } else if (c > b2) b2 = c; } bestE.set(g.w, b > b2 ? be : null); }
  const pins = [];
  for (const e of el) { const [g, c] = bestG.get(e.w); if (!g || bestE.get(g.w)?.w !== e.w || c <= permBest.get(e.w)) continue; pins.push({ e, g, c, nul: permBest.get(e.w) }); }
  console.log(`  ${label}: ${nU} pages · Greek stems ${gl.length} · English stems ${el.length} · pinned ${pins.length}`);
  return { pins, G, E, gl, el };
}

// ── control: fit on odd pages, test on even ─────────────────────────────────────────────────────────────────────────────
const odd = new Set(pages.map((_, i) => i).filter((i) => i % 2 === 1)), even = new Set(pages.map((_, i) => i).filter((i) => i % 2 === 0));
const fit = pin(odd, "FIT (odd pages)");
const gAll = bits("g", even), eAll = bits("e", even);
let tested = 0, lifted = 0, precSum = 0, baseSum = 0, nullPrecSum = 0;
const eKeys = [...eAll.m.keys()];
for (const p of fit.pins) {
  const gb = gAll.m.get(p.g.w), eb = eAll.m.get(p.e.w); if (!gb || !eb) continue;
  const ng = cnt(gb); if (ng < 2) continue;
  let both = 0; for (let k = 0; k < W32; k++) both += popcount(gb[k] & eb[k]);
  const prec = both / ng, base = cnt(eb) / even.size;
  // the null: an English stem of the same held-out frequency, drawn at random, tested against the same Greek pages
  const same = eKeys.filter((k) => Math.abs(cnt(eAll.m.get(k)) - cnt(eb)) <= 1); const rk = same[Math.floor(rnd() * same.length)];
  let nb = 0; if (rk) { const rb = eAll.m.get(rk); for (let k = 0; k < W32; k++) nb += popcount(gb[k] & rb[k]); }
  tested += 1; precSum += prec; baseSum += base; nullPrecSum += rk ? nb / ng : 0; if (prec > base) lifted += 1;
}
console.log(`CONTROL on the held-out ${even.size} even pages: ${tested} pins testable · mean P(English stem | Greek stem) ${(precSum / tested).toFixed(3)} · base rate of those English stems ${(baseSum / tested).toFixed(3)} · same-frequency random stems ${(nullPrecSum / tested).toFixed(3)} · ${lifted}/${tested} pins lift above their base rate`);

// ── the full inventory, and the rows ─────────────────────────────────────────────────────────────────────────────────────────
const all = pin(null, "ALL pages");
const entries = all.pins.map((p) => {
  const w = [];
  pages.forEach((pg, i) => { if ((p.e.b[i >>> 5] & (1 << (i & 31))) && (p.g.b[i >>> 5] & (1 << (i & 31))) && w.length < 3) w.push(`${path.basename(GREEK)}#${gPages.get(pg).byte}`, `${path.basename(ENGLISH)}#${ePages.get(pg).byte}`); });
  return { left: `concept:${p.e.w}`, right: `grc:${all.G.form.get(p.g.w) ?? p.g.w}`, standing: "candidate", giver: "Plato, Republic — Stephanus-page parallel (Greek Wikisource ↔ Jowett), unique mutual best, above a permutation null", witnesses: w, meta: { cosine: +p.c.toFixed(3), permutationNull: +p.nul.toFixed(3), pages: Math.min(p.e.n, p.g.n), englishForm: all.E.form.get(p.e.w) ?? p.e.w } };
});
const prior = {
  schema: "HyperlexiconPrior@1", kind: "omnilingual-concepts",
  giver: `corpus:plato-republic (Greek Wikisource polytonic ↔ Jowett via Stephanus pages ${pages[0]}–${pages[U - 1]}, ${U} aligned pages) — Champollion's grid`,
  standing: "candidate", source: "Zenodotus/11-multi-language/greek-originals/plato-republic.txt ↔ Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt",
  measured: { alignedPages: U, pinned: entries.length, control: { fit: "odd pages", test: `${even.size} even pages`, tested, meanPrecision: precSum / (tested || 1), meanBase: baseSum / (tested || 1), meanRandomSameFrequency: nullPrecSum / (tested || 1), liftedPins: lifted } },
  entries,
  history: [{ at: new Date().toISOString(), event: "born", note: "the Republic as its own parallel: Greek stems pinned to English stems by appearance across Stephanus pages" }],
  falsifying_control: "a pin whose Greek stem does not occur in the pages its witness names; held-out lift at or below the same-frequency random stems; a rerun that is not byte-identical.",
};
fs.writeFileSync(OUT, JSON.stringify(prior) + "\n");
console.log(`\nrows ${entries.length} → ${OUT}`);
for (const e of entries.sort((a, b) => b.meta.pages - a.meta.pages).slice(0, 30)) console.log(`  ${e.left.padEnd(24)} ${e.right.padEnd(18)} pages ${String(e.meta.pages).padStart(3)}  cos ${e.meta.cosine} (null ${e.meta.permutationNull})`);
