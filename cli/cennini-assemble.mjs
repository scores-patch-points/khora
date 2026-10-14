#!/usr/bin/env node
// cli/cennini-assemble.mjs — THE FIRST ASSEMBLED RUN: ask in, change out, every part in its place (2026-10-13).
//
// The movement's parts, fitted for the first time on one workspace, each used through its own interface:
//   LOOK    native/organs/repo-look.js        where in the workspace the ask's words land, with bytes
//   DOOR    khora POST /v1/code               the Fold's real coding door and real local model draw the attempt
//   FINISH  native/organs/follow-through.js   the imports a call the attempt added needs, from files the session holds
//   APPLY   follow-through.js applyFinish     the snippets at their anchor
//   RE-READ the code reader (missingImports)  did the unbound names land
//   TEST    the task's own declared test      the physical verdict
//
// ONE DRAW, TWO VERDICTS (paired, so there is no draw-to-draw noise): the door's raw attempt is tested as it came
// (arm A, "the door alone"), then completed by FINISH and tested again (arm B, "the door plus the assembly"). A
// third arm (C) completes the SAME attempt against a WRONG world (the helper files of a different ask): if C also
// fixes it, the fix was not about the files the session holds and arm B proves nothing.
//
// SUPERSEDED FOR THE GRADE (2026-10-13): this driver gates the door on a stub marker with one round, which the first
// live run showed is the wrong grain — 9 of 12 draws made no edit because the door's patch grammar refused the answer
// and repair was switched off. cli/cennini-ladder.mjs gives the door its own real test and grades the same draw at each
// rung. This file stays as the panel, `complete` and the shared helpers.
//
// THE GATE THAT KEEPS THE ATTEMPT. `/v1/code` reverts any attempt that fails its test, so the raw attempt would
// never survive to be completed. The door is given a gate that is red while the stub's TODO marker stays and green
// the moment any edit removes it; the driver then runs the REAL test on what was left. That is a disclosed change to
// how the door is used, not to what it does.
//
// WHAT THIS IS NOT. The panel is synthetic and small: it exists so FINISH has something to finish. It is not the
// frozen piece of the Fold's own held-out work, so nothing here counts toward the exam's CHANGE-whole. It is the
// first time the parts run together, graded honestly, including when it fails.
//
//   node cli/cennini-assemble.mjs --out RUNS.json [--base http://127.0.0.1:11436] [--reps 2] [--only id,id]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { finish, applyFinish } from "../native/organs/follow-through.js";
import { indexWorktree, look as lookAt } from "../native/organs/repo-look.js";
import { missingImports } from "../native/adapters/code/mechanical.js";
import { keywordsFor } from "../native/adapters/code/edges.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SURFACE = "khora POST /v1/code (gated on the stub marker) + native/organs repo-look + follow-through, node-driven";

const HELPERS = Object.freeze({
  "numbers.mjs": "export function sum(xs) {\n  return xs.reduce((a, b) => a + b, 0);\n}\n\nexport function count(xs) {\n  return xs.length;\n}\n",
  "strings.mjs": "export function upper(s) {\n  return s.toUpperCase();\n}\n\nexport function lower(s) {\n  return s.toLowerCase();\n}\n\nexport function dashed(s) {\n  return s.trim().replace(/\\s+/g, \"-\");\n}\n",
});

const stub = (fn, params = "") => `export function ${fn}(${params}) {\n  throw new Error("TODO: ${fn}");\n}\n`;
/** The parameter list each ask states in its own words. The first live ladder (12 draws, 2026-10-13) showed the mouth
 *  copying the stub's EMPTY parameter list (`mean()`, `isEven()`, `slugify()`) and then using the names the ask gave it:
 *  4 of 10 attempts failed `ReferenceError: xs is not defined`. Real stubs usually carry their signature, so a `signed`
 *  panel is the more representative one; the unsigned one stays, because the drop is itself a measured finding. */
export const PARAMS = Object.freeze({ total: "items", greeting: "name", mean: "xs", slug: "title", even: "n", clamp: "x, lo, hi" });
const testOf = (mod, body) => `import assert from "node:assert";\nimport { ${body.fn} } from "./${mod}";\n${body.cases}\nconsole.log("ok");\n`;

