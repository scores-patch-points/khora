// confirm-lib.mjs — cell evaluation with the STRICT-subset fallback, natural-prevalence precision/recall, swarm-pool flag. Used by confirm.mjs (pre-registered there).
import fs from "node:fs";
import { buildIndex } from "./index.mjs";
import { docOf } from "./collect.mjs";
import { pAuc, bootPairs, bootDays, thrRule, beyondRival, round } from "./stats.mjs";
export const CTL = ["i", "len", "cl", "lc"], BAND = [0.45, 0.55];
export const nullQ95 = (n) => round(0.5 + (1.645 * 0.5) / Math.sqrt(Math.max(1, n)));
export const strictOf = (ps) => ps.filter((p) => p.pos.len === p.neg.len && p.pos.cl === p.neg.cl && p.pos.i === p.neg.i && Math.abs(p.pos.lc - p.neg.lc) <= 0.15);
function stats(ps, rule) {
  const o = { n: ps.length, days: new Set(ps.map((p) => p.day)).size, ctl: {} };
  if (!ps.length) return { ...o, ctlOk: false };
  for (const c of CTL) o.ctl[c] = round(pAuc(ps, c)); o.ctlOk = CTL.every((c) => o.ctl[c] >= BAND[0] && o.ctl[c] <= BAND[1]);
  o.auc = round(pAuc(ps, rule.column)); o.nullQ95 = nullQ95(ps.length);
  if (ps.length >= 40) { o.ci = bootPairs(ps, rule.column, 1, 300, "cf"); o.dayCi = bootDays(ps, rule.column, 1, 300, "cf"); }
  o.thr = thrRule(ps, rule.column, rule.theta);
  if (rule.rivals) o.beyondRival = Object.fromEntries(rule.rivals.map((r) => [r, beyondRival(ps, rule.column, r)]));
  return o;
}
/** One cell: full pairs; if controls are out of band, the STRICT subset (equal raw message length, character length, index; |d log2 count| <= 0.15; n >= 40) replaces it, else VOID. */
export function evalCell(ps, rule) {
  const full = stats(ps, rule); let used = full, variant = "full";
  if (!full.ctlOk) { const s = strictOf(ps), st = stats(s, rule); if (st.ctlOk && st.n >= 40) { used = st; variant = "strict"; } else { used = null; variant = "VOID"; } }
  const c = rule.crit, minN = variant === "strict" ? 40 : c.minN, ok = used && used.n >= minN && used.auc >= c.auc && used.ci && used.ci[0] >= Math.max(c.lower, used.nullQ95);
  return { variant, full, strict: variant === "strict" ? used : undefined, holds: !!ok, reason: ok ? "" : variant === "VOID" ? "controls out of band, strict subset too small or out of band" : !used ? "" : used.n < minN ? "n too small" : used.auc < c.auc ? "AUC below bar" : "lower bound below bar" };
}
export const swarmPool = (d) => d.lang === "en" && Number(/messages: "(\d+)"/.exec(fs.readFileSync(d.path, "utf8").slice(0, 400))?.[1] ?? 0) >= 1500;
const lbound = (a, x) => { if (!a) return 0; let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
/** Natural-prevalence tally for one day (UNMATCHED; positional confound is part of the rule here). R1 over every LATER token, R2 over every FIRST token. */
export function natural(d, theta1, theta2) {
  const doc = docOf(d), ix = buildIndex(doc.T), seen = new Map(), T = { R1: {}, POS: {}, R2: {} };
  const add = (g, key, y, flag) => { const o = (g[key] ??= { tp: 0, fn: 0, fp: 0, tn: 0 }); o[y ? (flag ? "tp" : "fn") : flag ? "fp" : "tn"]++; };
  doc.T.forEach((m, k) => m.forEach((w, i) => {
    const kk = seen.get(w) ?? 0; seen.set(w, kk + 1);
    const nick = doc.nicks.has(w), c = nick ? (!doc.topic.has(w) && w !== doc.S[k] ? 1 : null) : [...w].length >= 3 ? 0 : null; if (c == null) return;
    const fac = i === 0 ? "INIT" : "NONINIT";
    if (kk >= 1) { const cnt = lbound(ix.msgIdx.get(w), k), ini = lbound(ix.initIdx.get(w), k), s = (ini + 1) / (cnt + 2); for (const f of [fac, "ALL"]) { add(T.R1, f, c, s >= theta1); add(T.POS, f, c, i === 0); } }
    else { const ini = (ix.initIdx.get(w)?.length ?? 0) - (i === 0 ? 1 : 0); for (const f of [fac, "ALL"]) add(T.R2, f, c, ini >= theta2); }
  }));
  return T;
}
export const addTally = (A, B) => { for (const g of Object.keys(B)) for (const f of Object.keys(B[g])) { const a = ((A[g] ??= {})[f] ??= { tp: 0, fn: 0, fp: 0, tn: 0 }); for (const k of ["tp", "fn", "fp", "tn"]) a[k] += B[g][f][k]; } return A; };
export const prf = (o) => ({ ...o, precision: round(o.tp / Math.max(1, o.tp + o.fp)), recall: round(o.tp / Math.max(1, o.tp + o.fn)), fpr: round(o.fp / Math.max(1, o.fp + o.tn)), prevalence: round((o.tp + o.fn) / Math.max(1, o.tp + o.fn + o.fp + o.tn)) });
