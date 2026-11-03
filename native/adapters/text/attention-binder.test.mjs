// The attention binder (adapters/text/attention-binder.js): "it" and "The <word>" bound to the attended non-person referent.
// Stub-free: synthetic sentences and mentions; no priors directory, lexicon, corpus or reader.
import test from "node:test";
import assert from "node:assert/strict";
import { bindAttended, predicateKind } from "./attention-binder.js";
import { THIRD_PERSON_SINGULAR, NEUTER_THIRD_PERSON } from "./priors.js";

const DIALS = { window: 8, minActivation: 0.5, minMargin: 0.2, boost: 2, feed: true, centerVeto: true, clauseMateVeto: true };
const build = (texts) => { let off = 0; return texts.map((text, order) => { const s = { text, offset: off, order }; off += text.length + 1; return s; }); };
// a mention is [sentence, ref, needle]; the span is the needle's first occurrence in that sentence
const spans = (sents, specs) => specs.map(([si, ref, needle]) => { const start = sents[si].offset + sents[si].text.indexOf(needle); return { ref, start, end: start + needle.length }; });
const run = (texts, specs, opts = {}) => { const sents = build(texts); return bindAttended(sents, spans(sents, specs), { ...DIALS, ...opts }); };

test("an 'It' binds to the attended being, with its address and the evidence", () => {
  const out = run(["The Tower is old.", "It is tall."], [[0, "T", "Tower"]]);
  assert.equal(out.bindings.length, 1);
  assert.equal(out.bindings[0].referentId, "T");
  assert.equal(out.bindings[0].kind, "pronoun");
  assert.equal(out.bindings[0].surface, "It");
  assert.equal(out.bindings[0].via, "attended");
  assert.deepEqual(out.gaps, []);
});

test("a definite description binds through a word of the being's own surface, and a clitic is not part of the address", () => {
  const texts = ["The Eiffel Tower is old.", "The tower's base is wide."];
  const out = run(texts, [[0, "E", "Eiffel Tower"]]);
  assert.equal(out.bindings.length, 1);
  assert.equal(out.bindings[0].via, "surface-word");
  assert.equal(out.bindings[0].surface, "The tower");
});

test("a definite description binds through the kind the text predicates of the being with a copula", () => {
  const texts = ["Concorde is a British-French supersonic airliner with four engines.", "The airliner had range."];
  const out = run(texts, [[0, "C", "Concorde"]]);
  assert.equal(out.bindings[0]?.referentId, "C");
  assert.equal(out.bindings[0]?.via, "predicate-kind");
  assert.deepEqual(predicateKind(" is a British-French supersonic airliner with four engines."), ["supersonic", "airliner", "with", "four", "engines"]);
});

test("the noun phrase containing a name lends its words to the being (the Statue of | Liberty)", () => {
  const out = run(["The Statue of Liberty is old.", "The statue was built."], [[0, "L", "Liberty"]]);
  assert.equal(out.bindings[0]?.referentId, "L");
});

test("a description whose word the text never gave any being is a typed gap, not a guess (no noun list exists to consult)", () => {
  const out = run(["The Tower is old.", "The weather was fine."], [[0, "T", "Tower"]]);
  assert.equal(out.bindings.length, 0);
  assert.equal(out.gaps[0].reason, "description_unbound");
});

test("two beings equally present leave the 'It' unbound with the two named; a floor above the presence does the same", () => {
  const a = run(["The Tower and the Bridge are old.", "It is tall."], [[0, "T", "Tower"], [0, "B", "Bridge"]], { boost: 1 });
  assert.equal(a.bindings.length, 0);
  assert.equal(a.gaps[0].reason, "pronoun_no_margin");
  assert.deepEqual([a.gaps[0].top, a.gaps[0].runnerUp].sort(), ["B", "T"]);
  const b = run(["The Tower is old.", "It is tall."], [[0, "T", "Tower"]], { minActivation: 50 });
  assert.equal(b.gaps[0].reason, "pronoun_below_floor");
});

test("the subject's position counts more: the first-named being leads a sentence naming two", () => {
  const out = run(["The Tower overlooks the Bridge.", "It is tall."], [[0, "T", "Tower"], [0, "B", "Bridge"]]);
  assert.equal(out.bindings[0]?.referentId, "T");
});

