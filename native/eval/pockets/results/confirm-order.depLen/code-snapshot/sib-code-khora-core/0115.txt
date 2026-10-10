// Language reach: beings are heard in any script, with no capital letters, and
// the shared tokenizers (the observables DMD decomposes) hear through the
// language's own ear. Every case asserts on a real received prior.
import test from "node:test";
import assert from "node:assert/strict";
import { splitSentences } from "../adapters/text/spans.js";
import { makeEar } from "../adapters/text/ear.js";
import { heardNominals } from "../adapters/text/heard-nominals.js";
import { hear, withEar } from "../adapters/text/active-ear.js";
import { tokens, readForward } from "../memory/activation.js";
import { extractGfpRelations } from "../adapters/text/relations-gfp.js";
import { grammarFor, detectLanguage, stemOf } from "../the-fold/language-grammar.js";
import { languageContextFor, extractSurfacesHeard } from "../the-fold/language-context.js";

const ear = (g) => makeEar({ posPrior: g.posPrior, proclitics: g.proclitics, enclitics: g.enclitics });

test("CJK and Arabic full stops end sentences with no following space", () => {
  assert.equal(splitSentences("玛丽亚在北京。约翰离开了！你好吗？").length, 3);
  assert.equal(splitSentences("ذهب جون. عاد ماريا؟ نعم.").length, 3);
  assert.equal(splitSentences("It cost 3.5 dollars. Fine.").length, 2); // the decimal point is still not a stop
});

test("the ear hears word boundaries in Simplified Chinese from its own prior", () => {
  const g = grammarFor("zh-Hans");
  assert.equal(g.language, "cmn-hans");
  const heard = ear(g).segment("玛丽亚在北京遇见了约翰");
  assert.deepEqual(heard.split(" "), ["玛丽亚", "在", "北京", "遇见", "了", "约翰"]);
});

test("a bare 'zh' picks the script variant the text attests", () => {
  assert.equal(grammarFor("zh", { text: "玛丽亚喜欢北京。后来玛丽亚给约翰写了信。" }).language, "cmn-hans");
  assert.equal(grammarFor("zh", { text: "後來瑪麗亞給約翰寫了信。他們喜歡北京。" }).language, "cmn");
});

test("Chinese beings are found with no case at all, unseen names included", () => {
  const g = grammarFor("zh-Hans");
  const text = "玛丽亚在北京遇见了约翰。玛丽亚喜欢北京。约翰星期一离开了北京。后来玛丽亚给约翰写了信。";
  const out = heardNominals(splitSentences(text), { posPrior: g.posPrior, framePrior: g.framePrior, segment: ear(g).segment, minMentions: 2 });
  const got = new Set(out.map((b) => b.surface));
  for (const n of ["玛丽亚", "北京", "约翰"]) assert.ok(got.has(n), `${n} missing from ${[...got]}`);
  assert.ok(!got.has("遇见") && !got.has("离开"), "verbs are not beings");
});

test("Arabic beings survive fused proclitics (بجون = ب + جون)", () => {
  const g = grammarFor("ar");
  const e = ear(g);
  assert.match(e.peel("التقت ماريا بجون"), /ب جون/);
  const text = "التقت ماريا بجون في القاهرة. أحبت ماريا القاهرة. غادر جون القاهرة يوم الاثنين. ثم كتبت ماريا إلى جون.";
  const got = new Set(heardNominals(splitSentences(text), { posPrior: g.posPrior, framePrior: g.framePrior, segment: e.segment, peel: e.peel, minMentions: 2 }).map((b) => b.surface));
  assert.ok(got.has("جون") && got.has("القاهرة"), [...got].join(" "));
});

test("non-standard English: lowercase, SMS-shaped text still yields its names and refuses its verbs and laughter", () => {
  const g = grammarFor("en");
  const text = [
    "maria lopez met john smith in boston lol", "hahaha maria lopez liked the city", "john smith left boston on monday",
    "later maria lopez wrote to john smith", "u wont believe what maria did", "i dont think john will come to boston",
  ].join(". ") + ".";
  const out = heardNominals(splitSentences(text), { posPrior: g.posPrior, framePrior: g.framePrior, minMentions: 2 });
  const got = new Set(out.map((b) => b.surface));
  for (const n of ["maria", "john", "boston"]) assert.ok(got.has(n), `${n} missing from ${[...got]}`);
  assert.ok(![...got].some((s) => /^ha(ha)+$/.test(s)), "laughter is not a being");
  assert.ok(!got.has("met") && !got.has("left"), "verbs are not beings");
});

