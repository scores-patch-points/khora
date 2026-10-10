// notation-uml_bpmn.test.js — the UML/BPMN diagram-text adapter and its instrument are regression-guarded on AUTHORED toy fixtures
// (nothing here is natural data and none of it is presented as held-out):
//   * a toy BPMN 2.0 document written by hand with the traps the real corpora contain: a vendor element carrying an id (not a being), a comment and a CDATA
//     section that contain tag-looking text, an attribute value containing '>', an entity in a label, a boundary event, a data association with child
//     references, a text annotation, diagram shapes that carry ids (the any_id control's food);
//   * a toy DOT graph with chains, ports, quoted ids, a subgraph endpoint (a typed gap) and comments;
//   * a perfect reader scores 1 on every scorer, a deranged control scores low;
//   * the adapter, driven by the REAL priors (priors/notation-uml_bpmn-*.json, built from TRAIN), reads them exactly as the hand gold says, is invariant
//     under a namespace-prefix change, is causal, and refuses what the standard does not name;
//   * the instrument returns the typed-unmeasured shape (never throws) when its corpus is absent.
// This file measures nothing about natural BPMN or DOT; eval/notation-competence/uml_bpmn.mjs does that on held-out gold.
import test from "node:test";
import assert from "node:assert/strict";
import * as A from "../adapters/notation/uml_bpmn.js";
import * as I from "../eval/notation-competence/uml_bpmn.mjs";
import * as L from "../eval/notation-competence/uml_bpmn-lib.mjs";

const priors = A.loadPriors();
const havePriors = !!(priors.bpmn && priors.dot);

// ── AUTHORED toy BPMN ───────────────────────────────────────────────────────────────────────────────────────
const NS = "http://www.omg.org/spec/BPMN/20100524/MODEL";
const bpmn = (p = "bpmn:", decl = `xmlns:bpmn="${NS}"`) => `<?xml version="1.0" encoding="UTF-8"?>
<!-- <${p}task id="FAKE_COMMENT"/> -->
<${p}definitions ${decl} xmlns:flowable="http://flowable.org/bpmn" xmlns:di="http://www.omg.org/spec/BPMN/20100524/DI" id="Defs_1" targetNamespace="urn:toy">
  <${p}process id="P_1" name="Order &amp; pay" isExecutable="true">
    <${p}startEvent id="S_1" name="go"><${p}outgoing>F_1</${p}outgoing></${p}startEvent>
    <${p}userTask id="T_1" name="Check &quot;it&quot;" flowable:assignee="a>b"><${p}extensionElements><flowable:formProperty id="FP_1" name="vendor"/></${p}extensionElements></${p}userTask>
    <${p}exclusiveGateway id="G_1" default="F_3"/>
    <${p}endEvent id="E_1"/>
    <${p}boundaryEvent id="B_1" attachedToRef="T_1"/>
    <${p}sequenceFlow id="F_1" sourceRef="S_1" targetRef="T_1" name="a > b"/>
    <${p}sequenceFlow id="F_2" sourceRef="T_1" targetRef="G_1"/>
    <${p}sequenceFlow id="F_3" sourceRef="G_1" targetRef="E_1"/>
    <${p}sequenceFlow id="F_4" sourceRef="G_1" targetRef="MISSING_1"/>
    <${p}dataObjectReference id="D_1" name="doc"/>
    <${p}dataObject id="DO_1"/>
    <${p}userTask id="T_2"><${p}dataInputAssociation id="DA_1"><${p}sourceRef>D_1</${p}sourceRef><${p}targetRef>DO_1</${p}targetRef></${p}dataInputAssociation></${p}userTask>
    <${p}textAnnotation id="N_1"><${p}text><![CDATA[<${p}task id="FAKE_CDATA"/>]]></${p}text></${p}textAnnotation>
    <${p}association id="AS_1" sourceRef="N_1" targetRef="T_1"/>
  </${p}process>
  <di:BPMNDiagram id="BD_1"><di:BPMNPlane id="BP_1" bpmnElement="P_1"><di:BPMNShape id="SH_1" bpmnElement="T_1"/></di:BPMNPlane></di:BPMNDiagram>
</${p}definitions>
`;
const TOY = bpmn();
const TOY_BEINGS = ["P_1|process", "S_1|startEvent", "T_1|userTask", "G_1|exclusiveGateway", "E_1|endEvent", "B_1|boundaryEvent", "D_1|dataObjectReference", "DO_1|dataObject", "T_2|userTask", "N_1|textAnnotation"].sort();
const TOY_RELS = ["S_1|sequence_flow|T_1", "T_1|sequence_flow|G_1", "G_1|sequence_flow|E_1", "G_1|sequence_flow|MISSING_1", "B_1|attached_to|T_1", "D_1|data_association|DO_1", "N_1|association|T_1"].sort();

// ── AUTHORED toy DOT ────────────────────────────────────────────────────────────────────────────────────────
const TOY_DOT = `/* a comment with a -> b inside */
strict DiGraph "G one" {
  rankdir = LR;  // trailing comment a -> z
  node [shape=box];
  a -> b -> "c d" [label="x -> y"];
  "c d":p1:n -> e:s;
  { f g } -> a;
  h;
  subgraph cluster_0 { i -> j; }
  k [label=<<b>bold</b>>];
}
`;
const TOY_DOT_NODES = ["a", "b", "c d", "e", "f", "g", "h", "i", "j", "k"].sort();
const TOY_DOT_RELS = ["a|directed|b", "b|directed|c d", "c d|directed|e", "i|directed|j"].sort();

