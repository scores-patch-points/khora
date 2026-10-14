// organs/whom-standing.js — the layer over grain.js that says what a reader STANDS in relation to the record. No model, no clock, no IO.
//
// grain.js SELECTS a grain from the share of the region the reader holds and RUNS the nine cells. This file adds, without editing it
// (additive: grain.js alone is unchanged and `foldGrain` still works without any of this), five things the spec "The Whom, the Nine
// Stances, the Nine Standings" (2026-10-14) carried that grain.js did not:
//
//   1. N3 PROVENANCE   admitWhom(spans)           a W span with no provenance, no address, the wrong side, or an address the universe
//                                                 also uses never enters H. It is a typed gap, not a held claim (the forged-thread guard).
//   2. THE ABSENT CUT  selectGrainTwoNulls(...)   Figure vs Pattern by a measured null on what is ABSENT, not by H > A (the L39 repair).
//   3. NINE STANDINGS  standingsOf({region,whom}) record verdict × reader verdict, two independent mergeTestimony calls (axis-merge law).
//   4. TYPED REFUSALS  foldWithWhom(...).refusals whom-empty, whom-unread, unclosed, unaddressed-item, mouth-unconfined, stance-conflict,
//                                                 axis-merge (thrown by assertAxesApart).
//   5. THE READING     readingEntry(...)          a digests-only record of a fold. Named "whom-reading" because `creaseOf` (khora) and
//                                                 `creaseEntry` (seam-ledger.js) already name other things; it never carries W's text.
//
// WHAT THE SPEC GOT WRONG, found while implementing it (disclosed, with the repair):
//   N1′ as written is "the same shuffle, read on |A|/|R|". Under the predicate-shuffle null, A_d = |R| − h_d, so
//   A_obs > A_d ⇔ H_obs < h_d: the "absent above chance" test is the LOWER tail of the held test. "Held above chance" (H beats every
//   draw) and "absent above chance" (H below every draw) can never both hold, and `!absentAboveChance → Pattern` would fire whenever
//   held beats the null, so Figure would be unreachable. The idea behind N1′ is right and survives: Pattern means "W covers R, only
//   relations can be new", so what must be tested is whether the absent set is more than a reader who held ALL of R would leave
//   *through the same instrument*. That is the W reader's round-trip recall (ledger L35, L37): `coverageOf(region, wFull)`, where wFull
//   is the region re-read as W by the same reader. The absent count is then tested against Binomial(n, 1 − recall) at p ≤ 1/(draws+1),
//   the convention grain.js already uses. No constant is set by hand: every cut is a null or a count.
//
// WHAT IS DECIDED HERE, and disclosed (not measured; each is owed a null or a measurement):
//   a. Provenance kinds are the four the spec names plus "pinax" (a byte-addressed record read by whom.js). The set is a vocabulary, not
//      a threshold.
//   b. A proposition is (subject|predicate|object) with POSITIVE orientation; "−" polarity is a refusal of it. So record "no" means the
//      record asserts the negation, and all nine cells are reachable with no claimant-dependent orientation.
//   c. A record that is silent on a proposition (mergeTestimony UNDETERMINED) leaves the claim: it is the void, not a standing.
//   d. A reader who contradicts themself on a proposition reads as `nothing` with `readerSplit: true`; the table has no cell for it.
import { mergeTestimony } from "./capacity-runner.js";
import { sha256Hex } from "./pinax.js";
import { referentsOfSpan, headReferentsOfSpan } from "./referent-held.js";
import { CELLS, MODES, GRAINS, arrangementOf, contactVerdict, splitRegion, selectGrain, foldGrain } from "./grain.js";

// ---- shared normalization (grain.js keeps its own private; this one is the same rule so arrangements compare equal) ----------------

