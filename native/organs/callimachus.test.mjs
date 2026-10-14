import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax, makeSpan, quoteOf, parseAddress } from "./pinax.js";
import { readCorpus, claimSheet, dossier, quotationRegions, attributionOf, winnow, binomTail, queriesFrom } from "./callimachus.js";

// A small civic corpus. Names recur across sources so the recurrence gate admits them; "said" frames quotations and clauses often enough
// to earn attitude standing on this material — nothing here is a listed verb.
const A = [
  `Maria Lopez said the transit program was cut in March. Maria Lopez said the budget office approved the plan.`,
  `"The program saved the city money," said Maria Lopez. Daniel Reyes said the budget office ignored the riders.`,
  `The budget office approved the plan. Daniel Reyes approved the bus route. Maria Lopez approved the hiring freeze.`,
  `Daniel Reyes said the council delayed the vote. "We will fight this decision," said Daniel Reyes.`,
].join("\n\n");
const B = [
  `Daniel Reyes said the transit program was cut in March. "Riders deserve better service," said Maria Lopez.`,
  `The budget office approved the plan. Maria Lopez said the council delayed the hearing. Daniel Reyes approved the depot lease.`,
].join("\n\n");
// Bulk prose, so this corpus's Zipf head is its function words and not its few content verbs (on a 60-word corpus "said" is itself
// in the top 0.6% and would be walled as closed-class — a real small-corpus limit of material.js's measurement, recorded in the spec).
const NOUNS = "lantern harbor meadow orchard quarry ribbon saddle tavern valley willow anchor basket candle desert engine feather garden hammer island jacket kettle ladder mirror needle".split(" ");
const BULK = NOUNS.flatMap((n, i) => NOUNS.slice(i + 1, i + 6).map((m) => `the ${n} of the ${m} was in the old ${NOUNS[(i * 7) % NOUNS.length]} and the ${m} was near it.`)).join(" ");
const WIRE = `The council approved a new depot lease after a long hearing on Tuesday evening, officials confirmed.`;

const page = (url, text, links = [], bulk = true) => makePinax({ url, retrievedAt: "2026-10-14T00:00:00Z", raw: `<p>${text}</p>`, text: bulk ? `${text}\n\n${BULK}` : text })
  .then((r) => Object.assign(r, { declared: { published: null, modified: null, links } }));
const sliceFrom = (store) => async (address) => {
  const p = parseAddress(address);
  const rec = store[p.pinax];
  if (!rec) return null;
  const sp = await makeSpan(rec, p.layer, p.start, p.end);
  const q = sp.ok === false ? null : await quoteOf(sp, rec);
  return q?.ok ? q.text : null;
};

async function corpus(extra = []) {
  const recs = [await page("https://a.test/1", A), await page("https://b.test/2", B), ...extra];
  return { recs, store: Object.fromEntries(recs.map((r) => [r.entry.id, r])), record: readCorpus(recs, { question: "Was the transit program cut?", absences: [{ type: "searched_absent", query: "transit program cut", corpus: "fixture" }] }) };
}

test("quotation regions: curly and straight quotes; an apostrophe is not a closer", () => {
  const t = `He said “it’s fine” and "no".`;
  const r = quotationRegions(t);
  assert.deepEqual(r.map(([a, b]) => t.slice(a, b)), ["“it’s fine”", `"no"`]);
});

test("attitude verbs are earned on the material: 'said' clears the binomial null here; no verb list exists", async () => {
  const { record } = await corpus();
  assert.ok(record.attitudes.earned.said, JSON.stringify(record.attitudes));
  assert.ok(binomTail(0, 10, 0.3) === 1 && binomTail(10, 10, 0.5) < 0.001);
});