const beingsOf = (rd) => rd.beings.map((b) => `${b.id}|${b.kind}`).sort();
const relsOf = (rd) => rd.relations.map((r) => `${r.end1}|${r.label}|${r.end2}`).sort();

// ── priors ───────────────────────────────────────────────────────────────────────────────────────────────
test("the received priors load, name their givers and keep the rule table consistent with the metamodel table", { skip: !havePriors }, () => {
  assert.equal(priors.bpmn.kind, "bpmn-lexicon");
  assert.ok(priors.bpmn.givers[0].name.includes("Business Process Model and Notation"));
  assert.equal(priors.bpmn.elements.task.cls, "flow_node");
  assert.equal(priors.bpmn.elements.sequenceFlow.cls, "edge");
  assert.equal(priors.bpmn.elements.lane.cls, "swimlane");
  assert.equal(priors.bpmn.elements.textAnnotation.cls, "artifact");
  assert.equal(priors.bpmn.elements.incoming.cls, "model_other");
  assert.ok(Object.values(priors.bpmn.givers[1].rule_check_against_table).every(Boolean));
  assert.ok(priors.bpmn.train.marker.includes("TRAIN"));
  assert.equal(priors.dot.kind, "dot-grammar");
});

// ── the BPMN ear and reader ──────────────────────────────────────────────────────────────────────────────
test("BPMN: a perfect reader scores 1; the reader finds exactly the hand-written beings and relations", { skip: !havePriors }, () => {
  const rd = A.read(TOY, { priors, dialect: "bpmn_xml" });
  assert.deepEqual(beingsOf(rd), TOY_BEINGS);
  assert.deepEqual(relsOf(rd), TOY_RELS);
  assert.equal(I.scoreSets.microF1([{ pred: beingsOf(rd), gold: TOY_BEINGS }]).f1, 1);
  assert.equal(I.scoreSets.microF1([{ pred: relsOf(rd), gold: TOY_RELS }]).f1, 1);
});
test("BPMN: a vendor element with an id, a tag inside a comment and a tag inside CDATA are not beings (the namespace and the lexicon refuse them)", { skip: !havePriors }, () => {
  const ids = A.read(TOY, { priors, dialect: "bpmn_xml" }).beings.map((b) => b.id);
  assert.ok(!ids.includes("FP_1"), "vendor formProperty with an id");
  assert.ok(!ids.includes("FAKE_COMMENT") && !ids.includes("FAKE_CDATA"));
  // the any_id control reads them (and the diagram shapes): it must score low against the hand gold
  const lx = A.lex(TOY, { priors, dialect: "bpmn_xml" });
  const any = I.collapse(lx.tokens).filter((u) => (u.kind === "tag_start" || u.kind === "tag_empty")).flatMap((u) => { const id = u.attrs.find((a) => a.name === "id"); return id ? [`${id.value}|${u.name.local}`] : []; });
  const f = I.scoreSets.microF1([{ pred: any, gold: TOY_BEINGS }]);
  assert.ok(f.f1 < 0.8, `any_id f1 ${f.f1}`);
  assert.ok(any.includes("FP_1|formProperty") && any.includes("SH_1|BPMNShape"));
});
test("BPMN: the lexer hears the units a tag-by-tag oracle expects: '>' inside an attribute value, entities decoded, whitespace-only text ignored", { skip: !havePriors }, () => {
  const lx = A.lex(TOY, { priors, dialect: "bpmn_xml" });
  const units = I.collapse(lx.tokens);
  const tag = units.find((u) => u.kind === "tag_start" && u.name?.local === "userTask" && u.attrs.some((a) => a.name === "id" && a.value === "T_1"));
  assert.ok(tag);
  assert.equal(TOY.slice(tag.s, tag.e), TOY.slice(tag.s, tag.e).replace(/\s+$/, ""));
  assert.ok(TOY.slice(tag.s, tag.e).endsWith('flowable:assignee="a>b">'), "the tag extends past the '>' inside the value");
  assert.deepEqual(tag.attrs.map((a) => [a.name, a.value]), [["id", "T_1"], ["name", 'Check "it"'], ["flowable:assignee", "a>b"]]);
  const proc = units.find((u) => u.name?.local === "process");
  assert.equal(proc.attrs.find((a) => a.name === "name").value, "Order & pay");
  assert.ok(!units.some((u) => u.kind === "text" && /^\s*$/.test(TOY.slice(u.s, u.e))));
  assert.ok(units.some((u) => u.kind === "comment") && units.some((u) => u.kind === "cdata") && units.some((u) => u.kind === "decl"));
});
test("BPMN: classes and roles come from the lexicon by NAMESPACE, not by the prefix: a default-namespace rendering and a prefix rename read the same", { skip: !havePriors }, () => {
  const a = A.read(TOY, { priors, dialect: "bpmn_xml" });
  const dflt = A.read(bpmn("", `xmlns="${NS}"`), { priors, dialect: "bpmn_xml" });
  const renamed = A.read(bpmn("sem:", `xmlns:sem="${NS}"`), { priors, dialect: "bpmn_xml" });
  assert.deepEqual(beingsOf(dflt), beingsOf(a)); assert.deepEqual(relsOf(dflt), relsOf(a));
  assert.deepEqual(beingsOf(renamed), beingsOf(a)); assert.deepEqual(relsOf(renamed), relsOf(a));
  // the control built to fail: a reader that only knows the prefix `bpmn:` collapses on the other renderings
  const literal = (t) => (t.match(/<bpmn:[A-Za-z]+\b[^>]*id="[^"]*"/g) ?? []).length;
  assert.ok(literal(TOY) > 5); assert.equal(literal(bpmn("", `xmlns="${NS}"`)), 0);
});
test("BPMN: the same local name in another namespace is not BPMN (a CMMN-like <task id> is a vendor element, not a being)", { skip: !havePriors }, () => {
  const t = `<definitions xmlns="http://www.omg.org/spec/CMMN/20151109/MODEL" id="d"><casePlanModel id="c"><task id="T9"/><humanTask id="H9"/></casePlanModel></definitions>`;
  const rd = A.read(t, { priors, dialect: "bpmn_xml" });
  assert.equal(rd.beings.length, 0);
  const el = A.lex(t, { priors, dialect: "bpmn_xml" }).tokens.filter((x) => x.cls === "elem_name").map((x) => x.role);
  assert.ok(el.every((r) => r === "ext"));
});
test("BPMN: a name the standard does not list is REFUSED a being and typed as a gap; an unbound prefix (a cold window) is nominated provisionally", { skip: !havePriors }, () => {
  const t = `<definitions xmlns="${NS}" id="d"><process id="p"><frobnicate id="X_1"/></process></definitions>`;
  const rd = A.read(t, { priors, dialect: "bpmn_xml" });
  assert.ok(!rd.beings.some((b) => b.id === "X_1"));
  assert.ok(rd.gaps.some((g) => g.reason === "bpmn_name_unknown_in_standard_ns"));
  const cold = A.lex(`<bpmn:task id="T"/><bpmn:sequenceFlow id="F" sourceRef="T" targetRef="T"/>`, { priors, dialect: "bpmn_xml" });
  const roles = cold.tokens.filter((x) => x.cls === "elem_name");
  assert.deepEqual(roles.map((r) => [r.role, r.provisional]), [["flow_node", true], ["edge", true]]);
  assert.ok(cold.gaps.some((g) => g.reason === "element_without_namespace_binding"));
});
test("BPMN: resolved says whether the endpoint is declared (an end-of-input annotation): F_4 points at an id nobody declares", { skip: !havePriors }, () => {
  const rd = A.read(TOY, { priors, dialect: "bpmn_xml" });
  const by = Object.fromEntries(rd.relations.map((r) => [`${r.end1}>${r.end2}`, r.resolved]));
  assert.equal(by["G_1>MISSING_1"], false); assert.equal(by["S_1>T_1"], true);
});
test("BPMN: the reader is CAUSAL: every being or relation emitted before character K is identical in read(prefix K)", { skip: !havePriors }, () => {
  const full = A.read(TOY, { priors, dialect: "bpmn_xml" });
  for (const K of [120, 400, 700, 1000, 1300, TOY.length]) {
    const pre = A.read(TOY.slice(0, K), { priors, dialect: "bpmn_xml", final: false });
    const expB = full.beings.filter((b) => b.at <= K).map((b) => `${b.id}|${b.kind}`).sort(), expR = full.relations.filter((r) => r.at <= K).map((r) => `${r.end1}|${r.label}|${r.end2}`).sort();
    assert.deepEqual(beingsOf(pre), expB, `beings at ${K}`);
    assert.deepEqual(relsOf(pre), expR, `relations at ${K}`);
  }
});
test("BPMN: the ear is causal: the complete tokens of a prefix are the first tokens of the full lex (same span and class)", { skip: !havePriors }, () => {
  const full = A.lex(TOY, { priors, dialect: "bpmn_xml" }).tokens;
  for (const K of [50, 233, 500, 901, 1234]) {
    const pre = A.lex(TOY.slice(0, K), { priors, dialect: "bpmn_xml", final: false }).tokens.filter((t) => !t.partial);
    pre.forEach((t, i) => { assert.equal(t.s, full[i].s); assert.equal(t.e, full[i].e); assert.equal(t.cls, full[i].cls); });
  }
});

// ── controls and the exported scorers ─────────────────────────────────────────────────────────────────────
test("scorers: derange has no fixed point, charDerange destroys every word that has two distinct characters, misaligned pairing scores low", () => {
  const rng = L.mulberry32(7);
  const xs = Array.from({ length: 40 }, (_, i) => `k${i}`);
  const d = I.derange(xs, rng);
  assert.equal(d.length, xs.length); assert.ok(d.every((x, i) => x !== xs[i]));
  assert.deepEqual([...d].sort(), [...xs].sort());
  const s = I.charDerange('<bpmn:task id="T_1" name="Do it"/>', L.mulberry32(3));
  assert.notEqual(s, '<bpmn:task id="T_1" name="Do it"/>');
  assert.equal(s.split(/\s+/).length, 4);
  const gold = [TOY_BEINGS, ["x|task", "y|task"], ["z|endEvent"]];
  const mis = gold.map((g, i) => ({ pred: g, gold: gold[(i + 1) % gold.length] }));
  assert.equal(I.scoreSets.microF1(mis).f1, 0);
  assert.equal(I.scoreSets.microF1(gold.map((g) => ({ pred: g, gold: g }))).f1, 1);
  assert.equal(I.scoreSets.docF1([], []), 1);
  // a deranged control (right ids, kinds permuted among the beings) and a reversed-direction control both score low against the hand gold
  const kinds = TOY_BEINGS.map((b) => b.split("|")[1]);
  const dk = I.derange(kinds, L.mulberry32(11));
  const kindShuffled = TOY_BEINGS.map((b, i) => `${b.split("|")[0]}|${dk[i]}`);
  assert.ok(I.scoreSets.microF1([{ pred: kindShuffled, gold: TOY_BEINGS }]).f1 < 0.5);
  const swapped = TOY_RELS.map((r) => { const [a, l, b] = r.split("|"); return `${b}|${l}|${a}`; });
  assert.ok(I.scoreSets.microF1([{ pred: swapped, gold: TOY_RELS }]).f1 < 0.2);
});

// ── the DOT ear and reader ───────────────────────────────────────────────────────────────────────────────
test("DOT: the reader finds exactly the hand-written nodes and edges; a subgraph endpoint is a typed gap, not an edge", { skip: !havePriors }, () => {
  const rd = A.read(TOY_DOT, { priors, dialect: "dot" });
  assert.equal(rd.directed, true);
  assert.deepEqual(rd.beings.map((b) => b.id).sort(), TOY_DOT_NODES);
  assert.deepEqual(relsOf(rd), TOY_DOT_RELS);
  assert.ok(rd.gaps.some((g) => g.reason === "compound_endpoint"));
  assert.equal(I.scoreSets.microF1([{ pred: relsOf(rd), gold: TOY_DOT_RELS }]).f1, 1);
});
test("DOT: comments and strings are not read as statements; ports are stripped; the keyword is case-insensitive; the graph keyword fixes the edge meaning", { skip: !havePriors }, () => {
  const rd = A.read(TOY_DOT, { priors, dialect: "dot" });
  assert.ok(!rd.beings.some((b) => b.id === "z" || b.id === "x" || b.id === "y"));
  const und = A.read(`graph { a -- b -- c; d }`, { priors, dialect: "dot" });
  assert.deepEqual(relsOf(und), ["a|undirected|b", "b|undirected|c"]);
  assert.equal(und.directed, false);
  const toks = A.lex(TOY_DOT, { priors, dialect: "dot" }).tokens;
  const roles = Object.fromEntries(toks.filter((t) => t.role).map((t) => [`${t.v}`, t.role]));
  assert.equal(roles["G one"], "graph_name"); assert.equal(roles.rankdir, "attr_name"); assert.equal(roles.LR, "attr_value"); assert.equal(roles.shape, "attr_name"); assert.equal(roles.p1, "port");
  assert.equal(roles.a, "node_id");
});
test("DOT: the reader is causal (an edge emitted before character K is identical in read(prefix K))", { skip: !havePriors }, () => {
  const full = A.read(TOY_DOT, { priors, dialect: "dot" });
  for (const K of [90, 150, 210, 280, TOY_DOT.length]) {
    const pre = A.read(TOY_DOT.slice(0, K), { priors, dialect: "dot", final: false });
    const exp = full.relations.filter((r) => r.at <= K).map((r) => `${r.end1}|${r.label}|${r.end2}`).sort();
    assert.deepEqual(relsOf(pre), exp, `edges at ${K}`);
  }
});

test("DOT identity evidence is made of STATEMENTS: a C pointer line, mermaid and scrambled text are `bad`, a bare word carries no evidence, an unknown attribute carries none", { skip: !havePriors }, () => {
  const ev = (t) => A.symbolsOf(t, "dot", { priors, final: true }).map((x) => x.sym);
  assert.deepEqual(ev("digraph g {\n a -> b;\n}"), ["S:header_digraph", "S:edge", "S:close"]);
  assert.ok(ev("p->next = q;").includes("S:bad") && !ev("p->next = q;").includes("S:edge"));
  assert.ok(ev("A-->B").includes("S:bad") && !ev("A-->B").includes("S:edge"));
  assert.deepEqual(ev("hello world again"), [], "bare identifiers are words, not evidence");
  assert.ok(ev("a [shape=box];").includes("S:node_attrs"), "a node statement with a known attribute");
  assert.ok(!ev("a [zzqx=1];").includes("S:node_attrs") && !ev("a [zzqx=1];").includes("S:attr_known"), "an attribute name the TRAIN vocabulary never saw is not evidence");
  assert.ok(ev("rankdir=LR;").includes("S:graph_attr") && !ev("x=y;").includes("S:graph_attr"));
  // causal: a statement is timestamped at the end of the token after it (a node is only a node once `->` has not followed)
  const e1 = A.symbolsOf("a -> b; c", "dot", { priors, final: false });
  assert.equal(e1.length, 1); assert.equal(e1[0].sym, "S:edge");
});
test("R0 control: the global character derangement moves every non-blank character and keeps the layout", () => {
  const t = "digraph g {\n  a -> b;\n  b -> c [label=x];\n}";
  const s = I.charDerangeGlobal(t, L.mulberry32(9));
  assert.equal(s.length, t.length);
  assert.deepEqual([...s.replace(/\s/g, "")].sort(), [...t.replace(/\s/g, "")].sort());
  assert.deepEqual([...s].map((c) => /\s/.test(c)), [...t].map((c) => /\s/.test(c)));
  assert.notEqual(s, t);
  // the word-wise control leaves a numeral edge list well-formed (the reason it is only a diagnostic)
  const num = "graph {\n 1 -- 2\n 2 -- 3\n 3 -- 1\n}";
  assert.ok(I.charDerange(num, L.mulberry32(2)).includes("1 -- 2\n 2 -- 3\n 3 -- 1"), "the edge lines survive the word-wise shuffle");
  assert.ok(!I.charDerangeGlobal(num, L.mulberry32(2)).includes("1 -- 2"));
});

// ── identity ─────────────────────────────────────────────────────────────────────────────────────────────
test("R0: with the TRAIN identity prior the toy BPMN and DOT streams are named, prose and a character-shuffled stream are not", { skip: !(havePriors && priors.identity && Object.keys(priors.identity.models ?? {}).length === 2) }, () => {
  const b = A.identify(TOY, { priors }), d = A.identify(TOY_DOT, { priors });
  assert.equal(b.system, "bpmn_xml", JSON.stringify(b.evidence));
  assert.equal(d.system, "dot", JSON.stringify(d.evidence));
  const prose = "The committee met on Tuesday to discuss the budget for the coming year, and the members agreed that the proposal needed more time before any vote could be taken.";
  assert.equal(A.identify(prose, { priors }).system, null);
  assert.equal(A.identify(I.charDerange(TOY, L.mulberry32(5)), { priors }).system, null);
  // causal: the first-named position is a function of the prefix only
  const cut = A.identify(TOY.slice(0, 700), { priors });
  const at = b.first_named_at.bpmn_xml;
  if (at != null && at < 700 - 1) assert.equal(cut.first_named_at.bpmn_xml, at);
});
test("R0: without the identity prior the identifier says so (typed gap) and never names a system", () => {
  const dead = A.createIdentifier({ priors: { identity: null } });
  const st = dead.push("bpmn_xml", { sym: "E:flow_node", end: 3 });
  assert.equal(st.system, null); assert.ok(st.gaps.some((g) => g.reason === "prior_missing:identity"));
});

// ── the instrument ───────────────────────────────────────────────────────────────────────────────────────
test("instrument: measure() on an absent corpus returns the typed-unmeasured shape for every rung and never throws", async () => {
  const card = await I.measure({ split: "dev", dir: "/nonexistent/uml_bpmn" });
  assert.equal(card.family, "uml_bpmn");
  for (const k of ["r0", "r1", "r2", "r3", "r4", "r5"]) {
    const r = card.rungs[k];
    assert.equal(r.pass, null); assert.equal(r.score, null);
    assert.ok(r.gaps.some((g) => g.reason === "corpus_absent"));
    for (const f of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(f in r, `${k}.${f}`);
  }
});
test("instrument: the registration digest is a stable 16-hex string and FAMILY is exported", () => {
  assert.equal(I.FAMILY, "uml_bpmn");
  assert.match(I.registrationDigest(), /^[0-9a-f]{16}$/);
  assert.equal(I.registrationDigest(), I.registrationDigest());
});

// ═══ A5-A8 (adversarial review, dated 2026-10-06): standing tests for the findings ═════════════════════════════════════════════════════════
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const haveCorpus = fs.existsSync(path.join(L.DATA, "corpus", "manifest.json"));

// AUTHORED: a longer DOT text with identifiers of different lengths (the median-length lexer mutant needs variety) and node statements before their edges
const longDot = (n) => `digraph "G two" {\n  rankdir = LR;\n  node [shape=box];\n` + Array.from({ length: n }, (_, i) => `  node_${"x".repeat(i % 5)}${i} [label="step ${i} of the flow"];\n  node_${"x".repeat(i % 5)}${i} -> end${i % 3} [color=red];`).join("\n") + `\n}\n`;
// AUTHORED: identifiers that grow along the text, so a whole-text median differs from a prefix median (the lexer mutant's food)
const growingDot = (n) => `digraph g {\n` + Array.from({ length: n }, (_, i) => `  a${"x".repeat(i)} [label="${"w".repeat(i + 1)}"];\n  a${"x".repeat(i)} -> b${"y".repeat(i)};`).join("\n") + `\n}\n`;
const realLex = (dialect) => (t, final) => A.lex(t, { priors, dialect, final }).tokens;
const realRead = (dialect) => (t, final) => A.read(t, { priors, dialect, final });

test("A5 sampler: stratifiedSample covers every source, is seeded, never repeats a document; the slice(0,N) it replaces covers ONE source", () => {
  const docs = [...Array.from({ length: 90 }, (_, i) => ({ id: `a${i}`, source: "A" })), ...Array.from({ length: 5 }, (_, i) => ({ id: `b${i}`, source: "B" })), ...Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, source: "C" }))];
  const pick = L.stratifiedSample(docs, 30, "s");
  assert.equal(pick.length, 30);
  assert.deepEqual([...new Set(pick.map((d) => d.source))].sort(), ["A", "B", "C"]);
  assert.deepEqual(pick.map((d) => d.id), L.stratifiedSample(docs, 30, "s").map((d) => d.id));
  assert.notDeepEqual(pick.map((d) => d.id), L.stratifiedSample(docs, 30, "t").map((d) => d.id));
  assert.equal(new Set(pick.map((d) => d.id)).size, 30);
  assert.equal(new Set(docs.slice(0, 30).map((d) => d.source)).size, 1, "the old first-N slice is one source");
  assert.equal(L.stratifiedSample(docs, 2, "s").length, 2);
  assert.equal(L.stratifiedSample(docs, 500, "s").length, 100);
});
test("A5 sampler on the real manifest: every BPMN source and every DOT repository of dev and test is prefix-tested (the first 100 in manifest order were one BPMN source)", { skip: !haveCorpus }, () => {
  const m = L.loadManifest();
  for (const split of ["dev", "test"]) for (const dialect of ["bpmn_xml", "dot"]) {
    const ds = m.docs.filter((d) => d.split === split && d.dialect === dialect);
    const sources = new Set(ds.map((d) => d.source));
    const pick = L.stratifiedSample(ds, 100, `uml_bpmn-instrument-1-causal-c0-${dialect}`);
    assert.equal(new Set(pick.map((d) => d.source)).size, Math.min(100, sources.size), `${split} ${dialect}`);
    if (dialect === "bpmn_xml") assert.equal(new Set(ds.slice(0, 100).map((d) => d.source)).size, 1, `${split}: the old slice(0,100) was one source`);
  }
});

