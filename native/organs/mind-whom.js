// organs/mind-whom.js — the reader's state as a MIND, through the theory-of-mind organ (Nagel: kernel/theory-of-mind.js). Pure.
//
// The whom layer modelled the reader as a pile of spans (W). The organ models the person as a MIND: a holder with beliefs that have a
// stance (holds / doubts / refuses / conceded) and a basis (asserted, reported), seated in a log of perspective operations, and the
// reader's model of that mind carries COUNTED evidence and typed gaps. This file lands the layer's inputs in that log and reads the
// result back as W spans the layer already knows how to take.
//
//   mindOf({ question, region, trail, turns, mind, priors }) → { whom, model, legs, common, divergence, gaps, unanchored, ... }
//
// WHAT LANDS WHERE (every rule is the organ's own, not a new one):
//   record spans        READER witnessed beliefs, keyed by claim key, and discovery structure (EOHyperedge@1) per encounter, so the
//                       organ's material and relevance legs have the region to read
//   the trail           READER reported beliefs via the person (the reader knows the person was shown these): `seen` / `spoken`
//   the person's turns  the PERSON's asserted beliefs, their own words verbatim, through adapters/chat/user-turns.js (an assertion
//                       holds, a back-pointing correction refuses, an ask is a gap). Never a paraphrase, never a reading.
//   a turn that quotes  a turn whose text CONTAINS a span's bytes (exact, normalized) is bridged: the reader's reported belief via the
//   a span              person, with the turn's stance. Exact bytes only: this is the layer's N3, not a new similarity.
//
// THE WALLS (the organ's own):
//   - a person's asserted claim never becomes the reader's witnessed belief (perspective.js): `mindOf` asserts it and a test pins it.
//   - nothing attributed is not the person holding nothing: it is `no_attributed_beliefs`, a typed gap, and the layer says
//     `mind-unmodelled`, never a held nothing.
//   - a correction that points back at something unnamed is `unanchored`: it is kept, typed, and changes no standing. Which span a
//     "no, that's wrong" is about is the adapter's anaphora, not this file's guess.
//   - the gate's `admitted` is a property of the region and the ask (it does not vary with the reader). It is reported, never a selector.
import { READER, BASIS, STANCE, perspectiveOperation, projectPerspectives, mentalModel, commonGround, divergence } from "../kernel/perspective.js";
import { USER, userForWhom, foldUniverseAt, mindHolder } from "../kernel/theory-of-mind.js";
import { turnsToUserLog } from "../adapters/chat/user-turns.js";
import { arrangementOf } from "./grain.js";
import { whomFromTrail } from "./trail-whom.js";

