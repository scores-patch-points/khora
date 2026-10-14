// organs/grain.js — the fold's two steps: SELECT the grain from where the reader stands, then RUN the triad at that grain.
//
// The user's specification, 2026-10-14 (a message to the Callimachus session; this file is its first transcription):
//
//   Same four inputs every time (U, W, Q, N). Q activates a region R of U. Split R against W into HELD spans H (a match in the
//   reader's state) and ABSENT spans A. Distance is the share of A, with a shuffle null so "held" means more than vocabulary overlap.
//   Mostly A: Ground. Mixed: Figure. Mostly H: Pattern. Then each held span goes through the corroboration verdict — AGREE / SINGLE /
//   UNDETERMINED / DISAGREE / CONTRADICTED — between U and W instead of between witnesses. At the selected grain all three modes run, in
//   order clear → witness → generate; a fold that skips one is unclosed. Output form is identical in all nine: addressed spans
//   interleaved with flagged seams.
//
//     GROUND   clear: Clearing    witness: Tending     generate: Cultivating
//     FIGURE   clear: Dissecting  witness: Binding     generate: Making
//     PATTERN  clear: Unraveling  witness: Tracing     generate: Composing
//
// WHAT IS REUSED. `mergeTestimony` (capacity-runner.js) is the verdict, unchanged, pointed across the two corpora: the claim under test
// is a W span, the witnesses are U's spans on the same arrangement, each a reading { verdict: holds | refused | undetermined, read:
// [its address] }. `seg`/`sentence` (prose-laws.js) type the output; `seamReport` (seam-ledger.js) measures it.
//
// WHAT IS DECIDED HERE, and disclosed (not measured; each is owed a null or a measurement):
//   1. The cut between FIGURE and PATTERN is the house majority rule ("more than not"), H > A. The cut between GROUND and the rest is
//      born: H must beat EVERY draw of the shuffle null (p ≤ 1/(draws+1), CALLIMACHUS-SHAPE.md §8's convention). A reader whose
//      holdings do not beat the null "holds almost nothing here", whatever their vocabulary.
//   2. "Matches" is the same ARRANGEMENT: the same subject and the same predicate, compared as normalized surface. It is exact, not
//      similar (callimachus.js header: no similarity). A W reading polarity-opposite on the same object REFUSES; the same arrangement
//      with another object, or another polarity on another object, is UNDETERMINED — two things can both be true.
//   3. The shuffle null permutes the predicates among W's spans, keeping every subject, every predicate and every W span. It destroys
//      the pairing and keeps the vocabulary: a hit that survives it is more than words in common. A small W cannot beat it (few
//      distinct permutations): that is the null's power, reported as `null.permutations`, not a defect to be tuned away.
//   4. Clearing's "U's own null" is the caller's `survives` (default: activation > 0, the ladder's evidence floor). This file does not
//      re-derive the ladder's margin null.
//   5. Pattern's nodes are the entities (subject and object surfaces) of held spans; an edge is a claim span from its subject to its
//      object. A U "path" is an undirected walk over U's region spans; "expanding hops until null" is bounded by the region itself,
//      which is already the null-bounded activation.
//
// NOT HERE: reading a W corpus into spans (the caller supplies spans from whichever reader it trusts; `uSpansFromRecord` does U), and
// the ladder is not yet routed through this (it still answers at fixed sizes). Nothing here calls a model.
import { mergeTestimony } from "./capacity-runner.js";
import { STANCE_BY_MODE } from "../kernel/cube.js";
import { seg, sentence } from "./prose-laws.js";
import { seamReport } from "./seam-ledger.js";

export const GRAINS = Object.freeze(["Ground", "Figure", "Pattern"]);
/** The columns: what the reader's state does on contact with the material. */
export const MODES = Object.freeze(["Differentiate", "Relate", "Generate"]);
/** The roles of the triad, in order. Witnessing holds both Differentiate (refuses) and Relate (corroborates). */
export const ROLES = Object.freeze(["clear", "witness", "generate"]);
/**
 * The nine cells: row = grain (distance), column = mode (verdict). NOT typed here: kernel/cube.js `STANCE_BY_MODE` is the one table, and
 * `cellOf(op, grain).stance` already stamps it on every cell of the engine. This is that table, transposed to grain-major.
 * (Clearing is also the first step at EVERY grain.)
 */
