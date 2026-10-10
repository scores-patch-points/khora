// name-candidates: single-mention, case-blind NOMINATION of names from received priors.
// Every fixture runs against the real received priors (UD-train POS prior + FramePrior@1).
import test from "node:test";
import assert from "node:assert/strict";
import { nameCandidates, nameUnits, heardText, MIN_SHARE, LANE } from "../adapters/text/name-candidates.js";
import { grammarFor } from "../the-fold/language-grammar.js";

const EN = grammarFor("en");
const surfaces = (r) => r.candidates.map((c) => c.surface);
const lowerSurfaces = (r) => r.candidates.map((c) => c.surface.toLowerCase());
const sig = (r) => r.candidates.map((c) => `${c.start}-${c.end}|${c.basis}|${c.mass}|${c.unseen}`);

const NEED = "my cousin mike and his wife sarah went to marlow dental, my sister priya says hi";

test("the NEED: names mentioned ONCE, in lowercase, are nominated", () => {
  const r = nameCandidates(NEED, { grammar: EN });
  for (const n of ["mike", "sarah", "priya"]) assert.ok(surfaces(r).includes(n), `${n} missing from ${surfaces(r)}`);
  // the words that are not names are not nominated: common nouns, verbs, pronouns, function words
  for (const w of ["cousin", "wife", "sister", "went", "says", "hi", "my", "his", "and", "to"]) assert.ok(!surfaces(r).includes(w), `${w} must not be nominated`);
  assert.equal(r.language, "eng");
  assert.deepEqual(r.gaps, []);
  assert.equal(r.regime.sentences, 1);
});

test("KNOWN MISS, pinned so a change is noticed: 'marlow' after 'to' before an adjective is not nominated", (t) => {
  // The frame prior reads an unseen word between PART|ADP "to" and the ADJ "dental" as a verb/adverb
  // (naming mass ~0.13); "dental" is an attested ADJ so it is no candidate either. Recall limit, disclosed.
  const r = nameCandidates(NEED, { grammar: EN });
  t.diagnostic(`marlow nominated: ${surfaces(r).includes("marlow")}`);
  assert.equal(surfaces(r).includes("marlow"), false);
  // ...but the same unseen word in a naming frame IS found
  assert.ok(surfaces(nameCandidates("book a table at marlow", { grammar: EN })).includes("marlow"));
});

test("offsets index the ORIGINAL text, and the surface is the original slice", () => {
  const text = "My Cousin Mike and his wife Sarah went home, My sister Priya says hi";
  const r = nameCandidates(text, { grammar: EN });
  assert.ok(r.candidates.length >= 3);
  for (const c of r.candidates) assert.equal(text.slice(c.start, c.end), c.surface);
  assert.ok(surfaces(r).includes("Mike") && surfaces(r).includes("Priya"));
});

test("every candidate is only NOMINATED: standing, lane, evidence, a basis a consumer can filter on", () => {
  const r = nameCandidates("tell priya and greg thanks, mike will call", { grammar: EN });
  assert.ok(r.candidates.length >= 2);
  for (const c of r.candidates) {
    assert.equal(c.standing, "nominated");
    assert.equal(c.lane, LANE);
    assert.equal(c.lane, "name-candidate");
    assert.ok(typeof c.basis === "string" && c.basis.length);
    assert.ok(Array.isArray(c.evidence.words) && c.evidence.words.length >= 1);
    assert.ok(c.mass == null || (c.mass >= 0 && c.mass <= 1));
    assert.ok(Number.isInteger(c.unseen));
  }
  const unseen = r.candidates.find((c) => c.surface === "priya");
  assert.ok(unseen, "priya (unseen by the prior) is nominated from the frame");
  assert.match(unseen.basis, /^unseen\|frame:/);
  assert.equal(unseen.unseen, 1);
  assert.ok(unseen.mass >= MIN_SHARE, "nominated on frame-implied naming mass >= the settled-share cut");
  const attested = r.candidates.find((c) => c.surface === "mike");
  assert.equal(attested.basis, "prior:PROPN");
  assert.equal(attested.unseen, 0);
});

