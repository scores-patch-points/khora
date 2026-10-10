// posthoc.mjs — ADVERSARY checks of the sibling replication of para.suffixCopy (plan A1-A6 in the frozen header of confirm.mjs, plus A8-A9 ADDED AFTER the 10-draw results were seen; they are labelled and cannot change the verdict).
//   node posthoc.mjs [--draws 100] [--out posthoc.json]     Same halves as run-atlas.mjs (halves()), unit-order null (nullView) with seeds seedOf(id, which, "posthoc-sfx", "unit-order", k) (NOT the atlas draws).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { halves, nullView, seedOf } from "../../lib/pocket.mjs";
import { headerIntact, SIBLING_LOADERS } from "./confirm.mjs";
import { status, load as loadRows } from "./summarise.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), LOADERS = path.resolve(HERE, "../../loaders");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const DRAWS = Number(opt("--draws", 100)), OUT = path.resolve(HERE, opt("--out", "posthoc.json"));

const same = (a, b) => a.length === b.length && a.every((w, i) => w === b[i]);
/** variants over adjacent same-document pairs: base (both len >= 2, last 2 tokens equal), noDup (identical-unit pairs removed from numerator and denominator), long6 (both len >= 6),
 *  last1 (last token equal, base pairs), cond (P(second-last equal | last equal), base pairs). Returns {name: {events, pairs, rate}}. */
export function variants(view) {
  const V = { base: [0, 0], noDup: [0, 0], long6: [0, 0], last1: [0, 0], cond: [0, 0] };
  for (let u = 1; u < view.units.length; u++) {
    if (view.docOf[u] !== view.docOf[u - 1]) continue;
    const a = view.units[u - 1], b = view.units[u]; if (a.length < 2 || b.length < 2) continue;
    const l1 = a[a.length - 1] === b[b.length - 1], l2 = l1 && a[a.length - 2] === b[b.length - 2], dup = same(a, b);
    V.base[1]++; if (l2) V.base[0]++;
    V.last1[1]++; if (l1) V.last1[0]++;
    if (l1) { V.cond[1]++; if (l2) V.cond[0]++; }
    if (!dup) { V.noDup[1]++; if (l2) V.noDup[0]++; }
    if (a.length >= 6 && b.length >= 6) { V.long6[1]++; if (l2) V.long6[0]++; }
  }
  return Object.fromEntries(Object.entries(V).map(([k, [e, n]]) => [k, { events: e, pairs: n, rate: n >= 50 ? e / n : null }]));
}
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** Poisson upper tail P(X >= k | lambda): log of the first term plus a normalised upward series (no 1 - cdf cancellation); floored at 1e-300 (reported as such). (A8) */
export function poissonTail(k, lam) {
  if (k <= 0) return 1; if (!(lam > 0)) return 1e-300;
  let lf = 0; for (let i = 2; i <= k; i++) lf += Math.log(i);               // log k!
  const lt = -lam + k * Math.log(lam) - lf; let S = 1, r = 1;
  for (let i = k; i < k + 5000; i++) { r *= lam / (i + 1); S += r; if (r < 1e-17 * S && i + 1 > lam) break; }
  return Math.min(1, Math.max(1e-300, Math.exp(lt + Math.log(S))));
}
export function normQuantileUpper(p) { // z with P(Z >= z) = p (Abramowitz-Stegun 26.2.23 rational approximation, absolute error < 4.5e-4)
  if (p <= 0) return Infinity; if (p >= 1) return -Infinity;
  const q = p < 0.5 ? p : 1 - p, t = Math.sqrt(-2 * Math.log(q)), c = [2.515517, 0.802853, 0.010328], d = [1.432788, 0.189269, 0.001308];
  const z = t - (c[0] + c[1] * t + c[2] * t * t) / (1 + d[0] * t + d[1] * t * t + d[2] * t * t * t); return p < 0.5 ? z : -z;
}
const rank = (xs) => { const ix = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; for (let k = i; k <= j; k++) r[ix[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
export function spearman(x, y) { const a = rank(x), b = rank(y), n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (a[i] - ma) * (b[i] - mb); sxx += (a[i] - ma) ** 2; syy += (b[i] - mb) ** 2; } return sxy / Math.sqrt(sxx * syy); }

const KEYS = ["base", "noDup", "long6", "last1", "cond"];
function perPocket(p) {
  const H = halves(p), out = { id: p.id, tokens: p.units.reduce((a, u) => a + u.length, 0), halves: {} };
  for (const which of ["discover", "confirm"]) {
    const view = H[which], obs = variants(view), draws = [];
    for (let k = 0; k < DRAWS; k++) draws.push(variants(nullView(view, "unit-order", seedOf(p.id, which, "posthoc-sfx", "unit-order", k))));
    const cells = {};
    for (const key of KEYS) {
      const xs = draws.map((d) => d[key].rate).filter((x) => Number.isFinite(x)), ev = draws.map((d) => d[key].events), lam = ev.reduce((a, b) => a + b, 0) / ev.length;
      const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN }, v = obs[key].rate, pt = poissonTail(obs[key].events, lam);
      cells[key] = { events: obs[key].events, pairs: obs[key].pairs, v, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null,
        nullEventsMean: lam, poissonP: pt, poissonZ: key === "cond" ? null : normQuantileUpper(pt) };
    }
    out.halves[which] = cells;
  }
  return out;
}
async function main() {
  const h = headerIntact(); if (!h.ok) { console.error("PREREG HEADER CHANGED; refusing"); process.exit(2); }
  const res = { headerSha256: h.got, draws: DRAWS, note: "A1 noDup, A2 long6, A3 last1/cond: planned in the frozen header. A8 (Poisson tail of the event count given the 100-draw null event mean) and A9 (same-stem atlas dev+test v) were ADDED after the 10-draw z were seen, because laws/para.mjs warns that sparse nulls make the 10-draw z unreliable.", pockets: {} };
  for (const f of SIBLING_LOADERS) {
    const mod = await import(pathToFileURL(path.join(LOADERS, f)).href);
    for (const p of await mod.load()) { res.pockets[p.id] = perPocket(p); const c = res.pockets[p.id].halves; console.error(`${p.id}: base ${c.discover.base.events}/${c.confirm.base.events} events, noDup z ${c.discover.noDup.z?.toFixed(1)}/${c.confirm.noDup.z?.toFixed(1)}`); }
  }
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
