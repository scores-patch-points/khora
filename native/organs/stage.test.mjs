// stage.test.mjs — Stage@1 (stage.js), its bindings (stage-bind.js) and the HL verdict over it (stage-verdict.js), on hand-built readings:
// no parser, no priors, so what is pinned is the re-encoding and the logic, not a reading.
//   node --test organs/stage.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readStage, fromArrangements, serializeStage, stageHash, byteSpan, HOLDS, STAGE_SCHEMA } from "./stage.js";
import { bindNone, bindFolded } from "./stage-bind.js";
import { stageVerdict, conjunctsOf } from "./stage-verdict.js";
import { sha256hex } from "../adapters/text/sha256hex.js";

// "Lake Baikal is a rift lake in Siberia." with its words as a parse would give them
const TEXT = "Lake Baikal is a rift lake in Siberia.";
const at = (form, from = 0) => { const i = TEXT.indexOf(form, from); return [i, i + form.length]; };
const row = (id, form, lemma, upos, head, deprel) => { const [start, end] = at(form, id === 6 ? 17 : 0); return { id, form, lemma, upos, head, deprel, start, end, feats: null }; };
const ROWS = [row(1, "Lake", "lake", "PROPN", 2, "compound"), row(2, "Baikal", "Baikal", "PROPN", 6, "nsubj"), row(3, "is", "be", "AUX", 6, "cop"), row(4, "a", "a", "DET", 6, "det"),
  row(5, "rift", "rift", "NOUN", 6, "compound"), row(6, "lake", "lake", "NOUN", 0, "root"), row(7, "in", "in", "ADP", 8, "case"), row(8, "Siberia", "Siberia", "PROPN", 6, "nmod"), row(9, ".", ".", "PUNCT", 6, "punct")];
const BAIKAL = { entity: "E1", name: "Lake Baikal", ids: [1, 2] };
const reading = ({ neg = false, extra = [] } = {}) => ({
  rows: ROWS, entities: [{ id: "E1", name: "Lake Baikal" }],
  mentions: [{ text: "Lake Baikal", ids: [1, 2], hid: 2, how: "name", entity: "E1" }],
  atoms: [
    { pred: "is_a", args: [BAIKAL, { value: "rift lake", ids: [5, 6] }], neg: false, hedged: false, approx: false, start: 0, end: 26, head: 6 },
    { pred: "be_in", args: [BAIKAL, { value: "Siberia", ids: [8] }], neg, hedged: false, approx: false, start: 0, end: 37, head: 7 },
    ...extra,
  ],
});
const stageOf = (r, text = TEXT) => readStage(r, { text, lang: "en", title: "Lake Baikal", previous: [], grammar: "test", priors: "none" });
// the source is another document (its page has a sentence before this one), so its anchors are its own
const sourceOf = (r) => readStage(r, { text: TEXT, lang: "en", title: "Lake Baikal", previous: ["Baikal is a lake."], grammar: "test", priors: "none" });

test("RC1: a two-place atom is one ordered edge, a third argument its key, a one-place atom an edge to the reserved holds anchor", () => {
  const st = stageOf(reading({ extra: [
    { pred: "deep", args: [BAIKAL], neg: false, hedged: false, approx: false, start: 0, end: 11, head: 2 },
    { pred: "give", args: [BAIKAL, { value: "rift lake", ids: [5, 6] }, { value: "Siberia", ids: [8] }], neg: false, hedged: true, approx: false, start: 0, end: 37, head: 3 },
  ] }));
  assert.equal(st.schema, STAGE_SCHEMA);
  const byRel = Object.fromEntries(st.arrangements.map((r) => [r.rel.lemma, r]));
  assert.equal(byRel.deep.o, HOLDS, "an adjective is an edge to holds");
  assert.ok(st.anchors.some((a) => a.id === HOLDS && a.kind === "holds"));
  assert.ok(byRel.give.key && byRel.give.key.endsWith("#v:siberia"), "the third argument is the key");
  assert.equal(byRel.give.layer, "reported", "a hedged atom is kept, in the reported layer");
  assert.equal(byRel.be_in.layer, "asserted");
});

