import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { foldGrain, splitRegion, selectGrain, contactVerdict, closureOf, uSpansFromRecord, MODES, ROLES } from "./grain.js";
import { makePinax, makeSpan, quoteOf, parseAddress } from "./pinax.js";
import { readCorpus } from "./callimachus.js";

let n = 0;
const mk = (side, [subj, pred, obj, polarity = "+", activation = 0]) => {
  const i = n++;
  const address = `px_${side.toLowerCase()}/text@h#b${i * 100}-${i * 100 + 40}`;
  return { id: `${side}${i}`, address, text: `${subj} ${polarity === "-" ? "did not " : ""}${pred} ${obj}.`, side, claim: { subj, pred, obj, polarity }, activation };
};
const U = (...rows) => rows.map((r) => mk("U", r));
const W = (...rows) => rows.map((r) => mk("W", r));
const FILLER = [["Priya Nair", "visited", "the harbor"], ["Tom Weld", "wrote", "a letter"], ["Iris Vale", "painted", "the fence"], ["Omar Reed", "repaired", "the pump"], ["Lena Cho", "sold", "the orchard"], ["Ben Ash", "carried", "the ladder"], ["Ruth Doyle", "sang", "a ballad"], ["Kofi Mensah", "measured", "the field"]];

test("contactVerdict is mergeTestimony pointed across the corpora: U spans witness a W claim", () => {
  const [w] = W(["Daniel Reyes", "approved", "the bus route", "-"]);
  const [refuses] = U(["Daniel Reyes", "approved", "the bus route", "+"]);
  const [also] = U(["Daniel Reyes", "approved", "the bus route", "+"]);
  assert.equal(contactVerdict(w, [refuses]).case, "CONTRADICTED", "every determining U witness refuses W's claim");
  const [agrees] = U(["Daniel Reyes", "approved", "the bus route", "-"]);
  assert.equal(contactVerdict(w, [agrees]).case, "SINGLE");
  assert.equal(contactVerdict(w, [agrees, refuses]).case, "DISAGREE");
  assert.equal(contactVerdict(w, [agrees, U(["Daniel Reyes", "approved", "the bus route", "-"])[0]]).case, "AGREE");
  assert.equal(contactVerdict(w, [U(["Daniel Reyes", "approved", "the depot lease", "+"])[0]]).case, "UNDETERMINED", "another object: both can be true");
  assert.equal(contactVerdict(w, []).case, "UNDETERMINED");
  assert.ok(also);
});

test("the shuffle null: shared vocabulary is not a held claim", () => {
  const region = U(["Maria Lopez", "approved", "the hiring freeze", "+", 5], ["Daniel Reyes", "opposed", "the fare increase", "+", 4], ["The council", "approved", "the depot lease", "+", 3], ["Anna Cole", "chairs", "the committee", "+", 2]);
  // every subject and every predicate of the region is in W, never paired as in the region
  const vocab = W(["Maria Lopez", "opposed", "the lease"], ["Daniel Reyes", "chairs", "the plan"], ["The council", "visited", "the harbor"], ["Anna Cole", "approved", "the route"], ...FILLER);
  const s = splitRegion(region, vocab);
  assert.equal(s.H.length, 0);
  assert.equal(s.null.real, false);
  assert.equal(selectGrain(s).grain, "Ground");
});

test("the shuffle null: a held span that survives the predicate shuffle is real", () => {
  const region = U(["Maria Lopez", "endorsed", "the hiring freeze", "+", 5], ["Maria Lopez", "opposed", "the fare increase", "+", 4], ["Daniel Reyes", "vetoed", "the bus route", "+", 3], ["The council", "ratified", "the depot lease", "+", 6], ["Daniel Reyes", "questioned", "the depot lease", "+", 2], ["The budget office", "approved", "the plan", "+", 1], ["Anna Cole", "chairs", "the finance committee", "+", 2], ["The finance committee", "reviews", "the fare increase", "+", 1]);
  const whom = W(["Maria Lopez", "endorsed", "the hiring freeze"], ["Daniel Reyes", "vetoed", "the bus route", "-"], ["The council", "ratified", "the depot lease"], ["Anna Cole", "chairs", "the finance committee"], ...FILLER);
  const s = splitRegion(region, whom);
  assert.equal(s.H.length, 4);
  assert.equal(s.A.length, 4);
  assert.equal(s.null.real, true, `exceeded ${s.null.exceeded} of ${s.null.draws}`);
  assert.equal(s.distance, 4 / 8);
  assert.ok(s.null.permutations > 1000, "the null has the power to be beaten");
});

