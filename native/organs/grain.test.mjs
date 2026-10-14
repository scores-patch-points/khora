import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { foldGrain, splitRegion, selectGrain, contactVerdict, closureOf, uSpansFromRecord, STEPS, CELLS, ROLES } from "./grain.js";
import { makePinax, makeSpan, quoteOf, parseAddress } from "./pinax.js";
import { STANCE_BY_MODE, cellOf } from "../kernel/cube.js";
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

test("FIGURE: Clearing first, then dissect what refuses and bind what corroborates, then make what is absent", () => {
  const region = U(["Maria Lopez", "endorsed", "the hiring freeze", "+", 5], ["Maria Lopez", "opposed", "the fare increase", "+", 4], ["Daniel Reyes", "vetoed", "the bus route", "+", 3], ["The council", "ratified", "the depot lease", "+", 6], ["Daniel Reyes", "questioned", "the depot lease", "+", 2], ["The budget office", "approved", "the plan", "+", 1], ["Anna Cole", "chairs", "the finance committee", "+", 2], ["The finance committee", "reviews", "the fare increase", "+", 1]);
  const whom = W(["Maria Lopez", "endorsed", "the hiring freeze"], ["Daniel Reyes", "vetoed", "the bus route", "-"], ["The council", "ratified", "the depot lease"], ["Anna Cole", "chairs", "the finance committee"], ...FILLER);
  const f = foldGrain({ region, whom });
  assert.equal(f.grain, "Figure");
  assert.deepEqual(f.modes.map((m) => m.mode), STEPS.Figure.map(([, c]) => c));
  assert.deepEqual(f.modes.map((m) => m.mode), ["Clearing", "Dissecting", "Binding", "Making"]);
  assert.deepEqual(f.modes.map((m) => m.role), ["clear", "witness", "witness", "generate"]);
  const cases = Object.fromEntries(f.contacts.map((c) => [c.w, c.case]));
  assert.equal(cases[whom[0].address], "SINGLE");
  assert.equal(cases[whom[1].address], "CONTRADICTED");
  const [clearing, dissect, bind, make] = f.modes;
  assert.equal(clearing.items.length, region.length, "Clearing is the first step at every grain");
  assert.equal(dissect.items.length, 1, "one W span is refused by the record");
  assert.deepEqual(dissect.items[0].spans, [whom[1].address, region[2].address], "the W span beside the U span that refuses it, no verdict on who is right");
  assert.equal(bind.items.length, 3);
  assert.deepEqual(bind.items.map((s) => s.spans[0]).sort(), [whom[0].address, whom[2].address, whom[3].address].sort(), "the reader's own span, with the record's address beside it");
  assert.equal(make.items.length, f.distance.absent);
  assert.equal(make.items.find((s) => s.spans.includes(region[1].address)).attachedBy, "entity", "Maria Lopez attaches to the held span that names her");
  for (const m of [clearing, dissect, bind]) assert.equal(m.seams.seamCount, 0, `${m.mode}: a pairing of two addresses needs no sentence between them`);
  assert.equal(make.items.find((s) => s.attachedBy === "entity").segs.every((x) => x.kind === "source"), true, "a shared entity is an addressed join: no seam");
  assert.ok(make.items.some((s) => s.attachedBy === "nearest" && s.segs.some((x) => x.kind === "frame")), "with only the nearest span the bridge is a seam");
  assert.ok(make.items.every((s) => s.segs.filter((x) => x.kind === "source").every((x) => x.address)), "every copied word is addressed");
  assert.deepEqual(make.items[0].stance, { grain: "Figure", mode: "Generate", cell: "Making" }, "the stance is a computed pair, stamped per fold");
  assert.deepEqual(dissect.items[0].stance, { grain: "Figure", mode: "Differentiate", cell: "Dissecting" });
  assert.deepEqual(bind.items[0].stance, { grain: "Figure", mode: "Relate", cell: "Binding" });
  assert.equal(f.closure.closed, true);
  assert.equal(f.closure.mouthConfined, true, "only the generating cell speaks");
  assert.equal(f.seams.contract.ok, true);
});

