// tests/competence-r4.test.js — R4 (find claims) — the INSTRUMENT is regression-guarded here, not the reader.
//
// PREDICTION (FOLD-CONSTITUTION II.5, II.23; written before the first run of this file): on a toy treebank whose
// sentences share no content word,
//   - a PERFECT system (one edge per gold subject-object pair) scores recall 1, precision 1, F1 1 and, with the
//     power floor lowered for the toy, PASSES the rule against every control;
//   - a DERANGED system (the perfect edges attached to the neighbouring sentence) scores 0 and does NOT pass;
//   - the controls built to fail (shuffled_gold, crossed_edges, random_adjacent) score ~0 against the perfect arm,
//     random_pair stays far below it, and the licence clause (L) holds;
//   - a control that does as well as the real arm (licensed, same F1) makes `pass` FALSE, never true;
//   - an UNLICENSED control (counts identical to the real arm: the statistic did not move) is dropped and typed,
//     not counted as beaten;
//   - the matcher says what the header says (token equality for short alphabetic keys, substring from 3 letters,
//     the squash for unspaced scripts, treebank-annotated bound stems for Korean, MWT surface forms, diacritics);
//   - production edges map back to the right sentences by span offsets and an unmappable span is COUNTED;
//   - measure() never throws for a stem lacking data: pass null with a typed gap `unmeasured`.
// PASS RULE: every assertion below holds. The toy needs no treebank and no reader; nothing here loads a prior.
//
// AMENDMENT v2 (2026-10-06, written before the v2 tests were first run; the v1 tests above are UNCHANGED and still pass):
// PREDICTION: the v2 rule (evaluateClaims) fixes the reviewer's findings, so that
//   - the reviewer's MUTANT (two edges per sentence between random distinct oracle nominal heads, no claim structure) is a v1 PASS
//     (passLenient true: the demonstration of the finding) and a v2 NON-pass (pass is not true; `pass_is_noun_finding` is typed);
//   - a perfect arm on a corpus with five nominals per sentence PASSES v2, with hits, null and licence reported as integers;
//   - fewer real hits than the derangement null needs -> pass null + typed gap `underpowered_hits`, never a pass or a fail by noise;
//   - a deranged-pairing null that hits as often as the real arm (identical gold in every sentence) -> not shown (pass null);
//   - a zero-edge control is DEGENERATE (typed, excluded, never "beaten"); an identical control is UNLICENSED (typed, excluded);
//   - a control that does as well as the real arm makes pass FALSE; a nominal-pair control identical to the real arm makes pass FALSE;
//   - a gating tier that heard another language voids the pass (null + `surface_tier_heard_other_language`);
//   - criticalHits / permutationP derive the hit floor from the null draws (no bare integer), and Infinity when too few draws;
//   - the declared-language tier passes the DECLARED language on every call, counts a call that hears another, and with the ear off
//     differs from the ear-on tier on unspaced script; the strictly causal read gives sentence k only sentences 0..k and credits only
//     sentence k's edges (a later read's edge for an earlier sentence is NOT credited);
//   - the pre-registration is stamped: the v1 block still hashes to the digest the addendum stamped and the amendment's digest is pinned.
// PASS RULE: every assertion in the v2 tests below holds.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RUNG, CONTROLS_IN_RULE, CONTROLS_IN_SPEC, norm, prep, keyInfo, containsKey, boundStem, keysOf, sentenceText, goldOfSentence, scoreSentence,
  toCols, summaryOf, bootstrapDiff, moves, randomArm, shuffledGoldArm, crossedEdgesArm, nominalPairArm, evaluateSystem, offsetsOf, mapEdgesToSentences, measure,
  MIN_GOLD_PAIRS, SUBSTRING_MIN, LICENCE_RATIO,
  GATE_BLOCK, NULL_DRAWS, GATING_CONTROLS_V2, INFORMATIONAL_CONTROLS_V2, evaluateClaims, headerDigests, strictCols, movesOn, shuffledNullHits, criticalHits, permutationP,
  makeTier, ownPriorOverrides, noEnglishSeams, causalReads, loadSystem, claimsCard,
} from "../eval/competence/r4-claims.mjs";
import { parseConllu, headerDigest, mulberry32 } from "../eval/competence/lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "..", "eval", "competence", "r4-claims.mjs");

// ── a toy treebank: rows are [form, lemma, upos, head, deprel, xpos?, misc?] ──
const conll = (rows, id) => `# sent_id = ${id}\n# text = ${rows.map((r) => r[0]).join(" ")}\n${rows.map((r, i) => [i + 1, r[0], r[1], r[2], r[5] ?? "_", "_", r[3], r[4], "_", r[6] ?? "_"].join("\t")).join("\n")}\n`;
const TOY = [
  [["The", "the", "DET", 2, "det"], ["cat", "cat", "NOUN", 3, "nsubj"], ["chased", "chase", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], ["mouse", "mouse", "NOUN", 3, "obj"]],
  [["A", "a", "DET", 2, "det"], ["farmer", "farmer", "NOUN", 3, "nsubj"], ["sold", "sell", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], ["horse", "horse", "NOUN", 3, "obj"]],
  // conjoined subjects: Maria nsubj, Pedro conj of Maria  -> 2 pairs
  [["Maria", "Maria", "PROPN", 4, "nsubj"], ["and", "and", "CCONJ", 3, "cc"], ["Pedro", "Pedro", "PROPN", 1, "conj"], ["painted", "paint", "VERB", 0, "root"], ["the", "the", "DET", 6, "det"], ["house", "house", "NOUN", 4, "obj"]],
  // iobj + obj: teacher->student, teacher->book  -> 2 pairs
  [["The", "the", "DET", 2, "det"], ["teacher", "teacher", "NOUN", 3, "nsubj"], ["gave", "give", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], ["student", "student", "NOUN", 3, "iobj"], ["a", "a", "DET", 7, "det"], ["book", "book", "NOUN", 3, "obj"]],
  [["The", "the", "DET", 2, "det"], ["doctor", "doctor", "NOUN", 3, "nsubj"], ["treated", "treat", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], ["patient", "patient", "NOUN", 3, "obj"]],
  [["The", "the", "DET", 2, "det"], ["baker", "baker", "NOUN", 3, "nsubj"], ["made", "make", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], ["bread", "bread", "NOUN", 3, "obj"]],
  [["The", "the", "DET", 2, "det"], ["pilot", "pilot", "NOUN", 3, "nsubj:pass"], ["flew", "fly", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], ["plane", "plane", "NOUN", 3, "obj"]],
  [["The", "the", "DET", 2, "det"], ["sailor", "sailor", "NOUN", 3, "nsubj"], ["lost", "lose", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], ["anchor", "anchor", "NOUN", 3, "obj"]],
  [["A", "a", "DET", 2, "det"], ["thief", "thief", "NOUN", 3, "nsubj"], ["stole", "steal", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], ["diamond", "diamond", "NOUN", 3, "obj"]],
  [["The", "the", "DET", 2, "det"], ["queen", "queen", "NOUN", 3, "nsubj"], ["visited", "visit", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], ["village", "village", "NOUN", 3, "obj"]],
  // no pair: a subject and nothing else
  [["Birds", "bird", "NOUN", 2, "nsubj"], ["sing", "sing", "VERB", 0, "root"]],
];
const sents = parseConllu(TOY.map((r, i) => conll(r, `t${i}`)).join("\n"));
const gold = sents.map(goldOfSentence);
const toks = sents.map((s) => s.tokens.map((t) => t.form.toLowerCase()).filter((f) => /\p{L}/u.test(f)));
const N = sents.length;
const TOY_POWER = { minGold: 5, B: 400, draws: 12 };
// the perfect system: one edge per gold pair, end1 = subject, label = verb, end2 = object
const form = (s, id) => s.tokens.find((t) => t.id === id).form;
const perfect = sents.map((s, i) => gold[i].pairs.map((p) => ({ end1: form(s, p.sId), label: form(s, p.vId), end2: form(s, p.oId) })));

