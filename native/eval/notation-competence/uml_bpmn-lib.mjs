// eval/notation-competence/uml_bpmn-lib.mjs — corpus access and arithmetic shared by the uml_bpmn prior builder and instrument.
// Nothing here knows the adapter: it reads the corpus/gold written by uml_bpmn-data.py and does windowing, matching and statistics.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { mulberry32, shuffled, derangement, signTest, binomUpperTail } from "../competence/lib.mjs";
export { mulberry32, shuffled, derangement, signTest, binomUpperTail };

export const DATA = "/private/tmp/claude-501/notation/uml_bpmn";
export const SPLITS = ["train", "dev", "test"];
export const L_WINDOW = 1000;   // declared R0 stream length in characters (see the instrument header)

let MANIFEST = null;
export function loadManifest({ dir = DATA } = {}) {
  if (MANIFEST && MANIFEST.dir === dir) return MANIFEST.m;
  const p = path.join(dir, "corpus", "manifest.json");
  if (!fs.existsSync(p)) return null;
  const m = JSON.parse(fs.readFileSync(p, "utf8"));
  MANIFEST = { dir, m };
  return m;
}
export const docsOf = (m, split, pred = () => true) => m.docs.filter((d) => d.split === split && pred(d));
export const textOf = (doc, { dir = DATA } = {}) => fs.readFileSync(path.join(dir, "corpus", doc.split, `${doc.id}.txt`), "utf8");
const GOLD = new Map();
/** gold records for a split, as a Map id -> record (BPMN and DOT positives only) */
export function loadGold(split, { dir = DATA } = {}) {
  const key = `${dir}|${split}`;
  if (GOLD.has(key)) return GOLD.get(key);
  const p = path.join(dir, "gold", split, "gold.jsonl.gz");
  const out = new Map();
  if (fs.existsSync(p)) for (const line of zlib.gunzipSync(fs.readFileSync(p)).toString("utf8").split("\n")) if (line.trim()) { const g = JSON.parse(line); out.set(g.id, g); }
  GOLD.set(key, out);
  return out;
}
export const sha1 = (s) => createHash("sha1").update(s).digest("hex");
/** a seeded generator for one (seed, key) pair: the same item always gets the same draws */
export const rngFor = (seed, key) => mulberry32(parseInt(sha1(`${seed}|${key}`).slice(0, 8), 16));

// ── R0 windows ────────────────────────────────────────────────────────────────────────────
/** offsets of line starts */
function lineStarts(text) { const out = [0]; for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) out.push(i + 1); return out; }
/**
 * armWindows(doc, text, gold, {L, nMid, rng}) -> { head, body, mid:[...] } (strings; body is null when the dialect has no declared body start)
 *  head  the first L characters;
 *  body  L characters from just after the root start tag (BPMN: the end of the first start-tag unit of the gold; other XML: first '<name...>' by
 *        regex) or just after the first '{' (DOT): the declaration header is gone, the notation is not;
 *  mid   L characters from a random LINE START with at least L characters left: a cold start with no header at all.
 */
export function armWindows(doc, text, gold, { L = L_WINDOW, nMid = 2, rng } = {}) {
  const out = { head: text.slice(0, L), body: null, mid: [] };
  let bodyAt = null;
  if (doc.dialect === "bpmn_xml" && gold) { const u = gold.units.find((x) => x[2] === "tag_start" || x[2] === "tag_empty"); if (u) bodyAt = u[1]; }
  else if (doc.dialect === "dot") { const k = text.indexOf("{"); if (k >= 0) bodyAt = k + 1; }
  else if ((doc.neg_kind ?? "").startsWith("xml_")) { const m = /<[A-Za-z_][^>]*>/.exec(text); if (m) bodyAt = m.index + m[0].length; }
  if (bodyAt != null && text.length - bodyAt >= 200) { let b = bodyAt; while (b < text.length && /\s/.test(text[b])) b++; out.body = text.slice(b, b + L); }
  const ls = lineStarts(text).filter((s) => s + L <= text.length && s > 0);
  if (ls.length) for (let k = 0; k < nMid; k++) { const s = ls[Math.floor(rng() * ls.length)]; out.mid.push(text.slice(s, s + L)); }
  return out;
}

