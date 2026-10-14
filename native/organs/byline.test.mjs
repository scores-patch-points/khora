import test from "node:test";
import assert from "node:assert/strict";
import { bylineOf, attrsOf, splitNames, nameShapeProblem } from "./byline.js";

const page = ({ head = "", body = "", ld = null } = {}) =>
  `<!doctype html><html><head><title>Senate passes bill to make daylight saving time permanent | Example News</title>${head}${ld ? `<script type=application/ld+json>${typeof ld === "string" ? ld : JSON.stringify(ld)}</script>` : ""}</head><body>${body}</body></html>`;
const URL_ = "https://news.example/2022/03/senate-passes-bill";

test("attributes: quoted, single-quoted and UNQUOTED values (minified markup is common)", () => {
  assert.deepEqual(attrsOf(`<meta property=article:author content="Jordan Green"/>`), { property: "article:author", content: "Jordan Green" });
  assert.deepEqual(attrsOf(`<script type='application/ld+json'>`), { type: "application/ld+json" });
});

test("a page-level <meta> author, corroborated by a bare name line at the head of the text, is accepted — no 'By' word needed", () => {
  const r = bylineOf({ raw: page({ head: `<meta property=article:author content="Jordan Green"/><meta property=og:site_name content="Example News"/>` }), text: "LOCAL\n\nSenate passes bill\n\nJordan Green\nExample News\n\nOct. 12, 2026\n\nThe Senate…", url: URL_ });
  assert.deepEqual(r.authors.map((a) => [a.name, a.witnesses.join("+")]), [["Jordan Green", "meta+visible"]]);
  assert.ok(r.authors[0].at.end > r.authors[0].at.start, "the name is copied bytes with a raw-layer address");
});

test("JSON-LD: the page's OWN article's authors; a lone name that is only a related card's byline is refused", () => {
  const ld = { "@context": "https://schema.org", "@type": "NewsArticle", headline: "Senate passes bill to make daylight saving time permanent", url: URL_, author: [{ "@type": "Person", name: "Mike Snider" }, { "@type": "Person", name: "Chelsey Cox" }], publisher: { "@type": "NewsMediaOrganization", name: "Example News" } };
  const body = `<aside><a rel=author href="/staff/eric">Eric Boehm</a></aside>`;
  const r = bylineOf({ raw: page({ ld, body }), text: "", url: URL_ });
  assert.deepEqual(r.authors.map((a) => a.name).sort(), ["Chelsey Cox", "Mike Snider"]);
  assert.ok(r.refused.some((x) => x.name === "Eric Boehm" && x.why === "one_witness"), "a card's byline has one weak witness and does not become the author");
});

test("a page that lists several articles and cannot say which is its own is ambiguous, never guessed", () => {
  const ld = [{ "@type": "NewsArticle", headline: "Something else entirely", url: "https://news.example/a", author: { "@type": "Person", name: "Ann Lee" } }, { "@type": "NewsArticle", headline: "Another unrelated story", url: "https://news.example/b", author: { "@type": "Person", name: "Bob Ray" } }];
  const r = bylineOf({ raw: page({ ld }), text: "", url: URL_ });
  assert.deepEqual(r.authors, []);
  assert.equal(r.ambiguous_article, true);
});

test("handles, URLs, one-token credits and the publisher's own name are never authors, each refused with its reason", () => {
  const raw = page({ head: `<meta name=author content="@ExampleNews"/><meta name=author content="theffron"/><meta name=author content="Example News"/><meta property=og:site_name content="Example News"/><meta name=author content="https://facebook.com/example"/>` });
  const r = bylineOf({ raw, text: "", url: URL_ });
  assert.deepEqual(r.authors, []);
  const why = Object.fromEntries(r.refused.map((x) => [x.name, x.why]));
  assert.equal(why["@ExampleNews"], "handle_or_url");
  assert.equal(why["theffron"], "token_count");
  assert.equal(why["Example News"], "publisher_not_author");
});

test("a press release is BY its issuing body and PUBLISHED on a wire: the body is the giver, the wire is the path", () => {
  const ld = { "@type": "NewsArticle", headline: "Senate passes bill to make daylight saving time permanent", url: URL_, author: { "@type": "Organization", name: "American Academy of Sleep Medicine" }, publisher: { "@type": "Organization", name: "Example Wire" } };
  const r = bylineOf({ raw: page({ ld, head: `<meta property=og:site_name content="Example Wire"/>` }), text: "", url: URL_ });
  assert.deepEqual(r.authors.map((a) => [a.name, a.kind]), [["American Academy of Sleep Medicine", "organization"]]);
});

test("institutional voice only where the markup itself types a non-news body; a news publication with no byline is a typed gap", () => {
  const ngo = bylineOf({ raw: page({ ld: { "@type": "NGO", name: "Save Standard Time", url: "https://sst.example/" } }), text: "", url: "https://sst.example/" });
  assert.deepEqual([ngo.institutional?.name, ngo.institutional?.type, ngo.no_named_giver], ["Save Standard Time", "NGO", false]);
  const news = bylineOf({ raw: page({ ld: { "@type": "NewsMediaOrganization", name: "Example News" } }), text: "", url: URL_ });
  assert.equal(news.institutional, null);
  assert.equal(news.no_named_giver, true, "a publication is not cited: the result is a typed gap");
  const bare = bylineOf({ raw: page(), text: "", url: URL_ });
  assert.equal(bare.no_named_giver, true);
});

test("credit strings split into people: 'By A and B', 'A, B', 'A & B'", () => {
  assert.deepEqual(splitNames("By Mike Snider and Chelsey Cox"), ["Mike Snider", "Chelsey Cox"]);
  assert.deepEqual(splitNames("Aaron Steckelberg, Lindsey Bever"), ["Aaron Steckelberg", "Lindsey Bever"]);
  assert.equal(nameShapeProblem("Jairo H Barrantes Perez"), null);
  assert.equal(nameShapeProblem("Frank Thorp V"), null);
  assert.equal(nameShapeProblem("Ludwig van Beethoven"), null, "lower-case particles sit inside a name");
});

test("CONTROL that can fail: the visible line corroborates only the page it belongs to", () => {
  const meta = `<meta property=article:author content="Jordan Green"/>`;
  const mine = bylineOf({ raw: page({ head: meta }), text: "Title\n\nJordan Green\nExample News\n\nBody…", url: URL_ });
  const other = bylineOf({ raw: page({ head: meta }), text: "Title\n\nSomeone Else\nOther News\n\nBody…", url: URL_ });
  assert.ok(mine.authors[0].witnesses.includes("visible"));
  assert.ok(!other.authors[0].witnesses.includes("visible"), "another page's text layer must not corroborate this page's markup");
});