const ARTICLES = new Set(["the", "a", "an"]);
const norm = (t) => {
  const w = String(t ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s'’-]/gu, " ").split(/\s+/).filter(Boolean);
  while (w.length > 1 && ARTICLES.has(w[0])) w.shift();
  return w.join(" ");
};
const docOf = (address) => String(address ?? "").split("/")[0];

// ---- 1. N3: provenance -----------------------------------------------------------------------------------------------------------

/** What a W span may say it came from. A vocabulary, not a threshold. */
export const W_KINDS = Object.freeze(["memory", "turn", "spoken", "seen", "pinax"]);
/**
 * Kinds whose spans are, by what they mean, spans OF the universe: `seen` (the reader was shown this passage) and `spoken` (the fold said
 * this passage to the reader). Their address names a U span on purpose; every other kind is an independent corpus and may not borrow a
 * universe address. Run 7 of OWN-WORDS-PREREG (Amendment 6): refusing them as "address-collision" removed exactly the 18 spans the
 * reader had been shown, which is what the kind exists to carry.
 */
export const REFERS_TO_U = Object.freeze(new Set(["seen", "spoken"]));

/**
 * Admit W spans. A span is `{ id, address, text, side: "W", claim, provenance: { kind, ref } }`. Refused ones are returned typed; they
 * never enter H. `universe` is U's spans (or just anything with an `address`): a W address equal to a U address is refused so an address
 * can never be mistaken for the other corpus's (except `seen` and `spoken`, which are spans OF the universe). Uniqueness is on `id`, NOT on address: several claims are read from one sentence and
 * share its address (grain.js keys spans on `id`). Run 1 of WHOM-STANDING-PREREG refused them as "duplicate-address" and so read a
 * different W than `foldGrain` did; Amendment 2.
 */
export function admitWhom(spans = [], { universe = [] } = {}) {
  const uAddr = new Set(universe.map((u) => u?.address).filter(Boolean));
  const seenIds = new Set();
  const admitted = [], refused = [];
  for (const w of spans ?? []) {
    const why =
      !w || typeof w !== "object" ? "not-a-span"
      : w.side !== "W" ? "not-w-side"
      : !w.address ? "no-address"
      : !(w.provenance && W_KINDS.includes(w.provenance.kind) && String(w.provenance.ref ?? "").trim()) ? "no-provenance"
      : uAddr.has(w.address) && !REFERS_TO_U.has(w.provenance.kind) ? "address-collision"
      : w.id != null && seenIds.has(w.id) ? "duplicate-id"
      : null;
    if (why) refused.push({ id: w?.id ?? null, address: w?.address ?? null, why });
    else { if (w.id != null) seenIds.add(w.id); admitted.push(w); }
  }
  return { admitted, refused };
}

// ---- 2. the absent cut -----------------------------------------------------------------------------------------------------------

/**
 * The W reader's round-trip on the region itself: `wFull` is the region's own spans read AS W by the same reader the real W was read
 * with. How many of the region's spans does that reader hold when it was shown all of them? That is the instrument's recall (L35).
 */
export function coverageOf(region = [], wFull = []) {
  const n = region.length;
  if (!n) return { n: 0, held: 0, recall: null };
  const held = splitRegion(region, wFull, { draws: 0 }).H.length;
  return { n, held, recall: held / n };
}

/** P(X ≥ k) for X ~ Binomial(n, q), exact, in log space. */
export function binomialUpper(n, q, k) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (q <= 0) return 0;
  if (q >= 1) return 1;
  const lq = Math.log(q), lr = Math.log(1 - q);
  let lc = 0, total = 0;
  for (let i = 0; i <= n; i++) {
    if (i > 0) lc += Math.log((n - i + 1) / i);
    if (i >= k) total += Math.exp(lc + i * lq + (n - i) * lr);
  }
  return Math.min(1, total);
}

/**
 * Grain from where the reader stands, with Figure vs Pattern decided by a null on what is ABSENT, not by H > A.
 *   Ground   unless held beats every draw of the shuffle (grain.js `selectGrain`, unchanged), or every contact is UNDETERMINED.
 *   Pattern  only if the absent count is NOT above what a full-coverage reader leaves through the same instrument, the test could
 *            have failed (minimum attainable p ≤ alpha), and the instrument read something back (recall > 0).
 *   Figure   otherwise, and it says which of those it was. The margin is always reported (L39).
 * `coverage` is `coverageOf(region, wFull)`; absent, Pattern is not claimed on a bare majority.
 */
