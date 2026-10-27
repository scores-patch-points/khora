// ledger-opinion.js — WHERE AN OPINION IS FILED IN THE REFERENT LEDGER, and the classes of pair the mechanics leave open (2026-10-27).
//
// The user's direction (claude-ring-39, reading-rules-audit/THE-OPINION-LIMIT.md): a language model may take part in the reasoning only as an OPINION that is itself processed into the fold and is
// auditable: its holder is `self:model:<id + digest>`, its lens the sha256 of the prompt, it is supersedable, it NEVER licenses (experience nominates, a named giver licenses), and any answer that
// depended on one carries `opinionDependent`. The identity seat is the ledger (reading-referents.js): where the mechanics leave two mentions open, a model may file one.
//
// THE SLOT. An opinion is an EVA event: Relate, Significance; site Lens, stance Binding. It is not a SYN and not a CON. reading-timeline.js::foldLog applies SYN (an alias) and CON (an assignment) and
// ignores every other op, so appending any number of opinions to a ledger's log changes no referent, no mention and no assignment: an opinion cannot license BY CONSTRUCTION, not by a flag a reader must
// remember to honour. (`licensing: false` rides the event as a record, and the builder refuses a caller who passes true.) A giver that agrees files its own SYN or CON with `ratifies: <opinion id>`; that
// is the only road from an opinion to the fold's state, and it is not in this file.
//
//   opinionEvent({ about, verdict, holder, lens, frame, supersedes, dependsOn, chose })   → the event, or a TypeError naming what is missing
//   retractOpinion({ of, by, why })                                                        → an event that supersedes (a retraction is an event, never an edit)
//   currentOpinions(log)                                                                   → the opinions no later event supersedes, in order
//   markOpinionDependent(answer, opinionIds)                                               → { ...answer, opinionDependent: true, opinions }
//   classifyPair(a, b, ctx)                                                                → which class of pair, mechanically (UNDECIDED, DIFF_SPLIT, SAME_FORM, SAME_VARIANT, DIFF_SHARED, DIFF_DISJOINT)
//
// Pure; imports only the page-safe hash (the reader's import graph must stay free of node:).
import { sha256hex } from "./sha256hex.js";

export const OPINION_SCHEMA = "LedgerOpinion@1";
export const VERDICTS = Object.freeze(["same", "different", "undecided", "refused"]);
/** the cell of an opinion: EVA at Lens / Binding. The test pins it against reading-timeline.js's isCoherent (this file may not import that one: it reaches node:fs). */
export const OPINION_CELL = Object.freeze({ op: "EVA", site: "Lens", stance: "Binding" });

const canon = (x) => JSON.stringify(x, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));
const h16 = (x) => sha256hex(canon(x)).slice(0, 16);
const SHA256 = /^[0-9a-f]{64}$/;
const HOLDER = /^self:model:\S+$/;

/**
 * File an opinion. `about` is { spans: [spanA, spanB] } (a pair of mentions, as ledger span ids) or { span, candidates: [ref, …] } (one mention and the referents it might be bound to). `verdict` is one of
 * VERDICTS; for a mention, `same` needs `chose`, a ref among `candidates`. `holder` is `self:model:<id + digest>`; `lens` the prompt's sha256; `frame` where and for whom it was asked (asof, purpose, whom).
 * @throws {TypeError} naming the missing or wrong field. An opinion is never defaulted into existence.
 */
