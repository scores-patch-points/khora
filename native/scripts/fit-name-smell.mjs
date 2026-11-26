#!/usr/bin/env node
// native/scripts/fit-name-smell.mjs — LEARN the weights of adapters/text/name-smell.js; nothing in the model is set by hand except the smoothing constant.
//
// LABELS ARE WEAK AND SAYS SO: a word type the part-of-speech prior (treebank-derived) has seen at least 3 times is a NAME if its PROPN share is at least 0.8 and a NOT-NAME if at most 0.2; every other type is skipped.
// The prior is the label source, so it is EXCLUDED from the features at fit time: the weights learn what the TEXT's own evidence (casing, the parser's tag, repetition) predicts about such types. At inference the prior
// returns as a Bayesian offset (name-smell.js), so for a word the treebank knows well the prior dominates, and the text evidence matters where the prior is weak or silent: unattested names, typos, casual speech.
// TRAINING SURVIVES DEGRADATION: each training chunk is read in four conditions (clean, ALL-LOWERCASE, 30% RANDOM CASE FLIPS, 5% TYPOS) and the weights are fitted over all of them at once, so no signal is trusted more than it earns.
// Usage: node native/scripts/fit-name-smell.mjs [--out <scratch path>]   (a baseline and a library for the ablation scripts; it does NOT produce the shipped weights)
// Needs the reader's priors (KHORA_PRIORS_DIR), the pharos clone (PHAROS_HOME) and the Gutenberg texts in Zenodotus beside khora. Seeded: the same inputs give the same weights.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
// NO DEFAULT OUTPUT: this weak-label fit is the CIRCULAR baseline (its labels and the parser's tag share the treebank). The shipped weights come from ablate-name-smell-loto.mjs, which fits on independent labels. Writing here by default would overwrite them.
const OUT = arg("out", null);
const GUT = path.resolve(ROOT, "..", "Zenodotus", "01-literature-books", "gutenberg");
export const TRAIN = ["pg1661_The_Adventures_of_Tom_Sawyer.txt", "pg345_Dracula.txt", "pg145_Middlemarch-George-Eliot.txt", "pg768_The_Adventures_of_Sherlock_Holmes.txt"];
export const VALID = ["pg84_Frankenstein.txt", "pg98_A_Tale_of_Two_Cities.txt"];
export const CHUNK = 22000, PSEUDO = 2, SEED = 20261126, POS_FORMS = null;
const rng = (s) => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ── degradations of a text (deterministic given the seed) ──
export const degrade = { clean: (t) => t, lowercase: (t) => t.toLowerCase(),
  caseNoise: (t, r) => t.replace(/\p{L}+/gu, (w) => (r() < 0.3 ? (w[0] === w[0].toUpperCase() ? w[0].toLowerCase() : w[0].toUpperCase()) + w.slice(1) : w)),
  typos: (t, r) => t.replace(/\p{L}{4,}/gu, (w) => { if (r() >= 0.05) return w; const i = 1 + Math.floor(r() * (w.length - 2)), k = Math.floor(r() * 3); return k === 0 ? w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2) : k === 1 ? w.slice(0, i) + w.slice(i + 1) : w.slice(0, i) + w[i] + w.slice(i); }) };
export const CONDITIONS = Object.keys(degrade);

const { readDocument } = await import("../reading.js");
const { nameSmell } = await import("../adapters/text/name-smell.js");
const POS = JSON.parse(fs.readFileSync(path.resolve(ROOT, "..", "janus", "priors", "pos-eng.json"), "utf8")).forms;
const label = (w) => { const e = POS[w]; if (!e) return null; const n = Object.values(e).reduce((a, b) => a + b, 0); if (n < 3) return null; const s = (e.PROPN ?? 0) / n; return s >= 0.8 ? 1 : s <= 0.2 ? 0 : null; };
export const chunkOf = (file) => { const t = fs.readFileSync(path.join(GUT, file), "utf8").split("\r\n").join("\n"), a = Math.floor(t.length * 0.4), s = t.indexOf("\n\n", a) + 2, e = t.indexOf("\n\n", s + CHUNK); return t.slice(s, e > 0 ? e : s + CHUNK).replace(/_/g, ""); };
const DUMMY = { intercept: 0, w: { mid: 0, init: 0, tag: 0, repeat: 0 }, prior: { pseudo: PSEUDO, base: 0.2 } };

