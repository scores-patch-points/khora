import test from "node:test";
import assert from "node:assert/strict";
import { isIndexUrl, footnotesOf, marksOf, notesUnder, trailOf, indexRecord } from "./index-source.js";

// A reference list in Parsoid's shape (attribute order as the live pages carry it), and a text layer in extractReadable's shape.
const RAW = [
  `<ol class="references">`,
  `<li about="#cite_note-A-1" id="cite_note-A-1" data-mw-footnote-number="1"><span class="mw-reference-text"><a rel="mw:ExtLink" href="https://www.congress.gov/bill/117th-congress/senate-bill/623">S.623</a> <a href="https://web.archive.org/web/2022/https://www.congress.gov/x">archived</a></span></li>`,
  `<li about="#cite_note-B-2" id="cite_note-B-2" data-mw-footnote-number="2"><span class="mw-reference-text"><a href="https://en.wikipedia.org/wiki/Special:BookSources">book</a></span></li>`,
  `<li about="#cite_note-C-3" id="cite_note-C-3" data-mw-footnote-number="3"><span class="mw-reference-text"><a href="https://www.nytimes.com/2022/03/15/us/politics/daylight-saving.html?a=1&amp;b=2">NYT</a></span></li>`,
  `<li about="#cite_note-D-4" id="cite_note-D-4" data-mw-footnote-number="4"><span class="mw-reference-text"><a href="https://web.archive.org/web/2021/https://example.org/only">archive only</a></span></li>`,
  `</ol>`,
].join("\n");
const TEXT = "In 2022, the Senate passed the bill by unanimous consent. [ 1 ] [ 3 ] The House did not take it up. [ 2 ] It lapsed. [ 4 ]";

test("the declared index host: Wikipedia in any language, and nothing else", () => {
  assert.equal(isIndexUrl("https://en.wikipedia.org/wiki/Sunshine_Protection_Act").id, "wikipedia");
  assert.equal(isIndexUrl("https://es.wikipedia.org/wiki/Hora_de_verano").id, "wikipedia");
  assert.equal(isIndexUrl("https://www.congress.gov/bill/117th-congress/senate-bill/623"), null);
  assert.equal(isIndexUrl("https://notwikipedia.org/"), null, "the host test is a suffix on a dot boundary, not a substring");
});

test("footnotes: external origins kept, wiki plumbing dropped, archived copies kept apart, entities decoded, raw-layer byte span", () => {
  const fn = footnotesOf(RAW);
  assert.equal(fn.size, 4);
  assert.deepEqual(fn.get(1).urls.map((u) => [u.host, u.archived]), [["congress.gov", false], ["web.archive.org", true]]);
  assert.deepEqual(fn.get(2).urls, [], "a Special: page of the encyclopedia is plumbing, not an origin");
  assert.equal(fn.get(3).urls[0].href, "https://www.nytimes.com/2022/03/15/us/politics/daylight-saving.html?a=1&b=2");
  const bytes = new TextEncoder().encode(RAW);
  const { start, end } = fn.get(3).at;
  assert.match(new TextDecoder().decode(bytes.subarray(start, end)), /^<li about="#cite_note-C-3".*<\/li>$/s, "the address names the footnote's own bytes");
});

test("a sentence's footnotes: trailing run after it belong to it; the head of the NEXT sentence's marks are not its own", () => {
  const marks = marksOf(TEXT);
  const s1 = TEXT.indexOf("consent.") + "consent.".length;
  assert.deepEqual(notesUnder(TEXT, marks, 0, s1), [1, 3]);
  const s2 = TEXT.indexOf("[ 1 ]") + "[ 1 ] [ 3 ] The House did not take it up.".length;
  assert.deepEqual(notesUnder(TEXT, marks, TEXT.indexOf("[ 1 ]"), s2), [2], "marks leading the span are the previous sentence's, so only [2] stands under the House sentence");
});

test("a trail names the origin to fetch with the footnote's address; archive-only and no-footnote are typed, never guessed", () => {
  const fn = footnotesOf(RAW), marks = marksOf(TEXT);
  const t = trailOf({ text: TEXT, footnotes: fn, marks, span: [0, TEXT.indexOf("consent.") + 8], pinax: "px_wiki" });
  assert.deepEqual(t.notes, [1, 3]);
  assert.deepEqual(t.follow.map((f) => f.host), ["congress.gov", "nytimes.com"]);
  assert.match(t.follow[0].via, /^px_wiki\/raw#b\d+-\d+$/);
  const arch = trailOf({ text: TEXT, footnotes: fn, marks, span: [TEXT.indexOf("It lapsed."), TEXT.length], pinax: "px_wiki" });
  assert.equal(arch.refs[0].status, "archived_only");
  assert.equal(arch.follow.length, 0, "an archive copy alone is a pointer, not something this organ fetches");
  const none = trailOf({ text: "No marks here.", footnotes: fn, marks: [], span: [0, 14], pinax: "px_wiki" });
  assert.deepEqual(none.notes, []);
});

test("an index record is marked, never mutated otherwise", () => {
  const rec = { entry: { id: "px_x" }, declared: { published: "2026-01-01", links: ["https://a.test/"] } };
  indexRecord(rec);
  assert.equal(rec.declared.role, "index");
  assert.deepEqual(rec.declared.links, ["https://a.test/"]);
  assert.equal(rec.declared.published, "2026-01-01");
});
