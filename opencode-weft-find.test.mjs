// opencode-weft-find.test.mjs — the batteries through a REAL round trip: surf events write turns.md and the weft store; findInWeft reads only the store
// and expandHit reads the raw file. Nothing in memory carries between the write and the read.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const WN = tmp("wf-wn-"), STORE = tmp("wf-store-");
process.env.FOLD_WORKNOTES_DIR = WN; process.env.FOLD_WEFT_DIR = STORE; process.env.FOLD_OPENCODE_STATE = tmp("wf-st-");
const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
const { findInWeft, expandHit } = await import("./opencode-weft-find.mjs");
const { loadRegister } = await import("./opencode-predigest.mjs");
const SKIP = loadRegister().gap ? "priors not on disk" : false;
let n = 0; const fresh = () => `f${process.pid}x${++n}`;
const T = ["parser lexer", "deploy staging", "database migration", "css layout"];
const filler = (i) => ({ n: i, ask: `please work on the ${T[i % 4]} item ${i}`, answer: `Done with the ${T[i % 4]} work in file${i}. Tests pass.`, grounds: ["edit"] });
const session = async (task, sid, plants = {}, len = 100) => { const turns = Array.from({ length: len }, (_, i) => ({ ...filler(i + 1), ...(plants[i + 1] ?? {}) })); await answer({ event: "surf", sessionID: sid, task, ask: "q", turns }); return turns; };
const sentences = (hits) => hits.map((h) => expandHit(h, { root: WN }).text);

test("F1 coined-name needle, 12 cases: the stored record leads to the exact sentence", { skip: SKIP }, async () => {
  for (let k = 0; k < 12; k++) {
    const w = `zorblax${k}`, task = fresh(), s = `The ${w} contract requires idempotent writes.`;
    await session(task, `ses_n${k}aaaa`, { [5 + k]: { answer: `${s} Tests pass.` } });
    const { hits } = findInWeft({ ask: `extend the ${w} writes`, task });
    assert.ok(sentences(hits).some((t) => t.includes(s)), `${w}: ${JSON.stringify(sentences(hits))}`);
  }
});

test("F2 register jargon, 5 cases", { skip: SKIP }, async () => {
  for (const w of ["webhook", "backoff", "mutex", "callback", "idempotent"]) {
    const task = fresh(), s = `Priya decided the ${w} limits stay at five.`;
    await session(task, "ses_j1aaaa", { 20: { answer: `${s} Tests pass.` } });
    const { hits } = findInWeft({ ask: `tune the ${w} limits`, task });
    assert.ok(sentences(hits).some((t) => t.includes(s)), `${w}: ${JSON.stringify(sentences(hits))}`);
  }
});

test("F3 unnamed dependency: the ask names validateOrder; the hop reaches the sentence about normalizeTotals", { skip: SKIP }, async () => {
  const task = fresh();
  await session(task, "ses_h1aaaa", { 12: { answer: "normalizeTotals now rounds to cents. Tests pass." }, 40: { answer: "Added validateOrder, which calls normalizeTotals. Tests pass." } });
  const { hits } = findInWeft({ ask: "change validateOrder to reject negative totals", task });
  assert.ok(sentences(hits).some((t) => t.includes("normalizeTotals now rounds to cents")), JSON.stringify(sentences(hits)));
  assert.equal(findInWeft({ ask: "change validateOrder to reject negative totals", task, hops: 0 }).hits.some((h) => expandHit(h, { root: WN }).text.includes("rounds to cents")), false, "without the hop it is missed: the relation is what finds it");
});

test("F4 two agents contradict: the store reports the conflict with both addresses, and both expand to their sentences", { skip: SKIP }, async () => {
  const task = fresh();
  await answer({ event: "surf", sessionID: "ses_b1aaaa", task, ask: "q", turns: [{ n: 1, ask: "a", answer: "The parser drops trailing commas.", grounds: [] }] });
  await answer({ event: "surf", sessionID: "ses_c1aaaa", task, ask: "q", turns: [{ n: 1, ask: "a", answer: "The parser does not drop trailing commas.", grounds: [] }] });
  const { conflicts } = findInWeft({ ask: "does the parser drop trailing commas", task });
  assert.equal(conflicts.length, 1);
  const [c] = conflicts;
  assert.match(expandHit({ file: c.holds[0].split("#")[0], at: Number(c.holds[0].split("#")[1]), address: c.holds[0] }, { root: WN }).text, /^The parser drops trailing commas\.$/);
  assert.match(expandHit({ file: c.denies[0].split("#")[0], at: Number(c.denies[0].split("#")[1]), address: c.denies[0] }, { root: WN }).text, /does not drop/);
});

test("F5 a task never sees another task's records", { skip: SKIP }, async () => {
  const a = fresh(), b = fresh();
  await session(a, "ses_i1aaaa", { 10: { answer: "The quarkle index is sharded. Tests pass." } });
  await session(b, "ses_i2aaaa", {});
  assert.equal(findInWeft({ ask: "the quarkle index", task: b }).hits.length, 0);
  assert.ok(findInWeft({ ask: "the quarkle index", task: a }).hits.length > 0);
});

test("F6 the store holds offsets, not prose: the packed record is a small fraction of turns.md", { skip: SKIP }, async () => {
  const task = fresh(); await session(task, "ses_k1aaaa", {});
  const raw = fs.statSync(path.join(WN, task, "ses_k1aaaa.turns.md")).size;
  const segs = fs.readdirSync(STORE).filter((f) => f.startsWith("seg-")).map((f) => fs.statSync(path.join(STORE, f)).size);
  assert.ok(segs.at(-1) < raw / 4, `${segs.at(-1)} B segment vs ${raw} B raw`);
});
