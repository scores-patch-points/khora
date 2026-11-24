// condense.test.mjs — "is this verbatim? we should be paraphrasing" (the owner, looking at "say more"). The sentence is told in short: bracketed furniture off, a participial that only restates
// the subject's name off, the subject under the name the person already uses, and nothing else dropped; each change checked by reading the result back. This is condensing and re-naming in the
// page's own words, not lexical paraphrase (see condense.mjs). Needs the reader's priors; skips without them.
import test from "node:test"; import assert from "node:assert/strict";
let R = null, why = null, condense = null;
try { const { rowsOfFor } = await import("../reading.js"); R = await rowsOfFor("eng"); ({ condense } = await import("./condense.mjs")); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: R ? false : `no reader here: ${why}` };
const read = (t) => R.rowsOf(t) ?? [];
const tell = (s, name = "Leo Tolstoy") => condense(read(s), { name, read });

test("the page's pronunciation, dates and bracketed asides are furniture, and a participial that restates the name is not told", T, () => {
  const c = tell("Count Lev Nikolayevich Tolstoy (; Russian: Лев Николаевич Толстой, IPA: [ˈlʲef nʲɪkɐˈla(j)ɪvʲɪtɕ tɐlˈstoj] ; 9 September [O.S. 28 August] 1828 – 20 November [O.S. 7 November] 1910), usually referred to in English as Leo Tolstoy, was a Russian writer.");
  assert.equal(c.text, "Leo Tolstoy was a Russian writer.");
  assert.equal(tell("War and Peace (Russian: Война и мир, romanized: Voyna i mir) is a literary work by the Russian author Leo Tolstoy, which mixes narrative with chapters on history and philosophy.").text, "War and Peace is a literary work by the Russian author Leo Tolstoy, which mixes narrative with chapters on history and philosophy.");
});

test("a fact is never dropped: an apposition or a participial that says something new stays", T, () => {
  assert.equal(tell("Mel Gibson (born January 3, 1956) is an American actor, who starred in Lethal Weapon, a film directed by Richard Donner.", "Mel Gibson").text, "Mel Gibson is an American actor, who starred in Lethal Weapon, a film directed by Richard Donner.");
  assert.equal(tell("He is regarded as one of the greatest and most influential authors of all time.").text, "He is regarded as one of the greatest and most influential authors of all time.", "nothing to take off: told as written");
});

test("an unbalanced bracket is not trusted, and nothing is dropped for it", T, () => {
  const t = "Tolstoy wrote War and Peace (1869 and Anna Karenina.";
  assert.equal(tell(t).text, t);
});
