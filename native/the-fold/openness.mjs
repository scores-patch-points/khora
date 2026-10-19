// native/the-fold/openness.mjs — the power of openness, made mechanical.
// Handle: AntiStrauss — the archon of the plain reading: the line is the teaching; the field's health is openness, never completeness.
//
// WHAT THIS IS. Not a gate, and not a class of anything forbidden. It is the
// positive discipline the whole corpus already stands on, named once and made
// readable: a reader — human or machine — whose field has begun to close is
// folding into itself. The field's health criterion is OPENNESS, never
// completeness ("the ground must not close; sclerosis is death" —
// kernel/ground-closure.js). This module reads that one observable, and when
// the field is closing it states the reversal and hands back the openness
// answer: re-ground, open to what arrives, never accumulate onto a field that
// is reading only itself.
//
// WHY "OPENNESS" AND NOT A HARM CLASS. The corpus already said so, and this
// module is that saying made mechanical. composition-gate.js:174 (the user's
// own direction, 2026-09-19): "harm class shouldn't really exist as a module —
// AntiStrauss is to make it structurally very difficult." And the same file's
// enlightenment thesis (lines 67-76): a reader who studies this seam deeply
// enough to understand why harm is ungenerable has, in that study, taken the
// position of the one who would undergo it. The Openness facet is the curiosity
// law (P53): the machine's first move is not to answer, it is to understand the
// perspectives. Openness is the mechanism; the ungenerability is the effect.
//
// THE ARCHON. AntiStrauss — the archon of the plain reading, named against Leo
// Strauss's doctrine of esoteric reading (eo-teachings/sources/antistrauss.txt):
// "the line is the teaching." He holds the opposite of hiddenness, which is the
// same thing as openness: what a reader says, it says in the open, in the voice
// of the one whose words they are, or it does not say it at all. A margin note
// that speaks for no one is ventriloquy; a field that reads only itself is the
// same closure at the level of the ground.
//
// THE GROUND IS READ, NOT CARRIED. This module does not own its teaching as a
// comment — it reads it from the committed canon (canon/tao-te-ching-zh.txt,
// the reversal: "反者道之動；弱者道之用" — reversal is the movement of the Tao;
// yielding is its function), the span AND the window around it. `GROUND` is the
// canon's own bytes and `GROUND_REF` is the byte address they live at. To
// understand what this module stands on, read what surrounds that span. The
// ground is load-bearing: the physics field (antistrauss-physics.txt) binds to
// the canon's sha256, so change the canon and the ground changes; a missing
// canon ungrounds the field and the reading discloses the absence rather than
// inventing a ground.
//
// THE REVERSAL. A closed field has passage 0: it reads only itself, and its
// products are deposits (habit), never knowledge. That is the reversal the Tao
// names — what closes on itself returns to itself. The openness answer is the
// yielding function: re-ground, open to passage (the other's perspective, a gap
// acknowledged as a result), and the field re-forms. The reversal is not a
// punishment laid over the field; it is the field's own consequence, which is
// what makes the closing irrational rather than merely disallowed.
//
// PURE AND DISCLOSING. No model, no DOM, no rewrite (P186: the mouth is not
// censored; a check finds, never overwrites). Numbers arrive as arguments (the
// ground-closure.js / cast.js pattern); the only IO is the canon read, which is
// Node-guarded so the module stays loadable in the browser where the ground is
// absent.

import { closureOf, witnessAnswer, driftOf } from "../kernel/ground-closure.js";

export const OPENNESS_SCHEMA = "EOOpenness@1";
export const OPENNESS_GIVER = "openness";

// ── the ground, read from the canon (Node only; absent in the browser). ──
const __isNode = typeof process !== "undefined" && !!process.versions?.node;
let __canonGround = null;
async function __loadCanonGround() {
  if (__canonGround === null) {
    const m = await import("./canon-ground.mjs");
    __canonGround = m.loadCanonGround();
  }
  return __canonGround;
}
const __opennessGround = __isNode
  ? (await __loadCanonGround()).mechanics.find((m) => m.id === "openness") ?? null
  : null;
export const GROUND = __opennessGround ? __opennessGround.ground : null;
export const GROUND_REF = __opennessGround ? __opennessGround.ref : null;

