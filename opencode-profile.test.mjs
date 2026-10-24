// opencode-profile.test.mjs — the falsifying controls for THE PROFILE (opencode-profile.mjs), THE FALSIFIER's research
// (opencode-research.mjs) and WHICH ONE (opencode-identity.mjs). Offline: Wikimedia is a canned fetch, the gap is 0
// and the cache is a fresh temp dir.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_RESEARCH_CACHE = fs.mkdtempSync(path.join(os.tmpdir(), "fold-research-test-"));
process.env.FOLD_WIKI_GAP_MS = "0";
const { proseUnits, judgeAll, symbolUses, resolveSymbols } = await import("./opencode-profile.mjs");
const { researchClaims, structuredVerdict } = await import("./opencode-research.mjs");
const { whoIs } = await import("./opencode-identity.mjs");

const MARIE = { id: "Q7186", labels: { en: { value: "Marie Curie" } }, descriptions: { en: { value: "Polish-born French physicist and chemist (1867–1934)" } }, sitelinks: { enwiki: { title: "Marie Curie" } },
  claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q5" } } } }], P569: [{ mainsnak: { datavalue: { value: { time: "+1867-11-07T00:00:00Z" } } } }], P570: [{ mainsnak: { datavalue: { value: { time: "+1934-07-04T00:00:00Z" } } } }] } };
const UNIT = { id: "Q229354", labels: { en: { value: "curie" } }, descriptions: { en: { value: "non-SI unit of radioactivity" } }, sitelinks: { enwiki: { title: "Curie (unit)" } }, claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q1978718" } } } }] } };
const ARTICLE = "Marie Curie was a Polish and naturalised-French physicist and chemist who conducted pioneering research on radioactivity. Curie was the first woman to win a Nobel Prize, the first person to win a Nobel Prize twice and the only person to win a Nobel Prize in two different scientific fields. She discovered polonium and radium with Pierre Curie in 1898. She died in 1934 at the Sancellemoz sanatorium.";
const INTRO_UNIT = "The curie is a non-SI unit of radioactivity originally defined in 1910, named for Marie and Pierre Curie, measuring decays of radium per second.";
const json = (o) => ({ ok: true, status: 200, json: async () => o });
const fakeFetch = (seen = []) => async (url) => {
  seen.push(url);
  const u = new URL(url);
  const p = u.searchParams;
  if (p.get("action") === "wbsearchentities") {
    const s = p.get("search");
    return json({ search: s === "Marie Curie" ? [{ id: "Q7186", label: "Marie Curie" }] : s === "Curie" ? [{ id: "Q229354", label: "curie" }] : [] });
  }
  if (p.get("action") === "wbgetentities") return json({ entities: Object.fromEntries(p.get("ids").split("|").map((id) => [id, id === "Q7186" ? MARIE : id === "Q229354" ? UNIT : { id, missing: "" }])) });
  if (p.get("action") === "query" && p.get("exintro")) return json({ query: { pages: p.get("titles").split("|").map((t) => ({ title: t, extract: t === "Marie Curie" ? ARTICLE : INTRO_UNIT })) } });
  if (p.get("action") === "query") return json({ query: { pages: [{ title: p.get("titles"), extract: p.get("titles") === "Marie Curie" ? ARTICLE : INTRO_UNIT }] } });
  return { ok: false, status: 404, json: async () => ({}) };
};

const resolveCurie = (s) => [...(/Marie Curie/.test(s) ? ["Marie Curie"] : /\bCurie\b/.test(s) ? ["Curie"] : []), ...(/Warsaw/.test(s) ? ["Warsaw"] : [])];

test("FALSIFIER: argument is not checked; a claim names a being, a number, a proper name or a quote", () => {
  const u = proseUnits("## The cost\n\nMarie Curie discovered radium in 1898. Yet discovery is never free. Every advance asks something of the person who makes it. What should we take from this?", { resolve: resolveCurie });
  assert.deepEqual(u.map((x) => x.standing), ["heading", "unchecked", "argument", "argument", "question"]);
});

test("FALSIFIER: a lead she carries the last named being as the subject, and a bare surname is the fuller name the text used", () => {
  const u = proseUnits("Marie Curie discovered radium. In 1934 she died of anemia. Curie handled radium.", { resolve: resolveCurie });
  assert.equal(u[1].beings[0], "Marie Curie");
  assert.equal(u[1].person, true);
  assert.equal(u[2].beings[0], "Marie Curie", "a bare 'Curie' is the 'Marie Curie' the text named");
});

test("FALSIFIER: a different year contradicts (The Fold's judge); a shared surname and a different given name do not support", () => {
  const passages = [{ name: "curie.md", text: "Marie Curie discovered radium in 1898. Marie Curie died in 1934 of aplastic anemia." }];
  const [wrongYear, swapped, right] = judgeAll(["Marie Curie discovered radium in 1899.", "Pierre Curie died in 1934 of aplastic anemia.", "Marie Curie died in 1934 of aplastic anemia."], passages);
  assert.equal(wrongYear.standing, "contradicted");
  assert.match(wrongYear.why, /1898/);
  assert.notEqual(swapped.standing, "supported", "the surname alone is not the person");
  assert.equal(right.standing, "supported");
  assert.equal(right.evidence.ref, "curie.md:1", "the witness is addressed by the passage's own line");
});

test("FALSIFIER: what a support does not cover is shown as residue, never silently passed", () => {
  const passages = [{ name: "curie.md", text: "Pierre Curie died in 1906 when a horse-drawn wagon ran him over in Paris." }];
  const [train, wagon] = judgeAll(["Pierre Curie died in 1906 when a train ran him over in Paris.", "Pierre Curie died in 1906 when a wagon ran him over in Paris."], passages);
  assert.deepEqual(train.residue, ["train"], "the support does not carry 'train', and says so");
  assert.equal(wagon.residue, undefined, "the control: a claim fully carried has no residue");
});

test("FALSIFIER: an option key the called function's signature does not take is contradicted by that signature", () => {
  const draft = "Use `withRetry`:\n\n```ts\nimport { withRetry } from \"./net/retry\"\nexport const fetchUser = (id: string) =>\n  withRetry(() => api.get(`/users/${id}`), { attempts: 3, backoffMs: 200 })\n```\n\nThe `jitter` option is on by default.";
  const passages = [{ name: "src/net/retry.ts", text: "export function withRetry<T>(fn: () => Promise<T>, opts: { attempts: number; delayMs: number }): Promise<T> {\n}" }];
  const syms = resolveSymbols(symbolUses(draft), passages);
  const by = (k, n) => syms.find((s) => s.kind === k && s.name === n);
  assert.equal(by("key", "attempts").standing, "found");
  assert.equal(by("key", "backoffMs").standing, "contradicted");
  assert.match(by("key", "backoffMs").why, /attempts, delayMs/);
  assert.equal(by("mention", "jitter").standing, "not_found");
  assert.equal(by("path", "./net/retry").standing, "found");
  assert.ok(!syms.some((s) => s.name === "fetchUser" || s.name === "id"), "the answer's own definitions are not looked for");
});

test("FALSIFIER: a name only nominates — the text calling the being 'she' rules out a unit that shares the name", async () => {
  const r = await whoIs("Curie", { text: "Curie discovered radium. She died in 1934.", person: true, fetchImpl: fakeFetch() });
  assert.notEqual(r.verdict, "bound", "the curie (a unit) is never who 'she' is");
});

test("FALSIFIER: identity binds the being the text means, and its dated statement falsifies a wrong year", async () => {
  const r = await whoIs("Marie Curie", { text: "Marie Curie discovered radium in 1898 and died in 1934.", fetchImpl: fakeFetch() });
  assert.equal(r.verdict, "bound");
  assert.equal(r.entity.qid, "Q7186");
  const v = structuredVerdict({ text: "She was born in Warsaw in 1869." }, r.entity);
  assert.equal(v.standing, "contradicted");
  assert.equal(v.evidence.ref, "Q7186#P569");
  assert.equal(structuredVerdict({ text: "She died in 1934." }, r.entity).standing, "supported");
});

test("FALSIFIER: research tries to falsify an unsupported claim and records where it looked", async () => {
  const seen = [];
  const claims = [
    { text: "Marie Curie discovered radium in 1899.", standing: "unsupported", beings: ["Marie Curie"], searched: ["material"] },
    { text: "Marie Curie collected 40 seashells in Brittany.", standing: "unsupported", beings: ["Marie Curie"], searched: ["material"] },
  ];
  const r = await researchClaims(claims, { fetchImpl: fakeFetch(seen), budgetMs: 10_000 });
  assert.equal(r.claims[0].standing, "contradicted");
  assert.equal(r.claims[0].identity.qid, "Q7186");
  assert.equal(r.claims[1].standing, "unsupported", "nothing found is unsupported, never invented either way");
  assert.ok(r.claims[1].searched.some((x) => /wikipedia: Marie Curie/.test(x)), "the search trail is disclosed");
  assert.ok(seen.every((u) => /wikidata\.org|wikipedia\.org|wiktionary\.org/.test(u)), "only Wikimedia is reached");
  assert.ok(seen.filter((u) => /wbsearchentities/.test(u)).length <= 1, "one being is looked up at most once (an earlier lookup is cached)");
});

const { janusPass, equationsFor, countOf, orderOf } = await import("./opencode-janus.mjs");
const CURIE = [{ name: "curie.md", text: "Marie Curie and Pierre Curie discovered radium in 1898. Marie Curie won the Nobel Prize in Physics in 1903 and the Nobel Prize in Chemistry in 1911." }];
const unsupported = (text, beings = ["Marie Curie"]) => ({ text, standing: "unsupported", beings, searched: ["material"] });

test("FALSIFIER: an ordered claim is decided by Janus's equation over the source's own year", async () => {
  const [late, early] = await janusPass([unsupported("The discovery of radium took place well after 1900.", ["Marie Curie"]), unsupported("The discovery of radium took place before 1900.", ["Marie Curie"])], CURIE);
  assert.equal(late.standing, "contradicted");
  assert.match(late.janus.finding, /refutes it/, "the verdict is Janus's own finding, not this file's comparison");
  assert.equal(early.standing, "supported", "the control: the same ordering, true, holds");
  assert.match(early.janus.finding, /confirms it/);
});

test("FALSIFIER: a count is an aggregate over the source's facts; fewer listed than claimed is silence, never a refutation", async () => {
  const [two, five] = await janusPass([unsupported("Marie Curie won two Nobel Prizes."), unsupported("Marie Curie won five Nobel Prizes.")], CURIE);
  assert.equal(two.standing, "supported");
  assert.match(two.why, /lists 2/);
  assert.equal(five.standing, "unsupported", "the source lists two; it does not say she won no more");
  assert.match(five.why, /does not reach it/);
});

test("FALSIFIER: the operators refuse what they cannot read, and a year-scoped count is not read", () => {
  assert.equal(orderOf("It was found after 1900 and before 1950."), null, "two bounds are not one order");
  assert.equal(countOf("She won two Nobel Prizes in 1903."), null, "a count scoped to a year is a different claim");
  assert.equal(countOf("She won a Nobel Prize."), null, "one is a presence claim, not an aggregate");
  assert.equal(equationsFor(unsupported("Marie Curie won two ships."), CURIE), null, "nothing the source counts is nothing to decide");
});

const { isSummary, deriveClaim, derive, leftOut, sourceSentences } = await import("./opencode-summary.mjs");
const MINUTES = [{ name: "minutes.md", text: "The city council met on Tuesday to vote on the harbor expansion. Councillor Alvarez argued that the expansion would add 1,200 jobs over five years. Councillor Brandt opposed it, saying the dredging would damage the oyster beds that local fishers depend on. The mayor proposed a compromise that would cut the project's footprint by a third. The council voted 7 to 4 to approve the compromise. Construction is scheduled to begin in March and finish in 2029. The port authority will pay for the work with a bond of 80 million dollars." }];

test("FALSIFIER: a summary sentence is derived from the several source sentences that jointly carry it, addressed", () => {
  const [c] = derive([{ text: "Councillor Brandt opposed the expansion, and the council approved the compromise.", standing: "unsupported" }], MINUTES);
  assert.equal(c.standing, "supported");
  assert.equal(c.derived, true);
  assert.ok(c.from.length >= 2, "many-to-one: it abstracts more than one sentence");
  assert.ok(c.from.every((f) => /^minutes\.md:1(:\d+)?$/.test(f.ref)), "each source sentence is addressed in the passage's own bytes");
});

test("FALSIFIER: what no union of source sentences carries is ADDED, and the added words are named", () => {
  const [c] = derive([{ text: "The council approved the expansion, which the governor had funded with a federal grant.", standing: "unsupported" }], MINUTES);
  assert.equal(c.standing, "unsupported");
  assert.equal(c.added, true);
  assert.match(c.why, /governor/);
  assert.match(c.why, /grant/);
});

test("FALSIFIER: a derived summary may not carry a figure its sources lack, nor the opposite polarity", () => {
  const sources = sourceSentences(MINUTES);
  assert.equal(deriveClaim("The council approved the compromise by 9 to 2.", sources).ok, false, "the figure 9 to 2 is not in the sources");
  assert.equal(deriveClaim("The council approved the compromise by 7 to 4.", sources).ok, true, "the control: the right figure is");
  assert.equal(deriveClaim("The council never approved the compromise.", sources).polarityOk, false, "a negated claim does not rest on affirmed sentences alone");
});

test("FALSIFIER: what a summary leaves out is disclosed — figures the material states and the summary never carries", () => {
  const out = leftOut("The council met on Tuesday.", MINUTES);
  assert.deepEqual(out.figures.map((f) => f.figure).sort(), ["1200 jobs", "7 to 4", "80 million"].sort());
  assert.equal(leftOut("The council voted 7 to 4 and the bond is 80 million dollars with 1,200 jobs.", MINUTES).figures.length, 0, "the control: a summary that carries them leaves them out of the list");
});

test("FALSIFIER: summary-shaped by what the ask wants, never by the answer being a small fraction of what it was handed", () => {
  assert.equal(isSummary("summarize the meeting", "x", MINUTES), true);
  assert.equal(isSummary("what is the capital of France", "Paris.", MINUTES), false);
  assert.equal(isSummary("say what the function does", "I'll read the file and locate that function.", MINUTES), false, "a short note after a big read is not a summary of it");
  assert.equal(isSummary("read opencode-summary.mjs and say what it does", "x", MINUTES), false, "a word inside a file name is not the ask");
  assert.equal(isSummary("summarize the meeting", "x", []), false, "nothing handed to it, nothing to summarize");
  const bigRead = [{ name: "websearch", text: Array.from({ length: 40 }, (_, i) => `Mountain number ${i} is tall and stands in a range with many peaks and valleys around it.`).join(" ") }];
  const answer = Array.from({ length: 12 }, () => "Denali in Alaska is the highest peak in North America at 20,310 feet.").join(" ");
  assert.equal(isSummary("what is the tallest mountain in america?", answer, bigRead), false, "a question answered from a big read is not a summary of it");
  assert.equal(isSummary("resume la reunión", "x", MINUTES), true, "the ask wants a summary, in Spanish");
  assert.equal(isSummary("总结一下会议", "x", MINUTES), true);
});

test("FALSIFIER: Janus's arithmetic supports only a single-clause claim; one clause's count does not carry a compound sentence", async () => {
  const [one, both] = await janusPass([unsupported("Marie Curie won two Nobel Prizes."), unsupported("Marie Curie won two Nobel Prizes, and she founded a bank.")], CURIE);
  assert.equal(one.standing, "supported");
  assert.equal(both.standing, "unsupported", "the count holds, the bank is not stated");
  assert.match(both.why, /rest of the sentence/);
});

test("FALSIFIER: in a summary an invented sentence that names no one and carries no number is still a claim, and is flagged as added", async () => {
  const { finish } = await import("./opencode-finish.mjs");
  const run = (ask) => finish({ ask, draft: "The council approved a compromise by 7 to 4. The governor had already funded it with a federal grant.", passages: MINUTES, research: false });
  const summary = (await run("summarize the council meeting")).profile.claims.find((c) => /governor/.test(c.text));
  assert.equal(summary.standing, "unsupported");
  assert.equal(summary.added, true);
  assert.match(summary.why, /governor/);
  const essay = (await run("write something about it")).profile.claims.find((c) => /governor/.test(c.text));
  assert.ok(["argument", "unsupported"].includes(essay.standing), "outside a summary the essay gate is unchanged");
});

const { properName, midSentenceNames, subjectsOf } = await import("./opencode-research.mjs");

test("FALSIFIER: only a name is looked up — a noun phrase the referent reader individuates is not", () => {
  assert.equal(properName("Marie Curie"), true);
  for (const phrase of ["the water", "the animal", "the sea", "their young"]) assert.equal(properName(phrase), false, phrase);
  const mid = midSentenceNames("Web pages are many. Dolphins live in pods, and Flipper lives in Florida. The vaquita is a porpoise.");
  assert.equal(mid.has("Flipper"), true, "a capitalised word in the middle of a sentence is a name");
  assert.equal(mid.has("Florida"), true);
  assert.equal(mid.has("Web"), false, "a word that is only capitalised because it opens a sentence is not");
  assert.deepEqual(subjectsOf({ text: "The water is warm.", beings: ["the water", "Web"] }, (b) => mid.has(b)), [], "nothing here is worth a lookup");
});

test("FALSIFIER: a candidate must carry exactly the name; a nearby name is not the being (\"the water\" is not The Waterboys)", async () => {
  const fetchImpl = async (url) => {
    const p = new URL(url).searchParams;
    if (p.get("action") === "wbsearchentities") return { ok: true, status: 200, json: async () => ({ search: [{ id: "Q1422720", label: "The Waterboys" }] }) };
    if (p.get("action") === "wbgetentities") return { ok: true, status: 200, json: async () => ({ entities: { Q1422720: { id: "Q1422720", labels: { en: { value: "The Waterboys" } }, descriptions: { en: { value: "Scottish-Irish rock band" } }, sitelinks: {}, claims: {} } } }) };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const r = await whoIs("the water", { text: "The water is warm and the sea is calm.", fetchImpl });
  assert.notEqual(r.verdict, "bound");
  assert.match(r.basis, /exactly this name/);
});

test("FALSIFIER: research spends its lookups on claims that carry a figure and name a being, and says what it did not research", async () => {
  const seen = [];
  const fetchImpl = async (url) => { seen.push(url); return { ok: false, status: 404, json: async () => ({}) }; };
  const claims = [
    { text: "Dolphins are mammals.", standing: "unsupported", beings: ["Dolphins"], searched: ["material"] },
    { text: "Marie Curie discovered radium in 1899.", standing: "unsupported", beings: ["Marie Curie"], searched: ["material"] },
  ];
  const r = await researchClaims(claims, { fetchImpl, budgetMs: 5000, answer: "Dolphins are mammals. Marie Curie discovered radium in 1899." });
  assert.ok(r.claims[0].searched.some((x) => /not researched/.test(x)), "no figure: not researched, and said so");
  assert.ok(!r.claims[1].searched.some((x) => /not researched/.test(x)), "a figure and a name: researched");
});

test("FALSIFIER: a turn that read nothing says so on the profile", async () => {
  const { finish } = await import("./opencode-finish.mjs");
  const none = await finish({ ask: "write about dolphins", draft: "Dolphins are mammals. They live in pods.", passages: [], research: false });
  assert.equal(none.profile.noMaterial, true);
  const some = await finish({ ask: "write about dolphins", draft: "Dolphins are mammals.", passages: [{ name: "d.md", text: "Dolphins are mammals that live in pods." }], research: false });
  assert.equal(some.profile.noMaterial, false);
});

test("FALSIFIER: an answer with no recorded ask is still profiled, and says so; the settle step still refuses an empty ask", async () => {
  const { finish, profileOf } = await import("./opencode-finish.mjs");
  assert.equal((await finish({ ask: "", draft: "Marie Curie was born in 1867.", passages: [], research: false })).ok, false, "the settle step's empty-ask guard stands");
  const r = await profileOf({ draft: "Marie Curie was born in 1867. She won two Nobel Prizes.", passages: [], research: false });
  assert.equal(r.ok, true);
  assert.equal(r.profile.claims.filter((c) => c.standing === "unsupported").length, 2, "both claims are shown, rest on nothing read");
  assert.equal(r.profile.noMaterial, true);
  assert.match(r.disclosure, /no ask was recorded/);
});

test("FALSIFIER: a name Wikidata keeps only under the language-neutral label is still the being (the physicist Pierre Curie has no `en` label)", async () => {
  const fetchImpl = async (url) => {
    const p = new URL(url).searchParams;
    if (p.get("action") === "wbsearchentities") return { ok: true, status: 200, json: async () => ({ search: [{ id: "Q37463", label: "Pierre Curie" }] }) };
    if (p.get("action") === "wbgetentities") return { ok: true, status: 200, json: async () => ({ entities: { Q37463: { id: "Q37463", labels: { mul: { value: "Pierre Curie" } }, descriptions: { en: { value: "French physicist and chemist (1859\u20131906)" } }, sitelinks: { enwiki: { title: "Pierre Curie" } }, claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q5" } } } }], P570: [{ mainsnak: { datavalue: { value: { time: "+1906-04-19T00:00:00Z" } } } }] } } } }) };
    return { ok: true, status: 200, json: async () => ({ query: { pages: [{ title: "Pierre Curie", extract: "Pierre Curie was a French physicist who died in 1906." }] } }) };
  };
  const r = await whoIs("Pierre Curie", { text: "Pierre Curie died in 1906.", fetchImpl });
  assert.equal(r.verdict, "bound");
  assert.equal(r.entity.qid, "Q37463");
  assert.equal(r.entity.label, "Pierre Curie");
});

test("an argument sentence about the material is a claim: a negation or a widening of a stated line is judged", async () => {
  const passages = [{ name: "p", text: "Dolphins are a diverse group of animals, ranging from small to large. Some dolphin species are endangered, such as the Maui dolphin." }];
  const { aboutPassages } = await import("./opencode-profile.mjs");
  assert.equal(aboutPassages("Dolphins are not a diverse group of animals.", passages), true);
  assert.equal(aboutPassages("Every dolphin species is endangered.", passages), true);
  assert.equal(aboutPassages("What should we take from this?", passages), false);
  assert.equal(aboutPassages("Nothing here is about ships.", passages), false);
});

test("a source tag standing alone is provenance, not a claim", async () => {
  const { proseUnits, sourceTagOnly } = await import("./opencode-profile.mjs");
  assert.equal(sourceTagOnly("(MarineBio, “Dolphin Biology”)."), true);
  assert.equal(sourceTagOnly("([MarineBio](https://www.marinebio.org/creatures/dolphins/biology/))."), true);
  assert.equal(sourceTagOnly("(22,838 ft)"), false);
  const u = proseUnits("Dolphins are a diverse group of animals. (MarineBio, “Dolphin Biology”).");
  assert.ok(u.every((x) => x.standing !== "unchecked" || !x.text.startsWith("(")), "the tag is not judged");
});
