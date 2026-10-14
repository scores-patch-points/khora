// scene/read-greek.mjs — READ THE REPUBLIC FROM THE GREEK, and pin its concepts to the English and the testimony through the UDHR.  (2026-10-14)
//
//   node eval/the-fold/scene/read-greek.mjs [--windows 4] [--window 20000]
//
// "There's definitely going to be overlap of concepts across languages" (the user, 2026-10-14). The overlap is not found by
// comparing strings — δικαιοσύνη is not "justice" to a string matcher — it is found through a RECORD that says they are the same
// thing: the UDHR, one document in many languages, paragraph for paragraph. That is Champollion's own method (organs/
// language-training.js: "the Rosetta is the GRID ... a name binds by recurrence and company, the pin, never by wordlist"; the
// parallel fixes the KNOWN, never the unknown). So:
//
//   A. READ    the Greek (Wikisource's polytonic Πολιτεία, from [327a]) through the NATIVE Greek reader (the greek.mjs seam: case
//              read off the article and the ending, pro-drop verbs from the Greek POS prior), as transformation records in the
//              liberal-arts store: INS beings, SEG clauses with subject and predicate heads, CON where both ends are nominal.
//   B. CONCEPTS the omnilingual concepts are hyperlexicon rows (omnilingual-concepts.mjs → derived-priors/hyperlexicon-priors/
//              udhr-omnilingual-concepts-v1.json): `concept:<pivot> — <lang>:<form>`, each with UDHR witnesses at byte addresses,
//              pinned by paragraph-aligned appearance, unique mutual best, above a permutation null. This script CONSULTS them.
//   C. OVERLAP map the Greek Republic's words into concepts through the grid, and ask how many of those concepts the English
//              Republic and the foundation also use, against the same count when each link is re-pointed to a random concept.
//
// What this does not do: translate. It says which concepts a Greek word and an English word share because the UDHR uses them in
// the same places — an inventory the size of the UDHR's vocabulary (rights, law, freedom, punishment, slavery, education, the
// state, family, property) — which is, helpfully, where the Republic and the testimony meet.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "../../../the-fold/weft-store.mjs";
import { polarityLens, polarityOfSentence } from "../../../the-fold/read-quality.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const WINDOWS = Number(opt("--windows", 4)), WINDOW = Number(opt("--window", 20000));
const GREEK = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/plato-republic.txt";
const ENGLISH = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const UDHR = "/Users/mlacy/Documents/3.0/Zenodotus/06-government-legal/un-udhr";
const SEED = 20261014;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const bytes = (s) => Buffer.byteLength(s, "utf8");
const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ς/g, "σ");
const words = (s) => (fold(s).match(/\p{L}{3,}/gu) ?? []);

