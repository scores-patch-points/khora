// ant-adversary / analyse_irc.mjs — analysis of data/irc/*.json per PREREG_IRC.md. node analyse_irc.mjs [--perm 50] [--out results/irc_analysis.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cvScores, aucOf } from "../../law/name-war-and-peace.mjs";
import { rngFor, seedFor } from "../../law/impact.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PERM = Number(opt("--perm", 50)), BOOT = Number(opt("--boot", 1000)), FLIP = Number(opt("--flip", 1000)), OUT = opt("--out", path.join(HERE, "results", "irc_analysis.json"));
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const q = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))] : null; };
const dir = path.join(HERE, "data", "irc");
const PREFIX = opt("--prefix", "AB");
const days = fs.readdirSync(dir).filter((f) => (PREFIX === "AB" ? /^[AB]-.*\.json$/ : new RegExp(`^${PREFIX}-.*\\.json$`)).test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
const allRows = [];
for (const d of days) for (const r of d.rows) allRows.push({ ...r, set: d.set, pairId: `${d.day}#${r.stratum}#${r.pair}` });
// EXPLORATORY filters (post hoc, labelled): --minlen N keeps pairs whose two forms both have >= N characters; --lenmatch 1 keeps pairs with the same character-length bucket {3,4,5,6-7,8+}
const MINLEN = Number(opt("--minlen", 0)), LENMATCH = opt("--lenmatch", "0") === "1", clb = (n) => (n <= 5 ? n : n <= 7 ? 6 : 8);
if (MINLEN || LENMATCH) { const g = new Map(); for (const r of allRows) (g.get(r.pairId) ?? g.set(r.pairId, []).get(r.pairId)).push(r); const keep = new Set(); for (const [id, p] of g) if (p.length === 2 && p.every((r) => [...r.id].length >= MINLEN) && (!LENMATCH || clb([...p[0].id].length) === clb([...p[1].id].length))) keep.add(id); const kept = allRows.filter((r) => keep.has(r.pairId)); allRows.length = 0; allRows.push(...kept); console.error(`exploratory filter minlen ${MINLEN} lenmatch ${LENMATCH}: ${allRows.length} rows kept`); }
const feat = {
  IMP: (r) => [...r.sig, ...r.atm], FULL: (r) => [...r.sig, ...r.atm, ...r.span, ...r.c],
  RIV: (r) => [Math.log1p(r.nwin), Math.log((r.last16 + 0.5) / (r.rate * 16 + 0.5)), -Math.log1p(r.gap), Math.log(r.len), r.i, Math.log(r.dayCount)],
  POS: (r) => [r.i, r.i === 0 ? 1 : 0, Math.log(r.len)],
  IMPS: (r) => [...r.sigS, ...r.atmS],
};
feat.RIVIMP = (r) => [...feat.RIV(r), ...feat.IMP(r)];
const scal = { S_ENTRY: (r) => r.S_ENTRY, S_OWN: (r) => r.S_OWN, S_ALL: (r) => r.S_ALL, S_SPAN: (r) => r.S_SPAN, R_LOCAL: (r) => Math.log1p(r.nwin), R_BURST: (r) => Math.log((r.last16 + 0.5) / (r.rate * 16 + 0.5)), R_RECENCY: (r) => -Math.log1p(r.gap), R_MSGLEN: (r) => Math.log(r.len), R_IDX: (r) => r.i, R_FREQ: (r) => Math.log(r.dayCount), R_POSMSG: (r) => r.s, X_EXT: (r) => r.ext, X_NONNULL: (r) => (r.isNull ? 0 : 1) };
// weighted AUC (pair weights), ties 0.5
function wAuc(sc, y, w, idx) {
  let num = 0, den = 0; const P = idx.filter((k) => y[k] === 1 && sc[k] != null), N = idx.filter((k) => y[k] === 0 && sc[k] != null);
  for (const a of P) for (const b of N) { const ww = w[a] * w[b]; den += ww; num += ww * (sc[a] > sc[b] ? 1 : sc[a] === sc[b] ? 0.5 : 0); }
  return den ? num / den : null;
}
function bootCI(arms, y, block, rowsIdx, B, seed, w = null) {
  const rnd = rngFor(seed), ids = [...new Set(rowsIdx.map((k) => block[k]))], by = new Map(ids.map((b) => [b, []]));
  rowsIdx.forEach((k) => by.get(block[k]).push(k));
  const out = Object.fromEntries(Object.keys(arms).map((a) => [a, []])); out.diff = [];
  for (let t = 0; t < B; t++) {
    const rows = []; for (let j = 0; j < ids.length; j++) rows.push(...by.get(ids[Math.floor(rnd() * ids.length)]));
    const v = {}; for (const a of Object.keys(arms)) { v[a] = w ? wAuc(arms[a], y, w, rows) : aucOf(arms[a], y, rows); if (v[a] != null) out[a].push(v[a]); }
    if (arms.RIVIMP && arms.RIV && v.RIVIMP != null && v.RIV != null) out.diff.push(v.RIVIMP - v.RIV);
  }
  return out;
}
function flipNull(sc, y, pairOf, idx, B, seed) {
  const rnd = rngFor(seed), by = new Map(); idx.forEach((k) => (by.get(pairOf[k]) ?? by.set(pairOf[k], []).get(pairOf[k])).push(k));
  const pairs = [...by.values()].filter((p) => p.length === 2), res = [];
  for (let b = 0; b < B; b++) { const yy = y.slice(); for (const [a, c] of pairs) if (rnd() < 0.5) { yy[a] = y[c]; yy[c] = y[a]; } const v = aucOf(sc, yy, idx); if (v != null) res.push(v); }
  return res;
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
function analyseGroup(name, rows, { natural = false, doPerm = false } = {}) {
  const n = rows.length; if (n < 40) return { name, n, skipped: "fewer than 40 rows" };
  const y = rows.map((r) => r.y), block = rows.map((r) => r.day), pairOf = rows.map((r) => r.pairId), idx = rows.map((_, k) => k);
  const wStr = { INIT: 0.921, NONINIT: 0.079 }, cnt = { INIT: rows.filter((r) => r.stratum === "INIT").length, NONINIT: rows.filter((r) => r.stratum === "NONINIT").length };
  const w = natural ? rows.map((r) => (cnt[r.stratum] ? wStr[r.stratum] / cnt[r.stratum] : 0)) : null;
  const arms = {};
  for (const [k, f] of Object.entries(scal)) arms[k] = rows.map(f);
  for (const k of ["IMP", "FULL", "RIV", "RIVIMP", "POS", "IMPS"]) arms[k] = cvScores(rows.map(feat[k]), y, block);
  const ci = bootCI(arms, y, block, idx, BOOT, seedFor("adv-boot", name), w);
  const res = { name, n, pairs: n / 2, days: new Set(block).size, auc: {}, ci: {}, flipQ95: {}, wAuc: {} };
  for (const k of Object.keys(arms)) {
    res.auc[k] = round(aucOf(arms[k], y)); res.ci[k] = [round(q(ci[k], 0.025)), round(q(ci[k], 0.975))];
    if (["S_ENTRY", "S_ALL", "IMP", "FULL", "RIV", "RIVIMP", "IMPS", "R_LOCAL", "S_SPAN", "S_OWN"].includes(k)) res.flipQ95[k] = round(q(flipNull(arms[k], y, pairOf, idx, FLIP, seedFor("adv-flip", name, k)), 0.95));
    if (w) res.wAuc[k] = round(wAuc(arms[k], y, w, idx));
  }
  const point = aucOf(arms.RIVIMP, y) - aucOf(arms.RIV, y);
  res.increment = { point: round(point), ci: [round(q(ci.diff, 0.025)), round(q(ci.diff, 0.975))] };
  if (w) res.incrementWeighted = round(wAuc(arms.RIVIMP, y, w, idx) - wAuc(arms.RIV, y, w, idx));
  if (doPerm && PERM > 0) {
    const rnd = rngFor(seedFor("adv-fitperm", name)), by = new Map(); idx.forEach((k) => (by.get(pairOf[k]) ?? by.set(pairOf[k], []).get(pairOf[k])).push(k));
    const pairs = [...by.values()].filter((p) => p.length === 2), d = [];
    for (let b = 0; b < PERM; b++) { const yy = y.slice(); for (const [a, c] of pairs) if (rnd() < 0.5) { yy[a] = y[c]; yy[c] = y[a]; } const sA = cvScores(rows.map(feat.RIVIMP), yy, block), sB = cvScores(rows.map(feat.RIV), yy, block); d.push(aucOf(sA, yy) - aucOf(sB, yy)); }
    res.incrementFitNull = { B: PERM, q95: round(q(d, 0.95)), mean: round(mean(d)) };
  }
  const pos = rows.filter((r) => r.y === 1), neg = rows.filter((r) => r.y === 0), f = (fn) => [round(mean(pos.map(fn)), 3), round(mean(neg.map(fn)), 3)];
  res.matching = { init: f((r) => r.init), idx: f((r) => r.i), logLen: f((r) => Math.log(r.len)), logDayCount: f((r) => Math.log(r.dayCount)), logNwin: f((r) => Math.log1p(r.nwin)), last16: f((r) => r.last16), logGap: f((r) => Math.log1p(r.gap)), "posMsg": f((r) => r.s) };
  res.K5_posNonNull = round(mean(pos.map((r) => (r.isNull ? 0 : 1)))); res.negNonNull = round(mean(neg.map((r) => (r.isNull ? 0 : 1)))); res.shuffledPosNonNull = round(mean(pos.map((r) => (r.isNullS ? 0 : 1))));
  res.posMedianExtent = q(pos.map((r) => r.ext), 0.5); res.negMedianExtent = q(neg.map((r) => r.ext), 0.5);
  return res;
}
const subsets = {};
const SETLIST = PREFIX === "AB" ? ["A", "B", "AB"] : [PREFIX];
for (const setName of SETLIST) {
  const inSet = (r) => setName === "AB" || r.set === setName || PREFIX !== "AB";
  const strictPairs = new Set(); const byPair = new Map(); for (const r of allRows) (byPair.get(r.pairId) ?? byPair.set(r.pairId, []).get(r.pairId)).push(r);
  for (const [id, p] of byPair) if (p.length === 2 && p[0].wb === p[1].wb) strictPairs.add(id);
  for (const st of ["INIT", "NONINIT", "POOL"]) {
    const base = allRows.filter((r) => inSet(r) && (st === "POOL" || r.stratum === st));
    subsets[`${setName}:${st}`] = base; subsets[`${setName}:STRICT-${st}`] = base.filter((r) => strictPairs.has(r.pairId));
  }
}
const results = { prereg: "PREREG_IRC.md", sha256: fs.readFileSync(path.join(HERE, "PREREG_IRC.sha256"), "utf8").slice(0, 64), days: days.map((d) => ({ day: d.day, set: d.set, msgs: d.msgs, INIT: d.INIT, NONINIT: d.NONINIT, sham: d.sham, determinism: d.determinism, cand: d.candidates })), groups: {} };
for (const [name, rows] of Object.entries(subsets)) {
  const t0 = Date.now(); results.groups[name] = analyseGroup(name, rows, { natural: name.endsWith(":POOL"), doPerm: name === `${SETLIST[0]}:POOL` || name === `${SETLIST[0]}:NONINIT` || name === `${SETLIST[0]}:INIT` });
  console.error(name, rows.length, ((Date.now() - t0) / 1000).toFixed(0) + "s");
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
}
const pr = (g) => g.skipped ? `${g.name} n=${g.n} skipped` : `${g.name.padEnd(18)} pairs ${String(g.pairs).padStart(4)} days ${g.days}  IMP ${g.auc.IMP} [${g.ci.IMP}] q95 ${g.flipQ95.IMP} | FULL ${g.auc.FULL} | RIV ${g.auc.RIV} | RIV+IMP ${g.auc.RIVIMP} inc ${g.increment.point} [${g.increment.ci}] | POS ${g.auc.POS} | S_ENTRY ${g.auc.S_ENTRY} R_LOCAL ${g.auc.R_LOCAL} | IMPS(shuf) ${g.auc.IMPS}`;
console.log(Object.values(results.groups).map(pr).join("\n"));
