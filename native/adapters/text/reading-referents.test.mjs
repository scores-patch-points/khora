// reading-referents.test.mjs — the referent ledger (reading-referents.js, ReadingReferents@1) on the audit's failing inputs and the canon's tests.
//
// Pre-registered: eval/referents/PREREG-REFERENT-READ.md. F1 to F6 are the audit's failures (reading-rules-audit/), each fixture asserting FIRST that the
// plain index exhibits the failure, so a fixture that stops failing fails the test. T1 to T7 are the tests the user's Kant and Peirce quotes hand us.
// No lexicon, no Wiktionary pack: the reader is read-core's own, with the priors the repo reads; the gap types the real reader cannot be made to raise
// on a short text (a row with no span, an overlap, an unplaced statement) are raised by handing buildReferentLedger a crafted reading.
import test from "node:test";
import assert from "node:assert/strict";
import { readWith } from "../../the-fold/read-core.mjs";
import { foldLog, isCoherent } from "./reading-timeline.js";
import { buildReferentLedger, assertClaim, READING_REFERENTS_SCHEMA } from "./reading-referents.js";

const read = (t, o = {}) => readWith(t, { language: "en", minCharacters: 0, ...o });
const on = (t, o = {}) => read(t, { referents: true, ...o });
const PAD = " This sentence is only padding so the text clears the minimum length for reading at all, and it names nobody in particular.";
const stable = (entry) => JSON.stringify({ ...entry, ms: 0 });

const BENNETS = `Mr. Bennet walked to the village and Mrs. Bennet stayed at Longbourn. Mr. Bennet read his book in the library all evening. Mrs. Bennet complained about the neighbours at length. Bennet laughed at the joke.${PAD}`;
const BENNETS_APART = "Mr. Bennet read his book in the library all evening. The rain fell on the quiet village all night. Mrs. Bennet complained about the neighbours at length. The rain fell on the quiet village all night. Bennet laughed at the joke. Mr. Bennet said nothing at all about the rain.";
const SMITHS = `Yesterday Anna Smith visited Paris. Yesterday Boris Smith visited Paris. Later Carla Jones met Boris Jones in Rome. Later Carla Jones met Boris Smith in Rome.${PAD}`;
const HENRYS = `Henry IV ruled in England for years. Later Henry V followed him and fought in France. Then Henry VIII came to the throne in London. Henry IV was remembered, and Henry V too.${PAD}`;
const FRANK = [
  "Frankenstein built a creature in the laboratory.", "The creature fled from Frankenstein into the dark woods.", "Frankenstein wept beside the frozen lake for many days.",
  "Victor Frankenstein returned to Geneva with his father.", "Victor Frankenstein never spoke of the creature again.", "The old professor in Ingolstadt praised Victor Frankenstein.",
].join(" ");
const FRANK_PREFIX = `${FRANK.split(". ").slice(0, 3).join(". ")}.`;
// the audit's pronoun fixture: two names recurring in sentences with one-off place names, then a pronoun sentence whose object is "his sister"
const FILL = ["The harbour near Rouen flooded after the storm.", "Rain fell across the valley beyond Lyon for three days.", "Merchants in Dover closed their shutters early.", "A bell rang somewhere beyond the hills of Calais.", "The road to the market at Nantes was muddy.", "Farmers outside Tours counted sacks of barley.", "Children in Arles watched clouds drift over the river.", "Lanterns glowed along the quiet bridge at Metz.", "Bread was baked before dawn in the old kitchen at Dijon.", "Travellers from Bruges shared stories around a smoking fire.", "Snow covered the pasture near the abbey at Cluny."];
const REWRITE = ["Yesterday Aldous Brenner grumbled and sulked.", "Meanwhile Clara Whitcombe laughed and danced.", ...FILL.slice(0, 6), "Often Aldous Brenner grumbled and sulked again.", "Often Clara Whitcombe laughed and danced again.", ...FILL.slice(6), "Later Aldous Brenner grumbled and sulked once more.", "Later Clara Whitcombe laughed and danced once more.", "He grumbled and sulked with his sister."].join(" ");

