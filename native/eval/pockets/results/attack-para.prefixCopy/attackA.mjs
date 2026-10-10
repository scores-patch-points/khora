// attackA.mjs -- ATTACK A (size and tokenisation) on para.prefixCopy.  Every pocket where the atlas has PRESENT (P+ or P-), both halves (atlas halves()), atlas null (unit-order, atlas seeds, 10 draws).
// prefixCopy needs ADJACENT units, so subsamples are built from SEGMENTS of consecutive units (20 units, a remainder < 10 joins the previous segment; segments of one document get different doc ids so no pair
// straddles a cut); segments are taken in sha256 order.  Variants (all deterministic):
//   full     : the half as is (must equal the atlas cell)
//   eqTok10k / eqTok20k : equal token count T = 10,000 / 20,000 per half (segments added whole while cumulative tokens <= T; halves with fewer tokens are n/a)
//   eqLen6 / 10 / 14 / 22: equal tokens (10,000) AND equal mean unit length M0 = 6 / 10 / 14 / 22 (bang-bang on the running mean over short / long SEGMENTS; "matched" iff achieved mean within 10% of M0 and >= 0.9 T tokens)
//   drop1pct : alternative tokenisation: delete every token of the rarest 1% of types of the half (count ascending, ties by sha256)
//   dropHapax: delete every token of types occurring once in the half
//   dropTop20: delete every token of the 20 most frequent types of the half (ties by sha256): does the effect live in the commonest openers?
//   alt      : alternative grain: word pockets -> first 4 code points of each token (merges inflections); code pockets -> split tokens at underscores; charbigram -> pairs of chunks concatenated; notation -> n/a
//   dedupAdj : collapse every run of identical adjacent units to ONE copy (leakage of exact duplicates)
//   dedupAll : delete every unit whose exact token sequence occurred earlier in the half
// Output: out/A/<id>.json.    node attackA.mjs --pockets ids.txt|id1,id2 [--out out/A] [--draws 10]
import fs from "node:fs";
import path from "node:path";
import { halves, cells, statusOf, loadCached, MATRIX, HERE, sha256, tokensOf, optOf } from "./lib.mjs";
const opt = optOf(process.argv.slice(2));
const OUT = path.resolve(HERE, opt("--out", "out/A")), DRAWS = Number(opt("--draws", 10)), SEG = 20;
const want = opt("--pockets", "present302.txt"), WANT = fs.existsSync(path.resolve(HERE, want)) ? fs.readFileSync(path.resolve(HERE, want), "utf8").split("\n").filter(Boolean) : want.split(",");
fs.mkdirSync(OUT, { recursive: true });
const M = MATRIX(), IDX = M.statistics.indexOf("para.prefixCopy"), meta = new Map(M.pockets.map((p) => [p.id, p]));

