// part-a.mjs — PART A: the 20 never-R1-scored IRC days (EN 12, NONEN 8); COARSE key, negatives pooled within the language group. dry = 20 smallest scoper DISCOVERY days (debugging only). See the header of confirm.mjs.
import fs from "node:fs";
import { loadIrcDay, streamIndex, ishare, round, pAuc, bootPairs, flipQ95, THETA } from "./lib.mjs";
import { matchPairs, ircClass, transform, KEY_COARSE } from "./pairs.mjs";
import { evalCell, natural } from "./cells.mjs";
import { KEY_A } from "./strat.mjs";
import { stratCell, SBARS } from "./stratcell.mjs";
const SPLIT = JSON.parse(fs.readFileSync(new URL("../chat-scope/split.json", import.meta.url), "utf8"));
const UNTOUCHED = SPLIT.ineligible.map((d) => d.key);
const BARS = { minN: 40, auc: 0.7, lower: 0.65, clusterMin: 1e9 };
const descr = (ps, seed) => ({ n: ps.length, auc: ps.length ? round(pAuc(ps, "ishare")) : null, ci: ps.length >= 10 ? bootPairs(ps, "ishare", 1, 300, seed) : null, ctl: Object.fromEntries(["i", "len", "cl", "lc"].map((c) => [c, ps.length ? round(pAuc(ps, c)) : null])) });
export async function run({ dry }) {
  const keys = dry ? SPLIT.discovery.slice().sort((a, b) => a.msgs - b.msgs).slice(0, 20).map((d) => d.key) : UNTOUCHED, docs = keys.map(loadIrcDay);
  const G = { EN: docs.filter((d) => d.lang === "en"), NONEN: docs.filter((d) => d.lang !== "en") }, R = { days: keys, msgs: Object.fromEntries(docs.map((d) => [d.key, d.T.length])), cells: {}, descr: {}, shuf: {}, natural: {}, recallByDayPos: {} };
  const build = (mode) => { const out = {}; for (const [g, ds] of Object.entries(G)) out[g] = matchPairs(ds.map((d) => transform(d, mode)), ircClass, { max: 1e9, pooled: true, keyFn: KEY_COARSE, mode, tag: g }); return out; };
  const real = build("real"); R.coverage = Object.fromEntries(Object.entries(real).map(([g, r]) => [g, { nPos: r.nPos, pairs: r.pairs.length, dropped: r.dropped }]));
  const PS = { EN: real.EN.pairs, NONEN: real.NONEN.pairs }; PS.POOLED = [...PS.EN, ...PS.NONEN];
  for (const [sn, ps] of Object.entries(PS)) { R.cells[sn] = evalCell(ps, BARS, "A" + sn); R.descr[sn] = descr(ps, "Ad" + sn); for (const fn of ["INIT", "NONINIT"]) R.descr[`${sn}|${fn}`] = descr(ps.filter((p) => (fn === "INIT") === p.pos.init), `Ad${sn}${fn}`); }
  for (const mode of ["wordshuf", "msgshuf"]) { const sh = build(mode), pp = { EN: sh.EN.pairs, NONEN: sh.NONEN.pairs }; pp.POOLED = [...pp.EN, ...pp.NONEN]; R.shuf[mode] = Object.fromEntries(Object.entries(pp).map(([s, ps]) => [s, { n: ps.length, auc: ps.length ? round(pAuc(ps, "ishare")) : null }])); }
  const c = R.cells.POOLED, u = c.used ?? c.full; R.cells.POOLED.shufDrop = round((u?.auc ?? 0) - (R.shuf.wordshuf.POOLED.auc ?? 0)); R.cells.POOLED.flipQ95 = flipQ95(PS.POOLED, "ishare", 1, 200, "Aflip");
  for (const [g, ds] of Object.entries(G)) R.natural[g] = natural(ds, ircClass); R.natural.POOLED = natural(docs, ircClass);
  const bk = (k) => (k < 50 ? "0-49" : k < 100 ? "50-99" : "100+"), tal = {};
  for (const d of docs) { const ix = streamIndex(d.T), seen = new Map(); d.T.forEach((m, k) => m.forEach((w, i) => { const kk = seen.get(w) ?? 0; seen.set(w, kk + 1); if (kk === 0 || ircClass(d, k, i, w) !== "P") return; const o = (tal[bk(k)] ??= { pos: 0, flagged: 0 }); o.pos++; if (ishare(ix, w, k) >= THETA) o.flagged++; })); }
  R.recallByDayPos = Object.fromEntries(Object.entries(tal).map(([k, o]) => [k, { ...o, recall: round(o.flagged / Math.max(1, o.pos)) }]));
  R.strat = {}; const SG = { ...G, POOLED: [...G.EN, ...G.NONEN] };
  for (const [g, ds] of Object.entries(SG)) { const sc = stratCell(ds, ircClass, KEY_A, { pooled: true, tag: "SA" + g, bars: { ...SBARS, minCov: 40 } }); delete sc._rows; R.strat[g] = sc; }
  R.headline = { strat: Object.fromEntries(Object.entries(R.strat).map(([g, x]) => [g, { covered: x.covered, nPos: x.nPos, clusters: x.clusters, auc: x.auc, ci: x.ci, shuf: x.shuf, shufDrop: x.shufDrop, beyond: x.beyond, checks: x.checks, holds: x.holds, failed: x.failed }])), coverage: R.coverage, POOLED: { variant: c.variant, auc: u?.auc, ci: u?.ci, n: u?.n, ctl: u?.ctl, holdsCore: c.holdsCore, reason: c.reason, shufDrop: R.cells.POOLED.shufDrop, beyond: u?.beyond }, EN: R.descr.EN, NONEN: R.descr.NONEN, natPOOLED: R.natural.POOLED.ALL, recallByDayPos: R.recallByDayPos };
  return R;
}
