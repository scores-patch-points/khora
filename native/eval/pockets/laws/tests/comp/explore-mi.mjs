// exploration (not a test of record): size sensitivity of three miDecay variants on a real book at several caps, real versus one within-unit null draw. node explore-mi.mjs
import { nullView, seedOf } from "../../../lib/pocket.mjs";
import { prep, NB, jointEntropies, LN2 } from "../../_comp_prep.mjs";
import { bookView, round, tokensOf } from "./_t_util.mjs";
const fit = (raw) => { const ys = raw.map(Math.log); const xs = ys.map((_, i) => Math.log(i + 1)), n = ys.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let a = 0, b = 0; xs.forEach((x, i) => { a += (x - mx) * (ys[i] - my); b += (x - mx) ** 2; }); return -a / b; };
// pair tables with optional systematic subsample to M pairs per distance
function tables(P, M) {
  const { us, tb, nUnits } = P, T = [], Nd = []; for (let d = 1; d <= 8; d++) { let n = 0; for (let k = 0; k < nUnits; k++) n += Math.max(0, us[k + 1] - us[k] - d); Nd.push(n); T.push(new Float64Array(NB * NB)); }
  const cnt = new Array(8).fill(0);
  for (let k = 0; k < nUnits; k++) { const s = us[k], e = us[k + 1];
    for (let i = s; i < e - 1; i++) for (let d = 1; d <= Math.min(8, e - 1 - i); d++) {
      const j = cnt[d - 1]++, N = Nd[d - 1];
      if (!M || N <= M || Math.floor(((j + 1) * M) / N) > Math.floor((j * M) / N)) T[d - 1][tb[i] * NB + tb[i + d]]++;
    } }
  return { T, Nd };
}
function mis(T, mm) { return T.map((t) => { const j = jointEntropies(t); let mi = j.Ha + j.Hb - j.Hab; if (mm) { let ra = 0, rb = 0; const a = new Float64Array(NB), b = new Float64Array(NB); for (let i = 0; i < NB; i++) for (let k = 0; k < NB; k++) { a[i] += t[i * NB + k]; b[k] += t[i * NB + k]; } a.forEach((x) => x > 0 && ra++); b.forEach((x) => x > 0 && rb++); mi -= ((ra - 1) * (rb - 1)) / (2 * j.n * LN2); } return mi; }); }
const rel = "01-literature-books/gitenberg/pg1400_Great-Expectations.txt";
for (const cap of [10000, 20000, 60000, 180000]) {
  const v = bookView(rel, "ge", cap), nv = nullView(v, "within-unit", seedOf("x", cap));
  for (const [tag, w] of [["real", v], ["null", nv]]) {
    const P = prep(w), A = tables(P, 0), B = tables(P, 8000);
    const a = mis(A.T, false), b = mis(B.T, false), c = mis(A.T, true).map((x) => Math.max(x, 0.001));
    console.log(String(tokensOf(v)).padStart(7), tag, "plug-in", round(fit(a), 3), "| fixedM8000", round(fit(b), 3), "| MM-clamp", round(fit(c), 3), "|| MI_1", round(a[0], 4), "MI_8 plug", round(a[7], 4), "MM", round(mis(A.T, true)[7], 4));
  }
}
