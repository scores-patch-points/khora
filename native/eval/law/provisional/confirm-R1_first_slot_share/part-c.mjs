// part-c.mjs — PART C: cross-register on UD test.conllu (never R1-scored). dry = afr and wol DEV only (debugging). Also used by part-d.mjs (dev replication) via runStems. See the header of confirm.mjs.
import fs from "node:fs";
import { loadUd, UD_ROOT, round, pAuc } from "./lib.mjs";
import { matchPairs, udClass, transform, KEY_UD as KEY_EXACT } from "./pairs.mjs";
import { evalCell } from "./cells.mjs";
import { stratCell, SBARS } from "./stratcell.mjs";
import { summarize } from "./strat.mjs";
export const BARS_C = { minN: 60, auc: 0.7, lower: 0.65, clusterMin: 8 };
const minLenOf = (stem) => (["cmn", "jpn", "lzh"].includes(stem) ? 2 : 3);
export const allStems = (split = "test") => fs.readdirSync(UD_ROOT).filter((s) => s !== "cmn-hans" && fs.existsSync(`${UD_ROOT}/${s}/${split}.conllu`)).sort();
function streamsOf(stem, split) {
  const d = loadUd(stem, split); if (stem !== "eng") return [d];
  const gs = [...new Set(d.genre)], out = [];
  for (const g of gs) { const ix = d.genre.map((x, k) => (x === g ? k : -1)).filter((k) => k >= 0), pick = (a) => ix.map((k) => a[k]); out.push({ key: `eng:${g}`, stem: "eng", T: pick(d.T), G: pick(d.G), D: pick(d.D), genre: pick(d.genre), sid: pick(d.sid), docid: pick(d.docid) }); }
  return out;
}
const aucOf = (ps) => (ps.length ? round(pAuc(ps, "ishare")) : null);
export function cellOf(streams, stem, label, open, split, VOC) {
  const cls = udClass(minLenOf(stem), open), P = [], SH = [];
  for (const s of streams) { P.push(...matchPairs([s], cls, { max: 600, keyFn: KEY_EXACT, mode: "real" }).pairs); SH.push(...matchPairs([transform(s, "wordshuf")], cls, { max: 600, keyFn: KEY_EXACT, mode: "wordshuf" }).pairs); }
  const c = evalCell(P, BARS_C, `C${stem}${label}${open}`), u = c.used, shufAuc = aucOf(SH), b = u?.beyond?.CNT_C128;
  const shufDrop = u ? round(u.auc - (shufAuc ?? 0.5)) : null, beyondOk = !!b && b.auc != null && b.auc >= 0.6;
  const holdsMatched = !!(c.holdsCore && shufDrop >= 0.1 && beyondOk);
  const sc = stratCell(streams, cls, KEY_EXACT, { pooled: false, tag: `SC${stem}${label}${open}`, bars: SBARS }), rows = sc._rows; delete sc._rows;
  if (VOC && !open) for (const r of rows) VOC.push({ ...r, stem });
  const holds = sc.holds;
  return { stem, stream: label, neg: open ? "OPEN" : "ALLLEX", split, nPairs: P.length, variant: c.variant, auc: u?.auc, ci: u?.ci, clusterCi: u?.clusterCi, clusters: u?.clusters, n: u?.n, ctl: u?.ctl, lower: c.lower, nullQ95: u?.nullQ95, beyond: b, shufAuc, shufN: SH.length, shufDrop, holdsCore: c.holdsCore, holdsMatched, strat: sc, holds, reason: sc.holds ? "" : "strat failed: " + sc.failed.join(","), fullAuc: c.full?.auc, fullN: c.full?.n, fullCtl: c.full?.ctl, init: (() => { const q = P.filter((p) => p.pos.init); return { n: q.length, auc: aucOf(q) }; })(), noninit: (() => { const q = P.filter((p) => !p.pos.init); return { n: q.length, auc: aucOf(q) }; })() };
}
export async function runStems(stems, split, tag) {
  fs.mkdirSync(new URL(`./results/c-${tag}/`, import.meta.url), { recursive: true });
  const cells = [], VOC = [], t0 = Date.now();
  for (const stem of stems) {
    const ss = streamsOf(stem, split), mine = [];
    if (stem === "eng") for (const s of ss) for (const open of [false, true]) mine.push(cellOf([s], stem, s.key, open, split, null));
    for (const open of [false, true]) mine.push(cellOf(ss, stem, stem === "eng" ? "eng:ALL" : stem, open, split, VOC));
    cells.push(...mine); fs.writeFileSync(new URL(`./results/c-${tag}/${stem}.json`, import.meta.url), JSON.stringify(mine));
    console.error(`${stem} ${((Date.now() - t0) / 1000).toFixed(1)}s ${mine.map((m) => `${m.stream}/${m.neg}:${m.auc ?? m.variant}`).join(" ")}`);
  }
  return { cells, VOC };
}
export function vocScope(VOC) {
  const f = (rows, tag) => (rows.length >= 10 ? (({ covered, clusters, auc, ci }) => ({ covered, clusters, auc: auc.ishare, ci }))(summarize(rows, rows.length, null, "voc" + tag, 300)) : { covered: rows.length });
  const voc = VOC.filter((r) => r.dep?.startsWith("vocative")), non = VOC.filter((r) => !r.dep?.startsWith("vocative"));
  return { vocative: { ...f(voc, "v"), stems: new Set(voc.map((r) => r.stem)).size, init: f(voc.filter((r) => r.init), "vi") }, nonVocativePROPN: f(non, "n"), allPROPN: f(VOC, "a"), note: "stratified estimator, rows pooled across stems; a PROPN positive weighs 1" };
}
export async function run({ dry }) {
  const stems = dry ? ["afr", "wol"] : allStems("test"), { cells, VOC } = await runStems(stems, dry ? "dev" : "test", dry ? "dry" : "test");
  const prim = cells.filter((c) => c.neg === "ALLLEX" && (c.stream === c.stem || c.stream === "eng:ALL")), valid = prim.filter((c) => c.strat.auc.ishare != null && c.strat.covered >= 60 && c.strat.ctlOk);
  const aucs = valid.map((c) => c.strat.auc.ishare).sort((a, b) => a - b), med = aucs.length ? aucs[Math.floor(aucs.length / 2)] : null;
  const R = { stems, cells, vocative: vocScope(VOC), summary: { stems: prim.length, valid: valid.length, medianAuc: med, holds: cells.filter((c) => c.holds).map((c) => `${c.stream}/${c.neg}`), holdsMatchedToo: cells.filter((c) => c.holds && c.holdsMatched).map((c) => `${c.stream}/${c.neg}`), n_ge_070: valid.filter((c) => c.strat.auc.ishare >= 0.7).length, n_lt_060: valid.filter((c) => c.strat.auc.ishare < 0.6).length } };
  R.headline = R.summary; return R;
}
