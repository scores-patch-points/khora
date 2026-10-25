#!/usr/bin/env node
// scripts/train-ud-language.mjs — the grammar of ONE language, both ways, from its Universal Dependencies treebank.
//
//   IN   ud-parser-<code>-<tb>.json.gz   UDParser@1    text -> tokens, lemma, part of speech, head, relation (ud-parser.js)
//        ud-tokenizer-<code>.json.gz     UDTokenizer@1 multiword splits, abbreviations, elisions, hyphen clitics; a character
//                                                      segmenter where the script has no spaces (trained here, averaged perceptron)
//   OUT  ud-grammar-<code>.json.gz       UDGrammar@1   the way back from the EOT meaning layer: the language's measured word-order
//                                                      parameters (eot-rich.js::measureOrder) and its form table (eot-realize.js::learnForms)
//
// THE PROVENANCE LAW (train-english-parser.mjs): every prior carries what taught it — the treebank, the exact file and its hash, the
// split rule, the cap — and what it scored on sentences it never trained on. The giver is the treebank; nothing is inferred about
// genre, period or region here (those are declared by hand in the English builder; this builder does not pretend to know them).
//
//   node native/scripts/train-ud-language.mjs --code=da --dir=UD_Danish-DDT [--cap=8000] [--iterations=10] [--out=../janus/priors]
//        [--ud=data/ud] [--unimorph=<iso3 file>] [--prune=1]      (paths relative to the working directory: run from the workspace root)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseConllu, toEot, annotationFromMeaning, measureOrder, linearize, kendallTau } from "../kernel/eot-rich.js";
import { learnForms, normFeats } from "../kernel/eot-realize.js";
import { train, loadModel, analyse, unimorphLexicon } from "../adapters/text/ud-parser.js";
import { Perceptron } from "../adapters/text/english-parser.js";

const HERE = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.resolve(HERE, "..", "..");
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const CODE = arg("code"), DIR = arg("dir"); if (!CODE || !DIR) { console.error("--code and --dir are required"); process.exit(2); }
const UD = path.resolve(process.cwd(), arg("ud", "data/ud")), OUT = path.resolve(process.cwd(), arg("out", "janus/priors")); // relative to the WORKSPACE (cwd): khora may be a symlink out of it
const CAP = Number(arg("cap", "8000")), ITER = Number(arg("iterations", "10")), PRUNE = Number(arg("prune", "1")), UNIMORPH = arg("unimorph", null), ONLY = arg("only", null); // --only=grammar: a language whose parser prior already exists gets only the way back
const tb = DIR.replace(/^UD_/, "");
const files = fs.readdirSync(path.join(UD, DIR));
const pick = (suffix) => files.find((f) => f.endsWith(`-ud-${suffix}.conllu`)) ?? null;
const trainFile = pick("train"), devFile = pick("dev"), testFile = pick("test");
const read = (f) => parseConllu(fs.readFileSync(path.join(UD, DIR, f), "utf8")).filter((s) => s.tokens.length && s.tokens.every((t) => t.head !== null));
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(UD, DIR, f))).digest("hex");

// ---- the split: train on the train split (capped, first CAP sentences); hold out the official dev, else test, else every tenth
let trainAll, heldOut, splitRule, trainedFile;
if (trainFile) { trainAll = read(trainFile); trainedFile = trainFile; heldOut = devFile ? read(devFile) : testFile ? read(testFile) : null; splitRule = devFile ? `held out: ${devFile}` : testFile ? `held out: ${testFile}` : "held out: every tenth training sentence (index mod 10 = 9)"; }
else { const f = devFile ?? testFile; trainAll = read(f); trainedFile = f; heldOut = null; splitRule = `no train split: trained on ${f}; held out: every tenth sentence (index mod 10 = 9)`; }
if (!heldOut) { heldOut = trainAll.filter((_, i) => i % 10 === 9); trainAll = trainAll.filter((_, i) => i % 10 !== 9); }
const trainSet = trainAll.slice(0, CAP); heldOut = heldOut.slice(0, 1000);
const log = (m) => console.log(`[${CODE}] ${m}`);
log(`${DIR}: ${trainedFile} ${trainAll.length} sentences, trained on ${trainSet.length} (cap ${CAP}); ${splitRule} (${heldOut.length} held out)`);

// ---- received lexicon (UniMorph), if given
let lex = null, lexSource = null;
if (UNIMORPH && fs.existsSync(UNIMORPH)) { lex = unimorphLexicon(fs.readFileSync(UNIMORPH, "utf8")); lexSource = path.relative(process.cwd(), UNIMORPH); log(`lexicon ${lexSource}: ${lex.size} forms`); }