export function opinionEvent({ about, verdict, holder, lens, frame = null, supersedes = null, dependsOn = [], chose = null, licensing = false, source = null } = {}) {
  if (licensing) throw new TypeError("an opinion never licenses: it nominates, and only a named giver's own SYN or CON with ratifies licenses");
  if (typeof holder !== "string" || !HOLDER.test(holder)) throw new TypeError("an opinion needs a holder of the form self:model:<id + digest>");
  if (typeof lens !== "string" || !SHA256.test(lens)) throw new TypeError("an opinion needs a lens that is the sha256 (64 hex) of the prompt it answered");
  if (!VERDICTS.includes(verdict)) throw new TypeError(`an opinion's verdict is one of ${VERDICTS.join(", ")}`);
  const pair = Array.isArray(about?.spans) && about.spans.length === 2 && about.spans.every((s) => typeof s === "string" && s);
  const mention = typeof about?.span === "string" && about.span && Array.isArray(about.candidates) && about.candidates.length > 0;
  if (!pair && !mention) throw new TypeError("an opinion is about a pair of spans ({ spans: [a, b] }) or a span and its candidate referents ({ span, candidates })");
  if (mention && verdict === "same" && !about.candidates.includes(chose)) throw new TypeError("a mention's `same` verdict names the candidate it chose");
  const body = { schema: OPINION_SCHEMA, ...OPINION_CELL, kind: "opinion", about, verdict, ...(chose ? { chose } : {}), holder, lens, frame, supersedes, dependsOn: [...dependsOn], licensing: false, opinionDependent: true, source };
  return { id: `evt_${h16(body)}`, ...body };
}

/** A retraction is an event, not an edit: it supersedes the opinion it withdraws, by a giver, a rule, gold or the holder, with a reason. */
export function retractOpinion({ of, by, why } = {}) {
  if (typeof of !== "string" || !of) throw new TypeError("a retraction names the opinion it withdraws");
  if (typeof by !== "string" || !by) throw new TypeError("a retraction names who withdraws it");
  if (typeof why !== "string" || !why) throw new TypeError("a retraction says why");
  const body = { schema: OPINION_SCHEMA, ...OPINION_CELL, kind: "opinion-retraction", supersedes: of, by, why, licensing: false };
  return { id: `evt_${h16(body)}`, ...body };
}

/** The opinions no later event supersedes (retracted and replaced ones are gone from the current view, and stay in the log). */
export function currentOpinions(log = []) {
  const dead = new Set(log.map((e) => e?.supersedes).filter(Boolean));
  return log.filter((e) => e?.kind === "opinion" && !dead.has(e.id));
}

/** An answer that read an opinion says so, and names it; the pooled evidence counts never include it. */
export const markOpinionDependent = (answer, opinionIds) => ({ ...answer, opinionDependent: true, opinions: [...opinionIds] });

// ── the classes of pair: which decisions the mechanics make, and on what evidence ───────────────────────────────────────────────────────────────────────────────
const fold = (s) => String(s ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/** the name tokens of a spelling, folded */
export const nameTokens = (text) => fold(text).split(" ").filter(Boolean);

/**
 * The class of a pair of mentions by what the mechanics did with it. `a` and `b` are { label, text }: the ledger referent (or null if unbound) and the mention's spelling. `ctx`:
 *   unearned  Set of ledger referent ids the ledger filed referent_merge_unearned on (the merge is unearned, so a pair inside it is open)
 *   split     Map of ledger referent id → the plain being it was split from (two parts of one being, separated by a typed referent_split)
 * Mutually exclusive and exhaustive; the first that holds.
 */
export function classifyPair(a, b, { unearned = new Set(), split = new Map() } = {}) {
  if (a.label == null || b.label == null) return "UNDECIDED";
  if (a.label === b.label) {
    if (unearned.has(a.label)) return "UNDECIDED";
    return fold(a.text) === fold(b.text) ? "SAME_FORM" : "SAME_VARIANT";
  }
  if (split.has(a.label) && split.get(a.label) === split.get(b.label)) return "DIFF_SPLIT";
  const tb = new Set(nameTokens(b.text));
  return nameTokens(a.text).some((t) => tb.has(t)) ? "DIFF_SHARED" : "DIFF_DISJOINT";
}
export const PAIR_CLASSES = Object.freeze(["UNDECIDED", "DIFF_SPLIT", "SAME_FORM", "SAME_VARIANT", "DIFF_SHARED", "DIFF_DISJOINT"]);
/** the classes whose decision rests on spelling evidence alone, or on none: the pairs a verdict has not been earned for */
export const CONTESTABLE = Object.freeze(["UNDECIDED", "SAME_VARIANT", "DIFF_SHARED"]);
