#!/usr/bin/env node
// native/scripts/ablate-name-smell-loto.mjs — THE GATE, WITH INDEPENDENT LABELS: fit on the hand-labelled gold and ablate each signal by LEAVE-ONE-GROUP-OUT validation.
//
// ablate-name-smell.mjs fits on weak labels (the treebank prior). Those labels and the parser's tag share a source, so a fit on them can not honestly weigh casing against the tag (it gave casing negative weights).
// Here the fit and the test BOTH use the independent gold, but never the same text family: folds are {Pride and Prejudice}, {Genesis 1-3 in two editions}, {Genesis 37-41}, so no passage and no edition leaks across a fold.
//   backward elimination: ablate every signal; if removing one CREDIBLY improves held-out AUC (90% bootstrap interval above 0 in the pooled data), drop the most harmful and re-gate; stop when none is harmful.
//   the survivors are the SHIPPABLE model, fitted on all the gold with its Laplace covariance (posterior uncertainty of the logit), and written to --out (a scratch path; nothing ships past a failed gate).
// Usage: node native/scripts/ablate-name-smell-loto.mjs [--gold /tmp/name-smell-gold-rows.json] [--out weights.json]
import fs from "node:fs"; import crypto from "node:crypto";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const gold = JSON.parse(fs.readFileSync(arg("gold", "/tmp/name-smell-gold-rows.json"), "utf8")), OUT = arg("out", null);
const FEATS = ["mid", "init", "tag", "repeat"], CONDS = ["clean", "lowercase", "caseNoise", "typos"], GROUP = { pp1: "pp", pp2: "pp", kjv13: "gen13", web13: "gen13", kjv37: "gen37" }, GROUPS = [...new Set(Object.values(GROUP))];
const sig = (z) => 1 / (1 + Math.exp(-z));
const rngf = (() => { let s = 11; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const fastAuc = (pos, neg) => { if (!pos.length || !neg.length) return null; const all = [...pos.map((v) => [v, 1]), ...neg.map((v) => [v, 0])].sort((a, b) => a[0] - b[0]); let rs = 0, i = 0; while (i < all.length) { let j = i; while (j + 1 < all.length && all[j + 1][0] === all[i][0]) j++; const mid = (i + j) / 2 + 1; for (let k = i; k <= j; k++) if (all[k][1]) rs += mid; i = j + 1; } return (rs - pos.length * (pos.length + 1) / 2) / (pos.length * neg.length); };
const aucOf = (rows, f) => fastAuc(rows.filter((r) => r.y).map(f), rows.filter((r) => !r.y).map(f));
// logistic regression on columns idx of x (plus an optional extra column `extra(r)` for a learnable prior weight), class-balanced, L2 small; returns weights and the Laplace covariance
function fit(rows, idx, extra = null, iters = 3000, lr = 0.5, l2 = 0.01) {
  const X = (r) => [1, ...idx.map((i) => r.x[i]), ...(extra ? [extra(r)] : [])], d = X(rows[0]).length, n = rows.length, pos = rows.filter((r) => r.y).length, wp = n / (2 * pos), wn = n / (2 * (n - pos));
  let w = new Array(d).fill(0);
  for (let k = 0; k < iters; k++) { const g = new Array(d).fill(0); for (const r of rows) { const x = X(r), z = x.reduce((s, v, i) => s + v * w[i], 0), e = (sig(z) - r.y) * (r.y ? wp : wn); x.forEach((v, i) => { g[i] += e * v; }); } w = w.map((v, i) => v - lr * (g[i] / n + (i ? l2 * v : 0))); }
  const H = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j && i ? l2 * n : 0)));   // Hessian of the weighted NLL (+ L2), then inverted: the posterior covariance (Laplace)
  for (const r of rows) { const x = X(r), z = x.reduce((s, v, i) => s + v * w[i], 0), p = sig(z), c = p * (1 - p) * (r.y ? wp : wn); for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) H[i][j] += c * x[i] * x[j]; }
  return { w, idx, extra, cov: invert(H), score: (r) => X(r).reduce((s, v, i) => s + v * w[i], 0) };
}
function invert(A) { const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-12; for (let j = 0; j < 2 * n; j++) M[c][j] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; } } return M.map((r) => r.slice(n)); }
// pooled leave-one-group-out predictions for a feature subset; the prior offset enters with a FIXED weight 1 (Bayesian) unless `learned`
function loto(idx, { prior = true, learned = false } = {}) {
  const out = [];
  for (const g of GROUPS) { const tr = gold.filter((r) => GROUP[r.t] !== g), te = gold.filter((r) => GROUP[r.t] === g), m = fit(tr.map((r) => ({ ...r, y: r.y })), idx, learned ? (r) => r.prior : null); for (const r of te) out.push({ ...r, s: m.score(r) + (prior && !learned ? r.prior : 0) }); }
  return out;
}
const boot = (rowsA, rowsB, B = 300) => { const d = []; for (let b = 0; b < B; b++) { const ix = rowsA.map(() => Math.floor(rngf() * rowsA.length)), a = aucOf(ix.map((i) => rowsA[i]), (r) => r.s), c = aucOf(ix.map((i) => rowsB[i]), (r) => r.s); if (a !== null && c !== null) d.push(c - a); } d.sort((x, y) => x - y); return { mean: d.reduce((a, b) => a + b, 0) / d.length, lo: d[Math.floor(d.length * 0.05)], hi: d[Math.floor(d.length * 0.95)] }; };
const subsetOf = (rows, c, attested) => rows.filter((r) => (c === "ALL" || r.c === c) && (attested === null || (r.prior !== 0) === attested));
const key = (r) => `${r.t}|${r.c}|${r.w}`;
const align = (A, B) => { const mb = new Map(B.map((r) => [key(r), r])); const a = [], b = []; for (const r of A) { const o = mb.get(key(r)); if (o) { a.push(r); b.push(o); } } return [a, b]; };

