import test from "node:test";
import assert from "node:assert/strict";
import { stageFromAtoms, judgeClaim, senseStanding, LICENSES } from "./stage.js";
import { checkProof } from "./proof-check.js";

// Nothing is true everywhere: a reading is one author's view, and what it holds it holds in a SENSE. A verdict is "by this reading, in the sense it states
// it". A value the source holds for other years is neither a contradiction of a claim about these years nor support for it.
const fig = (km) => ({ value: `${km} km`, measure: "length", base: km * 1000, alts: [] });
const radius = (km, { time = null, tense = null, hedged = false, neg = false } = {}) => ({ pred: "has_radius", args: [{ entity: 1, name: "Mercury" }, fig(km)], neg, hedged, approx: false, tense, time, start: 17, end: 56, text: `has_radius(Mercury, ${km} km)` });
const source = (a) => stageFromAtoms([a], { doc: "src" });

test("a stage and every verdict carry the frame they were read FOR", () => {
  const st = source(radius(2440)), j = judgeClaim(st, [radius(6000)]);
  assert.equal(st.forWhom.schema, "EOForWhom@1");
  assert.equal(st.forWhom.ground, "src");
  assert.match(st.forWhom.question, /hold the claim, in the sense it states it/);
  assert.equal(j.forWhom.id, st.forWhom.id);
  assert.equal(j.verdict, "C");
  assert.equal(j.sense, "unstated", "neither side states years, so the verdict stands and says its sense is unstated");
});

test("another year is another sense: the value neither contradicts nor supports, and that is a typed gap", () => {
  const st = source(radius(2440, { time: ["1900"] }));
  const c = judgeClaim(st, [radius(6000, { time: ["2020"] })]);
  assert.equal(c.verdict, "N");
  assert.equal(c.proofs.length, 0);
  const gap = c.gaps.find((g) => g.kind === "different_sense");
  assert.match(gap.why, /the claim is of 2020, the source of 1900/);
  const e = judgeClaim(st, [radius(2440, { time: ["2020"] })]);
  assert.notEqual(e.verdict, "E", "the same figure in another year is not support");
  assert.ok(e.gaps.some((g) => g.kind === "different_sense"));
});

test("the same year is a shared sense: the contradiction stands, and says so", () => {
  const j = judgeClaim(source(radius(2440, { time: ["1900"] })), [radius(6000, { time: ["1900"] })]);
  assert.equal(j.verdict, "C");
  assert.equal(j.sense, "shared");
  assert.equal(j.proofs[0].sense, "shared");
  assert.equal(judgeClaim(source(radius(2440, { time: ["1900"] })), [radius(2440, { time: ["1900"] })]).sense, "shared");
});

test("a claim that states no year is not withheld by a source that states one: the verdict stands, sense unstated", () => {
  const j = judgeClaim(source(radius(2440, { time: ["1900"] })), [radius(6000)]);
  assert.equal(j.verdict, "C");
  assert.equal(j.sense, "unstated");
  assert.deepEqual(senseStanding({ time: null }, { time: ["1900"] }), { standing: "unstated" });
});

test("tense does not decide: the reader's tense is a heuristic, and one fact can be said in two tenses", () => {
  const j = judgeClaim(source(radius(2440, { tense: "present" })), [radius(6000, { tense: "past" })]);
  assert.equal(j.verdict, "C", "a past claim against a present source is still read");
  assert.equal(j.gaps.filter((g) => g.kind === "different_sense").length, 0);
  assert.equal(judgeClaim(source(radius(2440, { tense: "present" })), [radius(2440, { tense: "past" })]).verdict, "E");
});

test("the atoms arm holds the same rule: a source atom stated for other years neither meets the claim nor contradicts it", async () => {
  const { atomSupport } = await import("./atom-support.js");
  const orbit = (neg, time) => ({ pred: "orbit", args: [{ entity: 1, name: "Mercury" }, { entity: 2, name: "the Sun" }], neg, hedged: false, time });
  assert.equal(atomSupport([orbit(false, ["2020"])], [orbit(false, ["2020"])]).verdict, "E");
  assert.equal(atomSupport([orbit(false, ["2020"])], [orbit(true, ["2020"])]).verdict, "C", "the same year: a denial contradicts");
  assert.equal(atomSupport([orbit(false, ["2020"])], [orbit(true, ["1900"])]).verdict, "N", "another year: a denial neither contradicts nor supports");
  assert.equal(atomSupport([orbit(false, ["2020"])], [orbit(false, ["1900"])]).verdict, "N", "another year: nor does a match support");
  assert.equal(atomSupport([orbit(false, null)], [orbit(true, ["1900"])]).verdict, "C", "a claim that states no year is compared as before");
});

