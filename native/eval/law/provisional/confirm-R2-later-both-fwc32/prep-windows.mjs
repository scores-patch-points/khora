// prep-windows.mjs: DATA PREPARATION for the R2 confirmation (NOT a test: computes no AUC, no company feature, no pair).
//   NAME_COMPANY_PAIRBLOCK=1 node prep-windows.mjs            -> writes windows.json (offsets, sizes, provenance sha256 of each window's text)
// Rules (fixed in the pre-registration header of confirm.mjs, which is the authority):
//  SET B (28 stems of the scoper's NEW list) and SET C (24 stems of the OLD list; cmn-hans dropped: same corpus as cmn): ONE contiguous window of TRAIN text from /private/tmp/claude-501/tb/<stem>/train.conllu
//   (kor: tb/kor-gsd) of >= 20,000 tokens (sentences added until reached; the stem's DEV is read only to recompute the sibling's window size). The window is DISJOINT from the window the sibling R1 confirmation uses (its offset is read
//   from ../confirm-R1-first-left-fwc32/windows/<stem>.json, which holds data only, no outcome); start uniform over the valid starts, seeded rngFor(seedFor("confirm-R2","window",stem)).
//   If no disjoint 20,000-token window exists the larger free gap (before or after the sibling's window) is used whole (reduced = true); if nothing is free the whole train is used (overlapsR1 = true).
//   Sentences whose punctuation-dropped form sequence also occurs in that stem's ud-eval dev or test are removed from the window (reported as removedDup).
//  SET A (fresh languages, not among the 53 stems): ONE contiguous window of about 20,000 tokens (sentences added until >= 20,000) from /Users/mlacy/Documents/EO Testing/EO Embedding testing/data/ud/<dir>/<dir>-ud-train.conllu
//   (kk_ktb and yo_ytb have no usable train: their test file is used), start uniform over the starts that leave >= 20,000 tokens, seeded likewise; whole file if shorter.
import fs from "node:fs";
import path from "node:path";
import { HERE, UD, TB, EO, readConllu, rngFor, seedFor, sha256, tokensOf } from "./lib.mjs";
const R1 = path.join(HERE, "..", "confirm-R1-first-left-fwc32", "windows");
export const NEW = "afr bul cat ces cym dan est eus gle glg hrv hun hye kat lav lit lzh mar mlt nob ron slk slv srp tam tel uig wol".split(" ");
export const OLD = ["eng", "spa", "rus", "cmn", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
export const FRESH = { be: "be_hse:train", is: "is_icepahc:train", lat: "la_proiel:train", grc: "grc_proiel:train", got: "got_proiel:train", chu: "cu_proiel:train", cop: "cop_scriptorium:train", fao: "fo_farpahc:train", kaz: "kk_ktb:test", yor: "yo_ytb:test" };
const W = {};
const dupKeys = (stem) => { const s = new Set(); for (const sp of ["dev", "test"]) for (const x of readConllu(path.join(UD, stem, sp + ".conllu")).sents) s.add(x.join(" ")); return s; };
function r1Window(stem, S, N) {
  const p = path.join(R1, stem + ".json");
  if (fs.existsSync(p)) { const j = JSON.parse(fs.readFileSync(p, "utf8")); return { offset: j.offset, taken: j.taken, from: "file" }; }
  const take = Math.min(S, N), off = take === N ? 0 : Math.floor(rngFor(seedFor("confirm-R1", "window", stem))() * (N - take + 1)); return { offset: off, taken: take, from: "recomputed" };
}
const TARGET = 20000;
/** contiguous window of >= TARGET tokens (sentences added until reached) whose sentence range [o, e) avoids the forbidden range [f0, f1); returns {offset, taken, reduced}. */
function pickWindow(sents, rnd, f0, f1) {
  const N = sents.length, cum = [0]; for (const x of sents) cum.push(cum.at(-1) + x.length);
  const endFor = (o) => { let e = o, t = 0; while (e < N && t < TARGET) { t += sents[e].length; e += 1; } return t >= TARGET ? e : -1; };
  const valid = []; for (let o = 0; o < N; o++) { const e = endFor(o); if (e < 0) break; if (e <= f0 || o >= f1) valid.push([o, e]); }
  if (valid.length) { const [o, e] = valid[Math.floor(rnd() * valid.length)]; return { offset: o, taken: e - o, reduced: false, validStarts: valid.length }; }
  const t1 = cum[Math.min(f0, N)], t2 = cum[N] - cum[Math.min(f1, N)]; // free tokens before / after the forbidden range
  if (Math.max(t1, t2) > 0) return t1 >= t2 ? { offset: 0, taken: f0, reduced: true, validStarts: 0 } : { offset: f1, taken: N - f1, reduced: true, validStarts: 0 };
  return { offset: 0, taken: N, reduced: true, validStarts: 0, overlapsR1: true };
}
for (const [set, list] of [["B", NEW], ["C", OLD]]) for (const stem of list) {
  const tp = path.join(TB, stem === "kor" ? "kor-gsd" : stem, "train.conllu"); if (!fs.existsSync(tp)) { console.error(stem, "NO TRAIN"); W[stem] = { stem, set, error: "no train" }; continue; }
  const S = readConllu(path.join(UD, stem, "dev.conllu")).sents.length, tr = readConllu(tp), N = tr.sents.length, r1 = r1Window(stem, S, N), rnd = rngFor(seedFor("confirm-R2", "window", stem));
  const pw = pickWindow(tr.sents, rnd, r1.offset, r1.offset + r1.taken), offset = pw.offset, taken = pw.taken, reduced = pw.reduced, overlapsR1 = !!pw.overlapsR1;
  const sents = tr.sents.slice(offset, offset + taken), D = dupKeys(stem), keep = sents.map((x) => !D.has(x.join(" "))), removed = keep.filter((k) => !k).length;
  const text = sents.filter((_, i) => keep[i]).map((x) => x.join(" ")).join("\n");
  W[stem] = { stem, set, source: tp, devSentences: S, trainSentences: N, r1Offset: r1.offset, r1Taken: r1.taken, r1From: r1.from, offset, taken, reduced, overlapsR1, validStarts: pw.validStarts, removedDup: removed, sentencesKept: keep.filter(Boolean).length, tokens: tokensOf(sents.filter((_, i) => keep[i])), textSha256: sha256(text) };
  console.error(stem, set, "dev", S, "train", N, "r1", r1.offset, r1.taken, r1.from, "->", offset, taken, "tokens", W[stem].tokens, reduced ? "REDUCED" : "", overlapsR1 ? "OVERLAPS-R1" : "", "dup", removed);
}
for (const [stem, spec] of Object.entries(FRESH)) {
  const [dir, split] = spec.split(":"), fp = path.join(EO, dir, `${dir}-ud-${split}.conllu`); if (!fs.existsSync(fp)) { W[stem] = { stem, set: "A", error: "missing" }; console.error(stem, "MISSING"); continue; }
  const tr = readConllu(fp), N = tr.sents.length, cum = [0]; for (const x of tr.sents) cum.push(cum.at(-1) + x.length); const TOT = cum[N], TARGET = 20000, rnd = rngFor(seedFor("confirm-R2", "window", stem));
  let maxStart = 0; if (TOT > TARGET) { maxStart = N - 1; while (maxStart > 0 && TOT - cum[maxStart] < TARGET) maxStart -= 1; }
  const offset = TOT > TARGET ? Math.floor(rnd() * (maxStart + 1)) : 0; let end = offset, t = 0; while (end < N && t < TARGET) { t += tr.sents[end].length; end += 1; }
  const text = tr.sents.slice(offset, end).map((x) => x.join(" ")).join("\n");
  W[stem] = { stem, set: "A", source: fp, trainSentences: N, totalTokens: TOT, offset, taken: end - offset, tokens: t, textSha256: sha256(text) };
  console.error(stem, "A", spec, "N", N, "tokens", TOT, "->", offset, end - offset, t);
}
fs.writeFileSync(path.join(HERE, "windows.json"), JSON.stringify(W, null, 1)); console.log("windows", Object.keys(W).length);
