// build-identify-prior.mjs — builds priors/notation-ipa-identify.json (R0's received prior) from TRAIN ONLY.
//
//   node build-identify-prior.mjs [corpusDir=/private/tmp/claude-501/notation/ipa/corpus] [outFile]
//
// GIVER: the WikiPron TRAIN languages (manifest.wikipron.json split==='train'): the pronunciation column (IPA, positive) and
// the orthography column of the SAME words (negative). Code points are mapped to the adapter's KLASSES (a fixed grammar of
// the notation: ASCII letter, Latin letter outside the chart, chart letter, IPA-extension letter, modifier letter, combining
// mark, tone letter, superscript digit, ASCII digit, space, punctuation, Greek, foreign-script letter, other; v2 splits ASCII letters by chart membership and
// punctuation by TRAIN attestation, and adds the neutral class chart_unattested). The prior is
// the per-class log-likelihood ratio  ln((pos_k + A)/(N_pos + A K)) - ln((neg_k + A)/(N_neg + A K)),  A = 0.5 (Jeffreys).
// No tuned constant: A is the Jeffreys prior; the decision threshold tau = ln((1-a)/a), a = KEY_ALPHA, is derived in the adapter.
import fs from "node:fs";
import path from "node:path";
import { loadPriors, compilePriors, KLASSES, classOfChar } from "../../../adapters/notation/ipa.js";

const CORPUS = process.argv[2] ?? "/private/tmp/claude-501/notation/ipa/corpus";
const OUT = process.argv[3] ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../priors/notation-ipa-identify.json");
const A = 0.5;
const full = loadPriors();
const P = compilePriors({ chart: full.chart, binding: full.binding, segments: full.segments, identify: null });
const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, "..", "manifest.wikipron.json"), "utf8"));
const trainLangs = Object.entries(manifest.lang_split).filter(([, s]) => s === "train").map(([i]) => i);

const pos = new Array(KLASSES.length).fill(0), neg = new Array(KLASSES.length).fill(0);
let lines = 0, files = 0;
const tally = (str, arr) => { for (const ch of str) arr[classOfChar(ch.codePointAt(0), P)]++; arr[KLASSES.indexOf("space")]++; /* the word separator */ };
for (const fn of fs.readdirSync(path.join(CORPUS, "train")).sort()) {
  const iso = fn.split("_")[0];
  if (manifest.lang_split[iso] !== "train") throw new Error(`non-train file in train dir: ${fn}`);
  files++;
  for (const ln of fs.readFileSync(path.join(CORPUS, "train", fn), "utf8").split("\n")) {
    if (!ln) continue;
    const [w, p] = ln.split("\t");
    tally(p.split(" ").join("").normalize("NFC"), pos);
    tally(w.normalize("NFC"), neg);
    lines++;
  }
}
const Np = pos.reduce((a, b) => a + b, 0), Nn = neg.reduce((a, b) => a + b, 0), K = KLASSES.length;
const llrRaw = KLASSES.map((_, k) => Math.log((pos[k] + A) / (Np + A * K)) - Math.log((neg[k] + A) / (Nn + A * K)));
// priors REFUSE or NOMINATE, never admit: only classes the CHART nominates may carry positive evidence; chart_unattested has no TRAIN estimate (count 0 by construction) -> zero.
const NOMINATED = ["ascii_letter_chart", "chart_latin_letter", "ipa_extension_letter", "modifier_letter", "combining_mark", "tone_letter", "ipa_punct"];
const llr = KLASSES.map((c, k) => (c === "chart_unattested" ? 0 : NOMINATED.includes(c) ? llrRaw[k] : Math.min(llrRaw[k], 0)));
const prior = {
  kind: "IPAIdentifyPrior@1",
  built: new Date().toISOString().slice(0, 10),
  giver: { name: "WikiPron TRAIN languages: IPA pronunciation column vs orthography column of the same words", source: "https://github.com/CUNY-CL/wikipron data/scrape/tsv", code_license: "Apache-2.0", data_license: "Wiktionary CC BY-SA 4.0 / GFDL", split: "TRAIN languages only", train_languages: trainLangs.sort() },
  classes: KLASSES,
  smoothing: { name: "Jeffreys", A },
  counts: { train_lines: lines, train_files: files, positive_chars: Np, negative_chars: Nn, positive: Object.fromEntries(KLASSES.map((k, i) => [k, pos[i]])), negative: Object.fromEntries(KLASSES.map((k, i) => [k, neg[i]])) },
  llr, llrRaw, nominatedClasses: NOMINATED, rules: ["only chart-nominated classes may be positive; all others are capped at <= 0 (REFUSE, never nominate)", "chart_unattested = 0 (the TRAIN corpus removed stress/syllable marks: it cannot estimate them)"],
  note: "R0 only. NOMINATES 'ipa' when the causal running sum of llr[class] reaches +tau, REFUSES ('not_ipa') at -tau, else undecided. tau = ln((1-a)/a) with a = KEY_ALPHA (adapters/text/keyness.js), derived in the adapter. ASCII-only IPA lines carry NO IPA-exclusive evidence: they are indistinguishable from Latin orthography by content and are a typed gap, not an error of the prior.",
};
fs.writeFileSync(OUT, JSON.stringify(prior));
console.log(JSON.stringify({ lines, files, Np, Nn, llr: Object.fromEntries(KLASSES.map((k, i) => [k, +llr[i].toFixed(3)])), llrRaw: Object.fromEntries(KLASSES.map((k, i) => [k, +llrRaw[i].toFixed(3)])) }, null, 1));
console.log("wrote", OUT, fs.statSync(OUT).size);
