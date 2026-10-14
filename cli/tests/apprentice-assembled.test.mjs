// cli/tests/apprentice-assembled.test.mjs — the third teaching instrument (cli/apprentice-assembled.mjs), against khora's REAL
// code reader and the REAL replay. Each claim has its control beside it: an edit built from held bytes must score ABOVE the
// donor arm; an edit written fresh must not.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lineKey, keysOf, addedLines, calleeOf, declaredOf, classifyCalls, runtimeNames, findArm, report, runAssembled, render } from "../apprentice-assembled.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "apprentice-assembled-"));
const P = "/p/khora/cli"; // an in-scope directory (the `khora` segment matches the scope's `in` rules)

let idn = 0;
function transcript() {
  const lines = [];
  let t = Date.parse("2026-01-01T00:00:00Z");
  const ts = () => new Date((t += 1000)).toISOString();
  const api = {
    t0: (iso) => { t = Date.parse(iso); return api; },
    prompt(text) { lines.push({ type: "user", origin: { kind: "human" }, message: { role: "user", content: text }, timestamp: ts() }); return api; },
    read(file, content) {
      const id = `toolu_a${++idn}`;
      lines.push({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Read", input: { file_path: file } }] }, timestamp: ts() });
      const n = content.split("\n").length;
      lines.push({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content: "…" }] }, toolUseResult: { type: "text", file: { filePath: file, content, numLines: n, startLine: 1, totalLines: n } }, timestamp: ts() });
      return api;
    },
    create(file, content) {
      const id = `toolu_a${++idn}`;
      lines.push({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Write", input: { file_path: file, content } }] }, timestamp: ts() });
      lines.push({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] }, toolUseResult: { type: "create", filePath: file, content, structuredPatch: [] }, timestamp: ts() });
      return api;
    },
    write(dir, name) { const f = path.join(dir, `${name}.jsonl`); fs.writeFileSync(f, lines.map((l) => JSON.stringify(l)).join("\n") + "\n"); return f; },
  };
  return api;
}

test("addedLines: a multiset difference — a moved or repeated line is not an added one; blank lines never count", () => {
  assert.deepEqual(addedLines("a\nb\nc\n", "c\nb\na\n"), []);
  assert.deepEqual(addedLines("a\n", "a\na\n"), ["a"], "a second copy IS an addition");
  assert.deepEqual(addedLines("a\n", "a\n\n   \nb\n"), ["b"]);
  assert.deepEqual(addedLines("", "x\ny\n"), ["x", "y"]);
  assert.deepEqual(addedLines("  indent\n", "indent\n"), [], "lines are compared trimmed");
});

test("lineKey: equal text, equal key; a different line, a different key; keys are numbers, never text", () => {
  assert.equal(lineKey("return x;"), lineKey("return x;"));
  assert.notEqual(lineKey("return x;"), lineKey("return y;"));
  assert.equal(typeof lineKey("a"), "number");
  assert.ok(Number.isSafeInteger(lineKey("a")));
  assert.equal(keysOf("a\nb\na\n").size, 2);
});

test("classifyCalls: NEW beats every other binding; library vs repo by the bound specifier; OWN from the file's own before; else OTHER", () => {
  const keys = ["+call:slugify", "+call:readFile", "+call:helper", "+call:mine", "+call:push", "+call:obj.deep", "+declare:slugify", "+import:./x"];
  const names = new Map([["slugify", "library"], ["readFile", "library"], ["helper", "repo"]]);
  const c = classifyCalls(keys, { names, own: new Set(["mine"]) });
  assert.deepEqual(c, { new: 1, library: 1, repo: 1, own: 1, runtime: 0, other: 2 });
  const rt = classifyCalls(keys, { names, own: new Set(["mine"]), runtime: new Set(["push", "readFile", "slugify"]) });
  assert.deepEqual(rt, { new: 1, library: 1, repo: 1, own: 1, runtime: 1, other: 1 }, "push is the engine's; a bound or declared name still outranks a runtime one");
  assert.equal(calleeOf("+call:a.b.c"), "c");
  assert.equal(calleeOf("+import:./x"), null);
  assert.equal(declaredOf("-declare:foo"), "foo");
});

