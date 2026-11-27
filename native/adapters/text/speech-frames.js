// chat/speech-frames.js — THE MARK-FREE LAYER: words reported by a verb of saying, with no quotation marks at all.
//
// WHY. 35 of 65 Genesis editions mark no quotation ("And God said, Let there be light"), so the bracket detector (quote-frames.js) sees none of their dialogue, and the chat framed 0 of 72 verbs in the KJV text.
// Quotation marks are a typographic convention; reported speech is a structure: a verb of saying, its own phrase (subject, addressee), a separator, then what was said.
//
// HOW. It reads UD ROWS ({ id, form, lemma, upos, head, deprel, start, end }: the codec contract), so it is neutral across codecs. It does NOT trust the tree below the speech verb: on unmarked direct speech the
// parser attaches the speech inconsistently (a bare `dep`; or the speech verb hung from the quoted clause as advcl or parataxis, the head inverted), so the POSITION decides: the verb's own phrase ends where its
// non-clausal dependents end; what follows a separating comma or colon (direct), or a complementizer such as "that" (indirect), to the sentence's end, is what was said.
// The ONE language-specific input is which verbs are speech verbs. It is injected, and for English it comes from a prior (Zenodotus act-priors, VerbNet class family 37, "verbs of communication"), never a typed list.
//
// WHAT IT REFUSES TO GUESS. A clause coordinated after the speech ("Let there be light: and there was light") may be narration or may be more speech: it is marked UNKNOWN, never narration and never speech. A speech
// verb that tags a MARKED quotation has no mark-free complement (quote-frames.js holds it). A speech verb with no subject has no holder (typed null). A holder that is a pronoun is marked as one, not resolved.
// NOT DONE: a language whose speech has no separator at all (Greek "καὶ εἶπεν ὁ θεός γενηθήτω φῶς"); a speech verb the prior does not hold (it misses answer, command, swear); reported speech whose speaker is a later clause.
const CLAUSAL = new Set(["ccomp", "xcomp", "dep", "parataxis", "conj", "advcl", "csubj", "acl", "acl:relcl", "appos", "discourse", "list", "vocative"]);
const DIRECT_SEP = new Set([",", ":", ";", "—", "–", "―"]);

const kids = (rows, id) => rows.filter((r) => r.head === id);
function subtree(rows, id, seen = new Set()) { const out = []; for (const c of kids(rows, id)) if (!seen.has(c.id)) { seen.add(c.id); out.push(c, ...subtree(rows, c.id, seen)); } return out; }
// a speaker's phrase: the subject and what is part of its noun phrase; a conjunction, a punctuation mark or a subordinator the parser hung under it is not part of who spoke
const NOT_NAME = new Set(["cc", "punct", "mark"]);
const textOf = (rs) => [...rs].filter((r) => !NOT_NAME.has(r.deprel) && r.upos !== "PUNCT").sort((a, b) => a.start - b.start).map((r) => r.form).join(" ");

/**
 * speechFrames(rows, isSpeech, { quotes }) -> [{ verb: { id, form, start }, tag: [a, b], holder: { text, pronoun } | null, mode: "direct"|"indirect", complement: [a, b], known: [a, b], unknown: [[a, b], ...], partial }]
 *   rows      one sentence's UD rows; offsets in the sentence's own coordinates
 *   isSpeech  (lemma) -> bool : the prior's answer
 *   quotes    quote spans in the same coordinates; a speech verb abutting one is that quotation's tag and opens no mark-free frame
 */
