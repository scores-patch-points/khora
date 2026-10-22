// native/scripts/build-word-clusters.mjs — word classes from unlabelled text, for the tagger and parser to read as features (Koo et al. 2008
// showed cluster features help a parser; here the classes come from DISTRIBUTION, read by RANDOM INDEXING then k-means, not from any list).
// Each frequent word gets a vector: the sum, over its occurrences, of fixed random sparse vectors of the words around it (±2, weighted by
// 1/distance), dampened by log frequency. Words whose vectors point the same way share a class, at two grains (coarse and fine).
//   node native/scripts/build-word-clusters.mjs --lang=eng --out=priors/clusters-eng.json.gz DIR_OR_FILE...
// Measured 2026-10-21 on UD_English-EWT (10.7M tokens of our own text): UPOS 94.3 → 94.5, UAS 84.5 → 84.5, LAS 81.4 → 81.3 — no parsing gain, so
// the shipped English prior is trained without clusters.
// Declared, not measured: vocabulary 50k, dimension 256, 4 non-zeros per random vector, classes 64 and 512, 12 k-means passes, seed "clusters".
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { seeded } from "../adapters/text/english-parser.js";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const inputs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const VOCAB = +arg("vocab", 50000), DIM = +arg("dim", 256), NZ = 4, KS = arg("k", "64,512").split(",").map(Number), PASSES = 12;
const rand = seeded("clusters");
const norm = (w) => (/\d/.test(w) ? w.replace(/\d/g, "#") : w.toLowerCase());
const filesOf = (p) => { const st = fs.statSync(p); if (st.isFile()) return [p]; return fs.readdirSync(p).flatMap((f) => filesOf(path.join(p, f))); };
const textOf = (f) => { const raw = fs.readFileSync(f, "utf8"); if (f.endsWith(".conllu")) return raw.split("\n").filter((l) => l.startsWith("# text = ")).map((l) => l.slice(9)).join("\n");
  if (f.endsWith(".json")) { try { const j = JSON.parse(raw); return String(j.v?.text ?? j.text ?? ""); } catch { return ""; } } return raw; };
const files = inputs.flatMap(filesOf).filter((f) => /\.(txt|md|conllu|json)$/.test(f));
const tokensOf = (t) => t.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*[\p{L}\p{N}]|[\p{L}\p{N}]|[^\s\p{L}\p{N}]/gu) ?? [];
// pass 1: frequencies
const freq = new Map(); let tokens = 0;
for (const f of files) for (const w of tokensOf(textOf(f))) { const k = norm(w); freq.set(k, (freq.get(k) ?? 0) + 1); tokens++; }
const vocab = [...freq].sort((a, b) => b[1] - a[1]).slice(0, VOCAB).map(([w]) => w), idx = new Map(vocab.map((w, i) => [w, i]));
console.log(`${files.length} files, ${tokens} tokens, ${freq.size} types, vocabulary ${vocab.length}`);
// random index vectors for every vocabulary word (as a context)
const rv = vocab.map(() => Array.from({ length: NZ }, () => [Math.floor(rand() * DIM), rand() < 0.5 ? -1 : 1]));
const vec = Array.from({ length: vocab.length }, () => new Float32Array(DIM));
// left and right contexts must stay apart: rebuild with the right context in the second half of the dimensions
for (const f of files) {
  const ids = tokensOf(textOf(f)).map((w) => idx.get(norm(w)) ?? -1);
  for (let i = 0; i < ids.length; i++) { const a = ids[i]; if (a < 0) continue;
    for (const d of [-2, -1, 1, 2]) { const b = ids[i + d]; if (b === undefined || b < 0) continue; const off = d < 0 ? 0 : DIM / 2; for (const [k, s] of rv[b]) vec[a][off + (k % (DIM / 2))] += s / Math.abs(d); }
  }
}
for (let i = 0; i < vec.length; i++) { const v = vec[i]; let n = 0; for (let k = 0; k < DIM; k++) n += v[k] * v[k]; n = Math.sqrt(n) || 1; for (let k = 0; k < DIM; k++) v[k] /= n; }
const kmeans = (K) => {
  const C = Array.from({ length: K }, (_, c) => Float32Array.from(vec[Math.floor((c / K) * Math.min(vec.length, K * 20))]));
  const as = new Int32Array(vec.length);
  for (let p = 0; p < PASSES; p++) {
    let moved = 0;
    for (let i = 0; i < vec.length; i++) { let best = 0, bv = -Infinity; const v = vec[i]; for (let c = 0; c < K; c++) { const cc = C[c]; let s = 0; for (let k = 0; k < DIM; k++) s += v[k] * cc[k]; if (s > bv) { bv = s; best = c; } } if (as[i] !== best) { moved++; as[i] = best; } }
    for (const cc of C) cc.fill(0);
    for (let i = 0; i < vec.length; i++) { const cc = C[as[i]], v = vec[i]; for (let k = 0; k < DIM; k++) cc[k] += v[k]; }
    for (const cc of C) { let n = 0; for (let k = 0; k < DIM; k++) n += cc[k] * cc[k]; n = Math.sqrt(n) || 1; for (let k = 0; k < DIM; k++) cc[k] /= n; }
    console.log(`k=${K} pass ${p + 1}: ${moved} moved`);
    if (!moved) break;
  }
  return as;
};
const parts = KS.map(kmeans);
const words = Object.fromEntries(vocab.map((w, i) => [w, parts.map((a) => a[i])]));
const out = arg("out", `priors/clusters-${arg("lang", "und")}.json.gz`);
const sha = crypto.createHash("sha256"); for (const f of files.sort()) sha.update(fs.readFileSync(f));
fs.writeFileSync(out, zlib.gzipSync(JSON.stringify({ schema: "WordClusters@1", language: arg("lang", "und"), grains: KS, meta: { files: files.length, tokens, vocab: vocab.length, dim: DIM, method: "random indexing (±2, left/right halves) + spherical k-means", corpusSha256: sha.digest("hex"), giver: arg("giver", "unlabelled text, named by the builder") }, words }), { level: 9 }));
console.log(`wrote ${out}`);
