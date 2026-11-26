#!/usr/bin/env node
// native/scripts/falsify-regional-cue.mjs — FALSIFY "an ant per phasepost": does a cue weight learned ON THE FLY, within the document being read, beat the shipped global weight?
//
// THE CLAIM UNDER TEST (the owner, 2026-11-26): a capital letter is a modest signal whose meaning should be weighted by how often, in THIS region, a capitalised token plays the role of a proper noun, learned from use; computed on the fly by Wilson ants.
// THE EXPERIMENT (pre-registered in scratchpad/wilson-ant-per-phasepost.md, section E): one cell (INS·Figure), one cue (capitalised mid-sentence, the `mid` signal of name-smell.js), the independent gold, leave-one-text-FAMILY-out.
//   A  the shipped model: global weights fitted on the OTHER text families (no regional learning)
//   B  the on-the-fly ant: the same model plus a regional offset d for the cue, re-estimated after every verified outcome in the document and shrunk toward the global rate by pseudo-counts (the existing smoothing constant 2):
//        d = logit((hits + 2*rho0) / (n + 2)) - logit(rho0), applied when the cue is present; rho0 = global P(name | cue present) on the training families. Outcomes arrive in reading order (first occurrence), AFTER each word is scored (prequential).
//   C  the label-origin swap (F6): B fed WEAK labels (the treebank prior) as its outcomes, scored against the independent gold: if C looks better than B, the ant is learning the labels' origin, not the cue.
// DECISION RULE (fixed before running): continue only if B is not credibly below A in ANY slice (clean, lowercase, caseNoise, typos, ALL) AND is credibly above A (90% paired bootstrap) in lowercase or caseNoise. Otherwise: a NEGATIVE RESULT is recorded.
// Usage: node native/scripts/falsify-regional-cue.mjs --genesis <genesis-all.json> [--goldcache /tmp/name-smell-gold-rows.json]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const F = await import("./fit-name-smell.mjs"); const { degrade, CONDITIONS, SEED } = F;
const gold = JSON.parse(fs.readFileSync(arg("goldcache", "/tmp/name-smell-gold-rows.json"), "utf8")), POS = JSON.parse(fs.readFileSync(path.resolve(ROOT, "..", "janus", "priors", "pos-eng.json"), "utf8")).forms;
const GROUP = { pp1: "pp", pp2: "pp", kjv13: "gen13", web13: "gen13", kjv37: "gen37" }, GROUPS = [...new Set(Object.values(GROUP))], PSEUDO = 2;
// ── the texts, regenerated exactly as the harness built them, to know the ORDER in which words are first read ──
const pp = fs.readFileSync(path.resolve(ROOT, "..", "Zenodotus", "01-literature-books", "gutenberg", "pg1342_Pride_and_Prejudice.txt"), "utf8").split("\n");
const clean = (a, b) => pp.slice(a, b).join("\n").split(/\n\s*\n/).map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => x && !x.startsWith("[") && !x.includes("Illustration")).join("\n\n");
const TEXTS = { pp1: clean(672, 806), pp2: clean(809, 927) }; const all = JSON.parse(fs.readFileSync(arg("genesis"), "utf8")), v = (ed, pre) => Object.keys(all[ed].verses).filter((id) => pre.some((p) => id.startsWith(p))).map((id) => all[ed].verses[id]).join("\n\n");
Object.assign(TEXTS, { kjv13: v("English", ["1.", "2.", "3."]), web13: v("English-WEB", ["1.", "2.", "3."]), kjv37: v("English", ["37.", "39.", "40.", "41."]) });
const rngFor = (s) => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const order = new Map();   // "t|c|w" -> character offset of the word's first occurrence in that document's degraded text
for (const [tk, orig] of Object.entries(TEXTS)) for (const [ci, c] of CONDITIONS.entries()) { const text = degrade[c](orig, rngFor(SEED + ci)), lt = text.toLowerCase(); for (const r of gold.filter((x) => x.t === tk && x.c === c)) order.set(`${tk}|${c}|${r.w}`, Math.max(0, lt.indexOf(r.w.toLowerCase()))); }
// weak labels for the origin swap: the treebank prior, exactly as fit-name-smell.mjs labels
const weak = (w) => { const e = POS[w.toLowerCase()]; if (!e) return null; const n = Object.values(e).reduce((a, b) => a + b, 0); if (n < 3) return null; const s = (e.PROPN ?? 0) / n; return s >= 0.8 ? 1 : s <= 0.2 ? 0 : null; };
// ── the model: logistic regression on [mid, init, tag] (the shipped survivors), class-balanced, fitted on the other families ──
const sig = (z) => 1 / (1 + Math.exp(-z)), logit = (p) => Math.log(p / (1 - p)), IDX = [0, 1, 2];
function fit(rows) { const X = (r) => [1, ...IDX.map((i) => r.x[i])], d = 4, n = rows.length, pos = rows.filter((r) => r.y).length, wp = n / (2 * pos), wn = n / (2 * (n - pos)); let w = new Array(d).fill(0); for (let k = 0; k < 3000; k++) { const g = new Array(d).fill(0); for (const r of rows) { const x = X(r), z = x.reduce((s, v2, i) => s + v2 * w[i], 0), e = (sig(z) - r.y) * (r.y ? wp : wn); x.forEach((v2, i) => { g[i] += e * v2; }); } w = w.map((v2, i) => v2 - 0.5 * (g[i] / n + (i ? 0.01 * v2 : 0))); } return (r) => [1, ...IDX.map((i) => r.x[i])].reduce((s, v2, i) => s + v2 * w[i], 0); }
const fastAuc = (pos, neg) => { if (!pos.length || !neg.length) return null; const a = [...pos.map((v2) => [v2, 1]), ...neg.map((v2) => [v2, 0])].sort((x, y) => x[0] - y[0]); let rs = 0, i = 0; while (i < a.length) { let j = i; while (j + 1 < a.length && a[j + 1][0] === a[i][0]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) if (a[k][1]) rs += m; i = j + 1; } return (rs - pos.length * (pos.length + 1) / 2) / (pos.length * neg.length); };
const aucOf = (rows, key) => fastAuc(rows.filter((r) => r.y).map((r) => r[key]), rows.filter((r) => !r.y).map((r) => r[key]));
const rng = rngFor(7); const boot = (rows, a, b, B = 400) => { const d = []; for (let i = 0; i < B; i++) { const s = rows.map(() => rows[Math.floor(rng() * rows.length)]), x = aucOf(s, a), y = aucOf(s, b); if (x !== null && y !== null) d.push(y - x); } d.sort((p, q) => p - q); return { mean: d.reduce((p, q) => p + q, 0) / d.length, lo: d[Math.floor(d.length * 0.05)], hi: d[Math.floor(d.length * 0.95)] }; };