test("the prior REFUSES, never admits: settled verbs, particles, pronouns, determiners, numbers are not candidates", () => {
  const r = nameUnits("i will go to the park with her at 25 and then she can run", { grammar: EN });
  assert.deepEqual(r.candidates, []);
  const refused = Object.fromEntries(r.units.map((u) => [u.text, u.refused]));
  assert.match(refused.will, /^settled:/);
  assert.match(refused.to, /^settled:/);
  assert.match(refused.her, /^settled:/);
  assert.match(refused.the, /^settled:/);
  assert.equal(refused["25"], "digit");
  // a settled common noun is not a name candidate
  assert.equal(refused.park, "common-noun");
});

test("KNOWN MISS, pinned: a second unseen word at the very end of the sentence ('timer for eleanor voss') is below the cut", () => {
  // frame UNK|$ gives naming mass ~0.45 < 0.5: 'voss' is not nominated, 'eleanor' is. The declared cut is not tuned to fix it.
  const r = nameCandidates("make a timer for eleanor voss", { grammar: EN });
  assert.deepEqual(surfaces(r), ["eleanor"]);
  const u = nameUnits("make a timer for eleanor voss", { grammar: EN }).units.find((x) => x.text === "voss");
  assert.ok(u.mass < MIN_SHARE && u.mass > 0.4);
});

test("multi-word names are joined: 'eleanor voss'", () => {
  const text = "ask eleanor voss about the invoice";
  const r = nameCandidates(text, { grammar: EN });
  const c = r.candidates.find((x) => x.surface === "eleanor voss");
  assert.ok(c, `got ${surfaces(r)}`);
  assert.equal(text.slice(c.start, c.end), "eleanor voss");
  assert.equal(c.evidence.words.length, 2);
  assert.equal(c.unseen, 2);
});

test("'dr. kim' and 'j. smith' are one span each (title+candidate, initial+candidate)", () => {
  const text = "book an appointment with dr. kim and j. smith tomorrow";
  const r = nameCandidates(text, { grammar: EN });
  const dr = r.candidates.find((c) => c.surface === "dr. kim");
  const js = r.candidates.find((c) => c.surface === "j. smith");
  assert.ok(dr, `got ${surfaces(r)}`);
  assert.equal(dr.basis, "title+candidate");
  assert.equal(text.slice(dr.start, dr.end), "dr. kim");
  assert.ok(js);
  assert.equal(js.basis, "initial+candidate");
  // the full stop of a title is not a sentence end
  assert.equal(r.regime.sentences, 1);
});

test("a title with a name, with and without the dot ('mr. voss', 'dr kim', 'dr. kim' alone mid-sentence)", () => {
  assert.ok(surfaces(nameCandidates("please email mr. smith about it", { grammar: EN })).includes("mr. smith"));
  const bare = surfaces(nameCandidates("my dentist dr kim moved", { grammar: EN }));
  assert.ok(bare.some((s) => s.includes("kim")), `got ${bare}`);
  // a full stop after an ordinary word still ends the sentence
  const two = nameCandidates("i saw sarah. mike called later", { grammar: EN });
  assert.equal(two.regime.sentences, 2);
  assert.ok(surfaces(two).includes("sarah") && surfaces(two).includes("mike"));
  assert.ok(!surfaces(two).some((s) => s.includes("sarah. mike")));
});

test("possessives and quotes do not ride into the span", () => {
  const text = "so mike's coming with 'bob' tonight";
  const r = nameCandidates(text, { grammar: EN });
  const mike = r.candidates.find((c) => c.surface === "mike");
  assert.ok(mike, `got ${surfaces(r)}`);
  assert.equal(text.slice(mike.start, mike.end), "mike");
  const bob = r.candidates.find((c) => c.surface === "bob");
  assert.ok(bob, `got ${surfaces(r)}`);
  assert.equal(text.slice(bob.start, bob.end), "bob");
});