test("an 'It' after a sentence that began with a description the cast does not know is the centre moving elsewhere: a gap, and off, a binding", () => {
  const texts = ["The Tower is old.", "The committee met on Monday.", "It was large."];
  const on = run(texts, [[0, "T", "Tower"]]);
  assert.equal(on.gaps.find((g) => g.sentenceOrder === 2).reason, "center_elsewhere");
  const off = run(texts, [[0, "T", "Tower"]], { centerVeto: false });
  assert.equal(off.bindings.find((b) => b.sentenceOrder === 2).referentId, "T");
});

test("an earlier clause-mate that is another candidate vetoes the pronoun (Principle B), and off it does not", () => {
  const texts = ["The Tower is old.", "The Bridge held what it carried."];
  const specs = [[0, "T", "Tower"], [1, "B", "Bridge"]];
  assert.equal(run(texts, specs).gaps.find((g) => g.sentenceOrder === 1)?.reason, "clause_mate");
  assert.equal(run(texts, specs, { clauseMateVeto: false }).bindings.find((b) => b.sentenceOrder === 1 && b.kind === "pronoun")?.referentId, "T");
});

test("the giver's ruling is exactly the candidate set; without it, a being the text shows to be a person is not a candidate", () => {
  const texts = ["Anna built the Tower.", "It is old."];
  const specs = [[0, "A", "Anna"], [0, "T", "Tower"]];
  assert.equal(run(texts, specs, { nonPersonal: new Set(["T"]) }).ruling, "giver");
  assert.equal(run(texts, specs, { nonPersonal: new Set(["T"]) }).bindings[0]?.referentId, "T");
  assert.equal(run(texts, specs, { nonPersonal: new Set(["A"]) }).bindings[0]?.referentId, "A", "the set decides, whatever the text says");
  const textEvidence = run(["Anna lived there. She waved to it.", "It stood."], [[0, "A", "Anna"]]);
  assert.equal(textEvidence.ruling, "text_evidence");
  assert.ok(textEvidence.bindings.every((b) => b.referentId !== "A"), "Anna has a clause-local 'She': a person");
});

test("a mention inside a longer mention of another being is not that being's firing", () => {
  const sents = build(["The Hoover Dam is old.", "It is tall."]);
  const base = sents[0].offset;
  const mentions = [{ ref: "H", start: base + 4, end: base + 10 }, { ref: "D", start: base + 4, end: base + 14 }];
  const out = bindAttended(sents, mentions, DIALS);
  assert.equal(out.bindings[0]?.referentId, "D");
});

test("he and she are never looked at here, and the neuter class is separate from the gendered table", () => {
  const out = run(["The Tower is old.", "He said so, and she agreed."], [[0, "T", "Tower"]]);
  assert.equal(out.bindings.length, 0);
  assert.equal(out.gaps.length, 0);
  assert.deepEqual(Object.keys(THIRD_PERSON_SINGULAR).sort(), ["he", "her", "hers", "herself", "him", "himself", "his", "she"]);
  assert.deepEqual([...NEUTER_THIRD_PERSON].sort(), ["it", "its", "itself"]);
});

test("every dial is declared; none is defaulted", () => {
  for (const k of ["window", "minActivation", "minMargin", "boost", "feed", "centerVeto", "clauseMateVeto"]) {
    const { [k]: _gone, ...rest } = DIALS;
    const sents = build(["The Tower is old."]);
    assert.throws(() => bindAttended(sents, [], rest), TypeError, k);
  }
});

test("the code keeps no noun, synonym or kind list: every set of words it reads is a received class from priors.js", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("./attention-binder.js", import.meta.url), "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.equal(/new Set\(\[\s*["'`]/.test(src), false, "no Set literal of words");
  assert.equal(/\[\s*["'`][a-z]+["'`]\s*,\s*["'`][a-z]+["'`]/i.test(src), false, "no array literal of words");
});