const out = [];
for (const g of GROUPS) {
  const tr = gold.filter((r) => GROUP[r.t] !== g), te = gold.filter((r) => GROUP[r.t] === g), score = fit(tr), withCue = tr.filter((r) => r.x[0] > 0), rho0 = Math.min(0.99, Math.max(0.01, withCue.filter((r) => r.y).length / Math.max(1, withCue.length)));
  const docs = new Map(); for (const r of te) { const k = `${r.t}|${r.c}`; (docs.get(k) ?? docs.set(k, []).get(k)).push(r); }
  for (const [k, rows] of docs) {
    rows.sort((a, b) => order.get(`${k}|${a.w}`) - order.get(`${k}|${b.w}`));
    let hits = 0, n = 0, hitsW = 0, nW = 0;   // outcomes revealed so far, from the gold (B) or from the weak labels (C)
    for (const r of rows) {
      const base = score(r) + r.prior, cue = r.x[0] > 0;
      const dB = cue ? logit((hits + PSEUDO * rho0) / (n + PSEUDO)) - logit(rho0) : 0, dC = cue ? logit((hitsW + PSEUDO * rho0) / (nW + PSEUDO)) - logit(rho0) : 0;
      out.push({ y: r.y, c: r.c, t: r.t, A: base, B: base + dB, C: base + dC });
      if (cue) { n++; hits += r.y; const wl = weak(r.w); if (wl !== null) { nW++; hitsW += wl; } }   // the outcome arrives AFTER the word was scored
    }
  }
}
const conds = [...CONDITIONS, "ALL"], by = (c) => out.filter((r) => c === "ALL" || r.c === c);
console.log(`prequential stream: ${out.length} scored words (${out.filter((r) => r.y).length} names) across ${GROUPS.length} held-out families x ${CONDITIONS.length} conditions\n`);
console.log("model".padEnd(46) + conds.map((c) => c.padStart(10)).join("")); for (const [k, lab] of [["A", "A  shipped global weights (baseline)"], ["B", "B  on-the-fly regional ant"], ["C", "C  ant fed WEAK labels (origin swap)"]]) console.log(lab.padEnd(46) + conds.map((c) => (aucOf(by(c), k) ?? NaN).toFixed(3).padStart(10)).join(""));
console.log("\nPAIRED BOOTSTRAP, AUC of B minus A (90% interval; positive = the ant helps):"); let below = [], above = [];
for (const c of conds) { const b = boot(by(c), "A", "B"); console.log(`  ${c.padEnd(10)} ${b.mean >= 0 ? "+" : ""}${b.mean.toFixed(4)}  [${b.lo.toFixed(4)}, ${b.hi.toFixed(4)}]`); if (b.hi < 0) below.push(c); if (b.lo > 0 && (c === "lowercase" || c === "caseNoise")) above.push(c); }
const cb = boot(by("ALL"), "B", "C"); console.log(`\nORIGIN SWAP: AUC of C (weak-label outcomes) minus B (gold outcomes), ALL: ${cb.mean >= 0 ? "+" : ""}${cb.mean.toFixed(4)} [${cb.lo.toFixed(4)}, ${cb.hi.toFixed(4)}]  (positive and credible = the ant looks better against labels that share its origin: circular)`);
const verdict = below.length ? "NEGATIVE: the ant is credibly BELOW the shipped weights in " + below.join(", ") : above.length ? "POSITIVE: the ant is credibly above the shipped weights in " + above.join(", ") : "NEGATIVE (no measurable gain): not below anywhere, not credibly above in lowercase or caseNoise";
console.log("\nDECISION RULE (fixed in advance): continue only if not credibly below in any slice AND credibly above in lowercase or caseNoise.\nRESULT:", verdict); process.exitCode = above.length && !below.length ? 0 : 1;