// ── arithmetic ────────────────────────────────────────────────────────────────────────────
/** micro precision/recall/F1 of two multisets keyed by strings */
export function setF1(pred, gold) {
  const g = new Map(); for (const k of gold) g.set(k, (g.get(k) ?? 0) + 1);
  let tp = 0, np = 0;
  for (const k of pred) { np++; const c = g.get(k) ?? 0; if (c > 0) { tp++; g.set(k, c - 1); } }
  const ng = gold.length;
  const p = np ? tp / np : null, r = ng ? tp / ng : null;
  const f1 = tp + (np - tp) + (ng - tp) === 0 ? null : (2 * tp) / (np + ng);
  return { tp, np, ng, precision: p, recall: r, f1 };
}
export const jaccardMulti = (a, b) => { const A = new Map(), B = new Map(); for (const k of a) A.set(k, (A.get(k) ?? 0) + 1); for (const k of b) B.set(k, (B.get(k) ?? 0) + 1); let inter = 0, uni = 0; for (const k of new Set([...A.keys(), ...B.keys()])) { const x = A.get(k) ?? 0, y = B.get(k) ?? 0; inter += Math.min(x, y); uni += Math.max(x, y); } return uni === 0 ? 1 : inter / uni; };
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const round = (x, d = 4) => (x == null || !Number.isFinite(x) ? x : Math.round(x * 10 ** d) / 10 ** d);
/** per-item paired sign test of "A beats B": ties dropped */
export function pairedSign(a, b) { let w = 0, l = 0; for (let i = 0; i < a.length; i++) { if (a[i] > b[i] + 1e-12) w++; else if (a[i] < b[i] - 1e-12) l++; } return signTest(w, l); }

// ── licence audit (RULE 11, made a standing check; dated amendment A6 of uml_bpmn.mjs) ──────────────────────────────────────────────
/** the permissive set of the task rule: MIT, BSD, Apache-2.0, ISC, CC0, CC-BY, CC-BY-SA, public domain (Unlicense). CC-BY-NC*, GPL-family and unknown strings are NOT in it. */
export const ALLOWED_SPDX = Object.freeze(["MIT", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "ISC", "CC0-1.0", "CC-BY-3.0", "CC-BY-4.0", "CC-BY-SA-3.0", "CC-BY-SA-4.0", "Unlicense"]);
/** the exact SPDX identifier a manifest licence record starts with ("Apache-2.0 (libsbgn is dual ...)" -> "Apache-2.0"); a generic record gives itself back and fails the audit */
export const spdxOf = (license) => String(license ?? "").split(" (")[0].trim();
/** licenceAuditOf(manifest) -> { audited, spdx_counts, not_allowed:{spdx:count}, generic_records } re-derived from the documents (independent of the manifest's own licence_audit block) */
export function licenceAuditOf(m) {
  const ok = new Set(ALLOWED_SPDX), counts = {}, bad = {};
  for (const d of m?.docs ?? []) { const k = spdxOf(d.license); counts[k] = (counts[k] ?? 0) + 1; if (!ok.has(k)) bad[k] = (bad[k] ?? 0) + 1; }
  return { audited: (m?.docs ?? []).length, spdx_counts: counts, not_allowed: bad };
}

// ── seeded stratified sampling (dated amendment A5: the causal checks used the first 100 documents in manifest order = one source) ───────
/**
 * stratifiedSample(docs, n, seed, key) -> up to n documents drawn ROUND-ROBIN over the strata (key(d), default the document's SOURCE), strata visited in sorted order, each
 * stratum's documents in a seeded pseudo-random order (sha1(seed|id)). Every stratum is represented as long as n >= the number of strata; the same inputs give the same sample.
 */
export function stratifiedSample(docs, n, seed, key = (d) => d.source ?? d.lineage ?? d.id) {
  const by = new Map();
  for (const d of docs) { const k = String(key(d)); if (!by.has(k)) by.set(k, []); by.get(k).push(d); }
  const keys = [...by.keys()].sort();
  for (const k of keys) by.get(k).sort((a, b) => { const x = sha1(`${seed}|${a.id}`), y = sha1(`${seed}|${b.id}`); return x < y ? -1 : x > y ? 1 : 0; });
  const out = [], pos = new Map(keys.map((k) => [k, 0]));
  while (out.length < n) {
    let progressed = false;
    for (const k of keys) { if (out.length >= n) break; const i = pos.get(k), xs = by.get(k); if (i < xs.length) { out.push(xs[i]); pos.set(k, i + 1); progressed = true; } }
    if (!progressed) break;
  }
  return out;
}