test("embedded claim: 'X said the budget office approved the plan' is reported; giver = X, attitude 'said' verbatim", async () => {
  const { record, store } = await corpus();
  const slice = sliceFrom(store);
  const hits = [];
  for (const a of record.atoms) if (a.kind === "reported" && a.why_kind === "embedding" && /^Maria Lopez said the budget office approved the plan\.$/.test(await slice(a.span))) hits.push(a);
  assert.ok(hits.length >= 1);
  for (const a of hits) {
    assert.equal(a.giver.attitude_verbatim, "said");
    assert.equal(await slice(a.giver.surface), "Maria Lopez");
    assert.equal(await slice(a.giver.attitude), "said");
  }
});

test("inverted attribution: '“…,” said Maria Lopez' — the quotation is an atom, its giver the name AFTER the verb", async () => {
  const { record, store } = await corpus();
  const slice = sliceFrom(store);
  const q = [];
  for (const a of record.atoms) if (a.why_kind === "quotation" && /saved the city money/.test(await slice(a.span))) q.push(a);
  assert.equal(q.length, 1);
  assert.equal(q[0].giver.surface_verbatim, "Maria Lopez");
  assert.equal(q[0].giver.via, "quotation_frame_after");
  const t = `"Hello there," said Ann Lee.`;
  assert.equal(attributionOf(t, quotationRegions(t)[0], { verbs: new Set(["said"]), functionWords: new Set() }).giver, "Ann Lee");
});

test("unembedded: 'The budget office approved the plan.' is located, no giver", async () => {
  const { record, store } = await corpus();
  const slice = sliceFrom(store);
  const own = [];
  for (const a of record.atoms) if ((await slice(a.span)) === "The budget office approved the plan.") own.push(a);
  assert.ok(own.length >= 1);
  for (const a of own) { assert.equal(a.kind, "located"); assert.equal(a.giver, null); }
});

test("polarity's giver is stamped on every Link atom", async () => {
  const { record } = await corpus();
  for (const a of record.atoms.filter((x) => x.relation)) assert.equal(a.relation.polarity_giver, "relations.js NEGATION_WORDS (unnamed)");
});

test("syndication: the same wire paragraph on three sites is ONE chain; three independent reports would be three", async () => {
  const wires = [await page("https://w1.test/a", `${A}\n\n${WIRE}`), await page("https://w2.test/b", `${B}\n\n${WIRE}`), await page("https://w3.test/c", `Local roundup.\n\n${WIRE}`)];
  const record = readCorpus(wires);
  const shared = record.atoms.filter((a) => a._sentence.includes("new depot lease"));
  assert.ok(shared.length >= 2, "positive control: the wire sentence was read in more than one source");
  assert.ok(shared.every((a) => a.independent_count === 1), JSON.stringify(shared.map((a) => [a.pinax, a.independent_count])));
  const fp = winnow(WIRE);
  assert.ok(fp.size > 0);
});

test("citation chain: A links to B and both carry the claim → one chain", async () => {
  // The same claim in different words around it, so shared bytes cannot be what joins them: only the declared link can.
  const A2 = `${A}\n\nMaria Lopez approved the depot lease, according to minutes from the Tuesday session of the transit board.`;
  const B2 = `${B}\n\nOn Monday, after a long fight with neighbors over parking and noise, Maria Lopez approved the depot lease.`;
  const a = await page("https://a.test/1", A2, ["https://b.test/2"]);
  const b = await page("https://b.test/2", B2);
  const record = readCorpus([a, b]);
  const both = record.claims.filter((c) => new Set(c.atoms.map((id) => record.atoms.find((x) => x.id === id).pinax)).size === 2);
  assert.ok(both.length >= 1, "positive control: some claim is carried by both pages");
  for (const c of both) {
    assert.equal(c.independent_count, 1);
    assert.ok(c.collapses.some((x) => x.reason === "declared_citation"));
  }
  const unlinked = readCorpus([await page("https://a.test/1", A2), await page("https://b.test/2", B2)]);
  const k = both[0].key;
  assert.equal(unlinked.claims.find((c) => c.key === k).independent_count, 2, "control: without the link, the same pages are two chains");
});

test("absence is a finding (L6): absence events reach the dossier", async () => {
  const { record, store } = await corpus();
  const d = await dossier(record, { slice: sliceFrom(store) });
  assert.match(d.text, /searched_absent: transit program cut/);
});

