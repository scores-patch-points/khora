// case-marked-clauses.js — the CHOMSKY seam as the canonical clause source for a case-marked, pro-drop language (grc, san).
//
// The English-first core reads clauses by position and found none in Greek or Sanskrit (0 clauses). Role there is carried by CASE (the nominative is the subject, the accusative the object) and by the verb's own
// agreement (a finite verb with no nominative is a null subject). This adapter runs the recovered seam (./greek-seam.js: greekClauses, confirmedVerbSet, paradigmOf) over the sentences with the language's own priors
// (pos-<stem>.json and case-marking-<stem>.json through the-fold/prior-source.mjs) and returns clauses in the reader's shape: { sentence, subject: { start, end, text, case }, object, dative, predicate: { lemma, surface },
// nullSubject, person, number, source }. Offsets are absolute in the read text. `rolesFor(clauses)` turns them into the option the pronoun rung takes (pronouns.js `roles`).
// A language without both priors has no reader here: null, and the read keeps the clauses it had (a typed gap rides the entry). No word list, no model. Status: EXPERIMENTAL (identity/novels PREREG-ROUND19).
import { priorJson } from "../../the-fold/prior-source.mjs";
import { confirmedVerbSet, greekClauses, paradigmOf } from "./greek-seam.js";
export const CASE_MARKED_STEMS = Object.freeze(new Set(["grc", "san"]));
const cache = new Map();
export function caseMarkedReaderFor(stem) {
  if (!CASE_MARKED_STEMS.has(stem)) return null;
  const pos = priorJson(`pos-${stem}.json`), cas = priorJson(`case-marking-${stem}.json`); if (!pos || !cas) return { gap: { gap: "no_case_marked_priors", stem, detail: `pos-${stem}.json or case-marking-${stem}.json absent: no case-marked clause reader` } };
  const key = stem + "|" + (pos.provenance?.giver ?? "") + "|" + (cas.provenance?.giver ?? ""); if (cache.has(key)) return cache.get(key);
  const verbs = confirmedVerbSet(pos);
  const arg = (a, off, role) => (a?.at ? { start: off + a.at[0], end: off + a.at[1], text: a.head, case: a.case ?? null, caseSrc: a.caseSrc ?? null, role } : null);
  const reader = {
    stem,
    clausesOf(sentences) {
      const out = [];
      for (const s of sentences ?? []) {
        let cl = []; try { cl = greekClauses(String(s.text ?? ""), verbs, pos, cas, {}) ?? []; } catch { cl = []; }
        for (const c of cl) {
          const para = paradigmOf(c.verb, cas, {}) ?? null;
          out.push({ sentence: s.order ?? 0, subject: arg(c.subject, s.offset ?? 0, "subj"), object: arg(c.object, s.offset ?? 0, "obj"), dative: arg(c.dative, s.offset ?? 0, "dat"), predicate: { lemma: String(c.verb ?? "").toLowerCase(), surface: c.verb }, nullSubject: !c.subject, person: para?.person ?? null, number: para?.number ?? null, source: "case-marked" });
        }
      }
      return out;
    },
  };
  cache.set(key, reader); return reader;
}
/** rolesFor(clauses, { coArgument }) -> the pronoun rung's `roles`: subject spans, and per clause the argument spans (for the co-argument rule) */
export function rolesFor(clauses, { coArgument = false } = {}) {
  const subjects = [], args = [];
  for (const c of clauses ?? []) { if (c.subject) subjects.push([c.subject.start, c.subject.end]); const a = [c.subject, c.object, c.dative].filter(Boolean).map((x) => [x.start, x.end]); if (a.length) args.push(a); }
  return { subjects, clauses: args, coArgument };
}
