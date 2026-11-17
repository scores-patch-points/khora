// pronoun-presence-chosen.js — the CANONICAL dials of the presence rung (resolvePronounsByPresence, ./pronouns.js).
//
// eval/referents/PREREG-PRESENCE.md chose these on its development slice B by a stated rule ("max right subject to precision >= the shipped
// resolver's precision on B") and wrote them to eval/referents/PRESENCE-DIALS-B.json: window 3, boost 1, feed 1, floor 0, margin 0.
// (221 right / 41 wrong of 341 answerable on slice B; the shipped resolver: 17 / 5.) The diagnosis agent's dials (window 4, boost 2, floor 2,
// margin 0.3) are the CONTROL arm of that preregistration, not the chosen ones: identity/novels rounds 4-8 used them by mistake
// (LEARNING-ABOUT-LEARNING.md, entry 22). The test pins this file to PRESENCE-DIALS-B.json so the two cannot drift.
//
// Scope, stated: third-person singular he/she class only (the resolver's own class); I, you, we, it, they and relatives stay unbound.
// Status: the best-supported pronoun binding in the repo (65% right, 84% precision on GUM slice B); NOT validated on novels (no gold there).
export const PRONOUN_PRESENCE_CHOSEN = Object.freeze({ window: 3, boost: 1, feed: 1, floor: 0, margin: 0, locality: false, language: "en" });
export const PRONOUN_PRESENCE_PROVENANCE = Object.freeze({
  file: "eval/referents/PRESENCE-DIALS-B.json",
  prereg: "eval/referents/PREREG-PRESENCE.md",
  rule: "max right s.t. precision >= shipped precision on B",
  onB: Object.freeze({ answerable: 341, right: 221, wrong: 41 }),
  shippedOnB: Object.freeze({ answerable: 341, right: 17, wrong: 5 }),
});
/** A fresh copy of the dials, for readerOptions.pronounPresence or resolvePronounsByPresence. */
export const chosenPronounPresence = () => ({ ...PRONOUN_PRESENCE_CHOSEN });

// THE CANONICAL READ'S DEFAULT (2026-11-17, identity/novels PREREG-ROUND10/11, NOVELS-RESULTS-ROUND10.md, ROUND11 note): the CONTROL arm's dials, because on UD English GUM documents
// that no dial was tuned on (slices E, C, D, F: 125 documents, 1,299 answerable pronouns) they bind about half the answerable pronouns at about 0.69 precision, where the CHOSEN dials bind ~80% at
// ~0.55 (0.36 on the last untouched slice; 0.49 on fiction), and a random assignment gives ~0.5. The extra bindings the chosen dials add are right about half the time: they are the guesses the
// rule "leave a pronoun unbound rather than guess" exists to refuse. PROVISIONAL: on the confirmation slice F alone the preregistered test (control > chosen, document-cluster interval excludes 0)
// did NOT hold ([-0.037, 0.577]; pooled over the four slices, post hoc, [-0.016, 0.292]); control wins 3 of 4 slices and 23 of 39 documents where they differ. One line reverts it: use chosenPronounPresence().
export const PRONOUN_PRESENCE_DEFAULT = Object.freeze({ window: 4, boost: 2, feed: 1, floor: 2, margin: 0.3, locality: false, language: "en" });
export const PRONOUN_PRESENCE_DEFAULT_PROVENANCE = Object.freeze({
  source: "the control arm of eval/referents/PREREG-PRESENCE.md (the diagnosis agent's dials), selected by identity/novels PREREG-ROUND10/11 on GUM slices E, C, D, F",
  heldOut: Object.freeze({ documents: 125, answerable: 1299, controlPrecision: 0.689, chosenPrecision: 0.547, controlCoverage: 0.51 }),
  status: "provisional: the preregistered confirmation (H1) did not hold on slice F alone; see NOVELS-RESULTS-ROUND10.md",
});
/** The dials of the canonical read: a fresh copy. */
export const defaultPronounPresence = () => ({ ...PRONOUN_PRESENCE_DEFAULT });
