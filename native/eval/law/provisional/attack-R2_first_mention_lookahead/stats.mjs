// stats.mjs — attack-R2: paired AUC (pair wins, ties 0.5), cluster bootstraps (pair / day / positive-form / negative-form), sign-flip null, threshold tally, rival-conditioned AUC, controls.
import { rngOf, rnd4 } from "./common.mjs";
export const BAND = [0.45, 0.55];
const q = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))] : null; };
export const win = (p, c) => { const d = p.pos[c] - p.neg[c]; return d > 0 ? 1 : d === 0 ? 0.5 : 0; };
export const auc = (ps, c) => (ps.length ? ps.reduce((s, p) => s + win(p, c), 0) / ps.length : NaN);
export const wtl = (ps, c) => { let w = 0, t = 0, l = 0; for (const p of ps) { const d = p.pos[c] - p.neg[c]; d > 0 ? w++ : d === 0 ? t++ : l++; } const n = ps.length || 1; return { win: rnd4(w / n), tie: rnd4(t / n), lose: rnd4(l / n) }; };
/** cluster bootstrap CI of the paired AUC; keyFn(pair) = cluster id (default: each pair its own cluster). */
export function boot(ps, c, keyFn = null, B = 600, seed = "b") {
  if (ps.length < 10) return [null, null]; const by = new Map(); ps.forEach((p, i) => { const k = keyFn ? keyFn(p) : i; const g = by.get(k) ?? by.set(k, { s: 0, n: 0 }).get(k); g.s += win(p, c); g.n++; });
  const G = [...by.values()]; if (G.length < 4) return [null, null]; const r = rngOf("attackR2-boot", seed, c), v = [];
  for (let b = 0; b < B; b++) { let s = 0, n = 0; for (let k = 0; k < G.length; k++) { const g = G[Math.floor(r() * G.length)]; s += g.s; n += g.n; } v.push(s / n); }
  return [rnd4(q(v, 0.025)), rnd4(q(v, 0.975))];
}
export const CL = { pair: null, day: (p) => p.day, posForm: (p) => p.pos.w, negForm: (p) => p.neg.w, dayForm: (p) => p.day + "|" + p.pos.w };
export function summ(ps, c = "INIT_Tinf", B = 600, tag = "") {
  const o = { n: ps.length, days: new Set(ps.map((p) => p.day)).size, posForms: new Set(ps.map((p) => p.pos.w)).size };
  if (!ps.length) return o; o.auc = rnd4(auc(ps, c)); o.wtl = wtl(ps, c);
  o.ci = { pair: boot(ps, c, CL.pair, B, "p" + tag), day: boot(ps, c, CL.day, B, "d" + tag), posForm: boot(ps, c, CL.posForm, B, "f" + tag), negForm: boot(ps, c, CL.negForm, B, "n" + tag) };
  o.lowerMin = o.ci.pair[0] === null ? null : Math.min(...Object.values(o.ci).map((x) => x[0]).filter((x) => x !== null)); return o;
}
export const nullQ95 = (n) => rnd4(0.5 + (1.645 * 0.5) / Math.sqrt(Math.max(1, n)));
export function flipDist(ps, c, B = 1000, seed = "flip") { const r = rngOf("attackR2-flip", seed, c), d = ps.map((p) => win(p, c)), v = []; for (let b = 0; b < B; b++) { let s = 0; for (const x of d) s += r() < 0.5 ? x : 1 - x; v.push(s / d.length); } return v; }
export const thr = (ps, c, th) => { let tp = 0, fp = 0; for (const p of ps) { if (p.pos[c] >= th) tp++; if (p.neg[c] >= th) fp++; } const n = ps.length || 1; return { th, tpr: rnd4(tp / n), fpr: rnd4(fp / n), balPrec: tp + fp ? rnd4(tp / (tp + fp)) : null }; };
export const CTL = ["i", "L", "cl", "lc"];
export const ctl = (ps) => Object.fromEntries(CTL.map((c) => [c, rnd4(auc(ps, c))]));
export const ctlOk = (o) => CTL.every((c) => o[c] >= BAND[0] && o[c] <= BAND[1]);
/** AUC of col restricted to pairs whose rival value lies in the same bin (binFn). */
export function beyond(ps, c, rival, binFn, B = 400, tag = "") { const k = ps.filter((p) => binFn(p.pos[rival]) === binFn(p.neg[rival])); return { kept: k.length, share: rnd4(k.length / Math.max(1, ps.length)), auc: k.length >= 30 ? rnd4(auc(k, c)) : null, ciDay: k.length >= 30 ? boot(k, c, CL.day, B, "by" + rival + tag) : null }; }
export const log2b = (x) => Math.floor(Math.log2(1 + x));
export const groupBy = (xs, f) => { const m = new Map(); for (const x of xs) { const k = f(x); (m.get(k) ?? m.set(k, []).get(k)).push(x); } return m; };
export const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
export const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
export const qs = (a, p) => q(a, p);