// the ledger's own state, folded from its log (reading-timeline.js::foldLog)
const stateOf = (L) => foldLog(L.log);
const byFace = (L, face) => L.referents.filter((r) => r.face === face);

test("the option is off by default: no key, no change, byte-identical (C2)", () => {
  for (const t of [BENNETS, SMITHS, HENRYS, REWRITE]) {
    const plain = read(t), offExplicit = read(t, { referents: false });
    assert.equal(plain.referents, undefined);
    assert.equal(stable(plain), stable(offExplicit));
    const withIt = on(t);
    assert.equal(withIt.referents.schema, READING_REFERENTS_SCHEMA);
    // the plain arm is untouched by the option: every existing field is what it was (gaps only grow, by typed gaps)
    for (const k of ["cast", "heard", "edges", "pronouns", "sentences"]) assert.equal(JSON.stringify(withIt[k]), JSON.stringify(plain[k]), `${k} changed under the option`);
    assert.equal(JSON.stringify(withIt.gaps.slice(0, plain.gaps.length)), JSON.stringify(plain.gaps));
  }
});

test("F1: a referent's address does not move under a longer name, a prefix read, or a renamed face (T3, K5)", () => {
  const p = on(FRANK_PREFIX, { address: "doc:frank" }), w = on(FRANK, { address: "doc:frank" });
  // the failure: the plain id is a slug of the first-admitted spelling, so it depends on which form was met
  assert.equal(p.cast[0].ref, "ref:auto:frankenstein");
  assert.equal(w.cast[0].ref, "ref:auto:victor_frankenstein");
  assert.notEqual(p.cast[0].ref, w.cast[0].ref);
  // the ledger: one id, the face is only a view
  const pr = p.referents.referents.find((r) => r.engine === "ref:auto:frankenstein"), wr = w.referents.referents.find((r) => r.engine === "ref:auto:victor_frankenstein");
  assert.ok(pr && wr);
  assert.equal(pr.id, wr.id);
  assert.notEqual(pr.face, wr.face);
  assert.match(pr.id, /^ref_[0-9a-f]{16}$/);
  // an address is per source: the same text under another address is another source (cross-source identity is never an address match)
  assert.notEqual(on(FRANK, { address: "doc:other" }).referents.referents[0].id, wr.id);
});

test("F2: Mr. and Mrs. Bennet: two referents when one sentence holds both, one referent and a typed gap when no sentence does (T2, T6)", () => {
  const together = on(BENNETS), plain = together.cast.find((c) => /Bennet/.test(c.surface));
  assert.ok(plain.allSurfaces.includes("Mrs Bennet") && plain.allSurfaces.includes("Bennet"), "the plain index holds both bearers in one being");
  const L = together.referents, mr = byFace(L, "Mr. Bennet"), mrs = byFace(L, "Mrs. Bennet");
  assert.equal(mr.length, 1); assert.equal(mrs.length, 1);
  assert.notEqual(mr[0].id, mrs[0].id);
  const split = together.gaps.find((g) => g.gap === "referent_split");
  assert.equal(split.by, "title"); assert.deepEqual([...split.referents].sort(), [mr[0].id, mrs[0].id].sort());
  // the bare "Bennet" of the last sentence is bound to neither candidate, and says so
  const amb = together.gaps.find((g) => g.gap === "mention_ambiguous");
  assert.equal(amb.count, 1); assert.deepEqual([...amb.candidates].sort(), [mr[0].id, mrs[0].id].sort());
  // the plain index says one being; nothing in the ledger says the two are one
  assert.equal(L.claims.filter((c) => c.referent === mr[0].id || c.referent === mrs[0].id).every((c) => c.transitive === false), true);

  const apart = on(BENNETS_APART);
  assert.equal(apart.cast.filter((c) => /Bennet/.test(c.surface)).length, 1);
  assert.equal(apart.referents.referents.filter((r) => /Bennet/.test(r.face)).length, 1, "position across sentences does not decide: one referent kept");
  const g = apart.gaps.find((x) => x.gap === "referent_merge_unearned");
  assert.deepEqual([...g.modifiers].sort(), ["Mr", "Mrs"]);
  assert.equal(apart.gaps.some((x) => x.gap === "referent_split"), false);
});

