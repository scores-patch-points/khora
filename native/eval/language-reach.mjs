// eval/language-reach.mjs — does the reader find beings, and hear the right
// language, in every language we hold a grammar for? No capital letters assumed.
//
//   node native/eval/language-reach.mjs [udhr-dir] [--cased-control]
//
// For each UDHR translation (ethos/06-government-legal/un-udhr — the same
// text in 500+ languages, header-tagged with its language) it:
//   1. DETECTS the language from the words alone (language-grammar.js) and
//      scores it against the file's own header tag;
//   2. runs the caseless being tier through that language's own ear and
//      reports how many beings it hears, and the CAPITAL-ONLY baseline
//      (surfaces.js extractSurfaces) beside it — the gap is the languages and
//      registers capitalisation cannot see;
//   3. --cased-control: lowercases a cased text and measures how much of its
//      capital-derived cast the caseless tier recovers (non-standard English
//      lives in ethos/19-organic-community; see the README of this eval).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectLanguage, grammarFor } from "../the-fold/language-grammar.js";
import { makeEar } from "../adapters/text/ear.js";
import { heardNominals } from "../adapters/text/heard-nominals.js";
import { extractSurfaces, discoverReferents } from "../adapters/text/surfaces.js";
import { splitSentences } from "../adapters/text/spans.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : path.join(HERE, "../../../ethos/06-government-legal/un-udhr");
// header tag (e.g. "Language: Spanish (es)") → the prior stem it should detect as
const TAG = { en: "eng", es: "spa", ru: "rus", zh: "cmn", ar: "arb", he: "heb", fa: "fas", ko: "kor", ja: "jpn", fr: "fra", de: "deu", it: "ita", pt: "por", nl: "nld", pl: "pol", uk: "ukr", hi: "hin", vi: "vie", id: "ind", sv: "swe", ur: "urd", tr: "tur", el: "ell", fi: "fin" };
const FILES = ["eng", "spa", "rus", "cmn_hans", "cmn_hant", "arb", "heb", "fas", "kor", "jpn_tokyo", "fra", "deu_1901", "ita", "por_BR", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "ell_monotonic", "fin", "tur"];

const rows = [];
for (const f of FILES) {
  const file = path.join(DIR, `udhr-${f}.txt`);
  if (!fs.existsSync(file)) { rows.push({ file: f, gap: "file absent" }); continue; }
  const raw = fs.readFileSync(file, "utf8");
  const tag = /^Language:.*\(([a-z]{2,3})(?:[-_][A-Za-z]+)?\)/m.exec(raw)?.[1] ?? null;
  const want = TAG[tag] ?? null;
  const body = raw.replace(/^(Universal Declaration|Language:|Adopted:|Publisher:).*$/gm, "");
  const det = detectLanguage(body);
  const family = (s) => (s ? s.replace(/-hans$/, "") : s);
  const g = det.language ? grammarFor(det.language, { text: body }) : null;
  let heard = 0, top = [];
  if (g?.language) {
    const ear = makeEar({ posPrior: g.posPrior, proclitics: g.proclitics, enclitics: g.enclitics });
    const sents = splitSentences(body);
    const out = heardNominals(sents, { posPrior: g.posPrior, framePrior: g.framePrior, segment: ear.segment, peel: ear.peel, minMentions: 3 });
    heard = out.length; top = out.slice(0, 6).map((x) => x.surface);
  }
  let capital = 0;
  try { capital = discoverReferents(extractSurfaces(splitSentences(body), {}), { minSentences: 0 }).events.length; } catch {}
  rows.push({ file: f, tag, detected: det.language ?? null, detectedRight: want ? family(det.language) === want : null, coverage: det.coverage ?? null, caseless_beings: heard, capital_only: capital, top });
}
console.table(rows.map(({ top, ...r }) => r));
const ok = rows.filter((r) => r.detectedRight === true).length, graded = rows.filter((r) => r.detectedRight !== null && r.detectedRight !== undefined).length;
console.log(`language detected correctly: ${ok}/${graded}`);
for (const r of rows) if (r.top?.length) console.log(r.file.padEnd(14), r.top.join(" "));
