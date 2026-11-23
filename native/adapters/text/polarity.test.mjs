// polarity.test.mjs — the evaluative polarity giver: a word's sign along the evaluative axis.
// The falsification (co-occurrence conflates antonyms) is pinned here: the polarity must separate
// antonyms AND sign held-out words correctly, or the giver is not a judgment. Skips when the frozen
// codec (ollama nomic-embed-text) is not reachable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePolarity, OSGOOD_POS, OSGOOD_NEG } from "./polarity.js";

const ollama = await (async () => { try { const r = await fetch("http://localhost:11434/api/tags"); const j = await r.json(); return (j.models ?? []).some((m) => m.name === "nomic-embed-text:latest"); } catch { return false; } })();

test("polarity separates antonyms and signs held-out words (falsification pinned)", { skip: !ollama }, async () => {
  const p = makePolarity();
  const words = ["love","hate","good","bad","life","death","war","peace","friend","enemy","gentle","merciful","honest","grateful","blessed","tender","brutal","wicked","miserable","dreadful","bitter"];
  const res = await p.polarity(words);
  const z = (w) => res.find((r) => r.word === w)?.z ?? 0;
  for (const [x, y] of [["love","hate"],["good","bad"],["life","death"],["war","peace"],["friend","enemy"]]) {
    const zx = z(x), zy = z(y);
    assert.ok((zx > 0 && zy < 0) || (zx < 0 && zy > 0), `${x}/${y} must separate (got ${zx.toFixed(2)} / ${zy.toFixed(2)})`);
  }
  for (const w of ["gentle","merciful","honest","grateful","blessed","tender"]) assert.ok(z(w) > 0, `${w} is positive (got ${z(w).toFixed(2)})`);
  for (const w of ["brutal","wicked","miserable","dreadful","bitter"]) assert.ok(z(w) < 0, `${w} is negative (got ${z(w).toFixed(2)})`);
});

test("the seed is declared, not typed", () => {
  assert.ok(Array.isArray(OSGOOD_POS) && OSGOOD_POS.length >= 5, "positive anchors are a declared list");
  assert.ok(Array.isArray(OSGOOD_NEG) && OSGOOD_NEG.length >= 5, "negative anchors are a declared list");
  assert.ok(OSGOOD_POS.every((w) => !OSGOOD_NEG.includes(w)), "a word is not both anchors");
});