export function speechFrames(rows, isSpeech, { quotes = [] } = {}) {
  const frames = [], end = Math.max(0, ...rows.map((r) => r.end));
  for (const v of rows) {
    if (v.upos !== "VERB" || !isSpeech(String(v.lemma ?? v.form).toLowerCase())) continue;
    const own = [v, ...kids(rows, v.id).filter((c) => !CLAUSAL.has(c.deprel) && c.upos !== "PUNCT").flatMap((c) => [c, ...subtree(rows, c.id)].filter((x) => x.upos !== "PUNCT"))];
    const tag = [Math.min(...own.map((r) => r.start)), Math.max(...own.map((r) => r.end))], inTag = new Set(own.map((r) => r.id));
    const after = rows.filter((r) => !inTag.has(r.id) && r.start >= tag[1]).sort((a, b) => a.start - b.start), sep = after[0];
    if (!sep || sep.start - tag[1] > 2) continue;
    if (quotes.some((q) => q.depth === 0 && ((q.close <= tag[0] && tag[0] - q.close <= 3) || (q.open >= tag[1] && q.open - tag[1] <= 4)))) continue;   // the tag of a marked quotation
    let mode = null; if (sep.upos === "PUNCT" && DIRECT_SEP.has(sep.form)) mode = "direct"; else if (sep.upos === "SCONJ" && sep.deprel === "mark") mode = "indirect";
    if (!mode) continue;
    const cs = sep.end, rest = rows.filter((r) => r.start >= cs && !inTag.has(r.id));
    if (!rest.some((r) => r.upos !== "PUNCT")) continue;
    if (mode === "direct" && rest.filter((r) => r.upos !== "PUNCT").sort((a, b) => a.start - b.start)[0]?.deprel === "cc") continue;   // ", and watered the ground": a coordinated continuation of the same sentence, not what was said
    const subj = kids(rows, v.id).find((c) => c.deprel === "nsubj"), holder = subj ? { text: textOf([subj, ...subtree(rows, subj.id)]), head: subj.form, pronoun: subj.upos === "PRON" } : null;
    // a clause coordinated into the complement may be narration or more speech: UNKNOWN
    const unknown = []; const restIds = new Set(rest.map((r) => r.id));
    for (const c of rest) if (c.deprel === "conj" && restIds.has(c.head) && rows.some((x) => x.deprel === "cc" && x.head === c.id)) { const sub = [c, ...subtree(rows, c.id)]; unknown.push([Math.min(...sub.map((r) => r.start)), Math.max(...sub.map((r) => r.end))]); }
    unknown.sort((a, b) => a[0] - b[0]);
    frames.push({ verb: { id: v.id, form: v.form, start: v.start }, tag, holder, mode, complement: [cs, end], known: [cs, unknown.length ? unknown[0][0] : end], unknown, partial: unknown.length > 0 });
  }
  return frames;
}

/** who holds the words at character position `pos`: null (narration), or { holder, mode, depth, chain, unknown } ; a position in a coordinated clause is `unknown: true` */
export function heldAt(frames, pos) {
  const within = (f) => pos >= f.complement[0] && pos < f.complement[1] + 1 && pos !== f.verb.start;
  const inKnown = frames.filter((f) => pos >= f.known[0] && pos < f.known[1]), inUnk = frames.filter((f) => f.unknown.some(([a, b]) => pos >= a && pos < b));
  const enclosing = frames.filter((f) => within(f) && (inKnown.includes(f) || inUnk.includes(f))).sort((a, b) => a.complement[0] - b.complement[0]);
  if (!enclosing.length) return null;
  const inner = enclosing[enclosing.length - 1], unknown = inUnk.includes(inner) && !inKnown.includes(inner);
  return { holder: inner.holder, mode: inner.mode, depth: enclosing.length, chain: enclosing.slice(0, -1).map((f) => ({ holder: f.holder, mode: f.mode })), unknown };
}

/** the speech-verb predicate from an act prior (Zenodotus act-priors, VerbNet): a verb is a speech verb when any class it stands in is in the communication family 37. A missing prior is a typed gap and nothing is a speech verb. */
export function speechVerbFromActPrior(prior) {
  if (!prior?.forms) return { isSpeech: () => false, gap: { gap: "no_act_prior", how: "clone scores-patch-points/Zenodotus beside khora (derived-priors/act-priors/act-prior-en.json)" } };
  const comm = (id) => { const n = String(id).split("-").pop(); return n === "37" || n.startsWith("37."); };
  // where most of a verb's readings sit decides (a single communication class among many senses does not make "go" or "dwell" a verb of saying): a CONTESTED entry is several alternative readings, so at least half of
  // them must hold a communication class; an entry with one reading lists the classes of that reading, so at least half of the classes must be communication. "At least half" is "more likely than not", not a tuned dial.
  return { gap: null, isSpeech: (lemma) => {
    const e = prior.forms[lemma]; if (!e) return false;
    if (Array.isArray(e.candidates) && e.candidates.length) return e.candidates.filter((c) => (c.classes ?? []).some(comm)).length * 2 >= e.candidates.length;
    const cls = e.classes ?? []; return cls.length > 0 && cls.filter(comm).length * 2 >= cls.length;
  } };
}

// the act prior as Zenodotus holds it, found as a sibling of this repo (ACT_PRIOR overrides); null when absent, and the caller says so (speechVerbFromActPrior(null) is the typed gap)
import fs from "node:fs";
let ACT_CACHE;
export const loadActPrior = (file = process.env.ACT_PRIOR || new URL("../../../../Zenodotus/derived-priors/act-priors/act-prior-en.json", import.meta.url).pathname) => {
  if (file === ACT_CACHE?.file) return ACT_CACHE.value;
  let value = null; try { value = JSON.parse(fs.readFileSync(file, "utf8")); } catch { value = null; } ACT_CACHE = { file, value }; return value;
};
