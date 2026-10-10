// R3 (find beings, case-stripped) — the INSTRUMENT is regression-guarded here, not the reader.
// A perfect system must score 1, a deranged control must score low, a control that does as well as the
// real arm must NOT pass (II.23), a thin or short split must say `underpowered`, never pass. The toy
// fixture needs no treebank; the two data-gated cases run only when the held-out DEV files exist.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  RUNG, CONTROLS_IN_RULE, UNSEEN_CONTROLS, NONCAUSAL_ARMS, ARM_PROVENANCE, norm, boundStem, goldForm, goldSets, sentenceText, planBlocks, minBlocksForDissent, prf, aggregate,
  pairedTest, scoreBlocks, measure, measureSentences, controlRates, isReachable, capitalWitness, isCommonForm, scramblePrior, ratePermutation, readBlock,
} from "../eval/competence/r3-beings.mjs";
import { mulberry32 } from "../eval/competence/lib.mjs";
import { parseConllu, conlluPath } from "../eval/competence/lib.mjs";

const tok = (id, form, upos, extra = {}) => ({ id, form, lemma: form.toLowerCase(), upos, xpos: "_", spaceAfter: true, ...extra });
const sent = (pairs) => ({ id: "t", text: pairs.map(([f]) => f).join(" "), tokens: pairs.map(([f, u], i) => tok(i + 1, f, u)), ranges: [] });

test("the rung announces itself", () => {
  assert.equal(RUNG.id, "r3");
  assert.ok(RUNG.name && RUNG.question);
  // AMENDMENT A2: `deranged` (the gate switched off by construction) left the rule, `nominated` took its place, four controls were added
  assert.deepEqual([...CONTROLS_IN_RULE], ["rawTop", "rawTopK", "nominated", "lexicon_filter", "shuffled", "rate_permuted", "prior_scrambled", "randomK"]);
  assert.ok(!CONTROLS_IN_RULE.includes("deranged"));
  assert.deepEqual([...UNSEEN_CONTROLS], ["rawTop", "rawTopK", "prior_scrambled", "randomK"]);
  assert.deepEqual([...NONCAUSAL_ARMS], ["capital", "union"]);
  assert.equal(ARM_PROVENANCE.capital.causal, false);
  assert.match(ARM_PROVENANCE.capital.lists, /English/);
  assert.equal(ARM_PROVENANCE.union.causal, false);
});

test("gold: recurring PROPN and PROPN|NOUN forms, case-folded, singletons and numerals out", () => {
  const sents = [
    sent([["Maria", "PROPN"], ["saw", "VERB"], ["JOHN", "PROPN"], ["1990", "NOUN"]]),
    sent([["maria", "PROPN"], ["met", "VERB"], ["John", "PROPN"], ["the", "DET"], ["dog", "NOUN"]]),
    sent([["John", "PROPN"], ["fed", "VERB"], ["the", "DET"], ["dog", "NOUN"], ["Zed", "PROPN"], ["1990", "NOUN"]]),
  ];
  const g = goldSets(sents);
  assert.deepEqual([...g.propn].sort(), ["john", "maria"]);
  assert.deepEqual([...g.nominal].sort(), ["dog", "john", "maria"]);       // zed once: out; 1990 has no letter: out
  assert.equal(g.stats.nonLetter, 2);
  assert.equal(norm("ÉCOLE"), "école");
});

test("gold: the treebank's own bound-morpheme annotation gives the nominal stem (Korean), nothing else does", () => {
  const k = (form, lemma, xpos) => ({ form, lemma, xpos });
  assert.equal(boundStem(k("스타벅스가", "스타벅스+가", "NNG+JKS")), "스타벅스");
  assert.equal(boundStem(k("경기관광공사와", "경기+관광공사+와", "NNG+NNG+JC")), "경기관광공사");
  assert.equal(boundStem(k("서울", "서울", "NNP")), null);                  // no split annotated
  assert.equal(boundStem(k("x", "a+b", "NNG+JKS")), null);                  // stem is not a prefix of the form
  assert.equal(goldForm(k("서울에서는", "서울+에서+는", "NNP+JKB+JX")), "서울");
  assert.equal(goldForm({ form: "Paris", lemma: "Paris", xpos: "NNP" }), "paris");
});