test("F3: two Smiths no longer merge into one corroborated edge; each statement has its own end1 referent (T2)", () => {
  const e = on(SMITHS);
  const merged = e.edges.find((x) => x.end1 === "anna smith" && x.label === "visited");
  assert.equal(merged.assertion.standing, "corroborated");
  assert.equal(merged.spans.length, 2);
  assert.ok(/Anna Smith/.test(merged.spans[0].text) && /Boris Smith/.test(merged.spans[1].text), "the plain edge folds Anna and Boris into one");
  const L = e.referents, anna = byFace(L, "Anna Smith")[0], boris = byFace(L, "Boris Smith")[0];
  assert.notEqual(anna.id, boris.id, "two beings that share every predicate stay two");
  const visited = L.edges.filter((x) => x.label === "visited");
  assert.equal(visited.length, 2);
  for (const x of visited) { assert.equal(x.statements.length, 1); assert.equal(x.standing, "single-witness"); }
  assert.deepEqual(visited.map((x) => x.ends[0].ref).sort(), [anna.id, boris.id].sort());
  assert.equal(visited[0].ends[1].ref, visited[1].ends[1].ref, "both statements are about the one Paris");
  // a polarity the plain edge folded across statements is not claimed per statement
  assert.equal(visited.every((x) => x.polarity === null && Array.isArray(x.polarityPlain)), true);
  // the other merged edge (Carla met Boris Jones / Boris Smith) comes apart too
  assert.equal(L.edges.filter((x) => x.label === "met").length, 2);
});

test("F4 and T1: an edge end that resolves is a referent AND a span, and the fold finds the span bound to that referent; no referent without a span", () => {
  for (const t of [SMITHS, HENRYS, BENNETS]) {
    const L = on(t).referents, S = stateOf(L);
    assert.ok(L.edges.length > 0);
    for (const x of L.edges) for (const end of x.ends) {
      assert.match(end.ref, /^ref_/); assert.match(end.span, /^spn_/);
      assert.equal(S.assign.get(end.span), end.ref, "the span is CON-bound to the end's referent");
      assert.ok(S.referents.get(end.ref).mentions.some((m) => m.id === end.span));
    }
    for (const r of L.referents) assert.ok(S.referents.get(r.id).mentions.length >= 1, `referent ${r.face} has no bound span`);
    for (const ev of L.log) assert.equal(isCoherent(ev), true, `${ev.op} ${ev.kind ?? ""} is not a coherent cell`);
  }
});

test("F5: the pronoun rewrite no longer makes a self-link edge: a typed gap, and no edge (T6)", () => {
  const e = on(REWRITE);
  assert.ok(e.edges.some((x) => x.end1 === "aldous brenner" && x.end2 === "aldous brenner"), "the plain reader reads a self-link from the rewritten sentence");
  const g = e.gaps.find((x) => x.gap === "edge_self_link_by_rewrite");
  assert.ok(g);
  assert.equal(e.referents.edges.some((x) => x.ends[0].ref === x.ends[1].ref), false);
  // the pronoun is bound, as an index, to the being it names
  const aldous = byFace(e.referents, "aldous brenner")[0] ?? e.referents.referents.find((r) => r.engine === "ref:auto:aldous_brenner");
  assert.equal(aldous.id, g.ref);
  const S = stateOf(e.referents);
  const prons = e.referents.spans.filter((s) => s.kind === "pronoun");
  assert.ok(prons.length >= 2);
  for (const s of prons) assert.equal(S.assign.get(s.id), aldous.id);
});

