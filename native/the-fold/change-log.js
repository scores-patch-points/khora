// the-fold/change-log.js — THE RECORD AS READER-CHANGES, NOT AN INVENTORY.
// 2026-10-11, after the doctrine corrections.
//
// WHY THIS FILE EXISTS. The weft's attestations were stored as *what is in the
// text* — an inventory — and an inventory licenses nothing (given = 0). The
// record is a CHANGE-LOG over a ground:
//
//   text  = the FLOOR (pointed at by address, never copied)
//   event = ONE typed, byte-addressed READER-CHANGE:
//            NEW            a relation first sighted (seed; the first read
//                           seeds the ground — its events ARE the initial state)
//            CORROBORATE    the same relation re-sighted at ANOTHER byte
//                           (the change is "now witnessed twice")
//            CONTEST        a sighting of the opposite polarity (S69, a CUT)
//            JOIN_NOMINEE   an understanding-change: the same being across two
//                           translations (S113) — nominated, witnessed by the
//                           two source addresses, never merely "a fact"
//   ground = the fold of the log, replayed (event-sourced; P159).
//
// Three consequences, each load-bearing:
//  · a claim survives only INSIDE the change that moved the ground; an
//    unchanged claim has no reason to exist as a record;
//  · a reread that "reads the same bytes differently" is an ambiguity/contest,
//    never a silent overwrite — both readings stay (LP19); a reread that
//    changes nothing writes NOTHING;
//  · a change is a change OF something — the ground must replay from the log
//    or the deltas have no base.
//
// WHY THE 125 BUILT NOTHING. Classified so (run `node .../change-log.mjs`):
// 125 relations ≈ 124 NEW (seed) + 1 CORROBORATE — one read per language means
// the first read each seeds, and only second-and-onward sightings are change.
// The cross-source candidates (JOIN_NOMINEE) ARE changes in understanding, not
// facts about any one text — they are the part of the record with standing as
// events — but they are nominations (unearned) until the for-whom meet holds.
//
// PURE. No I/O, no model; deterministic.

import { candidateJoins } from "./eot-weft.mjs";

export const CHANGE_EVENT_SCHEMA = "EOChangeEvent@1";
export const EVENT_TYPES = Object.freeze(["NEW", "CORROBORATE", "CONTEST", "JOIN_NOMINEE"]);

const STOP = new Set("a an and are as at be been being by del de der des die that the en e is it its la las le los lo of or in on un une was were will with for from to not no has have had this these those which who whom whose y o el i".split(" "));

/** The relation's identity key over a ground: its referent POINTS + label.
 *  Within one source (one pass) the points are stable births, so a re-sighting
 *  at another byte is the SAME relation — that is what corroboration is. */
const keyOf = (r) => `${r.participants?.[0]?.ref ?? ""}\u0000${r.relation}\u0000${r.participants?.[1]?.ref ?? ""}`;

/**
 * The events a weft records, in read order. Every event carries the byte
 * address it was seen at (`at` = `<source>#<byteOffset>`) — a change with no
 * byte address is refused (`assertEvent`), per S95/S113.
 *  - first sighting of a relation   → NEW (seed)
 *  - re-sighting, another byte      → CORROBORATE (the change: now ×2)
 *  - polarity "-" sighting          → CONTEST (S69; a cut, never a witness)
 *  - same surface across ≥2 sources → JOIN_NOMINEE (a change in understanding)
 */
