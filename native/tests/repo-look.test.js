// native/tests/repo-look.test.js — the Look organ, tested against two oracles that are NOT itself: the trail
// instrument's RevIndex (the arm that was graded) and real `git grep -l -i -w -F`.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { LOOK_SCHEMA, CODE_EXT, seedsOf, buildIndex, askNamed, matchesIn, look, indexWorktree, pathWords } from "../organs/repo-look.js";
import { RevIndex, treeAt, toplevelOf } from "../../cli/apprentice-trail.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = {
  "src/alpha.js": "export function frobnicate(x) {\n  return quux(x);\n}\n",
  "src/beta.js": "// frobnicate the widget\nconst widget = 1;\n",
  "src/gamma.js": "const unrelated = 'nothing here';\n// the addition of numbers\n",
  "src/uni.js": "// café — frobnicate\nconst z = frobnicate;\n",
  "lib/util/helper.py": "def frobnicate():\n    pass\n",
  "lib/index.js": "module.exports = {};\n",
  "src/index.js": "module.exports = { quux: 1 };\n",
  "docs/readme.md": "frobnicate is described here, and quux too\n",
};

const run = (cwd, args) => { const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd, encoding: "utf8" }); if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`); return r.stdout; };
function fixtureRepo() {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "repo-look-"));
  run(dir, ["init", "-q"]);
  for (const [p, body] of Object.entries(FILES)) { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), body); }
  fs.writeFileSync(path.join(dir, ".gitignore"), "ignored.js\n");
  run(dir, ["add", "-A"]); run(dir, ["commit", "-q", "-m", "fixture"]);
  return dir;
}
const filesOf = (obj = FILES) => Object.entries(obj).map(([p, body]) => ({ path: p, bytes: Buffer.from(body) }));
const idx = () => buildIndex(filesOf(), { allPaths: Object.keys(FILES) });

test("seeds: lowercase whole words and path-looking fragments; the ask is redacted before any seed is taken", () => {
  const s = seedsOf("Fix frobnicate in src/alpha.js and docs/ please, mail a.b@example.com");
  assert.ok(s.words.includes("frobnicate") && s.words.includes("fix"));
  assert.deepEqual(s.fragments, ["src/alpha.js", "docs/"]);
  assert.ok(!s.words.includes("example") && !s.words.includes("com"), "the address never becomes a seed");
  assert.deepEqual(seedsOf("").words, []);
  assert.deepEqual(seedsOf("readme and notes").fragments, [], "a bare word with no nameable extension is not a fragment");
});

test("index: whole words only (`add` is not `addition`), N and df are over code files, the md file is named but never read", () => {
  const i = idx();
  assert.equal(i.N, 7);
  assert.equal(i.df("frobnicate"), 4);
  assert.equal(i.df("quux"), 2);
  assert.equal(i.df("add"), 0, "`addition` must not match the whole word `add`");
  assert.equal(i.df("readme"), 0, "a non-code file's words are not in the index");
  assert.ok(i.allPaths.includes("docs/readme.md"), "but it can still be NAMED");
});

test("rank: rarer words weigh more (ln N/df), a word in every file weighs 0, ties break by path", () => {
  const i = idx();
  const r = i.rank(["frobnicate", "quux"]);
  assert.equal(r[0].path, "src/alpha.js");
  assert.equal(r[0].hits, 2);
  assert.ok(Math.abs(r[0].score - (Math.log(7 / 4) + Math.log(7 / 2))) < 1e-12);
  const tie = i.rank(["frobnicate"]).map((x) => x.path);
  assert.deepEqual(tie, [...tie].sort(), "equal scores come out in path order");
  const all = buildIndex([{ path: "a.js", bytes: "common" }, { path: "b.js", bytes: "common" }]);
  assert.equal(all.rank(["common"])[0].score, 0, "df = N weighs 0");
});

test("askNamed: one file by suffix, a directory by name, and an ambiguous fragment names nothing", () => {
  const i = idx();
  assert.deepEqual(askNamed(["alpha.js"], i.allPaths, i.dirs), ["src/alpha.js"]);
  assert.deepEqual(askNamed(["util/"], i.allPaths, i.dirs), ["lib/util/"]);
  assert.deepEqual(askNamed(["index.js"], i.allPaths, i.dirs), [], "lib/index.js and src/index.js: no single address");
  assert.deepEqual(askNamed(["readme.md"], i.allPaths, i.dirs), ["docs/readme.md"]);
});

test("look: the file the ask names comes first, then the ranked; every match re-expands to its word at its byte span", () => {
  const out = look({ index: idx(), ask: "make frobnicate also call quux in src/alpha.js" });
  assert.equal(out.schema, LOOK_SCHEMA);
  assert.equal(out.candidates[0].path, "src/alpha.js");
  assert.equal(out.candidates[0].named, true);
  assert.ok(out.candidates.slice(1).every((c) => c.named === false && typeof c.score === "number"));
  const bytes = (p) => Buffer.from(FILES[p]);
  let checked = 0;
  for (const c of out.candidates) for (const m of c.matches) {
    assert.equal(bytes(c.path).subarray(m.from, m.to).toString("utf8").toLowerCase(), m.word);
    checked++;
  }
  assert.ok(checked >= 4);
  assert.deepEqual(out.candidates[0].matches.map((m) => [m.word, m.line]), [["frobnicate", 1], ["quux", 2]]);
});

test("spans are UTF-8 BYTE offsets: a multi-byte character before the match does not shift it", () => {
  const body = FILES["src/uni.js"];
  const ms = matchesIn(body, ["frobnicate"]);
  assert.equal(ms.length, 2);
  for (const m of ms) assert.equal(Buffer.from(body).subarray(m.from, m.to).toString("utf8"), "frobnicate");
  assert.ok(Buffer.byteLength(body) > body.length, "the fixture really has multi-byte characters");
  assert.equal(ms[0].line, 1);
  assert.equal(ms[1].line, 2);
});

test("typed gaps, never a guess: no seed words, and nothing found", () => {
  assert.deepEqual(look({ index: idx(), ask: "!!! ???" }).gaps.map((g) => g.kind), ["no-seed-words"]);
  const none = look({ index: idx(), ask: "zzzqqq wwwyyy" });
  assert.deepEqual(none.gaps.map((g) => g.kind), ["nothing-found"]);
  assert.deepEqual(none.candidates, []);
});

test("EQUIVALENCE WITH THE GRADED ARM: same files, same order, same scores as the trail instrument's RevIndex on a real repo", () => {
  const dir = fixtureRepo();
  try {
    const top = toplevelOf(path.join(dir, "src", "alpha.js")), tree = treeAt(top, "HEAD");
    assert.ok(top && tree.size === Object.keys(FILES).length + 1, "the fixture repo is really read (files + .gitignore), not an empty tree");
    const theirs = new RevIndex(top, "HEAD", tree, new Set(CODE_EXT), "words");
    const files = [...tree.keys()].map((p) => ({ path: p, bytes: fs.readFileSync(path.join(dir, p)) }));
    const mine = buildIndex(files, { allPaths: [...tree.keys()] });
    assert.equal(mine.N, theirs.N);
    assert.equal(mine.N, 7, "seven code files, so equality below is not two empty indexes agreeing");
    assert.ok(theirs.rank(["frobnicate"]).length === 4, "the graded arm itself finds the four files");
    for (const words of [["frobnicate"], ["quux"], ["frobnicate", "quux"], ["frobnicate", "widget", "unrelated"], ["util", "helper"], ["nope"], []]) {
      const a = mine.rank(words), b = theirs.rank(words);
      assert.deepEqual(a.map((x) => x.path), b.map((x) => x.path), `order for ${JSON.stringify(words)}`);
      a.forEach((x, k) => { assert.ok(Math.abs(x.score - b[k].score) < 1e-12); assert.equal(x.hits, b[k].hits); });
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("EQUIVALENCE WITH REAL git grep -l -i -w -F: the same set of files contains each word", () => {
  const dir = fixtureRepo();
  try {
    const top = toplevelOf(path.join(dir, "src", "alpha.js")), tree = treeAt(top, "HEAD");
    assert.ok(tree.size > 0, "the tree is not empty");
    const files = [...tree.keys()].map((p) => ({ path: p, bytes: fs.readFileSync(path.join(dir, p)) }));
    const mine = buildIndex(files, { allPaths: [...tree.keys()] });
    const codeExt = new Set(CODE_EXT);
    const grep = (w) => {
      const r = spawnSync("git", ["grep", "-l", "-i", "-w", "-F", "-e", w], { cwd: dir, encoding: "utf8" });
      assert.ok(r.status === 0 || r.status === 1, `git grep failed: ${r.stderr}`); // 1 is "no match"
      return r.stdout.split("\n").filter(Boolean).filter((p) => codeExt.has(path.extname(p))).sort();
    };
    for (const w of ["frobnicate", "quux", "widget", "add", "addition", "nothing"]) {
      assert.deepEqual(mine.rank([w]).map((x) => x.path).sort(), grep(w), `files containing ${w}`);
    }
    assert.equal(grep("frobnicate").length, 4, "real git grep finds the four files, so the comparison is not empty against empty");
    assert.deepEqual(grep("add"), [], "and a whole-word miss is a miss for real git too");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("indexWorktree: tracked plus untracked-not-ignored files; ignored files never; a non-git folder is a typed gap", () => {
  const dir = fixtureRepo();
  try {
    fs.writeFileSync(path.join(dir, "src/wip.js"), "const wip = quux();\n");
    fs.writeFileSync(path.join(dir, "ignored.js"), "const hidden = frobnicate;\n");
    const i = indexWorktree(dir);
    const paths = i.files.map((f) => f.path);
    assert.ok(paths.includes("src/wip.js"), "an untracked file is looked at");
    assert.ok(!paths.includes("ignored.js"), "an ignored file is not");
    assert.ok(paths.includes("src/alpha.js"));
    const plain = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "not-git-"));
    try { assert.equal(indexWorktree(plain).gap, "not-a-git-worktree"); } finally { fs.rmSync(plain, { recursive: true, force: true }); }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the organ calls no model, makes no request and writes nothing", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "organs", "repo-look.js"), "utf8");
  assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|api\.anthropic|\/v1\/(messages|chat|code)/);
  assert.doesNotMatch(src, /writeFileSync|appendFileSync|createWriteStream|unlinkSync|rmSync/);
  assert.deepEqual(pathWords("Src/Alpha-Beta.js"), ["src", "alpha", "beta", "js"]);
});