test("THE CONTROL BUILT TO FAIL: an edit assembled from held bytes beats the donor arm; one written fresh does not", async () => {
  const root = tmp();
  const donor = transcript()
    .prompt("add a thing")
    .create(`${P}/donor.js`, "export function alpha(a) {\n  const total = a * 2;\n  return total;\n}\n\nexport function beta(b) {\n  return alpha(b) + 1;\n}\n")
    .write(root, "donor");
  const helper = "export function slugify(title) {\n  const words = title.trim().split(/\\s+/);\n  const lower = words.map((w) => w.toLowerCase());\n  return lower.join(\"-\");\n}\n\nexport function pad(n) {\n  const s = String(n);\n  return s.length < 2 ? \"0\" + s : s;\n}\n";
  const target = transcript()
    .prompt("reuse the slug helper in a new module")
    .read(`${P}/helper.js`, helper)
    .create(`${P}/assembled.js`, helper.replace("slugify", "slugify2"))
    .prompt("write something unrelated and fresh")
    .create(`${P}/fresh.js`, "export function gamma(zeta) {\n  const omega = zeta ** 3 - 17;\n  if (omega > 99) return omega / 3;\n  return omega * 5 + zeta;\n}\n")
    .write(root, "target");
  const rep = await runAssembled({ root, files: [donor, target], draws: 200 });
  assert.equal(rep.coverage.units, 3);
  const withNull = rep.coverage.withNull;
  assert.ok(withNull >= 2, `units with a donor arm: ${withNull}`);
  // pooled, the assembled edit drags the real share above the donor share by a wide margin
  assert.ok(rep.bytes.pooled.real > rep.bytes.pooled.null + 0.15, JSON.stringify(rep.bytes.pooled));
  assert.ok(rep.bytes.perEdit.difference.plus >= 1, "at least one edit beats its donors");
  assert.ok(rep.bytes.perEdit.difference.minus === 0, "and no edit scores BELOW its donors");
  assert.equal(rep.bytes.created.n, withNull);
  assert.match(render(rep), /BYTES/);
});

test("a first session has no donor arm: its units are counted, never scored against nothing", async () => {
  const root = tmp();
  const only = transcript().prompt("x").create(`${P}/solo.js`, "export function one(a) {\n  return a + 1;\n}\n").write(root, "solo");
  const rep = await runAssembled({ root, files: [only], draws: 50 });
  assert.equal(rep.coverage.units, 1);
  assert.equal(rep.coverage.withNull, 0);
  assert.equal(rep.bytes.pooled, null);
});

test("report is pure over units: an empty run is typed, not a crash", () => {
  const rep = report({ units: [] });
  assert.equal(rep.coverage.units, 0);
  assert.equal(rep.bytes.pooled, null);
  assert.equal(rep.calls.share, null);
});

test("nothing emitted carries code text: the report holds counts and scores only, and --out refuses a tracked path", async () => {
  const root = tmp();
  const a = transcript().prompt("x").create(`${P}/s1.js`, "export function secretiveName(a) {\n  return a + 1;\n}\n").write(root, "s1");
  const b = transcript().prompt("y").create(`${P}/s2.js`, "export function otherSecret(a) {\n  return a + 2;\n}\n").write(root, "s2");
  const rep = await runAssembled({ root, files: [a, b], draws: 50 });
  const json = JSON.stringify(rep);
  assert.doesNotMatch(json, /secretiveName|otherSecret|s1\.js|s2\.js/);
  await assert.rejects(runAssembled({ root, files: [a], out: path.join(HERE, "..", "assembled-must-not-exist.json") }), /tracked path/);
  assert.ok(!fs.existsSync(path.join(HERE, "..", "assembled-must-not-exist.json")));
});

test("runtimeNames: the engine is the giver — its own builtins and core modules, never a hand-typed list; a repo helper is not in it", async () => {
  const r = await runtimeNames();
  for (const n of ["push", "map", "readFileSync", "join", "freeze", "parse"]) assert.ok(r.has(n), n);
  for (const n of ["slugify", "formatTotal", "mySecretHelper"]) assert.ok(!r.has(n), n);
});

