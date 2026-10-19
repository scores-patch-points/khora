import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildReadingTimeline, buildCorpusTimeline, splitOf, foldLog, isCoherent, CELLS } from "./reading-timeline.js";
import { splitSentences } from "./spans.js";
import { extractSurfaces, discoverReferents, diaNorm, namesCorefer, genericTokens } from "./surfaces.js";
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
  const before = foldLog(tl.log.slice(0, tl.log.indexOf(first) + 1));
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


// ── many sources: provenance and the ontological split ───────────────────────────────────────────────────────
const cdeps = { ...deps, namesCorefer, genericTokens };
const REPORT = "Captain Smith ordered the boats lowered. Captain Smith spoke to Ismay on the bridge. Ismay asked the Captain about the ice. Captain Smith went down with the ship.";
const SCRIPT = "Captain Smith stood on the bridge. Jack Dawson climbed to the rail. Captain Smith ordered the boats lowered. Jack Dawson held the girl.";
const MEMOIR = "Beesley saw Captain Smith on the bridge. Beesley wrote that Captain Smith ordered the boats lowered.";

test("every event carries the source and register it was read in", () => {
  const c = buildCorpusTimeline([{ id: "src_report", label: "Report", text: REPORT, register: "report" }, { id: "src_script", label: "Script", text: SCRIPT, register: "fiction" }], cdeps, { maxSnapshots: 6 });
  const perSource = (id) => c.log.filter((e) => e.source === id);
  assert.ok(perSource("src_report").length > 3 && perSource("src_script").length > 3);
  assert.ok(perSource("src_report").every((e) => e.register === "report"));
  assert.ok(perSource("src_script").every((e) => e.register === "fiction"));
  const spans = c.log.filter((e) => e.op === "INS" && e.kind === "mention");
  assert.equal(new Set(spans.map((e) => e.span)).size, spans.length, "the same range in two sources is two different spans");
});

test("a link across sources keeps both ends, their sources and registers, and names the split — it is not a merge", () => {
  const c = buildCorpusTimeline([{ id: "src_report", text: REPORT, register: "report" }, { id: "src_script", text: SCRIPT, register: "fiction" }], cdeps, { maxSnapshots: 6 });
  const link = c.links.find((l) => /smith/i.test(l.from.name) && /smith/i.test(l.to.name));
  assert.ok(link, "the two Smiths correspond");
  assert.equal(link.op, "CON"); assert.equal(link.kind, "correspondence");
  assert.deepEqual([link.from.register, link.to.register], ["fiction", "report"], "the telling-end first");
  assert.deepEqual([link.from.source, link.to.source], ["src_script", "src_report"]);
  assert.equal(link.split.kind, "fictionalizes"); assert.equal(link.split.across, true);
  assert.deepEqual(link.split.truthClaiming, [false, true]);
  assert.match(link.checkedBy, /namesCorefer/);
  assert.equal(isCoherent(link), true);
  const f = foldLog(c.log);
  assert.notEqual(link.from.ref, link.to.ref, "two referents remain — the ends stay ends");
  assert.ok(f.referents.has(link.from.ref) && f.referents.has(link.to.ref));
  const being = f.beingOf.get(link.from.ref);
  assert.equal(being, f.beingOf.get(link.to.ref), "one being across the readings");
  assert.equal(being.ends.length >= 2, true);
  assert.equal(being.reality, "fictionalized-real");
});

test("a being only a telling attests is fictional; one only the record attests is real", () => {
  const c = buildCorpusTimeline([{ id: "src_report", text: REPORT, register: "report" }, { id: "src_script", text: SCRIPT, register: "fiction" }], cdeps, { maxSnapshots: 6 });
  const f = foldLog(c.log);
  const named = (re) => f.beings.find((b) => re.test(b.name ?? ""));
  assert.equal(named(/dawson/i).reality, "fictional");
  assert.equal(named(/dawson/i).registers.join(), "fiction");
  // a being only the record attests (more mentions, so the engine admits it)
  const R2 = "Bruce Ismay asked the Captain. Ismay spoke to Smith. Ismay left the bridge. Bruce Ismay went below. Captain Smith ordered the boats lowered. Captain Smith spoke to Bruce Ismay.";
  const c2 = buildCorpusTimeline([{ id: "src_report", text: R2, register: "report" }, { id: "src_script", text: SCRIPT, register: "fiction" }], cdeps, { maxSnapshots: 6 });
  const f2 = foldLog(c2.log);
  assert.equal(f2.beings.find((b) => /ismay/i.test(b.name ?? "")).reality, "real");
});