export function selectGrainTwoNulls(split, verdicts = null, { coverage = null } = {}) {
  const base = selectGrain(split, verdicts);
  const selector = "two-nulls";
  if (base.grain === "Ground") return { ...base, selector };
  const n = split.H.length + split.A.length;
  const alpha = 1 / ((split.null?.draws ?? 199) + 1);
  const fig = (why, extra = {}) => ({ grain: "Figure", selector, why, margin: { absent: split.A.length, region: n, alpha, ...extra } });
  if (!coverage || coverage.recall == null) return fig("Pattern needs the W reader's round-trip recall measured (L35); none was supplied, so a bare majority is not read as covering the region (L39)", { measured: false });
  const r = coverage.recall;
  if (r === 0) return { ...fig("the W reader read none of the region back when shown all of it: the instrument is silent, so what is absent cannot be told from what it cannot read (L35)", { recall: 0, instrumentSilent: true }), instrumentSilent: true };
  const q = 1 - r;
  const minP = Math.pow(q, n);
  if (minP > alpha) return { ...fig(`the absent-cut could not fail here (smallest attainable p ${minP.toPrecision(3)} > ${alpha.toPrecision(3)}): a test that cannot fail certifies nothing`, { recall: r, minP, underpowered: true }), underpowered: true };
  const p = binomialUpper(n, q, split.A.length);
  const margin = { absent: split.A.length, region: n, alpha, recall: r, expectedAbsent: n * q, p, minP };
  return p <= alpha
    ? { grain: "Figure", selector, why: `more of the region is absent (${split.A.length} of ${n}) than a reader who held all of it would leave through this instrument (expected ${(n * q).toFixed(1)}, p ${p.toPrecision(3)}): something here is new as a claim`, margin }
    : { grain: "Pattern", selector, why: `the absent count (${split.A.length} of ${n}) is within what a full-coverage reader leaves through this instrument (expected ${(n * q).toFixed(1)}, p ${p.toPrecision(3)}): the reader covers the region, so only relations can be new`, margin };
}

// ---- 3. the nine standings -------------------------------------------------------------------------------------------------------

/** record (rows) × reader (columns); the reader's `nothing` is a column, the record's silence is not a row (it leaves). */
export const STANDINGS = Object.freeze({
  yes: Object.freeze({ yes: "held-corroborated", no: "held-refuted", nothing: "new" }),
  no: Object.freeze({ yes: "held-contradicted", no: "held-corroborated-negative", nothing: "new-negative" }),
  both: Object.freeze({ yes: "held-resolved-open", no: "held-resolved-open-negative", nothing: "open" }),
});
export const STANDING_NAMES = Object.freeze(Object.values(STANDINGS).flatMap((row) => Object.values(row)));

/** The axis-merge law as a build assertion: a W reading may not be in the record axis, nor a U reading in the reader axis. */
export function assertAxesApart(recordReadings = [], readerReadings = []) {
  const bad = (rs, side) => rs.filter((r) => r?.side !== side || r?.span?.side !== side);
  const a = bad(recordReadings, "U"), b = bad(readerReadings, "W");
  if (a.length || b.length) {
    const e = new Error(`axis-merge: ${a.length} non-U reading(s) in the record axis, ${b.length} non-W reading(s) in the reader axis`);
    e.code = "axis-merge";
    throw e;
  }
}

/** One side's verdict on a positive proposition, as a reading that `mergeTestimony` can take. `-` polarity refuses it; another object says nothing. */
const readingOf = (side, obj) => (s) => {
  const same = norm(s.claim?.obj) === obj;
  let verdict = !same ? "undetermined" : s.claim?.polarity === "-" ? "refused" : "holds";
  // The theory-of-mind organ's stance (mind-whom.js): the reader's model of the person says they REFUSE the span's claim (the
  // proposition's verdict flips), DOUBT it (undetermined), or CONCEDED it (held once, re-zeroed: not a reading).
  if (side === "W" && same && s.stance) {
    if (s.stance === "refuses") verdict = verdict === "holds" ? "refused" : "holds";
    else if (s.stance === "doubts" || s.stance === "conceded") verdict = "undetermined";
  }
  return { verdict, read: [s.address], who: `${side}:${s.address}`, side, span: s };
};

