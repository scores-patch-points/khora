// lib-a.mjs -- shared helpers of the ATTACK on rule ablscope-1-slot-ircB-c4plus (NEW FILE; imports existing modules, edits none; holds no threshold, no verdict).
// It loads the confirmer's registered design (design.json) and its stored ablation reads (data/read/*.jsonl) as a flat token table, builds pair objects, and wraps the existing stats.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sEntry, sAll } from "../confirm-ablscope-1-slot-ircB-c4plus/lib.mjs";
import { aucPN, aucPairs, stratAuc, bootStrat, permStrat, round, quantile, mean } from "../ablation-scope/stats.mjs";
export { aucPN, aucPairs, stratAuc, bootStrat, permStrat, round, quantile, mean, sEntry, sAll };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONF = path.join(HERE, "..", "confirm-ablscope-1-slot-ircB-c4plus");
export const ST4 = ["c4_6", "c7_15", "c16p"], ST23 = ["c2", "c3"];

/** Block id of a token as in the confirmer: document x condition x half of the stream (documents >= 2000 units), else the document. */
export const blockOf = (t) => `${t.doc}|${t.cond}|h${t.units >= 2000 ? Math.min(1, Math.floor((2 * t.s) / t.units)) : 0}`;

/** Every designed token of the confirmation with its stored read: S (S_ENTRY), SALL, hash; kind pair | nat. Optionally a second design (the attack's own, same record format) with its reads dir. */
export function loadTokens({ designFile = path.join(CONF, "data", "design.json"), readDir = path.join(CONF, "data", "read") } = {}) {
  const design = JSON.parse(fs.readFileSync(designFile, "utf8")), reads = new Map();
  for (const f of fs.readdirSync(readDir).filter((x) => x.endsWith(".jsonl"))) {
    const m = new Map();
    for (const l of fs.readFileSync(path.join(readDir, f), "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); m.set(o.k, o.rec); }
    const s = JSON.parse(fs.readFileSync(path.join(readDir, f.replace(".jsonl", ".summary.json")), "utf8"));
    reads.set(`${s.doc}|${s.cond}`, m);
  }
  const out = []; let missing = 0;
  for (const t of design.tokens) {
    const rec = reads.get(`${t.doc}|${t.cond}`)?.get(`${t.s}:${t.i}`);
    if (!rec) { missing += 1; continue; }
    out.push({ ...t, S: sEntry(rec.counts), SALL: sAll(rec.counts), hash: rec.hash, block: blockOf(t) });
  }
  return { tokens: out, missing, designFile };
}

/** Pairs {id, arm, doc, grp, stratum, block, p, n} from tokens with kind "pair". p/n are the token rows themselves (all fields are scores for stats.mjs). */
export function pairsOf(tokens, filt = () => true) {
  const by = new Map();
  for (const t of tokens) {
    if (t.kind !== "pair" || !filt(t)) continue;
    let o = by.get(t.pair); if (!o) by.set(t.pair, (o = { id: t.pair, arm: t.arm, doc: t.doc, cond: t.cond, grp: t.grp, stratum: t.stratum, block: t.block }));
    o[t.y ? "p" : "n"] = t;
  }
  return [...by.values()].filter((x) => x.p && x.n);
}
export const byStratum = (pairs, strata) => Object.fromEntries(strata.map((st) => [st, pairs.filter((x) => x.stratum === st)]));
export const liveBy = (pairs, strata) => { const by = byStratum(pairs, strata); return Object.fromEntries(strata.filter((s) => by[s].length >= 2).map((s) => [s, by[s]])); };

/** Stratified AUC of a score over pairs, with cluster bootstrap CI (B resamples) and the per-stratum table. f: (row) => number. */
export function summarise(pairs, f, { strata = ST4, B = 1000, seed = 1 } = {}) {
  const by = liveBy(pairs, strata), all = Object.values(by).flat();
  if (all.length < 4) return { pairs: all.length, insufficient: true };
  const bt = bootStrat(by, f, { B, seed });
  return { pairs: all.length, days: new Set(all.map((x) => x.doc)).size, auc: bt.point, ci: [bt.lo, bt.hi],
    perStratum: Object.fromEntries(Object.entries(by).map(([st, ps]) => [st, { n: ps.length, auc: round(aucPairs(ps, f)) }])) };
}
/** Paired difference of two scores f - g over the same pairs (cluster bootstrap). */
export function diffCi(pairs, f, g, { strata = ST4, B = 1000, seed = 1 } = {}) {
  const by = liveBy(pairs, strata); if (Object.values(by).flat().length < 4) return null;
  const b = bootStrat(by, f, { B, seed, g }); return { diff: b.point, ci: [b.lo, b.hi] };
}
export const sens = (pairs, thr = 1) => (pairs.length ? round(pairs.filter((x) => x.p.S >= thr).length / pairs.length) : null);
export const spec = (pairs, thr = 1) => (pairs.length ? round(pairs.filter((x) => x.n.S < thr).length / pairs.length) : null);
/** The six matched-out controls of the confirmer + two extra (recency, initial share) as functions of a row. */
export const CTL = {
  R_LOGC: (r) => Math.log(r.c), R_POS: (r) => Math.log1p(r.s), R_IPOS: (r) => r.i, R_FB: (r) => r.fbin, R_LEN: (r) => r.len, R_SL: (r) => Math.log(r.sl),
  R_BURST: (r) => Math.log((r.last16 + 0.5) / (r.rate * 16 + 0.5)), R_LAST16: (r) => r.last16, R_DOCCOUNT: (r) => Math.log(r.docCount), R_RINIT: (r) => r.rinit, R_CINIT: (r) => r.cInit,
};
export const controlsOf = (pairs, strata = ST4) => { const by = liveBy(pairs, strata); return Object.fromEntries(Object.entries(CTL).map(([k, f]) => [k, round(stratAuc(by, (m) => f(m)))])); };
export const sha = async (s) => (await import("node:crypto")).createHash("sha256").update(s).digest("hex");
/** Seeded RNG shared with the instrument (same as the confirmer). */
export { rngFor, seedFor } from "../../impact.mjs";

/** Read maps of several read directories merged: Map("doc|cond" -> Map("s:i" -> rec)). Later directories add keys, never replace. */
export function readMaps(dirs) {
  const reads = new Map();
  for (const readDir of dirs) {
    if (!fs.existsSync(readDir)) continue;
    for (const f of fs.readdirSync(readDir).filter((x) => x.endsWith(".jsonl"))) {
      const base = f.replace(".jsonl", ""), sf = path.join(readDir, base + ".summary.json");
      const key = fs.existsSync(sf) ? (() => { const s = JSON.parse(fs.readFileSync(sf, "utf8")); return `${s.doc}|${s.cond}`; })() : null; if (!key) continue;
      const m = reads.get(key) ?? new Map(); reads.set(key, m);
      for (const l of fs.readFileSync(path.join(readDir, f), "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); if (!m.has(o.k)) m.set(o.k, o.rec); }
    }
  }
  return reads;
}

// ── scramble condition added by the attack: shufK = tokens permuted inside each message EXCEPT the first one (the message-initial slot is kept in place; everything after it is scrambled). Gold flags travel with their tokens. ──
import { loadDocCond } from "../confirm-ablscope-1-slot-ircB-c4plus/lib.mjs";
import { rngFor as _rngFor, seedFor as _seedFor } from "../../impact.mjs";
export function loadDocAny(name, cond = "real") {
  if (cond !== "shufK") return loadDocCond(name, cond);
  const base = loadDocCond(name, "real"), rnd = _rngFor(_seedFor("attack-ablscope-1", "scramble", "shufK", name));
  const msgs = base.stream.map((m, s) => m.map((w, i) => ({ w, g: base.goldPos.has(`${s}:${i}`) })));
  const out = msgs.map((m) => { if (m.length < 3) return m; const rest = m.slice(1); for (let k = rest.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [rest[k], rest[j]] = [rest[j], rest[k]]; } return [m[0], ...rest]; });
  const goldPos = new Set(); out.forEach((m, s) => m.forEach((t, i) => { if (t.g) goldPos.add(`${s}:${i}`); }));
  return { ...base, stream: out.map((m) => m.map((t) => t.w)), goldPos, cond: "shufK" };
}

// ── paired (conditional) logistic regression on within-pair feature differences (symmetrised, no intercept; tiny ridge) and a block (cluster) bootstrap of any pair statistic ──
function solve(A, b) { const n = b.length, M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-12; for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((r, i) => r[n] / (r[i] || 1e-12)); }
export function pairLogit(pairs, feats, { ridge = 1e-3, iters = 40 } = {}) {
  const k = feats.length, X = pairs.map((pr) => feats.map((f) => f(pr.p) - f(pr.n))); let b = new Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    const g = new Array(k).fill(0), H = Array.from({ length: k }, () => new Array(k).fill(0));
    for (const x of X) { const z = x.reduce((a, v, j) => a + v * b[j], 0), s = 1 / (1 + Math.exp(-z)); for (let j = 0; j < k; j++) { g[j] += (1 - s) * x[j]; for (let l = 0; l < k; l++) H[j][l] += s * (1 - s) * x[j] * x[l]; } }
    for (let j = 0; j < k; j++) { g[j] -= ridge * b[j]; H[j][j] += ridge; }
    const d = solve(H, g); b = b.map((v, j) => v + d[j]); if (d.every((v) => Math.abs(v) < 1e-8)) break;
  }
  return b;
}
/** Percentile cluster bootstrap of stat(pairs) over blocks. Returns {point, lo, hi}. */
export function blockBoot(pairs, stat, { B = 300, seed = 1 } = {}) {
  const rnd = _rngFor(seed), ids = [...new Set(pairs.map((x) => x.block))], by = new Map(ids.map((b) => [b, pairs.filter((x) => x.block === b)])), xs = [];
  for (let r = 0; r < B; r++) { const rs = []; for (let k = 0; k < ids.length; k++) rs.push(...by.get(ids[Math.floor(rnd() * ids.length)])); const v = stat(rs); if (v != null && Number.isFinite(v)) xs.push(v); }
  return { point: round(stat(pairs)), lo: round(quantile(xs, 0.025)), hi: round(quantile(xs, 0.975)), B: xs.length };
}
