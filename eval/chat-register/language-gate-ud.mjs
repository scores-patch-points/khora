// EXPLORATORY. Mechanic 5, the other side of the chat tally: does the gate still READ real foreign text, and does it still say English when it is English?
// eval/chat-register/language-gate.mjs shows where chat goes but has no language gold. This one has gold, in two sets that never meet:
//   PUD  UD Parallel treebanks (the SAME 1000 sentences in every language, test split only, never counted into a prior). The gate's margin floor (LATIN_MARGIN_FLOOR) is read from here:
//        the 10th percentile of the margins of the identifier's correct answers on sentences of 3..8 words, Latin-script languages. This script prints that figure, so the dial is a measurement.
//   VAL  a DIFFERENT treebank of the same languages (dev split, test where there is no dev; GSD, ISDT, PDB, CAC, LinES, BOUN, TDT, DDT...), read after the floor was set: the held-out check.
// Per language, short sentences (3..8 words, the hard case for an identifier) and sentences of any length, each read through readerFor. Per message the outcome is: right (read as that language, or a
// typed gap that NAMES that language), unnamed (a typed gap with no language: the reader said it could not tell), wrong (read as or named as another language). The raw identifier is shown beside the
// gate (`raw`) so what the gate costs on foreign text and what it saves on chat (language-gate.mjs) are both on the page. English gold: UD English PUD, and EWT dev.
//   node eval/chat-register/language-gate-ud.mjs [N per language and length class = 60]   -> eval/chat-register/language-gate-ud.json
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const N = Number(process.argv[2] || 60);
const UD = process.env.UD_TREEBANKS || path.resolve(ROOT, "..", "ud-treebanks");
const { readerFor } = await import(pathToFileURL(path.join(ROOT, "native", "reading.js")).href);
const { identifyLanguage } = await import(pathToFileURL(path.join(ROOT, "native", "the-fold", "langid.mjs")).href);
const { LATIN_MARGIN_FLOOR, VOCABULARY_FLOOR } = await import(pathToFileURL(path.join(ROOT, "native", "adapters", "text", "language-gate.mjs")).href);
const { priorsFor } = await import(pathToFileURL(path.join(ROOT, "native", "the-fold", "read-core.mjs")).href);
const { classifyWord } = await import(pathToFileURL(path.join(ROOT, "native", "adapters", "text", "wordclass.js")).href);
const { tokenize } = await import(pathToFileURL(path.join(ROOT, "native", "adapters", "text", "english-parser.js")).href);
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase();
const vocabShare = (text, stem) => { let p = null; try { p = priorsFor(stem)?.posPrior ?? null; } catch { /* none */ } if (!p) return null; let k = 0, n = 0; for (const t of tokenize(text)) { const f = t.form.toLowerCase(), cs = [...f]; if (!cs.some(isLetter) || cs.length < 2 || cs.some((c) => c >= "0" && c <= "9")) continue; n++; if (classifyWord(f, { posPrior: p })?.found) k++; } return n ? k / n : null; };
// the gold: the file-name prefix of a treebank -> the stem the reader's priors use (a table of file names, not of words)
const STEM = { en: "eng", fr: "fra", de: "deu", es: "spa", it: "ita", pt: "por", pl: "pol", cs: "ces", sv: "swe", tr: "tur", id: "ind", fi: "fin", gl: "glg", ru: "rus", zh: "cmn", hi: "hin", da: "dan", ca: "cat", nl: "nld", no: "nob", hu: "hun", hr: "hrv", sk: "slk", sl: "slv", lv: "lav", lt: "lit", ga: "gle", eu: "eus", af: "afr", ro: "ron", la: "lat", mt: "mlt", cy: "cym", vi: "vie", et: "est", wo: "wol" };
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");
const sentences = (file) => fs.readFileSync(file, "utf8").split("\n\n").map((b) => { const ls = b.split("\n"); const text = ls.find((l) => l.startsWith("# text = "))?.slice(9); const n = ls.filter((l) => l && !l.startsWith("#") && /^\d+\t/.test(l)).length; return text ? { text, n } : null; }).filter(Boolean);   // regex-ok: the CoNLL-U id column, a file format
const find = (dir, kind) => { const d = path.join(UD, dir); if (!fs.existsSync(d)) return null; const fs_ = fs.readdirSync(d).filter((f) => f.endsWith(".conllu")); return fs_.find((f) => f.includes(`-ud-${kind}`)) ?? null; };
const pud = fs.readdirSync(UD).filter((d) => d.endsWith("-PUD")).map((d) => ({ dir: d, file: find(d, "test") })).filter((x) => x.file && STEM[x.file.split("_")[0]]).map((x) => ({ ...x, stem: STEM[x.file.split("_")[0]] }));
const pudStems = new Set(pud.map((x) => x.stem));
const val = [];   // one other treebank per stem (the first by name that has a dev or test split), none of the PUD files
for (const d of fs.readdirSync(UD).sort()) { if (!d.startsWith("UD_") || d.endsWith("-PUD")) continue; const f = find(d, "dev") ?? find(d, "test"); if (!f) continue; const stem = STEM[f.split("_")[0]]; if (!stem || val.some((v) => v.stem === stem)) continue; val.push({ dir: d, file: f, stem }); }
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const out = {}, totals = {}, calibration = [], calibrationShare = [];
async function run(label, sets) {
  console.log(`\n${label}: raw = the identifier alone, gate = readerFor; right / unnamed (typed gap, no language) / wrong`);
  for (const { dir, file, stem } of sets) {
    const all = sentences(path.join(UD, dir, file)).map((s) => ({ ...s, h: sha(s.text) })).sort((a, b) => (a.h < b.h ? -1 : 1));
    const classes = { short: all.filter((s) => s.n >= 3 && s.n <= 8).slice(0, N), any: all.slice(0, N) };
    (out[label] ??= {})[stem] = {};
    for (const [cls, items] of Object.entries(classes)) {
      const t = { n: items.length, gate: { right: 0, unnamed: 0, wrong: 0, read: 0 }, raw: { right: 0, unnamed: 0, wrong: 0 }, wrongs: [] };
      for (const s of items) {
        const r = await readerFor(s.text), said = r.gap ? r.gap.language ?? null : r.language;
        if (said === stem) { t.gate.right++; if (!r.gap) t.gate.read++; } else if (!said) t.gate.unnamed++; else { t.gate.wrong++; t.wrongs.length < 4 && t.wrongs.push(`${said}: ${s.text.slice(0, 50)}`); }
        const d = identifyLanguage(s.text), raw = d.confident ? d.language : null;
        if (raw === stem) { t.raw.right++; if (label === "PUD" && cls === "short" && d.script === "Latin" && stem !== "eng") { calibration.push(d.margin); const v = vocabShare(s.text, stem); if (v != null) calibrationShare.push(v); } } else if (!raw) t.raw.unnamed++; else t.raw.wrong++;
      }
      out[label][stem][cls] = t; const T = (totals[`${label} ${cls}`] ??= { n: 0 }); T.n += t.n; for (const k of ["right", "unnamed", "wrong"]) { T[k] = (T[k] ?? 0) + t.gate[k]; T["raw_" + k] = (T["raw_" + k] ?? 0) + t.raw[k]; }
      console.log(`${stem}  ${cls.padEnd(5)} n=${String(t.n).padStart(3)}  gate right ${String(t.gate.right).padStart(3)} (read ${String(t.gate.read).padStart(3)}) unnamed ${String(t.gate.unnamed).padStart(3)} wrong ${String(t.gate.wrong).padStart(3)}   raw right ${String(t.raw.right).padStart(3)} unnamed ${String(t.raw.unnamed).padStart(3)} wrong ${String(t.raw.wrong).padStart(3)}${t.wrongs.length ? "   e.g. " + t.wrongs.slice(0, 2).join(" | ") : ""}`);
    }
  }
}
await run("PUD", pud);
console.log(`\nCALIBRATION: margins of the identifier's correct answers, PUD, Latin script, 3..8 words, not English: n=${calibration.length}, q10 ${q(calibration, 0.1).toFixed(2)}, q25 ${q(calibration, 0.25).toFixed(2)}, median ${q(calibration, 0.5).toFixed(2)}; the gate's floor is ${LATIN_MARGIN_FLOOR}`);
console.log(`CALIBRATION: share of the words the claimed language's own prior knows, same answers: n=${calibrationShare.length}, q10 ${q(calibrationShare, 0.1).toFixed(2)}, q25 ${q(calibrationShare, 0.25).toFixed(2)}, median ${q(calibrationShare, 0.5).toFixed(2)}; the gate's floor is ${VOCABULARY_FLOOR}`);
await run("VAL", val);
for (const [k, t] of Object.entries(totals)) console.log(`ALL ${k.padEnd(10)} n=${String(t.n).padStart(4)}  gate right ${t.right} (${(100 * t.right / t.n).toFixed(1)}%) unnamed ${t.unnamed} (${(100 * t.unnamed / t.n).toFixed(1)}%) wrong ${t.wrong} (${(100 * t.wrong / t.n).toFixed(1)}%)   raw right ${t.raw_right} unnamed ${t.raw_unnamed} wrong ${t.raw_wrong}`);
fs.writeFileSync(path.join(HERE, "language-gate-ud.json"), JSON.stringify({ stamp: { when: new Date().toISOString(), split: "EXPLORATORY; gold = UD PUD test (the floor is read from it) and, held out from that, one other treebank per language (dev, else test); neither was counted into a prior", N, floor: LATIN_MARGIN_FLOOR, vocabularyFloor: VOCABULARY_FLOOR }, calibration: { n: calibration.length, marginQ10: q(calibration, 0.1), vocabularyQ10: q(calibrationShare, 0.1) }, out, totals }, null, 1));
process.exit(0);