test("A5 standing mutation test (C0): the real identifier has 0 violations on each dialect; a deliberately NON-CAUSAL identifier (the dialect's threshold scaled by the whole stream's length) is caught on EACH dialect", { skip: !(havePriors && priors.identity && Object.keys(priors.identity.models ?? {}).length === 2) }, () => {
  const streams = [{ text: TOY.slice(0, 1000), dialect: "bpmn_xml" }, { text: bpmn("sem:", `xmlns:sem="${NS}"`), dialect: "bpmn_xml" }, { text: longDot(25).slice(0, 1000), dialect: "dot" }, { text: longDot(12), dialect: "dot" }, { text: TOY_DOT, dialect: "dot" }];
  const real = I.c0Check(streams, (t) => A.identify(t, { priors }));
  assert.equal(real.violations, 0, JSON.stringify(real));
  for (const D of ["bpmn_xml", "dot"]) {
    const own = streams.filter((s) => s.dialect === D);
    const mut = I.c0Check(own, I.mutantIdentify(priors, D));
    assert.ok(mut.by_dialect[D].own_violations > 0, `the C0 check is BLIND to a whole-stream lookahead on ${D}: ${JSON.stringify(mut)}`);
  }
  // the mutant path is A.identify's own path: with the scale removed it is the real identifier (so the violations above come from the lookahead and from nothing else)
  const same = I.c0Check(streams, I.mutantIdentify(priors, "dot", { scale: () => 1 }));
  assert.deepEqual(same, real);
});
test("A5 coverage: a C0 sample that holds only BPMN streams CANNOT license the DOT check (the original defect): the dot mutant produces no DOT stream-check at all", { skip: !(havePriors && priors.identity && Object.keys(priors.identity.models ?? {}).length === 2) }, () => {
  const bpmnOnly = [{ text: TOY.slice(0, 1000), dialect: "bpmn_xml" }, { text: TOY, dialect: "bpmn_xml" }];
  const mut = I.c0Check(bpmnOnly, I.mutantIdentify(priors, "dot"));
  assert.equal(mut.by_dialect.dot, undefined, "no DOT stream was tested, so a DOT-only lookahead goes unseen: the instrument must treat that as an unlicensed check");
  assert.equal(mut.by_dialect.bpmn_xml.own_violations, 0);
});
test("A5 standing mutation test (C1/C34): the real ear and reader keep every prefix stable; the lookahead lexer and the lookahead reader are caught on EACH dialect", { skip: !havePriors }, () => {
  const subjects = [["bpmn_xml", TOY], ["dot", longDot(30)], ["dot", growingDot(30)], ["dot", TOY_DOT]];
  for (const [D, text] of subjects) {
    assert.equal(I.lexPrefixViolations(text, realLex(D)).violations, 0, `real ear ${D}`);
    assert.equal(I.readPrefixViolations(text, realRead(D), D).violations, 0, `real reader ${D}`);
  }
  for (const D of ["bpmn_xml", "dot"]) {
    const text = D === "dot" ? growingDot(30) : TOY;
    assert.ok(I.lexPrefixViolations(text, I.mutantLex(priors, D)).violations > 0, `C1 is blind to a lookahead lexer on ${D}`);
    assert.ok(I.readPrefixViolations(text, I.mutantRead(priors, D), D).violations > 0, `C34 is blind to a lookahead reader on ${D}`);
  }
});

