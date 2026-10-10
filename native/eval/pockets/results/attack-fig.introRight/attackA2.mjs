// attackA2.mjs -- ATTACK A (continued): which unit lengths carry the effect, and is the loss under the matched design due to length or to unit-thinning?
//   node attackA2.mjs <idlist|file> [tag]  ->  A2_<tag>.json
// Per pocket (atlas halves, 10 within-unit draws, atlas seeds):
//   decomp : the statistic restricted to each unit-length class (lc0 <=5, lc1 6-11, lc2 12-23, lc3 >=24 tokens): d = v - nullMean averaged over the two halves, and the token share of the class
//   F12    : only units of length <= 12, order and documents kept, full pocket
//   LONG   : only units of length >= 13, full pocket (skipped when < 20,000 tokens)
//   F12B   : F12, then whole documents in sha256 order up to 32k tokens (6 reps)
//   TH     : random thinning of ALL units (sha256 key) to 32k tokens, natural length histogram kept (6 reps): the thinning control of the matched design
//   FC     : unit-length cap c chosen PER POCKET so that the mean length of the units of length <= c is closest to 4.0 tokens (equal mean unit length), then whole documents to 32k tokens (6 reps)
import fs from "node:fs";
import path from "node:path";
import { halves, loadCached, HERE, sha256, f, tokensOf } from "./lib.mjs";
import { cellFn, introSide, dCell } from "./variants.mjs";
const [idsArg, tag = ""] = process.argv.slice(2);
const ids = fs.existsSync(idsArg) ? fs.readFileSync(idsArg, "utf8").trim().split(",") : idsArg.split(",");
const key = (...p) => parseInt(sha256(p.join("\x1f")).slice(0, 12), 16);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
function two(id, units, docOf, fn, seedId) {
  const H = halves({ id, units, docOf }), a = cellFn(H.discover, fn, 10, seedId, "discover"), b = cellFn(H.confirm, fn, 10, seedId, "confirm"), da = dCell(a), db = dCell(b);
  return { tokens: tokensOf(units), d: da != null && db != null ? (da + db) / 2 : null, zD: a.z, zC: b.z };
}
const filt = (p, pred) => { const units = [], docOf = []; p.units.forEach((u, k) => { if (pred(u)) { units.push(u); docOf.push(p.docOf[k]); } }); return { units, docOf }; };
const R = (P) => introSide(P, { side: "R" });
const out = {};
for (const id of ids) {
  const p = loadCached(id), N = tokensOf(p.units), r = { tokens: N };
  r.base = two(id, p.units, p.docOf, R, id);
  r.decomp = [0, 1, 2, 3].map((lc) => { const rr = two(id, p.units, p.docOf, (P) => introSide(P, { side: "R", lc, minPairs: 15 }), id); const sh = p.units.reduce((s, u) => s + ([5, 11, 23, 1e9].findIndex((m) => u.length <= m) === lc ? u.length : 0), 0) / N; return { ...rr, tokenShare: sh }; });
  const F = filt(p, (u) => u.length <= 12); r.F12 = two(id, F.units, F.docOf, R, `${id}|F12`); r.F12.share = tokensOf(F.units) / N;
  const Lg = filt(p, (u) => u.length >= 13); r.LONG = tokensOf(Lg.units) >= 20000 ? two(id, Lg.units, Lg.docOf, R, `${id}|LONG`) : null; if (r.LONG) r.LONG.share = tokensOf(Lg.units) / N;
  const B = 32000;
  const docsF = [...new Set(F.docOf)], lenF = new Map(); F.units.forEach((u, k) => lenF.set(F.docOf[k], (lenF.get(F.docOf[k]) || 0) + u.length));
  r.F12B = []; r.TH = [];
  for (let rep = 0; rep < 6; rep++) {
    if (tokensOf(F.units) >= 1.15 * B) {
      const order = docsF.slice().sort((x, y) => key(id, "F12B", rep, x) - key(id, "F12B", rep, y)), keep = new Set(); let s = 0; for (const d of order) { keep.add(d); s += lenF.get(d); if (s >= B) break; }
      const sel = filt({ units: F.units, docOf: F.docOf }, () => true), U2 = [], D2 = []; F.units.forEach((u, k) => { if (keep.has(F.docOf[k])) { U2.push(u); D2.push(F.docOf[k]); } });
      r.F12B.push(two(id, U2, D2, R, `${id}|F12B|${rep}`));
    }
    if (N >= 1.15 * B) {
      const order = p.units.map((_, k) => k).sort((x, y) => key(id, "TH", rep, x) - key(id, "TH", rep, y)), keep = new Set(); let s = 0; for (const k of order) { keep.add(k); s += p.units[k].length; if (s >= B) break; }
      const U2 = [], D2 = []; p.units.forEach((u, k) => { if (keep.has(k)) { U2.push(u); D2.push(p.docOf[k]); } });
      r.TH.push(two(id, U2, D2, R, `${id}|TH|${rep}`));
    }
  }
  { let best = null; for (let c = 1; c <= 60; c++) { let n = 0, t = 0; for (const u of p.units) if (u.length <= c) { n++; t += u.length; } if (n) { const m = t / n; if (!best || Math.abs(m - 4) < Math.abs(best.m - 4) - 1e-9) best = { c, m }; } }
    const C = filt(p, (u) => u.length <= best.c), docsC = [...new Set(C.docOf)], lenC = new Map(); C.units.forEach((u, k) => lenC.set(C.docOf[k], (lenC.get(C.docOf[k]) || 0) + u.length));
    r.FC = { cap: best.c, meanUL: best.m, tokens: tokensOf(C.units), reps: [] };
    if (tokensOf(C.units) >= 1.15 * B) for (let rep = 0; rep < 6; rep++) {
      const order = docsC.slice().sort((x, y) => key(id, "FC", rep, x) - key(id, "FC", rep, y)), keep = new Set(); let s = 0; for (const d of order) { keep.add(d); s += lenC.get(d); if (s >= B) break; }
      const U2 = [], D2 = []; C.units.forEach((u, k) => { if (keep.has(C.docOf[k])) { U2.push(u); D2.push(C.docOf[k]); } }); const x = two(id, U2, D2, R, `${id}|FC|${rep}`); x.meanUL = tokensOf(U2) / U2.length; r.FC.reps.push(x);
    }
  }
  out[id] = r;
  console.error(id, "d0", f(r.base.d), "| lc d", r.decomp.map((x) => f(x.d, 2) + "(" + f(x.tokenShare, 2) + ")").join(" "), "| F12", f(r.F12.d, 3), "(z", f(r.F12.zD, 1), f(r.F12.zC, 1) + ") LONG", r.LONG ? f(r.LONG.d, 3) : "NA", "| F12B", f(mean(r.F12B.map((x) => x.d)), 3), "| TH", f(mean(r.TH.map((x) => x.d)), 3), "| FC cap", r.FC.cap, "ul", f(r.FC.meanUL, 2), "tok", r.FC.tokens, "d", r.FC.reps.length ? f(mean(r.FC.reps.map((x) => x.d)), 3) : "NA");
}
fs.writeFileSync(path.join(HERE, `A2${tag ? "_" + tag : ""}.json`), JSON.stringify(out, null, 1));
