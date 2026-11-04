# Addendum A1 to PREREG-ATTENTION.md — written before PARA-GOLD is scored; changes no bar

Requested by the paraphrase-equivalency session (via "Fold MVP scope"): the binder is a SEPARATE, SWITCHABLE input, default OFF.
- `native/adapters/text/attention-switch.js::attendedBindingsFor(entry, { enabled })` returns null unless `enabled === true`. Nothing existing calls it.
- **G3**: no file outside `attention-*`, `eval/` imports the binder or the switch (`gates.mjs`).
- **G2a** now also requires `native/the-fold/corpus-session.js` and `native/kernel/eot-claim-match.js` to be byte-identical to base `15f82fc` (they carry another session's uncommitted edits elsewhere; this clone never touches them).
- `DEV-RESULT.md` (the sweep and the dev scores the pre-registration cites) is committed alongside.
Bars P1–P3, K1, G1, G2 are unchanged.
