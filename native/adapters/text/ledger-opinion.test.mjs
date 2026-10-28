// ledger-opinion.test.mjs — the slot where an opinion is filed in the referent ledger, and the classes of pair (ledger-opinion.js; eval/referents/PREREG-IDENTITY-SEAT.md S1 to S3).
// No model is called here. The point of the slot is what an opinion CANNOT do: change the fold.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readWith } from "../../the-fold/read-core.mjs";
import { foldLog, isCoherent } from "./reading-timeline.js";
import { opinionEvent, retractOpinion, currentOpinions, markOpinionDependent, classifyPair, PAIR_CLASSES, CONTESTABLE, OPINION_CELL, VERDICTS } from "./ledger-opinion.js";

const SHA = "a".repeat(64);
const HOLDER = "self:model:qwen2.5-7b@3f9a";
const ok = (o = {}) => opinionEvent({ about: { spans: ["spn_a", "spn_b"] }, verdict: "same", holder: HOLDER, lens: SHA, frame: { asof: "2026-10-27", purpose: "coreference", whom: "reader" }, ...o });

test("S2: an opinion needs a holder of the form self:model:<id>, a lens that is a sha256, an about, and a verdict; it is never defaulted into existence", () => {
  const e = ok();
  assert.equal(e.op, "EVA"); assert.equal(e.kind, "opinion"); assert.equal(e.licensing, false); assert.equal(e.opinionDependent, true);
  assert.match(e.id, /^evt_[0-9a-f]{16}$/);
  assert.throws(() => ok({ holder: "qwen" }), /holder/);
  assert.throws(() => ok({ holder: undefined }), /holder/);
  assert.throws(() => ok({ lens: "not-a-hash" }), /lens/);
  assert.throws(() => ok({ lens: undefined }), /lens/);
  assert.throws(() => ok({ verdict: "probably" }), /verdict/);
  assert.throws(() => ok({ about: {} }), /about/);
  assert.throws(() => ok({ about: { spans: ["spn_a"] } }), /about/);
  for (const v of VERDICTS) assert.equal(ok({ verdict: v }).verdict, v);
  // determinism: the same opinion is the same event
  assert.equal(ok().id, ok().id);
  assert.notEqual(ok().id, ok({ verdict: "different" }).id);
});

test("S2: an opinion cannot be made licensing by a field", () => {
  assert.throws(() => ok({ licensing: true }), /never licenses/);
  assert.equal(ok().licensing, false);
});

test("a mention's opinion names the candidate it chose, among its candidates", () => {
  const about = { span: "spn_m", candidates: ["ref_a", "ref_b"] };
  const e = opinionEvent({ about, verdict: "same", chose: "ref_b", holder: HOLDER, lens: SHA });
  assert.equal(e.chose, "ref_b");
  assert.throws(() => opinionEvent({ about, verdict: "same", holder: HOLDER, lens: SHA }), /chose/);
  assert.throws(() => opinionEvent({ about, verdict: "same", chose: "ref_z", holder: HOLDER, lens: SHA }), /chose/);
  assert.equal(opinionEvent({ about, verdict: "undecided", holder: HOLDER, lens: SHA }).verdict, "undecided");
});

test("an opinion is supersedable and a retraction is an event: the current view drops what a later event supersedes, the log keeps it", () => {
  const first = ok(), second = ok({ verdict: "different", supersedes: first.id }), third = ok({ verdict: "same", about: { spans: ["spn_c", "spn_d"] } });
  const log = [first, second, third];
  assert.deepEqual(currentOpinions(log).map((e) => e.id), [second.id, third.id]);
  const retract = retractOpinion({ of: third.id, by: "giver:wiktionary", why: "the giver lists the forms as different names" });
  assert.equal(retract.supersedes, third.id); assert.equal(retract.licensing, false);
  assert.deepEqual(currentOpinions([...log, retract]).map((e) => e.id), [second.id]);
  assert.equal(log.length, 3, "nothing was edited");
  assert.throws(() => retractOpinion({ of: third.id, by: "x" }), /why/);
  assert.throws(() => retractOpinion({ by: "x", why: "y" }), /names the opinion/);
});