test("the rung announces itself; the pre-registration is in the header and stamped", () => {
  assert.equal(RUNG.id, "r4");
  assert.ok(RUNG.name && RUNG.question);
  assert.deepEqual([...CONTROLS_IN_RULE], ["noear", "shuffled_gold", "crossed_edges", "random_adjacent", "random_pair"]);
  assert.deepEqual([...CONTROLS_IN_SPEC], ["noear", "shuffled_gold", "crossed_edges"]);
  const head = fs.readFileSync(FILE, "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n");
  for (const must of ["PRE-REGISTRATION", "CLAIM", "GOLD", "THE MATCHER", "METRICS", "CONTROLS", "PASS RULE", "PREDICTIONS", "KNOWN LIMITS", "LOOKAHEAD", "case-stripped"]) assert.ok(head.includes(must), `header lacks ${must}`);
  assert.match(headerDigest(FILE), /^[0-9a-f]{64}$/);
  assert.ok(MIN_GOLD_PAIRS >= 1 && SUBSTRING_MIN.ideographic < SUBSTRING_MIN.alphabetic && LICENCE_RATIO > 0 && LICENCE_RATIO < 1);
});

test("gold: subject-object pairs from HEAD/DEPREL only; conj expands, iobj counts, nsubj:pass counts, a lone subject makes no pair", () => {
  assert.equal(gold[0].pairs.length, 1);
  assert.equal(gold[2].pairs.length, 2);                                  // Maria, Pedro -> house
  assert.deepEqual(gold[2].pairs.map((p) => p.s.keys[0].squash).sort(), ["maria", "pedro"]);
  assert.equal(gold[3].pairs.length, 2);                                  // teacher -> student (iobj), teacher -> book (obj)
  assert.equal(gold[6].pairs.length, 1);                                  // nsubj:pass base deprel is nsubj
  assert.equal(gold[10].pairs.length, 0);
  assert.equal(gold.reduce((a, g) => a + g.pairs.length, 0), 12);
  assert.ok(gold[0].nominals.every((n) => ["NOUN", "PROPN", "PRON"].includes(n.upos)));
  assert.equal(gold[0].pairs[0].pure, true);
});

test("the matcher: token equality for short alphabetic keys, substring from 3 letters, squash for unspaced scripts", () => {
  assert.equal(norm("École  "), "ecole  ");
  assert.equal(containsKey(prep("the cats"), "cat"), true);               // length 3: substring (inflection)
  assert.equal(containsKey(prep("the cat"), "he"), false);                // length 2: whole token only
  assert.equal(containsKey(prep("she"), "he"), false);
  assert.equal(containsKey(prep("he said"), "he"), true);
  assert.equal(containsKey(prep("an e-mail"), "e-mail"), true);           // a key of several tokens -> tested on the squash
  assert.equal(containsKey(prep("an e-mail"), "email"), false);           // a one-token key is not found across a separator
  assert.equal(containsKey(prep("中国政府 说"), "政府"), true);            // ideographic: squash includes
  assert.equal(containsKey(prep("中 国"), "中国"), true);                  // segmented differently, same characters
  assert.equal(containsKey(prep("他们"), "他"), false);                    // 1 character: token equality only
  assert.equal(containsKey(prep("他 们"), "他"), true);
  assert.equal(containsKey(prep("المدينة"), "المدينة"), true);
  assert.equal(keyInfo("政府").ideographic, true);
  assert.equal(keyInfo("casa").ideographic, false);
});

test("keys: lemma, the treebank's own Korean bound stem, the MWT surface form, Arabic harakat stripped", () => {
  const k = (form, lemma, xpos, id = 1) => ({ id, form, lemma, xpos });
  assert.equal(boundStem(k("정부가", "정부+가", "NNG+JKS")), "정부");
  assert.equal(boundStem(k("경기관광공사와", "경기+관광공사+와", "NNG+NNG+JC")), "경기관광공사");
  assert.equal(boundStem(k("서울", "서울", "NNP")), null);
  const ko = keysOf(k("정부가", "정부+가", "NNG+JKS")).map((x) => x.squash);
  assert.ok(ko.includes("정부") && ko.includes("정부가"));
  assert.ok(containsKey(prep("정부"), keysOf(k("정부가", "정부+가", "NNG+JKS")).find((x) => x.squash === "정부")));
  const del = keysOf({ id: 2, form: "el", lemma: "el", xpos: "_" }, [{ from: 1, to: 2, form: "del" }]).map((x) => x.squash);
  assert.ok(del.includes("del") && del.includes("el"));
  const ar = keysOf({ id: 1, form: "الرجل", lemma: "رَجُل", xpos: "_" }).map((x) => x.squash);
  assert.ok(ar.includes("رجل") && ar.includes("الرجل"));               // an ear that peels al- is not penalised
  assert.deepEqual(sentenceText({ text: " Hello. ", tokens: [], ranges: [] }), { text: "Hello.", rebuilt: false });
  const rb = parseConllu("# sent_id = b\n1-2\tdel\t_\t_\t_\t_\t_\t_\t_\t_\n1\tde\tde\tADP\t_\t_\t0\troot\t_\t_\n2\tel\tel\tDET\t_\t_\t1\tdet\t_\t_\n3\tmar\tmar\tNOUN\t_\t_\t1\tnmod\t_\tSpaceAfter=No\n\n")[0];
  assert.deepEqual(sentenceText(rb), { text: "del mar", rebuilt: true });
});