const pct = (a, b) => Number((100 * a / Math.max(1, b)).toFixed(1));
// ---- the parser
const t0 = Date.now();
let json = null, tokenizer = null;
if (ONLY !== "grammar") {
json = train(trainSet, { iterations: ITER, seed: `${DIR}#${sha(trainedFile).slice(0, 12)}`, lex, lexSource, log: (m) => log(`   ${m}`) });
log(`parser trained in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
const prune = (p) => { if (!PRUNE) return p; const w = {}; let kept = 0, all = 0; for (const [f, arr] of Object.entries(p.w)) { all++; let mx = 0; for (let i = 1; i < arr.length; i += 2) mx = Math.max(mx, Math.abs(arr[i])); if (mx >= PRUNE) { w[f] = arr; kept++; } } return { ...p, w, pruned: { kept, all, threshold: PRUNE } }; };
json.tagger = prune(json.tagger); json.parser = prune(json.parser);
const model = loadModel(json, { lex });
let n = 0, nNP = 0, upos = 0, uas = 0, las = 0;
for (const s of heldOut) { const rows = analyse(model, s.tokens.map((t) => t.form)); s.tokens.forEach((g, k) => { const r = rows[k]; n++; if (r.upos === g.upos) upos++; if (g.upos === "PUNCT") return; nNP++; if (r.head === g.head) { uas++; if (r.deprel === g.deprel) las++; } }); }
json.meta = { ...json.meta, treebank: DIR, file: trainedFile, sha256: sha(trainedFile), cap: CAP, split: splitRule, giver: `Universal Dependencies ${DIR} (github.com/UniversalDependencies/${DIR}); licence per the treebank's own README`, prune: PRUNE,
  scores: { heldOut: heldOut.length, words: n, upos: pct(upos, n), uas: pct(uas, nNP), las: pct(las, nNP), punct: "excluded" }, builtAt: new Date().toISOString(), builder: "native/scripts/train-ud-language.mjs" };
log(`held-out: upos ${json.meta.scores.upos} uas ${json.meta.scores.uas} las ${json.meta.scores.las} (${n} words)`);

// ---- the tokenizer prior, from the treebank's own multiword tokens, forms and raw text
const mwtCount = new Map(), abbrev = new Map(), elide = new Map(), punctRuns = new Map(), clitic = new Map(); let hyphenInside = 0, hyphenToken = 0;
for (const s of trainAll) {
  const byId = new Map(s.tokens.map((t) => [t.id, t]));
  for (const m of s.multi) { const [a, b] = m.range.split("-").map(Number); const parts = []; for (let i = a; i <= b; i++) if (byId.has(i)) parts.push(byId.get(i).form); if (parts.length >= 2) { const k = m.form.toLowerCase(); const e = mwtCount.get(k) ?? new Map(); const pk = parts.join("\u0001"); e.set(pk, (e.get(pk) ?? 0) + 1); mwtCount.set(k, e); } }
  for (const t of s.tokens) { const f = t.form; const lf = f.toLowerCase();
    if (t.upos !== "PUNCT" && f.length > 1 && f.endsWith(".")) abbrev.set(lf, (abbrev.get(lf) ?? 0) + 1);
    if (f.length > 1 && /['’]$/.test(f)) elide.set(lf, (elide.get(lf) ?? 0) + 1);
    if (t.upos === "PUNCT" && f.length > 1 && /^[\p{P}\p{S}]+$/u.test(f)) punctRuns.set(f, (punctRuns.get(f) ?? 0) + 1);
    if (t.upos !== "PUNCT" && f.length > 1 && f.startsWith("-")) clitic.set(lf, (clitic.get(lf) ?? 0) + 1);
    if (/\p{L}-\p{L}/u.test(f)) hyphenInside++; if (f === "-" && t.upos === "PUNCT") hyphenToken++; }
}
const top = (m, min = 2) => [...m].filter(([, c]) => c >= min).sort((a, b) => b[1] - a[1]).map(([k]) => k);
const mwt = {}; for (const [k, e] of mwtCount) { const [best, c] = [...e].sort((a, b) => b[1] - a[1])[0]; if (c >= 2) mwt[k] = best.split("\u0001"); }
tokenizer = { schema: "UDTokenizer@1", mwt, abbrev: top(abbrev), words: top(elide), punctRuns: top(punctRuns), hyphenClitics: top(clitic), splitHyphens: hyphenToken > hyphenInside, segmenter: null, source: { treebank: DIR, file: trainedFile, sha256: json.meta.sha256 } };

// ---- a character segmenter where the raw text has no spaces (B = a token boundary before this character)
const texted = trainAll.filter((s) => s.text);
const spaceRatio = texted.length ? texted.reduce((a, s) => a + (s.text.split(" ").length - 1), 0) / texted.reduce((a, s) => a + s.tokens.length, 0) : null;
const ctype = (ch) => (ch === "_" ? "_" : /\p{Script=Hiragana}/u.test(ch) ? "h" : /[\p{Script=Katakana}ー]/u.test(ch) ? "H" : /\p{Script=Han}/u.test(ch) ? "k" : /\p{Script=Thai}/u.test(ch) ? "T" : /[0-9０-９]/.test(ch) ? "D" : /\p{L}/u.test(ch) ? "L" : "P");
function segFeats(ch, i) { const g = (j) => (j < 0 || j >= ch.length ? "_" : ch[j]), ty = (j) => ctype(g(j)); return ["b", "c0=" + g(i), "c-1=" + g(i - 1), "c1=" + g(i + 1), "c-2=" + g(i - 2), "c2=" + g(i + 2), "c-1c0=" + g(i - 1) + g(i), "c0c1=" + g(i) + g(i + 1), "c-2c-1=" + g(i - 2) + g(i - 1), "c-1c1=" + g(i - 1) + g(i + 1), "t0=" + ty(i), "t-1t0=" + ty(i - 1) + ty(i), "t0t1=" + ty(i) + ty(i + 1), "t-1t0t1=" + ty(i - 1) + ty(i) + ty(i + 1)]; }
function boundaries(s) { // align tokens to the raw text with spaces removed: label each character B if a token starts there
  const ch = [...s.text.replace(/\s+/g, "")]; const lab = new Array(ch.length).fill("I"); let pos = 0;
  for (const t of s.tokens) { const f = [...t.form.replace(/\s+/g, "")]; if (!f.length) continue; let at = -1; for (let k = pos; k <= Math.min(ch.length - f.length, pos + 3); k++) if (f.every((c, j) => ch[k + j] === c)) { at = k; break; } if (at < 0) return null; lab[at] = "B"; pos = at + f.length; }
  return { ch, lab };
}
if (spaceRatio !== null && spaceRatio < 0.5) {
  const data = texted.map(boundaries).filter(Boolean); const p = new Perceptron(["I", "B"]);
  for (let it = 0; it < 5; it++) for (const d of data) for (let i = 0; i < d.ch.length; i++) { const f = segFeats(d.ch, i); const guess = p.best(f), truth = p.index.get(d.lab[i]); p.update(truth, guess, f); p.tick(); }
  p.average(); const pj = prune(p.toJSON()); tokenizer.segmenter = { classes: pj.classes, w: pj.w };
  let ok = 0, tot = 0; for (const s of heldOut.filter((x) => x.text).slice(0, 200)) { const d = boundaries(s); if (!d) continue; const q = new Perceptron(pj.classes); q.w = new Map(Object.entries(pj.w).map(([k, v]) => { const a = new Float64Array(2); for (let i = 0; i < v.length; i += 2) a[v[i]] = v[i + 1]; return [k, a]; })); for (let i = 0; i < d.ch.length; i++) { tot++; if (q.classes[q.best(segFeats(d.ch, i))] === d.lab[i]) ok++; } }
  tokenizer.segmenterScore = { boundaryAccuracy: pct(ok, tot), chars: tot, trainedOn: data.length }; log(`segmenter trained (space ratio ${spaceRatio.toFixed(2)}): boundary accuracy ${tokenizer.segmenterScore.boundaryAccuracy}`);
} else tokenizer.spaceRatio = spaceRatio;
}

// ---- the grammar prior: the way back (order parameters + form table), scored on held-out sentences by the round trip's L3 and the form table
const order = measureOrder(trainSet); const forms = learnForms(trainSet);
// absorbed markers (eot-rich.js ABSORBED: case det aux cop mark cc clf): the most attested lemma per (relation | host class | marker feats),
// per (relation | host class) and per relation, so the way back can re-realize a marker in THIS language from its cube address alone
const ABSORBED = new Set(["case", "det", "aux", "cop", "mark", "cc", "clf"]); const mk = new Map();
for (const s of trainSet) { const byId = new Map(s.tokens.map((t) => [t.id, t])); for (const t of s.tokens) { const rel = String(t.deprel).split(":")[0]; if (!ABSORBED.has(rel)) continue; const host = byId.get(t.head); const hu = host ? host.upos : "ROOT"; for (const k of [`${rel}|${hu}|${normFeats(t.feats)}`, `${rel}|${hu}`, rel]) { const e = mk.get(k) ?? new Map(); e.set(`${t.lemma}|${t.upos}|${normFeats(t.feats)}`, (e.get(`${t.lemma}|${t.upos}|${normFeats(t.feats)}`) ?? 0) + 1); mk.set(k, e); } } }
const markers = {}; for (const [k, e] of mk) { const [best, n] = [...e].sort((a, b) => b[1] - a[1])[0]; const [lemma, upos, feats] = best.split("|"); markers[k] = { lemma, upos, feats, n, of: [...e.values()].reduce((a, b) => a + b, 0) }; }
const spaced = (() => { const tx = trainAll.filter((x) => x.text); if (!tx.length) return null; return tx.reduce((a, x) => a + (x.text.split(" ").length - 1), 0) / tx.reduce((a, x) => a + x.tokens.length, 0) >= 0.5; })();
let tauSum = 0, tauN = 0, formHit = 0, formN = 0, gapsN = 0;
for (const s of heldOut.slice(0, 300)) {
  const rec = toEot(s, { language: CODE }); gapsN += rec.gaps.length; const rows = annotationFromMeaning(rec);
  const produced = linearize(rows, order); const gold = rows.slice().sort((a, b) => (rec.surface.keyOfId ? 0 : 0)).map((r) => r.key);
  const goldOrder = s.tokens.filter((t) => rows.some((r) => r.key === rec.surface.keyOfId[t.id])).map((t) => rec.surface.keyOfId[t.id]);
  tauSum += kendallTau(produced, goldOrder); tauN++;
  for (const t of s.tokens) { if (String(t.deprel).split(":")[0] === "punct") continue; formN++; if (forms.get(`${t.upos}|${t.lemma}|${normFeats(t.feats)}`) === t.form) formHit++; }
}
const fileSha = sha(trainedFile), giver = `Universal Dependencies ${DIR} (github.com/UniversalDependencies/${DIR}); licence per the treebank's own README`;
const grammar = { schema: "UDGrammar@1", code: CODE, treebank: DIR, file: trainedFile, sha256: fileSha, cap: CAP, spaced, order, forms: Object.fromEntries(forms), markers,
  scores: { heldOut: Math.min(300, heldOut.length), orderKendallTau: Number((tauSum / Math.max(1, tauN)).toFixed(3)), formTableHit: pct(formHit, formN), formTableSize: forms.size, eotGapsPerSentence: Number((gapsN / Math.max(1, tauN)).toFixed(2)) },
  giver, builtAt: new Date().toISOString(), builder: "native/scripts/train-ud-language.mjs" };
log(`grammar: order tau ${grammar.scores.orderKendallTau}, form table hit ${grammar.scores.formTableHit}% (${forms.size} entries), EOT gaps/sentence ${grammar.scores.eotGapsPerSentence}`);

// ---- write
fs.mkdirSync(OUT, { recursive: true });
const write = (name, obj) => { const p = path.join(OUT, name); fs.writeFileSync(p, zlib.gzipSync(JSON.stringify(obj))); return `${name} ${(fs.statSync(p).size / 1e6).toFixed(1)} MB`; };
const tbSlug = tb.toLowerCase().replace(/[^a-z0-9]+/g, "-");
log([...(json ? [write(`ud-parser-${CODE}-${tbSlug}.json.gz`, json), write(`ud-tokenizer-${CODE}.json.gz`, tokenizer)] : []), write(`ud-grammar-${CODE}.json.gz`, grammar)].join("; "));
fs.writeFileSync(path.join(OUT, `ud-summary-${CODE}.json`), JSON.stringify({ code: CODE, treebank: DIR, only: ONLY, parser: json?.meta.scores ?? null, trainedOn: trainSet.length, split: splitRule, tokenizer: tokenizer ? { mwt: Object.keys(tokenizer.mwt).length, abbrev: tokenizer.abbrev.length, segmenter: tokenizer.segmenterScore ?? null, spaceRatio: tokenizer.spaceRatio ?? null } : null, grammar: grammar.scores, lexicon: lexSource, seconds: Math.round((Date.now() - t0) / 1000) }));
