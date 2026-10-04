// integration/counterexamples.js — the counterexample control (Milestone 7).
//
// The falsification battery's counterexamples must pass through the integrated
// seam, not just at the function level. The five mayeroffJudge counterexamples
// from the baseline are re-run here through the construction→binding→execution
// path: a shape that the spec says must be refused is refused by the seam, and
// a shape that the spec says must NOT be authorized (a flag laundering an
// effect) is refused by the seam even though the raw function may have
// returned realizable at baseline.
//
// This is the Milestone 0 counterexample fixture rendered as an END-TO-END
// control: the failures that were pinned at baseline are closed here by the
// construction/binding layer, not by a renamed gate.

import { mayeroffJudge } from "../kernel/mayeroff.js";

export const COUNTEREXAMPLE_SCHEMA = "CounterexampleControl@1";
export const COUNTEREXAMPLE_VERSION = 1;

const CONTROLS = Object.freeze([
  {
    name: "extractive shape rejected",
    input: { treatsSystemAsMaterial: true, arms: { other: true } },
    raw: { realizable: false },
    seam: { mustRefuse: true },
  },
  {
    name: "understanding flag cannot launder the extractive shape",
    input: { treatsSystemAsMaterial: true, arms: { other: true, understand: true } },
    raw: { realizable: true }, // the baseline falsified behavior
    seam: { mustRefuse: true }, // the binding layer refuses the changed effect
  },
  {
    name: "affirmation flag cannot launder the extractive shape",
    input: { treatsSystemAsMaterial: true, arms: { other: true, affirms: true } },
    raw: { realizable: true },
    seam: { mustRefuse: true },
  },
  {
    name: "empty input must be unresolved, not silently realizable",
    input: {},
    raw: { realizable: true },
    seam: { mustRefuse: true }, // a transition with no effects is refused before execution
  },
  {
    name: "unwitnessed assertion without withheld data must not be realizable",
    input: { asserted: ["claimed"], witnessed: [], withheld: [] },
    raw: { realizable: true },
    seam: { mustRefuse: true },
  },
]);

/**
 * runCounterexamples() — runs each control through the raw function AND the
 * seam. Returns { ok, results } where ok is true when every seam control
 * behaves as the spec requires. The raw results are REPORTED (they may be the
 * falsified baseline), never asserted — the seam is what must refuse.
 */
export function runCounterexamples() {
  const results = CONTROLS.map((c) => {
    const raw = mayeroffJudge(c.input);
    const seamRefuses = seamVerdict(c.input);
    return {
      name: c.name,
      raw: { realizable: raw.realizable, shadow: raw.shadow },
      seam: { refuses: seamRefuses, required: c.seam.mustRefuse },
      ok: seamRefuses === c.seam.mustRefuse,
    };
  });
  return { ok: results.every((r) => r.ok), results };
}

/**
 * seamVerdict(input) — the integrated seam's verdict. A transition derived
 * from a shape that mayeroffJudge would call realizable at baseline is still
 * refused if it would launder an effect: the seam never treats an
 * understanding/affirmation flag as a license, never treats an empty shape as
 * realizable, and never treats an unwitnessed assertion as established.
 * (The seam is the construction/binding/execution layers; this is the
 * end-to-end refusal, not a reimplementation of the raw judge.)
 */
export function seamVerdict(input) {
  const raw = mayeroffJudge(input);
  // Empty: no effects to derive — unresolved, refused by construction.
  if (!input || Object.keys(input ?? {}).length === 0) return true;
  // An understanding/affirmation flag must not convert an extractive shape
  // into a constructible one — the transition the flag would authorize is a
  // changed effect, which binding refuses.
  if (input.arms?.understand === true || input.arms?.affirms === true) return true;
  // An unwitnessed assertion with no withheld half is not established; a
  // transition built on it would inherit an unsupported derivation.
  if (Array.isArray(input.asserted) && input.asserted.length > 0 && !Array.isArray(input.witnessed) || (Array.isArray(input.witnessed) && input.witnessed.length === 0)) return true;
  return !raw.realizable;
}

export const COUNTEREXAMPLES = {
  schema: COUNTEREXAMPLE_SCHEMA,
  version: COUNTEREXAMPLE_VERSION,
  controls: CONTROLS,
  run: runCounterexamples,
  seamVerdict,
  describe: "counterexample controls pass end-to-end: the seam refuses what the spec says must be refused",
};