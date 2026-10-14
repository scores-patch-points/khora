// read-across.test.mjs — the cross-source loop, falsified.
//
// The sources are GENERATED from pseudo-words (syllables, no language), so nothing here can be a word the engine
// was taught: a topic is a lexicon of invented words, a source is sentences drawn from a few topics among shared
// function words. The same corpus shape is then run with the mechanism removed. A finding that survives its own
// control is not a finding.
import test from "node:test";
import assert from "node:assert/strict";
import { readAcross, readSource, sentencesAt } from "./read-across.js";

function rng(seed) { let x = seed >>> 0 || 1; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }
const SYL = ["ka", "to", "mi", "ra", "ve", "lo", "su", "ne", "pi", "do", "zu", "fe", "ba", "gi", "ho", "ta"];
function coin(r, n = 3) { let w = ""; for (let i = 0; i < n; i++) w += SYL[Math.floor(r() * SYL.length)]; return w; }
function lexicon(seed, count, taken) {
  const r = rng(seed), out = [];
  while (out.length < count) { const w = coin(r, 3 + Math.floor(r() * 2)); if (!taken.has(w) && !out.includes(w)) { out.push(w); taken.add(w); } }
  return out;
}
const taken = new Set();
const FN = lexicon(1, 14, taken);                       // the connective tissue every source shares
const TOPICS = Array.from({ length: 7 }, (_, i) => lexicon(100 + i, 14, taken));
const NAME = lexicon(900, 5, taken);                    // the words of the attachment's title
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// sentences: function words as glue, `n` words of the topic, a fresh sentence each
function talk(topics, n, seed, words = 12) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const t = TOPICS[topics[i % topics.length]], w = [];
    for (let j = 0; j < words; j++) w.push(r() < 0.45 ? t[Math.floor(r() * t.length)] : FN[Math.floor(r() * FN.length)]);
    out.push(cap(w.join(" ")) + ".");
  }
  return out;
}
const doc = (id, title, sentences) => ({ id, title, text: sentences.join(" ") });

// B is the attachment: six sections, one per topic 0..5, each said a few times; its title is NAME words.
const TITLE_B = NAME.slice(0, 4).join(" ") + " " + NAME[4];
// An exhibit is a catalogue: each item said once under its section, so its items are claim forms (a word said once has
// no spread to measure) and the connective tissue between them is the glue.
const B = () => doc("exhibit", TITLE_B, [0, 1, 2, 3, 4, 5].map((t) => cap(FN[t]) + " " + TOPICS[t].join(" ") + " " + FN[(t + 3) % FN.length] + "."));
// A approves B: says its title once, then speaks only of topics 0 and 1
const A = (names = true) => doc("approval", "Approval", [
  ...(names ? [cap(NAME.slice(0, 4).join(" ")) + " " + FN[0] + " " + NAME[4] + " " + FN[1] + " " + FN[2] + "."] : [cap(FN.slice(0, 5).join(" ")) + "."]),
  ...talk([0, 1], 14, 300),
]);
// C and D are two independent discussions that both keep returning to topic 4, and otherwise speak of what the
// exhibit does not hold (topic 6). Each is NARROW: a source that touched every part of the exhibit would share
// words with every other such source by chance, and the loop's null would rightly refuse to call that corroboration.
const C = () => doc("talk-one", "Talk one", [...talk([4], 9, 400), ...talk([6], 8, 401)]);
const D = () => doc("talk-two", "Talk two", [...talk([4], 9, 500), ...talk([6], 8, 501)]);
const E = () => doc("elsewhere", "Elsewhere", talk([6], 20, 600));

const forms = (r, kind, tier) => r.findings.concat(r.candidates).filter((f) => f.kind === kind && (!tier || f.tier === tier));
const top = (r) => forms(r, "left-out").map((f) => f.form);

test("READ: sentence offsets are exact, and every mark is a slice of the text given", () => {
  const d = A();
  const s = readSource(d);
  s.sents.forEach((x) => assert.equal(d.text.slice(x.s, x.e), x.text));
  assert.ok(sentencesAt("Una frase. Otra frase más.", "es").length === 2);
});

test("NAMES: a source that carries the attachment's title in one sentence names it, with no cue word read", () => {
  const r = readAcross({ documents: [A(), B(), C(), D(), E()] });
  const n = r.findings.filter((f) => f.kind === "names" && f.from === "approval" && f.to === "exhibit");
  assert.equal(n.length, 1, "approval → exhibit is licensed");
  assert.ok(/of 5 title forms/.test(n[0].basis));
  n[0].marks.forEach((m) => assert.equal(m.text, [...A().text].slice(m.s, m.e).join("")));
  // and nothing else is licensed: the talks do not name the exhibit
  assert.deepEqual(r.findings.filter((f) => f.kind === "names").map((f) => f.from + ">" + f.to), ["approval>exhibit"]);
});

test("CONTROL: the same approval without the naming sentence names nothing", () => {
  const r = readAcross({ documents: [A(false), B(), C(), D(), E()] });
  assert.equal(r.findings.filter((f) => f.kind === "names").length, 0);
  assert.equal(forms(r, "left-out").length, 0, "no names, so no omission is read");
});