test("an answer that read an opinion says so and names it", () => {
  const a = markOpinionDependent({ verdict: "same" }, ["evt_1", "evt_2"]);
  assert.equal(a.opinionDependent, true); assert.deepEqual(a.opinions, ["evt_1", "evt_2"]); assert.equal(a.verdict, "same");
});

test("the cell is a coherent EVA at Lens/Binding (checked against reading-timeline.js, which this module may not import)", () => {
  assert.equal(isCoherent(OPINION_CELL), true);
  assert.equal(isCoherent(ok()), true);
  assert.equal(isCoherent(retractOpinion({ of: "evt_x", by: "g", why: "w" })), true);
});

test("S3: appending any number of opinions to a ledger's log changes no referent, no mention and no assignment: an opinion cannot license by construction", () => {
  const T = "Yesterday Anna Smith visited Paris. Yesterday Boris Smith visited Paris. Later Carla Jones met Boris Jones in Rome. Later Carla Jones met Boris Smith in Rome. This sentence is only padding so the text clears the minimum length for reading at all.";
  const L = readWith(T, { language: "en", minCharacters: 0, referents: true }).referents;
  const spans = L.spans.map((s) => s.id), refs = L.referents.map((r) => r.id);
  const opinions = [];
  for (let i = 0; i + 1 < spans.length; i++) opinions.push(ok({ about: { spans: [spans[i], spans[i + 1]] }, verdict: VERDICTS[i % 4] }));
  opinions.push(opinionEvent({ about: { span: spans[0], candidates: refs.slice(0, 2) }, verdict: "same", chose: refs[1], holder: HOLDER, lens: SHA }));
  opinions.push(retractOpinion({ of: opinions[0].id, by: "self:model:other@1", why: "second look" }));
  const view = (log) => { const f = foldLog(log); return JSON.stringify({ referents: [...f.referents].map(([k, r]) => [k, r.mentions.map((m) => m.id), r.absorbed]), assign: [...f.assign], alias: [...f.alias] }); };
  assert.equal(view([...L.log, ...opinions]), view(L.log));
  assert.ok(opinions.length > 5);
  // an opinion with the SAME shape as a SYN would have merged two referents: the control that shows the fold CAN be moved by a SYN
  const syn = { op: "SYN", site: "Link", stance: "Making", from: [refs[0]], into: refs[1] };
  assert.notEqual(view([...L.log, syn]), view(L.log));
});

test("S1: the classes are mutually exclusive and exhaustive; one crafted pair of each", () => {
  const ctx = { unearned: new Set(["r_titles"]), split: new Map([["r_mr", "plain_bennet"], ["r_mrs", "plain_bennet"]]) };
  const cls = (a, b) => classifyPair(a, b, ctx);
  assert.equal(cls({ label: null, text: "Anna" }, { label: "r1", text: "Anna" }), "UNDECIDED");
  assert.equal(cls({ label: "r_titles", text: "Mr. Bennet" }, { label: "r_titles", text: "Mrs. Bennet" }), "UNDECIDED");
  assert.equal(cls({ label: "r_mr", text: "Mr. Bennet" }, { label: "r_mrs", text: "Mrs. Bennet" }), "DIFF_SPLIT");
  assert.equal(cls({ label: "r1", text: "Anna Smith" }, { label: "r1", text: "anna  smith" }), "SAME_FORM");
  assert.equal(cls({ label: "r1", text: "Jared Padalecki" }, { label: "r1", text: "Padalecki" }), "SAME_VARIANT");
  assert.equal(cls({ label: "r1", text: "Anna Smith" }, { label: "r2", text: "Boris Smith" }), "DIFF_SHARED");
  assert.equal(cls({ label: "r1", text: "Anna Smith" }, { label: "r2", text: "Carla Jones" }), "DIFF_DISJOINT");
  // symmetric
  assert.equal(cls({ label: "r2", text: "Boris Smith" }, { label: "r1", text: "Anna Smith" }), "DIFF_SHARED");
  assert.deepEqual([...PAIR_CLASSES].sort(), ["DIFF_DISJOINT", "DIFF_SHARED", "DIFF_SPLIT", "SAME_FORM", "SAME_VARIANT", "UNDECIDED"]);
  assert.deepEqual([...CONTESTABLE].sort(), ["DIFF_SHARED", "SAME_VARIANT", "UNDECIDED"]);
  // exhaustive: every combination of the inputs lands in a listed class
  const labels = [null, "r1", "r2", "r_titles", "r_mr", "r_mrs"], texts = ["Anna Smith", "Boris Smith", "Carla", "Anna"];
  for (const la of labels) for (const lb of labels) for (const ta of texts) for (const tb of texts) assert.ok(PAIR_CLASSES.includes(cls({ label: la, text: ta }, { label: lb, text: tb })));
});

