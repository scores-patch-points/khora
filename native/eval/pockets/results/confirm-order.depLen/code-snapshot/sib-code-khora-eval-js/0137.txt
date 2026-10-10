// eval/reading-helps-falsify.mjs — FALSIFY that the reading helps.
//
// PREREGISTERED (FOLD-CONSTITUTION II.5: the prediction is written before the
// run and the thresholds are not tuned after it).
//
// CLAIM. The beings the listening cast admits from a PREFIX are the ones a
// reader will actually need next — they keep being mentioned in text it has
// not read — and they are not an artefact of word frequency, of the prior's
// refusals alone, or of a baseline that does nothing.
//
// DESIGN (prequential, A10/II.4/II.23). Each corpus is cut at its midpoint.
// The cast reads ONLY the first half, sentence by sentence, language unheard
// beforehand (the listener decides from the prefix). Every arm is then scored on
// the HELD-OUT second half:
//   keyed        the cast: nominated at 2 arrivals, standing earned (5% tail
//                against the received baseline), priors refusing settled non-nominals
//   nominated    the same ledger with NO standing test      — isolates the standing gate
//   frequency    raw top-K tokens, no prior at all          — "just count words"
//   deranged     the full pipeline with a DERANGED baseline (every word given the
//                same rate)                                 — a control built to fail:
//                                                           if it matches `keyed`, the baseline does nothing
//   capital      the capital tier alone (surfaces.js), where a script has case
// Arms are size-matched to the keyed cast (K = |keyed|) except `capital`.
//
// SCORES, on the held-out half:
//   carry@2   share of an arm's items that occur >= 2 times in the unread half
//   mass/item held-out mentions per admitted item
//
// PREDICTIONS. P1 keyed carry@2 > frequency and > nominated in >= 80% of corpora.
// P2 on caseless scripts (zh, ar, he, ko) keyed is non-empty where capital is empty.
// P3 keyed carry@2 > deranged in >= 80% of corpora (the gate must reject).
// P4 on non-standard English (SMS, Singlish, IRC) keyed mass/item >= capital's.
// Any prediction that fails is REPORTED AS FAILED. Nothing is tuned after the run.
import fs from "node:fs";
import path from "node:path";
import { createListeningCast, ORIGINAL } from "../adapters/text/listening-cast.js";
import { createLanguageListener } from "../the-fold/language-listener.js";
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces } from "../adapters/text/surfaces.js";
import { receivedRate } from "../adapters/text/keyness.js";

const E = "/Users/mlacy/Documents/3.0/ethos/";
const C = process.argv[2] ?? "/private/tmp/claude-501/corp/";
const first = (d, re) => { const f = fs.readdirSync(d).filter((x) => re.test(x)).sort()[0]; return f ? path.join(d, f) : null; };
const CORPORA = [
  ["zh Confucius (wiki)", C + "zh-孔子.txt", "caseless"], ["zh Mao (wiki)", C + "zh-毛泽东.txt", "caseless"],
  ["ar Mahfouz (wiki)", C + "ar-1.txt", "caseless"], ["ar Muhammad Ali (wiki)", C + "ar-2.txt", "caseless"],
  ["he wiki", first(E + "11-multi-language/wikipedia-lang/he", /txt$/), "caseless"], ["ko wiki", first(E + "11-multi-language/wikipedia-lang/ko", /txt$/), "caseless"],
  ["fr wiki Einstein", E + "11-multi-language/wikipedia-lang/fr/Albert_Einstein.txt", "cased"], ["el wiki", first(E + "11-multi-language/wikipedia-lang/el", /txt$/), "cased"],
  ["tr wiki", first(E + "11-multi-language/wikipedia-lang/tr", /txt$/), "cased"],
  ["en WWII (wiki)", E + "02-encyclopedic/wikipedia/World_War_II.txt", "cased"],
  ["en SMS (nus-sms)", C + "sms-en.txt", "nonstd"], ["en Singlish chat (cosem)", C + "cosem.txt", "nonstd"], ["en IRC (ubuntu)", C + "irc-en.txt", "nonstd"],
].filter(([, f]) => f && fs.existsSync(f));

const sentencesOf = (name, text) => (/SMS|Singlish|IRC/.test(name) ? text.split("\n").filter((x) => x.trim()).map((t) => ({ text: t })) : splitSentences(text));
const clean = (t) => t.replace(/^---\n[\s\S]*?\n---\n/gm, "");