const byArrangement = (spans) => {
  const m = new Map();
  for (const s of spans) { const k = arrangementOf(s); if (k) (m.get(k) ?? m.set(k, []).get(k)).push(s); }
  return m;
};

/**
 * The standing of every proposition the region or the whom states. Two independent `mergeTestimony` calls per proposition: the reader
 * is never a witness to the record (the P30 failure shape with the reader in the echo's place), so the reader can change what the fold
 * does with a claim and never what the record says of it.
 */
export function standingsOf({ region = [], whom = [] } = {}) {
  const uBy = byArrangement(region), wBy = byArrangement(whom);
  const props = new Map();
  for (const s of [...region, ...whom]) {
    const arr = arrangementOf(s);
    if (!arr) continue;
    const obj = norm(s.claim.obj);
    props.set(`${arr}|${obj}`, { arr, obj });
  }
  const items = [], left = [];
  const counts = Object.fromEntries(STANDING_NAMES.map((n) => [n, 0]));
  for (const [pk, { arr, obj }] of props) {
    const rU = (uBy.get(arr) ?? []).map(readingOf("U", obj));
    const rW = (wBy.get(arr) ?? []).map(readingOf("W", obj));
    assertAxesApart(rU, rW);
    const rec = mergeTestimony(rU);   // call 1: U's readings only
    const rea = mergeTestimony(rW);   // call 2: W's readings only
    const record = rec.case === "UNDETERMINED" ? null : rec.case === "CONTRADICTED" ? "no" : rec.case === "DISAGREE" ? "both" : "yes";
    if (!record) { left.push({ proposition: pk, why: "the record is silent on it (void, not a standing)" }); continue; }
    const reader = rea.case === "CONTRADICTED" ? "no" : rea.case === "AGREE" || rea.case === "SINGLE" ? "yes" : "nothing";
    const standing = STANDINGS[record][reader];
    const chainSet = new Set((record === "no" ? rec.refused : rec.holds).concat(record === "both" ? rec.refused : []).map((r) => docOf(r.span.address)));
    counts[standing]++;
    items.push({
      proposition: pk, record, reader, standing,
      chains: chainSet.size,
      n: { u: { holds: rec.holds.length, refused: rec.refused.length }, w: { holds: rea.holds.length, refused: rea.refused.length } },
      u: [...rec.holds, ...rec.refused].map((r) => r.span.address),
      w: [...rea.holds, ...rea.refused].map((r) => r.span.address),
      ...(rea.case === "DISAGREE" ? { readerSplit: true } : {}),
    });
  }
  // The leading mode: what the reader does on contact, among propositions they hold anything on (a refusal outranks a bind on a tie).
  const yes = items.filter((i) => i.reader === "yes").length, no = items.filter((i) => i.reader === "no").length;
  const leadingMode = no >= yes && no > 0 ? "Differentiate" : yes > 0 ? "Relate" : "Generate";
  return { items, counts, left, leadingMode, shares: { yes, no, nothing: items.length - yes - no } };
}

// ---- 4. typed refusals -----------------------------------------------------------------------------------------------------------

/** Every output item is a verified span or a flagged seam; every span's address resolves to U or W. */
export function verifyFold(fold, { region = [], whom = [] } = {}) {
  const index = new Set([...region, ...whom].map((s) => s.address));
  const problems = [];
  for (const m of fold.modes ?? []) {
    (m.items ?? []).forEach((it, i) => {
      for (const a of it.spans ?? []) if (!index.has(a)) problems.push({ code: "unaddressed-item", cell: m.mode, item: i, address: a });
      for (const g of it.segs ?? []) {
        if (g.kind === "source") { if (!g.address || !index.has(g.address)) problems.push({ code: "unaddressed-item", cell: m.mode, item: i, address: g.address ?? null }); }
        else if (!["frame", "value", "model"].includes(g.kind)) problems.push({ code: "unaddressed-item", cell: m.mode, item: i, kind: g.kind });
      }
    });
  }
  return problems;
}