test("the module imports nothing but the page-safe hash (the reader's import graph stays free of node:)", () => {
  const src = fs.readFileSync(new URL("./ledger-opinion.js", import.meta.url), "utf8");
  const imports = [...src.matchAll(/^\s*import\s+(?:[^'"]*?from\s+)?["']([^"']+)["']/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ["./sha256hex.js"]);
});

// ── S4: the harness's counts on a reading whose classes are known by construction ──
import { tally, emptyTally, accuracy, summarise } from "../../../eval/referents/identity-seat.mjs";
test("S4: the harness counts a crafted document's pairs into the classes it was built to have, and the accuracy and error mass follow", () => {
  // five mentions: Anna Smith (r1) twice (same form), "Smith" (r1: a variant), Boris Smith (r2), Carla (r3), an unbound mention
  const it = [
    { gold: "anna", label: "r1", text: "Anna Smith" }, { gold: "anna", label: "r1", text: "Anna Smith" }, { gold: "anna", label: "r1", text: "Smith" },
    { gold: "boris", label: "r2", text: "Boris Smith" }, { gold: "carla", label: "r3", text: "Carla" }, { gold: "anna", label: null, text: "she" },
  ];
  const T = tally([{ items: it, ctx: { unearned: new Set(), split: new Map() } }]);
  // pairs: 15. SAME_FORM: (0,1). SAME_VARIANT: (0,2),(1,2). DIFF_SHARED: (0,3),(1,3),(2,3). DIFF_DISJOINT: (0,4),(1,4),(2,4),(3,4). UNDECIDED: (0,5)..(4,5) = 5.
  assert.deepEqual(Object.fromEntries(PAIR_CLASSES.map((c) => [c, T[c].n])), { UNDECIDED: 5, DIFF_SPLIT: 0, SAME_FORM: 1, SAME_VARIANT: 2, DIFF_SHARED: 3, DIFF_DISJOINT: 4 });
  assert.equal(PAIR_CLASSES.reduce((n, c) => n + T[c].n, 0), 15, "exhaustive");
  assert.equal(T.SAME_FORM.same, 1); assert.equal(T.SAME_VARIANT.same, 2); assert.equal(T.DIFF_SHARED.same, 0);
  assert.equal(T.UNDECIDED.same, 3, "the unbound mention is gold anna: same as the three Anna mentions, different from Boris and Carla");
  assert.equal(accuracy("SAME_VARIANT", T.SAME_VARIANT), 1); assert.equal(accuracy("DIFF_SHARED", T.DIFF_SHARED), 1); assert.equal(accuracy("UNDECIDED", T.UNDECIDED), null);
  const S = summarise("fixture", [{ items: it, ctx: { unearned: new Set(), split: new Map() } }], {});
  assert.equal(S.strictNecessity, 5); assert.equal(S.contestable, 10); assert.equal(S.pairs, 15);
  assert.equal(S.error.fusion_goldDifferent_joined, 0);
  // a wrong join: the same-referent pair whose gold is different is fusion
  const bad = tally([{ items: [{ gold: "x", label: "r", text: "Ann" }, { gold: "y", label: "r", text: "Anna" }], ctx: { unearned: new Set(), split: new Map() } }]);
  assert.equal(accuracy("SAME_VARIANT", bad.SAME_VARIANT), 0);
  assert.deepEqual(Object.keys(emptyTally()), PAIR_CLASSES);
});