// the independent checker re-derives the time from the source's own bytes
const SRC = "In 1900 Mercury had a radius of 2,440 km. Venus is hotter.";
const record = (claimTime) => { const a = SRC.indexOf("Mercury"), b = SRC.indexOf(".") ; return { rel: "has_radius", giver: LICENSES[0].giver, subject: "Mercury", claim: { label: "6,000 km", measure: "length", base: 6e6 }, sense: { claim: claimTime ? { tense: null, time: claimTime } : null },
  held: [{ span: [a, b], label: "2,440 km", measure: "length", base: 2.44e6 }] }; };

test("the checker rejects a held value that the source states for another year than the claim", () => {
  const lic = { licenses: [LICENSES[0].giver] };
  assert.equal(checkProof(record(null), SRC, lic).ok, true, "a claim that states no year is not held to one");
  assert.equal(checkProof(record(["1900"]), SRC, lic).ok, true, "the same year");
  const bad = checkProof(record(["2020"]), SRC, lic);
  assert.equal(bad.ok, false);
  assert.match(bad.why[0], /stated for 1900, the claim for 2020: another time/);
});

test("the checker counts point years only: a since-year or a report date is not another time", () => {
  const lic = { licenses: [LICENSES[0].giver] };
  for (const src of ["Since 1900 Mercury has had a radius of 2,440 km.", "According to the 1900 report, Mercury has a radius of 2,440 km.", "In the 1900s Mercury had a radius of 2,440 km."]) {
    const a = src.indexOf("Mercury"), b = src.indexOf("km.") + 2;
    const rec = { rel: "has_radius", giver: LICENSES[0].giver, subject: "Mercury", claim: { label: "6,000 km", measure: "length", base: 6e6 }, sense: { claim: { tense: null, time: ["2020"] } },
      held: [{ span: [a, b], label: "2,440 km", measure: "length", base: 2.44e6 }] };
    assert.equal(checkProof(rec, src, lic).ok, true, src);
  }
});

test("the reader gives a figure the sense of the clause it sits in", async () => {
  const GE = await import("../adapters/text/grammar-en.js");
  const fig1 = (t) => GE.claimsOf(t).find((c) => c.rel === "fig" && c.fig.measure !== "date");   // "In 1900 ..." has the year itself as a date figure first
  const past = fig1("Mercury had a radius of 2,440 kilometres in 1900.");
  assert.deepEqual([past.tense, past.time, past.polarity, past.asserted], ["past", ["1900"], "+", true]);
  assert.deepEqual(fig1("In 1900 the population was 3 million.").time, ["1900"], "a numeral predicate has no clause claim to borrow from");
  assert.equal(fig1("Mercury radius is not 6,000 kilometres.").polarity, "-", "the parse hangs the negator on the number");
  assert.equal(fig1("NASA says the radius of Mercury is 2,440 kilometres.").asserted, false);
  assert.equal(fig1("The population is 5 million.").time, null);
});

test("only a bare POINT year is a time of the fact; every other year-bearing phrase is unstated", async () => {
  const GE = await import("../adapters/text/grammar-en.js");
  const figs = (t) => GE.claimsOf(t).filter((c) => c.rel === "fig" && c.fig.measure !== "date");
  const times = (t) => figs(t).map((c) => c.time);
  // points
  assert.deepEqual(times("The population was 3 million in 1900."), [["1900"]]);
  assert.deepEqual(times("In May 2024 the population was 3 million."), [["2024"]]);
  assert.deepEqual(times("On March 3, 2010 the population was 3 million."), [["2010"]]);
  assert.deepEqual(times("During 1999 Mercury had a radius of 2,440 kilometres."), [["1999"]]);
  // an interval opening or closing, an interval, a deadline, a decade, and a date for the SAYING are not points of the fact
  assert.deepEqual(times("Since 2010 the population has grown to 5 million."), [null], "since opens an interval");
  assert.deepEqual(times("By 2020 the radius was 2,440 kilometres."), [null], "by is a deadline");
  assert.deepEqual(times("In the 1990s the population was 3 million."), [null], "a decade is not a year");
  assert.ok(times("According to the 2008 report, about 80,000 people are at risk.").every((t) => t === null), "2008 dates the saying, not the fact");
  assert.ok(times("Between 1950 and 2022, about 47,000 people attempted to climb.").every((t) => t === null), "an interval is not two points");
  // and a proposition claim reads its own adjunct the same way
  const c = (t) => GE.claimsOf(t).find((q) => q.rel !== "fig");
  assert.deepEqual(c("In May 2024 we entered into the Amendment.").time, ["2024"]);
  assert.equal(c("Since 2010 the population has grown.").time, null);
});
