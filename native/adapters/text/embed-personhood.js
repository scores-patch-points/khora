// embed-personhood.js — does the string, and its role in context, smell like a person? (identity/novels PREREG-ROUND15.md + NOTE-1)
// Three views of a mention, each scored against two centroids (person / not-person) of GUM train gold mentions embedded the same way:
//   ES the string; ER the role frame ("subj of say: Bert"); EC the sentence with the mention marked ("... [Bert] said ...").
// The embedder is a frozen local model (ollama nomic-embed-text, fixed prefix): a codec, no generation. Pure functions + one async embedder. Status: EXPERIMENTAL.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { openLibrary, vectorsDir } from "../../organs/vector-library.js";
export const MODEL = "nomic-embed-text:latest"; export const PREFIX = "classification: "; export const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";
export const strFrame = (s) => s; export const roleFrame = (role, lemma, s) => (role && lemma ? `${role} of ${lemma}: ${s}` : `mention: ${s}`);
export const markFrame = (sentText, a, b) => sentText.slice(0, a) + "[" + sentText.slice(a, b) + "]" + sentText.slice(b);
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
/** makeEmbedder({ legacyJson }) -> { embed(texts), save() }: the vectors live in the binary vector library (organs/vector-library.js), one file per model digest + prefix; only unseen texts reach the model, in parallel batches.
 *  `legacyJson` (an old { sha256(prefix+text): base64 } cache) is read for texts the library lacks, so the 92 MB JSON cache migrates without being recomputed. */
export function makeEmbedder(opts = {}) {
  const legacyFile = typeof opts === "string" ? opts : opts.legacyJson ?? null; let lib = null, legacy = null;
  const open = async () => { if (lib) return lib; const r = await fetch(`${OLLAMA}/api/tags`); const tags = await r.json(); const m = (tags.models ?? []).find((x) => x.name === MODEL || x.model === MODEL); if (!m) throw new Error("ollama does not hold " + MODEL); const probe = await (await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, input: [PREFIX + "x"] }) })).json();
    lib = openLibrary({ file: path.join(vectorsDir(), MODEL.replace(/[^\w.-]+/g, "_") + ".vec"), digest: m.digest, prefix: PREFIX, dim: probe.embeddings[0].length }); return lib; };
  const ollama = async (texts) => { const r = await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, input: texts.map((t) => PREFIX + t) }) }); if (!r.ok) throw new Error("ollama embed " + r.status); return (await r.json()).embeddings; };
  async function embed(texts) { const L = await open();
    if (legacyFile && !legacy && fs.existsSync(legacyFile)) { legacy = new Map(); for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(legacyFile, "utf8")))) { const b = Buffer.from(v, "base64"); legacy.set(k, new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length))); } }
    if (legacy) for (const t of texts) if (!L.has(t)) { const v = legacy.get(sha(PREFIX + t)); if (v) L.put(t, v); }
    return L.embedAll(texts, { embedder: ollama, batch: 64, concurrency: 3 }); }
  return { embed, save: () => lib?.flush() };
}
export const cosine = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
export const normalise = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Float32Array.from(v, (x) => x / n); };
export const scoreVec = (v, cent) => cosine(v, cent.person) - cosine(v, cent.not);
/** mentionsOf({ text, sentences, cast, clauses }) -> Map ref -> [{ string, role, lemma, marked }] from the read's own structure */
export function mentionsOf({ text, sentences, cast, clauses }) {
  const T = String(text ?? ""); const off = sentences.map((s) => s.offset); const sentOf = (p) => { let a = 0, b = off.length - 1, r = -1; while (a <= b) { const m = (a + b) >> 1; if (off[m] <= p) { r = m; a = m + 1; } else b = m - 1; } return r; };
  const ov = (a, b, c, d) => a < d && c < b; const cov = (s, e, a0, a1) => ov(s, e, a0, a1) && e >= a1 - 3;
  const cl = (clauses ?? []).map((c) => ({ subj: c.subject ? [c.subject.start, c.subject.end] : null, obj: c.object ? [c.object.start, c.object.end] : null, lemma: c.predicate?.lemma ? String(c.predicate.lemma).toLowerCase() : null }));
  const out = new Map();
  for (const b of cast ?? []) { const list = []; for (const [s, e] of b.mentionSpans ?? []) { const t = sentOf(s); if (t < 0) continue; let role = null, lemma = null; for (const c of cl) { if (c.subj && cov(s, e, c.subj[0], c.subj[1])) { role = "subj"; lemma = c.lemma; break; } if (c.obj && cov(s, e, c.obj[0], c.obj[1])) { role = "obj"; lemma = c.lemma; break; } } const sent = sentences[t]; const a = s - sent.offset, z = e - sent.offset; list.push({ sentence: t, string: T.slice(s, e), role, lemma, marked: a >= 0 && z <= sent.text.length ? markFrame(sent.text, a, z) : T.slice(s, e) }); } out.set(b.ref, list); }
  return out;
}
/** the window vector of a mention at radius r: the marked sentence plus the plain neighbouring sentences within r on each side, L2-normalised (identity/novels PREREG-ROUND15 NOTE-2) */
export function windowVec(sIdx, r, markedVec, plainVecs) { const v = Float32Array.from(markedVec); for (let j = Math.max(0, sIdx - r); j <= Math.min(plainVecs.length - 1, sIdx + r); j++) { if (j === sIdx) continue; const p = plainVecs[j]; for (let k = 0; k < v.length; k++) v[k] += p[k]; } return normalise(v); }
export const RADII = Object.freeze([0, 1, 2, 4, 8]); // declared candidate radii (dmdWindow requires the caller to declare them)
