// opencode-ledger-check.test.mjs — the falsifiers for the ledger checker, with the before-state as
// the control: with no turns accumulated, the same denial draws nothing (the OxF residual, live);
// with one turn on the record, the denial is a contest. Plus re-sighting, novelty, determinism, and
// the route-level wiring proof (the door's ground answer carries the flag — display-only).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkAnswer, edgesOf } from "./opencode-ledger-check.mjs";
import { loadRegister } from "./opencode-predigest.mjs";

test("LC-register the received priors are on disk (else the check is a typed gap, never a clean bill)", () => {
  assert.equal(loadRegister().gap, null, `register gap: ${JSON.stringify(loadRegister().gap)} — run with FOLD_ENG_PRIOR_DIR/FOLD_POS_PRIOR`);
});

const PRIOR = "validateOrder calls normalizeTotals.";
const DENIAL = "validateOrder does not call normalizeTotals.";
const P = (n) => ({ n, agent: "A", text: PRIOR });

test("LC0 the predigest reads the pair the check needs: one positive, one negated, the same ends", () => {
  const pos = edgesOf(PRIOR, "turn-1");
  const neg = edgesOf(DENIAL, "answer");
  assert.equal(pos.length, 1);
  assert.equal(neg.length, 1);
  assert.deepEqual([pos[0].subject, pos[0].verb, pos[0].object], [neg[0].subject, neg[0].verb, neg[0].object]);
  assert.equal(pos[0].polarity, "+");
  assert.equal(neg[0].polarity, "-");
  assert.match(String(neg[0].spans[0].ref), /^answer#\d+$/);
});

test("LC1 the falsifier: a cross-turn contradiction flags — with no turns it stays clean (the before-state)", () => {
  const before = checkAnswer({ turns: [], text: DENIAL });
  assert.equal(before.ok, true);
  assert.equal(before.flags.length, 0); // nothing accumulated → nothing to contest — the OxF residual, demonstrated
  const after = checkAnswer({ turns: [P(1)], text: DENIAL });
  assert.equal(after.ok, true);
  assert.equal(after.summary.contested, 1);
  assert.equal(after.flags[0].kind, "ledger_contested");
  assert.match(after.flags[0].detail, /denies "validateorder call normalizetotals"/);
});

test("LC2 a re-sighting is retold, never two notes, and is not a flag", () => {
  const r = checkAnswer({ turns: [P(1)], text: "validateOrder calls normalizeTotals." });
  assert.equal(r.summary.contested, 0);
  assert.equal(r.summary.retold, 1);
  assert.equal(r.summary.new, 0);
  assert.equal(r.flags.length, 0);
});

test("LC3 a new arrangement is new, and new is not a flag", () => {
  const r = checkAnswer({ turns: [P(1)], text: "parseConfig reads the deploy file." });
  assert.equal(r.flags.length, 0);
  assert.ok(r.summary.new >= 1);
});

test("LC4 determinism: same turns + text → byte-identical report", () => {
  const turns = [P(1), { n: 2, text: "parseConfig reads the deploy file." }];
  const a = JSON.stringify(checkAnswer({ turns, text: DENIAL }));
  const b = JSON.stringify(checkAnswer({ turns, text: DENIAL }));
  assert.equal(a, b);
});

test("LC5 route-level: the door's ground answer carries the flag (display-only wiring)", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lc-wn-"));
  process.env.FOLD_WORKNOTES_DIR = root;
  try {
    const task = "t-ledger-check";
    // the turns file, written directly in the medium's framed format (base-independent: the
    // branch's writeTurnsFile helper is not on every base)
    const dir = path.join(root, task);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "ses_A.turns.md"),
      `# turns ses_A\n\n## turn 1\n\nask: what does validateOrder do\n\nanswer-bytes: ${Buffer.byteLength(PRIOR)}\n\n${PRIOR}`,
    );
    const door = await import(`./opencode-doorway.mjs?t=${Date.now()}${Math.random()}`);
    const out = await door.answer({ event: "ground", task, sessionID: "ses_A", text: DENIAL });
    const kinds = (out.flags ?? []).map((f) => f.kind);
    assert.ok(kinds.includes("ledger_contested"), `flags: ${JSON.stringify(kinds)}`);
    // the cell/standing attribution rides when the standing-cube layer is present (it maps flag
    // cells on the ground path); on this base the flag carries kind + detail only
    const flagged = out.flags.find((f) => f.kind === "ledger_contested");
    assert.match(flagged.detail, /denies/);
    // the null control: the same answer in a task with no turns draws no ledger flag
    const clean = await door.answer({ event: "ground", task: "t-ledger-clean", sessionID: "ses_B", text: DENIAL });
    assert.ok(!(clean.flags ?? []).some((f) => f.kind === "ledger_contested"));
  } finally {
    delete process.env.FOLD_WORKNOTES_DIR;
  }
});