test("links and addresses are not names", () => {
  const r = nameCandidates("see http://www.priyaverma.example/mike or write sarahjones@example.com", { grammar: EN });
  for (const c of r.candidates) assert.ok(!/priyaverma|sarahjones|example/.test(c.surface), c.surface);
});

test("CASE-BLIND: a text, its lowercase and its uppercase give the same candidates", () => {
  for (const text of [NEED, "Book a table for Priya and Greg, then ask Dr. Kim about J. Smith", "MAKE A TIMER FOR Eleanor Voss at Marlow Dental"]) {
    const base = sig(nameCandidates(text, { grammar: EN }));
    assert.ok(base.length > 0);
    assert.deepEqual(sig(nameCandidates(text.toLowerCase(), { grammar: EN })), base);
    assert.deepEqual(sig(nameCandidates(text.toUpperCase(), { grammar: EN })), base);
  }
  // the module never reads a capital: a capitalised common word is not nominated for it
  const r = nameCandidates("Table Window Spoon", { grammar: EN });
  assert.deepEqual(r.candidates, []);
  // and the heard text is length-preserving, so offsets survive case-folding
  assert.equal(heardText("İSTANBUL Ünal ÀÉ").length, "İSTANBUL Ünal ÀÉ".length);
});

test("unspaced Chinese: names are nominated without spaces or case, offsets into the original", () => {
  const text = "李秀英也去了北京，我的同事卡斯珀昨天回来了。";
  const r = nameCandidates(text, { language: "zh-hans" });
  assert.equal(r.language, "cmn-hans");
  for (const c of r.candidates) assert.equal(text.slice(c.start, c.end), c.surface);
  const li = r.candidates.find((c) => c.surface === "李秀英");
  assert.ok(li, `got ${surfaces(r)}`);
  assert.equal(li.start, 0);
  assert.equal(li.end, 3);
  assert.ok(surfaces(r).includes("北京"));
  // an unseen transliterated name occurring once is covered (the ear's lexicon DP splits off 卡 as a
  // particle and merges 昨 on, so the span is 斯珀昨: the ear's boundary, not the nominator's)
  assert.ok(r.candidates.some((c) => c.start <= 14 && c.end >= 16), `斯珀 not covered: ${JSON.stringify(r.candidates.map((c) => [c.surface, c.start, c.end]))}`);
  // a settled common noun / function word is not nominated
  assert.ok(!surfaces(r).includes("同事"));
  assert.ok(!surfaces(r).includes("也"));
});

test("Arabic: fused proclitics are peeled and the span excludes them", () => {
  const text = "ذهب ولجون إلى المدينة";
  const r = nameCandidates(text, { language: "ar" });
  assert.equal(r.language, "arb");
  const c = r.candidates.find((x) => text.slice(x.start, x.end) === "جون");
  assert.ok(c, `got ${JSON.stringify(r.candidates.map((x) => [x.surface, x.start, x.end]))}`);
  assert.equal(c.start, 6); // و (4) ل (5) were peeled; the name starts at 6
  assert.equal(c.end, 9);
  // the ordinary verb, the preposition and the common noun are not nominated
  for (const w of ["ذهب", "إلى", "المدينة"]) assert.ok(!surfaces(r).includes(w), w);
});

test("the language is HEARD per sentence from the prefix when it is not given", () => {
  const text = "thanks for coming to the party last night, it was lovely and we all had a good time.\ntell priya and greg thanks for the dinner.\n李秀英也去了北京。\nmike will call sarah tomorrow about the meeting.";
  const r = nameCandidates(text);
  const names = surfaces(r);
  assert.ok(names.includes("priya"), `got ${names}`);
  assert.ok(names.includes("北京"));
  assert.ok(names.includes("mike") && names.includes("sarah"));
  const lang = (s) => r.candidates.find((c) => c.surface === s).evidence.language;
  assert.equal(lang("priya"), "eng");
  assert.ok(["cmn", "cmn-hans"].includes(lang("北京")), "the Chinese sentence is read with a Chinese prior, not the English one");
});