test("A7 R4: adjacent_flow built from GOLD beings does not move when the reader is degraded (an emptied lexicon gave a reader-built control of 0.18 and an easier margin)", { skip: !havePriors }, () => {
  const goldFlowNodes = ["S_1", "T_1", "G_1", "E_1", "T_2"];
  const fromGold = I.adjacentFlow(goldFlowNodes);
  assert.deepEqual(fromGold, ["S_1|sequence_flow|T_1", "T_1|sequence_flow|G_1", "G_1|sequence_flow|E_1", "E_1|sequence_flow|T_2"]);
  const dead = { ...priors, bpmn: { ...priors.bpmn, elements: {} } };
  const degraded = A.read(TOY, { priors: dead, dialect: "bpmn_xml" });
  const fromReader = I.adjacentFlow(degraded.beings.filter((b) => b.cls === "flow_node").map((b) => b.id));
  assert.deepEqual(fromReader, [], "the degraded reader has no flow-node beings, so a reader-built control collapses");
  assert.equal(I.adjacentFlow(goldFlowNodes).length, 4, "the gold-built control is independent of the reader");
  assert.deepEqual(I.adjacentFlow(["a"]), []); assert.deepEqual(I.adjacentFlow([]), []);
  assert.deepEqual(I.adjacentFlow(["a", "b", "c"], "directed"), ["a|directed|b", "b|directed|c"]);
});
test("A7 R4: marginCeiling labels an unreachable margin (the rule 0.50 is not retuned: 0.4999 fails, exactly 0.50 holds); a perfect reader against a 0.5177 control cannot reach it", () => {
  const dev = I.marginCeiling(1, 0.5177, 0.5);
  assert.equal(dev.reachable, false); assert.equal(dev.held, false); assert.equal(dev.ceiling, 0.4823); assert.equal(dev.margin, 0.4823);
  assert.match(I.marginVerdict(dev), /UNREACHABLE for a perfect reader/);
  const easy = I.marginCeiling(1, 0.18, 0.5);
  assert.equal(easy.reachable, true); assert.equal(easy.held, true); assert.match(I.marginVerdict(easy), /margin held/);
  const short = I.marginCeiling(0.6, 0.25, 0.5);
  assert.equal(short.reachable, true); assert.equal(short.held, false); assert.match(I.marginVerdict(short), /reachable and the reader falls short/);
  assert.equal(I.marginCeiling(0.9, 0.4, 0.5).held, true);
  assert.equal(I.marginCeiling(0.8999, 0.4, 0.5).held, false);
});

