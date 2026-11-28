// ablation-sniffer.mjs — sniff the CELLS a unit acts in by what the sentence LOSES when the unit is removed.
//
// THE MOVE (the user's, 2026-11-23): take a sentence, remove one unit from it (a word, a phrase, a clause), embed the sentence with and without
// the unit, and keep the NEGATIVE SPACE: the direction the meaning moved when the unit left (unit(unit(E with) - unit(E without))). That
// direction is the unit's effect on the sentence, what it did there. Its cosine against the CANONICAL CENTROIDS (one per cell: the mean of
// what its known members are) says which cell(s) the unit acts in. A unit need not be in just one cell: every cell whose cosine clears its
// OWN null bound is claimed, and the ranked list is returned with the margin, never collapsed into one hidden number.
//
// This is the ablation delta of ablation-grain-pressure.js (which masked the word with "___" and voted among 13 parts of speech), made to
// REMOVE the unit (the negative space of an absence, not the presence of a placeholder), taken against the 27 cells' canonical centroids
// (the cube's operator x grain, native/kernel/cube.js), and multi-label. The mask variant stays available so each choice can be falsified
// against the other (identity/novels/ablation-sniffer/).
//
// PURE and injected: no model call, no network, no file read here but the priors door. `embed(texts) -> vectors[]` is the caller's frozen codec
// (a local embedding model); the canonical centroids are DATA in the priors home (`ablation-cells-<model>.json`), built offline from labelled
// units (native/scripts/build-ablation-cells-prior.mjs), carrying their giver, model digest and what they scored. A model with no prior is a
// typed gap, never another model's centroids (vectors from two embedders are not comparable).
//
// DECLARED, NOT MEASURED until identity/novels/ablation-sniffer/RESULTS says so. A sniff PROPOSES; it never settles (the pos-smell law).
// No regular expression touches language here (CLAUDE.md rule 8).
import { priorJson } from "../../the-fold/prior-source.mjs";

export const ABLATION_SNIFFER_SCHEMA = "AblationCells@1";
export const MASK = "___";
// scripts written without spaces between words: a unit is cut out of the text without leaving a gap (code point ranges, no regular expression)
const NO_SPACE = [[0x3000, 0x30ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xe00, 0xeff], [0x1780, 0x17ff], [0x1000, 0x109f], [0xf900, 0xfaff], [0xff00, 0xffef]];
const noSpace = (word) => { for (const ch of String(word ?? "")) { const cp = ch.codePointAt(0); for (const r of NO_SPACE) if (cp >= r[0] && cp <= r[1]) return true; } return false; };
/** forms (an array of surface words) -> one text; no spaces where both neighbours are written without them */
export function joinForms(forms) {
  let out = "";
  for (let i = 0; i < forms.length; i++) { const w = String(forms[i]); if (i > 0 && !(noSpace(forms[i - 1]) && noSpace(w))) out += " "; out += w; }
  return out;
}
/** The three texts of one unit (a span [start, end) of forms): the sentence, the sentence WITHOUT the unit, the sentence with the unit MASKED. */
export function ablationTexts(forms, start, end = start + 1) {
  if (!(start >= 0 && end > start && end <= forms.length)) throw new RangeError(`ablationTexts: span [${start}, ${end}) is outside a sentence of ${forms.length} words`);
  return { withText: joinForms(forms), withoutText: joinForms([...forms.slice(0, start), ...forms.slice(end)]), maskText: joinForms([...forms.slice(0, start), MASK, ...forms.slice(end)]) };
}

/** The same, for a unit that is a SET of words (a phrase or a clause with its modifiers around it need not be one contiguous run): the sentence,
 *  the sentence without the unit, the sentence with the unit masked by one placeholder, and the unit's own text. `indices` are positions in `forms`. */
export function unitTexts(forms, indices) {
  const set = new Set(indices);
  if (!set.size) throw new RangeError("unitTexts: an empty unit");
  for (const i of set) if (!(i >= 0 && i < forms.length)) throw new RangeError(`unitTexts: position ${i} is outside a sentence of ${forms.length} words`);
  const rest = [], maskForms = [], own = []; let placed = false;
  forms.forEach((w, i) => { if (set.has(i)) { own.push(w); if (!placed) { maskForms.push(MASK); placed = true; } } else { rest.push(w); maskForms.push(w); } });
  return { withText: joinForms(forms), withoutText: joinForms(rest), maskText: joinForms(maskForms), unitText: joinForms(own) };
}

// ── vectors ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export function unit(v) { let n = 0; for (let i = 0; i < v.length; i++) n += v[i] * v[i]; n = Math.sqrt(n); if (!n) return null; const o = new Float32Array(v.length); for (let i = 0; i < v.length; i++) o[i] = v[i] / n; return o; }
export const cosine = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }; // both unit
/** The NEGATIVE SPACE: what the sentence lost, as a direction. null when the unit's removal moved nothing. */
export function negativeSpace(withVec, withoutVec) {
  const a = unit(withVec), b = unit(withoutVec); if (!a || !b) return null;
  const d = new Float32Array(a.length); for (let i = 0; i < a.length; i++) d[i] = a[i] - b[i];
  return unit(d);
}