export function eventsFromWeft(weft) {
  const seen = new Map(); // key -> first { witness, event }
  const events = [];
  for (const pass of weft ?? []) {
    for (const r of pass.relations ?? []) {
      const at = r.at != null ? `${pass.address}#${r.at}` : null;
      const key = keyOf(r);
      const pol = r.polarity === "-" ? "-" : "+";
      if (pol === "-") {
        events.push({ schema: CHANGE_EVENT_SCHEMA, type: "CONTEST", at, key, left: r.participants?.[0]?.surface, label: r.relation, right: r.participants?.[1]?.surface, source: pass.address });
        continue;
      }
      const prior = seen.get(key);
      if (!prior) {
        const ev = { schema: CHANGE_EVENT_SCHEMA, type: "NEW", at, key, left: r.participants?.[0]?.surface, label: r.relation, right: r.participants?.[1]?.surface, source: pass.address };
        assertEvent(ev);
        seen.set(key, { witness: at, event: ev });
        events.push(ev);
      } else if (at !== prior.witness) {
        const ev = { schema: CHANGE_EVENT_SCHEMA, type: "CORROBORATE", at, key, of: prior.event, left: r.participants?.[0]?.surface, label: r.relation, right: r.participants?.[1]?.surface, source: pass.address };
        assertEvent(ev);
        events.push(ev);
      }
      // a re-sighting at the SAME byte is nothing — no event (a reread that
      // changes nothing writes nothing).
    }
  }
  // the understanding-lane: same surface across >=2 sources is a change in
  // understanding, witnessed by the two source addresses, standing candidate.
  const nominees = candidateJoins(weft)
    .filter((c) => c.form.length >= 4 && !STOP.has(c.form));
  for (const c of nominees) {
    const ev = {
      schema: CHANGE_EVENT_SCHEMA, type: "JOIN_NOMINEE", at: c.witnesses[0] ?? null, key: `${c.points[0]}\u0000${c.points[1] ?? ""}`,
      surface: c.form, points: c.points, sources: new Set(c.points.map((p) => p.split("::")[0])),
      witnesses: c.witnesses, standing: "candidate",
    };
    if (ev.witnesses.length < 2 || !ev.witnesses.every((w) => /#\d+$/.test(w))) throw new TypeError("change-log: an understanding-change must carry two byte addresses");
    events.push(ev);
  }
  return Object.freeze(events);
}

/** A change with no byte address is no change: refused (the doctrine's third
 *  falsifier — "an understanding change with no byte address breaks it"). */
export function assertEvent(ev) {
  if (!ev || typeof ev !== "object") throw new TypeError("change-log: an event is required");
  if (!ev.type || !EVENT_TYPES.includes(ev.type)) throw new TypeError(`change-log: unknown event type ${ev.type}`);
  if (ev.type !== "JOIN_NOMINEE" && (typeof ev.at !== "string" || !/#\d+$/.test(ev.at))) throw new TypeError(`change-log: a ${ev.type} event must carry its byte address`);
  return ev;
}

/**
 * The GROUND — the fold of the log (event-sourced). Replaying the events
 * yields the current field deterministically: each NEW seeds a row with its
 * first byte witness; each CORROBORATE adds a witness; each CONTEST marks a
 * cut; each JOIN_NOMINEE lists a candidate understanding-change. The ground
 * is NEVER a separate inventory — it is a projection of this log.
 */
export function groundFromEvents(events) {
  const rows = new Map();
  const cuts = new Map();
  for (const ev of events ?? []) {
    if (ev.type === "NEW") rows.set(ev.key, { left: ev.left, label: ev.label, right: ev.right, witnesses: new Set([ev.at]), standing: "candidate", seeded: ev.at });
    else if (ev.type === "CORROBORATE" && rows.has(ev.key)) rows.get(ev.key).witnesses.add(ev.at);
    else if (ev.type === "CONTEST") { if (!cuts.has(ev.key)) cuts.set(ev.key, { left: ev.left, label: ev.label, right: ev.right, cuts: [] }); cuts.get(ev.key).cuts.push(ev.at); }
  }
  return Object.freeze({
    schema: "EOGround@1",
    rows: Object.freeze([...rows.values()].map((r) => Object.freeze({ ...r, witnesses: Object.freeze([...r.witnesses]) }))),
    cuts: Object.freeze([...cuts.values()].map((c) => Object.freeze({ ...c, cuts: Object.freeze(c.cuts) }))),
    joinNominees: Object.freeze((events ?? []).filter((e) => e.type === "JOIN_NOMINEE")),
  });
}

/** The honest accounting a 125-built-nothing read demands: seed vs change. */
export function classifyEvents(events) {
  const counts = { NEW: 0, CORROBORATE: 0, CONTEST: 0, JOIN_NOMINEE: 0 };
  for (const ev of events ?? []) counts[ev.type] += 1;
  return Object.freeze({ ...counts, change: counts.CORROBORATE + counts.CONTEST + counts.JOIN_NOMINEE });
}