test("GROUND: the reader holds nothing, so Clearing is the catalog — verbatim spans, zero seams — and the fold is still closed", () => {
  const region = U(["Maria Lopez", "approved", "the hiring freeze", "+", 5], ["The council", "approved", "the depot lease", "+", 6], ["Anna Cole", "chairs", "the finance committee", "+", 2], ["Noise Co", "said", "nothing", "+", 0]);
  for (const whom of [[], undefined]) {
    const f = foldGrain({ region, whom });
    assert.equal(f.grain, "Ground");
    assert.deepEqual(f.modes.map((m) => m.mode), ["Clearing", "Tending", "Cultivating"]);
    const [clearing, tending, cultivating] = f.modes;
    assert.equal(clearing.items.length, 3, "the span that does not survive noise is dropped");
    assert.deepEqual(clearing.items.map((s) => s.spans[0]), [region[1].address, region[0].address, region[2].address], "ordered by activation");
    assert.equal(clearing.seams.seamDensity, 0, "the one fold with no reader in it has no seam");
    assert.equal(clearing.seams.addressedShare, 1);
    assert.equal(tending.items.length, 0);
    assert.ok(tending.empty, "an empty mode says it ran and found nothing");
    assert.equal(cultivating.items.length, 3, "Cultivating works on what Clearing left standing, not the noise");
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

test("PATTERN: Clearing, then unravel the held edge the record cannot walk and trace the one it can, then compose the edge the reader lacks", () => {
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
  assert.deepEqual(f.modes.map((m) => m.mode), ["Clearing", "Unraveling", "Tracing", "Composing"]);
  const [clearing, unravel, trace, compose] = f.modes;
  assert.equal(clearing.seams.seamCount, 0);

  const mentors = unravel.items.find((s) => s.spans[0] === whom[5].address);
  assert.ok(mentors, "the reader's edge is surfaced");
  assert.ok(mentors.absence, "the seam is literal: the record holds no path");
  assert.equal(mentors.absence.between.length, 2);
  const flag = mentors.segs.find((g) => g.seam === "absence");
  assert.equal(flag.t, "", "the finding is a flagged gap with no words in it");
  assert.equal(unravel.seams.seamCount, unravel.items.filter((i) => i.absence).length, "its only seams are the flagged absences");

  const oversees = trace.items.find((s) => s.spans[0] === whom[6].address);
  assert.ok(oversees, "the reader's edge is corroborated by a chain");
  assert.equal(oversees.hops, 2);
  assert.deepEqual(oversees.spans.slice(1), [region[0].address, region[1].address], "the chain of U spans that walks one end to the other");
  assert.equal(trace.seams.seamCount, 0, "a chain of addressed spans needs no sentence between them");

  assert.equal(compose.items.length, 1);
  const c = compose.items[0];
  assert.ok(c.spans.includes(region[6].address), "the new edge");
  assert.equal(c.spans.length, 3, "addressed at both ends");
  assert.ok(compose.seams.seamCount >= 1, "Composing's new bytes are the joins");
  assert.equal(f.closure.closed, true);
  assert.equal(f.closure.mouthConfined, true);
  assert.equal(f.seams.contract.ok, true);
});

test("when every contact verdict is UNDETERMINED the mode cannot be read, so the fold runs at Ground whatever the distance", () => {
  const region = U(["Maria Lopez", "endorsed", "the hiring freeze", "+", 5], ["Daniel Reyes", "vetoed", "the bus route", "+", 4], ["The council", "ratified", "the depot lease", "+", 6], ["Anna Cole", "chairs", "the finance committee", "+", 3], ["Noor Aziz", "audited", "the fleet", "+", 1]);
  // the reader holds the same arrangements beyond the null, but about other objects: the record cannot read the reader's state
  const whom = W(["Maria Lopez", "endorsed", "the transit levy"], ["Daniel Reyes", "vetoed", "the zoning map"], ["The council", "ratified", "the pension plan"], ["Anna Cole", "chairs", "the audit board"], ...FILLER);
  const f = foldGrain({ region, whom });
  assert.equal(f.distance.null.real, true, "held beyond the null");
  assert.ok(f.distance.held > f.distance.absent, "so distance alone would select Pattern");
  assert.ok(f.contacts.length > 0 && f.contacts.every((c) => c.case === "UNDETERMINED"));
  assert.equal(f.grain, "Ground");
  assert.equal(f.selectorUnreadable, true);
  assert.match(f.why, /UNDETERMINED/);
  assert.equal(f.closure.closed, true);
});

test("Clearing runs first at every grain, and every later cell works on what it left standing", () => {
  const region = U(["Maria Lopez", "endorsed", "the hiring freeze", "+", 5], ["Maria Lopez", "opposed", "the fare increase", "+", 0], ["Daniel Reyes", "vetoed", "the bus route", "+", 3], ["The council", "ratified", "the depot lease", "+", 6], ["Anna Cole", "chairs", "the finance committee", "+", 2], ["Noor Aziz", "audited", "the fleet", "+", 1]);
  const whom = W(["Maria Lopez", "endorsed", "the hiring freeze"], ["Daniel Reyes", "vetoed", "the bus route"], ["The council", "ratified", "the depot lease"], ["Anna Cole", "chairs", "the finance committee"], ...FILLER);
  for (const w of [[], whom]) {
    const f = foldGrain({ region, whom: w });
    assert.equal(f.modes[0].mode, "Clearing");
    assert.equal(f.modes[0].role, "clear");
    const everything = f.modes.flatMap((m) => m.items.flatMap((i) => i.spans));
    assert.equal(everything.includes(region[1].address), false, "the span that did not survive noise appears nowhere");
  }
  assert.deepEqual(Object.values(CELLS).map((r) => Object.values(r)).flat().length, 9);
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

test("claimsOfWhom: W's pinned units read by the same claim reader become W spans; a thread too short to admit a claim is a typed absence", async () => {
  const { claimsOfWhom } = await import("./holdings.js");
  const BULK = "the lantern of the harbor was in the old lantern and the harbor was near it. ".repeat(40);
  const thread = "Daniel Reyes said the council delayed the vote. Maria Lopez approved the hiring freeze. Maria Lopez opposed the fare increase. The council approved the depot lease in March 2026. Daniel Reyes approved the bus route.";
  const pin = async (url, text) => Object.assign(await makePinax({ url, retrievedAt: "2026-10-14T00:00:00Z", raw: `<p>${text}</p>`, text: `${text}\n\n${BULK}` }), { declared: { published: "2026-10-01", modified: null, links: [] } });
  const rec = await pin("https://w.test/thread", thread);
  const slice = async (address) => { const p = parseAddress(address); if (p.pinax !== rec.entry.id) return null; const sp = await makeSpan(rec, p.layer, p.start, p.end); const q = sp.ok === false ? null : await quoteOf(sp, rec); return q?.ok ? q.text : null; };
  const w = await claimsOfWhom([rec], { slice });
  assert.ok(w.spans.length >= 3, w.why ?? "");
  assert.ok(w.spans.every((s) => s.side === "W" && s.claim.subj && s.address.startsWith(`${rec.entry.id}/`)), "every W span is addressed into W's own bytes");

  const none = await claimsOfWhom([], { slice });
  assert.deepEqual(none.spans, []);
  assert.match(none.why, /void reader/);

  // the reader's own claims, folded against a record that holds the same claims: held by claim arrangement, and typed as that witness
  const uRec = await pin("https://u.test/1", thread);
  const uSlice = async (address) => { const p = parseAddress(address); if (p.pinax !== uRec.entry.id) return null; const sp = await makeSpan(uRec, p.layer, p.start, p.end); const q = sp.ok === false ? null : await quoteOf(sp, uRec); return q?.ok ? q.text : null; };
  const u = await uSpansFromRecord(readCorpus([uRec], { question: "Who approved the depot lease?" }), { slice: uSlice, activation: new Map() });
  const split = splitRegion(u.map((s) => ({ ...s, activation: 1 })), w.spans);
  assert.equal(split.H.length, u.length, "the same claims, read by the same reader, are held");
  const f = foldGrain({ region: u.map((s) => ({ ...s, activation: 1 })), whom: w.spans });
  assert.equal(f.distance.witness, "claim-arrangement");
});

test("the nine cells are the engine's own stance table (kernel/cube.js), never a second copy", () => {
  for (const [grain, row] of Object.entries(CELLS)) for (const [mode, cell] of Object.entries(row)) assert.equal(cell, STANCE_BY_MODE[mode][grain]);
  // and they are what cellOf stamps: every operator of a mode, at each grain, carries the same stance name
  for (const op of ["DEF", "SEG", "NUL"]) for (const grain of ["Ground", "Figure", "Pattern"]) { const c = cellOf(op, grain); assert.equal(CELLS[grain][c.mode], c.stance); }
});
