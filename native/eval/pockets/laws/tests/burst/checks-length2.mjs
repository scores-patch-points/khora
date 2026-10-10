// law-free but dense: real-book tokens shuffled token-global (unigram law kept, all order destroyed), re-cut into units with AUTOCORRELATED lengths
// (15-unit regimes of 2-5 and 20-40 tokens) and into constant-length units. The matched-baseline lifts must stay ~0; an unmatched far baseline must show the length-persistence inflation.
import fs from "node:fs";
import { load as lb } from "../../../loaders/books.mjs";
import { halves, rngOf, seedOf } from "../../../lib/pocket.mjs";
import { prep } from "../../_burst_prep.mjs";
import { jaccardLifts } from "../../_burst_units.mjs";
const [bk] = await lb(["bk-great-expect"]), H = halves(bk).discover, rg = rngOf(seedOf("burst-length2"));
const flat = H.units.flat(), N = flat.length;
for (let i = N - 1; i > 0; i--) { const j = Math.floor(rg() * (i + 1)); [flat[i], flat[j]] = [flat[j], flat[i]]; }
const regime = () => { const units = [], docOf = []; let i = 0, reg = 0, left = 15; while (i < N) { const L = reg ? 20 + Math.floor(rg() * 21) : 2 + Math.floor(rg() * 4); if (i + L > N) break; units.push(flat.slice(i, i + L)); docOf.push(Math.floor(i / 1000)); i += L; if (--left === 0) { reg ^= 1; left = 15; } } return { units, docOf }; };
const fixed = (L) => { const units = [], docOf = []; for (let i = 0; i + L <= N; i += L) { units.push(flat.slice(i, i + L)); docOf.push(Math.floor(i / 1000)); } return { units, docOf }; };
const unmatched = (P) => { const cs = []; for (let u = 0; u < P.U; u++) { const s = new Set(); for (let p = P.unitStart[u]; p < P.unitStart[u + 1]; p++) { const t = P.T[p]; if (P.cnt[t] >= 2 && P.mid[t] > 100) s.add(t); } cs.push(s); }
  const J = (a, b) => { let h = 0; for (const t of a) if (b.has(t)) h++; return h / (a.size + b.size - h); }; let sn = 0, nn = 0, sf = 0, nf = 0;
  for (let u = 0; u + 1 < P.U; u++) { if (!cs[u].size || !cs[u + 1].size) continue; sn += J(cs[u], cs[u + 1]); nn++; const v = (u * 2654435761 + 977) % P.U; if (Math.abs(v - u) > 64 && cs[v].size) { sf += J(cs[u], cs[v]); nf++; } }
  return Math.log(sn / nn / (sf / nf)); };
const res = {};
for (const [name, v] of [["regimes-2-5/20-40", regime()], ["fixed-8", fixed(8)], ["fixed-30", fixed(30)]]) {
  const P = prep(v), L = jaccardLifts(P); res[name] = { tokens: N, units: P.U, matchedLiftByLag: L.map((r) => [r.lag, r.lift == null ? null : +r.lift.toFixed(3)]), unmatchedLnRatioLag1: +unmatched(P).toFixed(3) };
}
fs.writeFileSync("checks-length2.json", JSON.stringify(res, null, 1)); console.error("length2 done");
