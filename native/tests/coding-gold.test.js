// coding-gold: the INSTRUMENT that produces programming-language GOLD is regression-guarded here.
// Nothing in this file measures a khora reader. eval/coding-competence/gold.py is the extractor (tree-sitter
// grammars via the language pack, an authority independent of khora); gold.mjs is its node wrapper. The
// pre-registered self-checks P1..P6 are written in gold.py's header BEFORE the first run and are implemented
// here with exactly those thresholds. The fixtures are AUTHORED by the model (labelled so in every file and in
// fixtures/MANIFEST.json): they test the extractor, they are never held-out natural data.
//
// Python-free fallback: when the venv (or the grammar pack in it) is absent every test is skipped with a message,
// so a machine without python still runs the rest of the suite.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  goldAvailable, goldFor, goldBatch, goldLanguages, FIXTURE_DIR, CACHE_DIR, cacheKey, CORE_DEF_KINDS, SECONDARY_DEF_KINDS, CLASSES,
  isCoreKind, GOLD_VERSION, PYTHON, GOLD_PY,
} from "../eval/coding-competence/gold.mjs";

// a deranged grammar can send tree-sitter's error recovery into minutes (rust text under the COBOL grammar does);
// gold.py runs each parse in a child with this wall-clock budget and reports an overrun as a typed error
process.env.GOLD_PARSE_BUDGET_S = process.env.GOLD_PARSE_BUDGET_S || "10";
const AV = goldAvailable();
const SKIP = AV.available
  ? false
  : `coding-gold skipped: ${AV.reason}. Build it with: python3 -m venv /private/tmp/claude-501/venv && /private/tmp/claude-501/venv/bin/pip install tree-sitter tree-sitter-language-pack tree-sitter-groovy (see eval/coding-competence/requirements-gold.txt)`;
if (SKIP) console.warn(`# ${SKIP}`);

const MAN = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, "MANIFEST.json"), "utf8"));
const FIX = Object.entries(MAN.fixtures)
  .map(([key, e]) => ({ key, ...e, text: fs.readFileSync(path.join(FIXTURE_DIR, e.file), "utf8") }))
  .sort((a, b) => (a.key < b.key ? -1 : 1));

let goldsP = null;
/** gold for every fixture, once, through one python process */
function allGolds() {
  if (!goldsP) goldsP = goldBatch(FIX.map((f) => ({ language: f.language, text: f.text, fileName: f.file })));
  return goldsP;
}

const names = (g, k, f) => [...new Set(g[k].map(f))].sort();

test("the manifest is authored, labelled, and covers every mapped language", { skip: SKIP }, async () => {
  assert.equal(MAN.authored, true);
  assert.match(MAN.note, /AUTHORED/);
  const langs = (await goldLanguages()).languages;
  const have = new Set(FIX.map((f) => f.language));
  for (const l of Object.keys(langs)) assert.ok(have.has(l), `no authored fixture for mapped language ${l}`);
  for (const f of FIX) assert.match(f.text.slice(0, 400), /AUTHORED fixture/i, `${f.file} must say it is authored`);
});

test("P1: every authored fixture parses clean in its own grammar", { skip: SKIP }, async () => {
  const golds = await allGolds();
  const bad = [];
  golds.forEach((g, i) => {
    if (g.error) return bad.push(`${FIX[i].key}: ${g.error}`);
    const p = g.parse;
    if (p.error_nodes !== 0 || p.missing_nodes !== 0 || p.error_bytes_frac !== 0) bad.push(`${FIX[i].key}: err=${p.error_nodes} missing=${p.missing_nodes} frac=${p.error_bytes_frac}`);
  });
  assert.deepEqual(bad, []);
});

test("P4: defs / calls / imports / extends equal the authored expectations (known grammar limits are named)", { skip: SKIP }, async () => {
  const golds = await allGolds();
  const bad = [];
  golds.forEach((g, i) => {
    const f = FIX[i];
    const got = {
      defs: names(g, "defs", (d) => d.name),
      calls: names(g, "calls", (c) => c.callee),
      imports: names(g, "imports", (m) => m.module),
      extends: names(g, "extends", (e) => `${e.child}<${e.base}`),
    };
    for (const field of ["defs", "calls", "imports", "extends"]) {
      if (f[field] == null) continue;
      const exp = f[field];
      if (JSON.stringify(got[field]) === JSON.stringify(exp)) continue;
      const missing = exp.filter((x) => !got[field].includes(x));
      const extra = got[field].filter((x) => !exp.includes(x));
      // a mismatch is allowed ONLY when the manifest names the grammar limit that causes it
      if (f.known?.[field]) continue;
      bad.push(`${f.key}.${field}: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`);
    }
  });
  assert.deepEqual(bad, []);
});

