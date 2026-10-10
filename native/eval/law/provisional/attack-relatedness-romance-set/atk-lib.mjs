// attack-relatedness-romance-set/atk-lib.mjs — DATA HELPERS of the attack lens (raw CoNLL-U reader with MWT ranges and PUNCT, window re-derivation, variant documents, matchers).
// NEW FILE. No probe is fitted and no AUC is computed here. Imports the scoper's and the confirmer's helpers READ-ONLY. Needs env NAME_COMPANY_PAIRBLOCK=1 before node starts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { banSet, trainFile, sha } from "../confirm-relatedness-romance-set/lib-fresh.mjs";
import { rngFor, seedFor, shuffleIn, packRow, pairsOf } from "../family-vs-relatedness/lib.mjs";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONF = path.join(HERE, "..", "confirm-relatedness-romance-set");
export const rs = (...p) => rngFor(seedFor("atk-rel", ...p));
export { trainFile, sha, pairsOf, packRow, rngFor, seedFor, shuffleIn, banSet };
export const ROM = ["cat", "fra", "glg", "ita", "por", "ron", "spa"], GER = ["afr", "dan", "deu", "eng", "nld", "nob", "swe"], PRIMARY = ["cat", "fra", "ita", "por", "spa"];
const OPEN = new Set(["NOUN", "VERB", "ADJ"]);

/** raw sentences: {words:[{id,form,upos}], ranges:[{a,b,form}]}; a sentence is kept iff it has >= 1 non-PUNCT word (same sentence indexing as family-vs-relatedness readConllu). */
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
/** the stream of one sentence under a tokenisation variant. surface: multiword-token ranges become ONE token (upos null: never a candidate); punct: PUNCT tokens kept as forms. */
export function toks(sent, { surface = false, punct = false } = {}) {
  const at = new Map(sent.ranges.map((r) => [r.a, r])), skip = new Set(); const out = [];
  if (surface) for (const r of sent.ranges) for (let id = r.a; id <= r.b; id++) skip.add(id);
  for (const w of sent.words) {
    if (surface && at.has(w.id)) { out.push([at.get(w.id).form, null]); continue; }
    if (surface && skip.has(w.id)) continue;
    if (punct === "surface") { if (!/[\p{L}\p{N}]/u.test(w.form)) continue; }   // surface rule, no gold: a token with no letter and no digit is punctuation
    else if (w.upos === "PUNCT" && !punct) continue;
    out.push([w.form, w.upos]);
  }
  return out;
}
const key = (s) => s.join(" ");
/** the confirmer's window (set A|B|C of language stem) as raw sentences, re-derived from cache/meta; verifies the text hash of the baseline tokenisation. Returns {sents, ok}. */
export function confWindow(stem, set, raw) {
  const meta = JSON.parse(fs.readFileSync(path.join(CONF, "cache", "meta", `${stem}.json`), "utf8"))[set]; if (!meta) return null;
  const ban = banSet(stem), base = raw.map((s) => s.words.filter((w) => w.upos !== "PUNCT").map((w) => w.form)), keep = [];
  base.forEach((s, i) => { if (!ban.has(key(s))) keep.push(i); });
  const rr = set === "C" ? meta.sentenceRange : [meta.sentenceRange], idx = rr.flatMap(([a, b]) => keep.slice(a, b));
  const ok = sha(idx.map((i) => key(base[i])).join("\n")) === meta.textSha256;
  return { sents: idx.map((i) => raw[i]), ok, meta, idx, keepLen: keep.length };
}
/** keep-list indexing of a raw file (after the dev/test duplicate removal of the confirmer) -> {keep, cum}. */
export function keepOf(stem, raw) {
  const ban = banSet(stem), keep = []; raw.forEach((s, i) => { if (!ban.has(key(s.words.filter((w) => w.upos !== "PUNCT").map((w) => w.form)))) keep.push(i); });
  const cum = [0]; for (const i of keep) cum.push(cum[cum.length - 1] + raw[i].words.filter((w) => w.upos !== "PUNCT").length);
  return { keep, cum };
}
/** doc for the pair builders: stream of forms and gold class per token. shuffled = within-sentence permutation. */
export function docOf(name, sents, v, shuffled = false, seedTag = "") {
  let S = sents.map((s) => toks(s, v)), F = S.map((s) => s.map((t) => t[0])), U = S.map((s) => s.map((t) => t[1]));
  if (shuffled) { const rnd = rs("shuf", seedTag, name), idx = F.map((s) => shuffleIn(s.map((_, i) => i), rnd)); F = F.map((s, k) => idx[k].map((j) => s[j])); U = U.map((u, k) => idx[k].map((j) => u[j])); }
  const n = F.length;
  return { name, stream: F, cls: (s, i) => (U[s][i] === "PROPN" ? "P" : OPEN.has(U[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) };
}
