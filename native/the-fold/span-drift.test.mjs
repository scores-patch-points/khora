import test from "node:test";
import assert from "node:assert/strict";
import { driftOf, driftAll, findAll, sourceMap, MIN_RELOCATE_CHARS } from "./span-drift.js";
import { drift } from "./relative-pattern.js";

const NOTE = "The bridge opened to traffic in 1932.";
const page = `Intro text here. ${NOTE} Closing words.`;
const at = (name, hay, note = NOTE) => { const s = hay.indexOf(note); return `${name}#${s}-${s + note.length}`; };

test("exact: the address names the cited words", () => {
  const v = driftOf({ address: at("a", page), text: NOTE }, { a: page });
  assert.deepEqual(v, { kind: "exact", at: at("a", page) });
});

test("shifted: the same words moved within the same source; the old address is kept beside the new", () => {
  const was = at("a", page);
  const edited = `A new first paragraph was added above. ${page}`;
  const v = driftOf({ address: was, text: NOTE }, { a: edited });
  assert.equal(v.kind, "shifted");
  assert.equal(v.was, was);
  assert.equal(v.at, at("a", edited));
  assert.equal(edited.slice(v.start, v.end), NOTE);
  assert.equal(v.ambiguous, false);
});

test("moved: the same words in another source, never reported as gone", () => {
  const v = driftOf({ address: at("a", page), text: NOTE }, { a: "Nothing relevant remains.", b: `Elsewhere. ${NOTE}` });
  assert.equal(v.kind, "moved");
  assert.equal(v.source, "b");
  assert.equal(v.at, at("b", `Elsewhere. ${NOTE}`));
});

test("gone: no loaded source holds the words — a typed gap, not prose", () => {
  const other = "Totally different text; nothing that was cited survives anywhere in this long replacement page.";
  assert.ok(other.length > at("a", page).split("-")[1]);
  const v = driftOf({ address: at("a", page), text: NOTE }, { a: other });
  assert.equal(v.kind, "gone");
  assert.equal(v.gap.type, "address_names_other_bytes");
});

test("source_absent is a gap on gone, not a refutation: the page is simply not loaded", () => {
  const v = driftOf({ address: "a#17-54", text: NOTE }, {});
  assert.equal(v.kind, "gone");
  assert.equal(v.gap.type, "source_absent");
  assert.equal(v.gap.source, "a");
});

test("malformed and beyond-source addresses are typed gaps", () => {
  const nothing = { a: "a page that holds none of the cited words" };
  assert.equal(driftOf({ address: "nope", text: NOTE }, nothing).gap.type, "address_malformed");
  assert.equal(driftOf({ address: "a#0-99999", text: NOTE }, nothing).gap.type, "address_beyond_source");
});

test("a malformed address does not hide words a loaded page still holds: they are found, `moved`, with the bad address kept as `was`", () => {
  const v = driftOf({ address: "nope", text: NOTE }, { a: page });
  assert.equal(v.kind, "moved");
  assert.equal(v.was, "nope");
  assert.equal(v.at, at("a", page));
});

test("ambiguity is said, not resolved silently: a shift picks the occurrence nearest the old start", () => {
  const hay = `${NOTE} filler filler filler ${NOTE}`;
  const second = hay.lastIndexOf(NOTE);
  const v = driftOf({ address: `a#${second + 3}-${second + 3 + NOTE.length}`, text: NOTE }, { a: hay });
  assert.equal(v.kind, "shifted");
  assert.equal(v.ambiguous, true);
  assert.equal(v.candidates, 2);
  assert.equal(v.start, second);
});

test("a move across several holders says so and takes the first loaded source in order", () => {
  const v = driftOf({ address: "gone#0-40", text: NOTE }, { b: NOTE, c: NOTE });
  assert.equal(v.kind, "moved");
  assert.equal(v.source, "b");
  assert.equal(v.ambiguous, true);
  assert.equal(v.candidates, 2);
});

