// eval/law/provisional/attack-relatedness-sister-dyads/lib.mjs — DATA HELPERS of the attack on rule "relatedness-sister-dyads" (raw CoNLL-U with MWT ranges, window re-derivation,
// own feature extraction, strict matcher, causal bins, transfer, dyad table). NEW FILE; imports the scoper's and the confirmer's modules READ-ONLY and edits none of them.
// It carries no test and no pre-registration: every script that computes an AUC (attackA/B/C.mjs) has its own frozen header. Needs env NAME_COMPANY_PAIRBLOCK=1 BEFORE node starts.
// Never pass "run" as argv[2] of a script that imports name-company.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE as CONF, TB, EXT, DATA_UD, WINDOW_UNITS, trainFileOf, evalTextSet, freshDoc, pairsOf, rngFor, seedFor, shuffleIn, round, mean, quantile, fitProbe, pairSample, aucOn, aucOf, sha256 } from "../confirm-relatedness-sister-dyads/fresh.mjs";
import { dyadsOf, boot, q95n, IN_SCOPE } from "../confirm-relatedness-sister-dyads/verdict.mjs";
import { genus } from "../family-vs-relatedness/groups.mjs";
import { sub } from "../family-vs-relatedness/subbranch.mjs";
import { headerHash } from "../family-vs-relatedness/lib.mjs";

export { TB, EXT, rngFor, seedFor, shuffleIn, round, mean, quantile, fitProbe, pairSample, aucOn, aucOf, sha256, dyadsOf, boot, q95n, IN_SCOPE, genus, sub, headerHash, pairsOf, freshDoc };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DATA = path.join(HERE, "data"), RES = path.join(HERE, "results");
export const STEMS = Object.keys(TB);
export const META = JSON.parse(fs.readFileSync(path.join(CONF, "data", "meta.json"), "utf8"));
export const METAB = JSON.parse(fs.readFileSync(path.join(CONF, "results", "replicate-B.json"), "utf8")).windowB;
export const rs = (...p) => rngFor(seedFor("atk-sister", ...p));
export const OPEN = new Set(["NOUN", "VERB", "ADJ"]);
export const clusterOf = (s) => sub(s) ?? null;

/** raw sentences of a CoNLL-U file: {words:[{id,form,upos}], ranges:[{a,b,form}]}; kept iff >= 1 non-PUNCT word (the sentence indexing of family-vs-relatedness readConllu). */
export function readRaw(file) {
  const sents = []; let cur = null;
  const flush = () => { if (cur && cur.words.some((w) => w.upos !== "PUNCT")) sents.push(cur); cur = null; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    if (line[0] === "#") continue;
    const f = line.split("\t"); if (f.length < 10) continue;
    cur ??= { words: [], ranges: [] };
    if (/^\d+-\d+$/.test(f[0])) { const [a, b] = f[0].split("-").map(Number); cur.ranges.push({ a, b, form: f[1].normalize("NFC").toLowerCase() }); continue; }
    if (!/^\d+$/.test(f[0])) continue;
    cur.words.push({ id: +f[0], form: f[1].normalize("NFC").toLowerCase(), upos: f[3] });
  }
  flush(); return sents;
}
export const textKey = (s) => s.words.filter((w) => w.upos !== "PUNCT").map((w) => w.form).join(" ");
/** the deduplicated sentence list of freshDoc (dedup against the scoper's dev/test text and inside the file), as raw sentences. */
export function dedupRaw(stem) {
  const raw = readRaw(trainFileOf(TB[stem])), ev = evalTextSet(stem), seen = new Set(), kept = [];
  for (const s of raw) { const t = textKey(s); if (ev.has(t) || seen.has(t)) continue; seen.add(t); kept.push(s); }
  return kept;
}
/** tokens of one raw sentence: surface=false -> UD syntactic words (PUNCT dropped), surface=true -> multiword-token ranges are ONE token (class null: never a candidate). */
export function tokens(sent, surface = false) {
  const at = new Map(sent.ranges.map((r) => [r.a, r])), skip = new Set(); const out = [];
  if (surface) for (const r of sent.ranges) for (let id = r.a; id <= r.b; id++) skip.add(id);
  for (const w of sent.words) {
    if (surface && at.has(w.id)) { out.push([at.get(w.id).form, null]); continue; }
    if (surface && skip.has(w.id)) continue;
    if (w.upos === "PUNCT") continue;
    out.push([w.form, w.upos]);
  }
  return out;
}
/** a document {name, stream, cls, block} over a slice of raw sentences. burn = fraction of units at the start whose tokens are never candidates (causal-bin burn-in). */
export function docOf(name, sents, { surface = false, shuffled = false, burn = 0, seedTag = "", noPropnLeft = false } = {}) {
  let T = sents.map((s) => tokens(s, surface)).filter((t) => t.length), F = T.map((t) => t.map((x) => x[0])), U = T.map((t) => t.map((x) => x[1]));
  if (shuffled) { const rnd = rs("shuf", seedTag, name), idx = F.map((s) => shuffleIn(s.map((_, i) => i), rnd)); F = F.map((s, k) => idx[k].map((j) => s[j])); U = U.map((u, k) => idx[k].map((j) => u[j])); }
  const n = F.length, tot = F.reduce((a, s) => a + s.length, 0); let cum = 0, s0 = 0; if (burn > 0) { for (; s0 < n; s0++) { if (cum >= burn * tot) break; cum += F[s0].length; } }
  return { name, stream: F, cls: (s, i) => (s < s0 ? null : noPropnLeft && ((i > 0 && U[s][i - 1] === "PROPN") || (i > 1 && U[s][i - 2] === "PROPN")) ? null : U[s][i] === "PROPN" ? "P" : OPEN.has(U[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)), burnSentence: s0 };
}
/** raw sentences of window A (the confirmer's) of a stem, and a check against freshDoc's stream. */
export function windowA(stem, check = true) {
  const m = META[stem], d = dedupRaw(stem), sl = d.slice(m.windowStart, m.windowEnd);
  let ok = null;
  if (check) { const fd = freshDoc(stem, TB[stem], false, m.attempt ?? 0), mine = docOf(stem, sl); ok = fd.doc.stream.length === mine.stream.length && fd.doc.stream.every((s, k) => s.join(" ") === mine.stream[k].join(" ")); }
  return { sents: sl, ok };
}
/** raw sentences of window B (the replication's) of a stem or null. */
export function windowB(stem) { const m = METAB[stem]; if (!m) return null; const d = dedupRaw(stem); return { sents: d.slice(m.range[0], m.range[1]), pairsClaimed: m.pairs }; }