export const CELLS = Object.freeze(Object.fromEntries(GRAINS.map((g) => [g, Object.freeze(Object.fromEntries(MODES.map((m) => [m, STANCE_BY_MODE[m][g]])))])));
/** The steps run at a grain, in order: clear (always Clearing), witness (refuse, then corroborate), generate. */
export const STEPS = Object.freeze({
  Ground: Object.freeze([["clear", "Clearing"], ["witness", "Tending"], ["generate", "Cultivating"]]),
  Figure: Object.freeze([["clear", "Clearing"], ["witness", "Dissecting"], ["witness", "Binding"], ["generate", "Making"]]),
  Pattern: Object.freeze([["clear", "Clearing"], ["witness", "Unraveling"], ["witness", "Tracing"], ["generate", "Composing"]]),
});
const stanceOf = (cell) => { for (const [grain, row] of Object.entries(CELLS)) for (const [mode, name] of Object.entries(row)) if (name === cell) return { grain, mode, cell }; return null; };

/**
 * The frame words this file may generate, declared (PL14). Only the GENERATING modes speak: a pairing of two addresses needs no
 * sentence between them, so Clearing, Tending, Dissecting, Binding and Tracing have none, and Unraveling's one seam is a flag with no words.
 */
export const FRAME_WORDS = Object.freeze({
  Cultivating: ["Then: "],
  Making: [", and then: "],
  Composing: [" — then: ", " — and: "],
});

// ---- spans ---------------------------------------------------------------------------------------------------------------------

