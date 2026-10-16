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

// ── the surf note: where in the raw turns the ask's beings are, as offsets, inside the existing budget ──
const surfNote = (ans, task, sid, ask, turns) => ans({ event: "surf", sessionID: sid, task, ask, turns }).then((r) => r.note);
const planted = (len, plants) => Array.from({ length: len }, (_, i) => ({ ...filler(i + 1), ...(plants[i + 1] ?? {}) }));

test("S1 the surf note carries a weft line whose address expands to the planted sentence", { skip: SKIP }, async () => {
  const task = fresh(), s = "The zorblax3 contract requires idempotent writes.";
  const note = await surfNote(answer, task, "ses_s1aaaa", "extend the zorblax3 writes", planted(60, { 7: { answer: `${s} Tests pass.` } }));
  const m = /weft [^\n]*?: ([^\n]*)/.exec(note); assert.ok(m, note);
  const addr = /([\w.-]+\.turns\.md)#(\d+)/.exec(m[1]);
  assert.equal(expandHit({ file: `${task}/${addr[1]}`, at: Number(addr[2]), address: addr[0] }, { root: WN }).text, s);
  assert.ok(/<fold-said>[\s\S]*weft /.test(note) && !/<fold-mechanical>[^<]*weft /.test(note), "a said-derived pointer is in the said section");
});

test("S2 the note stays inside FOLD_NOTE_CHARS and carries addresses, not prose", { skip: SKIP }, async () => {
  const task = fresh();
  await answer({ event: "surf", sessionID: "ses_s2bbbb", task, ask: "q", turns: [{ n: 1, ask: "a", answer: "The parser drops trailing commas.", grounds: [] }] });
  const note = await surfNote(answer, task, "ses_s2aaaa", "does the parser drop trailing commas", [{ n: 1, ask: "a", answer: "The parser does not drop trailing commas.", grounds: [] }]);
  assert.ok(note.length <= 700, `${note.length}`);
  const line = /weft [^\n]*/.exec(note)?.[0] ?? ""; assert.match(line, /conflict parser drop commas/);
  assert.doesNotMatch(line, /requires|Tests pass|trailing/, "no sentence text rides in the line");
});

test("S3 under a tight budget the weft line is dropped whole, never an address cut in half", { skip: SKIP }, async () => {
  process.env.FOLD_NOTE_CHARS = "500"; // measured: at 460-500 an unguarded pack cut the second address mid-way
  try {
    const { answer: tight } = await import(`./opencode-doorway.mjs?tight=${Date.now()}`);
    const turns = Array.from({ length: 4 }, (_, i) => ({ n: i + 1, ask: `ask ${i}`, answer: i === 1 ? "The zorblax3 contract requires idempotent writes." : "Done.", grounds: [] }));
    const note = await surfNote(tight, fresh(), "ses_s3aaaa", "extend the zorblax3 writes", turns);
    assert.ok(!/weft [^\n]*…/.test(note), `cut line: ${note}`);
    for (const l of note.split("\n").filter((x) => x.startsWith("weft "))) assert.match(l, /#\d+$/, l);
  } finally { delete process.env.FOLD_NOTE_CHARS; }
});

test("S4 FOLD_WEFT=0 and an ask that names nothing known both leave the note without a weft line", { skip: SKIP }, async () => {
  const task = fresh(), turns = planted(30, { 7: { answer: "The zorblax3 contract requires idempotent writes. Tests pass." } });
  assert.doesNotMatch(await surfNote(answer, task, "ses_s4aaaa", "something about nothing indexed", turns), /weft /);
  process.env.FOLD_WEFT = "0";
  try { assert.doesNotMatch(await surfNote(answer, fresh(), "ses_s4bbbb", "extend the zorblax3 writes", turns), /weft /); } finally { delete process.env.FOLD_WEFT; }
});

test("S5 the read stays cheap with a big store (300 turns, 40 segments already in it)", { skip: SKIP }, async () => {
  const task = fresh();
  for (let i = 0; i < 40; i++) await answer({ event: "surf", sessionID: `ses_pad${i}aaaa`, task: fresh(), ask: "q", turns: planted(8, {}) });
  await answer({ event: "surf", sessionID: "ses_s5aaaa", task, ask: "q", turns: planted(300, { 9: { answer: "The zorblax3 contract requires idempotent writes. Tests pass." } }) });
  const t0 = Date.now(); const note = await surfNote(answer, task, "ses_s5aaaa", "extend the zorblax3 writes", planted(300, { 9: { answer: "The zorblax3 contract requires idempotent writes. Tests pass." } }));
  const ms = Date.now() - t0; assert.match(note, /weft /); assert.ok(ms < 1000, `${ms}ms`);
});