test("sentence text is the `# text` line, else rebuilt from the tokens (counted, not hidden)", () => {
  const conllu = "# sent_id = a\n# text = Hello world.\n1\tHello\thello\tINTJ\t_\t_\t0\troot\t_\t_\n2\tworld\tworld\tNOUN\t_\t_\t1\tvocative\t_\tSpaceAfter=No\n3\t.\t.\tPUNCT\t_\t_\t1\tpunct\t_\t_\n\n"
    + "# sent_id = b\n1-2\tdel\t_\t_\t_\t_\t_\t_\t_\t_\n1\tde\tde\tADP\t_\t_\t0\troot\t_\t_\n2\tel\tel\tDET\t_\t_\t1\tdet\t_\t_\n3\tmar\tmar\tNOUN\t_\t_\t1\tnmod\t_\tSpaceAfter=No\n\n";
  const [a, b] = parseConllu(conllu);
  assert.deepEqual(sentenceText(a), { text: "Hello world.", rebuilt: false });
  assert.deepEqual(sentenceText(b), { text: "del mar", rebuilt: true });
});

test("blocks: ~300 as specified when the split is big, smaller (floor 60) so a sign test can still reach 5%", () => {
  assert.equal(minBlocksForDissent(0.05), 8);                               // 7/8 wins: p = 9/256 <= .05; 6/7: 8/128 > .05
  assert.deepEqual(planBlocks(2001), { size: 250, count: 8, want: 8, used: 2000, unused: 1, underpowered: false });
  assert.deepEqual(planBlocks(5000), { size: 300, count: 16, want: 8, used: 4800, unused: 200, underpowered: false });
  assert.equal(planBlocks(500).size, 62);
  assert.equal(planBlocks(500).count, 8);
  assert.equal(planBlocks(250).count, 4);
  assert.equal(planBlocks(250).underpowered, true);                         // 4 blocks cannot reach 5% by a sign test
  assert.equal(planBlocks(40).count, 0);
});

test("metrics: a perfect prediction scores 1, a disjoint one 0, an empty one 0 (never 'undefined = good')", () => {
  const G = new Set(["a", "b", "c"]);
  assert.equal(prf(new Set(G), G).f1, 1);
  assert.equal(prf(new Set(["x", "y"]), G).f1, 0);
  const empty = prf(new Set(), G);
  assert.equal(empty.f1, 0);
  assert.equal(empty.p, null);
  assert.equal(prf(new Set(["a", "b", "x", "y"]), G).f1, (2 * 2) / (4 + 3));
  assert.equal(aggregate([prf(new Set(G), G), prf(new Set(), G)]).macroF1, 0.5);
  assert.equal(aggregate([prf(new Set(["a"]), new Set())]).blocks, 0);      // empty-gold blocks are excluded, not scored
});

