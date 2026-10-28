// opencode-generate.test.mjs — ONE generation organ for anything: the same body, run once for an essay ask (prose units) and once for a
// table ask (row units). Each goes ask → kind → void-hunt slots → verbatim fills → a drawn text admitted into a gap → the confession,
// with no model call, no fetch, and a ledger row per section and per admit. Nothing in the organ names a kind by its words: the kinds
// differ only in how a page is cut into units and how a slot's units stand on the page.
//   node --test opencode-generate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "generate-eot-"));
const fetches = [];
globalThis.fetch = async (...a) => { fetches.push(a); throw new Error("the organ never fetches"); };
const S = await import("./opencode-stitch.mjs");
const C = await import("./opencode-confession.mjs");
const R = await import("./opencode-residue.mjs");
const EOT = await import("./opencode-eot.mjs");

const NAV = "Home | Lighthouses | Keepers | Contact";
const page = (url, body) => ({ name: url, url, text: [NAV, "", ...body].join("\n") });
const PROSE = [
  page("https://heritage.example/towers", [
    "Lighthouses were built on rocky headlands to warn ships away from the coast at night.",
    "A keeper lived in the tower and climbed the stairs every evening to light the lamp.",
    "A Fresnel lens bends the light of a single lamp into a beam seen twenty miles out at sea.",
    "The first Fresnel lens was fitted in 1823 and lighthouses everywhere adopted it within decades.",
  ]),
  page("https://maritime.example/keepers", [
    "Keepers kept a log of every ship that passed and every storm that struck the tower.",
    "Automation replaced the last keepers in the 1990s, and the towers now run unattended.",
    "A lens of ground glass prisms was heavy, and keepers cleaned it by hand each morning.",
    "Ships steered by the pattern of flashes, since each lighthouse had its own signature.",
  ]),
  page("https://coast.example/history", [
    "The keeper rang a bell in fog so that ships could find the harbour mouth.",
    "Automation began in the 1960s when electric lamps no longer needed a keeper to tend them.",
    "Ships still rely on the light where satellite navigation fails close to the rocks.",
  ]),
  page("https://optics.example/fresnel", [
    "Augustin Fresnel designed the lens in Paris to replace the mirrors used before it.",
    "The foghorn sounded a two-tone blast every thirty seconds when the light could not be seen.",
    "A foghorn was driven by compressed air and could be heard five miles off the coast.",
  ]),
  page("https://engineering.example/automation", [
    "Automation meant a timer, a lamp changer and a radio link to the shore station.",
    "Ships that pass the automated light see the same flashes the keepers once kept.",
  ]),
];
const HEAD = "station | country | keepers | lamp";
const row = (url, lines) => ({ name: url, url, text: [HEAD, ...lines, HEAD].join("\n") });
const ROWS = [
  row("https://data.example/ports-a", ["Hatteras | United States | three keepers | fresnel lens", "Portland | United States | two keepers | fresnel lens", "Eddystone | United Kingdom | four keepers | whale oil", "Fastnet | Ireland | three keepers | whale oil"]),
  row("https://data.example/ports-b", ["Hatteras | United States | three keepers | fresnel lens", "Skerryvore | United Kingdom | two keepers | fresnel lens", "Fastnet | Ireland | three keepers | electric lamp", "Eddystone | United Kingdom | four keepers | electric lamp"]),
  row("https://data.example/ports-c", ["Hatteras | United States | three keepers | fresnel lens", "Portland | United States | two keepers | electric lamp", "Tory | Ireland | one keeper | whale oil", "Skerryvore | United Kingdom | two keepers | electric lamp", "Bell Rock | United Kingdom | two keepers | paraffin lamp", "Dubh Artach | United Kingdom | two keepers | paraffin lamp"]),
];
const bytesOf = (pages, url, start, end) => Buffer.from(pages.find((p) => p.url === url).text).subarray(start, end).toString("utf8");