test("F6a: Henry IV, V and VIII are three referents; a numeral is a character of the sign (T4)", () => {
  const e = on(HENRYS);
  assert.equal(e.cast.filter((c) => c.surface === "Henry").length, 1, "the plain index folds them into one Henry");
  const L = e.referents, faces = L.referents.filter((r) => /^Henry/.test(r.face)).map((r) => r.face).sort();
  assert.deepEqual(faces, ["Henry IV", "Henry V", "Henry VIII"]);
  assert.equal(new Set(L.referents.filter((r) => /^Henry/.test(r.face)).map((r) => r.id)).size, 3);
  assert.equal(e.gaps.find((g) => g.gap === "referent_split").by, "numeral");
  // the numeral is no part of the edge's label: "Henry IV ruled in England" is (Henry IV, ruled in, England)
  const iv = byFace(L, "Henry IV")[0], england = L.referents.find((r) => r.face === "England");
  assert.ok(L.edges.some((x) => x.ends[0].ref === iv.id && x.ends[1].ref === england.id && x.label === "ruled in"));
});

test("T1: a binding or an insertion without a giver and a lens is refused, never defaulted", () => {
  assert.equal(assertClaim({ op: "CON", giver: "reader", lens: "x", basis: "y" }).ok, true);
  assert.equal(assertClaim({ op: "CON", lens: "x", basis: "y" }).refused, true);
  assert.equal(assertClaim({ op: "CON", giver: "reader", basis: "y" }).refused, true);
  assert.equal(assertClaim({ op: "CON", giver: "reader", lens: "x" }).refused, true);
  assert.equal(assertClaim(null).refused, true);
  const L = on(SMITHS).referents;
  for (const ev of L.log) if (ev.op === "CON" || (ev.op === "INS" && ev.kind === "referent")) assert.equal(assertClaim(ev).ok, true);
});

test("T5: a name binds as symbol, a pronoun as index; there is no icon anywhere", () => {
  const L = on(REWRITE).referents;
  const signs = new Set(L.log.filter((e) => e.op === "CON").map((e) => e.sign));
  assert.deepEqual([...signs].sort(), ["index", "symbol"]);
  assert.equal(JSON.stringify(L).includes("icon"), false);
});

test("T6 and T7: the log is append-only and deterministic; the fold at an earlier cursor is the earlier state; an INS is a nomination, not an existence claim", () => {
  const a = on(SMITHS).referents, b = on(SMITHS).referents;
  assert.equal(JSON.stringify(a.log), JSON.stringify(b.log));
  assert.equal(new Set(a.log.map((e) => e.id)).size, a.log.length);
  const cut = a.log.findIndex((e) => e.op === "CON") + 1;
  assert.ok(stateOf({ log: a.log.slice(0, cut) }).assign.size < stateOf(a).assign.size);
  const ins = a.log.find((e) => e.op === "INS" && e.kind === "referent");
  assert.match(ins.basis, /nomination/);
  assert.equal(JSON.stringify(a).includes('"exists"'), false);
});

// ── the typed gaps the real reader cannot be made to raise on a short text, raised by a crafted reading (C3: a gate seen firing) ──
const STR = "Anna met Boris in Rome. Boris liked Rome. Anna said hello to Boris.";
const row = (ref, surface, spans, standing = "referent") => ({ ref, surface, allSurfaces: [surface], mentionSpans: spans, standing });
const at = (s, sub, from = 0) => { const i = s.indexOf(sub, from); return [i, i + sub.length]; };

test("a row with no span is not inserted: a referent with no span is empty (referent_without_span)", () => {
  const { ledger, gaps } = buildReferentLedger({ text: STR, cast: [row("ref:auto:anna", "Anna", [at(STR, "Anna")]), row("ref:auto:ghost", "Ghost", [])] });
  assert.deepEqual(ledger.referents.map((r) => r.face), ["Anna"]);
  assert.equal(gaps.find((g) => g.gap === "referent_without_span").plain, "ref:auto:ghost");
});

