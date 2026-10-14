// native/tests/follow-through.test.js — the Finish organ (organs/follow-through.js), tested against an oracle that is NOT
// itself: the graded instrument it was lifted from (cli/apprentice-mover.mjs `propose` + `assemble`, imported here for the
// test only). The grade travels by EQUIVALENCE: same proposals, same assembled bytes, except where the organ's stub guard
// withholds a stub, and then the withheld stub is named in a typed gap. Real readEdges, mechanical.js, Goffman.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { keywordsFor } from "../adapters/code/edges.js";
import { FINISH_SCHEMA, finish, applyFinish, worldOf, targetOf, specFor, anchorOf } from "../organs/follow-through.js";
import { findCapacity } from "../organs/capacities.js";
import { cellOf } from "../kernel/cube.js";
import { prepareUnit, propose, assemble, World, FULL } from "../../cli/apprentice-mover.mjs";
import { loadScope } from "../../cli/apprentice-replay.mjs";

// These tests compare the organ with the graded instrument, which reads the vendored CodeKeywordPrior@1 through
// native/priors (a symlink into janus/priors). A clean clone has no such prior; without it the organ refuses stubs by
// design (stub-refused:no-keyword-prior) and the equivalence is not defined, so they skip with a named reason rather
// than pass on keywords read as callees.
const SKIP_NO_PRIOR = keywordsFor("javascript") ? false : "needs the vendored CodeKeywordPrior@1 (native/priors -> janus/priors); absent in a clean clone";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const scope = loadScope();
const P = "/p/khora/cli"; // an in-scope directory: the `khora` segment matches the scope's `in` rules
const GRADED = { ...FULL, ambient: false }; // the graded FULL arm minus the ambient lesson (noticed, not learned)
const whole = (before, after) => ({ before: [[0, before.length]], after: [[0, after.length]] });

// ── the fixture units: each is a real edit (before → after) plus the files the session held ──
const UTIL = "export function helper(x) {\n  return x + 1;\n}\nexport function other() {}\n";
const UNITS = [
  { name: "(a) a call to an unimported function the world exports → import",
    file: `${P}/a.js`, world: { [`${P}/util.js`]: UTIL },
    before: "const k = 1;\nexport function main() {\n  return k;\n}\n",
    after: "import { helper } from \"./util.js\";\nconst k = 1;\nexport function main() {\n  return helper(k);\n}\n" },
  { name: "a call plus the new function it calls → stub",
    file: `${P}/b.js`, world: {},
    before: "function keep() {\n  return 1;\n}\n",
    after: "function keep() {\n  return twice(1, 2);\n}\n\nfunction twice(x, y) {\n  return x * y;\n}\n" },
  { name: "a second name from a module the file already imports → extend (no new statement)",
    file: `${P}/c.js`, world: { [`${P}/util.js`]: UTIL },
    before: "import { other } from \"./util.js\";\nexport function main() {\n  return other();\n}\n",
    after: "import { other } from \"./util.js\";\nexport function main() {\n  return other() + helper(2);\n}\n" },
  { name: "a binding another file uses (no export in the world) → import by the world's binding",
    file: `${P}/d.js`, world: { [`${P}/e.js`]: "import { joinAll } from \"../lib/join.js\";\njoinAll();\n" },
    before: "export function main() {\n  return 0;\n}\n",
    after: "import { joinAll } from \"../lib/join.js\";\nexport function main() {\n  return joinAll([1]);\n}\n" },
  { name: "GUARD runtime-global: a new call to parseInt is never stubbed",
    file: `${P}/f.js`, world: {},
    before: "export function main(s) {\n  return s;\n}\n",
    after: "export function main(s) {\n  return parseInt(s, 10) + fresh(s);\n}\n\nfunction fresh(v) {\n  return v;\n}\n" },
  { name: "GUARD declared-in-file: a destructured default parameter the reader declares is never stubbed",
    file: `${P}/g.js`, world: {},
    before: "export function run(ev) {\n  return ev;\n}\n",
    after: "export function run(ev, { log = () => {} } = {}) {\n  log(ev);\n  return ev;\n}\n" },
  { name: "python: a call plus its new def → stub",
    file: "/p/khora/py/h.py", world: {},
    before: "def keep():\n    return 1\n",
    after: "def keep():\n    return twice(1)\n\ndef twice(x):\n    return x * 2\n" },
];

