// laws/tests/comp/_t_util.mjs — helpers of the comp test: atlas-identical z (same seeds scheme as run-atlas, 10 draws per null kind), CPU timing, slicing, real-text loading, controls.
import { nullView, seedOf, halves, rngOf } from "../../../lib/pocket.mjs";
import { readText, stripFront, stripPG } from "../../../loaders/_bkcore.mjs";
import { splitSentences, toUnits, makeDocs } from "../../../loaders/_bkseg.mjs";
import { makeLen } from "../../../loaders/_planted-core.mjs";
import * as fam from "../../comp.mjs";

export const cpuMs = (fn) => { const c0 = process.cpuUsage(), w0 = performance.now(), r = fn(), c1 = process.cpuUsage(c0); return { r, cpu: (c1.user + c1.system) / 1000, wall: performance.now() - w0 }; };
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
export const round = (x, d = 4) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
export const tokensOf = (view) => view.units.reduce((a, u) => a + u.length, 0);

/** exactly what run-atlas.mjs does for one half: observed value, `draws` null draws per null kind, z = (v - nullMean) / nullSd (null when sd = 0) */
export function atlasCells(view, draws = 10, tag = "comp-test") {
  const obs = fam.compute(view), kinds = [...new Set(fam.STATS.map((s) => s.null))], dr = {}, cell = {};
  for (const kind of kinds) { dr[kind] = []; for (let k = 0; k < draws; k++) dr[kind].push(fam.compute(nullView(view, kind, seedOf(tag, view.id, view.which, fam.FAMILY, kind, k)))); }
  for (const s of fam.STATS) {
    const xs = dr[s.null].map((d) => d[s.id]).filter(Number.isFinite), v = obs[s.id], { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
    cell[s.id] = { v: round(v), nullMean: round(m), nullSd: round(sd, 5), z: Number.isFinite(v) && sd > 0 ? round((v - m) / sd, 2) : null, nDraws: xs.length };
  }
  return cell;
}
/** prefix of whole documents with <= cap tokens (at least one document) */
export function capView(view, cap) {
  const units = [], docOf = []; let t = 0, k = 0;
  while (k < view.units.length) {
    let e = k; while (e < view.units.length && view.docOf[e] === view.docOf[k]) e++;
    let n = 0; for (let j = k; j < e; j++) n += view.units[j].length;
    if (units.length && t + n > cap) break;
    for (let j = k; j < e; j++) { units.push(view.units[j]); docOf.push(view.docOf[j]); } t += n; k = e;
  }
  return { ...view, units, docOf };
}
export const half = (pocket, which, cap) => { const h = halves(pocket)[which]; return cap ? capView(h, cap) : h; };
/** a real book from ethos as {units, docOf} (same sentence/tokeniser machinery as the bk loaders) */
export function bookView(rel, id, capTokens) {
  let { text } = stripFront(readText(rel)); text = stripPG(text);
  let units = toUnits(splitSentences(text, { paraBreak: true })); const { docOf } = makeDocs(units);
  if (capTokens) { let t = 0, e = 0; while (e < units.length && t < capTokens) t += units[e++].length; units = units.slice(0, e); docOf.length = e; }
  return { id, which: "discover", units, docOf };
}
/** same tokens, regrouped into units of fixed length L (documents ~1000 tokens): the unit-length control */
export function regroup(view, L) {
  const flat = view.units.flat(), units = [], docOf = []; let d = 0, t = 0;
  for (let i = 0; i + L <= flat.length; i += L) { units.push(flat.slice(i, i + L)); docOf.push(d); t += L; if (t >= 1000) { d++; t = 0; } }
  return { ...view, units, docOf };
}
/** same tokens, cut into units of iid lognormal lengths (the D1 law of the planted worlds) unrelated to the text: the NEGATIVE control for every unit-level statistic */
export function regroupRandom(view, tag) {
  const flat = view.units.flat(), D1 = makeLen("D1"), rnd = rngOf(seedOf("comp-test", "cut", tag)), units = [], docOf = []; let i = 0, d = 0, t = 0;
  while (i < flat.length) { const L = Math.min(D1(rnd), flat.length - i); units.push(flat.slice(i, i + L)); docOf.push(d); i += L; t += L; if (t >= 1000) { d++; t = 0; } }
  return { ...view, units, docOf };
}
/** map every character of every token through f (script-invariance test) */
export const mapChars = (view, f) => ({ ...view, units: view.units.map((u) => u.map((w) => [...w].map(f).join(""))) });