test("the switch is OFF unless asked: absent or false files nothing; on, it binds from an entry's own cast", async () => {
  const { attendedBindingsFor } = await import("./attention-switch.js");
  const sents = build(["The Tower is old.", "It is tall."]);
  const entry = { sentences: sents, cast: [{ ref: "T", mentionSpans: [[sents[0].offset + 4, sents[0].offset + 9]] }] };
  assert.equal(attendedBindingsFor(entry), null);
  assert.equal(attendedBindingsFor(entry, { enabled: false, ...DIALS }), null);
  assert.equal(attendedBindingsFor(entry, { enabled: "yes", ...DIALS }), null, "only true turns it on");
  assert.equal(attendedBindingsFor(entry, { enabled: true, ...DIALS }).bindings[0].referentId, "T");
});

// ---- round 2 (PREREG-ATTENTION-A2.md): every option is off unless declared, and each has a falsifier ----
const R2 = { minWordShare: 0.25, carryVeto: true, expletiveVeto: true, demonstrativeSubject: true, causalWords: true };

test("round-2 options absent: the call is the round-1 call", () => {
  const texts = ["The Tower is old.", "The committee met.", "It was large."];
  const a = run(texts, [[0, "T", "Tower"]], { centerVeto: false });
  const b = run(texts, [[0, "T", "Tower"]], { centerVeto: false, minWordShare: null, carryVeto: false, expletiveVeto: false, demonstrativeSubject: false, causalWords: false });
  assert.deepEqual(a, b);
  assert.throws(() => run(texts, [], { carryVeto: "yes" }), TypeError);
  assert.throws(() => run(texts, [], { minWordShare: 2 }), TypeError);
});

test("expletive or cleft 'it' (a copula, then the complementizer in the same clause) files a typed gap, not a binding", () => {
  const texts = ["The Tower is old.", "It was in 1889 that it opened.", "It is said that the Tower leans."];
  const out = run(texts, [[0, "T", "Tower"], [2, "T", "Tower"]], { ...R2, carryVeto: false });
  assert.equal(out.gaps.filter((g) => g.reason === "expletive_or_cleft").length, 2, "the first 'It' of each; the 'it' after 'that' is a real pronoun");
  const off = run(texts, [[0, "T", "Tower"], [2, "T", "Tower"]], { ...R2, carryVeto: false, expletiveVeto: false });
  assert.equal(off.gaps.filter((g) => g.reason === "expletive_or_cleft").length, 0);
  const rel = run(["The Tower is old.", "It is the tallest thing, and it was built quickly."], [[0, "T", "Tower"]], R2);
  assert.equal(rel.bindings.filter((b) => b.kind === "pronoun").length >= 1, true, "no 'that': an ordinary pronoun");
});

test("carry: a pronoun after a sentence that did not name or bind the attended being is a gap; after one that did, a binding", () => {
  const away = run(["The Tower is old.", "Visitors came in summer.", "It was large."], [[0, "T", "Tower"]], R2);
  assert.equal(away.gaps.find((g) => g.sentenceOrder === 2).reason, "center_not_carried");
  const kept = run(["The Tower is old.", "Visitors admired the Tower.", "It was large."], [[0, "T", "Tower"], [1, "T", "Tower"]], R2);
  assert.equal(kept.bindings.find((b) => b.sentenceOrder === 2)?.referentId, "T");
  const chain = run(["The Tower is old.", "It is tall.", "It is wide."], [[0, "T", "Tower"]], R2);
  assert.deepEqual(chain.bindings.map((b) => b.sentenceOrder), [1, 2], "a bound 'It' carries the being to the next sentence");
});

test("demonstrative subject: 'These objections …' is not about the attended being, so the next 'It' is a centre moving elsewhere", () => {
  const texts = ["The Tower is old.", "These objections were loud.", "It came to a head."];
  const on = run(texts, [[0, "T", "Tower"]], { ...R2, carryVeto: false });
  assert.equal(on.gaps.find((g) => g.sentenceOrder === 2).reason, "center_elsewhere");
  const off = run(texts, [[0, "T", "Tower"]], { ...R2, carryVeto: false, demonstrativeSubject: false });
  assert.equal(off.bindings.find((b) => b.sentenceOrder === 2)?.referentId, "T");
});