/** the instrument's view of one unit: its seeded text, its arm (with its own World), its proposals */
function instrumentOf(u, cfg = GRADED, lessons = undefined) {
  const w = new World(scope);
  for (const [p, t] of Object.entries(u.world)) w.set(p, t, "2026-01-01T00:00:00Z");
  w.refresh();
  const unit = prepareUnit({ before: u.before, after: u.after, file: u.file, regions: whole(u.before, u.after), created: false, world: w });
  assert.ok(!unit.gap, `${u.name}: the instrument split it (${unit.gap})`);
  const ctx = { file: u.file, language: unit.language, scope };
  const p = propose(unit.real, ctx, cfg, lessons ?? { binding: () => null, ambient: () => false });
  return { unit, p, files: [...w.cache].map(([pp, c]) => ({ path: pp, text: c.text, ts: c.ts })) };
}

const key = (p) => `${p.kind}|${p.name}|${p.spec ?? ""}`;
const WITHHOLDING = (g) => g.would && (g.kind === "declared-in-file" || g.kind === "runtime-global" || g.kind.startsWith("withheld:pii"));
/** the comparator: organ proposals + the stubs its guard withheld == the instrument's; bytes equal on what both keep */
function equivalent(o, inst, seeded, language) {
  const withheld = o.gaps.filter(WITHHOLDING);
  const oKeys = [...o.proposals.map(key), ...withheld.map((g) => key(g.would))].sort();
  const iKeys = inst.proposals.map(key).sort();
  const names = new Set(withheld.map((g) => g.would.name));
  const kept = inst.proposals.filter((p) => !(p.kind === "stub" && names.has(p.name)));
  return { keys: JSON.stringify(oKeys) === JSON.stringify(iKeys), bytes: applyFinish(seeded, o.proposals) === assemble(seeded, kept, language), oKeys, iKeys, withheld };
}

test("registered before it ran: capacity follow-through, SYN·Figure → Generate / Structure / Link / Making, fn finish", async () => {
  const c = findCapacity("follow-through");
  assert.ok(c, "the capacity exists");
  assert.equal(c.module, "organs/follow-through.js");
  assert.equal(c.fn, "finish");
  assert.equal(c.op, "SYN");
  const cell = cellOf("SYN", "Figure");
  assert.equal(c.terrain, cell.terrain);
  assert.deepEqual([cell.mode, cell.domain, cell.terrain, cell.stance], ["Generate", "Structure", "Link", "Making"]);
  const mod = await import(`../${c.module}`);
  assert.equal(typeof mod[c.fn], "function", "the registry names a real export");
});

test("EQUIVALENCE: on every fixture unit the organ computes what the graded instrument computed (proposals and assembled bytes)", { skip: SKIP_NO_PRIOR }, () => {
  for (const u of UNITS) {
    const { unit, p, files } = instrumentOf(u);
    const o = finish({ before: u.before, after: unit.seeded, file: u.file, world: files, scope });
    assert.equal(o.schema, FINISH_SCHEMA);
    const e = equivalent(o, p, unit.seeded, unit.language);
    assert.ok(e.keys, `${u.name}: organ ${JSON.stringify(e.oKeys)} vs instrument ${JSON.stringify(e.iKeys)}`);
    assert.ok(e.bytes, `${u.name}: the assembled bytes differ`);
  }
});

test("NON-VACUITY: the fixtures exercise an import, an extend, a stub and both guards, and the comparator catches a dropped proposal", { skip: SKIP_NO_PRIOR }, () => {
  const seen = { import: 0, extend: 0, stub: 0, "runtime-global": 0, "declared-in-file": 0 };
  let caught = 0, withProposals = 0;
  for (const u of UNITS) {
    const { unit, p, files } = instrumentOf(u);
    const o = finish({ before: u.before, after: unit.seeded, file: u.file, world: files, scope });
    for (const x of o.proposals) seen[x.kind]++;
    for (const g of o.gaps) if (g.kind in seen) seen[g.kind]++;
    if (o.proposals.length) {
      withProposals++;
      const broken = { ...o, proposals: o.proposals.slice(1) };
      if (!equivalent(broken, p, unit.seeded, unit.language).keys) caught++;
    }
  }
  assert.ok(UNITS.length >= 7);
  for (const [k, n] of Object.entries(seen)) assert.ok(n >= 1, `the fixtures must exercise ${k} (seen ${n})`);
  assert.ok(withProposals >= 5, `units with a proposal: ${withProposals}`);
  assert.equal(caught, withProposals, "every unit with a proposal fails the comparator once one is dropped");
  assert.equal(equivalent({ proposals: [], gaps: [] }, { proposals: [{ kind: "stub", name: "x" }] }, "", "javascript").keys, false, "an empty organ output never passes against a nonempty instrument");
});

