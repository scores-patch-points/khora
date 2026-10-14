import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax } from "./pinax.js";
import { readCorpus } from "./callimachus.js";
import { pointedAtoms, slotsOf } from "./pointer-match.js";
import { claimFromSentence } from "./claim-realize.js";
import { loadModel } from "../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const model = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8")));
// relations.js earns its verb vocabulary from recurrence across surfaces, so each page carries a few recurring claims.
const FILL = `Daniel Reyes said the council delayed the vote. Maria Lopez approved the hiring freeze. Maria Lopez opposed the fare increase. Maria Lopez said the budget office approved the plan. "The program saved the city money," said Maria Lopez. "We will fight this decision in every court," said Daniel Reyes. Daniel Reyes approved the bus route.`;
const NOUNS = "lantern harbor meadow orchard quarry ribbon saddle tavern valley willow anchor basket candle desert engine feather garden hammer island jacket kettle ladder mirror needle".split(" ");
const BULK0 = NOUNS.flatMap((n, i) => NOUNS.slice(i + 1, i + 6).map((m) => `the ${n} of the ${m} was in the old ${NOUNS[(i * 7) % NOUNS.length]} and the ${m} was near it.`)).join(" ");
const BULK = BULK0;
const ORIGIN = "https://origin.test/report";
const DECOY = "https://decoy.test/story";
const INDEX = "https://en.wikipedia.org/wiki/Depot_lease";
const indexRaw = `<html><body><p>The council approved the depot lease in March 2026. [ 1 ]</p><ol><li about="#cite_note-A-1" id="cite_note-A-1" data-mw-footnote-number="1"><span class="mw-reference-text"><a rel="mw:ExtLink" href="${ORIGIN}">Report</a></span></li></ol></body></html>`;
const indexText = `The council approved the depot lease in March 2026. [ 1 ] ${FILL}\n\n` + BULK;
const mk = (url, raw, text) => makePinax({ url, retrievedAt: "2026-10-14T00:00:00Z", raw, text }).then((r) => Object.assign(r, { declared: { published: null, modified: null, links: [] } }));

test("an index sentence is matched to its origin by typed slots, voice-normalised; a word-bag decoy is not", async () => {
  const origin = `The depot lease was approved by the council in March 2026. The council approved the harbor plan. ${FILL}`;
  const decoy = `The council lease approved the depot weather in a March. ${FILL}`;
  const recs = [await mk(INDEX, indexRaw, indexText), await mk(ORIGIN, `<html><body><p>${origin}</p></body></html>`, `${origin}\n\n${BULK}`), await mk(DECOY, `<html><body><p>${decoy}</p></body></html>`, `${decoy}\n\n${BULK}`)];
  const record = readCorpus(recs, { question: "Who approved the depot lease?" });
  const ix = record.sources.find((s) => s.role === "index");
  assert.equal(ix.index_trail.length, 1, "one index sentence stands over a footnote with an origin");
  assert.deepEqual(ix.index_trail[0].hrefs, [ORIGIN]);
  // voice normalisation: active "council approved lease" and passive "lease was approved by the council" share pred and patient
  const a = slotsOf(claimFromSentence("The council approved the depot lease in March 2026.", "px#b0-1", { model }));
  const p = slotsOf(claimFromSentence("The depot lease was approved by the council in March 2026.", "px#b0-1", { model }));
  for (const role of ["pred", "agent", "patient"]) assert.ok([...a].some((k) => k.startsWith(role + ":") && p.has(k)), `${role} is shared across voices`);
  const pointed = pointedAtoms(record, { model });
  const hit = [...pointed.entries()].map(([id, v]) => ({ atom: record.atoms.find((x) => x.id === id), v }));
  assert.ok(hit.length >= 1, "the origin sentence is found");
  for (const h of hit) { assert.equal(h.atom.url, ORIGIN, "only the origin page is ever pointed at"); assert.ok(h.v.agree.length > h.v.runner_up); }
});

test("CONTROL that can fail: an index sentence whose footnote names a page that is not pinned points at nothing", async () => {
  const origin = `The depot lease was approved by the council in March 2026. ${FILL}`;
  const recs = [await mk(INDEX, indexRaw.replace(ORIGIN, "https://elsewhere.test/x"), indexText), await mk(ORIGIN, `<html><body><p>${origin}</p></body></html>`, `${origin}\n\n${BULK}`)];
  const record = readCorpus(recs, { question: "Who approved the depot lease?" });
  assert.equal(pointedAtoms(record, { model }).size, 0, "a pointer is only as good as the page it names: no guessed matches");
});
