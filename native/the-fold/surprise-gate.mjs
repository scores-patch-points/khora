// the-fold/surprise-gate.mjs — SEG·Figure + EVA·Ground: the surprise gate of
// the canonical reading sequence, called by the read that produces the weft.
//
// THE CANONICAL CYCLE ("the-canonical-cycle", content-rules) makes SURPRISE
// CONSTITUTIVE: SEG cuts the reading where its ground was most wrong and EVA
// corroborates the cut against the null. The kernel that does this is
// medium-blind (`kernel/surprise-segments.js`, Rubin) — it names no word,
// sentence or mark, and its null is built in (II.23), so a stream whose
// surprises never exceed what shuffling produces reports no figures rather
// than cutting anyway. The CALLER's instrument decides what an event is.
//
// HERE the caller's instrument is the material's own token stream: the
// reading's ground is the words it has heard, and a figure is a word the
// ground did not predict. This is the same instrument the surprise work
// validated (lowercase words → sentence ends, above chance, with no
// punctuation read). The gate is pure and synchronous; it reads no file and
// calls no model.
import { segmentBySurprise } from "../kernel/surprise-segments.js";

// The caller's instrument: the material's own word tokens, in order. Unicode
// aware; digits and internal apostrophes kept (the shape the reader's own
// tokenizers use). Nothing named, nothing filtered — a punctuation mark is not
// an event because this instrument never reads one.
const TOKEN_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
export const tokenEvents = (text) => String(text ?? "").match(TOKEN_RE) ?? [];

// DECLARED, never fitted. The kernel refuses undeclared numbers by design
// (`segmentBySurprise` throws); these are the values the surprise work used
// (order 3, alpha 0.05, 20 shuffles for the cut, minLength 3) and a caller may
// pass its own. They are declarations, not calibrated thresholds.
export const SURPRISE_DEFAULTS = Object.freeze({ order: 3, alpha: 0.05, draws: 20, seed: 1, minLength: 3, maxTokens: 3000 });

/**
 * surpriseCut(events, opts) — the SEG+EVA gate as one compact value.
 * Returns a frozen `SurpriseCut@1` carrying the cut, its null quantile, the
 * figure (boundary) count, the boundary indices and each segment's size. The
 * token arrays themselves are NOT carried — a segment's bytes are recovered
 * from the material by address, never duplicated onto the record. A stream
*  shorter than two events is a typed refusal, never a silent cut.
 *  `maxTokens` caps the stream at a DECLARED budget: the shuffled null is
 *  O(draws × stream) — unbounded it ran 60+ minutes-equivalents on a full
 *  document (measured 2026-10-08), so the gate reads the FIRST `maxTokens`
 *  events and says so (`streamCapped`) rather than pretending it read the
 *  whole. 3000 tokens keeps the evaluated null's draws (20) at ~2s per
 *  document. This mirrors the surprise work's own stated instrument ("first
 *  60000 chars" of Dracula).
 */
export function surpriseCut(events = [], { order = SURPRISE_DEFAULTS.order, alpha = SURPRISE_DEFAULTS.alpha, draws = SURPRISE_DEFAULTS.draws, seed = SURPRISE_DEFAULTS.seed, minLength = SURPRISE_DEFAULTS.minLength, maxTokens = SURPRISE_DEFAULTS.maxTokens } = {}) {
  const all = (events ?? []).map(String);
  const ev = Number.isFinite(maxTokens) && all.length > maxTokens ? all.slice(0, maxTokens) : all;
  const streamCapped = ev.length < all.length;
  if (ev.length < 2) {
    return Object.freeze({ schema: "SurpriseCut@1", stream: "tokens", events: ev.length, streamCapped, order, alpha, draws, seed, minLength, cut: 0, nullCut: 0, figures: 0, boundaries: Object.freeze([]), segmentSizes: Object.freeze(ev.length ? [ev.length] : []), refused: "too_short" });
  }
  // No fixed `alphabetSize`: the floor grows with the alphabet the ground has
  // HEARD so far (surprises()'s own growing-floor default). A fixed floor
  // counts a bootstrap first-sighting as a figure — measured (probe 2026-10-08):
  // the periodic-stream control that must cut nothing cuts one spurious
  // boundary at [3] with a fixed floor and none with the growing one.
  const seg = segmentBySurprise(ev, { order, alpha, draws, seed, minLength });
  return Object.freeze({
    schema: "SurpriseCut@1",
    stream: "tokens",
    events: ev.length,
    streamCapped,
    order, alpha, draws, seed, minLength, maxTokens,
    cut: seg.cut,
    nullCut: seg.nullCut,
    figures: seg.figures,
    boundaries: seg.boundaries,
    segmentSizes: Object.freeze(seg.segments.map((s) => s.length)),
    refused: seg.refused ?? null,
  });
}

/** The gate over a document's own bytes: tokens in, a `SurpriseCut@1` out. */
export const surpriseOfText = (text, opts) => surpriseCut(tokenEvents(text), opts);