/** needs: names the right solution calls from a helper file. control asks need none. */
export const PANEL = Object.freeze([
  { id: "total", target: "cart.mjs", fn: "formatTotal", needs: ["sum"],
    task: "Implement formatTotal(items) in cart.mjs so that `node test.mjs` passes. It returns a dollar string with two decimals, the total of the items' price fields. Use the sum() helper from numbers.mjs.",
    cases: 'assert.strictEqual(formatTotal([{ price: 1.5 }, { price: 2 }]), "$3.50");\nassert.strictEqual(formatTotal([]), "$0.00");' },
  { id: "greeting", target: "greet.mjs", fn: "greeting", needs: ["upper"],
    task: "Implement greeting(name) in greet.mjs so that `node test.mjs` passes. It returns \"Hello, \" then the name in upper case then \"!\". Use the upper() helper from strings.mjs.",
    cases: 'assert.strictEqual(greeting("ada"), "Hello, ADA!");\nassert.strictEqual(greeting("Bo"), "Hello, BO!");' },
  { id: "mean", target: "stats.mjs", fn: "mean", needs: ["sum", "count"],
    task: "Implement mean(xs) in stats.mjs so that `node test.mjs` passes. It is the sum of xs divided by how many there are. Use the sum() and count() helpers from numbers.mjs.",
    cases: "assert.strictEqual(mean([2, 4, 6]), 4);\nassert.strictEqual(mean([5]), 5);" },
  { id: "slug", target: "slug.mjs", fn: "slugify", needs: ["lower", "dashed"],
    task: "Implement slugify(title) in slug.mjs so that `node test.mjs` passes. It lower-cases the title and joins its words with dashes. Use the lower() and dashed() helpers from strings.mjs.",
    cases: 'assert.strictEqual(slugify("Hello Big World"), "hello-big-world");\nassert.strictEqual(slugify("  One  Two "), "one-two");' },
  { id: "even", target: "even.mjs", fn: "isEven", needs: [], control: true,
    task: "Implement isEven(n) in even.mjs so that `node test.mjs` passes. It is true when n divides by two with no remainder.",
    cases: "assert.strictEqual(isEven(4), true);\nassert.strictEqual(isEven(7), false);\nassert.strictEqual(isEven(0), true);" },
  { id: "clamp", target: "clamp.mjs", fn: "clamp", needs: [], control: true,
    task: "Implement clamp(x, lo, hi) in clamp.mjs so that `node test.mjs` passes. It returns x limited to the range from lo to hi.",
    cases: "assert.strictEqual(clamp(5, 0, 3), 3);\nassert.strictEqual(clamp(-1, 0, 3), 0);\nassert.strictEqual(clamp(2, 0, 3), 2);" },
]);

export const filesOf = (ask, { signed = false } = {}) => ({ ...HELPERS, [ask.target]: stub(ask.fn, signed ? PARAMS[ask.id] ?? "" : ""), "test.mjs": testOf(ask.target, ask) });
const STUB_MARKER = (ask) => `TODO: ${ask.fn}`;

const keywordsOf = (file) => keywordsFor("javascript")?.keywords ?? null;
export const missingNames = (text, file) => missingImports(text, file, { keywords: keywordsOf(file) }).map((m) => m.name).sort();

/** FINISH + APPLY + RE-READ over an attempt. Pure. `world` is [{ path, text }] (the files the session holds). */
export function complete({ before, after, file, world }) {
  const f = finish({ before, after, file, world });
  const completed = applyFinish(after, f.proposals);
  const wasMissing = missingNames(after, file), nowMissing = missingNames(completed, file);
  const seed = new Set(f.seed);
  return {
    completed, changed: completed !== after,
    proposals: f.proposals.map((p) => ({ kind: p.kind, name: p.name, spec: p.spec ?? null, via: p.via ?? null })),
    gaps: f.gaps.map((g) => g.kind),
    reread: { fixed: wasMissing.filter((n) => seed.has(n) && !nowMissing.includes(n)), stillMissing: nowMissing.filter((n) => seed.has(n)) },
  };
}

export const runTest = (workspace) => {
  const r = spawnSync("node", ["test.mjs"], { cwd: workspace, encoding: "utf8", timeout: 30000 });
  const first = String((r.stderr || r.stdout || "").split("\n").find((l) => /Error|error|not defined|TODO/.test(l)) ?? "").slice(0, 140);
  return { pass: r.status === 0, detail: r.status === 0 ? null : first || `exit ${r.status}` };
};

// ABSOLUTE paths: Finish computes specifiers from them (a relative path would read as a bare package)
export const readWorld = (workspace, exceptFile) => fs.readdirSync(workspace)
  .filter((f) => f.endsWith(".mjs") && f !== exceptFile && f !== "test.mjs")
  .map((f) => ({ path: path.join(workspace, f), text: fs.readFileSync(path.join(workspace, f), "utf8") }));

