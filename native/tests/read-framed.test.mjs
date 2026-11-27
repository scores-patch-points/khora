// tests/read-framed.test.mjs — THE PROOF that the canonical reader and the chat are one system for frames: the same layer, two doors, hand-labelled gold, a regression for each defect the alignment found, and a measured parity.
// Needs the reader's priors (KHORA_PRIORS_DIR), the pharos clone (PHAROS_HOME) and the act prior (Zenodotus beside khora); skips without them, saying why.
import test from "node:test"; import assert from "node:assert/strict";
let readFramed = null, why = null, ingestDocument = null, mkThread = null;
try {
  ({ readFramed } = await import("../the-fold/read-framed.mjs")); ({ ingestDocument } = await import("../chat/ingest.mjs"));
  const { makeThread } = await import("../chat/thread.mjs"); mkThread = () => makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-26T10:00:00") });
  await readFramed("Mr. Bennet made no answer. ".repeat(10), { language: "eng" });
} catch (e) { why = String(e?.message ?? e).slice(0, 140); readFramed = null; }
const T = { skip: readFramed ? false : `no canonical reader here: ${why}` };

// passages with their hand labels. Each is a paragraph; the whole document is read ONCE through the canonical door.
// gold: [form, framed (inside quotation marks), reported (inside what a speech verb reported; null = unknown), head of the holder of the report]
const PASSAGES = [
  { t: "“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”", g: [["said", false, false, null], ["heard", true, false, null]] },
  { t: "Mr. Bennet replied that he had not.", g: [["replied", false, false, null], ["had", false, true, "Bennet"]] },
  { t: "“But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”", g: [["returned", false, false, null], ["told", true, false, null]] },
  { t: "“Hello,” said Pierre, and he left.", g: [["said", false, false, null], ["left", false, false, null]] },
  { t: "And God said, Let there be light: and there was light.", g: [["said", false, false, null], ["be", false, true, "God"], ["was", false, null, "God"]] },
  { t: "And the LORD God said unto the woman, What is this that thou hast done?", g: [["said", false, false, null], ["done", false, true, "LORD"]] },
  { t: "And the woman said, The serpent beguiled me, and I did eat.", g: [["said", false, false, null], ["beguiled", false, true, "woman"], ["eat", false, null, "woman"]] },
  { t: "Now the serpent was more subtil than any beast of the field which the LORD God had made.", g: [["made", false, false, null]] },
];
const DOC = PASSAGES.map((p) => p.t).join("\n\n"), starts = []; { let at = 0; for (const p of PASSAGES) { starts.push(at); at += p.t.length + 2; } }
const passageOf = (offset) => starts.filter((s) => s <= offset).length - 1;
const framesByPassage = (w) => { const out = PASSAGES.map(() => []); for (const f of w.frames.frames) out[passageOf(w.parse.find((p) => p.order === f.order).offset)].push(f); return out; };

test("the language must be declared: none, or one the reader does not hold, is a typed gap and no frames (never an English reading)", T, async () => {
  const a = await readFramed("Mr. Bennet made no answer. ".repeat(10), {}); assert.equal(a.frames.frames.length, 0); assert.equal(a.frames.gaps[0].gap, "language_not_declared");
  const b = await readFramed("Mr. Bennet made no answer. ".repeat(10), { language: "xxx" }); assert.equal(b.frames.frames.length, 0); assert.equal(b.frames.gaps[0].gap, "language_not_held");
});

test("GOLD through the canonical door: 8 passages, quotation marks and no marks, every labelled verb framed and reported exactly as hand-labelled", T, async () => {
  const w = await readFramed(DOC, { language: "eng" }); const by = framesByPassage(w), wrong = [], miss = []; let n = 0;
  PASSAGES.forEach((p, pi) => { for (const [form, framed, reported, head] of p.g) { n++; const f = by[pi].find((x) => x.form === form); if (!f) { miss.push(`${pi}:${form}`); continue; } if (f.framed !== framed || f.reported !== reported || (head && f.reportedHead !== head)) wrong.push(`${pi}:${form} framed=${f.framed} reported=${f.reported} head=${f.reportedHead} want ${framed}/${reported}/${head}`); } });
  console.log(`# canonical gold: ${n - miss.length} of ${n} verbs found; wrong ${wrong.length}; not found ${miss.join(",") || "-"}`);
  assert.deepEqual(wrong, [], wrong.join(" | ")); assert.deepEqual(miss, [], `not found: ${miss}`);
});

