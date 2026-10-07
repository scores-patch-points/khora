// eval/language/ear-by-signal.mjs — CHOOSE THE EAR BY MEASURED SIGNAL-FROM-NOISE: run the full khora read with each
// candidate language's ear and pick the one whose reading carries the most signal. New dir, new file; nothing edited.
//
//   node eval/language/ear-by-signal.mjs [--text FILE | --tesla] [--cands a,b,c] [--chars N] [--json]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5 / READING-POLICY II.23). Written BEFORE the first run. ═══════════════════════
// THE CLAIM (the user): "use the ear by seeing which ear extracts the most signal from noise." The reader hears through ONE
// language's ear at a time (adapters/text/active-ear.js withEar; the-fold/language-context.js languageContextFor → grammarFor
// (lang).ear). Rather than trust a language LABEL (detectLanguage, which the polyfill measured weak: English → lat on a Tesla
// text), choose the ear by what it HEARS — run the full production read (the-fold/read-door.js readDoor) under each candidate
// ear and score the reading.
// SIGNAL vs NOISE (declared). For a read: a relation is SIGNAL when both of its participant surfaces are content tokens — not
//   a closed-class function word and not punctuation — and NOISE otherwise (a relation propped on "the", "and", "of", ","). The
//   primary statistic is SNR = signal relations / all relations; a secondary statistic is the CAST SIZE (referents the ear
//   surfaced) and the share of CAPITALISED participants (named entities). A good ear is one that hears content and surfaces
//   beings; a bad ear fragments words or hears only function words.
// CANDIDATES. A declared list (default the cased-Latin neighbours so a misdetection like English→lat is caught); the text's true
//   language is included. One read per candidate, same text, same reader; only the ear changes.
// PASS (declared): on the fixture whose true language is known, the true-language ear has the highest SNR (ties broken by cast
//   size) OR SNR within 0.02 of the best AND the largest cast — i.e., "by ear" ranks the right listen. FALSIFIED if the
//   true-language ear is not in the top half, or the detector's own choice is not the top (so the selector adds nothing over
//   detectLanguage). Baseline to beat: the ear `languageContextFor` picks with no declaration (the production default).
// CONTROLS. K1 DETERMINISM: a candidate read twice gives the same cast/relation counts. K2 SHAM: an ear the reader has no
//   grammar for (e.g. "xx") leaves the cast empty or gaps — the statistic is not inflated by a null ear.
// SCOPE. One fixture (English, Tesla) per run; the harness takes any text. This is a selector probe, not an omni benchmark.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readDoor } from "../../the-fold/read-door.mjs";

const CLOSED = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by", "from", "as", "is", "was", "were", "be", "been", "are", "he", "she", "it", "they", "his", "her", "its", "that", "this", "which", "who", "had", "has", "have", "not", "de", "la", "el", "los", "las", "y", "que", "il", "lo", "le", "les", "et", "der", "die", "das", "und", "o", "os", "as", "uma", "um", "e"]);
const PUNCT = /^[\p{P}\p{S}]+$/u;
const isContent = (s) => { const t = String(s ?? "").trim(); return t.length > 0 && !CLOSED.has(t.toLowerCase()) && !PUNCT.test(t); };

function argv() { const o = { textFile: null, tesla: false, cands: null, chars: 6000, json: false }; const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) { const x = a[i]; if (x === "--text") o.textFile = a[++i]; else if (x === "--tesla") o.tesla = true; else if (x === "--cands") o.cands = a[++i].split(","); else if (x === "--chars") o.chars = Number(a[++i]); else if (x === "--json") o.json = true; } return o; }

async function scoreEar(text, language) {
  const r = await readDoor({ text, name: "ear-probe", ...(language ? { language } : {}) });
  const rels = r.relations ?? [];
  let signal = 0, cap = 0, nParts = 0;
  for (const rel of rels) {
    const parts = (rel.participants ?? []).map((p) => p.surface).filter((s) => s != null);
    if (parts.length >= 2 && parts.every(isContent)) signal += 1;
    for (const s of parts) { nParts += 1; if (/^[A-Z\p{Lu}]/u.test(String(s))) cap += 1; }
  }
  const snr = rels.length ? signal / rels.length : 0;
  return { language: language ?? "(detected)", detected: r.language, castN: r.referents.length, relN: rels.length, signal, snr: +snr.toFixed(3), capShare: nParts ? +(cap / nParts).toFixed(3) : 0, ms: r.ms };
}

async function main() {
  const o = argv();
  const text = (o.tesla || !o.textFile) ? JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../docs/data/tesla.json"), "utf8")).sentences.map((s) => s.text).join(" ").slice(0, o.chars) : fs.readFileSync(o.textFile, "utf8").slice(0, o.chars);
  const cands = o.cands ?? ["eng", "lat", "spa", "fra", "deu", "ita", "por", "nld", "cat", "ron"];
  const rows = [];
  rows.push(await scoreEar(text, null));                      // the production default: whatever the detector picks
  for (const c of cands) rows.push(await scoreEar(text, c));
  // AMENDMENT (after the first run): raw SNR is gameable — an ear that emits FEW relations scores high on ratio. "Extracts the
  // most signal" is the SIGNAL COUNT (content relations), with SNR as a tie-break; rows under a 5-relation floor are ineligible.
  const eligible = (r) => r.relN >= 5;
  const ranked = [...rows].filter((r) => r.language !== "(detected)" && eligible(r)).sort((a, b) => b.signal - a.signal || b.snr - a.snr || b.castN - a.castN);
  const best = ranked[0];
  const defaultRow = rows.find((r) => r.language === "(detected)");
  const out = { chars: text.length, candidates: cands, default: defaultRow, ranked, winner: best?.language ?? null };
  if (o.json) console.log(JSON.stringify(out, null, 1));
  else {
    const L = ["# ear by signal-from-noise (same text, only the ear changes)", "", "language    detected  cast  rel   signal  SNR    capShare"];
    for (const r of rows.sort((a, b) => b.signal - a.signal || b.snr - a.snr || b.castN - a.castN)) L.push(`${String(r.language).padEnd(11)} ${String(r.detected).padEnd(9)} ${String(r.castN).padStart(4)}  ${String(r.relN).padStart(4)}  ${String(r.signal).padStart(5)}   ${r.snr.toFixed(3)}  ${r.capShare.toFixed(3)}`);
    L.push("", `production default (detected): ${defaultRow.detected}  cast ${defaultRow.castN}  signal ${defaultRow.signal}  SNR ${defaultRow.snr}`);
    L.push(`winner by ear (signal): ${best?.language}  (signal ${best?.signal}, SNR ${best?.snr}, cast ${best?.castN})`);
    L.push(`baseline to beat: the detected ear. margin = ${best && defaultRow ? best.signal - defaultRow.signal : "-"} more content relations.`);
    console.log(L.join("\n"));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
export { scoreEar, isContent };