function heldOutCounts(sents, listener) {
  // count each held-out token form (through the ear of its own language) — scoring only, no admission
  const counts = new Map();
  for (const s of sents) {
    const ctx = listener.listen(s.text.toLowerCase());
    if (!ctx.language) continue;
    let t = s.text.toLowerCase();
    if (ctx.ear?.segment) t = ctx.ear.segment(t);
    if (ctx.ear?.peel) t = ctx.ear.peel(t);
    for (const w of t.match(/[\p{L}\p{M}\p{N}'’]+/gu) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return counts;
}
const score = (items, counts) => {
  if (!items.length) return { k: 0, carry2: null, mass: null };
  let carry = 0, mass = 0;
  for (const it of items) { const n = counts.get(it) ?? 0; if (n >= 2) carry += 1; mass += n; }
  return { k: items.length, carry2: carry / items.length, mass: mass / items.length };
};

const rows = [];
for (const [name, file, kind] of CORPORA) {
  const text = clean(fs.readFileSync(file, "utf8")).slice(0, 140000);
  const sents = sentencesOf(name, text);
  const mid = Math.floor(sents.length / 2);
  const prefix = sents.slice(0, mid), held = sents.slice(mid);

  const listener = createLanguageListener();
  const cast = createListeningCast({ hear: (t, si) => listener.listen(t, si), commonNouns: kind === "caseless" || kind === "nonstd", ...ORIGINAL });
  prefix.forEach((s) => cast.add(s));
  // the language the prefix was MOSTLY heard in (an embedded Latin quotation in a Hebrew article is not the article's language)
  const lang = cast.report().languages.sort((a, b) => b.sentences - a.sentences)[0]?.language ?? null;
  const scoreListener = createLanguageListener({ declared: lang });
  const counts = lang ? heldOutCounts(held, scoreListener) : new Map();

  const keyed = cast.beings().map((b) => b.surface);
  const K = keyed.length;
  const topK = (arr) => arr.slice(0, K).map((x) => x.surface);
  const nominated = topK(cast.nominated());
  const frequency = topK(cast.rawTop());

  // the deranged control: same pipeline, every word given one rate (the mean of the language's own)
  const dListener = createLanguageListener();
  const gram = lang ? scoreListener.listen("x").grammar : null;
  const flat = gram ? (() => { const r = receivedRate(gram.posPrior); const vals = Object.keys(gram.posPrior.forms).slice(0, 2000).map(r); return vals.reduce((a, b) => a + b, 0) / vals.length; })() : null;
  const dCast = createListeningCast({ hear: (t, si) => dListener.listen(t, si), rateOf: flat ? () => flat : null, commonNouns: kind === "caseless" || kind === "nonstd", ...ORIGINAL });
  prefix.forEach((s) => dCast.add(s));
  const deranged = dCast.beings().slice(0, K).map((b) => b.surface);

  let capital = [];
  if (kind !== "caseless") { try { capital = extractSurfaces(prefix, {}).map((x) => x.surface.toLowerCase()); } catch {} }
  const capSplit = capital.flatMap((c) => c.split(/\s+/)).filter((w, i, a) => w.length > 2 && a.indexOf(w) === i);

  const r = { corpus: name, kind, lang, sentences: sents.length, K,
    keyed: score(keyed, counts), nominated: score(nominated, counts), frequency: score(frequency, counts), deranged: score(deranged, counts), capital: score(capSplit, counts) };
  rows.push(r);
  console.log(`${name.padEnd(26)} ${String(lang).padEnd(9)} K=${String(K).padEnd(4)} carry@2  keyed ${fmt(r.keyed.carry2)} | nominated ${fmt(r.nominated.carry2)} | frequency ${fmt(r.frequency.carry2)} | deranged ${fmt(r.deranged.carry2)} | capital ${fmt(r.capital.carry2)} (k=${r.capital.k})`);
}
function fmt(x) { return x == null ? "  -  " : (x * 100).toFixed(0).padStart(3) + "%"; }

const gt = (a, b) => a != null && b != null && a > b;
const ok = (f) => rows.filter((r) => r.K > 0).filter(f).length;
const eligible = rows.filter((r) => r.K > 0).length;
console.log(`\ncorpora with a non-empty keyed cast: ${eligible}/${rows.length}`);
const P1 = ok((r) => gt(r.keyed.carry2, r.frequency.carry2) && gt(r.keyed.carry2, r.nominated.carry2) ) / Math.max(1, eligible);
const P3 = ok((r) => gt(r.keyed.carry2, r.deranged.carry2)) / Math.max(1, eligible);
const caseless = rows.filter((r) => r.kind === "caseless");
const P2 = caseless.filter((r) => r.K > 0 && r.capital.k === 0).length;
const nonstd = rows.filter((r) => r.kind === "nonstd" && r.K > 0);
const P4 = nonstd.filter((r) => r.capital.mass == null || (r.keyed.mass ?? 0) >= r.capital.mass).length;
console.log(`P1 keyed beats frequency AND nominated (carry@2): ${(P1 * 100).toFixed(0)}% of corpora (need >= 80%) -> ${P1 >= 0.8 ? "HOLDS" : "FALSIFIED"}`);
console.log(`P2 caseless scripts: keyed non-empty where capital is empty: ${P2}/${caseless.length} -> ${P2 === caseless.length && caseless.length ? "HOLDS" : "FALSIFIED"}`);
console.log(`P3 keyed beats the DERANGED-baseline control: ${(P3 * 100).toFixed(0)}% (need >= 80%) -> ${P3 >= 0.8 ? "HOLDS" : "FALSIFIED"}`);
console.log(`P4 non-standard English: keyed mass/item >= capital's: ${P4}/${nonstd.length} -> ${P4 === nonstd.length && nonstd.length ? "HOLDS" : "FALSIFIED"}`);
console.log("\nmass/item (held-out mentions per admitted item):");
for (const r of rows) console.log(`${r.corpus.padEnd(26)} keyed ${r.keyed.mass?.toFixed(1) ?? "-"} | nominated ${r.nominated.mass?.toFixed(1) ?? "-"} | frequency ${r.frequency.mass?.toFixed(1) ?? "-"} | deranged ${r.deranged.mass?.toFixed(1) ?? "-"} | capital ${r.capital.mass?.toFixed(1) ?? "-"}`);