test("REGRESSION found by aligning the doors: a quotation that closed in the PREVIOUS paragraph is not the tag of this paragraph's speech verb ('replied that he had not' must still be reported)", T, async () => {
  const w = await readFramed(DOC, { language: "eng" }), had = framesByPassage(w)[1].find((x) => x.form === "had");
  assert.equal(had.reported, true); assert.equal(had.mode, "indirect"); assert.equal(had.reportedHead, "Bennet");
});

test("TRAP: narration is never framed or reported, and a marked quotation's tag does not make the narration after it speech", T, async () => {
  const w = await readFramed(DOC, { language: "eng" }), by = framesByPassage(w);
  for (const f of by[7]) { assert.equal(f.framed, false); assert.equal(f.reported, false); }
  assert.equal(by[3].find((x) => x.form === "left").reported, false);
});

test("a quotation that continues into the next paragraph (the English convention: the next opens again without the last closing) keeps its verbs framed across the break, and says so", T, async () => {
  const doc = "“I went to the market and I bought the bread that morning, and the baker told me about the fire in the old mill.\n\n“Then I walked home and I ate the bread and I slept.” Pierre laughed at the story and told nobody.";
  const w = await readFramed(doc + " " + "Mr. Bennet made no answer. ".repeat(4), { language: "eng" }), f = (form) => w.frames.frames.filter((x) => x.form === form);
  assert.ok(f("went").every((x) => x.framed === true) && f("walked").every((x) => x.framed === true), "verbs on both sides of the paragraph break are inside the quotation");
  assert.ok(w.frames.gaps.some((g) => g.gap === "quotation_continues" || g.gap === "quotation_continued"), JSON.stringify(w.frames.gaps));
  assert.ok(f("laughed").every((x) => x.framed === false), "narration after the closing mark is not framed");
});

test("PARITY: the chat door and the canonical door, one layer, agree on every labelled verb; the overall agreement is measured", T, async () => {
  const w = await readFramed(DOC, { language: "eng" }), canon = framesByPassage(w), th = await mkThread(), r = await ingestDocument(th, DOC);
  let both = 0, agree = 0, disagree = [];
  PASSAGES.forEach((p, pi) => { for (const [form] of p.g) { const a = canon[pi].find((x) => x.form === form), b = r.frames.find((x) => x.para === pi && x.form === form); if (!a || !b) continue; both++; if (a.framed === b.framed && a.reported === b.reported) agree++; else disagree.push(`${pi}:${form} canon ${a.framed}/${a.reported} chat ${b.framed}/${b.reported}`); } });
  console.log(`# parity on labelled verbs: ${agree} of ${both} agree${disagree.length ? "; differ: " + disagree.join(" | ") : ""}`);
  assert.ok(both >= 10, `too few verbs found by both doors: ${both}`); assert.deepEqual(disagree, [], disagree.join(" | "));
});

test("the clause tree is an independent witness: the canonical clause tree and the position rule are compared, never merged (counts only)", T, async () => {
  const w = await readFramed(DOC, { language: "eng" }), c = w.frames.crossCheck; assert.ok(c && typeof c.both === "number", JSON.stringify(c)); assert.equal(c.onlyTree, 0, "every sentence the tree calls speech is one the layer also reports: " + JSON.stringify(c));
  console.log(`# clause tree v. position rule on reported speech: layer ${c.reportedByLayer}, tree ${c.speechComplementByTree}, both ${c.both}, only layer ${c.onlyLayer}, only tree ${c.onlyTree}`);
});