test("the paired sign test: unanimity at 8 reaches 5%, 5-of-6 does not, 4 blocks cannot", () => {
  const eight = pairedTest([1, 1, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(eight.wins, 8);
  assert.ok(Math.abs(eight.p - 1 / 256) < 1e-12);
  assert.equal(eight.significant, true);
  assert.equal(pairedTest([1, 1, 1, 1, 1, 0], [0, 0, 0, 0, 0, 1]).significant, false);
  const four = pairedTest([1, 1, 1, 1], [0, 0, 0, 0]);
  assert.equal(four.canReach, false);
  assert.equal(four.significant, false);
  assert.equal(pairedTest([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]).p, 1);         // all ties: nothing to say
});

// ── the instrument core on synthetic blocks: a perfect system, a deranged one, an inert control ──
// `dog` and `cat` are the forms the (toy) TRAIN prior knows; every name n<b><x> is UNSEEN. (AMENDMENT A1)
const SEEN_TOY = new Set(["dog", "cat", "the"]);
const isSeen = (f) => SEEN_TOY.has(f);
const score = (blocks, opts = {}) => scoreBlocks(blocks, { isSeen, ...opts });
const junk = (b, n) => new Set(Array.from({ length: n }, (_, i) => `junk${b}_${i}`));
const makeBlocks = (B, systems) => Array.from({ length: B }, (_, b) => {
  const gold = { propn: new Set([`n${b}a`, `n${b}b`, `n${b}c`]), nominal: new Set([`n${b}a`, `n${b}b`, `n${b}c`, "dog", "cat"]) };
  const own = gold.propn, other = new Set([`n${(b + 3) % B}a`, `n${(b + 3) % B}b`, `n${(b + 3) % B}c`]);
  return { gold, arms: systems({ b, own, other, gold }) };
});
const honestArms = ({ b, own, other }) => ({
  keyed: new Set(own), keyedAll: new Set([...own, "dog"]), nominated: new Set([...own, "dog", "cat"]), rawTop: new Set([...own, ...junk(b, 40)]), rawTopK: junk(b, 3),
  deranged: new Set([...own, "dog", "cat"]), shuffled: junk(b, 6), lexicon_filter: new Set([...own, `extra${b}`]), rate_permuted: junk(b, 5), prior_scrambled: junk(b, 4), randomK: junk(b, 3),
  capital: new Set(), union: new Set(own),
});

test("a perfect system scores 1 and passes; every control scores below it; the misaligned-gold control scores 0", () => {
  const S = score(makeBlocks(8, honestArms));
  assert.equal(S.table.keyed.propn.macroF1, 1);
  assert.equal(S.table.keyed.propn.microR, 1);
  for (const c of ["rawTop", "rawTopK", "shuffled", "rate_permuted", "prior_scrambled", "randomK"]) assert.ok(S.table[c].propn.macroF1 < 0.2, `${c} ${S.table[c].propn.macroF1}`);
  for (const c of ["nominated", "lexicon_filter"]) assert.ok(S.table[c].propn.macroF1 < 1 && S.table[c].propn.macroF1 > 0.5, `${c} (gate-off style controls know the names) ${S.table[c].propn.macroF1}`);
  assert.equal(S.misaligned.propn.macroF1, 0);                              // the statistic MOVES when the gold is perturbed (licence)
  assert.equal(S.licence.significant, true);
  assert.equal(S.unseen.eligible, 8);                                       // every name is UNSEEN: the unseen stratum is fully powered
  for (const c of UNSEEN_CONTROLS) assert.equal(S.unseen.tests[c].significant, true, `U:${c}`);
  assert.equal(S.pass, true, S.passReason);
  assert.equal(S.best.propn[0], "keyed");
  assert.match(S.passReason, /K L C Z U/);
});

test("a deranged system (names of the wrong block) scores ~0 and fails", () => {
  const S = score(makeBlocks(8, (x) => ({ ...honestArms(x), keyed: new Set(x.other) })));
  assert.equal(S.table.keyed.propn.macroF1, 0);
  assert.equal(S.pass, false);
});

test("a control that does as well as the real arm cannot be beaten: pass is false (II.23), best arm is reported honestly", () => {
  for (const c of CONTROLS_IN_RULE) {                                          // an inert control of EVERY kind in the rule: same answer as keyed
    const S = score(makeBlocks(8, (x) => ({ ...honestArms(x), [c]: new Set(x.own) })));
    assert.equal(S.tests[c].significant, false, c);
    assert.equal(S.pass, false, c);
    assert.match(S.passReason, new RegExp(`K:${c}`));
  }
  const S2 = score(makeBlocks(8, (x) => ({ ...honestArms(x), capital: new Set([...x.own]), keyed: new Set([...x.own].slice(0, 2)) })));
  assert.equal(S2.best.propn[0], "capital");                                // the best arm is not always the keyed one, and says so
  assert.notEqual(S2.best.causalPropn[0], "capital");                       // ... but the non-causal witness is never "the best causal arm" (A4)
  assert.ok(!S2.best.rankCausalPropn.some(([n]) => NONCAUSAL_ARMS.includes(n)));
});

test("LICENCE: if scoring against the WRONG block's gold does as well, the instrument is unlicensed and cannot pass (II.23)", () => {
  // every block has the same names: the misaligned gold IS the right gold, so the statistic cannot move under the perturbation
  const same = Array.from({ length: 8 }, (_, b) => ({
    gold: { propn: new Set(["x", "y", "z"]), nominal: new Set(["x", "y", "z", "dog"]) },
    arms: { keyed: new Set(["x", "y", "z"]), keyedAll: new Set(["x", "y", "z"]), nominated: new Set(["x", "y", "z", "dog"]), rawTop: junk(b, 40), rawTopK: junk(b, 3), deranged: junk(b, 5), shuffled: junk(b, 5), lexicon_filter: new Set(["x", "y", "z", "dog"]), rate_permuted: junk(b, 5), prior_scrambled: junk(b, 5), randomK: junk(b, 3), capital: new Set(), union: new Set() },
  }));
  const S = score(same);
  assert.equal(S.table.keyed.propn.macroF1, 1);
  for (const c of CONTROLS_IN_RULE) assert.equal(S.tests[c].significant, true, c);   // every rule control is beaten ...
  assert.equal(S.licence.significant, false);                                         // ... but the perturbation did not move the statistic
  assert.equal(S.pass, false);
  assert.match(S.passReason, /L:licence/);
});

test("too few blocks (or too few with gold) is `underpowered` (pass null), never a pass", () => {
  assert.equal(score(makeBlocks(4, honestArms)).pass, null);
  const sparse = makeBlocks(8, honestArms).map((b, i) => (i < 5 ? { ...b, gold: { propn: new Set(), nominal: b.gold.nominal } } : b));
  const S = score(sparse);
  assert.equal(S.eligible, 3);
  assert.equal(S.pass, null);
  assert.match(S.passReason, /underpowered/);
  assert.equal(score([]).pass, null);
});

test("the causal clause and the caseless clause bind", () => {
  assert.equal(score(makeBlocks(8, honestArms), { causalOk: false }).pass, false);
  // caseless script: a keyed arm that finds nothing has recall 0 where the capital arm is empty -> fail
  const none = score(makeBlocks(8, (x) => ({ ...honestArms(x), keyed: new Set() })), { caseless: true });
  assert.equal(none.recallMicro, 0);
  assert.equal(none.pass, false);
  assert.equal(score(makeBlocks(8, honestArms), { caseless: true }).pass, true);
});

test("reachability: what the reader's own tokenisation could ever emit", () => {
  assert.equal(isReachable("maria"), true);
  assert.equal(isReachable("u.s."), false);       // non-word characters split it
  assert.equal(isReachable("us"), false);         // below the Latin 3-letter floor
  assert.equal(isReachable("北京"), true);         // dense script: two glyphs are a word
  assert.equal(isReachable("1990"), false);
});

// ── AMENDMENT A1: seen/unseen strata and the unseen clause U ──
test("STRATA: a keyed arm that only ties counting on the UNSEEN words fails U even when it wins everything else (A1)", () => {
  // the seen words (dog, cat, the) carry the whole advantage; on the names the prior has never met keyed == rawTop-minus-junk
  const gold = (b) => ({ propn: new Set([`n${b}a`, `n${b}b`, `dog`, `cat`]), nominal: new Set([`n${b}a`, `n${b}b`, `dog`, `cat`]) });
  const blocks = Array.from({ length: 8 }, (_, b) => {
    const unseenNames = new Set([`n${b}a`, `n${b}b`]);
    const arms = {
      keyed: new Set([...unseenNames, "dog", "cat"]), keyedAll: new Set([...unseenNames, "dog", "cat"]), nominated: new Set([...unseenNames, "dog", "cat", "the"]),
      rawTop: new Set([...unseenNames, "the", ...junk(b, 0)]),                  // counting gets the unseen names exactly right, and the seen ones wrong
      rawTopK: new Set([...unseenNames]), deranged: new Set([...unseenNames, "dog", "cat", "the"]), shuffled: new Set(["the"]), lexicon_filter: new Set(["the"]),
      rate_permuted: new Set(["the"]), prior_scrambled: new Set(["the"]), randomK: new Set(["the"]), capital: new Set(), union: new Set(),
    };
    return { gold: gold(b), arms };
  });
  const S = score(blocks);
  for (const c of CONTROLS_IN_RULE) assert.equal(S.tests[c].significant, true, `K:${c} holds on the whole gold`);
  assert.equal(S.table.keyed.strata.propn.unseen.macroF1, S.table.rawTop.strata.propn.unseen.macroF1);   // a tie on the unseen stratum
  assert.equal(S.unseen.tests.rawTop.significant, false);
  assert.equal(S.pass, false);
  assert.match(S.passReason, /U:rawTop/);
  assert.equal(S.table.keyed.strata.propn.seen.macroF1, 1);                                              // the seen stratum is where keyed wins
});

test("STRATA: seen and unseen partition gold and prediction; the seen share is countable", () => {
  const S = score(makeBlocks(8, honestArms));
  const k = S.table.keyed.strata.propn;
  assert.equal(k.seen.gold, 0);                                              // every toy name is unseen
  assert.equal(k.unseen.gold, 24);
  assert.equal(S.table.keyed.strata.nominal.seen.gold, 16);                  // dog + cat in each of 8 blocks
  assert.equal(S.table.keyedAll.strata.nominal.seen.predicted, 8);           // keyedAll admits dog only
  assert.equal(S.perBlock[0].goldStrata.propn.unseen, 3);
});

test("U cannot be evaluated => pass is null (typed), never true: no split supplied, or too few unseen blocks", () => {
  const none = scoreBlocks(makeBlocks(8, honestArms));                       // no isSeen
  assert.equal(none.pass, null);
  assert.match(none.passReason, /untested/);
  assert.match(none.passReason, /no seen\/unseen split/);
  // names SEEN in the TRAIN prior in 6 of 8 blocks (forms starting with "s" are the seen ones): only 2 blocks carry unseen PROPN gold
  const mixed = Array.from({ length: 8 }, (_, b) => {
    const own = new Set(b < 6 ? [`s${b}a`, `s${b}b`, `s${b}c`] : [`n${b}a`, `n${b}b`, `n${b}c`]);
    return { gold: { propn: own, nominal: new Set([...own, "dog"]) }, arms: honestArms({ b, own, other: new Set() }) };
  });
  const S = scoreBlocks(mixed, { isSeen: (f) => f.startsWith("s") });
  assert.equal(S.unseen.eligible, 2);
  for (const c of CONTROLS_IN_RULE) assert.equal(S.tests[c].significant, true, `K:${c}`);   // everything else holds ...
  assert.equal(S.licence.significant, true);
  assert.equal(S.pass, null, S.passReason);                                  // ... and the claim about unseen words is untested, so no pass
  assert.match(S.passReason, /2 eligible unseen-PROPN block/);
});

test("U cannot hide a failure: an untestable unseen stratum does not turn a failed K into a null", () => {
  const S = score(makeBlocks(8, (x) => ({ ...honestArms(x), keyed: new Set(x.other) })), { isSeen: null });
  assert.equal(S.pass, false);
});

// ── AMENDMENT A2: controls that cost something ──
test("prior_scrambled: the class vectors are deranged among the forms, the frame distributions among the frame keys, seeded", () => {
  // JSON.parse: a literal `"__proto__": {...}` would set the prototype, not an own key
  const prior = JSON.parse('{"schema":"POSPrior@1","provenance":{"tokens_read":100},"forms":{"a":{"NOUN":9},"b":{"VERB":8},"c":{"DET":7},"d":{"ADJ":6},"__proto__":{"PROPN":5}}}');
  const frame = { schema: "FramePrior@1", marginal: { NOUN: 1 }, frames: { "^|*": { NOUN: 3 }, "*|*": { VERB: 4 }, "DET|NOUN": { ADJ: 2 } } };
  const r = scramblePrior(prior, frame, 3);
  const names = Object.keys(prior.forms);
  assert.deepEqual(Object.keys(r.posPrior.forms).sort(), [...names].sort());   // the key set (hence seen/unseen) is untouched
  for (const n of names) assert.notDeepEqual(r.posPrior.forms[n], prior.forms[n], `${n} kept its own class vector`);
  assert.equal(r.stats.classChanged, 5);
  assert.deepEqual(Object.keys(r.framePrior.frames).sort(), Object.keys(frame.frames).sort());
  for (const k of Object.keys(frame.frames)) assert.notDeepEqual(r.framePrior.frames[k], frame.frames[k], `frame ${k} kept its distribution`);
  assert.equal(r.posPrior.provenance.tokens_read, 100);                      // the received token count stays: only WHO owns which counts moves
  assert.deepEqual(scramblePrior(prior, frame, 3).posPrior.forms, r.posPrior.forms);   // deterministic
  assert.equal(prior.forms.a.NOUN, 9);                                       // the real prior is not mutated
  assert.equal(scramblePrior(prior, null, 1).framePrior, null);
});

test("rate_permuted: the rate multiset is preserved, no candidate keeps its own rate, seeded", () => {
  const cands = ["a", "b", "c", "d", "e"];
  const real = { a: 0.1, b: 0.2, c: 0.3, d: 0.4, e: 0.5 };
  const m = ratePermutation(cands, (f) => real[f], mulberry32(5));
  assert.deepEqual([...m.values()].sort(), [0.1, 0.2, 0.3, 0.4, 0.5]);
  for (const f of cands) assert.notEqual(m.get(f), real[f], f);
  assert.deepEqual([...ratePermutation(cands, (f) => real[f], mulberry32(5))], [...m]);
  assert.equal(ratePermutation(["a"], () => 0.1, mulberry32(1)).size, 0);   // nothing to permute: empty, so the caller falls back to the real rate
});

test("lexicon_filter mirrors the cast's own commonNouns=false refusal (the mirrored definition cannot drift unnoticed)", () => {
  const posPrior = { schema: "POSPrior@1", provenance: { tokens_read: 100000, forms_kept: 50 }, forms: { the: { DET: 5000 }, table: { NOUN: 4 }, zorp: { PROPN: 2, NOUN: 1 }, saw: { VERB: 50 }, ox: { NOUN: 2 } } };
  assert.equal(isCommonForm(posPrior, "table"), true);                       // NOUN share 1, 4 tokens
  assert.equal(isCommonForm(posPrior, "zorp"), false);                       // NOUN share 1/3
  assert.equal(isCommonForm(posPrior, "ox"), false);                         // below the 3-token minimum
  assert.equal(isCommonForm(posPrior, "unseen"), false);
  const texts = [];
  for (let i = 0; i < 40; i++) texts.push("the table saw glimmerax and the table met glimmerax near the ox");
  const hear = () => ({ language: "toy", grammar: { posPrior, framePrior: null }, ear: {} });
  const r = readBlock({ texts, hear, posPrior, seed: 9, commonNouns: false });
  assert.equal(r.extra.commonMirrorOk, true);
  assert.ok(r.arms.keyedAll.has("table"), "heard-only: the settled common noun is allowed through the gate");
  assert.ok(!r.arms.keyed.has("table"), "production config: the cast defers it");
  assert.ok(!r.arms.lexicon_filter.has("table"));
  assert.ok(r.arms.keyed.has("glimmerax") && r.arms.lexicon_filter.has("glimmerax"));
  assert.ok(r.arms.nominated.has("table"));                                  // the ungated ledger keeps it: lexicon_filter is nominated minus the prior's common nouns
  assert.equal(r.arms.randomK.size, r.arms.keyed.size);                      // size-matched
  assert.ok([...r.arms.randomK].every((f) => r.arms.nominated.has(f)));
  const heardOnly = readBlock({ texts, hear, posPrior, seed: 9, commonNouns: true });
  assert.equal(heardOnly.extra.commonMirrorOk, null);                        // nothing to mirror when commonNouns=true
  assert.deepEqual([...heardOnly.arms.keyed].sort(), [...heardOnly.arms.keyedAll].sort());
});

test("control rates: the constant is the mean, the shuffle is a derangement (no form keeps its rate), both are seeded", () => {
  const prior = { provenance: { tokens_read: 1000, forms_kept: 6 }, forms: { a: { NOUN: 1 }, b: { NOUN: 2 }, c: { NOUN: 4 }, d: { NOUN: 8 }, e: { NOUN: 16 }, f: { NOUN: 32 } } };
  const r = controlRates(prior, 7);
  const mean = Object.keys(prior.forms).map(r.real).reduce((x, y) => x + y, 0) / 6;
  assert.ok(Math.abs(r.flat - mean) < 1e-12);
  for (const f of Object.keys(prior.forms)) assert.notEqual(r.shuf.get(f), r.real(f), `${f} kept its own rate`);
  assert.deepEqual([...r.shuf], [...controlRates(prior, 7).shuf]);          // deterministic
  assert.equal(controlRates({ provenance: {}, forms: { a: { NOUN: 1 } } }, 1).baseline, false);   // no tokens_read: no baseline, typed
});

test("the capital witness is EMPTY with a typed gap where the script has no case", () => {
  const zh = capitalWitness(["玛丽亚在北京遇见了约翰。", "后来玛丽亚给约翰写了信。"]);
  assert.equal(zh.forms.size, 0);
  assert.match(zh.gap, /script/);
  const en = capitalWitness(["He met Maria in Paris.", "Later Maria wrote to Paris again.", "They said Maria was in Paris."]);
  assert.equal(en.gap, null);
  assert.ok(en.forms.has("maria") && en.forms.has("paris"));
});

// ── end to end on a toy language: gold <-> cast <-> arms wiring, no treebank on disk ──
test("end to end on a toy language: the cast finds the unseen names, counting words does not, a flat baseline admits nothing", () => {
  const NAMES = ["zorpa", "blikon", "quenta", "vramdo", "tessil", "norgax", "pellum", "dravik", "hosmer", "lunsey", "kavrin", "ottle", "brenta", "sulvik", "marnos", "fendra"];
  const cap = (w, u) => (u === "PROPN" ? w[0].toUpperCase() + w.slice(1) : w);
  const sents = [];
  for (let b = 0; b < 8; b++) for (let i = 0; i < 60; i++) {
    const pairs = [[NAMES[2 * b], "PROPN"], ["saw", "VERB"], ["the", "DET"], [i % 2 ? "dog" : "cat", "NOUN"], ["and", "CCONJ"], [NAMES[2 * b + 1], "PROPN"], ["met", "VERB"], ["the", "DET"], [i % 3 ? "cat" : "dog", "NOUN"]]
      .map(([w, u]) => [cap(w, u), u]);
    sents.push(sent(pairs));
  }
  const posPrior = { schema: "POSPrior@1", provenance: { tokens_read: 2000, forms_kept: 6 }, forms: { the: { DET: 700 }, and: { CCONJ: 300 }, saw: { VERB: 50 }, met: { VERB: 50 }, dog: { NOUN: 400 }, cat: { NOUN: 400 } } };
  const hear = () => ({ language: "toy", grammar: { posPrior, framePrior: null }, ear: {} });
  const r = measureSentences(sents, { stem: "toy", split: "dev", hear, posPrior });
  assert.equal(r.rung, "r3");
  assert.equal(r.n, 480);
  assert.equal(r.details.plan.count, 8);
  assert.equal(r.details.causal.ok, true);
  assert.equal(r.details.causal.commonNouns, false);                         // the toy text is cased script: production defers settled common nouns (A3)
  assert.ok(r.score >= 0.95, `keyed F1 ${r.score}`);                        // the unseen names, and nothing else
  assert.ok(r.controls.rawTop < 0.6 && r.controls.rawTop_at_K < 0.6, JSON.stringify(r.controls));   // function words swamp a no-prior count
  assert.equal(r.controls.deranged_constant, 0);                            // one constant for every word: nothing keys
  assert.ok(r.controls.misaligned_gold < 0.05, `licence ${r.controls.misaligned_gold}`);
  assert.equal(r.margin, Number((r.score - r.control).toFixed(4)));
  assert.equal(typeof r.pass === "boolean" || r.pass === null, true);
  assert.deepEqual(Object.keys(r.controls).sort(), ["capital_witness", "deranged_constant", "deranged_shuffled", "lexicon_filter", "misaligned_gold", "nominated_ablation", "prior_scrambled", "rate_permuted", "rawTop", "rawTop_at_K", "size_matched_random"]);
  // A1/A2/A4 are in the card: strata, the seen share as a typed denominator, provenance, the stamped header
  assert.equal(r.details.strata.eligibleUnseenPropnBlocks, 8);              // every toy name is unseen in the TRAIN prior
  assert.ok(r.details.strata.arms.keyed.propn.unseen.F1 >= 0.95);
  assert.equal(r.details.gold.seenInTrainPrior.propn.seen, 0);
  assert.equal(r.details.arm_provenance.capital.causal, false);
  assert.match(r.details.prereg_sha256, /^[0-9a-f]{64}$/);
  assert.ok(r.notes.some((n) => /WHOLE-BLOCK, non-causal and English-listed/.test(n)));
  assert.equal(r.details.preregistered_arm.arm, "keyedAll");
  // on the toy every unseen word is a name, so counting names the unseen words exactly: U vs rawTop CANNOT be won, and the card says so
  assert.equal(r.pass, false, r.notes[1]);
  assert.match(r.notes[1], /U:rawTop/);
});

// ── typed gaps, never a throw ──
test("a stem lacking gold, or a prior, is `unmeasured` with a typed gap — measure() never throws", async () => {
  const nogold = await measure({ stem: "zzz", split: "dev" });
  assert.equal(nogold.pass, null);
  assert.equal(nogold.gaps[0].reason, "unmeasured");
  assert.equal(nogold.rung, "r3");
  assert.equal(nogold.score, null);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "r3-"));
  fs.mkdirSync(path.join(dir, "xx"));
  fs.writeFileSync(path.join(dir, "xx", "dev.conllu"), "# text = a b\n1\ta\ta\tNOUN\t_\t_\t0\troot\t_\t_\n\n");
  const noprior = await measure({ stem: "xx", split: "dev", evalDir: dir });
  assert.equal(noprior.pass, null);
  assert.equal(noprior.gaps[0].reason, "unmeasured");
  assert.match(noprior.gaps[0].detail, /no_prior/);
  const tiny = measureSentences([sent([["A", "NOUN"]])], { stem: "toy", hear: () => ({ language: null }), posPrior: null });
  assert.equal(tiny.pass, null);
});