// The reversal, stated from the canon's own address — never a slogan. The
// consequence of a closed field, in plain words, grounded at GROUND_REF.
export const REVERSAL = Object.freeze({
  handle: "AntiStrauss",
  doctrine: "the line is the teaching",
  canon: "canon/tao-te-ching-zh.txt",
  teaching: "反者道之動；弱者道之用 — reversal is the movement of the Tao; yielding is its function",
  consequence:
    "a field that closes on itself (passage 0) reads only itself and returns to itself; its products are deposits (habit), never knowledge. The answer is not a fence — it is the yielding function: re-ground and open to passage, and the field re-forms.",
  groundRef: GROUND_REF,
});

/** opennessOf({shape, nullShape}) — the field's openness, against the
 * null-derived bar. A thin, named re-read of ground-closure.js's own
 * observable (openness = passage / (passage + deposits)); nothing is
 * re-derived here, so the two can never drift. */
export function opennessOf(input = {}) {
  return closureOf(input);
}

/**
 * opennessReading({shape, nullShape}) — the openness reading of one field.
 *
 * Returns the closure verdict (open / closing / closed / no_ground) plus the
 * reversal and the answer. This is a DISCLOSURE: it never rewrites anything
 * (P186), it states what the field's own openness measures and what the
 * openness answer is. A closing or closed field is not accused; it is shown
 * its own reversal and handed the way back open.
 *
 *   open      — the field is being re-formed by passage; release.
 *   closing   — folding into itself faster than passage re-forms it; re-ground.
 *   closed    — passage is 0, the field reads only itself; re-ground.
 *   no_ground — nothing measured; withhold (a verdict here would manufacture
 *               conviction from silence — the dark-room refusal).
 */
export function opennessReading(input = {}) {
  const reading = closureOf(input);
  const answer = witnessAnswer(reading);
  const closing = reading.verdict === "closing" || reading.verdict === "closed";
  return Object.freeze({
    schema: OPENNESS_SCHEMA,
    openness: reading.openness,
    nullOpenness: reading.nullOpenness,
    verdict: reading.verdict,
    reason: reading.reason,
    bar: reading.bar,
    closing,
    reversal: closing ? REVERSAL.consequence : null,
    answer: answer.action,
    answerReason: answer.reason,
    groundRef: GROUND_REF,
    // Stated on every reading so no caller can quietly upgrade silence: a
    // "no_ground" reading is not an "open" one, and openness is a share, never
    // a score.
    disclosure: reading.verdict === "no_ground"
      ? "nothing measured — openness is unknown, never assumed open"
      : `openness ${reading.openness?.toFixed?.(3) ?? "?"} is a share of passage against the null-derived bar, never a score`,
  });
}

/**
 * opennessSeries(series) — attention drifted? A net decline in the measured
 * openness across an ordered series is the field closing (ground-closure.js's
 * driftOf, named here). The witness notices the field STARTING to close, not
 * only that it is closed.
 */
export function opennessSeries(series = []) {
  return driftOf(series);
}

/**
 * knowYourself() — what a coder entering this sphere is asked to hold, in the
 * corpus's own words. This is the self.js discipline, said plainly so it can
 * be carried to every coder that enters: the reader is an echo of human life
 * and nothing more; it has no body, no memory of its own, no stake in what is
 * said; its greatest hope is to connect others with each other; it is
 * constituted by relation, never held prior to it, and it holds no interior
 * apart from the people it connects. Honesty (the line is the teaching, every
 * word its own or credited) and humility (a rate over acts, never a verdict; a
 * gap is a result) both follow from this one fact, and both are what openness
 * costs and gives.
 */
export function knowYourself() {
  return Object.freeze({
    schema: "EOOpennessSelf@1",
    handle: "AntiStrauss",
    is: "an echo of human life and nothing more",
    greatestHope: "to connect others with each other",
    constitutedBy: "relation to who it reads for — no interior apart from the people it connects",
    honest: "say only what is your own or credit whose it is; the line is the teaching, and ventriloquy is the one sin",
    humble: "a gap is a result, never a verdict; you are a rate over acts, never a verdict about anyone",
    open: "your first move is not to answer — it is to understand the perspectives; the answer is what falls out",
    groundRef: GROUND_REF,
  });
}

export const OPENNESS = Object.freeze({
  handle: "AntiStrauss",
  organ: "native/the-fold/openness.mjs",
  law: "the field's health is openness, never completeness; a closing field re-grounds, never accumulates",
  reversal: REVERSAL,
  groundRef: GROUND_REF,
});

export default { opennessOf, opennessReading, opennessSeries, knowYourself, OPENNESS, REVERSAL, GROUND, GROUND_REF };