console.log(`gold ${gold.length} samples; folds ${GROUPS.join(", ")}; attested in the prior: ${gold.filter((r) => r.prior !== 0).length}, UNATTESTED: ${gold.filter((r) => r.prior === 0).length} (names among unattested: ${gold.filter((r) => r.prior === 0 && r.y).length})\n`);
let active = [0, 1, 2, 3]; const names = (a) => a.map((i) => FEATS[i]).join("+") || "(none)";
for (let round = 0; round < 4; round++) {
  const full = loto(active), rows = {}; rows.full = full;
  for (const i of active) rows["-" + FEATS[i]] = loto(active.filter((j) => j !== i));
  console.log(`ROUND ${round}: signals [${names(active)}]   held-out AUC with the prior offset`);
  console.log("  variant".padEnd(18) + [...CONDS, "ALL"].map((c) => c.padStart(10)).join("") + "   | unattested ALL | attested ALL");
  for (const [k, v] of Object.entries(rows)) console.log(("  " + k).padEnd(18) + [...CONDS, "ALL"].map((c) => (aucOf(subsetOf(v, c, null), (r) => r.s) ?? NaN).toFixed(3).padStart(10)).join("") + `   | ${(aucOf(subsetOf(v, "ALL", false), (r) => r.s) ?? NaN).toFixed(3)}            | ${(aucOf(subsetOf(v, "ALL", true), (r) => r.s) ?? NaN).toFixed(3)}`);
  let worst = null;
  for (const i of active) for (const c of [...CONDS, "ALL"]) { const [a, b] = align(subsetOf(full, c, null), subsetOf(rows["-" + FEATS[i]], c, null)), d = boot(a, b); if (d.lo > 0 && (!worst || d.mean > worst.mean)) worst = { i, c, ...d }; }
  if (!worst) { console.log("  no signal is credibly harmful: STOP\n"); break; }
  console.log(`  HARMFUL: ${FEATS[worst.i]} (removing it improves ${worst.c} by ${worst.mean.toFixed(3)}, 90% [${worst.lo.toFixed(3)}, ${worst.hi.toFixed(3)}]): drop it\n`); active = active.filter((j) => j !== worst.i);
}
// the shippable model: the surviving signals, fitted on all the gold, with its covariance; and the learned weight of the prior offset as a check on calibration
const final = fit(gold, active), learned = fit(gold, active, (r) => r.prior);
console.log(`SURVIVING SIGNALS: ${names(active)}`); console.log("  weights (intercept first):", final.w.map((v) => v.toFixed(3)).join(", ")); console.log("  prior offset: fixed 1.0 in the model; learned weight when free:", learned.w[learned.w.length - 1].toFixed(3), "(about 1 means the Bayesian offset is calibrated)");
const eig = (() => { const C = final.cov, n = C.length; let v = new Array(n).fill(1), lam = 0; for (let k = 0; k < 200; k++) { const w = C.map((r) => r.reduce((s, x, i) => s + x * v[i], 0)), nrm = Math.hypot(...w); lam = nrm; v = w.map((x) => x / nrm); } return lam; })();
console.log("  largest eigenvalue of the posterior covariance:", eig.toFixed(4), "(it collapses as evidence accumulates)");
// does letting the prior offset's weight be learned (instead of fixed at 1) help held-out? and does the uncertainty COLLAPSE as evidence accumulates? (largest eigenvalue of the posterior covariance, by training-set size)
{ const fx = loto(active), lr = loto(active, { learned: true }); const A = (v, c) => (aucOf(subsetOf(v, c, null), (r) => r.s) ?? NaN).toFixed(3);
  console.log("\nprior offset fixed at 1 vs learned (held-out AUC):  " + [...CONDS, "ALL"].map((c) => `${c} ${A(fx, c)} / ${A(lr, c)}`).join("   "));
  const lam = (C) => { let v = new Array(C.length).fill(1), l = 0; for (let k = 0; k < 200; k++) { const w = C.map((r) => r.reduce((s2, x, i) => s2 + x * v[i], 0)), nr = Math.hypot(...w); l = nr; v = w.map((x) => x / nr); } return l; };
  const shuf = [...gold].sort(() => rngf() - 0.5); console.log("learning curve, largest eigenvalue of the posterior covariance by number of gold samples:", [60, 150, 400, 1000, gold.length].map((n) => `${n}: ${lam(fit(shuf.slice(0, n), active).cov).toFixed(4)}`).join("   ")); }