test("lens adds nothing (L10): every claim-sheet row names an atom id; every atom is a row or a drop; quotes are sliced bytes", async () => {
  const { record, store } = await corpus();
  const slice = sliceFrom(store);
  const sheet = await claimSheet(record, { slice });
  const ids = [...sheet.text.matchAll(/`(a_[0-9a-z]+)`/g)].map((m) => m[1]);
  assert.equal(ids.length + sheet.drops.length, record.atoms.length);
  for (const id of ids) assert.ok(record.atoms.some((a) => a.id === id));
  const d = await dossier(record, { slice });
  for (const m of d.text.matchAll(/“([^”]+)” — \[[^\]]+\]\([^)]+\) `(a_[0-9a-z]+)`/g)) {
    const atom = record.atoms.find((a) => a.id === m[2]);
    assert.ok(atom, `dossier cites unknown atom ${m[2]}`);
    assert.equal(m[1], (await slice(atom.span)).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim());
  }
});

test("round-0 queries come from the question's own words; quoted phrases stay whole", () => {
  assert.deepEqual(queriesFrom(`Is "daylight saving time" permanent?`), [`"daylight saving time" Is permanent`]);
});

test("unplugged (L1): callimachus.js's static import closure reaches no model door", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /\/v1\/chat|\/api\/(generate|chat)\b/, `${file} names a model endpoint`);
    for (const [, spec] of src.matchAll(/^\s*import\s[^"']*["']([^"']+)["']/gm)) {
      assert.doesNotMatch(spec, /heimdall|ollama|anthropic|openai|model-client|mouth/i, `${file} imports ${spec}`);
      if (spec.startsWith(".")) walk(resolve(dirname(file), spec));
    }
  };
  walk(resolve(here, "callimachus.js"));
  assert.ok(seen.size >= 6, `positive control: the walk reached the organs (${seen.size})`);
});

// ---- referents by whole capitalised run (GRAIN-R7-PREREG.md) -------------------------------------------------------------------------
import { referentsInRuns, capitalisedRuns } from "./callimachus.js";
test("a mention resolves to a referent by its whole capitalised run, not by containing a surface", () => {
  const refs = [{ id: "r_senate", surfaces: ["Senate"] }, { id: "r_house", surfaces: ["House"] }, { id: "r_cong", surfaces: ["Congress"] }];
  const fw = new Set(["the", "a", "of", "and", "in", "which", "to"]);
  const at = (s) => referentsInRuns(s, refs, { functionWords: fw });
  assert.deepEqual(at("the Senate"), ["r_senate"], "a determiner at the edge is stripped");
  assert.deepEqual(at("the House’s"), ["r_house"], "a possessive is stripped");
  assert.deepEqual(at("the Nevada Senate"), [], "an extra content word makes a different surface, not the Senate");
  assert.deepEqual(at("Senate Bill 100"), []);
  assert.deepEqual(at("Senate Committee"), []);
  assert.deepEqual(at("House Democrats"), []);
  assert.deepEqual(at("Substitute House Bill"), []);
  assert.deepEqual(at("U.S. Senate"), [], "an alias is NOT merged by name: that is identity-induction's licence");
  assert.deepEqual(at("a resolution which urged Congress to act"), ["r_cong"], "a separate run inside a longer phrase still resolves");
  assert.deepEqual(at("Congress and the Senate"), ["r_cong", "r_senate"].sort(), "two runs, two referents");
  assert.deepEqual(capitalisedRuns("the Missouri House of Representatives passed it").map((r) => r.join(" ")), ["Missouri House of Representatives"]);
});
test('referentMatch "contains" is the default and unchanged: "the Nevada Senate" still contains the Senate', async () => {
  const { referentsIn } = await import("./callimachus.js");
  assert.deepEqual(referentsIn("the Nevada Senate", [{ id: "r_senate", surfaces: ["Senate"] }]), ["r_senate"]);
});
