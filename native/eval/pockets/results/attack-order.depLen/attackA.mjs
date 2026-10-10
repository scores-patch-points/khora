// attackA.mjs -- ATTACK A (size and tokenisation) on order.depLen.  For each cached PRESENT pocket, both halves (atlas halves(), same seeds), 10 within-unit null draws (the atlas protocol):
//   eqTok     : equal token count. Units of the half in sha256 order are added whole while cumulative tokens <= T (T = 20000); halves with < T tokens are skipped (n/a).
//   eqLenMean : equal tokens AND equal mean unit length. Only units >= 3 tokens; bang-bang control on the running mean: while mean >= M0 (=12) take the next SHORT unit (< M0), else the next LONG one (>= M0), both in
//               sha256 order, until T=20000 tokens or a pool is exhausted. "matched" = achieved mean within 10% of M0 and >= 0.9 T tokens.
//   band      : fixed length band: only units with 8 <= L <= 16, sha256 order, T = 12000 tokens (n/a when the half holds fewer).
//   chunk12   : re-chunk: each document's token stream cut into non-overlapping windows of 12 tokens (natural unit boundaries discarded; the partial last window dropped), then eqTok (T=20000, hash order of windows).
//   drop1pct  : alternative tokenisation: delete every token of the rarest 1% of types of the half (count ascending, ties by sha256 of the type string).
//   dropHapax : delete every token of types occurring once in the half.
//   alt       : alternative grain: word pockets -> first 4 code points of each token (merges inflections); code pockets -> split tokens at underscores; charbigram -> pairs of chunks concatenated; notation -> n/a.
// Output results/attack-order.depLen/A/<id>.json.   node attackA.mjs --pockets id1,id2 [--draws 10] [--out A] [--T 20000]
import fs from "node:fs";
import path from "node:path";
import { halves, depCell, statusOf, loadCached, TABLE, HERE, sha256, tokensOf, meanLen } from "./lib.mjs";
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const DRAWS = Number(opt("--draws", 10)), OUT = path.resolve(HERE, opt("--out", "A")), T = Number(opt("--T", 20000)), TB = 12000, M0 = 12;
const WANT = opt("--pockets", null)?.split(",") ?? TABLE().filter((r) => r.kind === "real" && (r.status === "P+" || r.status === "P-")).map((r) => r.id);
fs.mkdirSync(OUT, { recursive: true });
const rowOf = new Map(TABLE().map((r) => [r.id, r]));

