// attack-PM-R2-left-company-polarity/summarize-A.mjs -- descriptive/mechanical summary of results/A.*.jsonl (criteria were fixed in attack-A-strict.mjs's header). NEW FILE.
//   node summarize-A.mjs [fam]   -> stdout + results/A-summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, round, mean, rngFor, seedFor, quantile } from "./attack-lib.mjs";
const RES = path.join(HERE, "results"), want = process.argv[2] ?? null;
const rows = fs.readdirSync(RES).filter((f) => /^A\..*\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const props = Object.fromEntries(rows.filter((r) => r.kind === "props").map((r) => [r.reg, r])), cells = rows.filter((r) => r.variant && r.variant !== "R0" && r.pairs > 0), R0 = rows.filter((r) => r.variant === "R0");
const med = (xs) => (xs.length ? round(quantile(xs, 0.5)) : null);
const pooled = (cs, B = 400, tag = "") => { // family-pooled win rate with cluster bootstrap (clusters = (register, positive form))
  const cl = []; let off = 0; const wins = [];
  for (const c of cs) { const ids = c.cl.map((x) => x + off); off += Math.max(...c.cl) + 1; for (let k = 0; k < c.wins.length; k++) { wins.push(c.wins[k] === "1" ? 1 : c.wins[k] === "0" ? 0 : 0.5); cl.push(ids[k]); } }
  if (!wins.length) return null; const by = new Map(); wins.forEach((w, k) => { const a = by.get(cl[k]) ?? by.set(cl[k], [0, 0]).get(cl[k]); a[0] += w; a[1]++; }); const S = [...by.values()], est = wins.reduce((a, b) => a + b, 0) / wins.length, rnd = rngFor(seedFor("pm-r2-attack-A", "pool", tag)), bs = [];
  for (let b = 0; b < B; b++) { let s = 0, m = 0; for (let t = 0; t < S.length; t++) { const c = S[Math.floor(rnd() * S.length)]; s += c[0]; m += c[1]; } bs.push(s / m); }
  return { auc: round(est), lo: round(quantile(bs, 0.025)), hi: round(quantile(bs, 0.975)), pairs: wins.length, clusters: S.length };
};
const sign = (d) => (d.lo > 0.5 && d.auc >= 0.53 ? "POS" : d.hi < 0.5 && d.auc <= 0.47 ? "NEG" : "FLAT");
const out = { families: {} };
for (const fam of ["irc", "code", "book", "ud"]) {
  if (want && want !== fam) continue; const regs = [...new Set(cells.filter((c) => (fam === "irc" ? c.fam === "irc" : c.fam === fam)).map((c) => c.reg))].sort(), o = {};
  for (const v of ["M0", "M1", "M2", "M3", "M4"]) {
    const cs = cells.filter((c) => c.variant === v && regs.includes(c.reg) && c.fam === fam), val = cs.filter((c) => c.valid), A = (c) => c.DLx.auc;
    const sg = val.map((c) => sign(c.DLx));
    o[v] = { cells: cs.length, pairsTotal: cs.reduce((a, c) => a + c.pairs, 0), valid: val.length, medAll: med(cs.map(A)), medValid: med(val.map(A)), POS: sg.filter((x) => x === "POS").length, NEG: sg.filter((x) => x === "NEG").length,
      nLowValid: val.filter((c) => A(c) <= 0.47).length, pooledAll: pooled(cs, 400, `${fam}-${v}-all`), pooledValid: pooled(val, 400, `${fam}-${v}-val`), medDLxF: med(cs.map((c) => c.DLxF?.auc).filter((x) => x != null)), medEsP: med(cs.map((c) => c.meanEsP)), medEsN: med(cs.map((c) => c.meanEsN)),
      perReg: fam === "ud" ? undefined : Object.fromEntries(cs.map((c) => [c.reg, { pairs: c.pairs, auc: A(c), lo: c.DLx.lo, hi: c.DLx.hi, valid: c.valid, ctrl: c.ctrl, DLxF: c.DLxF?.auc, Dobs: c.Dobs, nDnull: c.nDnull, esP: c.meanEsP, esN: c.meanEsN }])) };
  }
  o.R0 = R0.filter((r) => regs.includes(r.reg)).map((r) => ({ reg: r.reg, pairs: r.pairs, aucExact: r.aucExact, aucTieTol: r.aucTieTol, pShareZero: r.pShareZero, pShareFloatNoise: r.pShareFloatNoise, tieShareExact: r.tieShareExact, tieShareTol: r.tieShareTol }));
  o.R0med = { aucExact: med(o.R0.map((x) => x.aucExact)), aucTieTol: med(o.R0.map((x) => x.aucTieTol)), n: o.R0.length };
  out.families[fam] = o;
}
fs.writeFileSync(path.join(RES, "A-summary.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
