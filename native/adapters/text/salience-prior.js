// salience-prior.js — WHICH EARLIER REFERENT A PRONOUN (OR A DROPPED SUBJECT) MOST LIKELY MEANS, as a prior that says how sure it is and how often that sureness has been right.
// The owner (2026-11-24): "within a document keep the assumption of the same role unless we get signaled otherwise, and have the system aware of its confidence level", and "find where this is a more general anaphora
// concept that works so this isn't hand tooling". The general concept is SALIENCE (Centering, Grosz, Joshi & Weinstein 1995; Lappin & Leass 1994; the entity grid): a referent's grammatical role in the sentence so far and in
// the sentences before it, and how often it has been mentioned, make it more or less likely to be the one the next pronoun means. Here the weights of those factors are LEARNED, not set: a conditional-logit mention ranker
// (softmax over the candidates) over generic features only, trained on gold coreference by scripts/build-salience-prior.mjs (the file's provenance names the data, its licence and the measured results).
//   FEATURES of a candidate, crossed with the anaphor's own role (S subject, O object, X other): its role in this sentence so far, in the sentence before, in the sentence before that (S, O, X or "-" for not mentioned),
//   and the log of 1 + its mention count in that window. Roles are the reader's own: S for nsubj*, O for obj / iobj, X for the rest (roleOfDeprel below). The candidates are the CALLER's (the cast's referents with a mention in
//   the window, minus those another source rules out, e.g. the given-name prior's other gender): this prior ranks them, it does not admit them. Pure: the weights are injected.
//   One model for several languages and kinds of anaphor: weights trained on English person pronouns score Spanish / Catalan / Czech dropped subjects almost as well as weights trained there, and the reverse (see the
//   weights file's `measured.transfer`). It is NOT calibrated for "it" and a stated confidence for it is refused (`calibrated` is null where the held-out bins do not support it).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const WEIGHTS_FILE = path.join(HERE, "salience", "weights.json");
export const WINDOW = 3;             // this sentence so far, the one before, the one before that (declared with the weights)
const ROLE_INDEX = { S: 0, O: 1, X: 2, "-": 3 }, ANAPHOR_INDEX = { S: 0, O: 1, X: 2 }, PER_ANAPHOR = 13;   // 3 slots x 4 roles + the log count
/** roleOfDeprel(deprel) -> "S" | "O" | "X": the reader's grammatical role of a mention's head (UD relation label), the same reduction the weights were trained on */
export const roleOfDeprel = (deprel) => (/^nsubj/.test(deprel ?? "") ? "S" : /^(obj|iobj)/.test(deprel ?? "") ? "O" : "X");   // regex-ok: a UD relation label, not language
/** loadSalienceWeights(file) -> the SaliencePrior@1 table, or null (a typed gap: the caller says the prior is missing, it does not rank without saying so) */
export function loadSalienceWeights(file = WEIGHTS_FILE) { try { const j = JSON.parse(fs.readFileSync(file, "utf8")); return j?.schema === "SaliencePrior@1" && j.weights?.S?.length === PER_ANAPHOR ? j : null; } catch { return null; } }
/**
 * makeSaliencePrior({ table }) -> { missing, rank(query), decide(result, { level }) }
 *   rank({ anaphorRole: "S"|"O"|"X", candidates: [{ id, roles: [thisSentence, previous, twoBefore], mentions }], kind? })
 *     -> { ranked: [{ id, p, score }] best first, top: id, confidence: p of the top (the softmax), margin: top p minus second p,
 *          calibrated: { rate, of, bin } | null  (what that stated confidence has been on HELD-OUT data, from the table's bins; null where the bins do not support one: kind "it", or no bin),
 *          open: why it cannot rank | null }
 *   decide(result, { level = 0.5 }) -> { bind: boolean, id, confidence, why }   "bind above one half, otherwise ask": one half is not a tuned number, it is the point where the top is more likely than every other candidate together
 */
export function makeSaliencePrior({ table = loadSalienceWeights() } = {}) {
  const missing = !table, W = table?.weights ?? null;
  const score = (w, c) => { let s = 0; for (let j = 0; j < 3; j++) s += w[j * 4 + (ROLE_INDEX[c.roles?.[j] ?? "-"] ?? 3)]; return s + w[12] * Math.log(1 + (c.mentions ?? 0)); };
  function rank({ anaphorRole, candidates, kind = null } = {}) {
    const bad = (why) => ({ ranked: [], top: null, confidence: null, margin: null, calibrated: null, open: why });
    if (missing) return bad("no salience weights (native/adapters/text/salience/weights.json has not been built; scripts/build-salience-prior.mjs builds it)");
    if (!(anaphorRole in ANAPHOR_INDEX)) return bad(`no role for the anaphor (${anaphorRole})`);
    const cs = (candidates ?? []).filter((c) => c && c.id !== undefined); if (!cs.length) return bad("no candidates");
    const w = W[anaphorRole], sc = cs.map((c) => score(w, c)), mx = Math.max(...sc), ex = sc.map((v) => Math.exp(v - mx)), z = ex.reduce((a, b) => a + b, 0);
    const ranked = cs.map((c, i) => ({ id: c.id, p: ex[i] / z, score: sc[i] })).sort((a, b) => b.p - a.p), top = ranked[0], second = ranked[1] ?? null;
    let calibrated = null; const bins = table.measured?.calibration?.[kind === "zero" ? "zero" : "persons"];   // kind: "person" (default), "zero" (a dropped subject), "it" (refused)   // held-out bins of the stated confidence: { lo, hi, n, right }
    if (kind !== "it" && Array.isArray(bins)) { const b = bins.find((x) => top.p >= x.lo && top.p < x.hi + (x.hi >= 1 ? 1e-9 : 0)); if (b && b.n >= 20) calibrated = { rate: +(b.right / b.n).toFixed(2), of: b.n, bin: `${b.lo.toFixed(1)}-${b.hi.toFixed(1)}` }; }
    return { ranked, top: top.id, confidence: +top.p.toFixed(3), margin: +(top.p - (second?.p ?? 0)).toFixed(3), calibrated, open: null };
  }
  function decide(result, { level = 0.5 } = {}) {
    if (!result || result.open || result.top == null) return { bind: false, id: null, confidence: null, why: result?.open ?? "nothing ranked" };
    return result.confidence > level ? { bind: true, id: result.top, confidence: result.confidence, why: `the top candidate holds ${Math.round(result.confidence * 100)}% of the salience among the candidates` } : { bind: false, id: result.top, confidence: result.confidence, why: "no candidate is more likely than the rest together: ask" };
  }
  return { missing, rank, decide, table };
}