test("KNOWN LIMIT, pinned: a very short undeclared English sentence can be heard as another language (declare it)", (t) => {
  // The listener's evidence rule accepts a prior outright at 30% coverage; one five-word sentence is thin evidence.
  const heard = nameCandidates("tell priya and greg thanks.").language;
  t.diagnostic(`undeclared short sentence heard as: ${heard}`);
  assert.equal(nameCandidates("tell priya and greg thanks.", { language: "en" }).language, "eng");
});

test("CAUSAL: the candidates of a prefix are the candidates the full read gives for it", () => {
  const sentences = ["tell priya and greg thanks.", "mike will call sarah tomorrow.", "ask dr. patel about the schedule.", "lakshmi and jonas are away."];
  const full = nameCandidates(sentences.join("\n"));
  for (let k = 1; k < sentences.length; k++) {
    const prefix = sentences.slice(0, k).join("\n");
    const pre = nameCandidates(prefix);
    const same = full.candidates.filter((c) => c.end <= prefix.length);
    assert.deepEqual(sig({ candidates: same }), sig(pre), `prefix of ${k} sentences differs`);
  }
});

test("TYPED GAPS: no prior, no frame prior, language unheard; never another language's grammar", () => {
  const none = nameCandidates("kitchen soy mike went to boston", { language: "zzz" });
  assert.deepEqual(none.candidates, []);
  assert.deepEqual(none.gaps.map((g) => g.reason), ["no_prior"]);
  assert.match(none.gaps[0].detail, /never another language's grammar/);

  const noGrammar = nameCandidates("mike", { grammar: { language: null, gap: "declared absent" } });
  assert.deepEqual(noGrammar.candidates, []);
  assert.equal(noGrammar.gaps[0].reason, "no_prior");

  const noFrame = nameCandidates("tell priya and mike thanks", { grammar: { language: "eng", posPrior: EN.posPrior, framePrior: null } });
  assert.ok(noFrame.gaps.some((g) => g.reason === "no_frame_prior"));
  assert.ok(!surfaces(noFrame).includes("priya"), "an unseen word with no frame prior is neither guessed nor admitted");
  assert.ok(surfaces(noFrame).includes("mike"), "a prior-attested name still nominates without a frame prior");

  const unheard = nameCandidates("ก็ไปที่นั่นกับเพื่อน แล้วก็กลับบ้าน");
  assert.deepEqual(unheard.candidates, []);
  assert.ok(unheard.gaps.some((g) => g.reason === "language_unheard"));
});

test("control built to fail: a DERANGED frame prior changes what an unseen word is read as", () => {
  const keys = Object.keys(EN.framePrior.frames).sort();
  const frames = {};
  keys.forEach((k, i) => { frames[k] = EN.framePrior.frames[keys[(i + Math.floor(keys.length / 2)) % keys.length]]; });
  const bad = { ...EN, framePrior: { ...EN.framePrior, frames } };
  const text = "i asked priya whether jonas could come, then she can ask lakshmi";
  const good = nameUnits(text, { grammar: EN }).units.filter((u) => u.pathB).map((u) => [u.text, Number(u.mass.toFixed(3))]);
  const wrong = nameUnits(text, { grammar: bad }).units.filter((u) => u.pathB).map((u) => [u.text, Number(u.mass.toFixed(3))]);
  assert.notDeepEqual(wrong, good, "the frame prior carries information the deranged one does not");
});

test("the one cut is the repo's declared 0.5", () => {
  assert.equal(MIN_SHARE, 0.5);
  // raising it is the caller's declared choice and only removes frame-nominated words
  const lax = nameCandidates("tell priya thanks", { grammar: EN, minShare: 0.5 });
  const strict = nameCandidates("tell priya thanks", { grammar: EN, minShare: 0.99 });
  assert.ok(lax.candidates.length >= strict.candidates.length);
});
