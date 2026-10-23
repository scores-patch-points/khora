// build-vectors.mjs — the local aligned word-vector pack the atom matcher reads (native/organs/word-vectors.js). en, es, fr, de: the MUSE
// aligned vectors (wiki.multi.<l>.vec, 200k words, one space with English). ja: fastText wiki.ja.vec (first 200k words), mapped into that
// space by the orthogonal map that best carries the MUSE ja→en dictionary's pairs (Procrustes, MUSE's own supervised step), found by the
// Newton–Schulz polar iteration (matrix products only). Every vector is centred and unit length, stored as int8 with a per-word scale.
//   node eval/meaning/atoms/build-vectors.mjs <raw dir> <out dir>
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const [, , RAW, OUT] = process.argv, D = 300;
fs.mkdirSync(OUT, { recursive: true });
async function readVec(file, max = 200000) {
  const words = [], vecs = []; let first = true;
  for await (const line of readline.createInterface({ input: fs.createReadStream(file) })) {
    if (first) { first = false; if (/^\d+ \d+$/.test(line.trim())) continue; }
    const p = line.trimEnd().split(" "); if (p.length !== D + 1) continue;
    const v = new Float32Array(D); let n = 0; for (let i = 0; i < D; i++) { v[i] = +p[i + 1]; n += v[i] * v[i]; }
    n = Math.sqrt(n) || 1; for (let i = 0; i < D; i++) v[i] /= n;
    words.push(p[0]); vecs.push(v); if (words.length >= max) break;
  }
  // centred, then unit length again (MUSE's "renorm, center, renorm"): the direction every word shares says nothing of its meaning
  const mu = new Float64Array(D); for (const v of vecs) for (let i = 0; i < D; i++) mu[i] += v[i] / vecs.length;
  for (const v of vecs) { let n = 0; for (let i = 0; i < D; i++) { v[i] -= mu[i]; n += v[i] * v[i]; } n = Math.sqrt(n) || 1; for (let i = 0; i < D; i++) v[i] /= n; }
  return { words, vecs };
}
function write(lang, { words, vecs }) {
  const i8 = new Int8Array(words.length * D), sc = new Float32Array(words.length);
  vecs.forEach((v, k) => { let m = 0; for (const x of v) m = Math.max(m, Math.abs(x)); const s = m / 127 || 1; sc[k] = s; for (let i = 0; i < D; i++) i8[k * D + i] = Math.round(v[i] / s); });
  fs.writeFileSync(path.join(OUT, `${lang}.words`), words.join("\n"));
  fs.writeFileSync(path.join(OUT, `${lang}.i8`), i8); fs.writeFileSync(path.join(OUT, `${lang}.scale`), Buffer.from(sc.buffer));
  console.log(lang, words.length);
}
const mul = (A, B, n = D) => { const C = new Float64Array(n * n); for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const a = A[i * n + k]; if (!a) continue; for (let j = 0; j < n; j++) C[i * n + j] += a * B[k * n + j]; } return C; };
const tr = (A, n = D) => { const T = new Float64Array(n * n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) T[j * n + i] = A[i * n + j]; return T; };

const en = await readVec(path.join(RAW, "wiki.multi.en.vec"));
write("en", en);
for (const l of ["es", "fr", "de"]) write(l, await readVec(path.join(RAW, `wiki.multi.${l}.vec`)));
// ja: Procrustes over the dictionary's pairs found in both vocabularies; W maps a ja vector x to W x in the English space
const ja = await readVec(path.join(RAW, "wiki.ja.200k.vec"));
const ie = new Map(en.words.map((w, i) => [w, i])), ij = new Map(ja.words.map((w, i) => [w, i]));
const pairs = fs.readFileSync(path.join(RAW, "ja-en.txt"), "utf8").split("\n").map((l) => l.trim().split(/\s+/)).filter((p) => p.length === 2 && ij.has(p[0]) && ie.has(p[1]));
const M = new Float64Array(D * D); // M = Σ y xᵀ
// every tenth pair held out of the fit, for the check below
const fit = pairs.filter((_, k) => k % 10), held = pairs.filter((_, k) => !(k % 10));
for (const [a, b] of fit) { const x = ja.vecs[ij.get(a)], y = en.vecs[ie.get(b)]; for (let i = 0; i < D; i++) { const yi = y[i]; for (let j = 0; j < D; j++) M[i * D + j] += yi * x[j]; } }
// the orthogonal polar factor of M (= U Vᵀ): Z ← ½ Z (3I − ZᵀZ), from Z = M / ‖M‖_F
let f = 0; for (const x of M) f += x * x; f = Math.sqrt(f); let Z = M.map((x) => x / f);
for (let it = 0; it < 60; it++) { const G = mul(tr(Z), Z); for (let i = 0; i < D * D; i++) G[i] = -G[i]; for (let i = 0; i < D; i++) G[i * D + i] += 3; Z = mul(Z, G).map((x) => x / 2); }
let err = 0; { const G = mul(tr(Z), Z); for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) err = Math.max(err, Math.abs(G[i * D + j] - (i === j ? 1 : 0))); }
const mapped = ja.vecs.map((x) => { const v = new Float32Array(D); let n = 0; for (let i = 0; i < D; i++) { let s = 0; for (let j = 0; j < D; j++) s += Z[i * D + j] * x[j]; v[i] = s; n += s * s; } n = Math.sqrt(n) || 1; for (let i = 0; i < D; i++) v[i] /= n; return v; });
write("ja", { words: ja.words, vecs: mapped });
// a check: of the held-back last tenth of the dictionary pairs, how often is the English word the nearest of 5,000 frequent English words
const test = held, E = en.vecs.slice(0, 5000); let hit = 0, n = 0;
for (const [a, b] of test) { const bi = ie.get(b); if (bi >= 5000) continue; n++; const x = mapped[ij.get(a)]; let best = -1, bv = -2; E.forEach((y, k) => { let s = 0; for (let i = 0; i < D; i++) s += x[i] * y[i]; if (s > bv) { bv = s; best = k; } }); if (best === bi) hit++; }
fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify({ schema: "WordVectors@1", dim: D, langs: ["en", "es", "fr", "de", "ja"], source: "MUSE wiki.multi (en, es, fr, de); fastText wiki.ja mapped by Procrustes on MUSE ja-en", jaPairs: pairs.length, orthErr: err, jaP1: n ? +(hit / n).toFixed(3) : null, jaP1n: n }, null, 1));
console.log("ja pairs", pairs.length, "orth err", err.toExponential(2), "ja→en P@1 on held-out pairs", hit, "/", n);
