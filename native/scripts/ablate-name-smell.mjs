#!/usr/bin/env node
// native/scripts/ablate-name-smell.mjs — THE GATE: every signal of name-smell.js is ablated (refit WITHOUT it) and compared with plain baselines, on an INDEPENDENT gold, in every condition. Nothing ships past a regression.
//   gold      native/tests/data/name-smell-gold.json: one labeller's reading of the capitalised types of five texts. It shares no origin with the treebank prior (the weak labels) or the parser (the tag signal).
//   fits      trained on the weak labels of four novels in four conditions (clean, lowercase, case noise, typos): exactly as fit-name-smell.mjs
//   verdicts  HARMFUL signal: removing it credibly IMPROVES gold AUC (90% bootstrap interval of ablated minus full is above 0) in some condition.   REGRESSION: a baseline credibly beats the full model in some condition.
// Usage: node native/scripts/ablate-name-smell.mjs --genesis <genesis-all.json from christos-c/bible-corpus, see HANDOFF> [--cache rows.json]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const F = await import("./fit-name-smell.mjs"), { nameSmell, logit } = await import("../adapters/text/name-smell.js"), { readDocument } = await import("../reading.js");
const { degrade, CONDITIONS, TRAIN, VALID, SEED, PSEUDO, chunkOf, rowsFor, fit, score, auc } = F;
const GOLD = JSON.parse(fs.readFileSync(path.join(ROOT, "native", "tests", "data", "name-smell-gold.json"), "utf8")), POS = JSON.parse(fs.readFileSync(path.resolve(ROOT, "..", "janus", "priors", "pos-eng.json"), "utf8")).forms;
const FEATS = ["mid", "init", "tag", "repeat"];
// ── data ──
const cache = arg("cache", "/tmp/name-smell-rows.json"); let train;
if (fs.existsSync(cache)) train = JSON.parse(fs.readFileSync(cache, "utf8")); else { train = []; for (const f of TRAIN) { const orig = chunkOf(f); for (const [ci, c] of CONDITIONS.entries()) for (const r of await rowsFor(orig, c, SEED + ci)) train.push({ ...r, c }); console.error("train", f); } fs.writeFileSync(cache, JSON.stringify(train)); }
const base = train.filter((r) => r.c === "clean" && r.y).length / train.filter((r) => r.c === "clean").length;
// gold texts
const pp = fs.readFileSync(path.resolve(ROOT, "..", "Zenodotus", "01-literature-books", "gutenberg", "pg1342_Pride_and_Prejudice.txt"), "utf8").split("\n");
const clean = (a, b) => pp.slice(a, b).join("\n").split(/\n\s*\n/).map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => x && !x.startsWith("[") && !x.includes("Illustration")).join("\n\n");
const TEXTS = { pp1: clean(672, 806), pp2: clean(809, 927) };
const gp = arg("genesis", null); if (gp) { const all = JSON.parse(fs.readFileSync(gp, "utf8")), v = (ed, pre) => Object.keys(all[ed].verses).filter((id) => pre.some((p) => id.startsWith(p))).map((id) => all[ed].verses[id]).join("\n\n"); Object.assign(TEXTS, { kjv13: v("English", ["1.", "2.", "3."]), web13: v("English-WEB", ["1.", "2.", "3."]), kjv37: v("English", ["37.", "39.", "40.", "41."]) }); }
const DUMMY = { intercept: 0, w: { mid: 0, init: 0, tag: 0, repeat: 0 }, prior: { pseudo: PSEUDO, base } };
const goldCache = arg("goldcache", "/tmp/name-smell-gold-rows.json"); let gold = []; const labelOf = new Map([...GOLD.name.map((w) => [w, 1]), ...GOLD.not_name.map((w) => [w, 0])]);
if (fs.existsSync(goldCache)) gold = JSON.parse(fs.readFileSync(goldCache, "utf8"));
else { for (const [tk, orig] of Object.entries(TEXTS)) for (const [ci, c] of CONDITIONS.entries()) {
  const text = degrade[c](orig, F.rngFor ? F.rngFor(SEED + ci) : (() => { let s = SEED + ci; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })());
  const w = await readDocument(text, { language: "eng", rows: true }), starts = new Set(w.parse.map((p) => p.offset)), posAt = new Map(); for (const p of w.parse) for (const r of p.rows ?? []) posAt.set(p.offset + r.start, r.upos);
  for (const [surf, y] of labelOf) { const r = nameSmell({ surface: surf, text, sentenceStarts: starts, pos: POS, posAt, weights: DUMMY }); if (r.p === null) continue; gold.push({ y, c, t: tk, w: surf, x: FEATS.map((f) => r.features[f]), prior: r.contributions.prior, capMid: r.evidence.capMid }); }
  console.error("gold", tk, c);
}
fs.writeFileSync(goldCache, JSON.stringify(gold)); }
// ── models: a feature subset, refit on the weak-label train rows; `withPrior` adds the Bayesian prior offset (fixed weight 1) ──
const sub = (rows, idx) => rows.map((r) => ({ ...r, x: idx.map((i) => r.x[i]) }));
const mk = (idx) => { const m = fit(sub(train, idx)); return { idx, m, s: (r) => score(m, { x: idx.map((i) => r.x[i]) }) }; };
const MODELS = { full: [0, 1, 2, 3], "-mid": [1, 2, 3], "-init": [0, 2, 3], "-tag": [0, 1, 3], "-repeat": [0, 1, 2], "mid+init (casing only)": [0, 1], "tag only": [2] };
const fitted = Object.fromEntries(Object.entries(MODELS).map(([k, idx]) => [k, mk(idx)]));
const scorers = {}; for (const [k, f] of Object.entries(fitted)) { scorers[k] = f.s; scorers[k + " +prior"] = (r) => f.s(r) + r.prior; }
scorers["baseline: capitalised mid-sentence at least once"] = (r) => (r.capMid > 0 ? 1 : 0); scorers["baseline: prior offset only"] = (r) => r.prior;
// ── evaluation with bootstrap ──
const rng = (() => { let s = 7; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
// rank-based AUC (Mann-Whitney with mid-ranks for ties): O(n log n), so the bootstrap is affordable
const fastAuc = (pos, neg) => { if (!pos.length || !neg.length) return null; const all = [...pos.map((v) => [v, 1]), ...neg.map((v) => [v, 0])].sort((a, b) => a[0] - b[0]); let rankSumPos = 0, i = 0; while (i < all.length) { let j = i; while (j + 1 < all.length && all[j + 1][0] === all[i][0]) j++; const mid = (i + j) / 2 + 1; for (let k = i; k <= j; k++) if (all[k][1]) rankSumPos += mid; i = j + 1; } return (rankSumPos - pos.length * (pos.length + 1) / 2) / (pos.length * neg.length); };
const aucOf = (rows, f) => fastAuc(rows.filter((r) => r.y).map(f), rows.filter((r) => !r.y).map(f));
const conds = [...CONDITIONS, "ALL"], by = (c) => gold.filter((r) => c === "ALL" || r.c === c);
const boot = (rows, fa, fb, B = 300) => { const d = []; for (let b = 0; b < B; b++) { const s = rows.map(() => rows[Math.floor(rng() * rows.length)]); const a = aucOf(s, fa), bb = aucOf(s, fb); if (a !== null && bb !== null) d.push(bb - a); } d.sort((x, y) => x - y); return { mean: d.reduce((a, b) => a + b, 0) / d.length, lo: d[Math.floor(d.length * 0.05)], hi: d[Math.floor(d.length * 0.95)] }; };
console.log(`gold: ${gold.length} samples (${gold.filter((r) => r.y).length} names, ${gold.filter((r) => !r.y).length} not-names) over ${Object.keys(TEXTS).length} texts x ${CONDITIONS.length} conditions;  weak-label base rate ${base.toFixed(3)}\n`);
console.log("AUC on the INDEPENDENT gold:"); console.log("model".padEnd(52) + conds.map((c) => c.padStart(10)).join(""));
for (const k of Object.keys(scorers)) console.log(k.padEnd(52) + conds.map((c) => String((aucOf(by(c), scorers[k]) ?? NaN).toFixed(3)).padStart(10)).join(""));
console.log("\nweak-label VALIDATION AUC (circular: the labels and the tag share the treebank), full model:", (() => { const v = []; for (const f of VALID) { /* validation rows computed on demand would re-parse; the fit script reports them */ } return "see fit-name-smell.mjs output"; })());
const verdict = { harmful: [], regress: [] };
console.log("\nABLATION (gold AUC of ablated minus full, 90% bootstrap interval; positive = removing the signal HELPS):");
for (const k of ["-mid", "-init", "-tag", "-repeat"]) for (const pr of ["", " +prior"]) for (const c of conds) { const b = boot(by(c), scorers["full" + pr], scorers[k + pr]); if (c === "ALL") console.log(`  ${(k + pr).padEnd(16)} ALL   mean ${b.mean.toFixed(3)}  [${b.lo.toFixed(3)}, ${b.hi.toFixed(3)}]`); if (b.lo > 0) verdict.harmful.push(`${k + pr}/${c} (+${b.mean.toFixed(3)})`); }
console.log("\nBASELINES minus full (positive = the baseline beats the full model):");
for (const k of ["baseline: capitalised mid-sentence at least once", "baseline: prior offset only", "mid+init (casing only) +prior", "tag only +prior"]) for (const c of conds) { const fu = k.startsWith("baseline") && !k.includes("prior offset") ? "full" : "full +prior"; const b = boot(by(c), scorers[fu], scorers[k]); if (c === "ALL") console.log(`  ${k.padEnd(52)} vs ${fu.padEnd(12)} ALL mean ${b.mean.toFixed(3)} [${b.lo.toFixed(3)}, ${b.hi.toFixed(3)}]`); if (b.lo > 0) verdict.regress.push(`${k}/${c} (+${b.mean.toFixed(3)})`); }
console.log("\nGATE:", verdict.harmful.length || verdict.regress.length ? "FAIL — do not ship" : "PASS"); if (verdict.harmful.length) console.log("  harmful signals:", verdict.harmful.join("; ")); if (verdict.regress.length) console.log("  regressions vs a baseline:", verdict.regress.join("; "));
process.exitCode = verdict.harmful.length || verdict.regress.length ? 1 : 0;
