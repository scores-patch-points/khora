// postday.mjs: DESCRIPTIVE look (no test, no bar) at why ubuntu/2010-07-15 (S0 day AUC 0.678) and ubuntu/2013-07-15 (0.751) are the weak big days. Prints top flagged ordinary forms and the lowest-scoring nick forms. Run: node postday.mjs
import { loadDay, buildIx, feat, laterOccs, headerSha } from "./lib.mjs";
import { matchDay, pAuc } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
for (const key of ["ubuntu/2010-07-15.txt", "ubuntu/2013-07-15.txt", "ubuntu/2011-03-15.txt"]) {
  const d = loadDay(key), ix = buildIx(d.T), m = matchDay(d, "S0", { max: 400 }), F = new Map(), P = new Map();
  for (const o of laterOccs(d)) { const s = feat(ix, o.k, o.w); if (o.cls === "N" && s.ishare >= 0.67) F.set(o.w, (F.get(o.w) ?? 0) + 1); if (o.cls === "P") { const r = P.get(o.w) ?? P.set(o.w, { n: 0, hit: 0, init: 0 }).get(o.w); r.n++; if (s.ishare >= 0.67) r.hit++; if (o.i === 0) r.init++; } }
  const miss = [...P].filter(([, r]) => r.n >= 8).map(([w, r]) => [w, r.n, +(r.hit / r.n).toFixed(2), +(r.init / r.n).toFixed(2)]).sort((a, b) => a[2] - b[2]).slice(0, 12);
  const dist = (p) => `pairs=${m.pairs.length} auc=${pAuc(m.pairs, "ishare").toFixed(3)} rec=${pAuc(m.pairs, "rec").toFixed(3)} c32=${pAuc(m.pairs, "c32").toFixed(3)}`;
  console.log(key, "msgs", d.T.length, "nick forms", d.nicks.size, dist(), "\n  topFlaggedOrdinary", JSON.stringify([...F].sort((a, b) => b[1] - a[1]).slice(0, 15)), "\n  lowestHitNicks[w,n,hitShare,initShare]", JSON.stringify(miss));
}