// ── the canon: one centroid per cell ────────────────────────────────────────────────────────────────────────────────
/** entries [{cls, vec}] -> { classes: { cls: { centroid (unit), n } } }: the mean of each class's unit vectors, equal weight per member. */
export function buildCanon(entries) {
  const by = new Map();
  for (const e of entries) { const u = unit(e.vec); if (!u) continue; if (!by.has(e.cls)) by.set(e.cls, []); by.get(e.cls).push(u); }
  const classes = {};
  for (const [cls, list] of by) { const acc = new Float32Array(list[0].length); for (const u of list) for (let i = 0; i < acc.length; i++) acc[i] += u[i]; const c = unit(acc); if (c) classes[cls] = { centroid: c, n: list.length }; }
  return { schema: ABLATION_SNIFFER_SCHEMA, classes };
}
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
/** Per class, the 95th percentile of the cosines between its centroid and negative spaces of units that are NOT in it: the bound a claim must clear. */
export function nullBounds(canon, deltas, { q = 0.95 } = {}) {
  const bounds = {};
  for (const [cls, c] of Object.entries(canon.classes)) { const xs = deltas.filter((d) => d.cls !== cls).map((d) => cosine(d.vec, c.centroid)).sort((a, b) => a - b); bounds[cls] = xs.length ? quantile(xs, q) : null; }
  return bounds;
}
/** vec (a unit negative space) against the canon -> { ranked: [{cls, cos, bound, claimed}], best, margin, claimed: [cls] }. A class with no bound is never claimed. */
export function sniffCells(vec, canon, bounds = {}) {
  const ranked = Object.entries(canon.classes).map(([cls, c]) => { const s = cosine(vec, c.centroid), b = bounds[cls] ?? null; return { cls, cos: s, bound: b, claimed: b != null && s >= b }; }).sort((x, y) => y.cos - x.cos);
  return { ranked, best: ranked[0]?.cls ?? null, margin: ranked.length > 1 ? ranked[0].cos - ranked[1].cos : null, claimed: ranked.filter((r) => r.claimed).map((r) => r.cls) };
}
/** The whole move for one unit: embed with and without, take the negative space, sniff. `embed(texts) -> vectors[]` is injected. */
export async function sniffUnit(embed, forms, start, end, canon, bounds, { mask = false } = {}) {
  const t = ablationTexts(forms, start, end), [w, wo] = await embed([t.withText, mask ? t.maskText : t.withoutText]);
  const delta = negativeSpace(w, wo); if (!delta) return { gap: "no_negative_space", ranked: [], best: null, claimed: [] };
  return { ...sniffCells(delta, canon, bounds), delta };
}

// ── the prior: ablation-cells-<model>.json ──────────────────────────────────────────────────────────────────────────
const f32b64 = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");
const b64f32 = (s) => { const b = Buffer.from(s, "base64"); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice(); };
export const modelSlug = (model) => { let o = ""; for (const ch of String(model)) o += (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") || ch === "." || ch === "-" ? ch : (ch >= "A" && ch <= "Z" ? ch.toLowerCase() : "_"); return o; };
export const priorName = (model) => `ablation-cells-${modelSlug(model)}.json`;
/** canon + bounds + provenance -> the JSON a prior holds. Provenance must name the model and the giver: an unattributed centroid is refused. */
export function canonToPrior(canon, bounds, meta) {
  if (!meta?.model || !meta?.giver) throw new TypeError("canonToPrior: meta must name the embedding model and the giver of the labels; an unattributed centroid is refused");
  const classes = {}; for (const [cls, c] of Object.entries(canon.classes)) classes[cls] = { n: c.n, bound: bounds?.[cls] ?? null, centroid: f32b64(c.centroid) };
  return { schema: ABLATION_SNIFFER_SCHEMA, dim: Object.values(canon.classes)[0]?.centroid.length ?? 0, meta, classes };
}
export function canonFromPrior(json) {
  if (!json || json.schema !== ABLATION_SNIFFER_SCHEMA) return null;
  const classes = {}, bounds = {}; for (const [cls, c] of Object.entries(json.classes)) { classes[cls] = { centroid: b64f32(c.centroid), n: c.n }; bounds[cls] = c.bound; }
  return { canon: { schema: ABLATION_SNIFFER_SCHEMA, classes }, bounds, meta: json.meta };
}
/** The canon the priors home holds for an embedding model, or null: a typed gap, never another model's centroids. */
export const loadAblationCanon = (model) => canonFromPrior(priorJson(priorName(model)));