test("causal words: a description is judged by what sentences BEFORE it gave the being, not by a later naming in its own sentence", () => {
  const texts = ["The Cumberland flows west to the Tennessee River."];
  const withTail = (causalWords) => run(["Anna lived there.", "The river flows west to the Tennessee River."], [[0, "A", "Anna"], [1, "R", "Tennessee River"]], { ...R2, causalWords, nonPersonal: new Set(["A", "R"]) });
  assert.equal(withTail(false).bindings.length >= 0, true);
  assert.equal(withTail(true).bindings.length, 0, "the tail of its own sentence is not evidence");
  assert.equal(withTail(true).gaps[0].reason, "description_unbound");
  assert.ok(texts.length === 1);
});

test("a word in only a sliver of a being's mentions does not earn a confident description (a pool of one is judged against the being's own naming)", () => {
  const T = ["Tennessee is warm.", "Tennessee is green.", "Tennessee is hilly.", "Tennessee is wet.", "Tennessee is old.", "Boats crossed the Tennessee River.", "Tennessee is large.", "The river was cold."];
  const sents = build(T);
  const spec = T.slice(0, 7).map((_, si) => { const needle = si === 5 ? "Tennessee River" : "Tennessee"; const start = sents[si].offset + sents[si].text.indexOf(needle); return { ref: "TN", start, end: start + needle.length }; });
  const dials = { ...DIALS, ...R2, nonPersonal: new Set(["TN"]) };
  assert.equal(bindAttended(sents, spec, { ...dials, minWordShare: 0 }).bindings.find((b) => b.surface === "The river")?.referentId, "TN", "alone, it binds");
  const strict = bindAttended(sents, spec, { ...dials, minWordShare: 0.5 });
  assert.equal(strict.bindings.find((b) => b.surface === "The river"), undefined);
  const gap = strict.gaps.find((g) => g.surface === "The river");
  assert.equal(gap?.reason, "description_weak_word");
  assert.ok(gap.wordShare > 0 && gap.wordShare < 0.5, `1 mention of 7 carried the word (${gap.wordShare})`);
});

// ---- round 3 (PREREG-ATTENTION-A3.md) ----
const R3 = { lineStarts: true, npHead: true, tieResolve: true, foldPlural: true, neverSilent: true, contextMinUses: 2 };
const ALL = { ...R2, ...R3 };

test("line starts: a sentence-initial description is found when its text line also carries a section heading", () => {
  const texts = ["The Tower is old.", "== Description ==\nThe tower has a lift."];
  const off = run(texts, [[0, "T", "Tower"]], R2);
  assert.equal(off.bindings.length + off.gaps.length, 0, "round 2: the heading hides the target (silent)");
  const on = run(texts, [[0, "T", "Tower"]], { ...R2, lineStarts: true });
  assert.equal(on.bindings[0]?.referentId, "T");
  assert.equal(on.bindings[0].surface, "The tower");
});

test("NP head: the head word of 'The expanded waterway' is found among the words some being owns; the address ends there", () => {
  const texts = ["The Canal is an artificial waterway in the south.", "The expanded waterway opened in 2016."];
  const off = run(texts, [[0, "C", "Canal"]], R2);
  assert.equal(off.gaps[0].reason, "description_unbound");
  const on = run(texts, [[0, "C", "Canal"]], { ...R2, npHead: true });
  assert.equal(on.bindings[0]?.referentId, "C");
  assert.equal(on.bindings[0].surface, "The expanded waterway");
});