test("a cased script keeps the capital tier and adds only what capitals cannot see", () => {
  const text = "Maria Lopez met John Smith in Boston. Maria Lopez liked the city. John Smith left Boston. later maria lopez wrote a letter. frisbee was fun. frisbee again.";
  const out = extractSurfacesHeard(splitSentences(text), {}).map((s) => s.surface.toLowerCase());
  assert.ok(out.includes("frisbee"), "an unseen lowercase being is added");
  assert.ok(!out.includes("city") && !out.includes("letter"), "settled common nouns stay with the descriptor tier");
});

test("no ear active: every shared tokenizer is unchanged", () => {
  const s = "Maria went to Boston and bought a book.";
  assert.equal(hear(s), s);
  assert.deepEqual(tokens(s), s.toLowerCase().match(/[\p{L}\p{N}']+/gu));
  assert.equal(withEar(null, () => hear(s)), s);
});

test("with the Chinese ear active, the observables DMD reads are words, not clauses", () => {
  const g = grammarFor("zh-Hans");
  const line = "玛丽亚在北京遇见了约翰。";
  assert.equal(tokens(line).length, 1);
  withEar(ear(g), () => assert.ok(tokens(line).length >= 5));
});

test("activation memory admits two-character Chinese words (the observables DMD reads), Latin floor unchanged", () => {
  const g = grammarFor("zh-Hans");
  // enough frames for a word to recur and be distinctive (idf band), cycled over varied filler
  const names = ["孔子", "颜渊", "鲁国", "弟子", "大夫", "春秋"];
  const fill = ["今天天气很好", "他们走过了桥", "书放在桌子上", "我们明天再说吧", "这是一个好办法", "河水流得很慢", "山上有很多树"];
  const frames = Array.from({ length: 120 }, (_, i) => ({ text: `${names[i % 6]}在${fill[i % 7]}${i % 11 === 0 ? names[(i + 3) % 6] : ""}。`, order: i }));
  const heard = withEar(ear(g), () => readForward(frames).records);
  const raw = readForward(frames).records;
  // a unspaced clause is one unique 'word' — it traces but never RECURS; only heard words ring (a cue = distinctive AND already recurring)
  const traced = (rs) => rs.filter((r) => r.codeSize > 0).length;
  assert.ok(traced(heard) > traced(raw), `${traced(raw)} -> ${traced(heard)}`);
  // Latin is untouched by the script floor
  const latin = Array.from({ length: 40 }, (_, i) => ({ text: `the ship crossed the harbour ${i % 5 === 0 ? "again" : "slowly"} near ${["dover", "calais", "hull"][i % 3]}`, order: i }));
  assert.deepEqual(readForward(latin).records.map((r) => r.traceSize), withEar(null, () => readForward(latin).records.map((r) => r.traceSize)));
});

test("GFP reads relations out of unspaced text through the ear", () => {
  const g = grammarFor("zh-Hans");
  const text = "孔子的弟子颜渊。孔子离开鲁国。颜渊在鲁国。孔子回到鲁国。颜渊跟随孔子。孔子的弟子颜渊在鲁国。";
  const none = extractGfpRelations(text, {});
  const some = withEar(ear(g), () => extractGfpRelations(text, {}));
  assert.ok(some.length > none.length, `${none.length} -> ${some.length}`);
});

test("language is detected from the words alone, and an unknown one is a typed gap", () => {
  assert.equal(detectLanguage("Мария встретила Ивана в Москве, и они пошли на рынок.").language, "rus");
  assert.equal(detectLanguage("التقت ماريا بجون في القاهرة وذهبا إلى السوق").language, "arb");
  assert.equal(detectLanguage("마리아는 서울에서 존을 만났다. 마리아는 서울을 좋아했다.").language, "kor");
  assert.equal(detectLanguage("マリアは東京でジョンに会った。").language, "jpn");
  assert.equal(grammarFor("tlh").language, null);
  assert.ok(grammarFor("tlh").gap);
  assert.equal(stemOf("tlh"), null);
});

test("languageContextFor: caseless script vs cased script is measured, never assumed", () => {
  assert.equal(languageContextFor("玛丽亚在北京遇见了约翰。玛丽亚喜欢北京。").casedScript, false);
  assert.equal(languageContextFor("Maria met John in Boston. Maria liked the city very much.").casedScript, true);
});
