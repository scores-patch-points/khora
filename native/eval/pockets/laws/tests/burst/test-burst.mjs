// laws/tests/burst/test-burst.mjs — instrument test of the "burst" family on slices (<= ~50k tokens, whole documents) of planted pockets and of one real book.
//   node test-burst.mjs <out.json> <pocketId>[,<pocketId>...]      ids from loaders/planted.mjs (pl-*) or loaders/books.mjs (bk-*)
// Per slice: observed value, null mean/sd from NDRAW draws of each statistic's own null kind, z, and CPU seconds per compute() call.
import fs from "node:fs";
import { halves, nullView, seedOf, tokenCount } from "../../../lib/pocket.mjs";
import { compute, STATS, FAMILY } from "../../burst.mjs";
const [out, idList] = process.argv.slice(2), NDRAW = Number(process.env.NDRAW || 10), CAP = Number(process.env.CAP || 50000);
const ids = idList.split(",");
const sliceDocs = (view, from, cap, tag) => { // whole documents, starting at document index `from`, until cap tokens
  const units = [], docOf = []; let tok = 0, d0 = null;
  for (let k = 0; k < view.units.length; k++) {
    const d = view.docOf[k]; if (d < from) continue;
    if (d0 !== d && tok >= cap) break; d0 = d;
    units.push(view.units[k]); docOf.push(d); tok += view.units[k].length;
  }
  return { id: view.id, which: tag, units, docOf };
};
const cpu = (f) => { const c = process.cpuUsage(), r = f(), e = process.cpuUsage(c); return [r, (e.user + e.system) / 1e6]; };
const results = [];
for (const id of ids) {
  const loader = id.startsWith("pl-") ? await import("../../../loaders/planted.mjs") : await import("../../../loaders/books.mjs");
  const [p] = await loader.load([id]);
  const slices = [];
  if (id.startsWith("pl-")) { const nd = new Set(p.docOf).size; const v = { id, units: p.units, docOf: p.docOf }; slices.push(sliceDocs(v, 0, CAP, "A"), sliceDocs(v, Math.floor(nd / 2), CAP, "B")); }
  else { const H = halves(p); slices.push(sliceDocs(H.discover, 0, CAP, "discover"), sliceDocs(H.confirm, 0, CAP, "confirm")); }
  for (const sl of slices) {
    const [obs, secObs] = cpu(() => compute(sl)), rec = { pocket: id, slice: sl.which, tokens: tokenCount(sl.units), units: sl.units.length, docs: new Set(sl.docOf).size, cpuSecObs: +secObs.toFixed(3), stats: {} };
    const draws = {}; let secNull = 0, nCalls = 0;
    for (const kind of [...new Set(STATS.map((s) => s.null))]) { draws[kind] = []; for (let k = 0; k < NDRAW; k++) { const nv = nullView(sl, kind, seedOf(id, sl.which, FAMILY, kind, k)); const [r, s] = cpu(() => compute(nv)); draws[kind].push(r); secNull += s; nCalls++; } }
    rec.cpuSecPerNullCall = +(secNull / nCalls).toFixed(3);
    for (const s of STATS) {
      const xs = draws[s.null].map((d) => d[s.id]).filter(Number.isFinite), n = xs.length, m = xs.reduce((a, b) => a + b, 0) / (n || 1), sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)), v = obs[s.id];
      rec.stats[s.id] = { v, nullMean: n ? m : null, nullSd: n ? sd : null, z: Number.isFinite(v) && sd > 0 && n >= 3 ? (v - m) / sd : null, n };
    }
    results.push(rec); fs.writeFileSync(out, JSON.stringify(results, null, 1));
    console.error(`${id}/${sl.which}: ${rec.tokens} tokens, obs ${rec.cpuSecObs}s cpu, null ${rec.cpuSecPerNullCall}s cpu/call`);
  }
}