test("a perfect system scores 1 on every pair metric; spec precision counts a both-nominal edge, strict does not", () => {
  const stats = perfect.map((es, i) => scoreSentence(gold[i], es));
  const s = summaryOf(toCols(stats));
  assert.equal(s.pairs, 12); assert.equal(s.edges, 12);
  assert.equal(s.recall, 1); assert.equal(s.precision, 1); assert.equal(s.strictPrecision, 1); assert.equal(s.f1, 1);
  assert.equal(s.tripleRecall, 1);                                         // the labels carry the verbs
  assert.equal(s.nominalRecall, 1);
  // a reversed edge (object, verb, subject) is not a directed hit, but both ends are nominal heads: counts for the spec's precision only
  const rev = scoreSentence(gold[0], [{ end1: "mouse", label: "chased", end2: "cat" }]);
  assert.equal(rev.h, 0); assert.equal(rev.hu, 1); assert.equal(rev.m, 1); assert.equal(rev.ms, 0);
  // an edge between a determiner and a noun is neither
  const junk = scoreSentence(gold[0], [{ end1: "the", label: "", end2: "cat" }]);
  assert.equal(junk.m, 0); assert.equal(junk.h, 0);
  // an empty system is F1 0, not undefined
  const none = summaryOf(toCols(sents.map((_, i) => scoreSentence(gold[i], []))));
  assert.equal(none.f1, 0); assert.equal(none.precision, 0);
});

test("the controls built to fail fail: shuffled gold, crossed edges and adjacent edges score ~0 against a perfect arm; random pairs stay far below", () => {
  const counts = perfect.map((e) => e.length);
  const sh = summaryOf(shuffledGoldArm({ gold, edges: perfect, draws: 12 }));
  const cr = summaryOf(crossedEdgesArm({ gold, edges: perfect, draws: 12 }));
  const ra = summaryOf(randomArm({ gold, toks, counts, kind: "adjacent", draws: 12 }));
  const rp = summaryOf(randomArm({ gold, toks, counts, kind: "pair", draws: 12 }));
  assert.equal(sh.f1, 0, "no sentence keeps its own gold: every hit is gone");
  assert.equal(cr.f1, 0, "an end2 from another sentence names nothing of this one");
  assert.ok(ra.f1 < 0.1, `random adjacent F1 ${ra.f1}`);
  assert.ok(rp.f1 < 0.4, `random pair F1 ${rp.f1}`);
  assert.equal(shuffledGoldArm({ gold: gold.slice(0, 1), edges: perfect.slice(0, 1) }), null, "a derangement of one sentence does not exist: a typed hole, not a number");
  assert.equal(crossedEdgesArm({ gold: gold.slice(0, 2), edges: [perfect[0], []] }), null, "no other sentence has an edge to cross with");
});

test("evaluateSystem: the perfect arm passes the whole rule; the deranged arm (edges on the wrong sentences) does not; the licence holds", () => {
  const ok = evaluateSystem({ edges: perfect, noear: sents.map(() => []), gold, toks, ...TOY_POWER });
  assert.equal(ok.summary.f1, 1);
  assert.equal(ok.licence.ok, true);
  assert.equal(ok.pass, true, JSON.stringify(ok.notes));
  assert.equal(ok.passSpec, true);
  for (const c of CONTROLS_IN_RULE) assert.equal(ok.controls[c].beats, true, `${c} must be beaten`);
  assert.ok(ok.control < 0.4 && ok.summary.f1 - ok.control > 0.6);
  // the deranged arm: the same edges, each attached to the NEXT sentence
  const deranged = perfect.map((_, i) => perfect[(i + 1) % N]);
  const bad = evaluateSystem({ edges: deranged, noear: sents.map(() => []), gold, toks, ...TOY_POWER });
  assert.equal(bad.summary.recall, 0);
  assert.equal(bad.pass, false);
  assert.ok(bad.notes.some((n) => /emitted no edge|F1 = 0|LICENCE/.test(n)));
});

test("evaluateSystem: a licensed control that does as well as the real arm makes pass FALSE (II.23)", () => {
  // noear = the same hits plus one extra both-nominal edge per sentence: counts differ (licensed), F1 equal
  const matching = perfect.map((es, i) => (es.length ? [...es, es[0]] : es));
  const real = evaluateSystem({ edges: perfect, noear: matching, gold, toks, ...TOY_POWER });
  assert.equal(real.controls.noear.licensed, true);
  assert.equal(real.controls.noear.beats, false);
  assert.equal(real.pass, false, "a control that does as well as the real arm means the instrument or the mechanism is broken");
  assert.equal(real.passSpec, false);
  assert.ok(real.notes.some((n) => /does not beat noear/.test(n)));
});

test("evaluateSystem: an UNLICENSED control (statistic did not move) is dropped and typed, never counted as beaten", () => {
  const same = evaluateSystem({ edges: perfect, noear: perfect, gold, toks, ...TOY_POWER });
  assert.equal(same.controls.noear.licensed, false);
  assert.ok(same.gaps.some((g) => g.reason === "control_unlicensed:noear"));
  assert.ok(!same.ruled.includes("noear"));
  assert.equal(same.pass, true, "the remaining licensed controls still hold the claim");
  assert.equal(moves(toCols(perfect.map((es, i) => scoreSentence(gold[i], es))), toCols(perfect.map((es, i) => scoreSentence(gold[i], es)))), false);
});

test("evaluateSystem: below the power floor pass is null with an `underpowered` gap; an arm that emits nothing fails", () => {
  const thin = evaluateSystem({ edges: perfect, noear: sents.map(() => []), gold, toks, B: 100, draws: 4 });  // 12 pairs < MIN_GOLD_PAIRS
  assert.equal(thin.pass, null);
  assert.ok(thin.gaps.some((g) => g.reason === "underpowered"));
  assert.equal(thin.summary.f1, 1, "the numbers are still reported");
  const silent = evaluateSystem({ edges: sents.map(() => []), noear: sents.map(() => []), gold, toks, ...TOY_POWER });
  assert.equal(silent.pass, false);
  assert.equal(silent.summary.f1, 0);
});