// ── the real instrument on real held-out DEV text (skipped when the treebanks are not on disk) ──
const haveDev = (s) => conlluPath(s, "dev");
test("real DEV: eng reads causally, cased and caseless arms exist, the gold perturbation moves the score", { skip: !haveDev("eng"), timeout: 180000 }, async () => {
  const r = await measure({ stem: "eng", split: "dev", limit: 600 });
  assert.equal(r.split, "dev");
  assert.equal(r.n, 600);
  assert.equal(r.details.plan.count, 8);
  assert.equal(r.details.causal.ok, true);                                   // S3 holds on a real block
  assert.equal(r.details.caseless, false);
  assert.ok(r.score > 0 && r.score <= 1);
  assert.ok(r.controls.misaligned_gold < r.score, "the statistic must move when the gold is perturbed");
  assert.ok(r.controls.capital_witness > 0, "eng has case: the capital tier answers");
  assert.ok(!r.notes.some((n) => /CAUSALITY VIOLATED|rateOf-switchable cast|mirrored common-noun definition/.test(n)), r.notes.join("\n"));
  assert.equal(r.details.causal.commonNouns, false);                         // production config for a cased script
  assert.deepEqual(r.details.arm_provenance.capital.causal, false);
  assert.ok(r.details.strata.arms.keyed.propn.unseen.gold > 0 && r.details.strata.arms.keyed.propn.seen.gold > 0, "eng dev has both seen and unseen recurring names");
  assert.ok(r.gaps.some((g) => g.reason === "gold_propn_seen_in_train_prior"), "the seen share of gold is a typed denominator");
  // II.23 for the prior: scrambling the class knowledge must move the statistic (the control is built to fail)
  assert.ok(r.controls.prior_scrambled < r.score, `prior_scrambled ${r.controls.prior_scrambled} must score below keyed ${r.score}`);
  assert.ok(r.controls.rate_permuted < r.score, `rate_permuted ${r.controls.rate_permuted} must score below keyed ${r.score}`);
  assert.ok(r.details.gate.scrambleClassChangedShare > 0.5, "the derangement must actually change most forms' majority class");
});

test("real DEV: cmn-hans is caseless — capital arm empty with a typed gap, and the cast still names beings", { skip: !haveDev("cmn-hans"), timeout: 180000 }, async () => {
  const r = await measure({ stem: "cmn-hans", split: "dev" });
  assert.equal(r.details.caseless, true);
  assert.equal(r.details.causal.commonNouns, true);                          // production: caseless script keeps common nouns, so keyed == keyedAll
  assert.equal(r.controls.capital_witness, 0);
  assert.ok(r.gaps.some((g) => g.reason === "script_without_case"));
  assert.ok(r.details.keyedPropnMicroRecall > 0, "unseen names are heard with no capitals at all");
  assert.equal(r.details.causal.ok, true);
});