test("A8 R0: an expected stranger kind with no document in the split is a typed gap with denominators (CMMN: 60 train / 6 dev / 0 test), never a silent absence", () => {
  const manifest = { counts: { "train|other|xml_cmmn": 60, "dev|other|xml_cmmn": 6, "train|other|xml_dmn": 50, "test|other|xml_dmn": 45 }, stats: { "drop:declared_non_utf8:cmmn": 93, "capped:cmmn": 43, "capped:dmn": 11 } };
  const testNeg = Object.fromEntries(I.EXPECTED_STRANGERS.filter((k) => k !== "xml_cmmn").map((k) => [k, [{ id: k }]]));
  const gaps = I.absentStrangerGaps(testNeg, manifest);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].reason, "stranger_kind_absent_in_split:xml_cmmn"); assert.equal(gaps[0].count, 0);
  assert.deepEqual(gaps[0].documents_per_split_in_manifest, { train: 60, dev: 6, test: 0 });
  assert.equal(gaps[0].build_statistics["drop:declared_non_utf8:cmmn"], 93);
  assert.ok(!JSON.stringify(gaps[0].build_statistics).includes("dmn:11"), "only the kind's own statistics");
  assert.equal(I.absentStrangerGaps(Object.fromEntries(I.EXPECTED_STRANGERS.map((k) => [k, [{ id: k }]])), manifest).length, 0);
  assert.equal(I.absentStrangerGaps({}, manifest).length, I.EXPECTED_STRANGERS.length, "an empty split reports every expected kind");
  for (const k of ["xml_other", "xml_dmn", "xml_cmmn", "mermaid", "sbgn_ml", "code", "markup", "data", "prose"]) assert.ok(I.EXPECTED_STRANGERS.includes(k), k);
});