test("(a) the organ proposes exactly the import, with its snippet at importAnchor; the world OFF falls to a stub", { skip: SKIP_NO_PRIOR }, () => {
  const u = UNITS[0];
  const { unit, files } = instrumentOf(u);
  const o = finish({ before: u.before, after: unit.seeded, file: u.file, world: files, scope });
  assert.deepEqual(o.proposals.map(key), ["import|helper|./util.js"]);
  assert.equal(o.proposals[0].snippet, "import { helper } from \"./util.js\";\n");
  assert.deepEqual(o.proposals[0].anchor, anchorOf(unit.seeded));
  const noWorld = finish({ before: u.before, after: unit.seeded, file: u.file, world: null });
  assert.deepEqual(noWorld.proposals.map(key), ["stub|helper|"]);
  // without a scope the same world resolves by absolute path, to the same specifier
  const plain = finish({ before: u.before, after: unit.seeded, file: u.file, world: [{ path: `${P}/util.js`, text: UTIL }] });
  assert.deepEqual(plain.proposals.map(key), ["import|helper|./util.js"]);
  assert.equal(specFor(`${P}/a.js`, targetOf("./util.js", `${P}/b.js`), null, "javascript"), "./util.js");
});

test("the binding lesson resolves what the world cannot; equivalence holds through it", { skip: SKIP_NO_PRIOR }, () => {
  const u = { name: "lesson", file: `${P}/l.js`, world: {}, before: "export function main() {\n  return 0;\n}\n", after: "import { join } from \"node:path\";\nexport function main() {\n  return join(\"a\", \"b\");\n}\n" };
  const lessons = { binding: (n) => (n === "join" ? "bare:node:path" : null), ambient: () => false };
  const { unit, p, files } = instrumentOf(u, GRADED, lessons);
  const o = finish({ before: u.before, after: unit.seeded, file: u.file, world: files, lessons, scope });
  assert.deepEqual(o.proposals.map((x) => [x.kind, x.spec, x.via]), [["import", "node:path", "lesson"]]);
  assert.ok(equivalent(o, p, unit.seeded, unit.language).keys);
  assert.deepEqual(finish({ before: u.before, after: unit.seeded, file: u.file }).proposals.map(key), ["stub|join|"], "no lesson: the stub");
});

test("typed gaps: an uncalled name, a removed call, a file with no reader — named, never guessed", () => {
  const o = finish({ before: "function f() {\n  gone(1);\n}\n", after: "function f(extra) {\n  const local = extra;\n  return local;\n}\n", file: `${P}/x.js` });
  assert.deepEqual(o.proposals, []);
  assert.ok(o.gaps.some((g) => g.kind === "removal-not-followed" && g.names.includes("gone")));
  assert.ok(o.gaps.some((g) => g.kind === "not-called-by-seed"), JSON.stringify(o.gaps));
  assert.deepEqual(finish({ before: "a", after: "b", file: "/p/khora/README.md" }).gaps, [{ kind: "no-reader", ext: ".md" }]);
});

test("PLANTED PII: personal data in comments, strings and the world never reaches a snippet; a PII-shaped specifier is withheld, fail-closed", { skip: SKIP_NO_PRIOR }, () => {
  const EMAIL = "jane.doe@example.com", PHONE = "(615) 555-0123", SSN = "123-45-6789", STREET = "1428 Elm Street";
  const before = `// contact ${EMAIL} or ${PHONE}\nconst who = "${STREET}, ${SSN}";\nexport function main() {\n  return who;\n}\n`;
  const after = `// contact ${EMAIL} or ${PHONE}\nconst who = "${STREET}, ${SSN}";\nexport function main() {\n  return helper(who) + lookup(who) + fresh("${EMAIL}");\n}\n`;
  const world = [
    { path: `${P}/util.js`, text: `// owner ${EMAIL}, ${PHONE}\nexport function helper(x) {\n  return "${STREET}";\n}\n` },
    { path: `${P}/alice.smith@example.com/lib.js`, text: "export function lookup(x) {\n  return x;\n}\n" },
  ];
  const o = finish({ before, after, file: `${P}/a.js`, world });
  const emitted = JSON.stringify(o.proposals);
  for (const v of [EMAIL, PHONE, SSN, STREET, "Elm", "jane", "alice.smith", "555-0123"]) assert.ok(!emitted.includes(v), `a snippet leaks ${v}`);
  assert.deepEqual(o.proposals.map(key).sort(), ["import|helper|./util.js", "stub|fresh|"]);
  assert.ok(o.gaps.some((g) => g.kind === "withheld:pii:email" && g.would.name === "lookup"), JSON.stringify(o.gaps));
  assert.ok(!JSON.stringify(o.gaps).includes("alice.smith"), "the withheld gap names the proposal, never its specifier");
});

