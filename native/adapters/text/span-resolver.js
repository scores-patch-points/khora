// span-resolver.js — the prediction layer: a span is resolved by the kāraka DAG, and the look/sound
// cues CONFIRM the prediction. This is the "20 questions" narrowing made explicit: each constraint is
// a difference-that-makes-a-difference, and the word is what survives the contention.
//
//   candidates = looks-right (jumble + one-edit) ∪ sounds-right (homophone)   [the confirmation cues]
//   survivors  = candidates ∩ fits-role                                       [the kāraka slot's expected class]
//   one survivor -> the prediction (claimed); many -> ambiguous (disclosed); none -> abstain.
//
// The role is the DECIDER, not a cue: it is the kāraka slot the span fills (agent, patient, predicate,
// …), and it votes which word CLASS may sit there. "rite" sounds like both "right" and "write", but a
// predicate slot admits only a VERB, so the DAG narrows it to "write"; a patient slot admits a NOUN and
// narrows it to "right". The DMD trace records which cue admitted how many candidates and which role
// filter cut them — the "difference" each constraint made is named, never hidden.
import { makeFormRecovery } from "./form-recovery.js";
import { makeSoundMatch } from "./sound-match.js";

export const RESOLVER_SCHEMA = "SpanResolver@1";

// DECLARED, not measured: which word classes may fill each role. The kāraka arguments are nominal (the
// doer, the done-to, the tool, the recipient, the source, the locus are things, not actions); the
// predicate is verbal; the grammatical slots (adposition, determiner, conjunction) are a third kind.
// This is a translation like THRAX_MAP — a hypothesis falsifiable by a language where a role admits a
// class this map forbids.
export const ROLE_CLASS = Object.freeze({
  predicate: ["VERB", "AUX"],
  kartṛ: ["NOUN", "PROPN", "PRON"],
  karman: ["NOUN", "PROPN", "PRON"],
  karaṇa: ["NOUN"],
  sampradāna: ["NOUN", "PROPN", "PRON"],
  apādāna: ["NOUN", "PROPN"],
  adhikaraṇa: ["NOUN", "PROPN"],
  kāla: ["NOUN", "ADV"],
  hetu: ["NOUN"],
  prayojana: ["NOUN", "VERB"],
  function: ["ADP", "DET", "CCONJ", "SCONJ", "PART"],
});

export function makeResolver({ forms, sound = null } = {}) {
  if (!forms || typeof forms !== "object" || Array.isArray(forms)) throw new TypeError("makeResolver: the prior's forms map is required");
  const recovery = makeFormRecovery({ forms });
  const soundMatch = sound || makeSoundMatch({ forms });

  const fitsRole = (word, classes) => {
    const counts = forms[word];
    if (!counts) return false;
    return classes.some((c) => c in counts);
  };

  return {
    /** resolve({ surface, role }) -> { surface, role, claimed, method, nearest, reason, candidates, survivors, dmd }.
     *  role is a kāraka name ("kartṛ", "karman", …), "predicate", or "function" (see ROLE_CLASS). */
    resolve({ surface, role } = {}) {
      const s = String(surface ?? "").toLowerCase();
      if (!s) return { surface: s, role, claimed: false, method: null, nearest: null, reason: "empty", candidates: [], survivors: [], dmd: [] };
      if (forms[s]) return { surface: s, role, claimed: true, method: "known", nearest: s, reason: null, candidates: [s], survivors: [s], dmd: [] };

      const jumble = recovery.recoverJumble(s).matches ?? [];
      const look = recovery.nearForms(s, 1);
      const homophones = soundMatch.homophones(s);
      const union = [...new Set([...jumble, ...look, ...homophones])];
      const dmd = [{ step: "confirmation", admitted: union.length, jumble: jumble.length, oneEdit: look.length, homophone: homophones.length }];

      const classes = ROLE_CLASS[role];
      const survivors = classes ? union.filter((w) => fitsRole(w, classes)) : union;
      if (classes) dmd.push({ step: `role:${role}`, kept: survivors.length, classes });

      if (survivors.length === 1) return { surface: s, role, claimed: true, method: "predict", nearest: survivors[0], reason: null, candidates: union, survivors, dmd };
      if (survivors.length > 1) return { surface: s, role, claimed: false, method: null, nearest: null, reason: "ambiguous", candidates: union, survivors, dmd };
      return { surface: s, role, claimed: false, method: null, nearest: null, reason: "no-survivor", candidates: union, survivors, dmd };
    },
  };
}
