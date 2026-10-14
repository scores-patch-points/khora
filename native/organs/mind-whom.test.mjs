import test from "node:test";
import assert from "node:assert/strict";
import { mindOf, claimKeyOf } from "./mind-whom.js";
import { whomFromTrail, accumulate } from "./trail-whom.js";
import { foldWithWhom, standingsOf } from "./whom-standing.js";
import { READER } from "../kernel/perspective.js";

let n = 0;
const U = (subj, pred, obj, text, act = 1, pol = "+") => ({ id: `u${n++}`, address: `px_a/text@h#b${n * 60}-${n * 60 + 50}`, text, side: "U", claim: { subj, pred, obj, polarity: pol }, activation: act });
const region = [
  U("Maria", "approved", "the freeze", "Maria approved the freeze.", 5),
  U("Daniel", "opposed", "the fare increase", "Daniel opposed the fare increase.", 4),
  U("Anna", "chairs", "the committee", "Anna chairs the committee.", 3),
  U("Priya", "visited", "the harbor", "Priya visited the harbor.", 2),
];
const priors = { negation: new Set(["no", "not"]), anaphoric: new Set(["that", "it", "this"]), firstPerson: /^(i|my|me)$/ , interrogatives: new Map([["who", "person"], ["what", "thing"]]) };
const Q = "Who approved the freeze?";

test("M1: a seen-only trail lands the same spans through the organ as through the trail organ", () => {
  const trail = accumulate([], [region[0].address, region[2].address], { turn: 1 });
  const viaTrail = whomFromTrail(trail, { universe: region }).spans.map((s) => s.address).sort();
  const m = mindOf({ question: Q, region, trail });
  assert.deepEqual(m.whom.map((s) => s.address).sort(), viaTrail);
  assert.equal(m.unmodelled, false);
  assert.equal(m.model.count, 2);
});

test("M2: the person's own words never become the reader's witnessed beliefs", () => {
  const m = mindOf({ question: Q, region, turns: ["I think Maria approved the freeze.", "Who opposed the fare increase?"], priors });
  const keys = new Set(region.map(claimKeyOf));
  assert.equal(m.witnessedByReader.length, keys.size);
  assert.ok(m.witnessedByReader.every((k) => keys.has(k)), "only record keys are witnessed");
  assert.ok(m.witnessedByReader.every((k) => !/i think/i.test(k)));
});

test("M3: a quoted-and-corrected span is the reader axis `no`; the plain seen span is held", () => {
  const turns = ["No, that's wrong: Maria approved the freeze."];
  const m = mindOf({ question: Q, region, trail: accumulate([], [region[1].address], { turn: 1 }), turns, priors });
  const refused = m.whom.find((s) => s.address === region[0].address);
  assert.equal(refused?.stance, "refuses");
  const s = standingsOf({ region, whom: m.whom }).items;
  const maria = s.find((i) => i.proposition.includes("maria|approved"));
  assert.equal(maria.reader, "no");
  assert.equal(maria.standing, "held-refuted");
  const daniel = s.find((i) => i.proposition.includes("daniel|opposed"));
  assert.equal(daniel.reader, "yes");
});

test("M3b: doubts read as nothing and conceded is not a reading (stance honoured in the standings)", () => {
  const base = { ...region[0], side: "W", id: "w1", provenance: { kind: "seen", ref: "t" } };
  const items = (stance) => standingsOf({ region, whom: [{ ...base, stance }] }).items.find((i) => i.proposition.includes("maria|approved")).reader;
  assert.equal(items("refuses"), "no");
  assert.equal(items("doubts"), "nothing");
  assert.equal(items("conceded"), "nothing");
  assert.equal(items("holds"), "yes");
});