test("no model, no network, nothing written: every request and write path throws while finish runs, and none is reached", async () => {
  const src = fs.readFileSync(path.join(HERE, "..", "organs", "follow-through.js"), "utf8");
  const imports = [...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ["../adapters/code/edges.js", "../adapters/code/mechanical.js", "./goffman.js", "node:path"]);
  assert.ok(!/fetch\(|XMLHttpRequest|child_process|ollama|\/v1\//.test(src), "no request path in the source");
  const trap = (what) => () => { throw new Error(`follow-through reached ${what}`); };
  const saved = [];
  const swap = (obj, k, what) => { saved.push([obj, k, obj[k]]); obj[k] = trap(what); };
  for (const k of ["writeFileSync", "appendFileSync", "mkdirSync", "rmSync", "renameSync", "writeFile", "appendFile", "createWriteStream"]) swap(fs, k, `fs.${k}`);
  swap(globalThis, "fetch", "fetch");
  swap(http, "request", "http.request"); swap(https, "request", "https.request"); swap(net, "connect", "net.connect"); swap(net, "createConnection", "net.createConnection");
  try {
    for (const u of UNITS) {
      const o = finish({ before: u.before, after: u.after, file: u.file, world: worldOf(Object.entries(u.world).map(([p, text]) => ({ path: p, text })), scope), scope });
      assert.equal(o.schema, FINISH_SCHEMA);
    }
  } finally {
    for (const [obj, k, v] of saved.reverse()) obj[k] = v;
  }
});

test("RELATIVE PATHS ARE A TYPED GAP, never a bare specifier (found by the first assembled run, 2026-10-13)", async () => {
  const { finish } = await import("../organs/follow-through.js");
  const before = "export function f() {\n  throw new Error(\"TODO\");\n}\n";
  const after = "export function f(xs) {\n  return sum(xs);\n}\n";
  const world = [{ path: "/w/numbers.mjs", text: "export function sum(xs) {\n  return xs.reduce((a, b) => a + b, 0);\n}\n" }];
  // control: absolute paths resolve to a RELATIVE specifier
  const ok = finish({ before, after, file: "/w/cart.mjs", world });
  assert.deepEqual(ok.proposals.map((p) => [p.kind, p.name, p.spec]), [["import", "sum", "./numbers.mjs"]]);
  // a relative target file: refused, no proposal, a named reason
  const rel = finish({ before, after, file: "cart.mjs", world });
  assert.deepEqual(rel.proposals, []);
  assert.deepEqual(rel.gaps.map((g) => g.kind), ["path-not-absolute"]);
  // a relative world file: offers nothing and is reported; the name is not resolved to a bare package
  const relWorld = finish({ before, after, file: "/w/cart.mjs", world: [{ path: "numbers.mjs", text: world[0].text }] });
  assert.ok(relWorld.gaps.some((g) => g.kind === "world-path-not-absolute"));
  assert.ok(!relWorld.proposals.some((p) => p.kind === "import" && p.spec === "numbers.mjs"), "never a bare specifier");
});

test("NO KEYWORD PRIOR, NO STUB: without the language's keyword prior `for` and `return` look like callees, so no stub is synthesised and the refusal is typed", () => {
  const file = "/p/khora/cli/a.mjs";
  const before = "export function a() {\n  return 1;\n}\n";
  const after = "export function a(xs) {\n  const out = [];\n  for (const x of xs) {\n    out.push(mystery(x));\n  }\n  return out;\n}\n";
  const none = finish({ before, after, file, world: [], keywords: null });
  assert.deepEqual(none.proposals, [], "nothing is synthesised without the giver");
  assert.ok(none.gaps.some((g) => g.kind === "stub-refused:no-keyword-prior" && g.name === "mystery"), JSON.stringify(none.gaps));
  assert.ok(none.gaps.every((g) => !["for", "return", "const"].includes(g.name)) || none.proposals.length === 0);
  // the same move with a keyword set handed in: the real callee gets its stub, the keywords are not callees
  const KW = new Set(["for", "return", "const", "of", "export", "function"]);
  const some = finish({ before, after, file, world: [], keywords: KW });
  assert.deepEqual(some.proposals.filter((p) => p.kind === "stub").map((p) => p.name), ["mystery"]);
});
