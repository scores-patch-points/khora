// features.mjs — fixed scores (no fitted weights, direction fixed in advance: higher = more name-like), rival and control observables, and pair building.
import fs from "node:fs";
import path from "node:path";
import { DELTA_TYPES, SPAN_LABELS } from "../../impact.mjs";
import { STRATA } from "./lib-pairs.mjs";

const T = DELTA_TYPES.length;
const SPAN_IX = Object.fromEntries(["births", "losses", "mentionShift", "edgesLost", "edgesBorn"].map((k) => [k, SPAN_LABELS.indexOf(k)]));
/** The ablation scores of one record. S_ENTRY: non-unchanged typed deltas in the ref-entry family at radius bands 0-1 (the registered primary). */
export function ablationScores(rec) {
  const c = rec.counts, at = (fam, band) => { let s = 0; for (let t = 0; t < T; t++) s += c[(fam * 3 + band) * T + t]; return s; };
  let S_OWN = 0; for (let fam = 0; fam < 4; fam++) S_OWN += at(fam, 0);
  let S_ALL = 0; for (const v of c) S_ALL += v;
  const sp = rec.span;
  return { S_ENTRY: at(3, 0) + at(3, 1), S_OWN, S_ALL, S_SPAN: Math.abs(sp[SPAN_IX.births]) + Math.abs(sp[SPAN_IX.losses]) + Math.abs(sp[SPAN_IX.mentionShift]) + Math.abs(sp[SPAN_IX.edgesLost]) + Math.abs(sp[SPAN_IX.edgesBorn]),
    EXTENT: rec.extent.tokens, NONNULL: rec.isNull ? 0 : 1 };
}
export const SCORES = ["S_ENTRY", "S_OWN", "S_ALL", "S_SPAN", "EXTENT", "NONNULL"];
/** Rival (R_BURST, a local count rival without ablation) and matched-out controls (must sit in [0.45, 0.55] pooled). */
export function controlScores(r) {
  return { R_BURST: Math.log((r.last16 + 0.5) / (r.rate * 16 + 0.5)), R_LOGC: Math.log(r.c), R_POS: Math.log1p(r.s), R_IPOS: r.i, R_FB: r.fbin, R_LEN: r.len, R_SL: Math.log(r.sl) };
}
export const CONTROLS = ["R_LOGC", "R_POS", "R_IPOS", "R_FB", "R_LEN", "R_SL"];
/** The record as a feature vector for a PROBE (a fitted classifier; an existence test, never a rule): slot signature, atmosphere, span, company. */
export const recordVector = (rec) => [...rec.sig, ...rec.atm, ...rec.span, ...rec.c];
export const controlVector = (r) => [Math.log(r.c), Math.log1p(r.s), r.i, r.len, r.fbin, Math.log(r.sl)];

export function loadRows(dir) {
  const rows = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".jsonl")).sort()) for (const l of fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l); r.pair = `${f}|${r.pair}`; rows.push(r); }   // pair ids are only unique within a shard file
  return rows;
}
/** Complete pairs, each carrying scores, controls, vectors and its cluster block (document x quartile of the stream). */
export function buildPairs(rows) {
  const docMax = new Map(); for (const r of rows) docMax.set(r.doc, Math.max(docMax.get(r.doc) ?? 0, r.s));
  // cluster blocks = document x K-ile of the stream; a single-document corpus (a book) gets 20 blocks so the cluster bootstrap has enough clusters (4 gave degenerate intervals)
  const nDocs = new Map(); for (const r of rows) (nDocs.get(r.corpus) ?? nDocs.set(r.corpus, new Set()).get(r.corpus)).add(r.doc);
  const Kof = (corpus) => (nDocs.get(corpus).size <= 2 ? 20 : 4);
  const by = new Map(); for (const r of rows) (by.get(r.pair) ?? by.set(r.pair, {}).get(r.pair))[r.y ? "p" : "n"] = r;
  const out = [];
  for (const [id, x] of by) {
    if (!x.p || !x.n) continue;
    const mk = (r) => ({ ...ablationScores(r.rec), ...controlScores(r), isNull: r.rec.isNull, extent: r.rec.extent.tokens, rv: recordVector(r.rec), cv: controlVector(r), raw: r });
    out.push({ id, kind: x.p.corpus, doc: x.p.doc, grp: x.p.grp, stratum: x.p.stratum, block: `${x.p.doc}|q${Math.min(Kof(x.p.corpus) - 1, Math.floor((Kof(x.p.corpus) * x.p.s) / (docMax.get(x.p.doc) + 1)))}`, p: mk(x.p), n: mk(x.n) });
  }
  return out;
}
export const cellPairs = (pairs, kind, grp, strata) => Object.fromEntries(strata.map((st) => [st, pairs.filter((x) => x.kind === kind && x.grp === grp && x.stratum === st)]));
export const ORDER = STRATA;