/** segments of consecutive units inside one document: [{lo, hi}] (hi exclusive) */
function segments(docOf) {
  const out = []; let s = 0; const U = docOf.length;
  while (s < U) {
    let e = s; while (e < U && docOf[e] === docOf[s]) e++;
    const first = out.length;
    for (let a = s; a < e; a += SEG) { const b = Math.min(e, a + SEG); if (b - a < SEG / 2 && out.length > first) out[out.length - 1].hi = b; else out.push({ lo: a, hi: b }); }
    s = e;
  }
  return out;
}
const hashOrder = (n, tag) => { const k = Array.from({ length: n }, (_, i) => [sha256(`${tag}:${i}`), i]); k.sort((a, b) => (a[0] < b[0] ? -1 : 1)); return k.map((x) => x[1]); };
function assemble(view, segs, chosen) { // chosen: segment indices; keep original order; docOf = segment rank
  const ch = chosen.slice().sort((a, b) => a - b), units = [], docOf = [];
  ch.forEach((si, r) => { for (let u = segs[si].lo; u < segs[si].hi; u++) { units.push(view.units[u]); docOf.push(r); } });
  return { id: view.id, which: view.which, units, docOf };
}
function eqTok(view, T, tag) {
  if (tokensOf(view.units) < T) return null;
  const segs = segments(view.docOf), tk = segs.map((s) => { let n = 0; for (let u = s.lo; u < s.hi; u++) n += view.units[u].length; return n; }), chosen = []; let cum = 0;
  for (const i of hashOrder(segs.length, tag)) { if (cum >= T) break; if (cum + tk[i] <= T) { chosen.push(i); cum += tk[i]; } }
  return cum >= 0.9 * T ? assemble(view, segs, chosen) : null;
}
function eqLen(view, T, M0, tag) {
  const segs = segments(view.docOf), tk = segs.map((s) => { let n = 0; for (let u = s.lo; u < s.hi; u++) n += view.units[u].length; return n; }), mu = segs.map((s, i) => tk[i] / (s.hi - s.lo));
  const ord = hashOrder(segs.length, tag), S = [], L = []; for (const i of ord) (mu[i] < M0 ? S : L).push(i);
  const chosen = []; let cum = 0, nu = 0, si = 0, li = 0;
  while (cum < T) {
    const wantShort = nu > 0 && cum / nu >= M0;
    let i = wantShort ? (si < S.length ? S[si++] : L[li++]) : (li < L.length ? L[li++] : S[si++]);
    if (i === undefined) break;
    if (cum + tk[i] > T) continue;
    chosen.push(i); cum += tk[i]; nu += segs[i].hi - segs[i].lo;
  }
  const v = chosen.length ? assemble(view, segs, chosen) : null, mean = nu ? cum / nu : null;
  return v && mean && Math.abs(mean - M0) / M0 <= 0.1 && cum >= 0.9 * T ? { ...v, _mean: mean } : null;
}
const typeCounts = (units) => { const c = new Map(); for (const u of units) for (const w of u) c.set(w, (c.get(w) || 0) + 1); return c; };
function dropTypes(view, drop) { const units = [], docOf = []; view.units.forEach((u, k) => { const r = u.filter((w) => !drop.has(w)); if (r.length) { units.push(r); docOf.push(view.docOf[k]); } }); return { id: view.id, which: view.which, units, docOf }; }
const byCount = (c, asc) => [...c.keys()].map((w) => [c.get(w), sha256("dropT:" + w), w]).sort((a, b) => (asc ? a[0] - b[0] : b[0] - a[0]) || (a[1] < b[1] ? -1 : 1));
const drop1pct = (view) => { const ts = byCount(typeCounts(view.units), true); return dropTypes(view, new Set(ts.slice(0, Math.ceil(0.01 * ts.length)).map((x) => x[2]))); };
const dropHapax = (view) => { const c = typeCounts(view.units), d = new Set(); for (const [w, n] of c) if (n === 1) d.add(w); return dropTypes(view, d); };
const dropTop20 = (view) => dropTypes(view, new Set(byCount(typeCounts(view.units), false).slice(0, 20).map((x) => x[2])));
function alt(view, grain) {
  let g;
  if (grain === "word") g = (u) => u.map((w) => [...w].slice(0, 4).join(""));
  else if (grain === "code") g = (u) => u.flatMap((w) => w.split("_").filter(Boolean));
  else if (grain === "charbigram") g = (u) => { const o = []; for (let i = 0; i < u.length; i += 2) o.push(u[i] + (u[i + 1] ?? "")); return o; };
  else return null;
  const units = [], docOf = []; view.units.forEach((u, k) => { const r = g(u); if (r.length) { units.push(r); docOf.push(view.docOf[k]); } });
  return { id: view.id, which: view.which, units, docOf };
}
function dedupAdj(view) { const units = [], docOf = []; let prev = null; view.units.forEach((u, k) => { const key = u.join(" "); if (key === prev && view.docOf[k] === docOf[docOf.length - 1]) return; prev = key; units.push(u); docOf.push(view.docOf[k]); }); return { id: view.id, which: view.which, units, docOf }; }
function dedupAll(view) { const seen = new Set(), units = [], docOf = []; view.units.forEach((u, k) => { const key = u.join(" "); if (seen.has(key)) return; seen.add(key); units.push(u); docOf.push(view.docOf[k]); }); return { id: view.id, which: view.which, units, docOf }; }

const VARIANTS = (id, grain) => ({
  full: (v) => v,
  eqTok10k: (v) => eqTok(v, 10000, `A:t10:${id}:${v.which}`),
  eqTok20k: (v) => eqTok(v, 20000, `A:t20:${id}:${v.which}`),
  eqLen6: (v) => eqLen(v, 10000, 6, `A:l6:${id}:${v.which}`),
  eqLen10: (v) => eqLen(v, 10000, 10, `A:l10:${id}:${v.which}`),
  eqLen14: (v) => eqLen(v, 10000, 14, `A:l14:${id}:${v.which}`),
  eqLen22: (v) => eqLen(v, 10000, 22, `A:l22:${id}:${v.which}`),
  drop1pct, dropHapax, dropTop20,
  alt: (v) => alt(v, grain),
  dedupAdj, dedupAll,
});
for (const id of WANT) {
  const file = path.join(OUT, `${id}.json`);
  if (fs.existsSync(file)) continue;
  const r = meta.get(id), p = loadCached(id), H = halves(p), grain = r.grain, res = { id, grain, register: r.register, group: r.group, atlasStatus: r.cells[IDX][4], variants: {} };
  for (const [name, fn] of Object.entries(VARIANTS(id, grain))) {
    const per = {};
    for (const which of ["discover", "confirm"]) {
      const v = fn(H[which]);
      if (!v || v.units.length < 60) { per[which] = null; continue; }
      const c = cells(v, { keys: ["prefixCopy", "prefixNoDup", "firstTokCopy"], draws: DRAWS });
      per[which] = { ...c.prefixCopy, noDup: c.prefixNoDup, firstTok: c.firstTokCopy, ...c._meta, meanLen: c._meta.tokens / c._meta.U };
    }
    const a = per.discover, b = per.confirm;
    res.variants[name] = { status: a && b ? statusOf(a, b) : "n/a", discover: a, confirm: b };
  }
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(`${id} done ${res.variants.full.status} (atlas ${res.atlasStatus})`);
}
