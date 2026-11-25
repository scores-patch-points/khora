// unit-sniffer.mjs — sniff the CELLS a unit acts in from the unit's OWN embedding: the working fallback after the ablation sniffer was falsified.
//
// THE MOVE. Embed the unit's text (a word, a phrase, a clause) with a frozen local embedding codec, take its cosine against the canonical centroid
// of each cell (the mean of what the cell's known members embed to), and claim every cell whose cosine clears its OWN null bound (the 95th
// percentile of the cosines between that centroid and members of other cells), ranked, with the margin kept beside it. A unit may be in several
// cells; a unit that clears no bound claims none, and says so. No parse, no generation, no network but localhost.
//
// WHY NOT THE ABLATION (identity/novels/ablation-sniffer/RESULTS-ABLATION-SNIFFER.md and RESULTS-ABLATION-UNITS.md): the negative space of a removed
// unit never beat the unit's own embedding, in English or across 28 languages, for a word or a clause, and fusing the two lowered accuracy.
// This module is that finding built: the unit's own embedding against canonical centroids (the pos-smell.js method, multi-label, per language
// pooling with equal weight per language). It generalises ablation-sniffer.mjs's centroid, null-bound and sniff functions and reuses them.
//
// THE CANON IS BUILT OFFLINE from labelled units and held as DATA in the priors home (`unit-cells-<model>-<head>.json`, head `op` for the nine
// operators or `cell` for the 27), with its giver, model and what it scored; a model with no prior is a typed gap, never another model's
// centroids. DECLARED, NOT MEASURED until identity/novels/ablation-sniffer/RESULTS-UNIT-SNIFFER.md says so. A sniff PROPOSES; it never settles.
// No regular expression touches language here (CLAUDE.md rule 8).
import { priorJson } from "../../the-fold/prior-source.mjs";
import { unit, cosine, sniffCells, modelSlug } from "./ablation-sniffer.mjs";

export const UNIT_SNIFFER_SCHEMA = "UnitCells@1";
export const unitPriorName = (model, head) => `unit-cells-${modelSlug(model)}-${head}.json`;

/** entries [{cls, vec}] -> { cls: unit mean of that class's unit vectors } : one language's class means */
export function classMeans(entries) {
  const acc = new Map();
  for (const e of entries) { const u = unit(e.vec); if (!u) continue; let a = acc.get(e.cls); if (!a) { a = { sum: new Float32Array(u.length), n: 0 }; acc.set(e.cls, a); } for (let i = 0; i < u.length; i++) a.sum[i] += u[i]; a.n++; }
  const out = {}; for (const [cls, a] of acc) { const c = unit(a.sum); if (c) out[cls] = { vec: c, n: a.n }; } return out;
}
/** groups [{ id, means }] (each from classMeans) -> a canon with EQUAL WEIGHT PER GROUP (per language), skipping the ids in `exclude` */
export function poolCanon(groups, exclude = new Set()) {
  const acc = new Map();
  for (const g of groups) { if (exclude.has(g.id)) continue; for (const [cls, m] of Object.entries(g.means)) { let a = acc.get(cls); if (!a) { a = { sum: new Float32Array(m.vec.length), groups: 0, n: 0 }; acc.set(cls, a); } for (let i = 0; i < m.vec.length; i++) a.sum[i] += m.vec[i]; a.groups++; a.n += m.n; } }
  const classes = {}; for (const [cls, a] of acc) { const c = unit(a.sum); if (c) classes[cls] = { centroid: c, n: a.n, groups: a.groups }; }
  return { schema: UNIT_SNIFFER_SCHEMA, classes };
}
/** per class, the 95th percentile of the cosines between its centroid and the unit vectors of OTHER classes: the bound a claim must clear */
export function claimBounds(canon, entries, { q = 0.95 } = {}) {
  const bounds = {};
  for (const [cls, c] of Object.entries(canon.classes)) { const xs = []; for (const e of entries) if (e.cls !== cls) { const u = unit(e.vec); if (u) xs.push(cosine(u, c.centroid)); } xs.sort((a, b) => a - b); bounds[cls] = xs.length ? xs[Math.min(xs.length - 1, Math.floor(q * (xs.length - 1)))] : null; }
  return bounds;
}

/** The whole move for one text: embed it, sniff it. `embed(texts) -> vectors[]` is injected (the caller's frozen local codec). */
export async function sniffText(embed, text, canon, bounds) {
  const [v] = await embed([String(text)]), u = unit(v);
  if (!u) return { gap: "empty_vector", ranked: [], best: null, claimed: [] };
  return { ...sniffCells(u, canon, bounds), vec: u };
}
export async function sniffTexts(embed, texts, canon, bounds) {
  const vs = await embed(texts.map(String));
  return vs.map((v) => { const u = unit(v); return u ? { ...sniffCells(u, canon, bounds), vec: u } : { gap: "empty_vector", ranked: [], best: null, claimed: [] }; });
}

// ── the prior ───────────────────────────────────────────────────────────────────────────────────────────────────────
const f32b64 = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");
const b64f32 = (s) => { const b = Buffer.from(s, "base64"); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice(); };
/** canon + bounds + provenance -> the JSON a prior holds. meta must name the model, the head and the giver of the labels: an unattributed centroid is refused. */
export function unitCanonToPrior(canon, bounds, meta) {
  if (!meta?.model || !meta?.giver || !meta?.head) throw new TypeError("unitCanonToPrior: meta must name the embedding model, the head (op or cell) and the giver of the labels; an unattributed centroid is refused");
  const classes = {}; for (const [cls, c] of Object.entries(canon.classes)) classes[cls] = { n: c.n, groups: c.groups ?? null, bound: bounds?.[cls] ?? null, centroid: f32b64(c.centroid) };
  return { schema: UNIT_SNIFFER_SCHEMA, dim: Object.values(canon.classes)[0]?.centroid.length ?? 0, meta, classes };
}
export function unitCanonFromPrior(json) {
  if (!json || json.schema !== UNIT_SNIFFER_SCHEMA) return null;
  const classes = {}, bounds = {}; for (const [cls, c] of Object.entries(json.classes)) { classes[cls] = { centroid: b64f32(c.centroid), n: c.n, groups: c.groups }; bounds[cls] = c.bound; }
  return { canon: { schema: UNIT_SNIFFER_SCHEMA, classes }, bounds, meta: json.meta };
}
/** The canon the priors home holds for an embedding model and head, or null: a typed gap. */
export const loadUnitCanon = (model, head) => unitCanonFromPrior(priorJson(unitPriorName(model, head)));