test("RC2: an entity is a referent namespaced by its document; an unresolved end is kept, with an end_unresolved gap; a kind is its words", () => {
  const st = stageOf(reading());
  const [isa] = st.arrangements.filter((r) => r.rel.lemma === "is_a");
  assert.match(isa.s, /^d[0-9a-f]{16}#E1$/);
  const kind = st.anchors.find((a) => a.id === isa.o);
  assert.equal(kind.kind, "kind"); assert.equal(kind.head, "lake"); assert.deepEqual(kind.modifiers, ["rift"]);
  const v = st.anchors.find((a) => a.id.endsWith("#v:siberia"));
  assert.equal(v.kind, "referent"); assert.equal(v.via, "unresolved");
  assert.deepEqual(st.gaps.map((g) => g.kind), ["end_unresolved"]);
  assert.deepEqual(st.gaps[0].span, [30, 37], "the gap is over the end's own bytes");
  assert.ok(st.anchors.find((a) => a.id === isa.s).names.includes("Lake Baikal"));
  // another document's E1 is another anchor
  const other = readStage(reading(), { text: TEXT, lang: "en", title: "Lake Victoria", previous: [] });
  assert.notEqual(other.arrangements[0].s, isa.s);
});

test("RC8: byte spans, content-addressed ids, and the same reading gives byte-identical stages", () => {
  const a = stageOf(reading()), b = stageOf(reading());
  assert.equal(serializeStage(a), serializeStage(b));
  assert.equal(stageHash(a), stageHash(b));
  const r = a.arrangements.find((x) => x.rel.lemma === "be_in");
  assert.equal(r.id, sha256hex(JSON.stringify([a.doc.id, r.span, "be_in", r.s, r.o, "+", null])));
  assert.deepEqual(byteSpan("湖は深い", 1, 3), [3, 9], "offsets are UTF-8 bytes, not string indices");
  assert.deepEqual(a.arrangements.map((x) => x.id), [...a.arrangements.map((x) => x.id)].sort(), "sorted by id");
});

test("S2's instrument: the arrangements read back to the atoms they encode", () => {
  const back = fromArrangements(stageOf(reading()));
  const show = (x) => `${x.pred}(${x.args.map((y) => y.name ?? y.value).join(", ")})`;
  assert.deepEqual(back.map(show).sort(), ["be_in(Lake Baikal, Siberia)", "is_a(Lake Baikal, rift lake)"]);
});

test("HL over the stage: no binding is beyond reach; folded-string binding is marked; a negated source edge contradicts; an unread fact is unbound", () => {
  const claim = stageOf(reading()), source = sourceOf(reading());
  const none = stageVerdict({ claim, source, bind: bindNone });
  assert.equal(none.verdict, "beyond-reach"); assert.equal(none.label, "N");
  const folded = stageVerdict({ claim, source, bind: bindFolded });
  assert.equal(folded.verdict, "bound"); assert.equal(folded.label, "E"); assert.equal(folded.binding, "folded-string");
  assert.deepEqual(folded.path.map((p) => p.cell), ["NUL", "SIG", "INS", "SEG", "CON", "EVA", "REC"]);
  const neg = stageVerdict({ claim, source: sourceOf(reading({ neg: true })), bind: bindFolded });
  assert.equal(neg.verdict, "contradicted"); assert.equal(neg.label, "C");
  // law 1: the claim says one more thing the source does not: the conjunction is unbound, never bound
  const more = stageOf(reading({ extra: [{ pred: "freeze_in", args: [BAIKAL, { value: "Siberia", ids: [8] }], neg: false, hedged: false, approx: false, start: 0, end: 37, head: 3 }] }));
  assert.equal(stageVerdict({ claim: more, source, bind: bindFolded }).verdict, "unbound");
});

test("an end that does not bind ends its atom at beyond-reach, and a one-place fact from the referent's own name is not load-bearing", () => {
  const claim = stageOf(reading()), source = sourceOf(reading());
  const map = new Map(bindFolded(claim, source).map); map.delete([...map.keys()].find((k) => k.endsWith("#v:siberia")));
  const cs = conjunctsOf(claim, map);
  assert.equal(cs.find((k) => k.rel === "be_in").bound, false);
  assert.equal(stageVerdict({ claim, source, bind: () => ({ how: "test", map, gaps: [] }) }).verdict, "beyond-reach");
  const named = stageOf({ ...reading(), atoms: [...reading().atoms, { pred: "baikal", args: [BAIKAL], neg: false, hedged: false, approx: false, start: 5, end: 11, head: 2 }] });
  assert.ok(named.arrangements.find((r) => r.rel.lemma === "baikal").identifying);
  assert.equal(conjunctsOf(named, bindFolded(named, source).map).length, 2, "the identifying fact is flagged and left out of the formula");
});

test("no reading is a parser_absent gap, never a verdict", () => {
  const st = readStage(null, { text: "x", lang: "xx" });
  assert.deepEqual(st.gaps.map((g) => g.kind), ["parser_absent"]);
  assert.equal(stageVerdict({ claim: st, source: st, bind: bindFolded }).verdict, "beyond-reach");
});

// ---- M2: binding by janus's resolve (injected) and the deranged control ------------------------------------------------------------------
import { makeResolveBind, derange } from "./stage-bind.js";
import { JANUS_DIR } from "../the-fold/priors-home.js";
import fs from "node:fs";
import path from "node:path";

test("INS by an injected resolver: assert binds, ask is end_unresolved (an ambiguous end is never resolved), anything else no_correspondence", () => {
  const claim = stageOf(reading()), source = sourceOf(reading());
  const decide = { "Lake Baikal": "assert", Siberia: "ask" };
  const fake = ({ mention, candidates, lens }) => {
    assert.ok(lens?.name, "a lens is stated");
    const want = mention.nodes.includes("w:baikal") ? "Lake Baikal" : "Siberia";
    const c = candidates.find((x) => source.anchors.find((a) => a.id === x.id)?.names.includes(want));
    return decide[want] === "assert" ? { decision: "assert", asserted: c.id } : { decision: "ask", between: candidates.map((x) => x.id) };
  };
  const b = makeResolveBind({ resolveReferent: fake })(claim, source);
  assert.equal(b.map.get(claim.anchors.find((a) => a.label === "Lake Baikal").id), source.anchors.find((a) => a.label === "Lake Baikal").id);
  assert.deepEqual(b.gaps.filter((g) => g.kind === "end_unresolved").length, 1);
  const kindC = claim.anchors.find((a) => a.kind === "kind"), kindS = source.anchors.find((a) => a.kind === "kind");
  assert.equal(b.map.get(kindC.id), kindS.id, "a kind binds the source kind with its head and modifiers");
  assert.throws(() => makeResolveBind({}), /injected/);
});

test("the deranged control moves every bound end to another anchor and keeps holds", () => {
  const claim = stageOf(reading({ extra: [{ pred: "deep", args: [BAIKAL], neg: false, hedged: false, approx: false, start: 0, end: 11, head: 2 }] }));
  const source = sourceOf(reading({ extra: [{ pred: "deep", args: [BAIKAL], neg: false, hedged: false, approx: false, start: 0, end: 11, head: 2 }] }));
  const real = bindFolded(claim, source), d = derange(real, source);
  for (const [c, s] of real.map) if (c === HOLDS) assert.equal(d.map.get(c), HOLDS); else assert.notEqual(d.map.get(c), s);
  assert.equal(stageVerdict({ claim, source, bind: () => real }).verdict, "bound");
  assert.notEqual(stageVerdict({ claim, source, bind: () => d }).verdict, "bound", "a wrong universe binds nothing the source states");
});

const RESOLVE = path.join(JANUS_DIR ?? "", "native/organs/identity/resolve.mjs");
test("INS with janus's own resolve.mjs, where the janus checkout is beside khora", { skip: !fs.existsSync(RESOLVE) && "no janus checkout beside khora" }, async () => {
  const { resolveReferent } = await import(RESOLVE);
  const claim = stageOf(reading());
  // a source page with two lakes: the claim's "Lake Baikal" is the one whose rare word it shares
  const src = { ...reading(), entities: [{ id: "E1", name: "Lake Baikal" }, { id: "E2", name: "Lake Victoria" }],
    page: [{ rows: [], mentions: [{ text: "Lake Victoria", how: "name", entity: "E2" }] }, { rows: ROWS, mentions: [{ text: "Lake Baikal", ids: [1, 2], hid: 2, how: "name", entity: "E1" }] }] };
  const source = sourceOf(src);
  const b = makeResolveBind({ resolveReferent })(claim, source);
  assert.equal(b.map.get(claim.anchors.find((a) => a.label === "Lake Baikal").id), source.anchors.find((a) => a.label === "Lake Baikal").id);
});

// ---- M3: figures bound by value, their attribute's license, superlatives over their comparison class (RC3, RC6) ---------------------------
import { bindQuantity } from "./stage-bind.js";
// a reading from tokens: [form, lemma, upos, head, deprel, feats]
const readingOf = (text, toks, { entities, mentions, atoms }) => {
  let at = 0; const rows = toks.map(([form, lemma, upos, head, deprel, feats = null], i) => { const start = text.indexOf(form, at); at = start + form.length; return { id: i + 1, form, lemma, upos, head, deprel, feats, start, end: start + form.length }; });
  return { rows, entities, mentions, atoms: atoms(rows), page: [{ rows, mentions }] };
};
const byName = (claim, source) => { const map = new Map(); for (const a of claim.anchors) { if (a.id === HOLDS) { map.set(HOLDS, HOLDS); continue; } const b = source.anchors.find((x) => x.kind === a.kind && a.kind === "referent" && x.label === a.label); if (b) map.set(a.id, b.id); } return map; };
const fakeResolve = (claim, source) => ({ mention, candidates }) => {
  const a = claim.anchors.find((x) => x.kind === "referent" && x.lemmas.every((l) => mention.nodes.includes(`w:${l}`)) && x.lemmas.length === mention.nodes.length);
  const b = a && source.anchors.find((x) => x.kind === "referent" && x.label === a.label && candidates.some((c) => c.id === x.id));
  return b ? { decision: "assert", asserted: b.id } : { decision: "gap", reason: "no candidate" };
};
const lakeArea = (n, base) => readingOf(`Lake Tuva has a surface area of ${n} km2.`, [["Lake", "lake", "PROPN", 2, "compound"], ["Tuva", "Tuva", "PROPN", 3, "nsubj"], ["has", "have", "VERB", 0, "root"], ["a", "a", "DET", 6, "det"], ["surface", "surface", "NOUN", 6, "compound"], ["area", "area", "NOUN", 3, "obj"], ["of", "of", "ADP", 9, "case"], [String(n), String(n), "NUM", 9, "nummod"], ["km2", "km2", "NOUN", 6, "nmod"]],
  { entities: [{ id: "E1", name: "Lake Tuva" }], mentions: [{ text: "Lake Tuva", ids: [1, 2], hid: 2, how: "name", entity: "E1" }],
    atoms: () => [{ pred: "has_area", args: [{ entity: "E1", name: "Lake Tuva", ids: [1, 2] }, { value: `${n} km2`, ids: [8, 9], measure: "area", attribute: "area", base, alts: [] }], neg: false, hedged: false, approx: false, start: 0, end: 30, head: 9 }] });

test("RC3: a figure binds a source figure of its measure within 2%; one that meets none is its own quantity, and its attribute's license contradicts", () => {
  const src = readStage(lakeArea(500, 500e6), { text: "Lake Tuva has a surface area of 500 km2.", lang: "en", title: "Lake Tuva", previous: ["x"] });
  assert.deepEqual(src.licenses.map((l) => [l.kind, l.rels[0]]), [["functional", "has_area"]]);
  assert.match(src.licenses[0].giver, /one value of an attribute at one time/);
  const read = (n, base) => readStage(lakeArea(n, base), { text: `Lake Tuva has a surface area of ${n} km2.`, lang: "en", title: "Lake Tuva", previous: [] });
  const verdict = (claim, licenses) => stageVerdict({ claim, source: src, licenses, bind: makeResolveBind({ resolveReferent: fakeResolve(claim, src), quantities: bindQuantity }) });
  const near = read(505, 505e6), far = read(600, 600e6);
  assert.equal(verdict(near, src.licenses).verdict, "bound", "505 meets 500 within 2%");
  assert.equal(verdict(far, src.licenses).verdict, "contradicted", "R2: a different value of a functional attribute");
  assert.equal(verdict(far, []).verdict, "unbound", "law 1: without the license the different figure is unknown, never contradicted or bound");
});

const peak = (holder, others = []) => {
  const text = `${holder} is the highest mountain in Washington.`;
  return readingOf(text, [[holder, holder, "PROPN", 5, "nsubj"], ["is", "be", "AUX", 5, "cop"], ["the", "the", "DET", 5, "det", "Definite=Def|PronType=Art"], ["highest", "high", "ADJ", 5, "amod", "Degree=Sup"], ["mountain", "mountain", "NOUN", 0, "root"], ["in", "in", "ADP", 7, "case"], ["Washington", "Washington", "PROPN", 5, "nmod"]],
    { entities: [{ id: "E1", name: holder }, { id: "E2", name: "Washington" }, ...others.map((o, i) => ({ id: `E${i + 3}`, name: o }))],
      mentions: [{ text: holder, ids: [1], hid: 1, how: "name", entity: "E1" }, { text: "Washington", ids: [7], hid: 7, how: "name", entity: "E2" }],
      atoms: () => { const H = { entity: "E1", name: holder, ids: [1] }; return [
        { pred: "is_a", args: [H, { value: "mountain", ids: [3, 4, 5, 6, 7] }], neg: false, hedged: false, approx: false, start: 0, end: text.length - 1, head: 5 },
        { pred: "most:high", args: [H], neg: false, hedged: false, approx: false, start: 0, end: text.length - 1, head: 4 },
        { pred: "in", args: [H, { entity: "E2", name: "Washington", ids: [7] }], neg: false, hedged: false, approx: false, start: 0, end: text.length - 1, head: 6 }]; } });
};
test("RC6: a superlative is an edge from its comparison class to its holder, licensed by the language's Degree feature; another holder contradicts", () => {
  const src = readStage(peak("Rainier", ["Adams"]), { text: "Rainier is the highest mountain in Washington.", lang: "en", title: "Rainier", previous: ["x"] });
  const edge = src.arrangements.find((r) => r.derived === "superlative");
  assert.ok(edge && edge.rel.lemma === "most:high" && src.anchors.find((a) => a.id === edge.s).via === "comparison-class");
  assert.deepEqual(src.licenses.map((l) => l.rels[0]), ["most:high"]); assert.match(src.licenses[0].giver, /Degree=Sup/);
  const verdict = (holder) => { const claim = readStage(peak(holder), { text: `${holder} is the highest mountain in Washington.`, lang: "en", title: "Rainier", previous: [] });
    const bind = (c, s) => { const b = makeResolveBind({ resolveReferent: fakeResolve(c, s), quantities: bindQuantity })(c, s); return b; };
    return stageVerdict({ claim, source: src, licenses: src.licenses, bind }); };
  assert.equal(verdict("Rainier").verdict, "bound");
  assert.equal(verdict("Adams").verdict, "contradicted", "one holder per class: the source names Adams on its page, and the class's holder is Rainier");
  assert.equal(verdict("Hood").verdict, "beyond-reach", "law 3: a holder the source never names does not bind, so no contradiction is reached");
  // no Degree feature on the word: the degree stays a one-place fact, and nothing is licensed
  const bare = peak("Rainier"); bare.rows[3].feats = null;
  const nofeat = readStage(bare, { text: "Rainier is the highest mountain in Washington.", lang: "en", title: "Rainier", previous: ["x"] });
  assert.equal(nofeat.arrangements.filter((r) => r.derived).length, 0); assert.equal(nofeat.licenses.length, 0);
});

test("RC6: the reader's canonical forms are kept beside the atoms they replace, which are marked superseded and left out of a claim's formula", () => {
  const r = reading(); const [isa, bein] = r.atoms; const rewritten = { ...bein, rewritten: "no-comparative", pred: "most:deep", args: [BAIKAL] };
  const st = stageOf({ ...r, forms: [isa, rewritten] });
  assert.ok(st.arrangements.find((x) => x.rel.lemma === "be_in").superseded);
  assert.ok(st.arrangements.find((x) => x.rel.lemma === "most:deep").rewritten);
  assert.deepEqual(conjunctsOf(st, new Map(st.anchors.map((a) => [a.id, a.id]))).map((k) => k.rel).sort(), ["is_a", "most:deep"]);
  assert.deepEqual(fromArrangements(st).map((a) => a.pred).sort(), ["be_in", "is_a"], "read back: the atoms as read");
});