test("a named grammar limit is a REAL mismatch (the manifest cannot hide a pass)", { skip: SKIP }, async () => {
  const golds = await allGolds();
  const k = FIX.findIndex((f) => f.key === "kotlin.kt");
  const got = names(golds[k], "defs", (d) => d.name);
  assert.ok(!got.includes("Util"), "kotlin `object Util` is documented as NOT found; if it is now found, drop the known-limit note");
  assert.ok(FIX[k].defs.includes("Util"));
});

test("capabilities are typed: ok | not_applicable (with reason) | gap (with reason); no query fails to compile", { skip: SKIP }, async () => {
  const golds = await allGolds();
  const gaps = [];
  for (const [i, g] of golds.entries()) {
    assert.ok(g.capabilities && g.capabilities.tokens.status === "ok", FIX[i].key);
    for (const f of ["defs", "calls", "imports", "extends"]) {
      const c = g.capabilities[f];
      assert.ok(["ok", "not_applicable", "gap"].includes(c.status), `${FIX[i].key}.${f}`);
      if (c.status === "ok") assert.ok(c.giver, `${FIX[i].key}.${f} ok without a giver`);
      else assert.ok(c.reason, `${FIX[i].key}.${f} ${c.status} without a reason`);
      assert.ok(!/failed to compile/.test(c.reason || ""), `${FIX[i].key}.${f}: ${c.reason}`);
      if (c.status === "gap") gaps.push(`${FIX[i].language}.${f}`);
    }
  }
  // the gaps are results: pin them so a new one cannot appear silently, and a closed one is noticed
  assert.deepEqual([...new Set(gaps)].sort(), ["commonlisp.extends", "lean.calls", "perl.extends", "r.extends"]);
});

test("P5: extraction is deterministic (byte-identical JSON on a second run)", { skip: SKIP }, async () => {
  const golds = await allGolds();
  const again = await goldBatch(FIX.map((f) => ({ language: f.language, text: f.text, fileName: f.file })), { cache: false });
  for (const [i, g] of golds.entries()) assert.equal(JSON.stringify(again[i]), JSON.stringify(g), FIX[i].key);
});

test("P6: offsets: tokens sorted, non-empty, non-overlapping; every span slices to what it names", { skip: SKIP }, async () => {
  const golds = await allGolds();
  for (const [i, g] of golds.entries()) {
    const { text, key } = FIX[i];
    assert.equal(g.unit, "utf16");
    let prev = 0;
    for (const t of g.tokens) {
      assert.ok(t.start < t.end && t.start >= prev && t.end <= text.length, `${key}: token ${JSON.stringify(t)} after ${prev}`);
      assert.ok(CLASSES.includes(t.class), `${key}: class ${t.class}`);
      assert.ok(text.slice(t.start, t.end).trim().length > 0, `${key}: blank token`);
      prev = t.end;
    }
    for (const d of g.defs) {
      const s = text.slice(d.nameStart, d.nameEnd);
      assert.ok(d.nameCleaned ? s.includes(d.name) : s === d.name, `${key}: def ${d.name} vs ${JSON.stringify(s)}`);
      assert.ok(d.start <= d.nameStart && d.nameEnd <= d.end, `${key}: def extent ${d.name}`);
    }
    for (const c of g.calls) assert.equal(text.slice(c.start, c.end), c.callee, key);
    for (const m of g.imports) assert.ok(text.slice(m.start, m.end).includes(m.module), `${key}: import ${m.module}`);
    for (const e of g.extends) assert.equal(text.slice(e.start, e.start + e.base.length), e.base, key);
    for (const r of g.refs) assert.equal(text.slice(r.start, r.start + r.name.length), r.name, key);
  }
});

test("offsets are UTF-16 code units: astral and CJK text still slices exactly", { skip: SKIP }, async () => {
  const py = 'x = "日本語😀"\ndef ƒ(a):\n    return a\nwhy = "🧪🧪"\nƒ(1)\n';
  const g = await goldFor({ language: "python", text: py, fileName: "u.py" }, { cache: false });
  const d = g.defs.find((x) => x.name === "ƒ");
  assert.ok(d, "def ƒ");
  assert.equal(py.slice(d.nameStart, d.nameEnd), "ƒ");
  const call = g.calls.find((c) => c.callee === "ƒ");
  assert.ok(call && py.slice(call.start, call.end) === "ƒ");
  const str = g.tokens.find((t) => t.class === "string" && py.slice(t.start, t.end).includes("😀"));
  assert.equal(py.slice(str.start, str.end), '"日本語😀"');
  const js = 'const 🧪 = 1;\nfunction ƒ(){}\nƒ();\n';
  const gj = await goldFor({ language: "javascript", text: js, fileName: "u.js" }, { cache: false });
  const fd = gj.defs.find((x) => x.name === "ƒ");
  assert.equal(js.slice(fd.nameStart, fd.nameEnd), "ƒ");
});