test("FIGURE: dissect what refuses, bind what corroborates, make what is absent — framed by the nearest held span", () => {
  const region = U(["Maria Lopez", "endorsed", "the hiring freeze", "+", 5], ["Maria Lopez", "opposed", "the fare increase", "+", 4], ["Daniel Reyes", "vetoed", "the bus route", "+", 3], ["The council", "ratified", "the depot lease", "+", 6], ["Daniel Reyes", "questioned", "the depot lease", "+", 2], ["The budget office", "approved", "the plan", "+", 1], ["Anna Cole", "chairs", "the finance committee", "+", 2], ["The finance committee", "reviews", "the fare increase", "+", 1]);
  const whom = W(["Maria Lopez", "endorsed", "the hiring freeze"], ["Daniel Reyes", "vetoed", "the bus route", "-"], ["The council", "ratified", "the depot lease"], ["Anna Cole", "chairs", "the finance committee"], ...FILLER);
  const f = foldGrain({ region, whom });
  assert.equal(f.grain, "Figure");
  assert.deepEqual(f.modes.map((m) => m.mode), [...MODES.Figure]);
  assert.deepEqual(f.modes.map((m) => m.role), [...ROLES]);
  const cases = Object.fromEntries(f.contacts.map((c) => [c.w, c.case]));
  assert.equal(cases[whom[0].address], "SINGLE");
  assert.equal(cases[whom[1].address], "CONTRADICTED");
  const [dissect, bind, make] = f.modes;
  assert.equal(dissect.items.length, 1, "one W span is refused by the record");
  assert.deepEqual(dissect.items[0].spans, [whom[1].address, region[2].address], "the W span beside the U span that refuses it, no verdict on who is right");
  assert.equal(bind.items.length, 3);
  assert.deepEqual(bind.items.map((s) => s.spans[0]).sort(), [whom[0].address, whom[2].address, whom[3].address].sort(), "the reader's own span, with the record's address beside it");
  assert.equal(make.items.length, f.distance.absent);
  assert.equal(make.items.find((s) => s.spans.includes(region[1].address)).attachedBy, "entity", "Maria Lopez attaches to the held span that names her");
  assert.ok(make.items.every((s) => s.segs.filter((x) => x.kind === "source").every((x) => x.address)), "every copied word is addressed");
  assert.equal(f.closure.closed, true);
  assert.equal(f.seams.contract.ok, true);
});

test("GROUND: the reader holds nothing, so Clearing is the catalog — verbatim spans, zero seams — and the fold is still closed", () => {
  const region = U(["Maria Lopez", "approved", "the hiring freeze", "+", 5], ["The council", "approved", "the depot lease", "+", 6], ["Anna Cole", "chairs", "the finance committee", "+", 2], ["Noise Co", "said", "nothing", "+", 0]);
  for (const whom of [[], undefined]) {
    const f = foldGrain({ region, whom });
    assert.equal(f.grain, "Ground");
    assert.deepEqual(f.modes.map((m) => m.mode), [...MODES.Ground]);
    const [clearing, tending, cultivating] = f.modes;
    assert.equal(clearing.items.length, 3, "the span that does not survive noise is dropped");
    assert.deepEqual(clearing.items.map((s) => s.spans[0]), [region[1].address, region[0].address, region[2].address], "ordered by activation");
    assert.equal(clearing.seams.seamDensity, 0, "the one fold with no reader in it has no seam");
    assert.equal(clearing.seams.addressedShare, 1);
    assert.equal(tending.items.length, 0);
    assert.ok(tending.empty, "an empty mode says it ran and found nothing");
    assert.equal(cultivating.items.length, 3);
    assert.equal(f.closure.closed, true);
    assert.equal(f.distance.share, 1);
  }
});

test("GROUND: Cultivating lays the survivors out by division, ordered by activation, with a flagged seam between divisions", () => {
  const region = U(["A One", "met", "B Two", "+", 1], ["C Three", "met", "D Four", "+", 9], ["E Five", "met", "F Six", "+", 4]);
  region[0].division = "page-x"; region[1].division = "page-y"; region[2].division = "page-x";
  const f = foldGrain({ region, whom: [] });
  const cult = f.modes[2];
  assert.deepEqual(cult.divisions.map((d) => d.division), ["page-y", "page-x"]);
  assert.deepEqual(cult.items.map((s) => s.spans[0]), [region[1].address, region[2].address, region[0].address]);
  assert.ok(cult.items[1].segs[0].kind === "frame", "the bridge between two divisions is a seam, typed");
  assert.ok(cult.seams.seamCount >= 1);
});