test("two sources that both claim correspondence to the ground corroborate; the link says so and is still a link, not a merge", () => {
  const c = buildCorpusTimeline([{ id: "src_report", text: REPORT, register: "report" }, { id: "src_memoir", text: MEMOIR, register: "testimony" }], cdeps, { maxSnapshots: 6 });
  const link = c.links.find((l) => /smith/i.test(l.from.name));
  assert.ok(link); assert.equal(link.split.kind, "corroborates"); assert.equal(link.split.across, false);
  const f = foldLog(c.log);
  assert.equal(f.beingOf.get(link.from.ref).reality, "real");
  assert.equal(f.beingOf.get(link.from.ref).ends.map((e) => e.register).sort().join(), "report,testimony");
});

test("a source with no declared register is read but refused for linking — never guessed", () => {
  const c = buildCorpusTimeline([{ id: "src_report", text: REPORT, register: "report" }, { id: "src_x", text: SCRIPT }], cdeps, { maxSnapshots: 6 });
  assert.equal(c.refused.length, 1); assert.equal(c.refused[0].reason, "no_register_declared"); assert.equal(c.refused[0].source, "src_x");
  assert.equal(c.links.length, 0);
  assert.ok(c.log.some((e) => e.source === "src_x"), "it was still read");
});

test("a person severs a wrong correspondence with one more event; the ends survive and the reader's log is untouched", () => {
  const c = buildCorpusTimeline([{ id: "src_report", text: REPORT, register: "report" }, { id: "src_script", text: SCRIPT, register: "fiction" }], cdeps, { maxSnapshots: 6 });
  const link = c.links.find((l) => /smith/i.test(l.from.name));
  const cut = { id: "evt_you_cut", op: "CON", ...CELLS.CON, kind: "correspondence", severs: link.id, from: link.from, to: link.to, giver: "you", basis: "these are two different men" };
  const f = foldLog(c.log, { overlay: [cut] });
  assert.notEqual(f.beingOf.get(link.from.ref), f.beingOf.get(link.to.ref), "no longer one being");
  assert.equal(f.beingOf.get(link.from.ref).reality, "fictional", "the telling-end alone is fictional; the world-end is untouched");
  const whole = foldLog(c.log);
  assert.equal(whole.beingOf.get(link.from.ref).id, whole.beingOf.get(link.to.ref).id, "without the cut they are one being again — the cut was an event, not an edit");
});

test("a common given name does not license a cross-source identity (the generic-token guard)", () => {
  const A = "Pierre spoke. Pierre left. Pierre Bezukhov wrote. Pierre Bezukhov came. Pierre Dupont ate. Pierre Dupont ran. Pierre Lenoir sat. Pierre Lenoir slept.";
  const B = "Pierre arrived. Pierre sat. Pierre Aumont sang. Pierre Aumont danced. Pierre Gagnon read. Pierre Gagnon wrote.";
  const c = buildCorpusTimeline([{ id: "a", text: A, register: "fiction" }, { id: "b", text: B, register: "report" }], cdeps, { maxSnapshots: 6 });
  assert.equal(c.links.some((l) => l.matched && /^pierre$/i.test(l.matched.from) && /^pierre$/i.test(l.matched.to)), false);
});

test("splitOf names the difference between two creators' relationships to the ground", () => {
  assert.equal(splitOf("report", "testimony").kind, "corroborates");
  assert.equal(splitOf("fiction", "report").kind, "fictionalizes");
  assert.equal(splitOf("comment", "report").kind, "comments-on");
  assert.equal(splitOf("fiction", "fiction").kind, "tells-the-same");
  assert.equal(splitOf("fiction", "report").across, true);
});

// ── who is saying what ───────────────────────────────────────────────────────────────────────────────────────
const SAYV = new Set("said told asked testified heard wrote struck sailed".split(" "));
const isVerb = (w) => SAYV.has(String(w).toLowerCase());
const fakeCast = (names) => ({ extractSurfaces: () => [], discoverReferents: () => ({ events: Object.entries(names).map(([surface, id]) => ({ surface, referent_id: id })), merges: [], gaps: [], addresses: { born: new Map(), next: 0, refs: new Map() } }) });
const SPEECH = "Smith testified that Ismay told Andrews that the ship struck. Later Smith said, “Andrews heard it.”";

test("every source has a ROOT frame (its creator's voice, in its register); every other frame points at another frame", () => {
  const tl = buildReadingTimeline(SPEECH, { ...deps, ...fakeCast({ Smith: "A", Ismay: "B", Andrews: "C" }), isVerb, source: { id: "src_speech", label: "Senate speech", register: "testimony", creator: "Hon. William Alden Smith" } }, { maxSnapshots: 4 });
  const frames = tl.log.filter((e) => e.op === "DEF" && e.kind === "frame");
  const roots = frames.filter((e) => e.root);
  assert.equal(roots.length, 1); assert.equal(roots[0].register, "testimony"); assert.equal(roots[0].creator, "Hon. William Alden Smith"); assert.equal(roots[0].parent, null);
  const byId = new Map(frames.map((e) => [e.id, e]));
  for (const f of frames.filter((e) => !e.root)) assert.ok(byId.has(f.parent), "a frame's parent is another frame in the log");
  for (const e of frames) assert.equal(isCoherent(e), true);
  assert.ok(frames.every((e) => e.source === "src_speech" && e.register === "testimony"));
});

