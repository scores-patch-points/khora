// Builds the PINNED emergent-smell model per language: trains the emergent clusters on the FULL train file (no held-out split) and freezes the type->cluster->name dictionary. This is model-building, not a scored run; the calibration cards live in GL-SM-01..04. No regex, no word list reads text.
// Usage: node train-pinned.mjs [grc|zh|sa|eng ...]
import fs from "node:fs";
const SEED = 20261120, MINC = 5, NCTX = 200, K = 64, RESTARTS = 10;
const SETS = {
  grc: { file: "/tmp/grc-proiel-train.conllu", giver: "UniversalDependencies UD_Ancient_Greek-PROIEL, CC BY-SA 4.0", commit: "67c85ccd0db2cf19106a20691e4475b8e1e88047", sha16: "216ad9f521adc823" },
  zh: { file: "/tmp/zh-gsd-train.conllu", giver: "UniversalDependencies UD_Chinese-GSD, CC BY-SA 4.0", commit: "d01c0c04c7de341c85212f30c184d9b16a516ccc", sha16: "e49c17c615b34920" },
  sa: { file: "/tmp/sa-vedic-train.conllu", giver: "UniversalDependencies UD_Sanskrit-Vedic, CC BY-SA 4.0", commit: "3ce6c31c379d4fc65a4f5073d126b1b24b45dadf", sha16: "05829c606047956b" },
  eng: { file: "/tmp/ewt-dev.conllu", giver: "UniversalDependencies UD_English-EWT (DEV only), CC BY-SA 4.0", commit: "491be069d36e378f67c29f183699eea88308ea42", sha16: "ebd876f586758249", note: "trained on the DEV split (25k tokens); the full EWT train is a named gap" },
};
let s0 = SEED; const rnd = () => { s0 = (s0 * 1664525 + 1013904223) >>> 0; return s0 / 4294967296; };
function load(file) { const out = []; let cur = []; for (const line of fs.readFileSync(file, "utf8").split("\n")) { if (!line.trim()) { if (cur.length) out.push(cur); cur = []; continue; } if (line.startsWith("#")) continue; const c = line.split("\t"); if (Number.isInteger(Number(c[0]))) cur.push({ w: c[1].toLowerCase(), u: c[3] }); } if (cur.length) out.push(cur); return out; }
function kmeans(X, k) {
  const n = X.length, d = X[0].length; let best = null;
  for (let r = 0; r < RESTARTS; r++) {
    const C = [X[Math.floor(rnd() * n)].slice()]; const dist = new Float64Array(n).fill(Infinity);
    while (C.length < k) { const c = C[C.length - 1]; let tot = 0; for (let i = 0; i < n; i++) { let dot = 0; for (let j = 0; j < d; j++) dot += X[i][j] * c[j]; dist[i] = Math.min(dist[i], 1 - dot); tot += dist[i]; } let u = rnd() * tot, pick = n - 1; for (let i = 0; i < n; i++) { u -= dist[i]; if (u <= 0) { pick = i; break; } } C.push(X[pick].slice()); }
    let asg = new Int32Array(n).fill(-1), cost = 0;
    for (let it = 0; it < 50; it++) { let moved = 0; cost = 0; for (let i = 0; i < n; i++) { let bj = 0, bd = -2; for (let q = 0; q < k; q++) { let dot = 0; for (let j = 0; j < d; j++) dot += X[i][j] * C[q][j]; if (dot > bd) { bd = dot; bj = q; } } cost += 1 - bd; if (asg[i] !== bj) { asg[i] = bj; moved++; } } if (!moved) break; const S = C.map(() => new Float64Array(d)), cntc = new Int32Array(k); for (let i = 0; i < n; i++) { cntc[asg[i]]++; for (let j = 0; j < d; j++) S[asg[i]][j] += X[i][j]; } for (let q = 0; q < k; q++) { if (!cntc[q]) { C[q] = X[Math.floor(rnd() * n)].slice(); continue; } const nm = Math.hypot(...S[q]) || 1; C[q] = Array.from(S[q], (v) => v / nm); } }
    if (!best || cost < best.cost) best = { cost, asg: Array.from(asg) };
  }
  return best.asg;
}
function build(lang) {
  const cfg = SETS[lang];
  const sents = load(cfg.file);
  const cnt = new Map(), gold = new Map();
  for (const s of sents) for (const t of s) { cnt.set(t.w, (cnt.get(t.w) ?? 0) + 1); const g = gold.get(t.w) ?? new Map(); g.set(t.u, (g.get(t.u) ?? 0) + 1); gold.set(t.w, g); }
  const types = [...cnt.keys()], V = types.filter((w) => cnt.get(w) >= MINC).sort((a, b) => cnt.get(b) - cnt.get(a));
  const vi = new Map(V.map((w, i) => [w, i]));
  const ctx = V.slice(0, NCTX), ci = new Map(ctx.map((w, i) => [w, i]));
  const M = V.map(() => new Float64Array(2 * NCTX));
  const totalTokens = sents.reduce((a, s) => a + s.length, 0);
  for (const s of sents) s.forEach((t, i) => { const r = vi.get(t.w); if (r === undefined) return; const l = i > 0 ? ci.get(s[i - 1].w) : undefined, rt = i + 1 < s.length ? ci.get(s[i + 1].w) : undefined; if (l !== undefined) M[r][l]++; if (rt !== undefined) M[r][NCTX + rt]++; });
  const rowsum = M.map((r) => r.reduce((a, b) => a + b, 0));
  const colsums = Array.from({ length: 2 * NCTX }, (_, j) => M.reduce((a, r) => a + r[j], 0));
  const cs75 = colsums.map((c) => c ** 0.75), cst = cs75.reduce((a, b) => a + b, 0);
  const keep = [], X = [];
  V.forEach((w, r) => { if (!rowsum[r]) return; const row = Array.from(M[r], (c, j) => c ? Math.max(0, Math.log((c / totalTokens) / ((rowsum[r] / totalTokens) * (cs75[j] / cst)))) : 0); const nm = Math.hypot(...row); if (!nm) return; keep.push(w); X.push(row.map((v) => v / nm)); });
  const asg = kmeans(X, K);
  const typeCluster = new Map(); keep.forEach((w, i) => typeCluster.set(w, asg[i]));
  const vocab = {}; keep.forEach((w, i) => { vocab[w] = asg[i]; });
  const clusterWeight = new Map();
  for (const w of keep) { const c = typeCluster.get(w); const u = [...gold.get(w).entries()].sort((a, b) => b[1] - a[1])[0][0]; if (!clusterWeight.has(c)) clusterWeight.set(c, new Map()); const m = clusterWeight.get(c); m.set(u, (m.get(u) ?? 0) + (cnt.get(w) ?? 1)); }
  const clusterName = {}, clusterDist = {};
  for (const [c, m] of clusterWeight) { const tot = [...m.values()].reduce((a, b) => a + b, 0); const dist = {}; for (const [k, v] of m) dist[k] = +(v / tot).toFixed(6); const dom = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]; clusterName[c] = dom; clusterDist[c] = dist; }
  const model = { schema: "EmergentSmell@1", language: lang, giver: cfg.giver, trainedOn: { file: cfg.file.split("/").pop(), commit: cfg.commit, sha256_16: cfg.sha16, tokens: totalTokens, sentences: sents.length }, note: cfg.note ?? null, params: { k: K, seed: SEED, minCount: MINC, nctx: NCTX, restarts: RESTARTS }, vocab, clusterName, clusterDist };
  const path = new URL(`../adapters/text/emergent-smell/emergent-smell-${lang}.json`, import.meta.url);
  fs.writeFileSync(path, JSON.stringify(model));
  console.log(lang, "vocab", Object.keys(vocab).length, "clusters", Object.keys(clusterName).length, "->", path.pathname.split("/").pop());
}
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ["grc", "zh", "sa", "eng"];
for (const l of langs) build(l);