test("POST-HOC diagnostic (never in the rule): a perfect arm on two-nominal sentences cannot beat the oracle nominal-pair chance; with five nominals per sentence it does", () => {
  // two nominals per sentence: the only nominal pair IS the subject-object pair, so noun-finding alone scores 1
  const counts = perfect.map((e) => e.length);
  const two = evaluateSystem({ edges: perfect, noear: sents.map(() => []), gold, toks, ...TOY_POWER });
  assert.equal(two.pass, true, "the registered rule is unchanged by the diagnostic");
  const nomTwo = summaryOf(nominalPairArm({ gold: gold.slice(0, 2), counts: counts.slice(0, 2), draws: 8 }));
  assert.equal(nomTwo.f1Strict, 1);
  assert.equal(two.diagnostics.controls.random_nominal_pair.f1Strict > 0.4, true);
  assert.equal(two.diagnostics.beatsNominalPair, false, "a pass that noun-finding alone reproduces must be visible as such");
  // five nominals per sentence (subject, object, three obliques): chance for one random nominal pair is 1/10
  const names = [["fox", "hare", "river", "hill", "wood"], ["owl", "mole", "field", "barn", "gate"], ["wolf", "deer", "lake", "cave", "path"], ["bear", "bee", "hive", "tree", "root"], ["crow", "worm", "yard", "wall", "pond"], ["seal", "crab", "reef", "tide", "cove"], ["lynx", "vole", "dune", "pine", "moss"], ["hawk", "wren", "nest", "cliff", "sky"], ["boar", "toad", "mud", "oak", "fern"], ["stag", "mouse", "glen", "bog", "elm"], ["lion", "ibex", "crag", "sand", "palm"], ["goat", "newt", "peak", "fog", "ash"]];
  const rich = parseConllu(names.map((n, i) => conll([["a", "a", "DET", 2, "det"], [n[0], n[0], "NOUN", 3, "nsubj"], ["met", "meet", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], [n[1], n[1], "NOUN", 3, "obj"], ["near", "near", "ADP", 7, "case"], [n[2], n[2], "NOUN", 3, "obl"], ["by", "by", "ADP", 9, "case"], [n[3], n[3], "NOUN", 3, "obl"], ["in", "in", "ADP", 11, "case"], [n[4], n[4], "NOUN", 3, "obl"]], `r${i}`)).join("\n"));
  const rg = rich.map(goldOfSentence);
  const rtoks = rich.map((s) => s.tokens.map((t) => t.form).filter((f) => /\p{L}/u.test(f)));
  const redges = rich.map((s, i) => rg[i].pairs.map((p) => ({ end1: form(s, p.sId), label: form(s, p.vId), end2: form(s, p.oId) })));
  assert.equal(rg.every((g) => g.pairs.length === 1 && g.nominals.length === 5), true);
  const r = evaluateSystem({ edges: redges, noear: rich.map(() => []), gold: rg, toks: rtoks, minGold: 5, B: 400, draws: 12 });
  assert.equal(r.summary.f1Strict, 1);
  assert.ok(r.diagnostics.controls.random_nominal_pair.f1Strict < 0.35, `oracle chance ${r.diagnostics.controls.random_nominal_pair.f1Strict}`);
  assert.equal(r.diagnostics.beatsNominalPair, true);
  assert.equal(r.diagnostics.beatsAllStrict, true);
});

test("the bootstrap is paired, seeded and honest: identical arms never reject; a dominated arm always does; same seed, same answer", () => {
  const a = toCols(perfect.map((es, i) => scoreSentence(gold[i], es)));
  const z = toCols(sents.map((_, i) => scoreSentence(gold[i], [])));
  const same = bootstrapDiff(a, a, { B: 300 });
  assert.equal(same.lower, 0); assert.ok(same.p > 0.5);
  const dom = bootstrapDiff(a, z, { B: 300 });
  assert.ok(dom.lower > 0.5 && dom.p < 0.01 && dom.observed === 1);
  assert.deepEqual(bootstrapDiff(a, z, { B: 300 }), dom);
  assert.notEqual(bootstrapDiff(a, z, { B: 300, seed: 9 }).mean, undefined);
});

test("production edges map back to their sentences by span offsets; a recurring edge lands in each; an unmappable span is counted", () => {
  const texts = ["aa bb.", "cc dd.", "ee ff."];
  const off = offsetsOf(texts);
  assert.deepEqual(off, [{ start: 0, end: 6 }, { start: 8, end: 14 }, { start: 16, end: 22 }]);
  const edge = (e1, e2, spans) => ({ end1: e1, label: "x", end2: e2, spans });
  const r = mapEdgesToSentences([
    edge("a", "b", [{ ref: "material#8-14", start: 0 }]),                                            // -> sentence 1
    edge("c", "d", [{ ref: "material#0-6", start: 0 }, { ref: "material#16-22", start: 0 }]),        // recurs: sentences 0 and 2
    edge("e", "f", [{ ref: "material#0-22", start: 9 }]),                                            // chunk spanning several passages: 0+9 -> sentence 1
    edge("g", "h", [{ ref: "material#6-8", start: 0 }]),                                             // lands in the "\n\n" gap: unmapped
    edge("i", "j", []),                                                                              // no span at all: unmapped
  ], off);
  assert.deepEqual(r.per.map((es) => es.map((e) => e.end1)), [["c"], ["a", "e"], ["c"]]);
  assert.equal(r.unmapped, 2);
  assert.equal(r.instances, 4);
});