test("whitespace-loose: the same words in the same order across a changed line break", () => {
  const edited = "Intro. The bridge opened\n   to traffic in 1932. Closing.";
  const v = driftOf({ address: at("a", page), text: NOTE }, { a: edited });
  assert.equal(v.kind, "shifted");
  assert.equal(edited.slice(v.start, v.end), "The bridge opened\n   to traffic in 1932.");
});

test("nothing fuzzy: a changed word is gone, never 'close enough'", () => {
  const edited = "Intro. The bridge opened to traffic in 1933. Closing.";
  assert.equal(driftOf({ address: at("a", page), text: NOTE }, { a: edited }).kind, "gone");
});

test("too short to relocate: exact still holds, but a short text is never shifted or moved", () => {
  const short = "Yes it is";
  assert.ok(short.length < MIN_RELOCATE_CHARS);
  const hay = `Q? ${short}. Another ${short}.`;
  const s = hay.indexOf(short);
  assert.equal(driftOf({ address: `a#${s}-${s + short.length}`, text: short }, { a: hay }).kind, "exact");
  const v = driftOf({ address: `a#0-${short.length}`, text: short }, { a: hay });
  assert.equal(v.kind, "gone");
  assert.equal(v.gap.type, "too_short_to_relocate");
  assert.equal(v.gap.cause.type, "address_names_other_bytes");
});

test("it never rewrites: inputs are untouched and the verdict is a fresh object", () => {
  const span = Object.freeze({ address: at("a", page), text: NOTE });
  const sources = Object.freeze({ a: `Added. ${page}` });
  const v = driftOf(span, sources);
  assert.equal(span.address, at("a", page));
  assert.equal(v.kind, "shifted");
});

test("agrees with relative-pattern.js's drift on the kinds both can name", () => {
  const cases = [
    { address: at("a", page), text: NOTE, sources: { a: page } },
    { address: at("a", page), text: NOTE, sources: { a: `Added. ${page}` } },
    { address: at("a", page), text: NOTE, sources: { a: "nothing", b: `x ${NOTE}` } },
    { address: at("a", page), text: NOTE, sources: { a: "nothing cited survives in this text at all" } },
  ];
  for (const c of cases) {
    const mine = driftOf(c, c.sources), theirs = drift(c.address, c.text, c.sources);
    assert.equal(mine.kind, theirs.kind);
    if (theirs.at && theirs.kind !== "exact") assert.equal(mine.at, theirs.at);
  }
});

test("sources may be an object, a Map, or an array of {ref,text}; unloaded texts are absent, not empty", () => {
  assert.deepEqual(sourceMap({ a: "x", b: null, c: 3 }), { a: "x" });
  assert.deepEqual(sourceMap(new Map([["a", "x"], ["b", undefined]])), { a: "x" });
  assert.deepEqual(sourceMap([{ ref: "a", text: "x" }, { name: "b", text: "y" }, { source: "c" }, null]), { a: "x", b: "y" });
  const v = driftOf({ address: at("a", page), text: NOTE }, [{ ref: "a", text: page }]);
  assert.equal(v.kind, "exact");
});

test("driftAll counts every verdict and lists the stale ones in order", () => {
  const spans = [
    { address: at("a", page), text: NOTE },
    { address: "a#0-5", text: "Closing words." },
    { address: "z#0-9", text: "A sentence that no loaded page holds anywhere." },
  ];
  const out = driftAll(spans, { a: page });
  assert.deepEqual(out.counts, { exact: 1, shifted: 1, moved: 0, gone: 1 });
  assert.deepEqual(out.stale.map((r) => r.drift.kind), ["shifted", "gone"]);
  assert.equal(out.stale[0].span, spans[1]);
  assert.deepEqual(driftAll(undefined, {}).counts, { exact: 0, shifted: 0, moved: 0, gone: 0 });
});

test("findAll: every exact occurrence, else the first loose one, else none", () => {
  assert.equal(findAll("ab ab ab", "ab").length, 3);
  assert.equal(findAll("a  b", "a b").length, 1);
  assert.deepEqual(findAll("zzz", "ab"), []);
  assert.deepEqual(findAll("zzz", ""), []);
});