/** One assembled run on a fresh workspace. `fetchImpl` null = the real door; any injected fetch makes `live` false. */
export async function assembledRun({ ask, rep = 1, base = "http://127.0.0.1:11436", timeoutMs = 170000, fetchImpl = null, workspaceRoot = os.tmpdir(), wrongWorld = null }) {
  const workspace = fs.mkdtempSync(path.join(fs.realpathSync(workspaceRoot), `cennini-asm-${ask.id}-`));
  try {
    for (const [f, body] of Object.entries(filesOf(ask))) fs.writeFileSync(path.join(workspace, f), body);
    spawnSync("git", ["init", "-q"], { cwd: workspace });
    const before = fs.readFileSync(path.join(workspace, ask.target), "utf8");

    // LOOK
    const idx = indexWorktree(workspace);
    const lk = idx.gap ? { gaps: [{ kind: idx.gap }], candidates: [] } : lookAt({ index: idx, ask: ask.task });
    const looked = { candidates: lk.candidates.length, top: lk.candidates[0]?.path ?? null, found: lk.candidates.slice(0, 3).some((c) => c.path === ask.target) };

    // DOOR (gated on the stub marker so the raw attempt is kept)
    const gate = `node -e "process.exit(require('fs').readFileSync('${ask.target}','utf8').includes('${STUB_MARKER(ask)}')?1:0)"`;
    const t0 = Date.now();
    let door = { ok: false, ms: 0, error: null };
    try {
      const r = await (fetchImpl ?? fetch)(`${base}/v1/code`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: ask.task, workspace, testCommand: gate, maxRounds: 1 }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) throw new Error(`the code door answered ${r.status}`);
      await r.json();
      door = { ok: true, ms: Date.now() - t0, error: null };
    } catch (e) { door = { ok: false, ms: Date.now() - t0, error: String(e?.message ?? e).slice(0, 160) }; }

    const after = fs.readFileSync(path.join(workspace, ask.target), "utf8");
    const attempted = after !== before;
    const world = readWorld(workspace, ask.target);

    // ARM A: the raw attempt, tested as it came
    const A = runTest(workspace);
    // ARM B: completed against the files the session holds
    const abs = path.join(workspace, ask.target);
    const b = complete({ before, after, file: abs, world });
    fs.writeFileSync(path.join(workspace, ask.target), b.completed);
    const B = runTest(workspace);
    // ARM C: the same attempt completed against a WRONG world
    fs.writeFileSync(path.join(workspace, ask.target), after);
    const wrong = wrongWorld ?? [{ path: path.join(workspace, "other.mjs"), text: "export function nothing() {\n  return 0;\n}\n" }];
    const c = complete({ before, after, file: abs, world: wrong });
    fs.writeFileSync(path.join(workspace, ask.target), c.completed);
    const C = runTest(workspace);
    fs.writeFileSync(path.join(workspace, ask.target), after);

    return {
      ask: ask.id, rep, live: fetchImpl === null, surface: SURFACE, control: !!ask.control, needs: ask.needs,
      looked, door, attempted,
      importedByAttempt: ask.needs.length ? ask.needs.every((n) => !missingNames(after, ask.target).includes(n)) : null,
      A, B: { ...B, proposals: b.proposals, gaps: b.gaps, reread: b.reread, changed: b.changed },
      C: { ...C, proposals: c.proposals, changed: c.changed },
    };
  } finally { fs.rmSync(workspace, { recursive: true, force: true }); }
}

/** descriptive counts over records: the transitions, and the controls. */
export function summarize(records) {
  const live = records.filter((r) => r.live && r.door.ok && r.attempted);
  const t = (rs) => ({ n: rs.length, A: rs.filter((r) => r.A.pass).length, B: rs.filter((r) => r.B.pass).length,
    fixed: rs.filter((r) => !r.A.pass && r.B.pass).length, harmed: rs.filter((r) => r.A.pass && !r.B.pass).length,
    C_fixed: rs.filter((r) => !r.A.pass && r.C.pass).length });
  return {
    runs: records.length, live: records.filter((r) => r.live).length, doorFailed: records.filter((r) => !r.door.ok).length,
    noAttempt: records.filter((r) => r.door.ok && !r.attempted).length,
    all: t(live), needsHelper: t(live.filter((r) => !r.control)), control: t(live.filter((r) => r.control)),
    lookFoundTarget: live.filter((r) => r.looked.found).length,
    attemptAlreadyImported: live.filter((r) => r.importedByAttempt === true).length,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const out = arg("--out");
  if (!out) { console.error("usage: node cli/cennini-assemble.mjs --out RUNS.json [--base URL] [--reps N] [--only id,id]"); process.exit(2); }
  if (path.resolve(out).startsWith(path.resolve(HERE, "..") + path.sep)) { console.error("refusing to write run records inside the khora repo"); process.exit(2); }
  const only = arg("--only") ? new Set(arg("--only").split(",")) : null;
  const reps = Number(arg("--reps", "2")), base = arg("--base", "http://127.0.0.1:11436");
  const records = [];
  for (let rep = 1; rep <= reps; rep++) for (const ask of PANEL) {
    if (only && !only.has(ask.id)) continue;
    const r = await assembledRun({ ask, rep, base });
    records.push(r);
    console.error(`${r.ask}#${rep}: door ${r.door.ok ? "ok" : "FAILED " + r.door.error} ${r.door.ms}ms | look top=${r.looked.top} | A ${r.A.pass ? "pass" : "FAIL"} -> B ${r.B.pass ? "pass" : "FAIL"} | proposals ${r.B.proposals.map((p) => p.kind + ":" + p.name).join(",") || "none"} | C ${r.C.pass ? "pass" : "FAIL"}`);
  }
  fs.writeFileSync(out, JSON.stringify({ surface: SURFACE, summary: summarize(records), records }, null, 1));
  console.error(JSON.stringify(summarize(records)));
}