test("measure() never throws for a stem lacking data: pass null, typed gaps `unmeasured` and `no_gold`; a stem with gold but no prior is `language_unheard`", async () => {
  const none = await measure({ stem: "zz-no-such-language", split: "dev" });
  assert.equal(none.pass, null); assert.equal(none.rung, "r4"); assert.equal(none.stem, "zz-no-such-language");
  assert.ok(none.gaps.some((g) => g.reason === "unmeasured") && none.gaps.some((g) => g.reason === "no_gold"));
  assert.equal(none.score, null); assert.equal(none.control, null);
  const nostem = await measure({});
  assert.equal(nostem.pass, null);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "r4-"));
  try {
    fs.mkdirSync(path.join(tmp, "zzz"));
    fs.writeFileSync(path.join(tmp, "zzz", "dev.conllu"), TOY.map((r, i) => conll(r, `t${i}`)).join("\n"));
    const gap = await measure({ stem: "zzz", split: "dev", evalDir: tmp });
    assert.equal(gap.pass, null);
    assert.ok(gap.gaps.some((g) => g.reason === "language_unheard"), JSON.stringify(gap.gaps));
    assert.ok(gap.gaps.some((g) => g.reason === "unmeasured"));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

// ═══ AMENDMENT v2 tests ═══════════════════════════════════════════════════════
const V2 = { B: 300, draws: 12, nullDraws: 99 };
/** a distinct 4-letter word per index (no word is a substring of another: equal length) */
const word = (i) => { let w = "", x = i; for (let k = 0; k < 4; k++) { w = String.fromCharCode(97 + (x % 26)) + w; x = Math.floor(x / 26); } return w; };
/** n sentences, each: det SUBJ met det OBJ near OBL by OBL in OBL — five nominal heads, one gold pair */
const richCorpus = (n) => parseConllu(Array.from({ length: n }, (_, i) => {
  const w = (j) => word(1000 + i * 5 + j);
  return conll([["a", "a", "DET", 2, "det"], [w(0), w(0), "NOUN", 3, "nsubj"], ["met", "meet", "VERB", 0, "root"], ["the", "the", "DET", 5, "det"], [w(1), w(1), "NOUN", 3, "obj"], ["near", "near", "ADP", 7, "case"], [w(2), w(2), "NOUN", 3, "obl"], ["by", "by", "ADP", 9, "case"], [w(3), w(3), "NOUN", 3, "obl"], ["in", "in", "ADP", 11, "case"], [w(4), w(4), "NOUN", 3, "obl"]], `r${i}`);
}).join("\n"));
const R_N = 60;
const rS = richCorpus(R_N), rG = rS.map(goldOfSentence), rT = rS.map((s) => s.tokens.map((t) => t.form).filter((f) => /\p{L}/u.test(f)));
const rPerfect = rS.map((s, i) => rG[i].pairs.map((p) => ({ end1: form(s, p.sId), label: form(s, p.vId), end2: form(s, p.oId) })));
const none = (n) => Array.from({ length: n }, () => []);
/** the reviewer's mutant: k edges per sentence between random distinct ORACLE nominal heads (reading order), no claim structure */
const mutantEdges = (g, k, seed) => { const rng = mulberry32(seed); return g.map((x) => { const f = x.nominals.map((n) => n.keys[0].squash); const out = []; for (let e = 0; e < k; e++) { const a = Math.floor(rng() * f.length); let b = Math.floor(rng() * f.length); if (a === b) b = (a + 1) % f.length; out.push({ end1: f[Math.min(a, b)], label: "", end2: f[Math.max(a, b)] }); } return out; }); };

test("v2 header: the amendment is in the file, the v1 block still hashes to the stamped digest, the amendment digest is pinned", () => {
  const head = fs.readFileSync(FILE, "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n");
  for (const must of ["AMENDMENT v2", "V2 PASS RULE", "V2 PREDICTIONS", "V2 GATING CONTROLS", "STRICTLY CAUSALLY", "underpowered_hits", "control_degenerate", "english_priors_applied", "random_nominal_pair", "ear_off_tier_on", "pass_is_noun_finding", "surface_tier_heard_other_language", "HITS_NEEDED"]) assert.ok(head.includes(must), `amendment lacks ${must}`);
  const d = headerDigests();
  assert.equal(d.original, "9ef34eb1c69fa1bceea340f4bc363e05dfec56af1373c0c887400262c01b75cf", "the v1 pre-registration was edited after the fact");
  assert.equal(d.amendmentV2, "04924a51e9ef7cc0e12ac655984fdc4c686e48acbdd588415174a2030c3e7967", "the v2 amendment was edited after its first run");
  assert.equal(d.full, headerDigest(FILE));
  assert.match(d.postRunAddendum, /^[0-9a-f]{64}$/, "the post-run addendum is stamped separately from the pre-registered amendment");
  assert.equal(d.postRunAddendum, "44cedd3d4cb39895d86280d382280961f5e09c11043a2a0b4d804a7bf6c93fe6", "the post-run addendum was edited after its run");
  const head2 = fs.readFileSync(FILE, "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n");
  for (const must of ["POST-RUN ADDENDUM", "V5 FALSIFIED", "english_priors_inert_for_edges", "englishPriorsLicence"]) assert.ok(head2.includes(must), `post-run addendum lacks ${must}`);
  assert.equal(GATE_BLOCK, 1); assert.ok(NULL_DRAWS >= 19, "alpha 0.05 needs at least 19 null draws");
  assert.deepEqual([...GATING_CONTROLS_V2], ["shuffled_gold", "crossed_edges", "random_adjacent", "random_pair", "random_nominal_pair", "ear_off_tier_on"]);
  assert.deepEqual([...INFORMATIONAL_CONTROLS_V2], ["tier_off_ear_on", "noear"]);
});

test("v2 hit floor: derived from the null draws (permutation), Infinity when too few draws to reach alpha, p from the null", () => {
  const z = new Float64Array(199);
  assert.deepEqual(criticalHits(z), { c: 1, kmax: 9, R: 199, alpha: 0.05 }, "a null that never hits: one hit is already beyond it");
  const ten = new Float64Array(199); for (let i = 0; i < 10; i++) ten[i] = 3;
  assert.equal(criticalHits(ten).c, 4, "ten draws at 3: p(3) = 11/200 > 0.05, p(4) = 1/200");
  const nine = new Float64Array(199); for (let i = 0; i < 9; i++) nine[i] = 3;
  assert.equal(criticalHits(nine).c, 1, "nine draws at 3: p(1) = (1+9)/200 = 0.05 already reaches alpha");
  const mix = new Float64Array(199); for (let i = 0; i < 10; i++) mix[i] = 1; for (let i = 10; i < 19; i++) mix[i] = 3;
  assert.equal(criticalHits(mix).c, 2, "19 draws >= 1 (p 0.10), 9 draws >= 2 (p 0.05)");
  assert.equal(criticalHits(new Float64Array(12)).c, Infinity, "13 permutations cannot reach 0.05");
  assert.equal(permutationP(4, ten), 1 / 200); assert.equal(permutationP(3, ten), 11 / 200);
  assert.equal(shuffledNullHits({ gold: gold.slice(0, 1), edges: perfect.slice(0, 1) }), null, "a derangement of one sentence does not exist");
  const nh = shuffledNullHits({ gold, edges: perfect, draws: 30 });
  assert.equal(nh.length, 30); assert.ok([...nh].every((x) => x === 0), "toy sentences share no content word: a deranged pairing never hits");
  const same = parseConllu(Array.from({ length: 6 }, (_, i) => conll(TOY[0], `s${i}`)).join("\n")).map(goldOfSentence);
  const sameEdges = same.map((g) => g.pairs.map(() => ({ end1: "cat", label: "chased", end2: "mouse" })));
  assert.ok([...shuffledNullHits({ gold: same, edges: sameEdges, draws: 10 })].every((x) => x === 6), "identical gold everywhere: the deranged pairing hits as often as the real one");
});

test("v2: the reviewer's MUTANT (random oracle nominal pairs, no claims) is a v1 PASS and a v2 NON-pass, typed pass_is_noun_finding", () => {
  const mut = mutantEdges(rG, 2, 5);
  const ev = evaluateClaims({ edges: mut, earOff: none(R_N), tierOff: none(R_N), noear: none(R_N), gold: rG, toks: rT, ...V2 });
  assert.equal(ev.passLenient, true, "the demonstration of the finding: the v1 rule cannot fail a noun-finder");
  assert.ok(ev.summary.precision > 0.99 && ev.summary.strictPrecision < 0.4, `lenient P ${ev.summary.precision} strict P ${ev.summary.strictPrecision}`);
  assert.notEqual(ev.pass, true, JSON.stringify(ev.notes));
  assert.equal(ev.claimShown, false);
  assert.ok(ev.gaps.some((g) => g.reason === "pass_is_noun_finding"));
  assert.equal(ev.controls.random_nominal_pair.beats, false, "chance for a noun-finder IS the nominal-pair arm");
  assert.ok(ev.gaps.some((g) => g.reason === "control_degenerate:ear_off_tier_on"), "the zero-edge deafened arm is a typed degenerate control, not a beaten one");
});

test("v2: a perfect arm on five-nominal sentences PASSES; hits, null and licence are integers in the card", () => {
  const ev = evaluateClaims({ edges: rPerfect, earOff: none(R_N), tierOff: none(R_N), noear: none(R_N), gold: rG, toks: rT, ...V2 });
  assert.equal(ev.pass, true, JSON.stringify([ev.verdict, ev.notes, ev.gaps]));
  assert.equal(ev.verdict, "pass"); assert.equal(ev.claimShown, true);
  assert.equal(ev.hits.real, R_N); assert.equal(ev.hits.needed, 2); assert.equal(ev.hits.nullMean, 0);
  assert.equal(ev.licence.ok, true); assert.equal(ev.licence.realHits, R_N); assert.equal(ev.licence.shuffledHits, 0);
  assert.ok(!ev.gating.includes("ear_off_tier_on"), "a zero-edge control is excluded from the gate");
  for (const c of ["shuffled_gold", "crossed_edges", "random_adjacent", "random_pair", "random_nominal_pair"]) assert.equal(ev.controls[c].beats, true, `${c} must be beaten`);
  assert.equal(ev.controls.noear.gating, false); assert.equal(ev.controls.noear.degenerate, true);
  assert.ok(ev.score === 1 && ev.control < 0.5 && ev.margin > 0.5);
  const card = claimsCard(ev);
  assert.doesNotThrow(() => JSON.stringify(card));
  assert.equal(card.hitsNull.real, R_N); assert.equal(card.pass, true);
});

test("v2: fewer hits than the null needs -> pass null + underpowered_hits (never a pass, never a verdict by noise)", () => {
  const one = rPerfect.map((es, i) => (i === 0 ? es : []));
  const a = evaluateClaims({ edges: one, earOff: none(R_N), gold: rG, toks: rT, ...V2 });
  assert.equal(a.pass, null); assert.equal(a.verdict, "underpowered_hits"); assert.equal(a.claimShown, false);
  const g = a.gaps.find((x) => x.reason === "underpowered_hits");
  assert.ok(g && g.count === 1 && g.of === 2, JSON.stringify(g));
  // edges, but zero gold hits: the oblique-oblique pair of every sentence
  const wrong = rS.map((s) => [{ end1: form(s, 7), label: "", end2: form(s, 9) }]);
  const b = evaluateClaims({ edges: wrong, earOff: none(R_N), gold: rG, toks: rT, ...V2 });
  assert.equal(b.summary.hits, 0); assert.equal(b.pass, null); assert.ok(b.gaps.some((x) => x.reason === "underpowered_hits" && x.count === 0));
  // no edge at all: an arm that says nothing FAILS
  const c = evaluateClaims({ edges: none(R_N), earOff: none(R_N), gold: rG, toks: rT, ...V2 });
  assert.equal(c.pass, false); assert.equal(c.verdict, "fail:no_edges");
  // power on the denominator: 12 gold pairs < 30
  const d = evaluateClaims({ edges: perfect, earOff: none(N), gold, toks, B: 100, draws: 4, nullDraws: 99 });
  assert.equal(d.pass, null); assert.ok(d.gaps.some((x) => x.reason === "underpowered"));
});

test("v2: when the deranged pairing hits as often as the real arm (identical gold everywhere) the claim is NOT shown", () => {
  const same = parseConllu(Array.from({ length: 40 }, (_, i) => conll(TOY[0], `s${i}`)).join("\n"));
  const g = same.map(goldOfSentence);
  const edges = g.map((x) => x.pairs.map(() => ({ end1: "cat", label: "chased", end2: "mouse" })));
  const ev = evaluateClaims({ edges, earOff: none(40), gold: g, toks: same.map((s) => s.tokens.map((t) => t.form.toLowerCase())), ...V2 });
  assert.equal(ev.hits.real, 40); assert.equal(ev.hits.nullMean, 40);
  assert.equal(ev.pass, null); assert.equal(ev.verdict, "underpowered_hits");
});

test("v2 controls: zero-edge = degenerate (typed, excluded); identical = unlicensed (typed, excluded, ear_inert); as-good-as-real = pass FALSE", () => {
  const inert = evaluateClaims({ edges: rPerfect, earOff: rPerfect, earInert: true, gold: rG, toks: rT, ...V2 });
  assert.equal(inert.controls.ear_off_tier_on.licensed, false);
  assert.ok(inert.gaps.some((g) => g.reason === "control_unlicensed:ear_off_tier_on") && inert.gaps.some((g) => g.reason === "ear_inert"));
  assert.ok(!inert.gating.includes("ear_off_tier_on")); assert.equal(inert.pass, true, "the remaining licensed controls still hold the claim");
  // an ear-off arm with the same hits plus a duplicate edge per sentence: licensed (counts differ), same strict F1
  const dup = rPerfect.map((es) => [...es, es[0]]);
  const matching = evaluateClaims({ edges: rPerfect, earOff: dup, gold: rG, toks: rT, ...V2 });
  assert.equal(matching.controls.ear_off_tier_on.licensed, true); assert.equal(matching.controls.ear_off_tier_on.beats, false);
  assert.equal(matching.pass, false, "a control that does as well as the real arm means the instrument or the mechanism is broken (II.23)");
  assert.ok(matching.notes.some((n) => /does not beat ear_off_tier_on/.test(n)));
  assert.equal(matching.verdict, "fail:ear_off_tier_on");
  // an absent ear-off arm is typed, not silently dropped
  const absent = evaluateClaims({ edges: rPerfect, gold: rG, toks: rT, ...V2 });
  assert.ok(absent.gaps.some((g) => g.reason === "control_unmeasured:ear_off_tier_on"));
  const skip = evaluateClaims({ edges: rPerfect, skipEarOff: true, gold: rG, toks: rT, ...V2 });
  assert.ok(!skip.gaps.some((g) => g.reason === "control_unmeasured:ear_off_tier_on"));
});

test("v2: where the only nominal pair IS the claim, a noun-finder is indistinguishable: pass FALSE (nominal-pair control identical); a gating tier that heard another language voids the pass", () => {
  const two = [0, 1, 4, 5, 6, 7, 8, 9];                                      // sentences with exactly two nominal heads and one gold pair
  const sub = two.map((i) => sents[i]), sg = two.map((i) => gold[i]), st = two.map((i) => toks[i]);
  const edges = two.map((i) => perfect[i]);
  const ev = evaluateClaims({ edges, earOff: none(two.length), gold: sg, toks: st, minGold: 5, ...V2 });
  assert.equal(sub.length, 8); assert.equal(ev.hits.real, 8);
  assert.equal(ev.controls.random_nominal_pair.licensed, false);
  assert.equal(ev.pass, false); assert.equal(ev.verdict, "fail:random_nominal_pair_identical");
  const other = evaluateClaims({ edges: rPerfect, earOff: none(R_N), gold: rG, toks: rT, tierHeardOther: 3, ...V2 });
  assert.equal(other.pass, null); assert.ok(other.gaps.some((g) => g.reason === "surface_tier_heard_other_language" && g.count === 3));
  const noNom = evaluateClaims({ edges: rPerfect, earOff: none(R_N), gold: rG.map((g) => ({ ...g, nominals: [] })), toks: rT, ...V2 });
  assert.equal(noNom.pass, null); assert.ok(noNom.gaps.some((g) => g.reason === "control_unmeasured:random_nominal_pair"));
});

test("v2: evaluateSystem (the v1 rule) is unchanged and still hands over the nominal-pair columns; strictCols / movesOn behave", () => {
  const ev = evaluateSystem2();
  assert.ok(ev.nominalPairCols && ev.nominalPairCols.g.length === N);
  const a = toCols(perfect.map((es, i) => scoreSentence(gold[i], es)));
  const sc = strictCols(a);
  assert.deepEqual([...sc.m], [...a.ms]); assert.deepEqual([...sc.h], [...a.h]);
  assert.equal(movesOn(a, a), false);
  const z = toCols(sents.map((_, i) => scoreSentence(gold[i], [])));
  assert.equal(movesOn(a, z), true);
});
function evaluateSystem2() { return evaluateSystem({ edges: perfect, noear: sents.map(() => []), gold, toks, ...TOY_POWER }); }

test("v2 causal read: block 1 gives sentence k ONLY sentences 0..k and credits only sentence k's edges; a later read's edge for an earlier sentence is not credited", () => {
  const seen = [];
  const S = {
    plainSurfaces: () => [], chunkSource: (_n, text) => text,
    makeEngineRelationReader: () => (text) => {
      const parts = text.split("\n\n"); seen.push(parts.length);
      let off = 0; const offs = parts.map((t) => { const o = off; off += t.length + 2; return o; });
      const edge = (i, tag) => ({ end1: `${tag}${parts.length}`, label: "x", end2: "y", spans: [{ ref: "material#0-0", start: offs[i] }] });
      return { edges: [edge(parts.length - 1, "last"), edge(0, "stale")] };
    },
  };
  const texts = ["aaa", "bbb", "ccc", "ddd", "eee"];
  const r = causalReads(S, texts, { arm: "D", stem: "x", block: 1 });
  assert.deepEqual(seen, [1, 2, 3, 4, 5]);
  assert.deepEqual(r.per.map((es) => es.map((e) => e.end1)), [["last1", "stale1"], ["last2"], ["last3"], ["last4"], ["last5"]]);
  seen.length = 0;
  const r2 = causalReads(S, texts, { arm: "D", stem: "x", block: 2 });
  assert.deepEqual(seen, [2, 4, 5], "block 2: within-block lookahead of one sentence, named");
  assert.deepEqual(r2.per.map((es) => es.map((e) => e.end1)), [["stale2"], ["last2"], [], ["last4"], ["last5"]]);
});

test("v2 tier: the DECLARED language is handed to every call, a call that hears another is counted, ear:false gives the tier no segmenter and no peel", () => {
  const calls = [];
  const mk = (lang) => ({
    plainSurfaces: () => [], diaNorm: (x) => x,
    languageContextFor: (_t, o) => { calls.push(o); return { language: lang, grammar: { posPrior: { forms: {} }, framePrior: {} }, ear: { segment: (t) => `S:${t}`, peel: (t) => `P:${t}` }, casedScript: false }; },
    createNominalIndex: (o) => { calls.push({ idx: { seg: Boolean(o.segment), peel: Boolean(o.peel), commonNouns: o.commonNouns } }); return { add() {}, beings: () => [] }; },
  });
  const probe = { calls: 0, other: 0, language: "eng" };
  makeTier(mk("eng"), "eng", { ear: true, probe })(["a b"]);
  assert.deepEqual(calls[0], { language: "eng" }); assert.deepEqual(calls[1], { idx: { seg: true, peel: true, commonNouns: true } });
  assert.deepEqual([probe.calls, probe.other], [1, 0]);
  makeTier(mk("fra"), "eng", { ear: false, probe })(["a b"]);
  assert.deepEqual(calls[2], { language: "eng" }, "the declared language, whatever the text looks like");
  assert.deepEqual(calls[3], { idx: { seg: false, peel: false, commonNouns: true } });
  assert.deepEqual([probe.calls, probe.other], [2, 1], "the context heard French while English was declared: counted");
  const bare = { ...mk("eng"), languageContextFor: () => ({ language: "eng", grammar: { posPrior: { forms: {} } }, ear: null, casedScript: true }) };
  assert.deepEqual(makeTier(bare, "eng")(["a"]), [], "a language with no frame prior gets the capital tier only");
});

test("v2 own priors: the stem's POS prior, verb forms derived at the reader's own floor, the English closed classes EMPTIED", () => {
  const S = { GRAMMAR_MIN_SHARE: 0.5 };
  const grammar = { posPrior: { forms: { runs: { VERB: 3 }, Is: { AUX: 4 }, cat: { NOUN: 5 }, mixed: { VERB: 1, NOUN: 3 } } } };
  const o = ownPriorOverrides(S, grammar);
  assert.equal(o.posPriorFor(), grammar.posPrior);
  assert.deepEqual([...o.verbForms].sort(), ["is", "runs"]); assert.equal(o.oovLexicon, o.verbForms);
  assert.equal(o.createLemmatizer, null); assert.equal(o.morphologyIndex, null); assert.equal(o.resolvePronouns, null);
  for (const k of ["determiners", "definiteDeterminers", "negationWords", "firstPerson"]) assert.equal(o[k].size, 0);
  assert.equal(ownPriorOverrides(S, { posPrior: { forms: { cat: { NOUN: 5 } } } }).verbForms, null);
});

test("v2 english-priors perturbation: every English-only seam of the reader is removed, none replaced", () => {
  const n = noEnglishSeams();
  assert.equal(n.posPriorFor(), null); assert.equal(n.verbForms, null); assert.equal(n.oovLexicon, null); assert.equal(n.createLemmatizer, null);
  assert.equal(n.resolvePronouns, null); assert.equal(n.attestedVerbs, false);
  for (const k of ["determiners", "definiteDeterminers", "negationWords", "firstPerson"]) assert.equal(n[k].size, 0);
});

test("v2 tier on the real reader: with the language declared the tier equals extractSurfacesHeard on English, and the ear changes what it hears in Chinese", async () => {
  const S = await loadSystem();
  const en = ["the king of france met the queen of spain .", "the king of france left the hall .", "the queen of spain stayed in the hall ."].map((text) => ({ text }));
  assert.equal(S.languageContextFor(en.map((s) => s.text).join("\n"), {}).language, "eng", "premise: auto-detection agrees here, so the two tiers must coincide");
  assert.deepEqual(makeTier(S, "eng")(en), S.extractSurfacesHeard(en));
  const zh = ["小明喜欢苹果。", "小明吃了苹果。", "小明买了苹果。", "小明和小红喜欢苹果。"].map((text) => ({ text }));
  const probe = { calls: 0, other: 0, language: "cmn-hans" };
  const on = makeTier(S, "cmn-hans", { ear: true, probe })(zh).map((x) => x.surface).sort();
  const off = makeTier(S, "cmn-hans", { ear: false })(zh).map((x) => x.surface).sort();
  assert.equal(probe.other, 0);
  assert.notDeepEqual(on, off, "the ear is the only difference between these two tiers: it must change what is heard in an unspaced script");
  assert.ok(on.length > off.length, `ear on ${JSON.stringify(on)} vs off ${JSON.stringify(off)}`);
});

test("v2 measure(): the card for a real stem has the v2 shape: strictly causal gating arm, typed gaps, ablation table, English-priors typing; a sample too small to power is pass null, never a pass", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "r4v2-"));
  try {
    for (const stem of ["eng", "spa"]) { fs.mkdirSync(path.join(tmp, stem)); fs.writeFileSync(path.join(tmp, stem, "dev.conllu"), TOY.map((r, i) => conll(r, `t${i}`)).join("\n")); }
    const en = await measure({ stem: "eng", split: "dev", evalDir: tmp, autodetect: 0, B: 100 });
    assert.equal(en.rung, "r4"); assert.equal(en.n, 11); assert.equal(en.details.rule, "v2");
    assert.equal(en.pass, null, "12 gold pairs < MIN_GOLD_PAIRS: underpowered, not a pass");
    assert.ok(en.gaps.some((g) => g.reason === "underpowered"));
    assert.equal(en.details.causal.strictlyCausal, true); assert.equal(en.details.causal.block, 1); assert.equal(en.details.causal.withinBlockLookahead, 0);
    assert.equal(en.details.causal.tierCallsHearingOtherLanguage, 0, "the gating tier hears the declared language in every call");
    assert.ok(en.details.causal.tierCalls > 0);
    // CHANGED 2026-10-06 (beings ladder, change A): the English ear is no longer inert — it peels what UD splits (don't -> do n't, 's) from a
    // ContractionPrior@1. The registered V3 ("eng and spa: ear_inert") described the ear as it was; the typed gap is now absent for a stem whose
    // ear has a peel, and the ear arm differs from the ear-off arm only on text that HAS a contraction (the toy text has none).
    assert.ok(!en.gaps.some((g) => g.reason === "ear_inert"), "the English ear now has a peel: not inert");
    assert.equal(en.details.ablation.ear_off_tier_on.identicalToEarOn, false, "the ear-off arm is now COMPUTED, not equal by construction (an inert ear is mapped to no ear)");
    const { identicalToEarOn: _drop, ...earOff } = en.details.ablation.ear_off_tier_on;
    assert.deepEqual(earOff, en.details.ablation.ear_on_tier_on, "on text without a contraction the computed ear-off arm equals the ear-on arm");
    assert.ok(en.details.lookahead && /LOOKAHEAD/.test(en.details.lookahead.note), "the lookahead read is labelled and never the verdict");
    assert.deepEqual(en.details.ownPriors, { skipped: "the stem is English: the production priors ARE the stem's" });
    assert.ok(!en.gaps.some((g) => g.reason === "english_priors_applied"));
    assert.equal(en.details.autodetect, undefined);
    assert.equal(en.details.headerDigests.original, "9ef34eb1c69fa1bceea340f4bc363e05dfec56af1373c0c887400262c01b75cf");
    assert.equal(en.details.claimShown, false);
    assert.ok(en.score != null && en.control != null && Math.abs(en.margin - (en.score - en.control)) < 1e-9, "margin = score - control, as the aggregator audits");
    for (const k of ["shuffled_gold", "random_adjacent", "random_pair", "random_nominal_pair", "ear_off_tier_on", "tier_off_ear_on", "noear"]) assert.ok(k in en.controls, `controls lacks ${k}`);   // crossed_edges needs edges in >= 2 sentences: a typed hole when the reader says that little
    assert.doesNotThrow(() => JSON.stringify(en));
    const es = await measure({ stem: "spa", split: "dev", evalDir: tmp, autodetect: 0, B: 100 });
    assert.ok(es.gaps.some((g) => g.reason === "english_priors_applied"), "a non-English stem carries the typed English-priors gap");
    assert.equal(typeof es.details.ownPriors.sentencesDifferingFromEnglishPriors, "number");
    const lic = es.details.englishPriorsLicence;
    assert.ok(lic && lic.sentences === 11 && typeof lic.sentencesChanged === "number" && typeof lic.moved === "boolean", JSON.stringify(lic));
    assert.equal(es.gaps.some((g) => g.reason === "english_priors_inert_for_edges"), !lic.moved, "the inert typing appears exactly when the perturbation moved no sentence");
    assert.equal(en.details.englishPriorsLicence, undefined);
    assert.equal(es.pass, null);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