const hashOrder = (n, tag) => { const k = Array.from({ length: n }, (_, i) => [sha256(`${tag}:${i}`), i]); k.sort((a, b) => (a[0] < b[0] ? -1 : 1)); return k.map((x) => x[1]); };
function eqTok(units, tag, cap) {
  const ord = hashOrder(units.length, tag), keep = []; let cum = 0;
  for (const i of ord) { if (cum >= cap) break; if (cum + units[i].length <= cap) { keep.push(i); cum += units[i].length; } }
  keep.sort((a, b) => a - b); return keep.map((i) => units[i]);
}
function eqLenMean(units, tag) {
  const ord = hashOrder(units.length, tag), S = [], Lg = [];
  for (const i of ord) { const L = units[i].length; if (L >= 3) (L < M0 ? S : Lg).push(i); }
  const keep = []; let cum = 0, n = 0, s = 0, g = 0;
  while (cum < T) {
    const wantShort = n > 0 && cum / n >= M0;
    let i = wantShort ? (s < S.length ? S[s++] : Lg[g++]) : (g < Lg.length ? Lg[g++] : S[s++]);   // fall back to the other pool when one is exhausted
    if (i === undefined) break;
    if (cum + units[i].length > T) continue;
    keep.push(i); cum += units[i].length; n++;
  }
  keep.sort((a, b) => a - b); return keep.map((i) => units[i]);
}
const band = (units, tag) => { const ix = []; units.forEach((u, i) => { if (u.length >= 8 && u.length <= 16) ix.push(i); }); const sub = ix.map((i) => units[i]); return eqTok(sub, tag, TB); };
function chunk12(units, docOf, tag) {
  const out = []; let d = -1, cur = [];
  const flush = () => { for (let i = 0; i + 12 <= cur.length; i += 12) out.push(cur.slice(i, i + 12)); cur = []; };
  for (let k = 0; k < units.length; k++) { if (docOf[k] !== d) { flush(); d = docOf[k]; } for (const w of units[k]) cur.push(w); }
  flush(); return eqTok(out, tag, T);
}
function typeCounts(units) { const c = new Map(); for (const u of units) for (const w of u) c.set(w, (c.get(w) || 0) + 1); return c; }
const dropTypes = (units, drop) => units.map((u) => u.filter((w) => !drop.has(w))).filter((u) => u.length);
function drop1pct(units) {
  const c = typeCounts(units), ts = [...c.keys()].map((w) => [c.get(w), sha256("drop1:" + w), w]);
  ts.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
  return dropTypes(units, new Set(ts.slice(0, Math.ceil(0.01 * ts.length)).map((x) => x[2])));
}
const dropHapax = (units) => { const c = typeCounts(units), d = new Set(); for (const [w, n] of c) if (n === 1) d.add(w); return dropTypes(units, d); };
function alt(units, grain) {
  if (grain === "word") return units.map((u) => u.map((w) => [...w].slice(0, 4).join("")));
  if (grain === "code") return units.map((u) => u.flatMap((w) => w.split("_").filter(Boolean)));
  if (grain === "charbigram") return units.map((u) => { const o = []; for (let i = 0; i < u.length; i += 2) o.push(u[i] + (u[i + 1] ?? "")); return o; });
  return null;
}

for (const id of WANT) {
  const file = path.join(OUT, `${id}.json`);
  if (fs.existsSync(file)) continue;
  const r = rowOf.get(id), p = loadCached(id), H = halves(p), res = { id, atlasStatus: r.status, grain: r.grain, register: r.register, group: r.group, atlas: { discover: { v: r.vD, z: r.zD }, confirm: { v: r.vC, z: r.zC } }, variants: {} };
  const variants = {
    eqTok: (v, w) => (tokensOf(v.units) >= T ? eqTok(v.units, `A:eqTok:${id}:${w}`, T) : null),
    eqLenMean: (v, w) => eqLenMean(v.units, `A:eqLen:${id}:${w}`),
    band: (v, w) => { const s = band(v.units, `A:band:${id}:${w}`); return tokensOf(s) >= 0.9 * TB ? s : null; },
    chunk12: (v, w) => { const s = chunk12(v.units, v.docOf, `A:chunk:${id}:${w}`); return tokensOf(s) >= 0.9 * T ? s : null; },
    drop1pct: (v) => drop1pct(v.units),
    dropHapax: (v) => dropHapax(v.units),
    alt: (v) => alt(v.units, r.grain),
  };
  for (const [name, mk] of Object.entries(variants)) {
    const cells = {};
    for (const w of ["discover", "confirm"]) {
      const view = H[w], units = mk(view, w);
      if (!units || units.length < 10) { cells[w] = null; continue; }
      const c = depCell({ id, which: w, units, docOf: units.map(() => 0) }, DRAWS, id, w);
      cells[w] = { ...c, tokens: tokensOf(units), units: units.length, meanLen: meanLen(units), meanLen3: tokensOf(units.filter((u) => u.length >= 3)) / Math.max(1, units.filter((u) => u.length >= 3).length) };
    }
    res.variants[name] = { discover: cells.discover, confirm: cells.confirm, status: cells.discover && cells.confirm ? statusOf(cells.discover, cells.confirm) : "n/a" };
  }
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(`${id} ${r.status} ` + Object.entries(res.variants).map(([k, v]) => `${k}:${v.status}`).join(" "));
}
