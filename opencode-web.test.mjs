import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.FOLD_RESEARCH_CACHE = fs.mkdtempSync(path.join(os.tmpdir(), "fold-web-"));
const { citedFor } = await import("./opencode-web.mjs");

const page = `<p>Ada Lovelace was born in 1815 in London.<sup id="cite&#95;ref-1" class="reference"><a href="#cite_note-1"><span class="cite-bracket">[</span>1<span class="cite-bracket">]</span></a></sup> She wrote notes on the engine.</p>
<ol class="references"><li id="cite&#95;note-1"><span class="reference-text"><a rel="nofollow" class="external text" href="https://www.nationalarchives.gov.uk/ada">Ada</a> <a class="external text" href="https://web.archive.org/web/2020/https://www.nationalarchives.gov.uk/ada">archive</a></span></li></ol>`;
const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ parse: { text: { "*": page } } }) });

test("the footnote on the sentence that carries the claim is followed to the page it cites, not its archive copy", async () => {
  const r = await citedFor("Ada Lovelace", "Ada Lovelace was born in 1815.", { fetchImpl });
  assert.match(r.sentence, /born in 1815/);
  assert.deepEqual(r.links.map((l) => l.url), ["https://www.nationalarchives.gov.uk/ada"]);
});

test("a claim whose figure no article sentence carries cites nothing, with a reason", async () => {
  const r = await citedFor("Ada Lovelace", "Ada Lovelace was born in 1816.", { fetchImpl });
  assert.equal(r.links.length, 0);
  assert.match(r.why, /no article sentence/);
});

test("the Brave API search is keyed from the environment, strips markup from results, and caches by query", async () => {
  const { makeBraveSearch } = await import("./opencode-web.mjs");
  process.env.BRAVE_API_KEY = "test-key";
  let seen = null;
  const fetchImpl = async (url, init) => { seen = { url, token: init.headers["x-subscription-token"] }; return { ok: true, json: async () => ({ web: { results: [{ title: "A <strong>page</strong>", url: "https://example.gov/a", description: "says <b>so</b>" }, { title: "bad", url: "javascript:x" }] } }) }; };
  const r = await makeBraveSearch({ fetchImpl })("ada lovelace born 1815");
  assert.deepEqual(r, [{ title: "A page", url: "https://example.gov/a", snippet: "says so" }]);
  assert.equal(seen.token, "test-key");
  const again = await makeBraveSearch({ fetchImpl: async () => { throw new Error("must not fetch"); } })("ada lovelace born 1815");
  assert.equal(again.length, 1);
  delete process.env.BRAVE_API_KEY;
});