test("FIND arm: the ask that names a held callable ranks it, another ask's words do not (control beside the claim)", async () => {
  const root = tmp();
  const donor = transcript()
    .prompt("render a chart of monthly prices")
    .create(`${P}/charts.js`, "export function renderChart(rows) {\n  const total = rows.length * 3;\n  return total;\n}\n")
    .write(root, "donor");
  const helper = "export function slugifyTitle(title) {\n  const words = title.trim().split(\" \");\n  return words.join(\"-\").toLowerCase();\n}\n";
  const target = transcript()
    .prompt("slugify the title of the post for the url")
    .read(`${P}/helper.js`, helper)
    .create(`${P}/post.js`, "import { slugifyTitle } from \"./helper.js\";\n\nexport function postUrl(post) {\n  const id = post.id;\n  return \"/p/\" + id + \"/\" + slugifyTitle(post.title);\n}\n")
    .write(root, "target");
  const rep = await runAssembled({ root, files: [donor, target], draws: 100 });
  const x = rep.find.lexical;
  assert.ok(x.n >= 1, `units with a find arm: ${x.n}`);
  assert.ok(x.real > x.null, `real ${x.real} must beat another ask's words ${x.null}`);
  assert.equal(x.found, 1);
  assert.match(render(rep), /FIND by NAME/);
});

test("findArm is pure: no reached name, no arm; a gap scores zero, never a guess", () => {
  assert.equal(findArm({ ask: "x", asks: [], names: new Map(), own: new Set(), runtime: null, reached: [] }), null);
  const a = findArm({ ask: "frobnicate", asks: ["also nothing"], names: new Map([["slugifyTitle", "repo"]]), own: new Set(), runtime: null, reached: ["slugifyTitle"] });
  assert.equal(a.real, 0);
  assert.equal(a.gap, "no-word-landed");
});

test("REFERENT arm over time: an earlier ask teaches the surface, a later ask with no name overlap reaches the callable; the lexical arm cannot", async () => {
  const root = tmp();
  const helper = "export function slugifyTitle(title) {\n  const words = title.trim().split(\" \");\n  return words.join(\"-\").toLowerCase();\n}\n";
  const other = "export function renderChart(rows) {\n  const total = rows.length * 3;\n  return total;\n}\n";
  const post = (n) => `import { slugifyTitle } from "./helper.js";\n\nexport function postUrl${n}(post) {\n  const id = post.id;\n  return "/p/" + id + "/" + slugifyTitle(post.title);\n}\n`;
  const chart = (n) => `import { renderChart } from "./charts.js";\n\nexport function page${n}(rows) {\n  const body = renderChart(rows);\n  return "<main>" + body + "</main>";\n}\n`;
  const sessions = [];
  // three earlier sessions teach: "slug" asks reach slugifyTitle, "chart" asks reach renderChart
  for (let i = 0; i < 3; i++) {
    sessions.push(transcript().t0(`2026-02-0${i + 1}T00:00:00Z`).prompt("make a url slug for the post")
      .read(`${P}/helper.js`, helper).create(`${P}/post${i}.js`, post(i)).write(root, `teach-slug-${i}`));
    sessions.push(transcript().t0(`2026-02-0${i + 1}T01:00:00Z`).prompt("draw the quarterly chart")
      .read(`${P}/charts.js`, other).create(`${P}/page${i}.js`, chart(i)).write(root, `teach-chart-${i}`));
  }
  // the later session: no word of its ask is in `slugifyTitle`
  sessions.push(transcript().t0("2026-03-01T00:00:00Z").prompt("give me a slug for the new post")
    .read(`${P}/helper.js`, helper).read(`${P}/charts.js`, other).create(`${P}/final.js`, post(9)).write(root, "later"));
  const rep = await runAssembled({ root, files: sessions, draws: 100 });
  const ref = rep.find.referent, lex = rep.find.lexical;
  assert.ok(ref.n >= 1, `referent units ${ref.n}`);
  assert.ok(ref.real > ref.null, `referent real ${ref.real} must beat other asks ${ref.null}`);
  assert.ok(ref.found > 0.5, `found ${ref.found}`);
  assert.ok(ref.real >= lex.real, `the referent arm (${ref.real}) is at least the lexical arm (${lex.real}) here`);
});