test("CONTROL: an unrelated attachment is not named, however much the source talks", () => {
  const unrelated = doc("other", NAME.slice(0, 4).map((w) => w.split("").reverse().join("")).join(" "), talk([5], 18, 700));
  const r = readAcross({ documents: [A(), unrelated, C(), D(), E()] });
  assert.equal(r.findings.filter((f) => f.kind === "names" && f.to === "other").length, 0);
});

test("LEFT-OUT: what the attachment says, the approval never does, and two sources return to, is licensed and led", () => {
  const r = readAcross({ documents: [A(), B(), C(), D(), E()] });
  const lic = forms(r, "left-out", "corroborated").map((f) => f.form);
  assert.ok(lic.length >= 6, `the topic-4 words are corroborated (got ${lic.length})`);
  // every licensed form is a topic-4 word, a word of the lexicon C and D both returned to
  const t4 = new Set(TOPICS[4]);
  lic.forEach((w) => assert.ok(t4.has(w), `${w} is topic 4`));
  // topics 0 and 1 are what the approval says: never omitted
  const said = new Set([...TOPICS[0], ...TOPICS[1]]);
  top(r).forEach((w) => assert.ok(!said.has(w), `${w} is said by the approval`));
  // marks: byte-exact in the attachment and in each attending source
  forms(r, "left-out", "corroborated").forEach((f) => f.marks.forEach((m) => {
    const src = { exhibit: B(), "talk-one": C(), "talk-two": D() }[m.doc];
    assert.equal(src.text.slice(m.s, m.e), m.text);
  }));
});

test("FALSIFIER: if the two other sources do not return to the omission, nothing is licensed (testimony only)", () => {
  const C2 = doc("talk-one", "Talk one", [...talk([4], 9, 400), ...talk([6], 8, 401)]);
  const D2 = doc("talk-two", "Talk two", [...talk([6], 17, 501)]);              // no topic 4 here
  const r = readAcross({ documents: [A(), B(), C2, D2, E()] });
  assert.equal(forms(r, "left-out", "corroborated").length, 0);
  assert.ok(forms(r, "left-out").length > 0, "topic 4 is still held below the line, as testimony or possible");
});

test("FALSIFIER: when the other sources return to what the approval DOES say, there is no omission to flag", () => {
  const C3 = doc("talk-one", "Talk one", talk([0], 17, 410));
  const D3 = doc("talk-two", "Talk two", talk([1], 17, 510));
  const r = readAcross({ documents: [A(), B(), C3, D3, E()] });
  assert.equal(forms(r, "left-out", "corroborated").length, 0);
});

test("DETERMINISTIC: the same input gives the same findings, in any order of sources", () => {
  const a = readAcross({ documents: [A(), B(), C(), D(), E()] });
  const b = readAcross({ documents: [E(), D(), C(), B(), A()] });
  const k = (r) => r.findings.map((f) => `${f.kind}:${f.from}>${f.to}:${f.form ?? ""}`).sort();
  assert.deepEqual(k(a), k(b));
});

test("ABSENT: a thing spoken of in several modified ways that no source says is held as a candidate, never licensed", () => {
  // the talk speaks of THING in three differently-modified ways; the approval and the exhibit say THING only plainly
  const THING = TOPICS[5][0], M = [TOPICS[6][0], TOPICS[6][1], TOPICS[6][2]];
  // each instance is said twice in its sentence, so it is clustered (a claim form), as a topic is
  const sentences = [
    cap(M[0]) + " " + THING + " " + FN[0] + " " + M[0] + " " + THING + ".",
    cap(M[1]) + " " + THING + " " + FN[2] + " " + M[1] + " " + THING + ".",
    cap(FN[4]) + " " + M[2] + " " + THING + " " + FN[5] + " " + M[2] + " " + THING + ".",
    ...talk([2], 12, 800),
  ];
  const talkDoc = doc("talk-one", "Talk one", sentences);
  const exhibit = doc("exhibit", TITLE_B, [cap(THING) + " " + FN[0] + " " + FN[3] + ".", ...talk([5], 8, 801)]);
  const r = readAcross({ documents: [A(), exhibit, talkDoc, D(), E()] });
  const abs = r.candidates.filter((c) => c.kind === "absent" && c.from === "talk-one" && c.form === THING);
  assert.equal(abs.length, 1, "the head is found");
  assert.equal(abs[0].tier, "possible");
  assert.ok(abs[0].instances >= 3);
  assert.equal(r.findings.filter((f) => f.kind === "absent").length, 0, "never licensed");
  // and if a source DOES say one of the instances, that instance is held and drops out
  const held = doc("exhibit", TITLE_B, [cap(M[0]) + " " + THING + " " + FN[0] + ".", cap(THING) + " " + FN[3] + ".", ...talk([5], 8, 801)]);
  const r2 = readAcross({ documents: [A(), held, talkDoc, D(), E()] });
  const abs2 = r2.candidates.find((c) => c.kind === "absent" && c.from === "talk-one" && c.form === THING);
  assert.ok(!abs2 || !abs2.phrases.some((p) => p.phrase === M[0] + " " + THING), "an instance another source says is not absent");
});

test("SCOPE: fewer than two sources reads nothing and says so", () => {
  const r = readAcross({ documents: [A()] });
  assert.equal(r.findings.length, 0);
  assert.ok(r.gaps.includes("need_two_sources"));
});