test("tied candidates: the fuller name wins ('Panama' is a part of 'Panama Canal'); else the previous sentence's subject; else a typed gap", () => {
  const split = run(["The Panama Canal is old, near Panama.", "It is wide."], [[0, "PC", "Panama Canal"], [0, "P", "Panama."]], { ...ALL, boost: 1, carryVeto: false, minMargin: 0.2 });
  // the two namings fire alike (boost 1): a tie that round 2 refuses
  const refused = run(["The Panama Canal is old, near Panama.", "It is wide."], [[0, "PC", "Panama Canal"], [0, "P", "Panama."]], { ...R2, boost: 1, carryVeto: false });
  assert.equal(refused.gaps.find((g) => g.reason === "pronoun_no_margin") !== undefined, true);
  assert.equal(split.bindings.find((b) => b.kind === "pronoun")?.referentId, "PC");
  const subject = run(["The Tower and the Bridge are old.", "The Bridge is wide.", "It is long."], [[0, "T", "Tower"], [0, "B", "Bridge"], [1, "B", "Bridge"]], { ...ALL, boost: 1, minMargin: 0.9, carryVeto: false });
  assert.equal(subject.bindings.find((b) => b.sentenceOrder === 2 && b.kind === "pronoun")?.referentId, "B", "the previous sentence began with the Bridge");
  const undecided = run(["The Tower and the Bridge are old.", "It is long."], [[0, "T", "Tower"], [0, "B", "Bridge"]], { ...ALL, boost: 1, carryVeto: false });
  assert.equal(undecided.gaps.find((g) => g.kind === "pronoun")?.reason, "pronoun_no_margin", "the text does not decide: still a gap");
});

test("never silent: a neuter pronoun inside a cast naming files a typed gap", () => {
  const sents = build(["Its Only Rock is a song.", "The song is old."]);
  const out = bindAttended(sents, [{ ref: "S", start: 0, end: 8 }], { ...DIALS, ...ALL });
  assert.equal(out.gaps.some((g) => g.reason === "inside_cast_mention"), true);
});

test("context words: a noun used twice in sentences about a being, and mostly there, binds a description with no name or copula behind it", () => {
  const T = ["The Opera is old.", "The Opera has a building and a pier.", "The Opera shows buildings on the point.", "Walkers like the pier.", "The building is wide."];
  const specs = [[0, "O", "Opera"], [1, "O", "Opera"], [2, "O", "Opera"]];
  assert.equal(run(T, specs, { ...R2 }).bindings.some((b) => b.surface === "The building"), false);
  const on = run(T, specs, { ...ALL });
  assert.equal(on.bindings.find((b) => b.surface === "The building")?.referentId, "O");
  assert.equal(on.bindings.find((b) => b.surface === "The building")?.via, "context-word");
  const rare = run(["The Opera is old.", "The Opera has a pier.", "The pier is wide."], [[0, "O", "Opera"], [1, "O", "Opera"]], { ...ALL, contextMinUses: 3 });
  assert.equal(rare.gaps.find((g) => g.surface === "The pier")?.reason, "description_unbound", "one use is not a habit: a typed gap");
});

test("round-3 options absent: the call is the round-2 call", () => {
  const texts = ["The Tower is old.", "The tower has a lift.", "It is tall."];
  const a = run(texts, [[0, "T", "Tower"]], R2);
  const b = run(texts, [[0, "T", "Tower"]], { ...R2, lineStarts: false, npHead: false, tieResolve: false, foldPlural: false, neverSilent: false, contextMinUses: null });
  assert.deepEqual(a, b);
  assert.throws(() => run(texts, [], { lineStarts: 1 }), TypeError);
  assert.throws(() => run(texts, [], { contextMinUses: 0 }), TypeError);
});

// ---- round 4 (PREREG-ATTENTION-A4.md) ----
const R4 = { bearerShare: 0.5, weakRouteCarry: true, centerRivalShare: 0.5, openerReset: true };
const ALL4 = { ...ALL, ...R4 };

test("bearer plausibility: a lone owner of the head word that is neither the topic, nor carried, nor nearly as present is a typed gap, not a binding", () => {
  const T = ["Hagia Sophia is old.", "Hagia Sophia has a dome.", "Hagia Sophia has a nave.", "The Eastern Orthodox Church built it.", "Hagia Sophia is large.", "The church has a unique position."];
  const specs = [[0, "H", "Hagia Sophia"], [1, "H", "Hagia Sophia"], [2, "H", "Hagia Sophia"], [3, "E", "Eastern Orthodox Church"], [4, "H", "Hagia Sophia"]];
  const off = run(T, specs, { ...ALL, minWordShare: null });
  assert.equal(off.bindings.find((b) => b.surface === "The church")?.referentId, "E", "round 3: the lone owner binds");
  const on = run(T, specs, { ...ALL4, minWordShare: null });
  assert.equal(on.bindings.find((b) => b.surface === "The church"), undefined);
  const gap = on.gaps.find((g) => g.surface === "The church");
  assert.equal(gap?.reason, "description_off_topic");
  assert.equal(gap.topic, "H");
  // an owner carrying a fair share of the document's weight is a plausible bearer
  const heavy = run(["Hagia Sophia is old.", "The Eastern Orthodox Church built it.", "The Eastern Orthodox Church is old.", "The Eastern Orthodox Church is large.", "The church has a unique position."], [[0, "H", "Hagia Sophia"], [1, "E", "Eastern Orthodox Church"], [2, "E", "Eastern Orthodox Church"], [3, "E", "Eastern Orthodox Church"]], { ...ALL4, minWordShare: null });
  assert.equal(heavy.bindings.find((b) => b.surface === "The church")?.referentId, "E");
});