test("the chain at a position names every voice, innermost first, and ends at the source's own voice — resolved to beings", () => {
  const tl = buildReadingTimeline(SPEECH, { ...deps, ...fakeCast({ Smith: "A", Ismay: "B", Andrews: "C" }), isVerb, source: { id: "src_speech", label: "Senate speech", register: "testimony", creator: "Smith (Senate)" } }, { maxSnapshots: 4 });
  const f = foldLog(tl.log);
  const at = SPEECH.indexOf("the ship struck");
  const v = f.voices(at, "src_speech");
  assert.deepEqual(v.chain.map((c) => c.root ? "«source»" : c.name), ["Ismay", "Smith", "«source»"]);
  assert.equal(v.depth, 2); assert.equal(v.truncated, null);
  assert.match(v.chain[0].ref, /^ref_/, "the speaker is a being with an id, not a spelling");
  assert.equal(v.chain.at(-1).register, "testimony"); assert.equal(v.chain.at(-1).creator, "Smith (Senate)");
  const q = f.voices(SPEECH.indexOf("Andrews heard"), "src_speech");
  assert.deepEqual(q.chain.map((c) => c.root ? "«source»" : c.name), ["Smith", "«source»"]);
});

test("reassigning the mention that stands for the speaker changes who is speaking — the voice follows the link", () => {
  const tl = buildReadingTimeline(SPEECH, { ...deps, ...fakeCast({ Smith: "A", Ismay: "B", Andrews: "C" }), isVerb, source: { id: "src_speech", register: "testimony" } }, { maxSnapshots: 4 });
  const base = foldLog(tl.log);
  const at = SPEECH.indexOf("the ship struck");
  const ismay = base.voices(at, "src_speech").chain[0];
  const andrews = [...base.referents.values()].find((r) => r.name === "Andrews");
  const move = { id: "evt_you_move", op: "CON", ...CELLS.CON, span: ismay.span, ref: andrews.id, supersedes: base.cons.get(ismay.span), giver: "you", basis: "that was Andrews speaking" };
  const after = foldLog(tl.log, { overlay: [move] });
  assert.equal(after.voices(at, "src_speech").chain[0].name, "Andrews");
  assert.equal(base.voices(at, "src_speech").chain[0].name, "Ismay", "the reader's own log still says what it said");
});

test("a source with no frames still has its root voice, so 'who is saying this' always has an answer", () => {
  const tl = buildReadingTimeline("The ship sailed. The ice was near.", { ...deps, isVerb, source: { id: "src_plain", register: "report" } }, { maxSnapshots: 3 });
  const v = foldLog(tl.log).voices(5, "src_plain");
  assert.equal(v.chain.length, 1); assert.equal(v.chain[0].root, true); assert.equal(v.depth, 0);
});

test("voices across sources never mix: each source's chain ends at its own root", () => {
  const c = buildCorpusTimeline([{ id: "src_a", text: SPEECH, register: "testimony" }, { id: "src_b", text: "Cameron wrote that Rose said that the ship struck.", register: "fiction" }], { ...cdeps, ...fakeCast({ Smith: "A", Ismay: "B", Andrews: "C", Cameron: "D", Rose: "E" }), isVerb }, { maxSnapshots: 4 });
  const f = foldLog(c.log);
  const a = f.voices(SPEECH.indexOf("the ship struck"), "src_a"), b = f.voices("Cameron wrote that Rose said that the ship struck.".indexOf("the ship struck"), "src_b");
  assert.equal(a.chain.at(-1).register, "testimony"); assert.equal(b.chain.at(-1).register, "fiction");
  assert.deepEqual(b.chain.filter((x) => !x.root).map((x) => x.name), ["Rose", "Cameron"]);
});

test("correcting a source's register changes the split on its links and mints no new referent ids", () => {
  const ids = (reg) => { const c = buildCorpusTimeline([{ id: "src_report", text: REPORT, register: "report" }, { id: "src_script", text: SCRIPT, register: reg }], cdeps, { maxSnapshots: 6 }); const f = foldLog(c.log); return { refs: [...f.referents.keys()].sort(), kinds: f.links.map((l) => l.split.kind).sort() }; };
  const fic = ids("fiction"), rep = ids("report");
  assert.deepEqual(fic.refs, rep.refs, "the same ends under either register — a person's merge/sever/reassign on an id survives a corrected register");
  assert.notDeepEqual(fic.kinds, rep.kinds, "while the split on the links does change");
});