// ═════════════════════════════ A. READ THE GREEK ═════════════════════════════
const KH = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekBeings, greekClauses } = await import(`${KH}/native/eval/lavar/greek.mjs`);
const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));
const verbs = confirmedVerbSet(pos);
const domClass = (w) => { const c = pos.forms?.[w] ?? pos[w]; if (!c || typeof c !== "object") return ""; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
const NOMINAL = new Set(["NOUN", "PROPN", "PRON", "ADJ", "DET"]);

const raw = fs.readFileSync(GREEK, "utf8");
const fm = /^---[\s\S]*?\n---\n/.exec(raw); const prefix = fm ? fm[0].length : 0;
const startRel = raw.slice(prefix).indexOf("[ 327a ]");
if (startRel < 0) { console.error("no [ 327a ] marker in the Greek text"); process.exit(1); }
const start = prefix + startRel;
const store = openStore(path.join(HERE, "liberal-arts-weft"));
const lens = polarityLens("grc");
const have = store.keys();
let seq = 32 + openStore(path.join(HERE, "foundation-weft")).count() + store.count();
let nCl = 0, nCon = 0, nIns = 0, nNeg = 0;
for (let w = 0; w < WINDOWS; w++) {
  const abs = start + w * WINDOW;
  if (have.has(`${GREEK}@${abs}`)) continue;
  const text = raw.slice(abs, abs + WINDOW);
  const beings = greekBeings(text, pos, { minOccurrences: 2 });
  const seg = [], con = [], eva = [];
  let off = 0, k = 0;
  for (const part of text.split(/(?<=[.;·—])/g)) {
    const so = abs + off; off += part.length;
    const s = part.trim(); if (s.length < 4) continue;
    const lead = part.length - part.trimStart().length;
    const sByte = bytes(raw.slice(0, so + lead));
    const neg = lens.gap ? false : polarityOfSentence(s, lens).polarity === "-";
    for (const c of greekClauses(s, verbs, pos, casePrior, { beings, articleMode: "soft", articleWindow: 1, minShare: 0.6, minCount: 20 })) {
      const subj = c.subject?.headLower ?? "", obj = c.object?.headLower ?? "";
      seg.push([`g${w}.c${k++}`, "", 0, "", sByte, fold(subj), fold(String(c.verb ?? ""))]);
      if (neg) { eva.push(["seg", seg.length - 1]); nNeg += 1; }
      // a CONNECTION needs two nominal ends: an adverb or a verb read as a subject is the seam's noise, not a being
      if (subj && obj && NOMINAL.has(domClass(subj)) && NOMINAL.has(domClass(obj))) { con.push([fold(subj), fold(String(c.verb ?? "")), fold(obj), sByte, 0, 0, ""]); if (neg) eva.push(["con", con.length - 1]); }
    }
  }
  nCl += seg.length; nCon += con.length; nIns += beings.length;
  store.append([{ a: GREEK, l: "liberal-arts", g: "grc", w: abs, ws: abs, s: seq++, ins: beings.map((b) => b.surfaces?.[0] ?? b.stem), seg, con, eva }]);
}
const greekPasses = store.passes().filter((l) => l.a === GREEK);
console.log(`A. READ (native Greek seam, from [327a]): ${greekPasses.length} windows of ${WINDOW} chars · this run: ${nCl} clauses, ${nCon} nominal connections, ${nIns} beings, ${nNeg} clauses in negated sentences`);

// ═════════════════════════════ B. THE CONCEPTS (hyperlexicon) ═════════════════════════════
// The omnilingual concepts live in the hyperlexicon, not in this script: rows `concept:<pivot> — <lang>:<form>` with their UDHR
// witnesses, built by omnilingual-concepts.mjs (paragraph-aligned appearance, unique mutual best, above a permutation null).
const PRIOR = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-omnilingual-concepts-v1.json";
if (!fs.existsSync(PRIOR)) { console.error("no concept prior; run omnilingual-concepts.mjs first"); process.exit(1); }
const prior = JSON.parse(fs.readFileSync(PRIOR, "utf8"));
const grid = new Map();                              // pivot word → { lang → form }
for (const e of prior.entries) { const c = e.left.replace(/^concept:/, ""); const k = e.right.indexOf(":"); const L = e.right.slice(0, k), f = e.right.slice(k + 1); let g = grid.get(c); if (!g) grid.set(c, (g = {})); g[L] = f; }
const greekEntries = [...grid.entries()].filter(([, g]) => g.ell_polytonic || g.ell_monotonic);
console.log(`B. CONCEPTS (hyperlexicon prior, ${prior.measured.languagesPinned} languages, ${prior.measured.conceptsPinned} concepts, closure ${prior.measured.closure.closed}/${prior.measured.closure.tested} vs null ${prior.measured.closure.randomPartnerNull}): ${greekEntries.length} are pinned to Greek (polytonic or monotonic) · e.g. ${greekEntries.slice(0, 10).map(([w, g]) => `${w}=${g.ell_polytonic ?? g.ell_monotonic}`).join(", ")}`);
const agreeable = [...grid.entries()].filter(([, g]) => g.fra && g.deu_1996 && g.rus);

// ═════════════════════════════ C. OVERLAP ═════════════════════════════
// Greek word -> concept: the UDHR Greek form equals the Republic form after folding, or shares its first 6 letters (modern and Attic share stems)
const g2c = new Map();
for (const [w, g] of grid) for (const f of [g.ell_polytonic, g.ell_monotonic]) if (f) g2c.set(fold(f), w);
const stem6 = (s) => (s.length >= 6 ? s.slice(0, 6) : null);
const g2cStem = new Map(); for (const [f, w] of g2c) { const s = stem6(f); if (s && !g2cStem.has(s)) g2cStem.set(s, w); }
const conceptOfGreek = (w) => g2c.get(w) ?? (stem6(w) ? g2cStem.get(stem6(w)) : null) ?? null;

const greekText = greekPasses.map((l) => raw.slice(l.w, l.w + WINDOW)).join(" ");
const gWords = words(greekText);
const gConcepts = new Map(); let gHit = 0;
for (const w of gWords) { const c = conceptOfGreek(w); if (c) { gHit += 1; gConcepts.set(c, (gConcepts.get(c) ?? 0) + 1); } }
console.log(`C. the Greek window: ${gWords.length} words · ${gHit} (${(100 * gHit / (gWords.length || 1)).toFixed(1)}%) land on a UDHR concept · ${gConcepts.size} distinct concepts`);

const eRaw = fs.readFileSync(ENGLISH, "utf8");
const eStart = eRaw.indexOf("I went down yesterday to the Piraeus");
const eCount = new Map(); for (const w of words(eRaw.slice(eStart, eStart + WINDOWS * 60000))) eCount.set(w, (eCount.get(w) ?? 0) + 1);
const fCount = new Map();
for (const f of ["/Users/mlacy/Documents/3.0/the-fold/mind/foundation-index.json", "/Users/mlacy/Documents/3.0/the-fold/mind/foundation-index.local.json"]) {
  try { for (const u of JSON.parse(fs.readFileSync(f, "utf8")).units) for (const w of words(u[2])) fCount.set(w, (fCount.get(w) ?? 0) + 1); } catch { /* absent */ }
}
const concepts = [...gConcepts.keys()];
const inE = concepts.filter((c) => eCount.has(c)), inF = concepts.filter((c) => fCount.has(c));
const allC = [...grid.keys()];
let nullE = 0, nullF = 0, nullEmax = 0, nullFmax = 0; const DR = 200;
for (let d = 0; d < DR; d++) { let e = 0, f = 0; for (let i = 0; i < concepts.length; i++) { const c = allC[Math.floor(rnd() * allC.length)]; if (eCount.has(c)) e++; if (fCount.has(c)) f++; } nullE += e; nullF += f; nullEmax = Math.max(nullEmax, e); nullFmax = Math.max(nullFmax, f); }
console.log(`   concepts the English Republic window also uses: ${inE.length} of ${concepts.length} · random-link null mean ${(nullE / DR).toFixed(1)}, best ${nullEmax}`);
console.log(`   concepts the foundation also uses:             ${inF.length} of ${concepts.length} · random-link null mean ${(nullF / DR).toFixed(1)}, best ${nullFmax}`);
const greekFormOf = new Map(); for (const [f, c] of g2c) if (!greekFormOf.has(c)) greekFormOf.set(c, f);
const rows = concepts.map((c) => ({ concept: c, greekForm: greekFormOf.get(c), greek: gConcepts.get(c), english: eCount.get(c) ?? 0, foundation: fCount.get(c) ?? 0 })).filter((r) => r.english && r.foundation).sort((a, b) => b.greek - a.greek);
console.log(`   shared by all three (Greek Republic, English Republic, foundation): ${rows.length}`);
for (const r of rows.slice(0, 14)) console.log(`     ${r.concept.padEnd(14)} ← ${String(r.greekForm).padEnd(14)} Greek ${String(r.greek).padStart(3)} · English Republic ${String(r.english).padStart(3)} · foundation ${String(r.foundation).padStart(5)}`);

const report = {
  schema: "ReadGreek@1", at: new Date().toISOString(), seed: SEED,
  greek: { file: GREEK, from: "[327a]", windows: greekPasses.length, windowChars: WINDOW, clauses: greekPasses.reduce((n, l) => n + l.seg.length, 0), connections: greekPasses.reduce((n, l) => n + l.con.length, 0), beings: greekPasses.reduce((n, l) => n + l.ins.length, 0) },
  grid: { source: path.basename(PRIOR), concepts: grid.size, languages: prior.measured.languagesPinned, closure: prior.measured.closure, pinnedInFraDeuRus: agreeable.length, pinnedToGreek: greekEntries.length },
  overlap: { greekWords: gWords.length, onConcept: gHit, distinctConcepts: concepts.length, inEnglishRepublic: inE.length, nullEnglishMean: nullE / DR, nullEnglishBest: nullEmax, inFoundation: inF.length, nullFoundationMean: nullF / DR, nullFoundationBest: nullFmax, sharedByAll: rows.length },
  top: rows.slice(0, 25),
  limits: "a concept inventory the size of the UDHR's vocabulary; Attic forms reach it by equality after folding or a shared 6-letter stem; the null re-points links to random grid concepts, so it tests that the Greek's concepts are the English's, not that they mean the same",
};
fs.writeFileSync(path.join(HERE, "read-greek-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`\n→ ${path.join(HERE, "read-greek-report.json")}`);
