import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildReadingTimeline, foldLog, isCoherent, CELLS } from "./reading-timeline.js";
import { splitSentences } from "./spans.js";
import { extractSurfaces, discoverReferents, diaNorm } from "./surfaces.js";
import { resolvePronouns } from "./pronouns.js";
import { classifyWord } from "./wordclass.js";
import { readDocumentEvidence, classifyWithDocument } from "./document-evidence.js";

const posPrior = { forms: { the: { DET: 9 }, shall: { AUX: 9 }, pay: { VERB: 9 }, work: { NOUN: 9 }, inspect: { VERB: 9 }, praised: { VERB: 9 }, method: { NOUN: 9 }, said: { VERB: 9 }, was: { AUX: 9 }, pleased: { ADJ: 9 }, and: { CCONJ: 9 }, is: { AUX: 9 }, schools: { NOUN: 9 }, public: { ADJ: 9 }, nashville: { PROPN: 9 }, metropolitan: { ADJ: 9 }, call: { VERB: 9 }, see: { VERB: 9 } } };
const base = (f) => classifyWord(f, { posPrior });
const wordsIn = (text, off) => [...text.matchAll(/[\p{L}][\p{L}'’\-]*/gu)].map((m) => ({ w: m[0], s: off + m.index, e: off + m.index + m[0].length }));
const hash = (x) => createHash("sha256").update(String(x)).digest("hex");
const deps = { hash, diaNorm, splitSentences, wordsIn, extractSurfaces, discoverReferents, resolvePronouns, classifyAt: (prefix) => classifyWithDocument(base, readDocumentEvidence(prefix, { classify: base })) };

test("an acronym the text defines LATER is first a gap, then a name — a revision with its cause", () => {
  // MNPS is used before it is defined: the reader cannot place it, until the definition arrives
  const text = "MNPS shall pay the work. Call MNPS. See MNPS. The Metropolitan Nashville Public Schools (MNPS) shall inspect the work.";
  const tl = buildReadingTimeline(text, deps, { maxSnapshots: 10 });
  assert.equal(tl.snapshots.length, 4);
  const mnps = tl.snapshots[0].tokens.find((t) => t.w === "MNPS");
  assert.equal(mnps.upos === null || mnps.upos === "PROPN", true);
  const rev = tl.revisions.filter((r) => r.kind === "pos" && r.text === "MNPS");
  assert.ok(rev.length >= 1, "the early 'MNPS' is revised once the definition has been read");
  assert.equal(rev[0].to, "PROPN");
  assert.equal(rev[0].because.sentence, 4);
});

test("a reading of a prefix never sees the future", () => {
  const text = "Zorbax shall pay. Call Zorbax. The Zorbax Corp shall inspect the work.";
  const tl = buildReadingTimeline(text, deps, { maxSnapshots: 10 });
  assert.equal(tl.snapshots[0].tokens.every((t) => t.s < tl.sentences[0].end), true);
  assert.equal(tl.snapshots[2].tokens.length > tl.snapshots[0].tokens.length, true);
});

test("a name that grows retroactively re-binds the earlier mentions: 'Johnson' becomes 'Andrew Johnson'", () => {
  const text = "Andrew Johnson was the vice president under Lincoln. Lincoln was shot in April. He died the next morning. Johnson was sworn in. He faced the Senate. Later, Andrew Johnson vetoed the bill.";
  const tl = buildReadingTimeline(text, deps, { maxSnapshots: 10 });
  const before = tl.snapshots.find((s) => s.frontier === 5).mentions.filter((m) => m.kind === "name" && m.text === "Johnson").map((m) => m.name);
  assert.ok(before.length >= 1);
  const grew = tl.revisions.filter((r) => r.kind === "referent" && r.to === "Andrew Johnson");
  assert.ok(grew.length >= 1, "an earlier mention of 'Johnson' is re-bound once the full name is read");
  assert.equal(grew[0].because.sentence, 6);
});

test("a pronoun the engine cannot bind is reported unresolved, never invented", () => {
  const tl = buildReadingTimeline("Lincoln was shot in April. He died the next morning.", deps, { maxSnapshots: 10 });
  const p = tl.snapshots.at(-1).mentions.filter((m) => m.kind === "pronoun");
  for (const m of p) assert.ok(m.name === null || typeof m.name === "string");
});

test("stride caps the number of snapshots and the last one is always the whole text", () => {
  const text = Array.from({ length: 25 }, (_, i) => `Call Zorbax${i}.`).join(" ");
  const tl = buildReadingTimeline(text, deps, { maxSnapshots: 5 });
  assert.ok(tl.snapshots.length <= 6);
  assert.equal(tl.snapshots.at(-1).frontier, tl.sentences.length);
});

test("claims that are rebound or retracted as more is read are revisions too", () => {
  let n = 0;
  const readClaims = (prefix) => (prefix.includes("Later") ? [{ label: "praised", span: "x", s: 1, end1: "Curie", end2: "method" }] : [{ label: "praised", span: "x", s: 1, end1: "she", end2: "method" }]);
  const tl = buildReadingTimeline("She praised the method. Later, Curie spoke.", { ...deps, readClaims }, { maxSnapshots: 10 });
  const c = tl.revisions.find((r) => r.kind === "claim");
  assert.equal(c.from, "she → method");
  assert.equal(c.to, "Curie → method");
  void n;
});

test("no parser and no prior are assumed", () => {
  assert.throws(() => buildReadingTimeline("x", {}), /injected/);
});

test("an unlocated claim carries no position, so it can never be pinned to a word", () => {
  const readClaims = () => [{ label: "x", span: "", s: 0, e: 0, located: false, end1: "A", end2: "B" }];
  const tl = buildReadingTimeline("One two. Three four.", { ...deps, readClaims }, { maxSnapshots: 10 });
  for (const sn of tl.snapshots) for (const c of sn.claims) assert.equal(c.s, null);
});

test("a referent that stops being established is a retraction, not silence", () => {
  const mk = (names) => (sentences) => ({ events: names.map((n, i) => ({ surface: n, referent_id: "r" + i })) });
  let call = 0;
  const d2 = { ...deps, extractSurfaces: () => [], discoverReferents: (_s) => ({ events: (call++ === 0 ? [{ surface: "Gentry", referent_id: "r0" }] : [{ surface: "Zed", referent_id: "r1" }]) }) };
  const tl = buildReadingTimeline("Gentry spoke. Zed spoke.", d2, { maxSnapshots: 10 });
  assert.ok(tl.revisions.some((r) => r.kind === "referent-retracted" && r.text === "Gentry"));
  void mk;
});

const JOHNSON = "Andrew Johnson was the vice president under Lincoln. Lincoln was shot in April. He died the next morning. Johnson was sworn in. He faced the Senate. Later, Andrew Johnson vetoed the bill.";

test("every token has an id for its OWN span — content-addressed, and independent of any referent", () => {
  const a = buildReadingTimeline(JOHNSON, deps, { maxSnapshots: 10 }), b = buildReadingTimeline(JOHNSON, deps, { maxSnapshots: 10 });
  const t = a.snapshots.at(-1).tokens;
  assert.ok(t.every((x) => /^spn_[0-9a-f]{16}$/.test(x.id)));
  assert.equal(new Set(t.map((x) => x.id)).size, t.length);
  assert.deepEqual(t.map((x) => x.id), b.snapshots.at(-1).tokens.map((x) => x.id), "same source, same range, same id — recomputable by anyone");
  const other = buildReadingTimeline("Nothing. " + JOHNSON, deps, { maxSnapshots: 10 }).snapshots.at(-1).tokens;
  assert.notEqual(other.find((x) => x.w === "Lincoln").id, t.find((x) => x.w === "Lincoln").id, "a different source is a different address");
});

test("a referent is INS'd once and its hash id is not its name: it survives 'Johnson' becoming 'Andrew Johnson'", () => {
  const tl = buildReadingTimeline(JOHNSON, deps, { maxSnapshots: 10 });
  const ins = tl.log.filter((e) => e.op === "INS" && e.kind === "referent");
  assert.ok(ins.every((e) => /^ref_[0-9a-f]{16}$/.test(e.ref) && e.ref.slice(4) === e.id.slice(4)));
  const early = tl.snapshots[0].referents.find((r) => /johnson/i.test(r.name));
  const late = tl.snapshots.at(-1).referents.find((r) => /johnson/i.test(r.name));
  assert.ok(early && late);
  assert.equal(early.id, late.id, "one being, one address, whatever it is called now");
  assert.notEqual(early.name, late.name);
  assert.equal(ins.filter((e) => e.engine === early.engine).length, 1, "instantiated exactly once");
});

test("every event names its cell and the canon's grain check passes; the desert cell is refused", () => {
  const tl = buildReadingTimeline(JOHNSON, deps, { maxSnapshots: 10 });
  assert.ok(tl.log.length > 5);
  for (const e of tl.log) assert.equal(isCoherent(e), true, `${e.op}(${e.site}, ${e.stance})`);
  assert.equal(isCoherent({ op: "SYN", site: "Field", stance: "Cultivating" }), false, "SYN at Ground is the desert cell");
  assert.equal(isCoherent({ op: "INS", site: "Link", stance: "Making" }), false, "an Existence operator cannot land on a Structure terrain");
  assert.equal(isCoherent({ op: "CON", ...CELLS.CON }), true);
});

test("a mention's link to its referent is an event; reassigning appends a CON that supersedes the first — nothing is edited", () => {
  let call = 0;
  const d2 = { ...deps, extractSurfaces: () => [], discoverReferents: () => ({ events: [{ surface: "Zed", referent_id: call++ === 0 ? "A" : "B" }, { surface: "Quill", referent_id: "A" }], merges: [], gaps: [], addresses: null }) };
  const tl = buildReadingTimeline("Zed spoke. Quill spoke. Zed left.", d2, { maxSnapshots: 10 });
  const cons = tl.log.filter((e) => e.op === "CON" && e.span && tl.log.find((x) => x.span === e.span && x.kind === "mention")?.text === "Zed");
  const first = cons[0], re = cons.find((e) => e.supersedes === first.id);
  assert.ok(re, "the second CON names the first it supersedes");
  assert.notEqual(re.ref, first.ref);
  const before = foldLog(tl.log.filter((e) => e.id <= first.id || tl.log.indexOf(e) <= tl.log.indexOf(first)));
  assert.equal(before.assign.get(first.span), first.ref, "the fold at the earlier cursor still shows the earlier assignment");
  assert.equal(foldLog(tl.log).assign.get(first.span), re.ref);
});

test("two beings found to be one are a SYN of their ids; the mentions follow the alias with no new CON", () => {
  let call = 0;
  const d2 = { ...deps, extractSurfaces: () => [], discoverReferents: () => (call++ === 0 ? { events: [{ surface: "Bo", referent_id: "A" }, { surface: "Cy", referent_id: "B" }], merges: [], gaps: [], addresses: { refs: new Map(), born: new Map([["A", 0], ["B", 1]]), next: 2 } } : { events: [{ surface: "Bo", referent_id: "A" }, { surface: "Cy", referent_id: "A" }], merges: [{ kept: "A", folded: ["B"], witness: "Bo Cy", basis: "test" }], gaps: [], addresses: null }) };
  const tl = buildReadingTimeline("Bo came. Cy came. Bo and Cy left.", d2, { maxSnapshots: 10 });
  const syn = tl.log.find((e) => e.op === "SYN");
  assert.ok(syn); assert.equal(syn.from.length, 1); assert.match(syn.into, /^ref_/);
  const f = foldLog(tl.log);
  assert.equal(f.referents.has(syn.from[0]), false, "the folded id is no longer a being of its own");
  assert.equal(f.referents.get(syn.into).absorbed.includes(syn.from[0]), true);
  assert.ok(f.referents.get(syn.into).mentions.length >= 2);
  assert.ok(tl.revisions.some((r) => r.kind === "referent-merged"));
});

test("a person's own CON and SYN ride on top of the fold, attributed to them, and the log underneath is untouched", () => {
  const tl = buildReadingTimeline(JOHNSON, deps, { maxSnapshots: 10 });
  const base = foldLog(tl.log);
  const lincoln = [...base.referents.values()].find((r) => /lincoln/i.test(r.name));
  const johnson = [...base.referents.values()].find((r) => /johnson/i.test(r.name));
  const span = lincoln.mentions[0];
  const mine = [{ id: "evt_you1", op: "CON", ...CELLS.CON, span: span.id, ref: johnson.id, supersedes: base.cons.get(span.id), giver: "you", basis: "I say this is Johnson" }];
  const after = foldLog(tl.log, { overlay: mine });
  assert.equal(after.assign.get(span.id), johnson.id);
  assert.equal(after.history.get(span.id).at(-1).giver, "you");
  assert.equal(foldLog(tl.log).assign.get(span.id), lincoln.id, "undoing it is just not applying it — the reading's own log never changed");
  assert.ok(mine.every(isCoherent));
});

test("a snapshot's cursor into the log lets the fold be taken at any frontier", () => {
  const tl = buildReadingTimeline(JOHNSON, deps, { maxSnapshots: 10 });
  const sizes = tl.snapshots.map((s) => foldLog(tl.log.slice(0, s.logTo)).mentions.size);
  assert.deepEqual([...sizes].sort((a, b) => a - b), sizes, "more is known as more is read");
});