const norm = (t) => String(t ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s'’-]/gu, " ").replace(/\s+/g, " ").trim();
const objNorm = (t) => { const w = norm(t).split(" ").filter(Boolean); while (w.length > 1 && ["the", "a", "an"].includes(w[0])) w.shift(); return w.join(" "); };
const docOf = (a) => String(a ?? "").split("/")[0];

/**
 * The organ keeps ONE belief per (holder, claim). The reader's own belief that X is a different proposition from the reader's belief
 * that the PERSON holds / refuses / doubts / saw X, so the second is landed under its own claim key and the reader's stance on it is
 * always HOLDS (the reader believes it of the person). Landing both on one key overwrote the reader's witnessed belief (run 11, M2).
 */
const ABOUT = Object.freeze({ saw: "user-saw:", holds: "user-holds:", refuses: "user-refuses:", doubts: "user-doubts:", conceded: "user-conceded:" });
const aboutKey = (kind, key) => `${ABOUT[kind]}${key}`;
const unAbout = (claim) => { for (const [kind, pre] of Object.entries(ABOUT)) if (String(claim).startsWith(pre)) return { kind, key: String(claim).slice(pre.length) }; return null; };

/** The claim key a span states: its arrangement, its object, its polarity. The same key on the record side and on the person's side. */
export const claimKeyOf = (u) => {
  const a = arrangementOf(u);
  return a ? `${a}|${objNorm(u.claim?.obj)}|${u.claim?.polarity === "-" ? "-" : "+"}` : null;
};

export function mindOf({ question = "", region = [], universe = null, trail = [], turns = [], mind = null, priors = {}, includeOutOfRegion = false } = {}) {
  const uni = universe ?? region;
  const byKey = new Map();
  for (const u of region) { const k = claimKeyOf(u); if (k) (byKey.get(k) ?? byKey.set(k, []).get(k)).push(u); }
  const ops = [];
  const structure = [];
  const gaps = [];

  // 1. the record side: the reader's own witnessed beliefs, and the structure it discovered (the organ's material leg)
  for (const k of byKey.keys()) ops.push(perspectiveOperation({ holder: READER, claim: k, stance: STANCE.HOLDS, basis: BASIS.WITNESSED }));
  for (const u of region) {
    structure.push({ schema: "EOHyperedge@1", encounterRef: docOf(u.address), relation: u.claim?.pred ?? "", participants: [{ surface: u.claim?.subj ?? "" }, { surface: u.claim?.obj ?? "" }] });
  }

  // 2. the trail: the reader knows the person was shown these
  const { spans: trailSpans, unresolved } = whomFromTrail(trail, { universe: uni });
  const exactAddrs = new Set(trailSpans.map((s) => s.address));
  const trailBy = new Map();
  for (const s of trailSpans) {
    const k = claimKeyOf(s);
    if (!k || trailBy.has(k)) continue;
    trailBy.set(k, { via: s.provenance.kind, ref: s.provenance.ref });
    ops.push(perspectiveOperation({ holder: READER, claim: aboutKey("saw", k), stance: STANCE.HOLDS, basis: BASIS.REPORTED, via: [USER], witness: s.provenance.ref }));
  }

  // 3. the person's turns, verbatim, through the chat adapter; then the exact-containment bridge
  const log = turnsToUserLog(turns, { mind, ...priors });
  const userOps = log.operations;
  const turnBy = new Map();
  const unanchored = [];
  const turnList = (turns ?? []).map((t) => (typeof t === "string" ? t : String(t?.text ?? "")));
  userOps.forEach((op) => {
    ops.push(op);
    const claimText = op.payload?.claim ?? "";
    const isAsk = op.operator === "DEF";
    if (isAsk) return;
    const hay = ` ${norm(claimText)} `;
    let anchored = false;
    for (const [k, us] of byKey) {
      const t = norm(us[0].text);
      if (t && hay.includes(` ${t} `)) {
        anchored = true;
        for (const u of us) exactAddrs.add(u.address);
        if (turnBy.has(k)) continue;
        turnBy.set(k, { stance: op.payload.stance, ref: op.payload.witness ?? "turn" });
        const kind = ABOUT[op.payload.stance] ? op.payload.stance : "holds";
        ops.push(perspectiveOperation({ holder: READER, claim: aboutKey(kind, k), stance: STANCE.HOLDS, basis: BASIS.REPORTED, via: [USER], witness: op.payload.witness ?? null }));
      }
    }
    if (!anchored && op.payload.stance === STANCE.REFUSES) unanchored.push({ witness: op.payload.witness ?? null, claim: claimText, why: "a correction pointing back at something no span's bytes name" });
  });
  for (const g of log.gaps) gaps.push(g);
  for (const g of unresolved) gaps.push({ type: "trail_unresolved", ...g });

  // 4. fold at the person's frame (the organ's one operation) and project
  const entries = [...structure, ...ops].map((e, i) => (e.seq != null ? e : { ...e, seq: i + 1 }));
  // THE TRAIL: the log keeps every act; the projection's one-belief-per-claim is a view. History is read from the log.
  const actsBy = new Map();
  for (const e of entries) {
    const pl = e.payload;
    if (!pl || pl.holder !== READER || !Array.isArray(pl.via) || !pl.via.includes(USER)) continue;
    const a = unAbout(pl.claim);
    if (!a) continue;
    (actsBy.get(a.key) ?? actsBy.set(a.key, []).get(a.key)).push({ seq: e.seq, kind: a.kind, witness: pl.witness ?? null });
  }
  const forWhom = userForWhom({ question });
  const holder = mind ? mindHolder(USER, mind) : USER;
  const uFold = foldUniverseAt(forWhom, { holder, entries });
  const projected = projectPerspectives(entries);
  const model = mentalModel(projected, USER, READER);
  const common = commonGround(projected, READER, holder);
  const div = divergence(projected, READER, holder);

  // 5. the reader's model of the person, back as W spans (stance carried; copies of U spans: they name universe addresses on purpose)
  const whom = [];
  const seenKeys = new Set();
  for (const b of model.attributed) {
    const a = unAbout(b.claim);
    if (!a) continue;
    const us = byKey.get(a.key);
    if (!us) continue;
    const t = turnBy.get(a.key), tr = trailBy.get(a.key);
    // "saw" is a plain seen/spoken (holds); a quoted span carries the person's own stance toward it and the turn's witness
    const stance = a.kind === "saw" ? STANCE.HOLDS : a.kind;
    // an explicit stance outranks having merely seen the span
    if (seenKeys.has(a.key) && a.kind === "saw") continue;
    if (a.kind !== "saw") for (let i = whom.length - 1; i >= 0; i--) if (whom[i].mindKey === a.key) whom.splice(i, 1);
    seenKeys.add(a.key);
    const kind = tr ? tr.via : "seen";
    const ref = t?.ref ?? tr?.ref ?? "mind";
    for (const u of us) whom.push({ ...u, side: "W", id: `mind-${u.id}`, stance, mindKey: a.key, exactBytes: exactAddrs.has(u.address), acts: actsBy.get(a.key) ?? [], provenance: { kind, ref } });
  }
  // GRAIN-HELD-CLAIM-PREREG Amendment 2: the person was also shown spans OUTSIDE this region. They cannot be held region spans, but an
  // arrangement they share with a region span is what `related` is typed against. Off by default (the default is run 12, unchanged).
  if (includeOutOfRegion) {
    const inRegion = new Set(region.map((r) => r.address));
    for (const s of trailSpans) {
      if (inRegion.has(s.address)) continue;
      const k = claimKeyOf(s);
      whom.push({ ...s, side: "W", id: `mind-oor-${s.id}`, stance: STANCE.HOLDS, mindKey: k, exactBytes: true, outOfRegion: true, acts: [{ seq: null, kind: "saw", witness: s.provenance?.ref ?? null }], provenance: { kind: s.provenance?.kind ?? "seen", ref: s.provenance?.ref ?? "mind" } });
    }
  }
  if (model.count === 0) gaps.push({ type: model.gap?.type ?? "no_attributed_beliefs", detail: model.gap?.detail ?? "the reader has attributed nothing to the person: unmodelled, which is not the person holding nothing" });
  for (const g of uFold.gaps) gaps.push({ type: g.type, detail: g.detail });

  return {
    whom,
    model: { count: model.count, ofHoldsInTotal: model.ofHoldsInTotal, coverage: model.coverage },
    legs: { admitted: uFold.admitted, material: uFold.gate.material, relevant: uFold.gate.relevant, coherent: uFold.gate.coherent, evaluable: uFold.gate.coherentEvaluable, trajectory: uFold.gate.trajectoryLength },
    common: common.count,
    divergence: { asymmetric: div.asymmetric.length, conflicting: div.conflicting.length },
    held: uFold.perspective?.heldCount ?? 0,
    witnessedByReader: [...(projected.perspectives?.[READER]?.beliefs ?? [])].filter((b) => b.basis === BASIS.WITNESSED).map((b) => b.claim),
    gaps,
    unanchored,
    unmodelled: model.count === 0,
    entries: Object.freeze(entries),
    counts: { whom: whom.length, exactBytes: whom.filter((w) => w.exactBytes && !w.outOfRegion).length, claimEquivalent: whom.filter((w) => !w.exactBytes).length, outOfRegion: whom.filter((w) => w.outOfRegion).length },
  };
}