test("P3 control built to fail: a deranged grammar must raise the unparsed share (the statistic moves)", { skip: SKIP }, async () => {
  // fixed derangement: fixture i is parsed by the grammar of fixture (i + 17) mod n; nobody keeps its own language
  const n = FIX.length;
  const reqs = FIX.map((f, i) => ({ language: FIX[(i + 17) % n].language, text: f.text, fileName: f.file }));
  const golds = await allGolds();
  const wrong = await goldBatch(reqs);
  const own = golds.map((g) => g.parse.error_bytes_frac);
  // amendment recorded in gold.py's header: a parse that overruns the budget (or kills the grammar library) is scored
  // as unparsed (share 1.0): it is the strongest possible "the statistic moved"; any other error stays NaN and is dropped
  const der = wrong.map((g) => (g.error ? (/ParseBudgetExceeded|ExtractorCrashed/.test(g.error) ? 1 : NaN) : g.parse.error_bytes_frac));
  const pairs = FIX.map((f, i) => ({ key: f.key, lang: f.language, as: reqs[i].language, own: own[i], der: der[i] }))
    .filter((p) => p.as !== p.lang && Number.isFinite(p.der));
  const moved = pairs.filter((p) => p.der > p.own);
  const stuck = pairs.filter((p) => !(p.der > p.own)).map((p) => `${p.key} as ${p.as}`);
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const rise = median(pairs.map((p) => p.der)) - median(pairs.map((p) => p.own));
  console.log(`# P3: ${moved.length}/${pairs.length} fixtures moved under a deranged grammar; median rise ${rise.toFixed(3)}`);
  console.log(`# P3 permissive pairs (the error share did NOT rise: not an R0 signal for these): ${stuck.join(", ") || "none"}`);
  assert.ok(moved.length / pairs.length >= 0.7, `only ${moved.length}/${pairs.length} moved`);
  assert.ok(rise >= 0.05, `median rise ${rise}`);
});

test("P2: real corpus files parse nearly clean (error share <= 0.02)", { skip: SKIP }, async (t) => {
  const CORP = "/Users/mlacy/Documents/3.0/ethos/09-source-code";
  if (!fs.existsSync(CORP)) return t.skip(`corpus absent: ${CORP}`);
  const want = { c: [".c"], go: [".go"], python: [".py"], typescript: [".ts"], rust: [".rs"], ruby: [".rb"], scala: [".scala"], cpp: [".cpp"], javascript: [".js"] };
  const found = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        for (const [lang, exts] of Object.entries(want)) {
          const st = fs.statSync(p);
          if (exts.includes(path.extname(e.name).toLowerCase()) && st.size > 2000 && st.size < 400000 && !found[lang]) found[lang] = p;
        }
      }
    }
  };
  walk(CORP);
  const items = Object.entries(found).map(([language, p]) => ({ language, text: fs.readFileSync(p, "utf8"), fileName: path.basename(p), p }));
  assert.ok(items.length >= 3, "found too few corpus files");
  const golds = await goldBatch(items);
  const bad = [];
  golds.forEach((g, i) => {
    if (g.error) return bad.push(`${items[i].p}: ${g.error}`);
    if (g.parse.error_bytes_frac > 0.02) bad.push(`${items[i].p}: ${g.parse.error_bytes_frac}`);
    assert.ok(g.defs.length > 0 || g.tokens.length > 0, items[i].p);
  });
  assert.deepEqual(bad, []);
});

test("gold is cached by content: a second call is served from disk and is identical", { skip: SKIP }, async () => {
  const text = "def zzcache():\n    zzother()\n";
  const item = { language: "python", text, fileName: "c.py" };
  const key = cacheKey(item);
  const file = path.join(CACHE_DIR, key.slice(0, 2), key + ".json");
  fs.rmSync(file, { force: true });
  const a = await goldFor(item);
  assert.ok(fs.existsSync(file), "cache file written");
  const b = await goldFor(item);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(cacheKey({ ...item, text: text + " " }), key);
  assert.notEqual(cacheKey({ ...item, language: "javascript" }), key);
});

test("an unresolvable language is an error, not an empty pass; a batch keeps going", { skip: SKIP }, async () => {
  await assert.rejects(goldFor({ language: "no-such-language-xyz", text: "x" }), /unavailable|not in the download manifest|LookupError/i);
  const r = await goldBatch([{ language: "no-such-language-xyz", text: "x" }, { language: "python", text: "def f():\n    g()\n" }], { cache: false });
  assert.ok(r[0].error);
  assert.deepEqual(r[1].defs.map((d) => d.name), ["f"]);
  await assert.rejects(goldFor({ text: "x" }), /language or fileName/);
});