test("two rows claiming overlapping spans: the longer stands, the other is not bound and, left with no span, is not inserted (mention_overlap, referent_overlapped)", () => {
  const { ledger, gaps } = buildReferentLedger({ text: STR, cast: [row("ref:auto:rome", "in Rome", [at(STR, "in Rome")]), row("ref:auto:rome2", "Rome", [at(STR, "Rome")])] });
  assert.deepEqual(ledger.referents.map((r) => r.engine), ["ref:auto:rome"]);
  assert.equal(gaps.find((g) => g.gap === "mention_overlap").count, 1);
  const g = gaps.find((x) => x.gap === "referent_overlapped");
  assert.equal(g.plain, "ref:auto:rome2"); assert.deepEqual(g.by, ["ref:auto:rome"]);
  assert.equal(gaps.some((x) => x.gap === "referent_without_span"), false, "a being whose spans were overlapped is not a being with no span");
});

test("a statement that cannot be placed, and one whose ends are no bound mention, are typed gaps and not edges (edge_statement_unlocated, edge_ends_unbound)", () => {
  const cast = [row("ref:auto:anna", "Anna", [at(STR, "Anna"), at(STR, "Anna", 30)]), row("ref:auto:boris", "Boris", [at(STR, "Boris"), at(STR, "Boris", 28)])];
  const norm = STR;
  const edges = [
    { end1: "anna", label: "met", end2: "boris", polarity: "+", spans: [{ ref: "material#0-23", start: 0, end: 23, text: "Anna met Boris in Rome." }] },
    { end1: "anna", label: "said hello to", end2: "the old man", polarity: "+", spans: [{ ref: "material#0-67", start: 0, end: 67, text: "NOT THE TEXT" }] },
    { end1: "boris", label: "liked", end2: "rome", polarity: "+", spans: [{ ref: "material#0-67", start: 24, end: 41, text: "Boris liked Rome." }] },
  ];
  const { ledger, gaps } = buildReferentLedger({ text: STR, cast, edges, norm, chunks: [{ ref: "material#0-23" }, { ref: "material#0-67" }], bases: [0, 0], sentences: [{ offset: 0, text: "Anna met Boris in Rome." }, { offset: 24, text: "Boris liked Rome." }] });
  assert.equal(gaps.find((g) => g.gap === "edge_statement_unlocated").count, 1);
  assert.equal(gaps.find((g) => g.gap === "edge_ends_unbound").count, 1, "'rome' is no bound mention here, so (boris, liked, rome) is not in the ledger");
  assert.equal(ledger.edges.length, 1);
  assert.equal(ledger.edges[0].label, "met");
});

test("a pronoun the resolver bound to a being the ledger split is bound to none (pronoun_ambiguous)", () => {
  const t = "Mr. Bennet walked to the village and Mrs. Bennet stayed at home. He read a book.";
  const [a, b] = at(t, "Mr. Bennet"), [c, d] = at(t, "Mrs. Bennet");
  const bennet = row("ref:auto:bennet", "Bennet", [[a + 4, b], [c, d]]);
  const [pa, pb] = at(t, "He");
  const { ledger, gaps } = buildReferentLedger({ text: t, cast: [bennet], pronouns: [{ pronoun: "he", at: [pa, pb], ref: "ref:auto:bennet" }], sentences: [{ offset: 0, text: t.slice(0, 64) }, { offset: 65, text: "He read a book." }], abbreviations: new Set(["Mr", "Mrs", "mr", "mrs"]) });
  assert.equal(ledger.referents.length, 2);
  const g = gaps.find((x) => x.gap === "pronoun_ambiguous");
  assert.equal(g.count, 1); assert.equal(g.candidates.length, 2);
  assert.equal(stateOf(ledger).assign.get(ledger.spans.find((s) => s.kind === "pronoun").id), null);
});