/**
 * A logged stance must be the one `CELLS[grain][mode]` names for the cell that produced it, in the fold's grain. One exception, by
 * law and not by leniency: Clearing runs first at EVERY grain and is the Ground/Differentiate cell, so its stamp reads Ground whatever
 * the fold's grain is (grain.js `stanceOf`). Every other cell must be stamped in the fold's own grain.
 */
export function stanceConflicts(fold) {
  const out = [];
  for (const m of fold.modes ?? []) {
    for (const [i, it] of (m.items ?? []).entries()) {
      const s = it.stance;
      const rowOk = s && (s.grain === fold.grain || (m.mode === "Clearing" && s.grain === "Ground"));
      const ok = s && s.cell === m.mode && rowOk && CELLS[s.grain]?.[s.mode] === s.cell;
      if (!ok) out.push({ code: "stance-conflict", cell: m.mode, item: i, stamped: s ?? null, grain: fold.grain });
    }
  }
  return out;
}

/** What a fold is refused for. `renders: false` means the surface must not render it; the others only say what was forced. */
export function refusalsOf({ fold, standings, admitted = [], refusedW = [], region = [], whom = [], selection = {} } = {}) {
  const out = [];
  if (!admitted.length) out.push({ code: "whom-empty", renders: true, forced: "Ground", why: refusedW.length ? `every W span was refused by N3 (${refusedW.length})` : "W is empty (incognito, first turn, or nothing read)" });
  if (selection.selectorUnreadable) out.push({ code: "whom-unread", renders: true, forced: "Ground", why: "the reader holds spans beyond the null but every contact verdict is UNDETERMINED: disjoint vocabulary" });
  if (fold && fold.closure && !fold.closure.closed) out.push({ code: "unclosed", renders: false, ran: fold.closure.ran });
  if (fold && fold.closure && fold.closure.mouthConfined === false) out.push({ code: "mouth-unconfined", renders: false });
  for (const p of verifyFold(fold ?? {}, { region, whom })) out.push({ ...p, renders: false });
  for (const p of stanceConflicts(fold ?? {})) out.push({ ...p, renders: false });
  return out;
}

// ---- the fold, with the whom -----------------------------------------------------------------------------------------------------

/**
 * foldWithWhom({ region, whom, wFull }) → grain.js's fold, with the grain chosen by the two-nulls selector, plus the standings, the
 * typed refusals, and `refused` (true when a surface must not render it). `wFull` is the region re-read as W by the same reader.
 * grain.js is not edited: the selection is passed to `foldGrain` as `forceGrain`, and the result says it was selected here.
 */
export function foldWithWhom({ region = [], whom: whomIn = [], wFull = null, referents = null, mind = null, survives = (u) => (u.activation ?? 0) > 0, draws = 199, seed = 20261014, anchor = "first" } = {}) {
  // `mind` (mind-whom.js): the reader's state as a mind through the theory-of-mind organ. Its spans join W; its disclosure rides the fold.
  const whom = mind?.whom?.length ? [...whomIn, ...mind.whom] : whomIn;
  const { admitted, refused: refusedW } = admitWhom(whom, { universe: region });
  const split = splitRegion(region, admitted, { draws, seed });
  const cleared = region.filter(survives);
  const standing = new Set(cleared.map((u) => u.id));
  const heldKeys = new Set(split.H.filter((u) => standing.has(u.id)).map(arrangementOf));
  const verdicts = admitted.filter((w) => heldKeys.has(arrangementOf(w))).map((w) => contactVerdict(w, cleared).case);
  const coverage = wFull ? coverageOf(region, wFull) : null;
  const selection = selectGrainTwoNulls(split, verdicts, { coverage });
  const fold = foldGrain({ region, whom: admitted, survives, draws, seed, forceGrain: selection.grain, anchor });
  const standings = standingsOf({ region: cleared, whom: admitted });
  const refusals = refusalsOf({ fold, standings, admitted, refusedW, region, whom: admitted, selection });
  if (mind?.unmodelled) refusals.push({ code: "mind-unmodelled", renders: true, forced: "Ground", why: "the reader has attributed nothing to the person: unmodelled, which is not the person holding nothing" });
  return {
    ...fold,
    grain: selection.grain,
    why: selection.why,
    selection,
    coverage,
    whom: { admitted: admitted.length, refused: refusedW },
    standings,
    stance: CELLS[selection.grain][standings.leadingMode],
    refusals,
    refused: refusals.some((r) => r.renders === false),
    ...(referents ? { topic: topicOf(cleared, referents) } : {}),
    ...(mind ? { mind: { model: mind.model, legs: mind.legs, common: mind.common, divergence: mind.divergence, held: mind.held, gaps: mind.gaps, unanchored: mind.unanchored, unmodelled: mind.unmodelled } } : {}),
  };
}

