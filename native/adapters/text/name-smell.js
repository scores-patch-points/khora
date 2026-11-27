// adapters/text/name-smell.js — DOES A SURFACE SMELL LIKE A NAME? A weighted evidence model; the answer is a probability, never a veto.
//
// WHY WEIGHTS. A cascade of hard rules ("a closed-class word is never a name", "a word that is ever lowercase is never a name") breaks on casual speech and typos: in a chat message every name is lowercase, a typo makes a
// name unattested, and no rule can be outvoted by strong contrary evidence. So every signal here is a WEIGHT on a log-odds score, the weights are LEARNED (native/scripts/fit-name-smell.mjs, on weak labels from the treebank-derived
// prior, over novels held out from the test texts), and the output is p = sigmoid(logit). A consumer chooses what to do with p (rank it, gate it at "more likely than not", or keep it as a weight on the referent).
//
// THE SIGNALS (each contributes weight * feature to the logit; the contributions are returned so a reader can see why):
//   mid     capitalised away from a sentence start vs the same word lowercase:  r * (capMid - lower) / (capMid + lower + 1)
//   init    capitalised ONLY where a sentence begins:                            r * [capMid = 0 and capInitial > 0]
//   tag     the parser's own tag for the token in context:                       (nPROPN - nOther) / (nTagged + 1), over every occurrence in any case
//   repeat  how often it recurs (names recur):                                   min(1, log(1 + n) / log(9))     [ABLATED AWAY: on the independent gold it credibly hurts lowercase text, so the fitted weight is 0]
//   prior   a BAYESIAN OFFSET, not a rule: what the treebank says this word type usually is, as log-odds against the base rate, smoothed by pseudo-counts so one sighting counts for little and 900 for a lot.
//           A pronoun the prior has seen 900 times is almost never a name; one it has seen twice can be, if the text says so. An unattested word contributes 0 (no evidence is not a vote).
//   r       CASING RELIABILITY of the document, measured from its own sentence starts (the share that are capitalised). It scales mid and init: in lowercase chat r is about 0 and the casing signals fall silent, so the
//           tag, the repetition and the prior decide. In ordinary prose r is about 1.
// An all-caps token ("LORD") is its own word: lowercase "lord" is not counted against it (the same feature, defined in context, not a branch). A title with its name is judged on the name; a bare "Mr." scores as the name-like token it is, and joining a title to the
// name that follows is the CAST BUILDER's job, not a special case here.
// ONE JOINT MODEL, so evidence STACKS: the signals share one logit, so agreeing evidence raises the certainty and conflicting evidence lowers it, and the posterior covariance from the fit (Laplace) gives every answer a standard deviation
// and a certainty = |logit| / sd. That covariance collapses as the fit sees more evidence (largest eigenvalue 1.26 at 60 samples, 0.044 at 1,496: native/scripts/ablate-name-smell-loto.mjs).
// KNOWN LIMITS: a person whose name is also a common word the same text uses lowercase ("Rose"/"rose") is pulled down, softly, not lost; a name seen once in a text with no tags and no prior stays near the base rate.
// nameSmell({ surface, text, sentenceStarts, pos, posAt, weights }) -> { p, logit, sd, certainty, contributions, features, evidence, priorGap?, uncertaintyGap? } | { p: null, gap }
//   sentenceStarts  Set of character offsets where sentences start: the READER's own (entry.parse[].offset); sentenceStartsOf() is a naive fallback that knows no abbreviation
//   pos             the part-of-speech prior's forms: lowercase form -> { UPOS: count }  (janus/priors/pos-eng.json)
//   posAt           optional Map(character offset -> UPOS): the reader's own tag for the token in context
//   weights         { intercept, w: { mid, init, tag, repeat }, prior: { pseudo, base } }; omitted, the fitted file name-smell/name-smell-eng.json is read, and its absence is a typed gap
import fs from "node:fs";
export const NAME_SMELL_SCHEMA = "NameSmell@2";
export const WEIGHTS_FILE = new URL("./name-smell/name-smell-eng.json", import.meta.url).pathname;
export const sigmoid = (x) => 1 / (1 + Math.exp(-x));
export const logit = (p) => Math.log(p / (1 - p));
const OPENING = "“«„‘\"'(";
const isLetter = (c) => c !== undefined && c.toLowerCase() !== c.toUpperCase();
const isUpper = (c) => isLetter(c) && c === c.toUpperCase();

const CACHE = new Map();
export function loadWeights(file = WEIGHTS_FILE) { if (CACHE.has(file)) return CACHE.get(file); let w = null; try { w = JSON.parse(fs.readFileSync(file, "utf8")); } catch { w = null; } CACHE.set(file, w); return w; }

/** a naive fallback: the start, each paragraph start, and the first non-space after . ! ? (no abbreviation knowledge: pass the reader's own offsets when there are any) */
export function sentenceStartsOf(text) {
  const t = String(text ?? ""), out = new Set([0]);
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "\n" && t[i + 1] === "\n") { let j = i + 2; while (t[j] === "\n" || t[j] === " ") j++; out.add(j); }
    if (".!?".includes(t[i]) && (t[i + 1] === " " || t[i + 1] === "\n" || OPENING.includes(t[i + 1] ?? ""))) { let j = i + 1; while (t[j] === " " || t[j] === "\n") j++; out.add(j); }
  }
  return out;
}

