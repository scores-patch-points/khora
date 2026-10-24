// opencode-form.test.mjs — the form layer's invariants, on synthetic corpora with known structure (no file, no model, no network).
import test from "node:test";
import assert from "node:assert/strict";
import { skeletonFrom, outlineFrom, slotsFrom, titleOf, cadenceOf, shuffledCadence, isFacetJoin, segment, PARAMS } from "./opencode-form.mjs";

// ── a synthetic essay corpus: 12 pieces, each with a question (3 terms) named first and returned to last, and middle parts each bringing a new term ──
const filler = (n, salt) => Array.from({ length: n }, (_, i) => ["filler", "words", "about", "things", "around", "there"][(i + salt) % 6]).join(" ");
// names are letters only: a term is a word form of letters, so `quest1a` would read as `quest` + `a` and recur across every piece
const L = (n) => "abcdefghijklmnopqrstuvwxyz"[n % 26].repeat(2);
const makeEssay = (p, { middles = 4, opens = 120, develops = 220, closes = 90 } = {}) => {
  const q = [`quest${L(p)}alpha`, `quest${L(p)}beta`, `quest${L(p)}gamma`];
  const terms = Array.from({ length: middles }, (_, i) => `motif${L(p)}x${L(i)}`);
  const para = (lead, words, salt) => `${lead}. ${filler(words, salt)}.`;
  const parts = [
    `## Opening\n\n${para(`The ${q[0]} and the ${q[1]} meet the ${q[2]}`, opens, 0)}`,
    ...terms.map((t, i) => `## Part ${i + 1}\n\n${para(`Here ${t} arrives with ${q[i % 3]} ${i > 0 ? `and ${terms[i - 1]} returns` : ""}`, develops, i + 1)}`),
    `## Closing\n\n${para(`So the ${q[0]} and ${q[1]} and ${terms[terms.length - 1]} close`, closes, 9)}`,
  ];
  return { name: `essay ${p}`, text: `# Piece ${p}\n\n${parts.join("\n\n")}` };
};
const corpus = Array.from({ length: 12 }, (_, p) => makeEssay(p + 1));

test("skeleton: the three roles are found on a corpus with known structure, with the parameters printed", () => {
  const sk = skeletonFrom({ pieces: corpus, kind: "essay" });
  assert.equal(sk.n, 12);
  assert.equal(sk.shaped, 12);
  const role = (r) => sk.parts.find((p) => p.role === r);
  assert.equal(role("opens").recurrence.share, 1);
  assert.equal(role("closes").recurrence.share, 1);
  assert.equal(role("develops").recurrence.share, 1);
  assert.ok(sk.params.k === PARAMS.k && typeof sk.params.pieceShare === "number", "the parameters ride the skeleton");
  // the filler words appear in every piece: measured out as furniture, never listed
  assert.ok(sk.furniture >= 6, `furniture measured: ${sk.furniture}`);
  // words per role from the pieces' own lengths (the lead sentence adds a few words to each part)
  assert.ok(Math.abs(role("opens").words.median - 128) <= 6, `opens median ${role("opens").words.median}`);
  assert.ok(Math.abs(role("develops").words.median - 228) <= 8, `develops median ${role("develops").words.median}`);
  assert.ok(Math.abs(role("closes").words.median - 98) <= 6, `closes median ${role("closes").words.median}`);
  assert.equal(sk.partsPerPiece.median, 6);
});