/** The organ, end to end, for one ask of one kind. The same body for every kind: nothing in here asks which kind it is. */
async function organ({ ask, topic, kind, pages, drawn, now }) {
  const s = S.stitchStart({ ask, topic, gathered: { passages: pages, quotes: [], voids: [] }, kind, now });
  assert.ok(s.ok, JSON.stringify(s.gap));
  assert.equal(s.kind, kind);
  assert.equal(s.calls, 0);
  assert.ok(s.sections.length >= 1 && s.filled.length >= 1, "the hunt found slots the pages share and filled them");
  for (const f of s.filled) for (const u of f.units) assert.equal(bytesOf(pages, u.url, u.start, u.end), u.text, "every fill is byte-exact at its address");
  // the drawn layer writes only into a gap; what it wrote is admitted back through the hunt
  const gap = s.gaps[0] ?? null;
  assert.ok(gap, "the stitched layer left the drawn layer a work order (a typed gap)");
  const r = await S.admit({ tree: s.tree, slot: gap.slot, drawn, job: s.job, now: now + 1000 });
  assert.ok(r.ok, JSON.stringify(r.gap));
  assert.equal(r.calls, 0);
  assert.equal(r.kind, kind);
  assert.equal(r.placed.length + r.marked.length, drawn.split("\n").length, "every drawn unit either faces an address or carries the mark");
  assert.ok(r.placed.length >= 1, `one drawn unit faces a page: ${JSON.stringify(r.marked.map((m) => m.text))}`);
  assert.ok(r.marked.length >= 1, "one drawn unit is the model's own, marked");
  for (const p of r.placed) assert.equal(bytesOf(pages, p.faces.url, p.start, p.end), p.faces.text);
  const body = fs.readFileSync(s.path, "utf8");
  for (const m of r.marked) assert.ok(body.includes(`${m.text} [M]`), "the mark is on the page, nothing is cut silently");
  // the ledger: one row per stitched section (marked 0) and one per admit (its own share)
  const ledger = R.longformLedger({ task: s.job.id });
  assert.equal(ledger.answers, s.sections.length + 1);
  const admitRow = ledger.runs.find((x) => x.admit);
  assert.ok(admitRow && admitRow.counts.marked === r.marked.length && admitRow.counts.facing === r.placed.length);
  assert.ok(ledger.runs.filter((x) => !x.admit).every((x) => x.counts.marked === 0));
  assert.ok(R.residueAcross({ root: process.env.FOLD_WORKNOTES_DIR }).ledgers.some((l) => l.task === s.job.id));
  // the confession: computed from that ledger, never written; the same log renders the same bytes; it names the slots, the gap, one call
  const facts = C.confessionFacts({ task: s.job.id });
  assert.equal(facts.kind, "piece");
  assert.equal(facts.calls, 1, "one admit is one model call; the stitched sections cost none");
  assert.equal(facts.marked, r.marked.length);
  assert.ok(facts.slots >= 1 && facts.gaps >= 1);
  assert.ok(facts.addresses.rows.length === ledger.answers && facts.addresses.tree);
  const text = C.confessionOf({ task: s.job.id });
  assert.equal(text, C.renderConfession(facts));
  assert.equal(text, C.confessionOf({ task: s.job.id }));
  assert.match(text, /^What this is made of: \d+ sentences? of \d+ faces? a source at an address; \d+ (is|are) the model's own, marked; \d+ slots? were hunted, \d+ (is|are) a gap no page filled; the model was called 1 time, last\. The model's share is \d+%\. \[ledger evt_/);
  assert.ok(EOT.read(s.job.id).events.every((e) => !e.detail?.kind || e.detail.unitKind === undefined || e.detail.unitKind === kind), "the kind is on every event");
  assert.equal(fetches.length, 0);
  return { s, r, text };
}

test("an essay ask: prose units through the whole organ, ending in a confession and ledger rows", async () => {
  const { r, text } = await organ({
    ask: "write an essay on lighthouses", topic: "lighthouses", kind: "prose", pages: PROSE, now: 1_700_000_000_000,
    drawn: ["A foghorn was driven by compressed air and could be heard five miles off the coast.", "Sailors loved the sound and wrote songs about it on long voyages."].join("\n"),
  });
  assert.equal(r.placed.length, 1);
  assert.match(text, /1 is the model's own, marked/);
});

test("a table ask: row units through the SAME organ, ending in a confession and ledger rows", async () => {
  const { s, r, text } = await organ({
    ask: "make a table of lighthouse stations", topic: "stations", kind: "rows", pages: ROWS, now: 1_700_000_010_000,
    drawn: ["Skerryvore | United Kingdom | two keepers | electric lamp", "Muckle Flugga | United Kingdom | two keepers | gas burner"].join("\n"),
  });
  assert.ok(!s.job.index.sentences.some((x) => x.text === HEAD), "the header row, on every page, is furniture");
  assert.ok(s.sections[0].text.split("\n").filter((l) => l.includes(" [S")).length >= 2, "rows stand one per line, each with its address");
  assert.ok(r.marked.some((m) => /Muckle Flugga/.test(m.text)));
  assert.match(text, /1 is the model's own, marked/);
});

test("the organ keeps no kind-specific word list: kinds differ only in unit cutting and rendering", () => {
  const src = fs.readFileSync(new URL("./opencode-stitch.mjs", import.meta.url), "utf8");
  const branches = src.split("\n").filter((l) => /kind === "/.test(l));
  assert.ok(branches.length <= 4, `kind branches: ${branches.length}`);
  assert.ok(branches.every((l) => /unitsFor|drawnUnits|blockOf|longform-admit/.test(l)), "every kind test is a unit cut, a render, or an event filter");
  assert.deepEqual([...S.KINDS], ["prose", "rows", "list", "code", "records"]);
  for (const k of S.KINDS) assert.equal(typeof S.RENDER[k], "function");
});