test("A6 licence (rule 11): only the permissive set passes the audit; a non-commercial or generic record does not", () => {
  assert.equal(L.spdxOf("Apache-2.0 (libsbgn is dual LGPL-2.1+ / Apache-2.0; the Apache-2.0 option is taken)"), "Apache-2.0");
  assert.equal(L.spdxOf("CC-BY-SA-4.0 (UD_English-EWT v2.18; the treebank's LICENSE.txt and README read)"), "CC-BY-SA-4.0");
  const m = { docs: [{ license: "MIT" }, { license: "CC-BY-SA-4.0 (x)" }, { license: "CC-BY-NC-SA-3.0 (UD_Italian-ISDT)" }, { license: "UD treebank licence (see treebank LICENSE.txt)" }, { license: "GPL-3.0" }] };
  const a = L.licenceAuditOf(m);
  assert.deepEqual(Object.keys(a.not_allowed).sort(), ["CC-BY-NC-SA-3.0", "GPL-3.0", "UD treebank licence"].sort());
  assert.equal(L.licenceAuditOf({ docs: [{ license: "MIT" }, { license: "Unlicense" }, { license: "CC0-1.0" }, { license: "ISC" }, { license: "BSD-3-Clause" }, { license: "CC-BY-4.0" }] }).not_allowed["MIT"], undefined);
  assert.ok(!L.ALLOWED_SPDX.some((x) => /NC|GPL/.test(x)), "no non-commercial or copyleft identifier is in the allowed list");
});
test("A6 licence on the real corpus: no Italian prose, every document carries an exact permissive SPDX, every prose document names its treebank; the identity prior was rebuilt without Italian", { skip: !haveCorpus }, () => {
  const m = L.loadManifest();
  assert.deepEqual(L.licenceAuditOf(m).not_allowed, {});
  assert.equal(m.docs.filter((d) => d.neg_kind === "prose:ita" || d.source === "ud-ita").length, 0);
  assert.deepEqual(m.licence_audit.documents_with_spdx_not_allowed, {});
  assert.ok(m.licence_audit.prose_excluded.ita.why.includes("NC"));
  const prose = m.docs.filter((d) => (d.neg_kind ?? "").startsWith("prose:"));
  assert.ok(prose.length > 0 && prose.every((d) => /^CC-BY(-SA)?-4\.0 \(UD_/.test(d.license)), "exact SPDX plus the treebank name, not a generic string");
  assert.ok(!fs.existsSync(path.join(L.DATA, "corpus", "train", "prose-ita-000.txt")), "the Italian text left the corpus directory");
  const idp = priors.identity;
  if (idp?.train?.prose_languages_in_background) { assert.ok(!idp.train.prose_languages_in_background.includes("ita")); assert.ok(idp.train.prose_languages_excluded_for_licence.ita); }
});
test("A6 instrument: a corpus whose manifest holds a licence outside the allowed set voids EVERY verdict (pass null + typed gap), it never reports a pass on it", { skip: !(haveCorpus && havePriors) }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uml_bpmn-lic-"));
  try {
    fs.mkdirSync(path.join(tmp, "corpus"));
    const m = JSON.parse(fs.readFileSync(path.join(L.DATA, "corpus", "manifest.json"), "utf8"));
    m.docs.find((d) => d.split === "dev" && d.dialect === "dot").license = "CC-BY-NC-SA-3.0 (doctored for this test)";
    fs.writeFileSync(path.join(tmp, "corpus", "manifest.json"), JSON.stringify(m));
    for (const sp of ["train", "dev", "test"]) fs.symlinkSync(path.join(L.DATA, "corpus", sp), path.join(tmp, "corpus", sp));
    fs.symlinkSync(path.join(L.DATA, "gold"), path.join(tmp, "gold"));
    const card = await I.measure({ split: "dev", limit: 31, dir: tmp });
    assert.equal(card.licence.ok, false); assert.deepEqual(Object.keys(card.licence.not_allowed), ["CC-BY-NC-SA-3.0"]);
    for (const k of ["r0", "r1", "r2", "r3", "r4", "r5"]) { assert.equal(card.rungs[k].pass, null, k); assert.ok(card.rungs[k].gaps.some((g) => g.reason === "licence_audit_failed"), k); }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test("A8 instrument on the real corpus: the dry run of the held-out split names CMMN as absent (no DEV/TEST card is produced by it)", { skip: !haveCorpus }, async () => {
  const dry = await I.measure({ split: "test", dryRun: true });
  assert.equal(dry.dryRun, true);
  assert.ok(dry.absent_stranger_kinds.includes("xml_cmmn"), JSON.stringify(dry.absent_stranger_kinds));
  assert.ok(!dry.absent_stranger_kinds.includes("xml_dmn"));
  assert.equal(dry.counts.negatives.xml_cmmn, undefined);
});
test("A5/A7 instrument on the real DEV corpus (limited run): C0, C1 and C34 run on BOTH dialects, each is licensed by its mutant, R4 carries the margin ceiling and the discriminating evidence", { skip: !(haveCorpus && havePriors && priors.identity && Object.keys(priors.identity.models ?? {}).length === 2) }, async () => {
  // a scratch directory of symlinks onto the real corpus, so that the card this limited run writes does not land in the real results/ directory
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uml_bpmn-lim-"));
  let card;
  try {
    fs.mkdirSync(path.join(tmp, "corpus"));
    fs.symlinkSync(path.join(L.DATA, "corpus", "manifest.json"), path.join(tmp, "corpus", "manifest.json"));
    for (const sp of ["train", "dev", "test"]) fs.symlinkSync(path.join(L.DATA, "corpus", sp), path.join(tmp, "corpus", sp));
    fs.symlinkSync(path.join(L.DATA, "gold"), path.join(tmp, "gold"));
    card = await I.measure({ split: "dev", limit: 40, dir: tmp });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  assert.equal(card.licence.ok, true);
  const r0 = card.rungs.r0.details, r1 = card.rungs.r1.details, r4 = card.rungs.r4.details;
  for (const D of ["bpmn_xml", "dot"]) {
    assert.ok(r0.causal.by_dialect[D].streams > 0, `C0 streams ${D}`); assert.equal(r0.causal.by_dialect[D].violations, 0, `C0 violations ${D}`);
    assert.ok(r0.causal.mutant[D].violations > 0, `C0 licence ${D}`); assert.equal(r0.checks[`C0.licence(mutant_caught).${D}`], true); assert.equal(r0.checks[`C0.causal.${D}`], true);
    assert.deepEqual(Object.keys(r0.causal.by_dialect[D].arms).sort(), ["body", "head", "mid"], `C0 draws head, body and mid windows for ${D}`);
  }
  assert.equal(r1.checks["bpmn.C1.licence(mutant_caught)"], true); assert.equal(r1.checks["dot.C1.licence(mutant_caught)"], true);
  assert.equal(r4.checks["bpmn.C34.licence(mutant_caught)"], true); assert.equal(r4.checks["dot.C34.licence(mutant_caught)"], true);
  assert.ok("bpmn.sign(adjacent)" in r4.checks && "bpmn.sign(misaligned)" in r4.checks && "bpmn.margin>=0.50" in r4.checks, "the registered margin check stays in the rule beside the added sign tests");
  assert.ok(r4.bpmn_xml.margin_ceiling && "reachable" in r4.bpmn_xml.margin_ceiling && r4.bpmn_xml.discriminating_evidence && "held" in r4.bpmn_xml.discriminating_evidence);
  assert.ok(["gold_built", "reader_built"].includes(r4.bpmn_xml.adjacent_flow_variants.used));
  assert.ok(card.rungs.r0.gaps.some((g) => g.reason === "prose_language_excluded_licence:ita"), "Italian prose is a typed gap");
  assert.equal(card.registration, I.registrationDigest());
});
