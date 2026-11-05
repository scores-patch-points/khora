// identity-first-mention.test.mjs — identity at first mention: a name met ONCE gets an address (an EOReferent@1 id) and a typed "no evidence yet" outcome,
// not silence and not a merge.
//   KHORA_PRIORS_DIR=<ten English priors> node --test native/adapters/text/identity-first-mention.test.mjs
//
// The occurrence gates on the identity path, found by reading the code on 2aa08b3:
//   organs/cast.js            minSentences: 0 by declaration ("a name mentioned once is present once") — the document door (readDocument) admits a one-off capital.
//   surfaces.js discoverReferents   deriveMinSentences — the Fold perceiver's default: a candidate must recur in MORE sentences than the pool's 25th percentile.
//   surfaces.js extractSurfaces     the case-free floor: three distinct sentences and three mentions before a lowercase token is even a candidate.
//   recursive.js heard path         minMentions: 2 (nominal index and heardSurfaces) — a caseless nominal met once is never a being.
// The typed outcome is proposed here as a gap record {reason|gap: "no_evidence_yet", referent|ref: <the address>}; a fix that names it otherwise changes this one constant.
import test from "node:test";
import assert from "node:assert/strict";
import { readDocument } from "../../reading.js";
import { extractSurfaces } from "./surfaces.js";
import { assertCanon, perceive, referentsOf, entriesOf } from "../../the-fold/identity-fixture.mjs";

const NO_EVIDENCE = "no_evidence_yet";
// two names that recur (so the pool has a recurrence floor), then a name met exactly once, mid-sentence (a sentence-initial capital carries no evidence of namehood)
const RECURRING = "Yesterday Aldous Brenner grumbled and sulked. Meanwhile Clara Whitcombe laughed and danced. Often Aldous Brenner grumbled and sulked again. Often Clara Whitcombe laughed and danced again. Later Aldous Brenner grumbled and sulked once more. Later Clara Whitcombe laughed and danced once more.";
const ONCE = " The harbour near Rouen flooded after the storm.";
const typed = (list, ref) => (list ?? []).some((g) => (g.referent ?? g.ref) === ref && (g.reason ?? g.gap) === NO_EVIDENCE);
const read = (t) => readDocument(t, { language: "en", minCharacters: 0, lexicon: false });

test("canon: the reader is not degraded", async () => { await assertCanon(assert); });

test("cast.js (via readDocument): a one-off capitalised name gets an address and is neither dropped nor merged", async () => {
  const r = await read(RECURRING + ONCE);
  const rouen = r.cast.find((c) => c.allSurfaces.includes("Rouen"));
  assert.ok(rouen, "Rouen is on the cast");
  assert.match(rouen.ref, /^ref:auto:/);
  assert.equal(rouen.mentionsAt.length, 1);
  assert.deepEqual(rouen.allSurfaces, ["Rouen"], "not merged into anyone");
  assert.equal(r.cast.filter((c) => c.ref === rouen.ref).length, 1);
});

// GAP (confirmed failing on 2aa08b3): the singleton is admitted with standing "referent", exactly like a being met three times; nothing types the thinness.
test("cast.js (via readDocument): the one-off name carries a typed no-evidence-yet outcome", { todo: "readDocument gives the one-off Rouen standing 'referent' like any being; no gap or field says 'no evidence yet'" }, async () => {
  const r = await read(RECURRING + ONCE);
  const rouen = r.cast.find((c) => c.allSurfaces.includes("Rouen"));
  assert.ok(typed(r.gaps, rouen.ref) || rouen.evidence === NO_EVIDENCE);
});

// GAP (confirmed failing on 2aa08b3): surfaces.js::discoverReferents derives a recurrence floor; the Fold perceiver drops the one-off (it appears once, then twice -> admitted).
test("recursive.js + surfaces.js deriveMinSentences: a one-off capitalised name gets an EOReferent@1 address", { todo: "the perceiver's derived recurrence floor drops a name met in one sentence when the pool has recurrence; with a second mention it is admitted (measured)" }, async () => {
  const refs = referentsOf(await perceive(RECURRING + ONCE));
  assert.ok([...refs.values()].some((s) => s.includes("Rouen")), `addresses: ${JSON.stringify([...refs.keys()])}`);
});

test("control: the same name met twice is admitted by the perceiver (the gate is the count, not the name)", async () => {
  const refs = referentsOf(await perceive(RECURRING + ONCE + " Merchants near Rouen closed their shutters."));
  assert.ok([...refs.values()].some((s) => s.includes("Rouen")));
});

// GAP (confirmed failing on 2aa08b3): the thinness is not typed even where a one-off is kept.
test("recursive.js: a one-off capitalised name that is kept carries a typed no-evidence-yet gap on the log", { todo: "the only EOReferentGap@1 a referent carries is pronoun_and_descriptor_mentions_unresolved" }, async () => {
  const obs = await perceive(RECURRING + ONCE + " Merchants near Rouen closed their shutters.");
  const gaps = entriesOf(obs, "EOReferentGap@1");
  assert.ok(gaps.some((g) => g.referent === "ref:auto:rouen" && g.reason === NO_EVIDENCE));
});

// GAP (confirmed failing on 2aa08b3): recursive.js heard path, minMentions: 2.
const CASELESS = "the keeper walked to the lighthouse. the keeper climbed the stairs. the keeper lit the lamp. the keeper saw a sailor near the pier. the sailor waved at the keeper. the lighthouse stood above the sea. the sailor sailed the sea.";
test("recursive.js heard path (minMentions: 2): a caseless nominal met once gets an address", { todo: "nominalIndex.beings({minMentions: 2}) / heardSurfaces({minMentions: 2}) never admit 'pier' or 'lamp', each met once" }, async () => {
  const refs = referentsOf(await perceive(CASELESS));
  assert.ok([...refs.values()].some((s) => s.includes("pier")), `addresses: ${JSON.stringify([...refs.values()])}`);
});
test("control: the caseless nominal met many times is admitted (the gate is the count)", async () => {
  const refs = referentsOf(await perceive(CASELESS));
  assert.ok([...refs.values()].some((s) => s.includes("keeper")));
});

// GAP (confirmed failing on 2aa08b3): surfaces.js::extractSurfaces case-free floor (3 sentences, 3 mentions) — a lowercase name met once is not even a candidate.
test("surfaces.js case-free floor: a lowercase token met once is a candidate with its single mention", { todo: "extractSurfaces' case-free branch has `floor = 3` and `sentSet.size < 3`; a once-met token yields no candidate" }, async () => {
  const text = "the keeper walked to the lighthouse with zelda. the keeper climbed the stairs. the keeper lit the lamp. the keeper saw a sailor near the pier.";
  const entry = await read(text);
  const found = extractSurfaces(entry.sentences, { functionWords: new Set(["the", "a", "to", "with", "near"]) });
  assert.ok(found.some((s) => s.surface === "zelda" && s.mentions === 1), JSON.stringify(found));
});
test("control: the same floor admits the token met four times", async () => {
  const text = "the keeper walked to the lighthouse with zelda. the keeper climbed the stairs. the keeper lit the lamp. the keeper saw a sailor near the pier.";
  const found = extractSurfaces((await read(text)).sentences, { functionWords: new Set(["the", "a", "to", "with", "near"]) });
  assert.ok(found.some((s) => s.surface === "keeper" && s.mentions === 4));
});
