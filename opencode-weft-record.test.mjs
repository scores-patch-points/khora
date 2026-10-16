// opencode-weft-record.test.mjs — the door appends predigested lean records to the weft store and keeps the raw in turns.md.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const WN = tmp("wr-wn-"), STORE = tmp("wr-store-");
process.env.FOLD_WORKNOTES_DIR = WN; process.env.FOLD_WEFT_DIR = STORE; process.env.FOLD_OPENCODE_STATE = tmp("wr-st-");
const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
const { openStore, asPass } = await import("./native/the-fold/weft-store.mjs");
const { weftAttestations, reopen } = await import("./native/the-fold/weft.js");
const { loadRegister } = await import("./opencode-predigest.mjs");
const SKIP = loadRegister().gap ? `priors not on disk (${JSON.stringify(loadRegister().gap)}): set FOLD_ENG_PRIOR_DIR / FOLD_POS_PRIOR or check out khora beside Zenodotus and janus` : false;
const T = (n, a) => ({ n, ask: `ask ${n}`, answer: a, grounds: ["edit"] });
const surf = (task, sid, turns) => answer({ event: "surf", sessionID: sid, task, ask: "q", turns });
const turns = [T(1, "Added validateOrder, which calls normalizeTotals. Tests pass."), T(2, "The parser drops trailing commas."), T(3, "The parser does not drop trailing commas.")];

test("W1 a surf event appends one lean pass per turn and leaves turns.md whole", { skip: SKIP }, async () => {
  await surf("t1", "ses_a1", turns);
  const passes = openStore(STORE).passes();
  assert.equal(passes.length, 3);
  const raw = fs.readFileSync(path.join(WN, "t1", "ses_a1.turns.md"), "utf8");
  for (const t of turns) assert.ok(raw.includes(t.answer), "raw prose is still in turns.md");
  assert.ok(passes.every((p) => p.a === "t1/ses_a1.turns.md" && p.ins.length >= 1));
});

test("W2 a rerun resumes: the same turns append nothing, a new turn appends one", { skip: SKIP }, async () => {
  const before = openStore(STORE).count();
  await surf("t1", "ses_a1", turns);
  assert.equal(openStore(STORE).count(), before);
  await surf("t1", "ses_a1", [...turns, T(4, "Zorblax7 now caches the token queue.")]);
  assert.equal(openStore(STORE).count(), before + 1);
});

test("W3 negation is recorded as EVA, only where it made a difference", { skip: SKIP }, () => {
  const ps = openStore(STORE).passes().filter((p) => p.con.length);
  const neg = ps.filter((p) => p.eva.length), pos = ps.filter((p) => !p.eva.length);
  assert.equal(neg.length, 1); assert.ok(pos.length >= 1);
  const edges = asPass(neg[0]).edges; assert.ok(edges.some((e) => e.polarity === "-"));
});

test("W4 the weft's own consumers read the records (weftAttestations), and an address re-expands to the sentence", { skip: SKIP }, () => {
  const passes = openStore(STORE).passes().map(asPass);
  const atts = [...weftAttestations(passes)];
  assert.ok(atts.length >= 2, `${atts.length} attestations`);
  const raw = fs.readFileSync(path.join(WN, "t1", "ses_a1.turns.md"));
  const edge = passes.flatMap((p) => p.edges).find((e) => e.end1 === "validateorder");
  const r = reopen(edge.refs[0], { read: () => raw, span: 20 });
  assert.match(r.text, /^validateOrder/);
});

test("W5 six processes append to one store at once: no segment is lost", { skip: SKIP }, async () => {
  const dir = tmp("wr-conc-"), script = path.join(tmp("wr-child-"), "child.mjs");
  fs.writeFileSync(script, `import fs from "node:fs";
import { recordTurnsToWeft } from ${JSON.stringify(path.join(HERE, "opencode-weft-record.mjs"))};
const id = process.argv[2], dir = process.argv[3], a = "The zorblax" + id + " contract requires idempotent writes.";
const file = dir + "/c" + id + ".md"; fs.writeFileSync(file, "# turns\\n\\n## turn 1\\n\\nask: q\\n\\n" + a + "\\n");
process.stdout.write(String(recordTurnsToWeft({ task: "c", agent: "a" + id, turns: [{ n: 1, ask: "q", answer: a }], file, dir }).appended));`);
  const run = (id) => new Promise((res) => { const p = spawn(process.execPath, [script, String(id), dir]); let o = ""; p.stdout.on("data", (d) => (o += d)); p.stderr.on("data", (d) => (o += "ERR:" + d)); p.on("close", () => res(o)); });
  const out = await Promise.all([1, 2, 3, 4, 5, 6].map(run));
  assert.deepEqual(out, Array(6).fill("1"));
  assert.equal(openStore(dir).count(), 6);
});

test("W6 fails open: an unwritable store never throws into the turn, and FOLD_WEFT=0 writes nothing", { skip: SKIP }, async () => {
  const blocker = path.join(tmp("wr-bad-"), "file"); fs.writeFileSync(blocker, "x");
  process.env.FOLD_WEFT_DIR = path.join(blocker, "store");
  const r = await surf("t2", "ses_b2", turns);
  assert.ok(typeof r === "object", "the surf event still answered");
  process.env.FOLD_WEFT_DIR = STORE; process.env.FOLD_WEFT = "0";
  const before = openStore(STORE).count(); await surf("t3", "ses_c3", turns);
  assert.equal(openStore(STORE).count(), before); delete process.env.FOLD_WEFT;
});