/** the share of sentence starts whose first letter is capitalised (ignoring starts with no cased letter): 1 for ordinary prose, about 0 for a lowercase chat message */
export function casingReliability(text, starts) {
  const t = String(text ?? ""); let cased = 0, up = 0;
  for (const s of starts ?? []) { let i = s; while (i < t.length && OPENING.includes(t[i])) i++; const c = t[i]; if (isLetter(c)) { cased++; if (isUpper(c)) up++; } }
  return cased ? up / cased : 0;
}

const occurrences = (t, lt, w, exact) => { const at = [], needle = exact ? w : w.toLowerCase(), hay = exact ? t : lt; let i = hay.indexOf(needle); while (i >= 0) { if (!isLetter(t[i - 1]) && !isLetter(t[i + w.length])) at.push(i); i = hay.indexOf(needle, i + 1); } return at; };

export function nameSmell({ surface, text, sentenceStarts, pos, posAt, weights, weightsFile }) {
  const W = weights ?? loadWeights(weightsFile); if (!W) return { schema: NAME_SMELL_SCHEMA, surface, p: null, gap: "no_name_smell_weights", how: "run native/scripts/fit-name-smell.mjs, or pass weights" };
  const T = String(text ?? ""), words = String(surface ?? "").trim().split(" ").filter(Boolean), head = words[words.length - 1] ?? "";
  if (!head) return { schema: NAME_SMELL_SCHEMA, surface, p: null, gap: "no_surface" };
  const finish = (contributions, features, evidence, extra = {}) => {
    const lg = W.intercept + Object.values(contributions).reduce((a, b) => a + b, 0);
    // the logit's standard deviation from the fit's posterior covariance (the prior offset is a constant and adds none): v' C v with v = [1, the features in the covariance's own order]
    let sd = null, certainty = null, uncertaintyGap = null;
    if (W.cov) { const order = W.covOrder ?? ["intercept", "mid", "init", "tag", "repeat"], v = order.map((k) => (k === "intercept" ? 1 : features[k] ?? 0)); let q = 0; for (let i = 0; i < v.length; i++) for (let j = 0; j < v.length; j++) q += v[i] * W.cov[i][j] * v[j]; sd = Math.sqrt(Math.max(0, q)); certainty = sd > 0 ? Math.abs(lg) / sd : Infinity; } else uncertaintyGap = "no_covariance";
    return { schema: NAME_SMELL_SCHEMA, surface, head, p: sigmoid(lg), logit: lg, sd, certainty, contributions, features, evidence, ...(uncertaintyGap ? { uncertaintyGap } : {}), ...extra };
  };
  const lw = head.toLowerCase(), allCaps = head.length > 1 && head === head.toUpperCase(), LT = T.toLowerCase();
  const at = occurrences(T, LT, head, allCaps), starts = sentenceStarts ?? sentenceStartsOf(T);
  if (!at.length) return { schema: NAME_SMELL_SCHEMA, surface, head, p: null, gap: "not_in_text" };
  const isInitial = (i) => starts.has(i) || (OPENING.includes(T[i - 1] ?? "") && starts.has(i - 1));
  const cap = at.filter((i) => isUpper(T[i])), capInitial = cap.filter(isInitial).length, capMid = cap.length - capInitial, lower = allCaps ? 0 : at.length - cap.length;
  const r = casingReliability(T, starts), tags = posAt ? at.map((i) => posAt.get(i)).filter(Boolean) : [], nProp = tags.filter((u) => u === "PROPN").length;
  const features = { mid: r * (capMid - lower) / (capMid + lower + 1), init: r * (capMid === 0 && capInitial > 0 ? 1 : 0), tag: tags.length ? (nProp - (tags.length - nProp)) / (tags.length + 1) : 0, repeat: Math.min(1, Math.log(1 + at.length) / Math.log(9)) };
  const contributions = { mid: W.w.mid * features.mid, init: W.w.init * features.init, tag: W.w.tag * features.tag, repeat: W.w.repeat * features.repeat, prior: 0 };
  let priorGap = null, prior = null; const e = pos ? pos[lw] : undefined;
  if (!pos) priorGap = "no_pos_prior"; else if (e) { const n = Object.values(e).reduce((a, b) => a + b, 0), a = W.prior.pseudo, base = W.prior.base, s = ((e.PROPN ?? 0) + a * base) / (n + a); contributions.prior = logit(s) - logit(base); prior = { n, propn: e.PROPN ?? 0, top: Object.entries(e).sort((x, y) => y[1] - x[1])[0][0] }; }
  return finish(contributions, features, { capMid, capInitial, lower, reliability: r, tagged: tags.length, ...(prior ? { prior } : {}) }, priorGap ? { priorGap } : {});
}
