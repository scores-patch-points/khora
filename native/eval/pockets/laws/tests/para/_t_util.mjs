// tests/para/_t_util.mjs — shared helpers of the para tests: atlas-identical evaluation of a view (observed + 10 draws per null kind), test-only tokenisers, test worlds.
import fs from "node:fs";
import { nullView, seedOf, rngOf, halves } from "../../../lib/pocket.mjs";
import * as para from "../../para.mjs";

export const cpu = (f) => { const t = process.cpuUsage(); const r = f(); const c = process.cpuUsage(t); return [r, (c.user + c.system) / 1e6]; };
export const tokensOf = (view) => view.units.reduce((a, u) => a + u.length, 0);

/** Same computation as run-atlas.mjs for one view: {stat: {v, nullMean, nullSd, z}} plus cpu seconds (observed call, one null draw per kind). */
export function evalView(view, pid, draws = 10) {
  const [obs, tObs] = cpu(() => para.compute(view)), kinds = [...new Set(para.STATS.map((s) => s.null))], D = {}, tNull = {};
  for (const kind of kinds) { D[kind] = []; let tt = 0; for (let k = 0; k < draws; k++) { const nv = nullView(view, kind, seedOf(pid, view.which, para.FAMILY, kind, k)); const [r, t] = cpu(() => para.compute(nv)); tt += t; D[kind].push(r); } tNull[kind] = tt / draws; }
  const out = {};
  for (const s of para.STATS) {
    const xs = D[s.null].map((d) => d[s.id]).filter((x) => Number.isFinite(x)), v = obs[s.id], n = xs.length;
    const m = n ? xs.reduce((a, b) => a + b, 0) / n : NaN, sd = n > 2 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : NaN;
    out[s.id] = { v, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n };
  }
  return { stats: out, cpuObs: tObs, cpuNull: tNull, tokens: tokensOf(view), units: view.units.length };
}
export const row = (r) => para.STATS.map((s) => { const c = r.stats[s.id]; return `${s.id}:${c.v === null ? "null" : c.v.toPrecision(3)}(z ${c.z === null ? "null" : c.z.toFixed(1)})`; }).join(" ");

const WORD = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;
export const words = (s) => (s.normalize("NFC").toLowerCase().match(WORD) || []).map((w) => w.replace(/’/g, "'"));
/** test-only sentence tokeniser for Gutenberg prose: units = sentences, docs = blocks of 100 sentences. */
export function proseView(file, which = "all", maxTokens = 1e9) {
  let t = fs.readFileSync(file, "utf8"); const a = t.indexOf("*** START"), b = t.indexOf("*** END");
  if (a >= 0) t = t.slice(t.indexOf("\n", a) + 1, b > a ? b : undefined);
  const units = [], docOf = []; let n = 0;
  for (const sent of t.replace(/\r/g, "").split(/(?<=[.!?])["'”’)]*\s+/)) { const w = words(sent); if (!w.length) continue; if (n + w.length > maxTokens) break; n += w.length; units.push(w); docOf.push(Math.floor((units.length - 1) / 100)); }
  return { id: "real-prose", which, units, docOf };
}
/** test-only: English lines of the Quran translation, units = verses, docs = suras. */
export function quranView(dir, which = "all") {
  const units = [], docOf = []; let d = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt")).sort()) {
    const L = fs.readFileSync(`${dir}/${f}`, "utf8").split("\n"); let eng = 0, any = false;
    for (let i = 0; i < L.length; i++) { if (/^\[\d+:\d+\]/.test(L[i])) eng = 0; else if (/^ {4}\S/.test(L[i]) && ++eng === 2) { const w = words(L[i]); if (w.length) { units.push(w); docOf.push(d); any = true; } } }
    if (any) d++;
  }
  return { id: "real-quran-en", which, units, docOf };
}
/** test-only: WLC Hebrew verses ("Gen.1.1 word word ..."), units = verses, docs = chapters. */
export function hebrewView(dir, books, which = "all") {
  const units = [], docOf = [], ch = new Map();
  for (const b of books) for (const line of fs.readFileSync(`${dir}/${b}.txt`, "utf8").split("\n")) { const m = line.match(/^(\w+)\.(\d+)\.(\d+) (.*)$/); if (!m) continue; const w = words(m[4]); if (!w.length) continue; const key = `${m[1]}.${m[2]}`; if (!ch.has(key)) ch.set(key, ch.size); units.push(w); docOf.push(ch.get(key)); }
  return { id: "real-hebrew", which, units, docOf };
}
/** test-only: source code, units = lines, tokens = lowercase runs of letters (identifiers split at digits/underscore), docs = blocks of 100 non-empty lines; files in sorted order until maxTokens. */
export function codeView(dir, maxTokens, which = "all") {
  const units = [], docOf = []; let n = 0;
  for (const f of fs.readdirSync(dir).filter((x) => /\.(c|cpp|h|py|js|ts|rs|go)$/.test(x)).sort()) for (const line of fs.readFileSync(`${dir}/${f}`, "utf8").split("\n")) { const w = words(line); if (!w.length) continue; if (n + w.length > maxTokens) return { id: "real-code", which, units, docOf }; n += w.length; units.push(w); docOf.push(Math.floor((units.length - 1) / 100)); }
  return { id: "real-code", which, units, docOf };
}
export const sliceDocs = (v, nd) => { let k = 0; while (k < v.docOf.length && v.docOf[k] < nd) k++; return { ...v, units: v.units.slice(0, k), docOf: v.docOf.slice(0, k) }; };
export const sliceTokens = (v, nt) => { let n = 0, k = 0; while (k < v.units.length && n + v.units[k].length <= nt) n += v.units[k++].length; return { ...v, units: v.units.slice(0, k), docOf: v.docOf.slice(0, k) }; };
export { halves, rngOf };