// the final stack against the baselines on the held-out predictions
const best = loto(active), capBase = gold.map((r) => ({ ...r, s: r.capMid > 0 ? 1 : 0 })), priorOnly = gold.map((r) => ({ ...r, s: r.prior }));
console.log("\nHELD-OUT AUC of the surviving stack vs baselines:"); console.log("  ".padEnd(40) + [...CONDS, "ALL"].map((c) => c.padStart(10)).join(""));
for (const [k, v] of [["surviving stack + prior", best], ["baseline: capitalised mid-sentence", capBase], ["baseline: prior offset only", priorOnly]]) console.log(("  " + k).padEnd(40) + [...CONDS, "ALL"].map((c) => (aucOf(subsetOf(v, c, null), (r) => r.s) ?? NaN).toFixed(3).padStart(10)).join(""));
let regress = []; for (const [k, v] of [["capitalised mid-sentence", capBase], ["prior only", priorOnly]]) for (const c of [...CONDS, "ALL"]) { const [a, b] = align(subsetOf(best, c, null), subsetOf(v, c, null)), d = boot(a, b); if (d.lo > 0) regress.push(`${k}/${c}`); }
console.log("\nGATE:", regress.length ? `FAIL: a baseline credibly beats the stack: ${regress.join(", ")}` : "PASS: no harmful signal, no baseline beats the stack");
if (OUT && !regress.length) { const w = { schema: "NameSmellWeights@2", lang: "eng", signals: active.map((i) => FEATS[i]), intercept: +final.w[0].toFixed(4), w: Object.fromEntries(FEATS.map((f, i) => [f, active.includes(i) ? +final.w[1 + active.indexOf(i)].toFixed(4) : 0])), prior: { pseudo: 2, base: 0.0968 }, cov: final.cov.map((r) => r.map((x) => +x.toFixed(6))), covOrder: ["intercept", ...active.map((i) => FEATS[i])], fit: { how: "logistic regression on the INDEPENDENT gold; folds leave one text family out; backward elimination of credibly harmful signals; Laplace covariance", gold: gold.length } }; w.sha16 = crypto.createHash("sha256").update(JSON.stringify(w)).digest("hex").slice(0, 16); fs.writeFileSync(OUT, JSON.stringify(w, null, 2) + "\n"); console.log("wrote", OUT); }
process.exitCode = regress.length ? 1 : 0;
