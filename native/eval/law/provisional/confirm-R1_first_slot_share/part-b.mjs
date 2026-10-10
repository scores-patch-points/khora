// part-b.mjs — PART B: independent reproduction on the scoper's 36 confirm days (dry: its 42 discovery days). Not untouched data; cannot yield CONFIRMED. See the header of confirm.mjs.
import fs from "node:fs";
import { loadIrcDay, streamIndex, ishare, rngOf, shuffleIn, round, pAuc, flipQ95, SEED } from "./lib.mjs";
import { matchPairs, ircClass, transform, KEY_EXACT } from "./pairs.mjs";
import { evalCell, natural } from "./cells.mjs";
import { buildIndex, scoresAt } from "../chat-scope/index.mjs";
const SPLIT = JSON.parse(fs.readFileSync(new URL("../chat-scope/split.json", import.meta.url), "utf8"));
const BARS = { minN: 60, auc: 0.7, lower: 0.65, clusterMin: 1e9 };
const era = (y) => (y <= 2007 ? "2004-07" : y <= 2011 ? "2008-11" : "2012-15");
export async function run({ dry }) {
  const keys = (dry ? SPLIT.discovery : SPLIT.confirm).map((d) => d.key), docs = keys.map(loadIrcDay), by = new Map(docs.map((d) => [d.key, d]));
  const R = { days: keys, cells: {}, shuf: {}, checks: {}, natural: {}, perDay: [] };
  const real = matchPairs(docs, ircClass, { max: 400, keyFn: KEY_EXACT, mode: "real" }), P = real.pairs;
  for (const p of P) { const d = by.get(p.stream); p.channel = d.channel; p.lang = d.lang; p.era = era(d.year); }
  const SC = { ALL: () => true, EN: (p) => p.lang === "en", NONEN: (p) => p.lang !== "en", DE: (p) => p.channel === "ubuntu-de", ES: (p) => p.channel === "ubuntu-es", IT: (p) => p.channel === "ubuntu-it", ubuntu: (p) => p.channel === "ubuntu", kubuntu: (p) => p.channel === "kubuntu", xubuntu: (p) => p.channel === "xubuntu", "ubuntu-server": (p) => p.channel === "ubuntu-server", "EN_2004-07": (p) => p.lang === "en" && p.era === "2004-07", "EN_2008-11": (p) => p.lang === "en" && p.era === "2008-11", "EN_2012-15": (p) => p.lang === "en" && p.era === "2012-15" };
  const FA = { ALL: () => true, INIT: (p) => p.pos.init, NONINIT: (p) => !p.pos.init };
  for (const [sn, sf] of Object.entries(SC)) for (const [fn, ff] of Object.entries(FA)) { const ps = P.filter((p) => sf(p) && ff(p)); if (ps.length >= 10) R.cells[`${sn}|${fn}`] = evalCell(ps, BARS, `B${sn}${fn}`); }
  for (const mode of ["wordshuf", "msgshuf"]) {
    const sh = matchPairs(docs.map((d) => transform(d, mode)), ircClass, { max: 400, keyFn: KEY_EXACT, mode }).pairs; for (const p of sh) p.lang = by.get(p.stream).lang;
    R.shuf[mode] = Object.fromEntries(["EN", "NONEN"].map((s) => { const ps = sh.filter(SC[s]); return [s, { n: ps.length, auc: round(pAuc(ps, "ishare")) }]; }));
  }
  for (const s of ["EN", "NONEN"]) { const c = R.cells[`${s}|ALL`], u = c?.used; R.cells[`${s}|ALL`].flipQ95 = flipQ95(P.filter(SC[s]), "ishare", 1, 200, "Bflip" + s); R.cells[`${s}|ALL`].shufDrop = round((u?.auc ?? 0) - R.shuf.wordshuf[s].auc); R.cells[`${s}|ALL`].msgshufDelta = round(R.shuf.msgshuf[s].auc - (u?.auc ?? 0)); }
  for (const [g, f] of [["EN", (d) => d.lang === "en"], ["NONEN", (d) => d.lang !== "en"]]) R.natural[g] = natural(docs.filter(f), ircClass);
  for (const d of docs) { const ps = P.filter((p) => p.stream === d.key); R.perDay.push({ key: d.key, msgs: d.T.length, n: ps.length, auc: ps.length >= 20 ? round(pAuc(ps, "ishare")) : null }); }
  const rs = (n, ...ps) => { const r = rngOf(SEED, "checks", ...ps); return Array.from({ length: n }, () => r()); };
  const big = docs.filter((d) => d.lang === "en" && d.T.length >= 1500).slice(0, 3);
  const caus = { n: 0, bad: 0 }, cross = { n: 0, bad: 0 };
  for (const d of big) {
    const ix = streamIndex(d.T), ix1 = buildIndex(d.T), occ = []; const seen = new Map();
    d.T.forEach((m, k) => m.forEach((w, i) => { const kk = seen.get(w) ?? 0; seen.set(w, kk + 1); if (kk >= 1) occ.push([k, i, w]); }));
    const r1 = rs(100, "causal", d.key).map((x) => occ[Math.floor(x * occ.length)]), r2 = rs(150, "cross", d.key).map((x) => occ[Math.floor(x * occ.length)]);
    for (const [k, , w] of r1) { const full = ishare(ix, w, k), tr = ishare(streamIndex(d.T.slice(0, k + 1)), w, k); caus.n++; if (full !== tr) caus.bad++; }
    for (const [k, i, w] of r2) { const a = ishare(ix, w, k), b = scoresAt(ix1, k, i, w).ISHARE_Cinf; cross.n++; if (Math.abs(a - b) > 1e-12) cross.bad++; }
  }
  R.checks = { causal: caus, cross, days: big.map((d) => d.key) };
  const en = R.cells["EN|ALL"], ne = R.cells["NONEN|ALL"];
  R.headline = { EN_auc: en?.used?.auc, EN_ci: en?.used?.ci, EN_variant: en?.variant, EN_ctl: en?.used?.ctl, EN_shufDrop: en?.shufDrop, EN_beyond: en?.used?.beyond, NONEN_auc: ne?.used?.auc, NONEN_n: ne?.used?.n, checks: R.checks, wordshuf: R.shuf.wordshuf, msgshuf: R.shuf.msgshuf, nat_EN: R.natural.EN?.ALL };
  return R;
}
