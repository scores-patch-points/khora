// name-convention-summary.mjs <r31-or-r32-json>... — PREREG-ROUND31-CONVENTION.md (and ROUND32: with r31 rows beside, H5 = R(on) - R(r31)): pooled R, P, FB (OFF, ON), ΔR, ΔP, ΔFB with a document bootstrap
// (2,000 resamples, seed 20261128, 95% percentile), and the falsifier K (the rung's pooled ΔP against the 95th percentile of the random arms').
import fs from "node:fs";
const docs = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const pool = (rows, arm) => rows.reduce((a, r) => { const x = arm(r); a.NB += x.NB; a.FB += x.FB; a.gp += x.gp; a.cov += x.covered; return a; }, { NB: 0, FB: 0, gp: 0, cov: 0 });
const P = (s) => s.NB / Math.max(1, s.NB + s.FB), R = (s) => s.cov / Math.max(1, s.gp);
const stats = (rows) => { const o = pool(rows, (r) => r.off), n = pool(rows, (r) => r.on); return { dR: R(n) - R(o), dP: P(n) - P(o), dFB: n.FB - o.FB, off: { P: P(o), R: R(o), FB: o.FB, NB: o.NB }, on: { P: P(n), R: R(n), FB: n.FB, NB: n.NB } }; };
let s = 20261128 >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const boot = (f) => { const v = []; for (let b = 0; b < 2000; b++) { const rs = []; for (let i = 0; i < docs.length; i++) rs.push(docs[Math.floor(rnd() * docs.length)]); v.push(f(rs)); } v.sort((a, b) => a - b); return [v[Math.floor(0.025 * v.length)], v[Math.floor(0.975 * v.length)]]; };
const st = stats(docs);
const out = { documents: docs.length, fired: docs.filter((d) => d.fired).length, refusedSurfaces: docs.reduce((a, d) => a + d.refused, 0), ...st,
  ci: { dR: boot((rs) => stats(rs).dR), dP: boot((rs) => stats(rs).dP), dFB: boot((rs) => stats(rs).dFB) } };
if (docs.every((d) => d.r31)) { const h5 = (rs) => R(pool(rs, (r) => r.on)) - R(pool(rs, (r) => r.r31)); const p5 = (rs) => P(pool(rs, (r) => r.on)) - P(pool(rs, (r) => r.r31)); out.H5 = { dR_vs_r31: h5(docs), ci: boot(h5), dP_vs_r31: p5(docs), ciP: boot(p5), r31: { P: P(pool(docs, (r) => r.r31)), R: R(pool(docs, (r) => r.r31)), FB: pool(docs, (r) => r.r31).FB } }; }
const withK = docs.filter((d) => Array.isArray(d.K) && d.K.length);
if (withK.length) {
  const nK = withK[0].K.length; const kdP = [];
  for (let j = 0; j < nK; j++) { const rows = docs.map((d) => (Array.isArray(d.K) && d.K[j] ? { ...d, on: d.K[j] } : d)); kdP.push(stats(rows).dP); }
  kdP.sort((a, b) => a - b); out.K = { arms: nK, documents: withK.length, p95_dP: kdP[Math.floor(0.95 * (nK - 1))], max_dP: kdP[nK - 1], rung_dP: st.dP, rungExceeds: st.dP > kdP[Math.floor(0.95 * (nK - 1))] };
}
console.log(JSON.stringify(out, null, 1));
