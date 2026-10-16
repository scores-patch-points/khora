// opencode-stigmergy-reach.test.mjs — does the opencode path run on the REAL stack (ingest, reason, induct) or on adapters?
// Measured with a module-loader trace over every doorway event (scratchpad), then pinned here as static + live checks.
// X1 the hot-path modules import stack organs   X2 reasoning over the commons can see a contradiction
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STACK = /(\.\/native\/|janus|penelope|reasoning-spiral|kind-induction|spiral-contract|weft|ground-closure|dmd)/;

for (const f of ["opencode-surf.mjs", "opencode-eot.mjs", "opencode-worknotes.mjs", "opencode-record.mjs"]) {
  test(`X1 ${f} imports an organ of the stack (ingest/reason/induct) rather than re-implementing it`, () => {
    const src = fs.readFileSync(path.join(HERE, f), "utf8");
    const imports = [...src.matchAll(/^import .* from "([^"]+)"|import\("([^"]+)"\)/gm)].map((m) => m[1] ?? m[2]).filter((s) => !s.startsWith("node:") && !/^\.\/opencode-/.test(s));
    assert.ok(imports.some((s) => STACK.test(s)), `${f} imports nothing from the stack (${imports.join(", ") || "no imports"})`);
  });
}

test("X2 FALSIFIER: two agents who flatly contradict each other are reported as a conflict in the commons", async () => {
  process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "x-"));
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "xs-"));
  const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
  const mk = (t) => [{ n: 1, ask: "does the parser drop trailing commas", answer: t, grounds: ["edit"] }];
  await answer({ event: "surf", sessionID: "ses_bbbb2222", task: "t", ask: "q", turns: mk("The parser drops trailing commas.") });
  await answer({ event: "surf", sessionID: "ses_cccc3333", task: "t", ask: "q", turns: mk("The parser does not drop trailing commas.") });
  const r = await answer({ event: "context", sessionID: "ses_aaaa1111", task: "t", ask: "does the parser drop trailing commas", workspace: HERE });
  const note = JSON.stringify(r);
  assert.match(note, /drop/, "premise: the commons carried both claims");
  assert.match(note, /! bbbb2222≠cccc3333/, "a direct contradiction produced no conflict line");
});

after(async () => { (await import("./opencode-context.mjs")).shutdown(); setTimeout(() => process.exit(), 50).unref(); });
