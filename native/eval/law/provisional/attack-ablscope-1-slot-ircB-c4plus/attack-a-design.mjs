// attack-a-design.mjs -- OUTCOME-BLIND DESIGN of attack A (STRICTER MATCHING) on rule ablscope-1-slot-ircB-c4plus. Counts, positions, lengths, frequencies and in-window initial shares of the streams only.
// No ablation / impact value of any token is read or computed here. Output data/design-a.json (sha256 printed) = for every POSITIVE of the confirmer's B c4+ pairs in E_CORE / E_SRV / E_REUSE (the confirmer's own read positives) a
// negative drawn from ALL eligible unlabelled B tokens of the same day under three matching levels (hard calipers; nearest-first with a signed running-balance term; without replacement within a level, <= 4 uses of a form):
//   S1 COUNT-EXACT: same stratum; |dc| <= 1 when c <= 15 else |ln c ratio| <= 0.10; exact form-frequency bin; |dlen| <= 1; same I1/I2 class; |ln msglen ratio| <= 0.5; |ds| <= 20% of the stream.      (the confirmer's calipers, c made exact)
//   S2 STRICTEST:   S1 + exact character length; exact in-message index (capped at 6); |ln msglen ratio| <= 0.25; |ds| <= 10%; |dlast16| <= 1 (recency); |dcBefore| <= 1.
//   S3 INITIAL-SHARE-MATCHED ("message-initial exact" for the OTHER mentions): S1 + R_INIT (share of the form's in-window mentions that open a message) within 0.10 and the same zero / non-zero status.
// Executor: attack-a-read.mjs (reads the negatives that the confirmer did not already read). Analysis: attack-a-analyse.mjs (header = registration).
//   node attack-a-design.mjs
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadDocCond, addRivals, slimOf, M_IRC } from "../confirm-ablscope-1-slot-ircB-c4plus/lib.mjs";
import { indexAndCandidates } from "../ablation-scope/lib-pairs.mjs";
import { HERE, CONF, rngFor, seedFor, aucPN } from "./lib-a.mjs";

const design = JSON.parse(fs.readFileSync(path.join(CONF, "data", "design.json"), "utf8"));
const ARMS = ["E_CORE", "E_SRV", "E_REUSE"], ST = ["c4_6", "c7_15", "c16p"];
const posByDoc = new Map();
for (const t of design.tokens) if (ARMS.includes(t.arm) && t.kind === "pair" && t.y === 1 && t.grp === "B" && ST.includes(t.stratum)) (posByDoc.get(t.doc) ?? posByDoc.set(t.doc, []).get(t.doc)).push(t);