test("PATTERN: unravel the held edge the record cannot walk, trace the one it can, compose the edge the reader lacks", () => {
  const region = U(
    ["Maria Lopez", "chairs", "the finance committee", "+", 5],
    ["The finance committee", "reviews", "the budget office", "+", 4],
    ["The budget office", "funds", "the depot lease", "+", 3],
    ["Daniel Reyes", "approved", "the bus route", "+", 3],
    ["The council", "approved", "the depot lease", "+", 6],
    ["Anna Cole", "opposed", "the bus route", "+", 2],
    ["The council", "funds", "the finance committee", "+", 1],
  );
  const whom = W(
    ["Maria Lopez", "chairs", "the finance committee"],
    ["The finance committee", "reviews", "the budget office"],
    ["The budget office", "funds", "the depot lease"],
    ["Daniel Reyes", "approved", "the bus route"],
    ["The council", "approved", "the depot lease"],
    ["Daniel Reyes", "mentors", "Maria Lopez"], // a held edge the record cannot walk: Daniel's component never meets Maria's
    ["Maria Lopez", "oversees", "the budget office"], // a held edge the record walks in two hops
    ...FILLER.slice(0, 5),
  );
  const f = foldGrain({ region, whom });
  assert.equal(f.grain, "Pattern", JSON.stringify(f.distance.null));
  const [unravel, trace, compose] = f.modes;
  assert.deepEqual(f.modes.map((m) => m.mode), [...MODES.Pattern]);

  const mentors = unravel.items.find((s) => s.spans[0] === whom[5].address);
  assert.ok(mentors, "the reader's edge is surfaced");
  assert.ok(mentors.absence, "the seam is literal: the record holds no path");
  assert.equal(mentors.absence.between.length, 2);

  const oversees = trace.items.find((s) => s.spans[0] === whom[6].address);
  assert.ok(oversees, "the reader's edge is corroborated by a chain");
  assert.equal(oversees.hops, 2);
  assert.deepEqual(oversees.spans.slice(1), [region[0].address, region[1].address], "the chain of U spans that walks one end to the other");

  assert.equal(compose.items.length, 1);
  const c = compose.items[0];
  assert.ok(c.spans.includes(region[6].address), "the new edge");
  assert.equal(c.spans.length, 3, "addressed at both ends");
  assert.equal(f.closure.closed, true);
  assert.equal(f.seams.contract.ok, true);
});

test("a fold that skips a mode, or runs them out of order, is unclosed (computed from what ran)", () => {
  const full = foldGrain({ region: U(["A One", "met", "B Two", "+", 1]), whom: [] });
  assert.equal(full.closure.closed, true);
  const m = (role, ran = true) => ({ role, ran });
  assert.equal(closureOf([m("clear"), m("witness"), m("generate")]).closed, true);
  assert.equal(closureOf([m("clear"), m("generate")]).closed, false);
  assert.equal(closureOf([m("clear"), m("witness"), m("generate", false)]).closed, false);
  assert.equal(closureOf([m("witness"), m("clear"), m("generate")]).closed, false);
});

test("two readers, same words, same universe: the grain follows what each holds", () => {
  const region = U(["Maria Lopez", "approved", "the hiring freeze", "+", 5], ["Maria Lopez", "opposed", "the fare increase", "+", 4], ["Daniel Reyes", "approved", "the bus route", "+", 3], ["The council", "approved", "the depot lease", "+", 6], ["Daniel Reyes", "opposed", "the depot lease", "+", 2], ["The budget office", "approved", "the plan", "+", 1]);
  const far = foldGrain({ region, whom: [] });
  const dense = foldGrain({ region, whom: W(...region.map((u) => [u.claim.subj, u.claim.pred, u.claim.obj]), ...FILLER) });
  assert.equal(far.grain, "Ground");
  assert.equal(dense.grain, "Pattern", "a reader who holds all of it is given what can still be new: relations");
  assert.equal(far.distance.share, 1);
  assert.equal(dense.distance.share, 0);
  assert.deepEqual(far.modes[0].items.map((s) => s.spans[0]), [region[3].address, region[0].address, region[1].address, region[2].address, region[4].address, region[5].address]);
});

test("uSpansFromRecord: a real Callimachus record becomes spans whose claim text is sliced from the pinned bytes", async () => {
  const BULK = "the lantern of the harbor was in the old lantern and the harbor was near it. ".repeat(40);
  const A = "Daniel Reyes said the council delayed the vote. Maria Lopez approved the hiring freeze. Maria Lopez opposed the fare increase. The council approved the depot lease in March 2026. Daniel Reyes approved the bus route.";
  const rec = await makePinax({ url: "https://a.test/1", retrievedAt: "2026-10-14T00:00:00Z", raw: `<p>${A}</p>`, text: `${A}\n\n${BULK}` });
  Object.assign(rec, { declared: { published: "2026-10-01", modified: null, links: [] } });
  const record = readCorpus([rec], { question: "Who approved the depot lease?" });
  const slice = async (address) => { const p = parseAddress(address); if (p.pinax !== rec.entry.id) return null; const sp = await makeSpan(rec, p.layer, p.start, p.end); const q = sp.ok === false ? null : await quoteOf(sp, rec); return q?.ok ? q.text : null; };
  const spans = await uSpansFromRecord(record, { slice });
  assert.ok(spans.length >= 3);
  const bus = spans.find((s) => /bus route/.test(s.text));
  assert.equal(bus.claim.subj, "Daniel Reyes");
  assert.equal(bus.claim.pred, "approved");
  assert.equal(bus.side, "U");
  // a W span that refuses it, read by the same contact
  const [w] = W(["Daniel Reyes", "approved", bus.claim.obj, "-"]);
  assert.equal(contactVerdict(w, spans).case, "CONTRADICTED");
  assert.equal(contactVerdict(w, spans).refused[0].address, bus.address);
});
