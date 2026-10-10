// eval/pockets/lib/pocket.mjs — the shared interface of the POCKET-UNIVERSE LAW ATLAS.
// A POCKET is a bounded, self-contained text world (a language, register, genre, book, channel, code language, notation, or a PLANTED synthetic world with known laws).
//   { id, group, register, language, script, units, docOf, meta }
//   units : string[][]  one entry per sentence / message / line / statement: lowercase NFC word tokens, NO punctuation tokens, NO numbers-only tokens
//   docOf : number[]    document (chapter / file / channel-day / statement block) index of each unit; nondecreasing; docs are the split and bootstrap grain
// Loaders cap a pocket at MAX_TOKENS tokens by taking WHOLE documents (deterministically, by the hash order below), never by truncating a document.
import { createHash } from "node:crypto";
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const seedOf = (...p) => parseInt(sha256(["pockets-v1", ...p.map(String)].join("\x1f")).slice(0, 8), 16) >>> 0;
export const rngOf = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
export const MAX_TOKENS = 300000, MIN_TOKENS = 20000, MIN_DOCS = 20;
export const tokenCount = (units) => units.reduce((n, u) => n + u.length, 0);

export function validate(p) {
  const bad = (m) => { throw new Error(`pocket ${p?.id}: ${m}`); };
  for (const k of ["id", "group", "register", "language", "units", "docOf"]) if (p[k] == null) bad(`missing ${k}`);
  if (p.units.length !== p.docOf.length) bad("units and docOf differ in length");
  for (let u = 0; u < p.units.length; u++) {
    if (!Array.isArray(p.units[u]) || !p.units[u].length) bad(`unit ${u} empty or not an array`);
    if (u && p.docOf[u] < p.docOf[u - 1]) bad(`docOf decreases at unit ${u}`);
    for (const w of p.units[u]) if (typeof w !== "string" || !w || w !== w.toLowerCase() || /^\p{P}+$/u.test(w) || /^\p{N}+$/u.test(w)) bad(`bad token ${JSON.stringify(w)} in unit ${u}`);
  }
  const tokens = tokenCount(p.units), docs = new Set(p.docOf).size;
  return { id: p.id, tokens, units: p.units.length, docs, thin: tokens < MIN_TOKENS || docs < MIN_DOCS, overCap: tokens > MAX_TOKENS * 1.05 };
}

/** Deterministic half-split by DOCUMENT: parity of sha256(id:doc). Returns {discover, confirm}, each a view {id, which, units, docOf} with docs renumbered contiguously. */
export function halves(p) {
  const side = (d) => parseInt(sha256(`${p.id}:${d}`).slice(0, 2), 16) & 1;
  const out = { discover: { id: p.id, which: "discover", units: [], docOf: [] }, confirm: { id: p.id, which: "confirm", units: [], docOf: [] } };
  const renum = { discover: new Map(), confirm: new Map() };
  p.units.forEach((u, k) => {
    const w = side(p.docOf[k]) ? "confirm" : "discover", m = renum[w];
    if (!m.has(p.docOf[k])) m.set(p.docOf[k], m.size);
    out[w].units.push(u); out[w].docOf.push(m.get(p.docOf[k]));
  });
  return out;
}

/** Null worlds. kind: "within-unit" (shuffle tokens inside each unit: destroys order, keeps bag per unit), "unit-order" (shuffle units across the whole view: destroys discourse order, keeps each unit),
 *  "token-global" (shuffle all tokens across the view, keep unit lengths: destroys everything but unigram counts). */
export function nullView(view, kind, seed) {
  const rnd = rngOf(seed), sh = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  if (kind === "within-unit") return { ...view, units: view.units.map((u) => sh(u.slice())) };
  if (kind === "unit-order") { const ix = sh(view.units.map((_, k) => k)); return { ...view, units: ix.map((k) => view.units[k]) }; }
  if (kind === "token-global") { const flat = sh(view.units.flat()); let o = 0; return { ...view, units: view.units.map((u) => { const r = flat.slice(o, o + u.length); o += u.length; return r; }) }; }
  throw new Error(`unknown null kind ${kind}`);
}