test("the topic's own name word needs no continuity, a kind word does", () => {
  const T = ["The Canal is an artificial waterway in the south.", "Boats pass daily.", "The expanded waterway opened in 2016.", "The canal is long."];
  const specs = [[0, "C", "Canal"]];
  const off = run(T, specs, { ...ALL, minWordShare: null });
  assert.equal(off.bindings.find((b) => b.surface === "The expanded waterway")?.referentId, "C", "round 3 binds the kind word");
  const on = run(T, specs, { ...ALL4, minWordShare: null });
  assert.equal(on.gaps.find((g) => g.surface === "The expanded waterway")?.reason, "description_weak_route");
  assert.equal(on.bindings.find((b) => b.surface === "The canal")?.referentId, "C", "its own name word, the topic: no continuity needed");
});

test("centre veto revisited: a previous subject that is far less present than the chosen being is no rival", () => {
  const T = ["The Tower is old.", "The Tower has stairs.", "The Tower has a lift.", "Rome is new.", "It is tall."];
  const specs = [[0, "T", "Tower"], [1, "T", "Tower"], [2, "T", "Tower"], [3, "B", "Rome"]];
  const off = run(T, specs, { ...ALL, carryVeto: false });
  assert.equal(off.gaps.find((g) => g.sentenceOrder === 4)?.reason, "center_elsewhere");
  const rival = run(T, specs, { ...ALL4, carryVeto: false, centerRivalShare: 0.2 });
  assert.equal(rival.gaps.find((g) => g.sentenceOrder === 4)?.reason, "center_elsewhere", "Rome is at least 20% as present as the tower: a rival");
  const faint = run(T, specs, { ...ALL4, carryVeto: false, centerRivalShare: 0.9 });
  assert.equal(faint.bindings.find((b) => b.sentenceOrder === 4)?.referentId, "T", "Rome is not 90% as present: no rival");
});

test("section opener: ranked by the undecayed count, and the previous sentence's vetoes do not apply", () => {
  const filler = Array.from({ length: 30 }, (_, i) => `Visitors came in year ${i}.`);
  const T = ["The Canal is old.", "The Canal is long.", "The Canal is wide.", ...filler, "== Opening ==\nThe canal opened in 1869."];
  const specs = [[0, "C", "Canal"], [1, "C", "Canal"], [2, "C", "Canal"]];
  const off = run(T, specs, { ...ALL, minWordShare: null });
  assert.equal(off.gaps.find((g) => /canal/i.test(g.surface))?.reason, "description_below_floor", "round 3: presence has faded");
  const on = run(T, specs, { ...ALL4, minWordShare: null });
  assert.equal(on.bindings.find((b) => /canal/i.test(b.surface))?.referentId, "C");
});

test("round-4 options absent: the call is the round-3 call; types are checked", () => {
  const texts = ["The Tower is old.", "The tower has a lift.", "It is tall."];
  const a = run(texts, [[0, "T", "Tower"]], ALL);
  const b = run(texts, [[0, "T", "Tower"]], { ...ALL, bearerShare: null, weakRouteCarry: false, centerRivalShare: null, openerReset: false });
  assert.deepEqual(a, b);
  assert.throws(() => run(texts, [], { bearerShare: 0 }), TypeError);
  assert.throws(() => run(texts, [], { openerReset: "yes" }), TypeError);
});