/**
 * The topic-level differentiation (OWN-WORDS-PREREG Amendment 8). `referents = { entities, mentioned }`: the record's own referents and
 * the ids the reader's own text mentions (`mentionsOf`). Each cleared span is exactly one of
 *   newAboutHeld  its subject or object contains a mentioned referent: a new fact about a thing the reader names
 *   newThings     it does not: a thing the reader has not named
 * An ANNOTATION: no cell, order, seam or grain is changed by it. Which class a surface shows first is the reader's judgment.
 */
export function topicOf(cleared = [], { entities = [], mentioned = new Set(), mode = "mention" } = {}) {
  const newAboutHeld = [], newThings = [];
  const of = mode === "about" ? headReferentsOfSpan : referentsOfSpan;
  for (const u of cleared) {
    const hit = [...of(u, entities)].filter((id) => mentioned.has(id));
    (hit.length ? newAboutHeld : newThings).push({ address: u.address, referents: hit });
  }
  return {
    witness: mode === "about" ? "referent-held:head" : "referent-held",
    mentioned: mentioned.size,
    newAboutHeld: newAboutHeld.map((x) => x.address),
    newThings: newThings.map((x) => x.address),
    referentsOf: Object.fromEntries(newAboutHeld.map((x) => [x.address, x.referents])),
    counts: { cleared: cleared.length, newAboutHeld: newAboutHeld.length, newThings: newThings.length },
  };
}

// ---- 5. the reading: digests only -------------------------------------------------------------------------------------------------

/**
 * One fold as it was read, by digest. Never W's text and never U's: addresses are hashed together so the ledger can leave the machine
 * where the thread cannot. `digest(bytes) → hex` defaults to pinax's `sha256Hex`.
 */
export async function readingEntry({ question = "", region = [], whom = [], fold, digest = sha256Hex } = {}) {
  if (!fold || !fold.standings) throw new Error("readingEntry: a foldWithWhom result is required");
  const enc = new TextEncoder();
  const h = (s) => digest(enc.encode(String(s)));
  const addrs = (xs) => xs.map((x) => x.address).sort().join("\n");
  const mode = fold.standings.leadingMode;
  return Object.freeze({
    kind: "whom-reading",
    q: await h(question),
    u: await h(addrs(region)),
    whom: await h(addrs(whom)),
    grain: fold.grain,
    mode,
    stance: CELLS[fold.grain][mode],
    standings: Object.freeze({ ...fold.standings.counts }),
    seams: fold.seams.seamCount,
    seamDensity: fold.seams.seamDensity,
    ...(fold.topic ? { topic: Object.freeze({ newAboutHeld: fold.topic.counts.newAboutHeld, newThings: fold.topic.counts.newThings, mentioned: fold.topic.mentioned }) } : {}),
    dropped: fold.whom.refused.length,
    refusals: Object.freeze(fold.refusals.map((r) => r.code)),
  });
}

export { GRAINS, MODES };