const countOk = (p, q) => (p.c <= 15 ? Math.abs(q.c - p.c) <= 1 : Math.abs(Math.log(q.c / p.c)) <= 0.10);
const hard = {
  S1: (p, q, N) => q.stratum === p.stratum && countOk(p, q) && q.fbin === p.fbin && Math.abs(q.len - p.len) <= 1 && q.pc === p.pc && Math.abs(Math.log(q.sl / p.sl)) <= 0.5 && Math.abs(q.s - p.s) <= 0.2 * N,
  S2: (p, q, N) => hard.S1(p, q, N) && q.len === p.len && Math.min(q.i, 6) === Math.min(p.i, 6) && Math.abs(Math.log(q.sl / p.sl)) <= 0.25 && Math.abs(q.s - p.s) <= 0.1 * N && Math.abs(q.last16 - p.last16) <= 1 && Math.abs(q.cBefore - p.cBefore) <= 1,
  S3: (p, q, N) => hard.S1(p, q, N) && (p.rinit === 0) === (q.rinit === 0) && Math.abs(q.rinit - p.rinit) <= 0.10,
};
const tokens = [], report = { levels: {}, perDay: {} };
for (const [name, pos] of posByDoc) {
  const doc = loadDocCond(name, "real"), M = M_IRC, cand = indexAndCandidates(doc, M), N = cand.nMsg;
  const negAll = cand.N.filter((q) => q.grp === "B" && ST.includes(q.stratum)); addRivals(negAll, cand.occ, M);
  const byStrat = new Map(); for (const q of negAll) (byStrat.get(q.stratum) ?? byStrat.set(q.stratum, []).get(q.stratum)).push(q);
  for (const level of ["S1", "S2", "S3"]) {
    const rnd = rngFor(seedFor("attack-ablscope-1", "design", name, level));
    const order = pos.map((_, k) => k); for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
    const taken = new Set(), use = new Map(); let sDL = 0, sDC = 0, sDS = 0, sDM = 0, np = 0, made = 0;
    for (const k of order) {
      const p = pos[k], arr = byStrat.get(p.stratum) ?? [], k1 = made + 1; let best = null, bc = Infinity;
      for (const q of arr) {
        if (taken.has(`${q.s}:${q.i}`) || (use.get(q.w) ?? 0) >= 4 || !hard[level](p, q, N)) continue;
        const dl = q.len - p.len, dc = Math.log(q.c / p.c), ds = (q.s - p.s) / N, dm = Math.log(q.sl / p.sl);
        const cost = 3 * Math.abs(dc) + Math.abs(dl) + 2 * Math.abs(dm) + 4 * Math.abs(ds) + 6 * Math.abs((sDL + dl) / k1) + 4 * Math.abs((sDC + dc) / k1) + 8 * Math.abs((sDS + ds) / k1) + 6 * Math.abs((sDM + dm) / k1) + rnd() * 0.01;
        if (cost < bc) { bc = cost; best = { q, dl, dc, ds, dm }; }
      }
      np += 1; if (!best) continue;
      const q = best.q; taken.add(`${q.s}:${q.i}`); use.set(q.w, (use.get(q.w) ?? 0) + 1); sDL += best.dl; sDC += best.dc; sDS += best.ds; sDM += best.dm; made += 1;
      const id = `A|${level}|${name}|${k}`, base = { arm: p.arm, doc: name, cond: "real", pair: id, kind: "pair", grp: "B", stratum: p.stratum, units: p.units, level, srcPair: p.pair };
      tokens.push({ ...base, y: 1, ...slimOf(p) }); tokens.push({ ...base, y: 0, ...slimOf(q) });
    }
    const r = (report.levels[level] ??= { positives: 0, pairs: 0 }); r.positives += np; r.pairs += made;
    (report.perDay[name] ??= {})[level] = `${made}/${np}`;
  }
  console.error(`${name}: ${JSON.stringify(report.perDay[name])}`);
}
// design-time balance (outcome-blind): six controls + recency + initial share of the designed pairs per level
for (const level of Object.keys(report.levels)) {
  const ps = new Map(); for (const t of tokens) if (t.level === level) { const o = ps.get(t.pair) ?? ps.set(t.pair, {}).get(t.pair); o[t.y ? "p" : "n"] = t; }
  const prs = [...ps.values()].filter((x) => x.p && x.n);
  const f = { R_LOGC: (r) => Math.log(r.c), R_POS: (r) => Math.log1p(r.s), R_IPOS: (r) => r.i, R_FB: (r) => r.fbin, R_LEN: (r) => r.len, R_SL: (r) => Math.log(r.sl), R_LAST16: (r) => r.last16, R_RINIT: (r) => r.rinit };
  report.levels[level].designControls = Object.fromEntries(Object.entries(f).map(([k, g]) => [k, Number(aucPN(prs.map((x) => g(x.p)), prs.map((x) => g(x.n))).toFixed(3))]));
}
const out = JSON.stringify({ tag: "ac", tokens });
fs.writeFileSync(path.join(HERE, "data", "design-a.json"), out);
report.designSha256 = createHash("sha256").update(out).digest("hex"); report.tokens = tokens.length;
fs.writeFileSync(path.join(HERE, "results", "design-a-report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ designSha256: report.designSha256, tokens: tokens.length, levels: report.levels }, null, 1));
