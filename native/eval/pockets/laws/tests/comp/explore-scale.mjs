// exploration: size dependence of edge-gap variants and asym variants on prefixes of one real book (Great Expectations) and on a second one (Prince is too short: use Crime and Punishment). node explore-scale.mjs
import { prep, NB, entropyMM } from "../../_comp_prep.mjs";
import { bookView, round } from "./_t_util.mjs";
const books = [["GE", "01-literature-books/gitenberg/pg1400_Great-Expectations.txt"], ["CrimePunish", "01-literature-books/gitenberg/pg2554_Crime-and-Punishment.txt"]];
function typeRanks(P) { const { cnt, V } = P, names = null, order = Array.from({ length: V }, (_, i) => i).sort((a, b) => cnt[b] - cnt[a] || a - b), r = new Float64Array(V); order.forEach((t, k) => { r[t] = k + 1; }); return r; }
function gaps(P) {
  const { us, w, tb, nUnits, V } = P, rk = typeRanks(P); let n = 0, sb = 0, sl = 0;
  for (let k = 0; k < nUnits; k++) { const s = us[k], e = us[k + 1]; if (e - s < 2) continue; n++; sb += tb[e - 1] - tb[s]; sl += Math.log(rk[w[e - 1]]) - Math.log(rk[w[s]]); }
  return { binGap: sb / n, lnRankGap: sl / n, lnRankGapScaled: sl / n / Math.log(V), V };
}
function asymTop(P, K) {
  const { us, w, tb, cnt, V, nUnits } = P, el = []; for (let t = 0; t < V; t++) if (cnt[t] >= 40) el.push(t); el.sort((a, b) => cnt[b] - cnt[a] || a - b);
  const top = el.slice(0, K), slot = new Int32Array(V).fill(-1); top.forEach((t, q) => { slot[t] = q; });
  const hL = new Float64Array(K * NB), hR = new Float64Array(K * NB), nI = new Float64Array(K);
  for (let k = 0; k < nUnits; k++) { const s = us[k], e = us[k + 1]; for (let i = s + 1; i < e - 1; i++) { const q = slot[w[i]]; if (q < 0) continue; hL[q * NB + tb[i - 1]]++; hR[q * NB + tb[i + 1]]++; nI[q]++; } }
  let sum = 0, m = 0; for (let q = 0; q < top.length; q++) { if (nI[q] < 40) continue; const a = entropyMM(hL.subarray(q * NB, (q + 1) * NB)), b = entropyMM(hR.subarray(q * NB, (q + 1) * NB)); sum += (b - a) / (b + a); m++; }
  return m >= 10 ? sum / m : null;
}
for (const [name, rel] of books) {
  const full = bookView(rel, name, 200000);
  for (const n of [10000, 20000, 40000, 80000, 150000]) {
    let t = 0, e = 0; while (e < full.units.length && t < n) t += full.units[e++].length;
    const P = prep({ units: full.units.slice(0, e) }), g = gaps(P);
    console.log(name, String(n).padStart(6), "V", g.V, "binGap", round(g.binGap, 3), "lnRankGap", round(g.lnRankGap, 3), "scaled", round(g.lnRankGapScaled, 4), "| asymTop20", round(asymTop(P, 20), 4), "asymTop10", round(asymTop(P, 10), 4));
  }
}