/** feature rows for every labelled type of one text in one condition */
export async function rowsFor(original, condition, seed) {
  const text = degrade[condition](original, rng(seed)), w = await readDocument(text, { language: "eng", rows: true });
  const starts = new Set(w.parse.map((p) => p.offset)), posAt = new Map(); for (const p of w.parse) for (const r of p.rows ?? []) posAt.set(p.offset + r.start, r.upos);
  const types = new Map(); for (const m of original.matchAll(/\p{L}[\p{L}'’-]*/gu)) { const lw = m[0].toLowerCase(); if (m[0][0] !== m[0][0].toLowerCase()) types.set(lw, m[0]); }   // types capitalised at least once in the ORIGINAL text
  const out = [];
  for (const [lw, surf] of types) { const y = label(lw); if (y === null) continue; const r = nameSmell({ surface: surf, text, sentenceStarts: starts, pos: undefined, posAt, weights: DUMMY }); if (r.p === null) continue; out.push({ lw, y, x: [r.features.mid, r.features.init, r.features.tag, r.features.repeat] }); }
  return out;
}
export const auc = (pos, neg) => { let w = 0; for (const a of pos) for (const b of neg) w += a > b ? 1 : a === b ? 0.5 : 0; return pos.length && neg.length ? w / (pos.length * neg.length) : null; };
const sig = (z) => 1 / (1 + Math.exp(-z));
export function fit(rows, iters = 4000, lr = 0.4, l2 = 0.002) {
  let w = [0, 0, 0, 0], b = 0; const n = rows.length, pos = rows.filter((r) => r.y).length, wp = n / (2 * pos), wn = n / (2 * (n - pos));   // class-balanced
  for (let k = 0; k < iters; k++) { const g = [0, 0, 0, 0]; let gb = 0; for (const r of rows) { const z = b + r.x.reduce((s, v, i) => s + v * w[i], 0), e = (sig(z) - r.y) * (r.y ? wp : wn); gb += e; r.x.forEach((v, i) => { g[i] += e * v; }); } b -= lr * gb / n; w = w.map((v, i) => v - lr * (g[i] / n + l2 * v)); }
  return { b, w };
}
export const score = (m, r) => m.b + r.x.reduce((s, v, i) => s + v * m.w[i], 0);

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now(), all = { train: [], valid: [] }, base = { pos: 0, n: 0 };
  for (const [split, files] of [["train", TRAIN], ["valid", VALID]]) for (const f of files) { const orig = chunkOf(f); for (const [ci, c] of CONDITIONS.entries()) { const rs = await rowsFor(orig, c, SEED + ci); for (const r of rs) all[split].push({ ...r, c, f }); if (c === "clean" && split === "train") { base.pos += rs.filter((r) => r.y).length; base.n += rs.length; } } console.error(`${split} ${f} done ${Math.round((Date.now() - t0) / 1000)}s`); }
  const m = fit(all.train), report = {};
  for (const split of ["train", "valid"]) for (const c of ["ALL", ...CONDITIONS]) { const rs = all[split].filter((r) => c === "ALL" || r.c === c); report[`${split}/${c}`] = { n: rs.length, positives: rs.filter((r) => r.y).length, auc: +auc(rs.filter((r) => r.y).map((r) => score(m, r)), rs.filter((r) => !r.y).map((r) => score(m, r))).toFixed(3) }; }
  const out = { schema: "NameSmellWeights@1", lang: "eng", intercept: +m.b.toFixed(4), w: { mid: +m.w[0].toFixed(4), init: +m.w[1].toFixed(4), tag: +m.w[2].toFixed(4), repeat: +m.w[3].toFixed(4) }, prior: { pseudo: PSEUDO, base: +(base.pos / base.n).toFixed(4) },
    fit: { how: "logistic regression, class-balanced, L2 0.002; labels = POS prior PROPN share (n>=3: >=0.8 name, <=0.2 not); the prior is excluded from the features and returns as a Bayesian offset", seed: SEED, conditions: CONDITIONS, chunkChars: CHUNK, trainedOn: TRAIN, validatedOn: VALID, report }, sha16: null };
  out.sha16 = crypto.createHash("sha256").update(JSON.stringify({ ...out, sha16: null })).digest("hex").slice(0, 16);
  if (OUT) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n"); console.error(`wrote ${OUT}`); } else console.error("no --out given: nothing written");
  console.log(JSON.stringify({ weights: { intercept: out.intercept, w: out.w, prior: out.prior }, report }, null, 1));
}