test("skeleton: a corpus with no return (every part its own terms) shows near-zero shares, not an invented shape", () => {
  const flat = Array.from({ length: 12 }, (_, p) => ({ name: `flat ${p}`, text: `# F\n\n${Array.from({ length: 5 }, (_, i) => `## P${i}\n\nOnly term${L(p)}n${L(i)} here. ${filler(60, i)}.`).join("\n\n")}` }));
  const sk = skeletonFrom({ pieces: flat, kind: "essay" });
  for (const r of sk.parts) assert.equal(r.recurrence.share, 0, `${r.role} share ${r.recurrence.share}`);
});

test("segmenter: without headings, parts are cut where a paragraph introduces terms later paragraphs return to", () => {
  const text = `Alpha beta gamma opens. ${filler(30, 0)}.\n\nStill about alpha and beta. ${filler(30, 1)}.\n\nNow deltaterm and epsilonterm arrive. ${filler(30, 2)}.\n\nDeltaterm and epsilonterm again. ${filler(30, 3)}.\n\nDeltaterm once more with epsilonterm. ${filler(30, 4)}.`;
  const s = segment(text, { params: { ...PARAMS, k: 2 } });
  assert.equal(s.by, "recurrence");
  assert.equal(s.parts.length, 2, s.parts.map((p) => p.text.slice(0, 30)).join(" | "));
});

// ── the second kind: tables (header row + rows), a segmenter per kind, the same recurrence measure ──
const makeTable = (p, rows = 5) => {
  const cols = [`metric${L(p)}`, `value${L(p)}`, `source${L(p)}`];
  // the header's column terms return in SOME rows (never all: a term in every part is the piece's own vocabulary), and the total row returns to the header
  const body = Array.from({ length: rows }, (_, i) => `| ${i % 2 === 0 ? cols[0] : "other"} item${L(p)}r${L(i)} | ${i * 10} | ${i % 3 === 0 ? cols[2] : "none"} note${L(p)}r${L(i)} |`);
  return { name: `table ${p}`, text: `| ${cols.join(" | ")} |\n|---|---|---|\n${body.join("\n")}\n| total ${cols[0]} | ${rows * 10} | ${cols[2]} |` };
};
test("second kind: a table is segmented into header row and rows, and its skeleton is measured by the same rule", () => {
  const s = segment(makeTable(1).text, { kind: "table" });
  assert.equal(s.by, "table");
  assert.equal(s.parts.length, 7);
  assert.equal(s.parts[0].heading, "header");
  const sk = skeletonFrom({ pieces: Array.from({ length: 12 }, (_, p) => makeTable(p + 1)), kind: "table" });
  assert.equal(sk.segmenter, "table");
  assert.equal(sk.segmented.table, 12);
  // the header's column terms return in the rows; the total row returns to the header: measured, not assumed
  assert.equal(sk.parts.find((p) => p.role === "opens").recurrence.share, 1);
  assert.equal(sk.parts.find((p) => p.role === "closes").recurrence.share, 1);
  assert.equal(sk.partsPerPiece.median, 7);
});

test("kinds: a list and a code file are segmented by their own units; an unknown kind is prose", () => {
  const list = segment(`Lead line.\n- first item alpha\n  continued\n- second item beta\n- third item gamma`, { kind: "list" });
  assert.equal(list.by, "list");
  assert.equal(list.parts.length, 4);
  const code = segment(`// a header comment\n// two lines\nexport const a = 1;\nfunction b() {\n  return a;\n}\nexport default b;`, { kind: "code" });
  assert.equal(code.by, "code");
  assert.deepEqual(code.parts.map((p) => p.heading), ["comment", "export const a = 1;", "function b() {", "export default b;"]);
  assert.equal(segment(`# T\n\n## A\n\n${filler(20, 0)}\n\n## B\n\n${filler(20, 1)}\n\n## C\n\n${filler(20, 2)}`, { kind: "poem" }).by, "heading");
});

// ── outlineFrom on a plain slot list ──
const slots = [
  { id: "a", label: "harbor · ships", terms: ["harbor", "ship"], text: "The harbor sheltered ships from the storm. Ships waited in the harbor for the tide. Keepers watched the harbor lamps." },
  { id: "b", label: "lamps · keepers", terms: ["lamp", "keeper"], text: "The keepers trimmed the lamps every night. A lamp failed and the keeper climbed the tower. Ships depended on the lamp." },
  { id: "c", label: "tower · stone", terms: ["tower", "stone"], text: "The tower was built of stone in 1790. Stone towers outlasted wooden ones. Ships steered by the tower, which kept the lamp above the storm." },
  { id: "d", label: "storm · tide", terms: ["storm", "tide"], text: "Storms drove ships toward the harbor at high tide. The tide and the storm decided when ships could enter the harbor." },
  { id: "z", label: "recipes · cheese", terms: ["recipe", "cheese"], text: "Recipes with cheese vary by region. Cheese recipes appear in cookbooks." },
];
const skeleton = skeletonFrom({ pieces: corpus, kind: "essay" });

test("outline: the opener is the slot whose terms recur in the most other slots; the closer shares the most with it", () => {
  const o = outlineFrom({ tree: slots, skeleton, topic: "lighthouses" });
  assert.equal(o.outline[0].role, "opens");
  assert.equal(o.outline[0].slot, "a", JSON.stringify(o.measures.opener));
  assert.equal(o.outline[o.outline.length - 1].role, "closes");
  assert.equal(o.outline[o.outline.length - 1].slot, "d");
  assert.ok(o.outline.slice(1, -1).every((s) => s.role === "develops"));
});

test("outline: a slot fitting no part goes to the appendix; nothing is dropped", () => {
  const o = outlineFrom({ tree: slots, skeleton, topic: "lighthouses" });
  assert.equal(o.appendix.length, 1);
  assert.equal(o.appendix[0].slot, "z");
  assert.equal(o.outline.length + o.appendix.length, slots.length);
  assert.ok(o.appendix[0].title.length > 0);
});

test("titles: a clause of the slot's own sentences, never two facet nouns joined by and; the term alone when no clause carries them", () => {
  const o = outlineFrom({ tree: slots, skeleton, topic: "lighthouses", reader: { words: ["lighthouses", "storm"] } });
  for (const s of [...o.outline, ...o.appendix]) {
    assert.ok(!isFacetJoin(s.title), `facet-join title: ${s.title}`);
    assert.notEqual(s.title, "Harbor and ships");
  }
  assert.ok(isFacetJoin("Asia and bulls") && isFacetJoin("Alexandria and lighthouse") && !isFacetJoin("Ships waited in the harbor"));
  const rows = slotsFrom(slots);
  const a = titleOf(rows.find((r) => r.id === "a"));
  assert.ok(/harbor/i.test(a.title) && /ship/i.test(a.title), a.title);
  assert.ok(a.by.startsWith("clause"), a.by);
  // no sentence carries the terms: the top term alone
  const bare = titleOf({ ...rows[0], sentences: [], terms: ["harbor"] });
  assert.equal(bare.title, "Harbor");
  assert.equal(bare.by, "term alone");
});

test("measure: every section's words lie within the skeleton's IQR for its role", () => {
  const o = outlineFrom({ tree: slots, skeleton, topic: "lighthouses" });
  for (const s of o.outline) {
    const part = skeleton.parts.find((p) => p.role === s.role);
    assert.ok(s.words >= part.words.iqr[0] && s.words <= part.words.iqr[1], `${s.role} ${s.words} outside ${part.words.iqr}`);
  }
});

test("cadence: the chosen order's mean step is above the shuffled orders' mean", () => {
  const rows = slotsFrom(slots).filter((r) => r.id !== "z");
  const o = outlineFrom({ tree: slots, skeleton, topic: "lighthouses" });
  const order = o.order.map((id) => rows.findIndex((r) => r.id === id));
  const chosen = cadenceOf(rows, order);
  const nul = shuffledCadence(rows, order, { trials: 200, seed: 7 });
  assert.ok(chosen.mean > nul.mean, `chosen ${chosen.mean} vs shuffled ${nul.mean}`);
  assert.equal(chosen.steps.length, rows.length - 1);
});

test("outline: the kind asked for is laid onto its own skeleton; another kind's skeleton is used and disclosed", () => {
  const tsk = skeletonFrom({ pieces: Array.from({ length: 12 }, (_, p) => makeTable(p + 1)), kind: "table" });
  const o = outlineFrom({ tree: slots, skeleton: tsk, kind: "table", topic: "lighthouses" });
  assert.equal(o.measures.kind, "table");
  assert.equal(o.measures.kindMismatch, null);
  const m = outlineFrom({ tree: slots, skeleton, kind: "brief", topic: "lighthouses" });
  assert.deepEqual(m.measures.kindMismatch, { asked: "brief", skeleton: "essay" });
});