test("the language can be resolved from the file name; aliases resolve", { skip: SKIP }, async () => {
  const a = await goldFor({ fileName: "m.rs", text: "fn main() { f(); }" }, { cache: false });
  assert.equal(a.language, "rust");
  const b = await goldFor({ language: "c_sharp", text: "class A { void M() { N(); } }" }, { cache: false });
  assert.equal(b.language, "csharp");
  assert.deepEqual(b.calls.map((c) => c.callee), ["N"]);
});

test("a pack language with no mapping row gives tokens and TYPED gaps, never a silent empty pass", { skip: SKIP }, async (t) => {
  let g;
  try { g = await goldFor({ language: "ada", text: "procedure Hello is\nbegin\n  null;\nend Hello;\n", fileName: "h.adb" }, { cache: false }); }
  catch (e) { return t.skip(`ada grammar not obtainable here: ${e.message}`); }
  assert.ok(g.tokens.length > 0);
  for (const f of ["defs", "calls", "imports", "extends"]) {
    assert.equal(g.capabilities[f].status, "gap", f);
    assert.match(g.capabilities[f].reason, /no mapping authored/);
  }
});

test("injection: <script>/<style> bodies in html/vue/svelte are parsed in their own grammar", { skip: SKIP }, async () => {
  const html = '<html><script>function f(){ g(); }</script><style>.a{color:red}</style></html>';
  const g = await goldFor({ language: "html", text: html, fileName: "i.html" }, { cache: false });
  assert.deepEqual(g.defs.map((d) => d.name), ["f"]);
  assert.deepEqual(g.calls.map((c) => c.callee), ["g"]);
  assert.deepEqual(g.injections.map((i) => i.language).sort(), ["css", "javascript"]);
  const vue = '<template><p/></template>\n<script lang="ts">\nimport X from "./x";\nexport function h(a: number): void {}\n</script>\n';
  const v = await goldFor({ language: "vue", text: vue, fileName: "i.vue" }, { cache: false });
  assert.deepEqual(v.injections.map((i) => i.language), ["typescript"]);
  assert.deepEqual(v.imports.map((m) => m.module), ["./x"]);
  assert.ok(v.defs.some((d) => d.name === "h"));
});

test("the docstring/comment trap: a def inside a python docstring or C comment is NOT a def (what a regex recipe gets wrong)", { skip: SKIP }, async () => {
  const py = await goldFor({ language: "python", text: 'def real():\n    """\n    class Fake:\n        def inside(self): pass\n    """\n', fileName: "t.py" }, { cache: false });
  assert.deepEqual(py.defs.map((d) => d.name), ["real"]);
  const c = await goldFor({ language: "c", text: "/* int fake(int a) { return a; } */\nint real(void) { return 0; }\n", fileName: "t.c" }, { cache: false });
  assert.deepEqual(c.defs.map((d) => d.name), ["real"]);
  const js = await goldFor({ language: "javascript", text: 'function a() { const s = "}"; return s; }\nfunction b() {}\n', fileName: "t.js" }, { cache: false });
  assert.deepEqual(js.defs.map((d) => d.name), ["a", "b"]);
  assert.ok(js.defs[0].end <= js.defs[1].start, "the brace inside a string does not end the extent early");
});

test("the mapping table embedded at the top of gold.py is current (it cannot drift from MAPS)", { skip: SKIP }, () => {
  const r = spawnSync(PYTHON, [GOLD_PY, "table", "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const head = fs.readFileSync(GOLD_PY, "utf8");
  assert.match(head, /@@TABLE-BEGIN@@/);
  for (const l of Object.keys(JSON.parse(spawnSync(PYTHON, [GOLD_PY, "languages"], { encoding: "utf8" }).stdout).languages)) {
    assert.ok(head.includes(`# | ${l} |`), `table row for ${l}`);
  }
});

test("def kinds: core vs secondary are disjoint and pinned to gold.py", { skip: SKIP }, () => {
  assert.deepEqual(AV.coreKinds, CORE_DEF_KINDS);
  assert.deepEqual(AV.secondaryKinds, SECONDARY_DEF_KINDS);
  assert.equal(CORE_DEF_KINDS.filter((k) => SECONDARY_DEF_KINDS.includes(k)).length, 0);
  assert.ok(isCoreKind("class") && !isCoreKind("constant"));
  assert.equal(GOLD_VERSION, AV.goldVersion);
});

test("wrapper contract is typed (no python needed)", async () => {
  assert.equal(typeof goldAvailable().available, "boolean");
  assert.ok(goldAvailable().available || goldAvailable().reason);
  await assert.rejects(() => goldFor({ language: "python" }), /text must be a string|unavailable/);
});