test("M4: nothing attributed is typed unmodelled; a trail clears it", () => {
  const none = mindOf({ question: Q, region });
  assert.equal(none.unmodelled, true);
  assert.ok(none.gaps.some((g) => g.type === "no_attributed_beliefs"));
  const f = foldWithWhom({ region, whom: [], mind: none });
  assert.ok(f.refusals.some((r) => r.code === "mind-unmodelled"));
  assert.equal(f.refused, false, "typed and disclosed, not a render refusal");
  const seen = mindOf({ question: Q, region, trail: accumulate([], [region[0].address], { turn: 1 }) });
  assert.equal(foldWithWhom({ region, whom: [], mind: seen }).refusals.some((r) => r.code === "mind-unmodelled"), false);
});

test("M5: an unanchored correction is kept, typed, and changes no standing", () => {
  const trail = accumulate([], [region[0].address], { turn: 1 });
  const a = mindOf({ question: Q, region, trail });
  const b = mindOf({ question: Q, region, trail, turns: ["No, that's wrong."], priors });
  assert.equal(b.unanchored.length, 1);
  assert.deepEqual(standingsOf({ region, whom: b.whom }).counts, standingsOf({ region, whom: a.whom }).counts);
});

test("M6: the gate is reported and the grain does not depend on it", () => {
  const trail = accumulate([], [region[0].address, region[1].address], { turn: 1 });
  const m = mindOf({ question: Q, region, trail });
  assert.equal(typeof m.legs.material, "boolean");
  assert.equal(m.legs.evaluable, false, "fewer than 12 encounters: coherence is withheld, not refused");
  const withMind = foldWithWhom({ region, whom: [], mind: m });
  const withSpans = foldWithWhom({ region, whom: m.whom });
  assert.equal(withMind.grain, withSpans.grain);
  assert.ok(withMind.mind.legs);
});

test("P1: the trail is the log: a span seen, then quoted-and-refused, keeps both acts in order and nothing is erased", () => {
  const trail = accumulate([], [region[0].address], { turn: 1 });
  const m = mindOf({ question: Q, region, trail, turns: ["No, that's wrong: Maria approved the freeze."], priors });
  const w = m.whom.find((s) => s.address === region[0].address);
  assert.equal(w.stance, "refuses", "the last act is the stance");
  assert.deepEqual(w.acts.map((a) => a.kind), ["saw", "refuses"], "both acts, in order");
  assert.ok(w.acts[0].seq < w.acts[1].seq);
  // the reader's own witnessed belief is untouched and the log kept every act it was given
  assert.ok(m.witnessedByReader.includes(claimKeyOf(region[0])));
  const before = m.entries.length;
  const again = mindOf({ question: Q, region, trail, turns: ["No, that's wrong: Maria approved the freeze."], priors });
  assert.equal(again.entries.length, before);
  assert.ok(Object.isFrozen(m.entries));
});

test("P2/P3: exact bytes are typed apart from claim-equivalent spans; P4: unresolved only if the universe lacks the address", () => {
  const twin = U("Maria", "approved", "the freeze", "In March, Maria approved the freeze.", 1); // same claim, another sentence
  const reg = [...region, twin];
  const trail = accumulate([], [region[0].address], { turn: 1 });
  const m = mindOf({ question: Q, region: reg, trail });
  const exact = m.whom.filter((w) => w.exactBytes).map((w) => w.address);
  assert.deepEqual(exact, [region[0].address]);
  assert.equal(m.counts.claimEquivalent, 1);
  assert.equal(m.whom.find((w) => w.address === twin.address).exactBytes, false);
  // an address outside the region but inside the universe is not "unresolved"
  const outside = U("Zed", "wrote", "a note", "Zed wrote a note.", 0);
  const m2 = mindOf({ question: Q, region: reg, universe: [...reg, outside], trail: accumulate(trail, [outside.address], { turn: 2 }) });
  assert.equal(m2.gaps.filter((g) => g.type === "trail_unresolved").length, 0);
  const m3 = mindOf({ question: Q, region: reg, trail: accumulate(trail, ["px_nowhere/text@h#b0-1"], { turn: 2 }) });
  assert.equal(m3.gaps.filter((g) => g.type === "trail_unresolved").length, 1);
});