const ARTICLES = new Set(["the", "a", "an"]);
const norm = (t) => {
  const w = String(t ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s'’-]/gu, " ").split(/\s+/).filter(Boolean);
  while (w.length > 1 && ARTICLES.has(w[0])) w.shift();
  return w.join(" ");
};
/** A span: { id, address, text, side: "U"|"W", claim: { subj, pred, obj, polarity: "+"|"-" } | null, activation?, division? }. */
const arrangement = (c) => (c?.subj && c?.pred ? `${norm(c.subj)}|${norm(c.pred)}` : null);
/** The arrangement key of a span's claim (normalized subject|predicate), or null. Exported so an evaluation can check held-ness itself. */
export const arrangementOf = (s) => arrangement(s?.claim);
/**
 * The CLAIM key: arrangement, normalized object, polarity. `held: "claim"` (GRAIN-HELD-CLAIM-PREREG.md) holds a span only when this key is
 * held; the default `held: "arrangement"` is the original rule and every earlier registration ran under it.
 */
const polarityOf = (c) => (c?.polarity === "-" ? "-" : "+");
/** Claim mode only: an unknown polarity (null, "unknown", missing) is NOT "+": it matches nothing and contests nothing (UNDETERMINED). */
const strictPolarity = (c) => (c?.polarity === "-" ? "-" : c?.polarity === "+" ? "+" : null);
const claimKeyOf = (s) => { const a = arrangement(s?.claim); const p = strictPolarity(s?.claim); return a && p ? `${a}|${norm(s.claim.obj)}|${p}` : null; };
const sameObject = (a, b) => norm(a?.obj) === norm(b?.obj);

/** One witness reading of a W claim, given by one U span. Same arrangement is required; the object and polarity decide the verdict. */
function readingOf(wClaim, u) {
  const same = sameObject(wClaim, u.claim);
  const verdict = same && u.claim.polarity === wClaim.polarity ? "holds" : same ? "refused" : "undetermined";
  return { verdict, read: [u.address], who: `U:${u.address}`, span: u };
}

/** The contact verdict: mergeTestimony pointed across the corpora. Claim = a W span; witnesses = the U spans on its arrangement. */
export function contactVerdict(w, region) {
  const key = arrangement(w.claim);
  const on = key ? region.filter((u) => arrangement(u.claim) === key) : [];
  const readings = on.map((u) => readingOf(w.claim, u));
  const merged = mergeTestimony(readings);
  return {
    case: merged.case,
    standing: merged.standing,
    holds: merged.holds.map((r) => r.span),
    refused: merged.refused.map((r) => r.span),
    undetermined: merged.undetermined.map((r) => r.span),
  };
}

// ---- selecting -----------------------------------------------------------------------------------------------------------------

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const heldCount = (regionKeys, wKeys) => { const s = new Set(wKeys.filter(Boolean)); return regionKeys.filter((k) => k && s.has(k)).length; };

/** Distinct orderings of a multiset of predicates (the null's power), capped at Infinity for large inputs. */
function permutationsOf(xs) {
  const counts = new Map();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let n = 1;
  for (let i = 2; i <= xs.length; i++) { n *= i; if (n > 1e12) return Infinity; }
  for (const c of counts.values()) for (let i = 2; i <= c; i++) n /= i;
  return Math.round(n);
}

/**
 * Split the region against W and measure how far apart they are. `real` is true only when the observed number of held spans beats
 * EVERY draw of the predicate-shuffle null.
 */
export function splitRegion(region, whom, { draws = 199, seed = 20261014, held = "arrangement" } = {}) {
  if (held !== "arrangement" && held !== "claim") throw new TypeError(`splitRegion: held must be "arrangement" or "claim", not ${JSON.stringify(held)}`);
  const wSpans = (whom ?? []).filter((w) => arrangement(w.claim));
  const wKeys = wSpans.map((w) => arrangement(w.claim));
  const heldKeys = new Set(wKeys);
  const byClaim = held === "claim";
  const wClaims = new Set(wSpans.map(claimKeyOf).filter((k) => k !== null)); // a null key (unknown polarity) matches nothing, itself included
  const H = [], A = [], related = [];
  for (const u of region) {
    const arr = arrangement(u.claim);
    const ck = byClaim ? claimKeyOf(u) : null;
    const isHeld = byClaim ? ck !== null && wClaims.has(ck) : !!arr && heldKeys.has(arr);
    if (isHeld) { H.push(u); continue; }
    A.push(u);
    // `related` (claim mode only): an arrangement a W span has, with another object, the other polarity, or an unknown polarity.
    // Shown, typed, and it names the W spans it is about (and, if contested, the ones it opposes). Never silent.
    if (byClaim && arr && heldKeys.has(arr)) {
      const onArr = wSpans.filter((w) => arrangement(w.claim) === arr);
      const sameObj = onArr.filter((w) => sameObject(w.claim, u.claim));
      const up = strictPolarity(u.claim);
      const against = up ? sameObj.filter((w) => { const wp = strictPolarity(w.claim); return wp && wp !== up; }) : [];
      const unknown = !up || sameObj.some((w) => !strictPolarity(w.claim));
      const kind = against.length ? "opposite-polarity" : unknown && sameObj.length ? "unknown-polarity" : !up ? "unknown-polarity" : "same-subject-predicate";
      related.push({ address: u.address, id: u.id, kind, about: onArr.map((w) => w.address), against: against.map((w) => w.address) });
    }
  }

  const rKeys = region.map((u) => (byClaim ? claimKeyOf(u) : arrangement(u.claim)));
  const rnd = mulberry(seed);
  const preds = wSpans.map((w) => norm(w.claim.pred));
  const subjs = wSpans.map((w) => norm(w.claim.subj));
  const objs = wSpans.map((w) => norm(w.claim.obj));
  const pols = wSpans.map((w) => strictPolarity(w.claim));
  let exceeded = 0, sum = 0;
  for (let d = 0; d < draws && wSpans.length; d++) {
    const p = preds.slice();
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    // claim mode keeps each W span's object and polarity with its subject; only the predicate is dealt again
    const keys = subjs.map((s, i) => (byClaim ? (pols[i] ? `${s}|${p[i]}|${objs[i]}|${pols[i]}` : null) : `${s}|${p[i]}`));
    const h = heldCount(rKeys, keys);
    sum += h;
    if (h >= H.length) exceeded++;
  }
  const real = H.length > 0 && wSpans.length > 0 && exceeded === 0;
  return {
    H, A,
    ...(byClaim ? { related } : {}),
    held,
    distance: region.length ? A.length / region.length : null,
    null: { draws, seed, exceeded, p: (1 + exceeded) / (draws + 1), mean: draws && wSpans.length ? sum / draws : 0, permutations: permutationsOf(preds), real },
  };
}

/**
 * Ground when what is held does not beat the null; Pattern when more is held than not; Figure otherwise.
 *
 * And Ground when the MODE cannot be read (the addendum's caveat): if the reader holds spans beyond the null but every contact verdict
 * between U and W is UNDETERMINED, the record cannot read the reader's state in its own vocabulary, so for the record's purposes the
 * reader holds nothing. The fold runs at Ground whatever the distance, and says so.
 */
export function selectGrain(split, verdicts = null) {
  if (!split.null.real) return { grain: "Ground", why: split.H.length ? "what the reader holds here does not beat the shuffle null: shared vocabulary, not shared claims" : "the reader holds nothing of this region" };
  if (verdicts && verdicts.length && verdicts.every((c) => c === "UNDETERMINED")) return { grain: "Ground", selectorUnreadable: true, why: "the reader holds spans beyond the null, but every contact verdict between the record and the reader is UNDETERMINED: the mode cannot be selected, so the record treats the reader as holding nothing" };
  if (split.H.length > split.A.length) return { grain: "Pattern", why: "more of the region is held than absent (the house majority rule, disclosed): relations are what can be new" };
  return { grain: "Figure", why: "some of the region is held beyond the null and some is absent" };
}

// ---- outputs: addressed spans interleaved with flagged seams ----------------------------------------------------------------------

const src = (s) => seg.source(s.text, s.address);
const stamp = (item, cell) => ({ ...item, stance: stanceOf(cell) });
/** A speaking item: addressed spans and declared frame words (generating modes only). */
const S = (segs, spans) => ({ ...sentence(segs, spans.map((s) => s.id)), spans: spans.map((s) => s.address) });
/** A silent item: addressed spans and nothing between them. `text` is a layout join for display, not fold material. */
const P = (spans) => ({ segs: spans.map(src), grounds: [...new Set(spans.map((s) => s.id))], text: spans.map((s) => s.text).join("\n"), spans: spans.map((s) => s.address) });
/** A flagged seam with no words: the finding is the absence itself. */
const absent = (w, between) => ({ segs: [src(w), { kind: "frame", t: "", seam: "absence" }], grounds: [w.id], text: w.text, spans: [w.address], absence: { between } });

/** Group spans by their own division (the terrain ladder's, supplied as `span.division`; default: the page the address names). */
const divisionOf = (s) => s.division ?? String(s.address).split("/")[0];

// ---- the nine cells -------------------------------------------------------------------------------------------------------------

const entitiesOf = (s) => [s.claim?.subj, s.claim?.obj].filter(Boolean).map(norm);

function pairsOf(split, region, whom) {
  const heldKeys = new Set(split.H.map((u) => arrangement(u.claim)));
  return (whom ?? []).filter((w) => heldKeys.has(arrangement(w.claim))).map((w) => ({ w, ...contactVerdict(w, region) }));
}

/** Undirected shortest walk over U spans (positive polarity) from entity a to entity b: the chain of spans, or null. */
function pathOf(region, a, b) {
  if (a === b) return [];
  const edges = region.filter((u) => u.claim?.polarity === "+" && u.claim.subj && u.claim.obj);
  const seen = new Map([[a, null]]);
  const queue = [a];
  while (queue.length) {
    const x = queue.shift();
    for (const e of edges) {
      const s = norm(e.claim.subj), o = norm(e.claim.obj);
      const y = s === x ? o : o === x ? s : null;
      if (y === null || seen.has(y)) continue;
      seen.set(y, { from: x, via: e });
      if (y === b) { const chain = []; for (let c = b; seen.get(c); c = seen.get(c).from) chain.unshift(seen.get(c).via); return chain; }
      queue.push(y);
    }
  }
  return null;
}

const startOf = (s) => Number(/#b(\d+)-/.exec(s.address)?.[1] ?? 0);
/** W spans that join two held entities: the edges a reader already holds between things they hold. */
function wEdges(whom, split) {
  // `split.R` (claim mode): the related spans. Their entities are entities the reader HAS met (that is what makes them related), so an
  // edge between them is still an edge between things the reader holds, and an opposed claim still surfaces as Unraveling's refusal.
  const held = new Set([...split.H, ...(split.R ?? [])].flatMap(entitiesOf));
  return (whom ?? []).filter((w) => w.claim?.subj && w.claim?.obj && w.claim.polarity && held.has(norm(w.claim.subj)) && held.has(norm(w.claim.obj)) && norm(w.claim.subj) !== norm(w.claim.obj));
}

/** The order a new passage is laid down in: a caller-supplied `rank` (e.g. the answer ladder's reader-relative score) or, absent that, activation. */
const rankOf = (u) => u.rank ?? u.activation ?? 0;

/**
 * One absent span, placed beside the nearest thing the reader already holds. A shared entity is an addressed join: the two sit side by
 * side with no seam. With only the nearest held span (same division, nearest by byte) the bridge is a seam. With nothing held to attach
 * to, the span stands alone. Used by Making (Figure) and, so the new is never left unshown, by Composing (Pattern).
 *
 * ANCHOR RULE (GRAIN-R4-PREREG.md). "first" (the earlier behaviour): the first held span, in list order, that shares any entity. That
 * collapsed onto one sentence: 4 of the first 6 new passages for the dense reader were set beside the same anchor. "shared-most": the
 * held span sharing the MOST entities with the new passage, ties broken by the fewest times it has already been used as an anchor in this
 * list, then by activation. No constant: counts and an order.
 */
function attachNew(u, held, { used = null, anchor = "shared-most" } = {}) {
  const mine = new Set(entitiesOf(u));
  const shared = (h) => entitiesOf(h).filter((e) => mine.has(e)).length;
  const byEntity = held.filter((h) => shared(h) > 0);
  let near = null;
  if (byEntity.length) {
    near = anchor === "first" ? byEntity[0] : [...byEntity].sort((a, b) => shared(b) - shared(a) || (used?.get(a.address) ?? 0) - (used?.get(b.address) ?? 0) || (b.activation ?? 0) - (a.activation ?? 0))[0];
  } else {
    near = held.filter((h) => divisionOf(h) === divisionOf(u)).sort((a, b) => Math.abs(startOf(a) - startOf(u)) - Math.abs(startOf(b) - startOf(u)))[0] ?? null;
  }
  if (near && used) used.set(near.address, (used.get(near.address) ?? 0) + 1);
  if (byEntity.length) return { ...P([near, u]), attachedBy: "entity" };
  return near ? { ...S([src(near), seg.frame(FRAME_WORDS.Making[0]), src(u)], [near, u]), attachedBy: "nearest" } : { ...P([u]), attachedBy: null };
}

// Every cell consumes the material Clearing left standing (`cleared`), never the raw activated region.
const CELL = {
  // ---- Ground row
  Clearing: ({ region, survives }) => ({
    items: region.filter(survives).sort((a, b) => (b.activation ?? 0) - (a.activation ?? 0)).map((u) => P([u])),
  }),
  Tending: ({ pairs }) => ({
    items: pairs.filter((p) => ["AGREE", "SINGLE"].includes(p.case)).map((p) => P([p.w, p.holds[0]])),
  }),
  Cultivating: ({ cleared }) => {
    const by = new Map();
    for (const u of cleared) (by.get(divisionOf(u)) ?? by.set(divisionOf(u), []).get(divisionOf(u))).push(u);
    const top = (xs) => Math.max(...xs.map((u) => u.activation ?? 0));
    const divisions = [...by.entries()].sort((a, b) => top(b[1]) - top(a[1]));
    const items = [];
    divisions.forEach(([, xs], di) => xs.sort((a, b) => (b.activation ?? 0) - (a.activation ?? 0)).forEach((u, i) => items.push(di > 0 && i === 0 ? S([seg.frame(FRAME_WORDS.Cultivating[0]), src(u)], [u]) : P([u]))));
    return { items, divisions: divisions.map(([d, xs]) => ({ division: d, spans: xs.length })) };
  },

  // ---- Figure row
  Dissecting: ({ pairs }) => ({
    items: pairs.filter((p) => ["DISAGREE", "CONTRADICTED"].includes(p.case)).flatMap((p) => p.refused.map((u) => P([p.w, u]))),
  }),
  Binding: ({ pairs }) => ({
    items: pairs.filter((p) => ["AGREE", "SINGLE"].includes(p.case)).map((p) => P([p.w, p.holds[0]])),
  }),
  Making: ({ split, anchor }) => {
    const used = new Map();
    const items = [...split.A].sort((a, b) => rankOf(b) - rankOf(a)).map((u) => attachNew(u, split.H, { used, anchor }));
    return { items };
  },

  // ---- Pattern row
  Unraveling: ({ cleared, whom, split }) => {
    const items = [];
    for (const w of wEdges(whom, split)) {
      const v = contactVerdict(w, cleared);
      if (["DISAGREE", "CONTRADICTED"].includes(v.case)) { for (const u of v.refused) items.push(P([w, u])); continue; }
      if (pathOf(cleared, norm(w.claim.subj), norm(w.claim.obj)) === null) items.push(absent(w, [norm(w.claim.subj), norm(w.claim.obj)]));
    }
    return { items };
  },
  Tracing: ({ cleared, whom, split }) => {
    const items = wEdges(whom, split).flatMap((w) => {
      if (["DISAGREE", "CONTRADICTED"].includes(contactVerdict(w, cleared).case)) return [];
      const chain = pathOf(cleared, norm(w.claim.subj), norm(w.claim.obj));
      if (!chain || !chain.length) return [];
      // An ECHO is the reader's own claim corroborated by one record span that says the same thing in the same words: confirmation, not a walk.
      const echo = chain.length === 1 && norm(w.text) === norm(chain[0].text);
      return [{ ...P([w, ...chain]), hops: chain.length, echo }];
    });
    // genuine chains first, echoes after (stable within each)
    return { items: [...items.filter((i) => !i.echo), ...items.filter((i) => i.echo)] };
  },
  Composing: ({ cleared, whom, split, anchor }) => {
    const held = new Set(split.H.flatMap(entitiesOf));
    const wPairs = new Set((whom ?? []).filter((w) => w.claim?.subj && w.claim?.obj).map((w) => [norm(w.claim.subj), norm(w.claim.obj)].sort().join("␟")));
    const endSpan = (e, not) => [...split.H].filter((h) => h !== not && entitiesOf(h).includes(e)).sort((a, b) => (b.activation ?? 0) - (a.activation ?? 0))[0] ?? null;
    const items = [];
    for (const u of cleared) {
      if (u.claim?.polarity !== "+" || !u.claim.subj || !u.claim.obj) continue;
      const a = norm(u.claim.subj), b = norm(u.claim.obj);
      if (a === b || !held.has(a) || !held.has(b) || wPairs.has([a, b].sort().join("␟"))) continue;
      const left = endSpan(a, u), right = endSpan(b, u);
      if (!left || !right) continue;
      items.push(S([src(left), seg.frame(FRAME_WORDS.Composing[0]), src(u), seg.frame(FRAME_WORDS.Composing[1]), src(right)], [left, u, right]));
    }
    // The generating cell lays down what is ABSENT as well as what is newly related (GRAIN-R3-PREREG.md): an absent span with no relation to
    // anything held is still the thing the reader has not seen. Each is placed beside the nearest held span, as Making does at Figure.
    const composedAddr = new Set(items.flatMap((it) => it.spans));
    const used = new Map();
    for (const u of [...split.A].sort((a, b) => rankOf(b) - rankOf(a))) {
      if (composedAddr.has(u.address)) continue;
      items.push({ ...attachNew(u, split.H, { used, anchor }), unrelated: true });
    }
    return { items };
  },
};

// ---- the fold -------------------------------------------------------------------------------------------------------------------

/**
 * Closed means: clear ran, then at least one witnessing cell ran, then generate ran, in that order. A fold that skips one is unclosed
 * (the August triad check, with the whom supplying the grain).
 */
export function closureOf(modes) {
  const ran = modes.filter((m) => m.ran).map((m) => m.role);
  const rank = (r) => ROLES.indexOf(r);
  const ordered = ran.every((r, i) => i === 0 || rank(r) >= rank(ran[i - 1]));
  return { order: ROLES.slice(), ran, closed: ordered && ROLES.every((r) => ran.includes(r)) };
}

/**
 * foldGrain({ region, whom }) → the selection, the contacts, the cells in order, and the closure verdict.
 *   region: U's spans activated by Q, each with `activation` (and optionally `division`).
 *   whom:   W's spans (side "W"), read by the same relation reader. Empty or absent = the void reader.
 * Selection happens on the whole activated region; every cell then works on what Clearing left standing.
 */
export function foldGrain({ region = [], whom = [], survives = (u) => (u.activation ?? 0) > 0, draws = 199, seed = 20261014, forceGrain = null, anchor = "first", held = "arrangement" } = {}) {
  const selection = splitRegion(region, whom, { draws, seed, held });
  const relatedBy = new Map((selection.related ?? []).map((r) => [r.address, r]));
  const cleared = region.filter(survives);
  const standing = new Set(cleared.map((u) => u.id));
  const split = { ...selection, H: selection.H.filter((u) => standing.has(u.id)), A: selection.A.filter((u) => standing.has(u.id)), ...(selection.related ? { R: cleared.filter((u) => new Set(selection.related.map((r) => r.address)).has(u.address)) } : {}) };
  // The W spans that get a contact verdict are chosen by the arrangements of H. Under held:"claim" an opposite-polarity span has left
  // H, so its W counterpart would lose its CONTRADICTED verdict and stop surfacing: pair over H plus the related spans (the same
  // arrangement set as the default), so every cell sees exactly the pairs it saw before (Grain session, objection (c)).
  const relatedAddr = new Set((selection.related ?? []).map((r) => r.address));
  const pairSplit = selection.related ? { ...split, H: [...split.H, ...cleared.filter((u) => relatedAddr.has(u.address))] } : split;
  const pairs = pairsOf(pairSplit, cleared, whom);
  const selected = selectGrain(selection, pairs.map((p) => p.case));
  // `forceGrain` is for evaluation only (does what is shown as new depend on the cut?); the fold says it was forced.
  const picked = forceGrain && GRAINS.includes(forceGrain) ? { grain: forceGrain, why: `forced to ${forceGrain} (selected: ${selected.grain})`, forced: true } : selected;
  const grain = picked.grain;
  // `anchor`: "first" (default, so every earlier registration reproduces) or "shared-most" (GRAIN-R4-PREREG.md).
  const ctx = { region, cleared, whom, split, pairs, survives, anchor };
  const modes = STEPS[grain].map(([role, cell]) => {
    const out = CELL[cell](ctx);
    // GRAIN-HELD-CLAIM-PREREG H4: an item that shows a `related` span says so (claim mode only; nothing changes otherwise)
    const items = out.items.map((it) => { const s2 = stamp(it, cell); const last = (it.spans ?? [])[(it.spans ?? []).length - 1]; const r = relatedBy.get(last); return r ? { ...s2, related: true, relatedKind: r.kind, relatedAbout: r.about, ...(r.against.length ? { against: r.against } : {}) } : s2; });
    const seams = seamReport(items);
    return { mode: cell, stance: stanceOf(cell), role, ran: true, items, ...(out.divisions ? { divisions: out.divisions } : {}), seams, ...(items.length ? {} : { empty: "ran and found nothing in this region for this reader; the absence is the output" }) };
  });
  // The mouth is confined: only generating cells may carry a seam, and the one exception is Unraveling's flagged absence (no words).
  const silent = modes.filter((m) => m.role !== "generate");
  const confined = silent.every((m) => m.items.every((it) => (it.segs ?? []).every((g) => g.kind === "source" || (g.kind === "frame" && g.t === "" && g.seam === "absence"))));
  return {
    grain, why: picked.why, ...(picked.selectorUnreadable ? { selectorUnreadable: true } : {}),
    ...(selection.related ? { related: selection.related } : {}),
    distance: { region: region.length, cleared: cleared.length, held: selection.H.length, absent: selection.A.length, ...(selection.related ? { related: selection.related.length } : {}), share: selection.distance, margin: selection.H.length + selection.A.length ? (selection.H.length - selection.A.length) / (selection.H.length + selection.A.length) : null, witness: "claim-arrangement", null: selection.null },
    contacts: pairs.map((p) => ({ w: p.w.address, case: p.case, standing: p.standing, holds: p.holds.map((u) => u.address), refused: p.refused.map((u) => u.address), undetermined: p.undetermined.map((u) => u.address) })),
    modes,
    closure: { ...closureOf(modes), mouthConfined: confined },
    seams: seamReport(modes.flatMap((m) => m.items)),
  };
}

/** Spans from a Callimachus record: each claim atom as a span, its subject/object read from their addresses. `activation` maps atom id → score. */
export async function spansFromRecord(record, { slice, activation = new Map(), side = "U" } = {}) {
  const out = [];
  for (const a of record.atoms) {
    const r = a.relation;
    if (!r?.pred) continue;
    const text = await slice(a.span);
    const subj = r.subj_surface ? await slice(r.subj_surface) : null;
    const obj = r.obj_surface ? await slice(r.obj_surface) : a._object ?? null;
    if (!text || !subj) continue;
    out.push({ id: a.id, address: a.span, text, side, claim: { subj, pred: r.pred, obj, polarity: r.polarity === "-" ? "-" : "+" }, activation: activation.get(a.id) ?? 0 });
  }
  return out;
}

/** U spans: the record read as the universe. */
export const uSpansFromRecord = (record, opts = {}) => spansFromRecord(record, { ...opts, side: "U" });
