// coding-c4: the INSTRUMENT eval/coding-competence/c4-edges.mjs (rung C4 / ladder R4, edges: calls, imports, inheritance) is
// regression-guarded here, and so is the reader's mechanics (adapters/code/edges.js) on tiny snippets. Nothing in this file
// measures khora's reading of real code beyond a skipped-when-absent smoke at the bottom.
//
// What is checked, on AUTHORED toy material (labelled so: written by the model for this test, never held-out natural data):
//   * a perfect system scores 1 on every kind and PASSES; a deranged system (the same edges attached to the wrong file)
//     scores ~0 and does NOT pass;
//   * the controls built to fail do fail (file shuffle, pair shuffle, random score ~0 when vocabulary is file-specific) and the
//     licence check (II.23) voids a pass when a control does as well as the real arm (identical files everywhere);
//   * thin data is a typed `pass:null` (never a silent pass); TEST is refused when consumed and never run with an offset;
//   * the reader recovers exactly the calls/imports/extends of authored snippets in all six languages, a received keyword
//     prior REFUSES (`if (x)` is not a call) and the no-prior ablation admits it, and the reader is prefix-monotone (causal).
// A8 (2026-10-06, review-driven strengthening; see the header of c4-edges.mjs):
//   * the NAIVE-LEXICAL rival: a reader that is only as good as a regex FAILS the strengthened rule (and passed the A1 rule),
//     a saturated naive arm is a typed pass:null, a catastrophic file fails a gating kind, the A1 verdict is untouched without opt-in;
//   * TEST discipline: limit refused, ledger claimed before any test file is read (a failure after it still counts), the CLI never
//     overwrites the card with a refusal, wx creation, --allow-retest gone, retest logged, a card on disk counts as consumption;
//   * C preprocessor arms are alternatives (reader and gold-side extent), prefix-monotone; reader exceptions are typed gaps;
//     every non-test result carries development:true / PASS-DEV and the provenance of its authority.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RUNG, CONST, GATING, KINDS, mulberry32, finalName, countSets, prf, defExtent, goldEdgesOf, systemEdgesFrom, derange,
  armCounts, evaluateKind, selectFiles, causalityAudit, measure, naiveLexical, measureWithProbe, summarizeProbe, verdictLabel, writeResult,
} from "../eval/coding-competence/c4-edges.mjs";
import { goldAvailable } from "../eval/coding-competence/gold.mjs";
import { readEdges, keywordsFor, edgeLanguages } from "../adapters/code/edges.js";
import { measure as xMeasure, judgeKind, engineEdgesFrom, ENGINES, NO_ENGINE, XCONST } from "../eval/coding-competence/xauth-c4-edges.mjs";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── toy edge corpus (AUTHORED): 30 files in 3 repos, every name specific to its file ──────────────────────────────────
const SYL = ["ka", "lo", "mi", "ne", "ru", "sa", "to", "vi", "xe", "zu", "ba", "de", "fi", "go", "hu", "ja"];
function toyCorpus({ nFiles = 30, identical = false } = {}) {
  const rnd = mulberry32(0xc4c4);
  const word = (n) => { let s = ""; for (let i = 0; i < n; i += 1) s += SYL[Math.floor(rnd() * SYL.length)]; return s; };
  const used = new Set();
  const uniq = (n) => { for (;;) { const w = word(n); if (!used.has(w)) { used.add(w); return w; } } };
  const mk = () => {
    const calls = new Set(), imports = new Set(), ext = new Set();
    const fns = [uniq(4), uniq(4), uniq(4)];
    for (const f of fns) for (let k = 0; k < 2; k += 1) calls.add(`${f}\u0001${uniq(5)}`);
    for (let k = 0; k < 2; k += 1) imports.add(`${uniq(3)}.${uniq(3)}`);
    ext.add(`${uniq(4)}\u0001${uniq(4)}`);
    return { calls, imports, ext };
  };
  const one = mk();
  const files = [], gold = { calls: [], imports: [], extends: [] };
  for (let i = 0; i < nFiles; i += 1) {
    const e = identical ? one : mk();
    files.push({ id: `f${i}.x`, repo: `repo${i % 3}` });
    gold.calls.push(new Set(e.calls)); gold.imports.push(new Set(e.imports)); gold.extends.push(new Set(e.ext));
  }
  return { files, gold };
}
const FAST = { boot: 200, reps: 5 };
const copy = (arr) => arr.map((s) => new Set(s));

test("RUNG / KINDS / GATING are declared; thresholds are declared constants", () => {
  assert.equal(RUNG.id, "C4");
  assert.equal(RUNG.ladder, "R4");
  assert.deepEqual([...KINDS], ["calls", "imports", "extends"]);
  assert.deepEqual([...GATING], ["calls", "imports"]); // extends is reported, never gating
  for (const k of ["MIN_FILES", "MIN_EDGES", "MIN_MARGIN", "LICENCE_RATIO", "BOOT", "REPS", "SEED", "CAUSAL_FILES"]) assert.ok(k in CONST, k);
  assert.ok(Object.isFrozen(CONST));
});

test("prf / countSets arithmetic, final-name convention, deterministic RNG", () => {
  const p = prf({ tp: 3, fp: 1, fn: 2 });
  assert.equal(p.precision, 0.75);
  assert.equal(p.recall, 0.6);
  assert.ok(Math.abs(p.f1 - 2 * 0.75 * 0.6 / 1.35) < 1e-12);
  assert.equal(prf({ tp: 0, fp: 0, fn: 0 }).f1, null); // nothing to find and nothing found: undefined, not a pass
  assert.deepEqual(countSets(new Set(["a", "b"]), new Set(["b", "c", "d"])), { tp: 1, fp: 1, fn: 2 });
  assert.equal(finalName("a.b.C"), "C");
  assert.equal(finalName("ns::Type::method"), "method");
  assert.equal(finalName("plain"), "plain");
  const r1 = mulberry32(7), r2 = mulberry32(7);
  assert.deepEqual([r1(), r1(), r1()], [r2(), r2(), r2()]);
});

test("derangement: no file keeps its own edges; with several repos every file crosses a repo", () => {
  const { files } = toyCorpus();
  const d = derange(files);
  assert.equal(d.fixedPoints, 0);
  assert.equal(d.crossRepoShare, 1);
  assert.equal(new Set(d.pi).size, files.length); // a permutation
  const one = files.map((f, i) => ({ id: `g${i}`, repo: "single" }));
  const d1 = derange(one);
  assert.equal(d1.fixedPoints, 0);
  assert.equal(d1.crossRepoShare, 0); // one repo: crossing is impossible and the share says so rather than pretending
});

test("a PERFECT system scores 1, passes calls and imports; the controls built to fail score ~0", () => {
  const { files, gold } = toyCorpus();
  for (const kind of ["calls", "imports"]) {
    const ev = evaluateKind({ kind, files, sys: copy(gold[kind]), gold: gold[kind], seed: "toy", ...FAST });
    assert.equal(ev.f1_real, 1, kind);
    assert.equal(ev.precision, 1);
    assert.equal(ev.recall, 1);
    assert.equal(ev.verdict.pass, true, `${kind}: ${ev.verdict.reasons.join(";")}`);
    assert.ok(ev.strongest_control.f1 <= 0.1, `${kind} control ${ev.strongest_control.f1}`);
    assert.equal(ev.licence_ok, true);
    assert.ok(ev.margin_ci95[0] > 0);
    for (const nm of ["fileShuffle", "random"]) assert.ok(ev.controls[nm].f1 <= 0.1, `${kind}.${nm}`);
    if (kind === "calls") assert.ok(ev.controls.pairShuffle.f1 <= 0.1);
  }
});

test("a DERANGED system (the right edges on the wrong file) scores ~0 and does not pass", () => {
  const { files, gold } = toyCorpus();
  const { pi } = derange(files);
  for (const kind of ["calls", "imports"]) {
    const sys = gold[kind].map((_, i) => new Set(gold[kind][pi[i]]));
    const ev = evaluateKind({ kind, files, sys, gold: gold[kind], seed: "toy", ...FAST });
    assert.ok(ev.f1_real <= 0.05, `${kind} deranged F1 ${ev.f1_real}`);
    assert.equal(ev.verdict.pass, false);
  }
});

test("an EMPTY system and a half system: recall moves, precision stays honest", () => {
  const { files, gold } = toyCorpus();
  const empty = evaluateKind({ kind: "imports", files, sys: gold.imports.map(() => new Set()), gold: gold.imports, seed: "toy", ...FAST });
  assert.equal(empty.f1_real, 0);
  assert.equal(empty.verdict.pass, false);
  const half = gold.imports.map((s) => new Set([...s].slice(0, 1)));
  const ev = evaluateKind({ kind: "imports", files, sys: half, gold: gold.imports, seed: "toy", ...FAST });
  assert.equal(ev.precision, 1);
  assert.equal(ev.recall, 0.5);
});

test("II.23 LICENCE: when every file has the same edges a control does as well as the real arm, so the pass is VOID", () => {
  const { files, gold } = toyCorpus({ identical: true });
  const ev = evaluateKind({ kind: "calls", files, sys: copy(gold.calls), gold: gold.calls, seed: "same", ...FAST });
  assert.equal(ev.f1_real, 1);
  assert.equal(ev.controls.fileShuffle.f1, 1); // the file shuffle cannot fail here: the metric is file-independent
  assert.equal(ev.verdict.pass, false);
  assert.ok(ev.verdict.reasons.some((r) => r.startsWith("licence_failed")), ev.verdict.reasons.join(";"));
  assert.equal(ev.licence_ok, false);
});

test("thin data is a typed pass:null with a reason, never a pass (coverage floors)", () => {
  const { files, gold } = toyCorpus({ nFiles: 30 });
  // extends: 30 files but 30 gold edges < MIN_EDGES (50)
  const ext = evaluateKind({ kind: "extends", files, sys: copy(gold.extends), gold: gold.extends, seed: "toy", ...FAST });
  assert.equal(ext.f1_real, 1);
  assert.equal(ext.gating, false);
  assert.equal(ext.verdict.pass, null);
  assert.ok(ext.verdict.reasons[0].startsWith("too_few"));
  // calls on 10 files: under MIN_FILES (20)
  const f10 = files.slice(0, 10), g10 = gold.calls.slice(0, 10);
  const small = evaluateKind({ kind: "calls", files: f10, sys: copy(g10), gold: g10, seed: "toy", ...FAST });
  assert.equal(small.verdict.pass, null);
  assert.ok(small.verdict.reasons[0].startsWith("too_few"));
});

test("repo consistency: a system that is perfect in two repos and empty in the third cannot pass", () => {
  const { files, gold } = toyCorpus();
  const sys = gold.calls.map((s, i) => (files[i].repo === "repo2" ? new Set() : new Set(s)));
  const ev = evaluateKind({ kind: "calls", files, sys, gold: gold.calls, seed: "toy", ...FAST });
  assert.ok(ev.f1_real > 0.5 && ev.f1_real < 1);
  assert.equal(ev.verdict.pass, false);
  assert.ok(ev.verdict.reasons.some((r) => r.startsWith("repo_inconsistent: repo2")), ev.verdict.reasons.join(";"));
});

test("armCounts: pair shuffle keeps the system's count and breaks the caller/callee binding", () => {
  const files = [0, 1, 2, 3].map((i) => ({ id: `f${i}`, repo: `r${i % 2}` }));
  const S = "\u0001";
  const sys = [new Set([`a${S}x`, `a${S}y`]), new Set([`b${S}p`]), new Set([`c${S}q`, `c${S}r`]), new Set([`d${S}s`])];
  const gold = copy(sys);
  const arms = armCounts({ kind: "calls", sys, gold, files, seed: "t", reps: 3 });
  assert.equal(arms.real.reduce((a, c) => a + c.tp, 0), 6);
  assert.ok(arms.pairShuffle, "calls has a pairShuffle arm");
  assert.equal(arms.fileShuffle.reduce((a, c) => a + c.tp, 0), 0);
  const imp = armCounts({ kind: "imports", sys, gold, files, seed: "t", reps: 3 });
  assert.equal(imp.pairShuffle, undefined, "imports have no caller to pair");
});

// ── gold side: caller binding and the C declarator-only extent ────────────────────────────────────────────────────────
test("goldEdgesOf: innermost enclosing named def is the caller; <top> otherwise; callee/caller reduced to final segment", () => {
  const text = "def outer():\n    inner(1)\n    def nested():\n        deep(2)\ntop(3)\n";
  const at = (s, n = 0) => { let i = -1; for (let k = 0; k <= n; k += 1) i = text.indexOf(s, i + 1); return i; };
  const gold = {
    defs: [
      { kind: "function", name: "outer", start: at("def outer"), end: at("top(3)") },
      { kind: "function", name: "nested", start: at("def nested"), end: at("top(3)") },
    ],
    calls: [
      { callee: "inner", start: at("inner(") }, { callee: "m.deep", start: at("deep(") }, { callee: "top", start: at("top(") },
    ],
    imports: [{ module: "os.path" }], extends: [{ child: "pkg.Child", base: "pkg.Base", relation: "extends" }], tokens: [],
  };
  const g = goldEdgesOf(gold, text, "python");
  assert.deepEqual([...g.calls].sort(), ["nested\u0001deep", "outer\u0001inner", "<top>\u0001top"].sort());
  assert.deepEqual([...g.imports], ["os.path"]);
  assert.deepEqual([...g.extends], ["Child\u0001Base"]);
  assert.equal(g.relations.get("Child\u0001Base"), "extends");
});

test("defExtent: C gold defs span the declarator, the body is recovered from gold's own punctuation tokens", () => {
  const text = "int f(int a) { if (a) { g(\"}\"); } }\nint h(void);\n";
  const tok = (s, from = 0, cls = "punctuation") => { const i = text.indexOf(s, from); return { start: i, end: i + s.length, class: cls }; };
  const braceOpen = text.indexOf("{"), strBrace = text.indexOf('"}"');
  const toks = [
    { start: braceOpen, end: braceOpen + 1, class: "punctuation" },
    { start: text.indexOf("{", braceOpen + 1), end: text.indexOf("{", braceOpen + 1) + 1, class: "punctuation" },
    { start: strBrace, end: strBrace + 3, class: "string" }, // a brace inside a string is one string token, never counted
    { start: text.indexOf("}", strBrace + 3), end: text.indexOf("}", strBrace + 3) + 1, class: "punctuation" },
    { start: text.lastIndexOf("}", text.indexOf("\n")), end: text.lastIndexOf("}", text.indexOf("\n")) + 1, class: "punctuation" },
  ];
  const decl = { kind: "function", name: "f", start: 0, end: text.indexOf("{") - 1 };
  const [s, e] = defExtent(decl, { tokens: toks }, text, "c");
  assert.equal(s, 0);
  assert.equal(e, text.indexOf("\n")); // through the matching outer brace
  assert.deepEqual(defExtent(decl, { tokens: toks }, text, "python"), [decl.start, decl.end]); // other languages: the def's own span
  void tok;
});

// ── reader mechanics on authored snippets, six languages ──────────────────────────────────────────────────────────
const SNIPPETS = {
  python: {
    text: "import os, sys as system\nfrom collections import OrderedDict\nfrom . import sibling\n\nclass Widget(Base, mixins.Mixin, metaclass=Meta):\n    def render(self, x):\n        if (x):\n            return helper(x)\n        self.draw(x)\n\ndef top_level():\n    return Widget().render(1)\n\nsetup(top_level())\n",
    calls: ["render>helper", "render>draw", "top_level>Widget", "top_level>render", "<top>>setup", "<top>>top_level"],
    imports: ["os", "sys", "collections", "."],
    extends: ["Widget<Base", "Widget<Mixin"],
    refused: "if",
  },
  javascript: {
    text: "import fs from \"node:fs\";\nimport { a, b } from './lib.js';\nconst cfg = require(\"./cfg\");\nclass Panel extends Base {\n  constructor(x) { super(x); this.init(x); }\n  draw() { return render(this.x); }\n}\nfunction boot() { if (ready()) { return new Panel(1).draw(); } }\nconst go = () => start(boot());\n",
    calls: ["Panel>init", "draw>render", "boot>ready", "boot>draw", "go>start", "go>boot"],
    imports: ["node:fs", "./lib.js", "./cfg"],
    extends: ["Panel<Base"],
    refused: "if",
  },
  c: {
    text: "#include <stdio.h>\n#include \"local.h\"\nstatic int add(int a, int b) { return a + b; }\nint main(void) {\n  if (add(1, 2) > 2) { printf(\"hi\\n\"); }\n  while (check(3)) { step(); }\n  return sizeof(int);\n}\n",
    calls: ["main>add", "main>printf", "main>check", "main>step"],
    imports: ["stdio.h", "local.h"],
    extends: [],
    refused: "while",
  },
  go: {
    text: "package main\nimport (\n  \"fmt\"\n  str \"strings\"\n)\ntype Dog struct { Animal }\nfunc (d *Dog) Bark() { fmt.Println(str.ToUpper(\"woof\")); d.run() }\nfunc main() { d := &Dog{}; d.Bark(); helper(len(\"x\")) }\n",
    calls: ["Bark>Println", "Bark>ToUpper", "Bark>run", "main>Bark", "main>helper", "main>len"],
    imports: ["fmt", "strings"],
    extends: ["Dog<Animal"],
    refused: null,
  },
  ruby: {
    text: "require 'json'\nrequire_relative \"lib/util\"\nclass Car < Vehicle\n  include Drivable\n  def start(key)\n    ignition.turn(key)\n    puts format_status(key)\n  end\nend\ndef helper; run_it; end\n",
    // ruby's `helper; run_it` bare word is a paren-less call the gold may or may not count; only the unambiguous ones are pinned
    calls: ["<top>>require", "<top>>require_relative", "Car>include", "start>turn", "start>puts", "start>format_status"],
    imports: ["json", "lib/util"],
    extends: ["Car<Vehicle", "Car<Drivable"],
    refused: null,
    subset: true,
  },
  java: {
    text: "import java.util.List;\nimport static java.lang.Math.max;\npublic class Foo extends Bar implements Baz, Qux {\n  public void run(int x) { if (x > 0) { helper(x); } list.add(x); }\n  private int helper(int y) { return Math.max(y, 1); }\n}\n",
    calls: ["run>helper", "run>add", "helper>max"],
    imports: ["java.util.List", "java.lang.Math.max"],
    extends: ["Foo<Bar", "Foo<Baz", "Foo<Qux"],
    refused: "if",
  },
};
const callKeys = (r) => r.calls.map((c) => `${c.caller}>${c.callee}`);

test("the reader supports exactly the six declared languages and each has a vendored keyword prior (the giver is named)", () => {
  assert.deepEqual(edgeLanguages().sort(), Object.keys(SNIPPETS).sort());
  for (const lang of Object.keys(SNIPPETS)) {
    const k = keywordsFor(lang);
    assert.ok(k && k.keywords.size > 10, `${lang}: no vendored CodeKeywordPrior@1`);
    assert.match(k.source, /CodeKeywordPrior@1/);
  }
});

for (const [lang, sn] of Object.entries(SNIPPETS)) {
  test(`reader recovers what the authored ${lang} snippet ORDERS (calls, imports, inheritance)`, () => {
    const kw = keywordsFor(lang).keywords;
    const r = readEdges({ text: sn.text, language: lang, keywords: kw });
    const got = new Set(callKeys(r));
    for (const c of sn.calls) assert.ok(got.has(c), `${lang}: missing call ${c}; got ${[...got].join(" ")}`);
    if (!sn.subset) assert.deepEqual([...got].sort(), [...sn.calls].sort(), `${lang} calls`);
    assert.deepEqual(r.imports.map((i) => i.module).sort(), [...sn.imports].sort(), `${lang} imports`);
    assert.deepEqual(r.extends.map((x) => `${x.child}<${x.base}`).sort(), [...sn.extends].sort(), `${lang} extends`);
    for (const c of r.calls) { assert.ok(c.at >= 0 && c.end > c.at && c.end <= sn.text.length, `${lang}: bad offsets ${JSON.stringify(c)}`); assert.equal(sn.text.slice(c.at, c.at + c.callee.length), c.callee); }
  });

  if (sn.refused) {
    test(`${lang}: the received keyword prior REFUSES \`${sn.refused} (x)\` as a call and the no-prior ablation admits it`, () => {
      const withPrior = readEdges({ text: sn.text, language: lang, keywords: keywordsFor(lang).keywords });
      const none = readEdges({ text: sn.text, language: lang, keywords: null });
      assert.ok(!withPrior.calls.some((c) => c.callee === sn.refused), "refused with the prior");
      assert.ok(none.calls.some((c) => c.callee === sn.refused), "admitted without it: the statistic moves under the ablation");
      assert.ok(none.calls.length > withPrior.calls.length);
    });
  }
}

test("a keyword AFTER a member access is a method name, not a keyword (x.default() is a call)", () => {
  const r = readEdges({ text: "function f(x) { return x.default(1) + x.catch(2); }\n", language: "javascript", keywords: keywordsFor("javascript").keywords });
  assert.deepEqual(r.calls.map((c) => c.callee).sort(), ["catch", "default"]);
});

test("`new X(...)` is an instantiation, not a call; a def/class NAME is not a call (the gold agrees)", () => {
  const js = readEdges({ text: "function make() { return new Thing(1); }\n", language: "javascript", keywords: keywordsFor("javascript").keywords });
  assert.deepEqual(js.calls, []);
  const py = readEdges({ text: "def f(a):\n    pass\nclass K(B):\n    pass\n", language: "python", keywords: keywordsFor("python").keywords });
  assert.deepEqual(py.calls, []);
});

test("brace, quote and comment content never yields an edge (strings and comments are not code)", () => {
  const c = readEdges({ text: "// call_me()\n/* also(x) */\nint f(void) { puts(\"not_a_call(1)\"); return 0; }\n", language: "c", keywords: keywordsFor("c").keywords });
  assert.deepEqual(callKeys(c), ["f>puts"]);
  const py = readEdges({ text: "# nope(1)\ndef f():\n    s = \"nope(2)\"\n    return real(3)\n", language: "python", keywords: keywordsFor("python").keywords });
  assert.deepEqual(callKeys(py), ["f>real"]);
});

test("CAUSAL: every prefix reading is a subset of the whole-file reading and nothing completed before the cut is missed", () => {
  const texts = Object.entries(SNIPPETS).map(([lang, sn]) => ({ text: sn.text, fileName: `toy.${{ python: "py", javascript: "js", c: "c", go: "go", ruby: "rb", java: "java" }[lang]}`, lang }));
  for (const t of texts) {
    const au = causalityAudit({ language: t.lang, texts: [t], keywords: keywordsFor(t.lang).keywords, nFiles: 1, cuts: [0.2, 0.4, 0.6, 0.8] });
    assert.equal(au.retracted, 0, `${t.lang} retracted ${JSON.stringify(au.examples)}`);
    assert.equal(au.missed, 0, `${t.lang} missed ${JSON.stringify(au.examples)}`);
    assert.equal(au.ok, true);
  }
  // and the audit CAN fail: hand it an inconsistent reading by cutting inside a token run it must not complete
  const pre = readEdges({ text: "foo(1)\nbar", language: "python", keywords: null, final: false });
  assert.ok(pre.consumed < "foo(1)\nbar".length, "final:false drops the possibly-truncated last token");
});

test("end to end on the toy python fixture: reader edges == hand-authored gold edges (perfect=1), a deranged pairing scores low", () => {
  const sn = SNIPPETS.python;
  const text = sn.text;
  const at = (s, n = 0) => { let i = -1; for (let k = 0; k <= n; k += 1) i = text.indexOf(s, i + 1); if (i < 0) throw new Error(s); return i; };
  const goldObj = {
    defs: [
      { kind: "class", name: "Widget", start: at("class Widget"), end: at("def top_level") },
      { kind: "method", name: "render", start: at("def render"), end: at("def top_level") },
      { kind: "function", name: "top_level", start: at("def top_level"), end: at("setup(") },
    ],
    calls: [
      { callee: "helper", start: at("helper(") }, { callee: "draw", start: at("draw(") },
      { callee: "Widget", start: at("Widget()") }, { callee: "render", start: at("render(1)") },
      { callee: "setup", start: at("setup(") }, { callee: "top_level", start: at("top_level())") },
    ],
    imports: [{ module: "os" }, { module: "sys" }, { module: "collections" }, { module: "." }],
    extends: [{ child: "Widget", base: "Base", relation: "extends" }, { child: "Widget", base: "Mixin", relation: "extends" }],
    tokens: [],
  };
  const g = goldEdgesOf(goldObj, text, "python");
  const s = systemEdgesFrom(readEdges({ text, language: "python", keywords: keywordsFor("python").keywords }));
  for (const k of KINDS) assert.deepEqual([...s[k]].sort(), [...g[k]].sort(), k);
  assert.equal(prf(countSets(s.calls, g.calls)).f1, 1);
  // the same system scored against another file's gold is ~0: the metric binds the edges to THIS file
  const other = goldEdgesOf({ defs: [{ kind: "function", name: "zz", start: 0, end: 20 }], calls: [{ callee: "qq", start: 5 }], imports: [{ module: "json" }], extends: [], tokens: [] }, "def zz():\n    qq(1)\n", "python");
  assert.equal(prf(countSets(s.calls, other.calls)).f1, 0);
  assert.equal(prf(countSets(s.imports, other.imports)).f1, 0);
});

// ── discipline: typed gaps, TEST consumed once, no model in the reader ───────────────────────────────────────────────
test("measure() never throws: an unknown language is a typed gap with pass:null (unmeasured is never good)", async () => {
  const r = await measure({ language: "klingon", split: "dev", limit: 5 });
  assert.equal(r.pass, null);
  assert.equal(r.score, null);
  assert.ok(r.gaps[0].reason.startsWith("unmeasured"), JSON.stringify(r.gaps));
  for (const k of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(k in r, `result shape: ${k}`);
});

test("TEST split is consumed once: refused when the ledger holds the language, and refused with an offset (never run here)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c4-ledger-"));
  const ledger = path.join(dir, "ledger.json");
  fs.writeFileSync(ledger, JSON.stringify({ "c4:python": { at: "2026-01-01T00:00:00Z", files: 1 } }));
  const old = process.env.C4_LEDGER;
  process.env.C4_LEDGER = ledger;
  try {
    const consumed = await measure({ language: "python", split: "test" });
    assert.equal(consumed.pass, null);
    assert.ok(consumed.gaps.some((g) => g.reason === "test_split_already_consumed"), JSON.stringify(consumed.gaps));
    const off = await measure({ language: "go", split: "test", offset: 10 });
    assert.equal(off.pass, null);
    assert.ok(off.gaps[0].reason.startsWith("offset_not_allowed_on_test"), JSON.stringify(off.gaps));
    assert.deepEqual(JSON.parse(fs.readFileSync(ledger, "utf8")), { "c4:python": { at: "2026-01-01T00:00:00Z", files: 1 } }); // nothing recorded
  } finally {
    if (old === undefined) delete process.env.C4_LEDGER; else process.env.C4_LEDGER = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("selectFiles: round-robin over repositories, typed gap for oversize files, offset slices are disjoint and cover", () => {
  const row = (repo, i, bytes = 100) => ({ repo, path: `/x/${repo}/${i}`, rel: `${repo}/${i}`, bytes, sha256: `${repo}${String(i).padStart(3, "0")}` });
  const rows = [...[0, 1, 2, 3, 4].map((i) => row("A", i)), ...[0, 1, 2].map((i) => row("B", i)), row("C", 0), row("C", 1, 999999)];
  const all = selectFiles(rows, {});
  assert.deepEqual(all.gaps, [{ reason: "file_too_large", count: 1 }]);
  assert.equal(all.rows.length, 9); // A:5 + B:3 + C:1 (C's second file is oversize)
  assert.deepEqual(all.rows.slice(0, 3).map((r) => r.repo), ["A", "B", "C"]); // one per repository before a second from any
  const first = selectFiles(rows, { limit: 5 }), next = selectFiles(rows, { limit: 5, offset: 5 });
  assert.equal(first.rows.length, 5);
  assert.equal(next.rows.length, 4); // the slice ends where the selection does
  assert.deepEqual([...first.rows, ...next.rows].map((r) => r.path), all.rows.map((r) => r.path));
  const ids = new Set(first.rows.map((r) => r.path));
  assert.ok(next.rows.every((r) => !ids.has(r.path)));
});

test("the reader contains no model call (zero-model) and no gold dependency", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "adapters", "code", "edges.js"), "utf8");
  assert.ok(!/\bfetch\s*\(|anthropic|openai|child_process|gold\.mjs|tree-sitter/i.test(src.replace(/^\s*\/\/.*$/gm, "")), "edges.js must be a lexer plus a scope stack, never a model or the gold parser");
  const imports = [...src.matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ["node:fs"]);
});

// ── real-corpus smoke (DEV only, skipped when the manifest or the gold extractor is absent) ───────────────────────────
const MANIFEST = process.env.C4_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";
test("DEV smoke: python edges on 12 real files have the declared result shape; too few files is pass:null, never true", { skip: !fs.existsSync(MANIFEST) }, async () => {
  const r = await measure({ language: "python", split: "dev", limit: 12, ...FAST });
  if (r.gaps.some((g) => String(g.reason).startsWith("unmeasured"))) return; // gold toolchain absent: a typed gap is the correct answer
  assert.equal(r.split, "dev");
  assert.ok(r.n > 0 && r.n <= 12);
  assert.equal(r.applicable, true);
  assert.equal(r.pass, null); // 12 files is below MIN_FILES (20): not measurable, so not a pass
  assert.ok(r.gaps.some((g) => String(g.reason).includes("not_measurable")), JSON.stringify(r.gaps));
  for (const k of ["calls_fileShuffle", "calls_pairShuffle", "calls_random", "imports_fileShuffle", "imports_random"]) assert.ok(k in r.controls, k);
  assert.ok(r.details.causality.ok);
  assert.equal(r.details.kinds_applicability.calls.applicable, true);
  // layout the aggregator audits: language, a licence verdict, and no ablation sitting among the controls
  assert.equal(r.language, "python");
  assert.ok(r.licence && "ok" in r.licence);
  assert.ok(!Object.keys(r.controls).some((k) => /noPrior|_real$/.test(k)), "ablations/diagnostics live in details.ablations, not controls");
  assert.ok("calls_noPrior" in r.details.ablations);
  // A8: a dev figure says so, carries its authority, and the naive rival is scored (in details while the kind is not in the headline)
  assert.equal(r.development, true);
  assert.equal(r.verdict_label, "UNMEASURED");
  assert.equal(r.provenance.second_authority, "stdlib ast (xauth-c4-edges.mjs)");
  assert.ok("calls_naiveLexical" in r.details.ablations, JSON.stringify(Object.keys(r.details.ablations)));
  assert.ok(r.details.systems.edges.calls.naive.f1 >= 0 && r.details.systems.edges.calls.per_file, "naive arm and per-file distribution are reported");
  assert.equal(r.details.reader_errors.count, 0);
});

// ── second authority (xauth-c4-edges.mjs): judging rule, typed gaps, and the two extractors on AUTHORED toy files ────────
const A_OK = { f1_real: 0.97, verdict: { pass: true, reasons: [] } };
test("xauth judge: authorities that disagree give pass:null, a reader below the grammar by > 0.05 fails x2, coverage is null", () => {
  assert.equal(judgeKind({ kind: "calls", gating: true, A: A_OK, B: { f1_real: 0.97 } }).pass, true);
  const dis = judgeKind({ kind: "calls", gating: true, A: A_OK, B: { f1_real: 0.6 } });
  assert.equal(dis.pass, null);
  assert.equal(dis.x1, false);
  assert.ok(dis.reasons[0].startsWith("authorities_disagree"));
  const low = judgeKind({ kind: "calls", gating: true, A: { f1_real: 0.85, verdict: { pass: true, reasons: [] } }, B: { f1_real: 0.97 } });
  assert.equal(low.pass, false);
  assert.equal(low.x2, false);
  const edge = judgeKind({ kind: "calls", gating: true, A: { f1_real: 0.92, verdict: { pass: true, reasons: [] } }, B: { f1_real: 0.97 } });
  assert.equal(edge.pass, true, "exactly within the declared 0.05");
  const thin = judgeKind({ kind: "imports", gating: true, A: { f1_real: 1, verdict: { pass: null, reasons: ["too_few: 12 files"] } }, B: { f1_real: 1 } });
  assert.equal(thin.pass, null);
  assert.ok(thin.reasons[0].startsWith("coverage"));
  const ctrl = judgeKind({ kind: "calls", gating: true, A: { f1_real: 0.97, verdict: { pass: false, reasons: ["licence_failed"] } }, B: { f1_real: 0.97 } });
  assert.equal(ctrl.pass, false);
  assert.equal(XCONST.COMPARABLE_F1, 0.8);
});

test("xauth: no engine for javascript/go/java/c is a typed gap with a reason, TEST is refused, and engineEdgesFrom keys match c4", async () => {
  for (const lang of ["go", "java", "c"]) {
    assert.ok(NO_ENGINE[lang]);
    const r = await xMeasure({ language: lang });
    assert.equal(r.applicable, false);
    assert.equal(r.pass, null);
    assert.ok(r.reason && r.gaps[0].reason.startsWith("no_second_authority"), lang);
  }
  const t = await xMeasure({ language: "python", split: "test" });
  assert.equal(t.pass, null);
  assert.ok(t.gaps[0].reason.startsWith("xauth_is_dev_only"));
  const e = engineEdgesFrom({ calls: [["f", "g"], ["f", "g"], ["<top>", "h"]], imports: ["os", "os"], extends: [["A", "B"]] });
  assert.deepEqual([...e.calls].sort(), ["<top>\u0001h", "f\u0001g"]);
  assert.deepEqual([...e.calleeSet].sort(), ["g", "h"]);
  assert.deepEqual([...e.imports], ["os"]);
  assert.deepEqual([...e.extends], ["A\u0001B"]);
});

function runExtractor(language, source, ext) {
  const eng = ENGINES[language];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c4x-"));
  const f = path.join(dir, `toy.${ext}`);
  fs.writeFileSync(f, source);
  try {
    const r = spawnSync(eng.cmd(), eng.args(), { input: JSON.stringify([f]), encoding: "utf8" });
    if (r.error || r.status !== 0) return null; // interpreter absent here
    return JSON.parse(r.stdout)[f];
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test("xauth python extractor (stdlib ast) on an authored toy file: decorators belong to the enclosing scope, defaults to the def", () => {
  const out = runExtractor("python", "import os\nfrom . import a\nfrom __future__ import annotations\nclass K(B, m.C, metaclass=M):\n    @deco(1)\n    def f(self, x=d()):\n        g(x); self.h()\nk()\n", "py");
  if (!out) return;
  assert.deepEqual(out.calls.map((c) => c.join(">")).sort(), ["<top>>k", "K>deco", "f>d", "f>g", "f>h"].sort());
  assert.deepEqual(out.imports, ["os", "."]);
  assert.deepEqual(out.extends.map((e) => e.join("<")), ["K<B", "K<C"]);
  const bad = runExtractor("python", "def f(:\n", "py");
  assert.ok(bad.error, "a file the engine parser rejects is a typed error, never an empty success");
});

test("xauth javascript extractor (acorn bundled in node) on an authored toy file: new/super/require are not calls, private and optional calls are", () => {
  const src = "import a from \"x\";\nconst r = require(\"y\");\nclass K extends m.B {\n  #p() {}\n  constructor() { super(); this.init(); }\n  run() { foo(1); this.#p(); a?.b?.(); new Q(); }\n}\nconst go = () => start(boot());\nexport function boot() { return tag`x`; }\n";
  const out = runExtractor("javascript", src, "js");
  if (!out) return;
  assert.deepEqual(out.calls.map((c) => c.join(">")).sort(), ["K>init", "run>foo", "run>#p", "run>b", "go>start", "go>boot", "boot>tag"].sort());
  assert.deepEqual(out.imports.sort(), ["x", "y"]);
  assert.deepEqual(out.extends, [["K", "B"]]);
  assert.ok(runExtractor("javascript", "const x = <div/>;\n", "js").error, "JSX is outside ECMAScript: a typed rejection");
});

test("xauth ruby extractor (Ripper) on an authored toy file: bare identifiers are not calls; operator/setter defs ARE named scopes", () => {
  const out = runExtractor("ruby", "require \"json\"\nclass A < B\n  include M\n  def m(x = dflt())\n    foo(1); bar.baz; vc; r.q 3\n  end\n  def <<(x)\n    qq(x)\n  end\nend\ntop_cmd 1\n", "rb");
  if (!out) return;
  assert.deepEqual(out.calls.map((c) => c.join(">")).sort(), ["<top>>require", "<top>>top_cmd", "<<>qq", "A>include", "m>baz", "m>dflt", "m>foo", "m>q"].sort());
  assert.ok(!out.calls.some((c) => c[1] === "vc"), "a bare identifier is a vcall, not a call");
  assert.deepEqual(out.imports, ["json"]);
  assert.deepEqual(out.extends.map((e) => e.join("<")).sort(), ["A<B", "A<M"]);
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// A8 (2026-10-06): review-driven strengthening. Everything below is AUTHORED toy material or a toy world built in a temp dir
// (labelled so: written by the model for this test, never held-out natural data). No TEST data is read anywhere in this file.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const S1 = "\u0001";
const pairs = (r) => r.calls.map((c) => `${c.caller}>${c.callee}`);
const naiveCalls = (n) => [...n.calls].map((k) => k.replace(S1, ">")).sort();

test("A8 naive-lexical arm: a skeptic's regex that sees strings, comments and no scope end; it refuses keywords and never calls a def name a call", () => {
  const py = "import os, sys as system\nfrom collections import OrderedDict\n# commented(1)\ndef top(x):\n    s = \"in_string(2)\"\n    if (x):\n        return helper(s)\nafter_def(3)\n";
  const kw = keywordsFor("python").keywords;
  const n = naiveLexical(py, "python", kw);
  assert.deepEqual(naiveCalls(n), ["<top>>commented", "top>after_def", "top>helper", "top>in_string"].sort());
  assert.deepEqual([...n.imports].sort(), ["collections", "os", "sys"]);
  assert.ok(!naiveCalls(n).some((c) => c.endsWith(">if") || c.endsWith(">top")), "keyword refused by the received prior, def name is not a call");
  // the reader is NOT the naive arm: it neither reads strings/comments nor lets a def's scope outlive its body
  const r = pairs(readEdges({ text: py, language: "python", keywords: kw }));
  assert.deepEqual(r.sort(), ["<top>>after_def", "top>helper"].sort());
  // without the prior the naive arm admits the keyword shape too (the same ablation the reader has)
  assert.ok(naiveCalls(naiveLexical(py, "python", null)).includes("top>if"));
});

test("A8 naive-lexical arm: authored snippets in the other five languages (calls, callers by the last definition, imports)", () => {
  const cases = {
    javascript: ["import fs from \"node:fs\";\nconst cfg = require(\"./cfg\");\nfunction boot() { return ready(); }\n", ["<top>>require", "boot>ready"], ["./cfg", "node:fs"]],
    c: ["#include <stdio.h>\nstatic int add(int a, int b) { return a + b; }\nint main(void) {\n  if (add(1, 2) > 2) { printf(\"hi\\n\"); }\n  return 0;\n}\n", ["main>add", "main>printf"], ["stdio.h"]],
    go: ["package main\nimport (\n  \"fmt\"\n  str \"strings\"\n)\nfunc main() { fmt.Println(str.ToUpper(\"x\")) }\n", ["main>Println", "main>ToUpper"], ["fmt", "strings"]],
    ruby: ["require 'json'\nrequire_relative \"lib/util\"\ndef helper(x)\n  run_it(x)\nend\n", ["helper>run_it"], ["json", "lib/util"]],
    java: ["import java.util.List;\nimport static java.lang.Math.max;\npublic class Foo {\n  public void run(int x) { helper(x); }\n}\n", ["run>helper"], ["java.lang.Math.max", "java.util.List"]],
  };
  for (const [lang, [text, calls, imports]] of Object.entries(cases)) {
    const n = naiveLexical(text, lang, keywordsFor(lang).keywords);
    assert.deepEqual(naiveCalls(n), [...calls].sort(), `${lang} calls`);
    assert.deepEqual([...n.imports].sort(), imports, `${lang} imports`);
  }
  assert.equal(naiveLexical("x", "klingon", null), null, "no naive arm for a language it has no regexes for: a typed gap, not an empty arm");
});

// ── the strengthened verdict on toy corpora ───────────────────────────────────────────────────────────────────────────
function naiveOf(gold, { drop = 1, fp = 1 } = {}) {
  return gold.map((s, i) => { const a = [...s].slice(drop); for (let k = 0; k < fp; k += 1) a.push(`nv${i}_${k}\u0001nx${i}_${k}`); return new Set(a); });
}

test("A8 BLOCKER: a reader only as good as the naive regex passed the A1 rule and now FAILS; a mostly-wrong reader fails too", () => {
  const { files, gold } = toyCorpus();
  const naive = naiveOf(gold.calls); // F1 ~0.83
  const asGood = evaluateKind({ kind: "calls", files, sys: copy(naive), gold: gold.calls, seed: "toy", ...FAST });
  assert.equal(asGood.verdict.pass, true, "the A1 rule (shuffles and random only) cannot see the difference: that was the review's blocker");
  const withRival = evaluateKind({ kind: "calls", files, sys: copy(naive), gold: gold.calls, seed: "toy", naiveSys: naive, strict: true, ...FAST });
  assert.equal(withRival.verdict.pass, false);
  assert.ok(withRival.verdict.reasons.some((r) => r.startsWith("naive_ci_lower_not_above_zero")), withRival.verdict.reasons.join(";"));
  assert.ok(withRival.verdict.reasons.some((r) => r.startsWith("naive_margin_below_")));
  assert.equal(withRival.naive.margin, 0);
  // a mostly wrong reader: keeps 2 of 6 gold edges per file (F1 0.5), far above chance, below the regex
  const weak = gold.calls.map((s) => new Set([...s].slice(0, 2)));
  assert.equal(evaluateKind({ kind: "calls", files, sys: copy(weak), gold: gold.calls, seed: "toy", ...FAST }).verdict.pass, true, "A1 passed it");
  const weakR = evaluateKind({ kind: "calls", files, sys: copy(weak), gold: gold.calls, seed: "toy", naiveSys: naive, strict: true, ...FAST });
  assert.equal(weakR.verdict.pass, false);
  assert.ok(weakR.naive.margin < 0);
});

test("A8 a reader that clearly beats the naive arm passes; the margin is required_margin = min(0.10, 0.5 x headroom)", () => {
  const { files, gold } = toyCorpus();
  const naive = naiveOf(gold.calls); // F1 0.833: headroom 0.167, required 0.083
  const ev = evaluateKind({ kind: "calls", files, sys: copy(gold.calls), gold: gold.calls, seed: "toy", naiveSys: naive, strict: true, ...FAST });
  assert.equal(ev.verdict.pass, true, ev.verdict.reasons.join(";"));
  assert.ok(Math.abs(ev.naive.f1 - 0.8333) < 0.001);
  assert.equal(ev.naive.required_margin, 0.0833);
  assert.ok(ev.naive.margin_ci95[0] > 0);
  assert.equal(ev.naive.saturated, false);
  assert.ok(ev.strongest_incl_naive.name === "naiveLexical" && ev.strongest_incl_naive.f1 > ev.strongest_control.f1, "the headline rival is the naive arm, not a shuffle");
  assert.ok("naiveLexical" in ev.controls);
  // a weak naive arm (F1 ~0.3): the full 0.10 is required and met
  const weakNaive = gold.calls.map((s, i) => new Set([...s].slice(0, 2).concat([`w${i}a\u0001w${i}b`, `w${i}c\u0001w${i}d`, `w${i}e\u0001w${i}f`])));
  const e2 = evaluateKind({ kind: "calls", files, sys: copy(gold.calls), gold: gold.calls, seed: "toy", naiveSys: weakNaive, strict: true, ...FAST });
  assert.equal(e2.naive.required_margin, 0.1);
  assert.equal(e2.verdict.pass, true);
});

test("A8 a saturated naive arm cannot be told from the reader: typed pass:null non_discriminating_vs_naive, never a pass; a reader BELOW it fails", () => {
  const { files, gold } = toyCorpus();
  const near = gold.imports.map((s, i) => (i === 0 ? new Set([...s].slice(1)) : new Set(s))); // naive loses one edge in one file
  const eq = evaluateKind({ kind: "imports", files, sys: copy(gold.imports), gold: gold.imports, seed: "toy", naiveSys: near, strict: true, ...FAST });
  assert.equal(eq.naive.saturated, true);
  assert.equal(eq.verdict.pass, null);
  assert.ok(eq.verdict.reasons.some((r) => r.startsWith("non_discriminating_vs_naive")), eq.verdict.reasons.join(";"));
  const below = gold.imports.map((s, i) => (i < 3 ? new Set([...s].slice(1)) : new Set(s)));
  const worse = evaluateKind({ kind: "imports", files, sys: below, gold: gold.imports, seed: "toy", naiveSys: gold.imports.map((s) => new Set(s)), strict: true, ...FAST });
  assert.equal(worse.verdict.pass, false);
  assert.ok(!worse.verdict.reasons.some((r) => r.startsWith("non_discriminating")), "a reader worse than a perfect regex is a fail, not a gap");
});

test("A8/A10 naive repo consistency: >= the naive arm in every judged repo, strictly > unless the naive arm is saturated there; a loss or a tie with room fails", () => {
  const { files, gold } = toyCorpus();
  const weak = naiveOf(gold.calls, { drop: 3, fp: 3 }); // F1 0.5
  const mix = (repo0) => gold.calls.map((s, i) => (files[i].repo === "repo0" ? repo0[i] : weak[i]));
  // (a) repo0: naive perfect and the reader perfect: a tie at the ceiling cannot be beaten, so it is not a failure (A10)
  const a = evaluateKind({ kind: "calls", files, sys: copy(gold.calls), gold: gold.calls, seed: "toy", naiveSys: mix(gold.calls), strict: true, ...FAST });
  assert.ok(a.naive.margin > 0.3 && !a.naive.saturated, JSON.stringify(a.naive));
  assert.deepEqual(a.naive.repo_fail, []);
  assert.deepEqual(a.naive.repos_not_discriminating, ["repo0"]);
  assert.equal(a.verdict.pass, true, a.verdict.reasons.join(";"));
  // (b) repo0: reader and naive tie at 0.83 with room above them: the reader is no better than the regex there: fail
  const mid = naiveOf(gold.calls); // F1 0.833
  const b = evaluateKind({ kind: "calls", files, sys: gold.calls.map((s, i) => (files[i].repo === "repo0" ? new Set(mid[i]) : new Set(s))), gold: gold.calls, seed: "toy", naiveSys: mix(mid), strict: true, ...FAST });
  assert.deepEqual(b.naive.repo_fail, ["repo0"]);
  assert.equal(b.verdict.pass, false);
  assert.ok(b.verdict.reasons.some((r) => r.startsWith("naive_repo_inconsistent: repo0")), b.verdict.reasons.join(";"));
  // (c) repo0: the reader is BELOW a perfect naive arm there: fail, even though the headroom is zero
  const c = evaluateKind({ kind: "calls", files, sys: gold.calls.map((s, i) => (files[i].repo === "repo0" ? new Set([...s].slice(1)) : new Set(s))), gold: gold.calls, seed: "toy", naiveSys: mix(gold.calls), strict: true, ...FAST });
  assert.deepEqual(c.naive.repo_fail, ["repo0"]);
  assert.equal(c.verdict.pass, false);
});

test("A8 (h) catastrophic file: one 30-edge file at F1 0 fails a strict gating kind though the micro-F1 stays high; non-strict callers keep the A1 verdict", () => {
  const files = [], goldS = [], sys = [];
  for (let i = 0; i < 24; i += 1) {
    files.push({ id: `f${i}.x`, repo: `repo${i % 3}` });
    const n = i === 0 ? 30 : 6;
    const g = new Set(Array.from({ length: n }, (_, j) => `fn${i}_${j}\u0001cal${i}_${j}`));
    goldS.push(g);
    sys.push(i === 0 ? new Set() : new Set(g));
  }
  const strictEv = evaluateKind({ kind: "calls", files, sys: copy(sys), gold: goldS, seed: "cat", strict: true, ...FAST });
  assert.ok(strictEv.f1_real > 0.85, `micro-F1 hides it: ${strictEv.f1_real}`);
  assert.equal(strictEv.per_file.catastrophic.count, 1);
  assert.equal(strictEv.per_file.catastrophic.of, 1);
  assert.deepEqual(strictEv.per_file.catastrophic.files, [{ file: "f0.x", gold_edges: 30, f1: 0 }]);
  assert.equal(strictEv.per_file.f1.min, 0);
  assert.equal(strictEv.verdict.pass, false);
  assert.ok(strictEv.verdict.reasons.some((r) => r.startsWith("catastrophic_files: 1")), strictEv.verdict.reasons.join(";"));
  const lax = evaluateKind({ kind: "calls", files, sys: copy(sys), gold: goldS, seed: "cat", ...FAST });
  assert.equal(lax.verdict.pass, true, "without opt-in the verdict is exactly the A1 rule (xauth-c4-edges.mjs relies on that)");
  assert.equal(lax.per_file.catastrophic.count, 1, "but the finding is always reported");
  assert.equal(lax.naive, undefined);
  // a file with fewer than 20 gold edges is never catastrophic, however wrong
  const small = evaluateKind({ kind: "calls", files, sys: sys.map((s, i) => (i === 1 ? new Set() : s)), gold: goldS, seed: "cat", strict: true, ...FAST });
  assert.equal(small.per_file.catastrophic.count, 1, "only f0 (30 edges): f1 has 6");
});

test("A8 verdictLabel: only the single TEST run can be a competence PASS; every other split is labelled", () => {
  assert.equal(verdictLabel(true, "dev"), "PASS-DEV");
  assert.equal(verdictLabel(false, "dev"), "FAIL-DEV");
  assert.equal(verdictLabel(true, "train"), "PASS-TRAIN");
  assert.equal(verdictLabel(true, "test"), "PASS");
  assert.equal(verdictLabel(false, "test"), "FAIL");
  assert.equal(verdictLabel(null, "dev"), "UNMEASURED");
});

// ── C preprocessor arms (reader and gold side) ────────────────────────────────────────────────────────────────────────
const C_ARMS = "int first(void)\n{\n#if defined(A)\n    if (probe(1)) {\n#else\n    if (probe(2)) {\n#endif\n        inner();\n    }\n    return 0;\n}\nint second(void) { later(); }\n";

test("A8 (7) C: the arms of #if/#else are ALTERNATIVES, so a block opened in both arms and closed once does not swallow the next function", () => {
  const kw = keywordsFor("c").keywords;
  assert.deepEqual(pairs(readEdges({ text: C_ARMS, language: "c", keywords: kw })), ["first>probe", "first>probe", "first>inner", "second>later"]);
  // a header guard with no #else: unchanged (the first arm is the one read)
  assert.deepEqual(pairs(readEdges({ text: "#ifdef __cplusplus\nextern \"C\" {\n#endif\nint one(void) { a(); }\n#ifdef __cplusplus\n}\n#endif\nint two(void) { b(); }\n", language: "c", keywords: kw })), ["one>a", "two>b"]);
  // alternative function HEADERS
  assert.deepEqual(pairs(readEdges({ text: "#if X\nint sel(int a)\n#else\nint sel(long a)\n#endif\n{\n  body(a);\n}\nint after(void) { tail(); }\n", language: "c", keywords: kw })), ["sel>body", "after>tail"]);
  // stray #else / #endif (a fragment) is harmless
  assert.deepEqual(pairs(readEdges({ text: "int f(void) {\n#else\n  x();\n#endif\n  y();\n}\nint g(void) { z(); }\n", language: "c", keywords: kw })), ["f>x", "f>y", "g>z"]);
});

test("A8 (7) C: the arm handling is prefix-monotone (causal): no retraction, nothing missed, at many cut points", () => {
  const kw = keywordsFor("c").keywords;
  const cuts = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];
  for (const text of [C_ARMS, "#if X\nint sel(int a)\n#else\nint sel(long a)\n#endif\n{\n  body(a);\n}\nint after(void) { tail(); }\n"]) {
    const au = causalityAudit({ language: "c", texts: [{ text, fileName: "t.c" }], keywords: kw, nFiles: 1, cuts });
    assert.equal(au.retracted, 0, JSON.stringify(au.examples));
    assert.equal(au.missed, 0, JSON.stringify(au.examples));
  }
});

test("A8 (7) gold side: defExtent applies the same alternatives rule to gold's own #if/#else/#endif tokens (the extent stopped running to end of file)", () => {
  const text = "int f(void) {\n#if A\n if (a) {\n#else\n if (b) {\n#endif\n g();\n }\n}\nint h(void) { k(); }\n";
  const toks = [];
  for (const m of text.matchAll(/#\w+|[{}]/g)) toks.push({ start: m.index, end: m.index + m[0].length, class: m[0][0] === "#" ? "other" : "punctuation" });
  const decl = { kind: "function", name: "f", start: 0, end: text.indexOf("{") - 1 };
  const [s, e] = defExtent(decl, { tokens: toks }, text, "c");
  assert.equal(s, 0);
  assert.equal(e, text.indexOf("}\nint h") + 1, "ends at f's own closing brace, not at the end of the file");
  assert.notEqual(e, text.length);
});

// ── TEST discipline in a toy world: nothing here touches the real corpus or the real ledger ───────────────────────────
const C4 = path.join(HERE, "..", "eval", "coding-competence", "c4-edges.mjs");
const GOLD_OK = goldAvailable().available;
function toyWorld({ missing = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c4-world-"));
  const rows = [0, 1, 2].map((i) => {
    const f = path.join(dir, missing ? `gone${i}.py` : `toy${i}.py`);
    if (!missing) fs.writeFileSync(f, `import os\n\ndef alpha${i}(x):\n    return beta${i}(x)\n\ndef beta${i}(y):\n    return os.path.join(y, "z")\n`);
    return { path: f, rel: `toy${i}.py`, repo: "toy/one", bytes: 100, sha256: `s${i}` };
  });
  const manifest = path.join(dir, "manifest.json");
  fs.writeFileSync(manifest, JSON.stringify({ schema: "toy", languages: { python: { test: rows } } }));
  return { dir, manifest, ledger: path.join(dir, "ledger.json"), out: path.join(dir, "out"), rows };
}
const env = (w) => ({ ...process.env, C4_MANIFEST: w.manifest, C4_LEDGER: w.ledger, C4_OUT_DIR: w.out });
async function withEnv(w, fn) {
  const old = { m: process.env.C4_MANIFEST, l: process.env.C4_LEDGER, o: process.env.C4_OUT_DIR };
  process.env.C4_MANIFEST = w.manifest; process.env.C4_LEDGER = w.ledger; process.env.C4_OUT_DIR = w.out;
  try { return await fn(); } finally {
    for (const [k, v] of [["C4_MANIFEST", old.m], ["C4_LEDGER", old.l], ["C4_OUT_DIR", old.o]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}
const cli = (w, args) => spawnSync(process.execPath, [C4, ...args], { env: env(w), encoding: "utf8" });

test("A8 (6a) TEST refuses --limit as well as --offset (a sample read would spend the one run) and records nothing", async () => {
  const w = toyWorld();
  try {
    await withEnv(w, async () => {
      const r = await measure({ language: "python", split: "test", limit: 2 });
      assert.equal(r.refused, true);
      assert.equal(r.verdict_label, "REFUSED");
      assert.ok(r.gaps[0].reason.startsWith("limit_not_allowed_on_test"), JSON.stringify(r.gaps));
      assert.equal(fs.existsSync(w.ledger), false, "a refusal does not touch the ledger");
    });
  } finally { fs.rmSync(w.dir, { recursive: true, force: true }); }
});

test("A8 (6) an unreadable ledger is a refusal, never 'TEST is unspent'", async () => {
  const w = toyWorld();
  try {
    fs.writeFileSync(w.ledger, "{not json");
    await withEnv(w, async () => {
      const r = await measure({ language: "python", split: "test" });
      assert.equal(r.refused, true);
      assert.ok(r.gaps[0].reason.startsWith("ledger_unreadable"), JSON.stringify(r.gaps));
    });
    assert.equal(fs.readFileSync(w.ledger, "utf8"), "{not json");
  } finally { fs.rmSync(w.dir, { recursive: true, force: true }); }
});

test("A8 (6b) the ledger is CLAIMED before any test file is read: a crash on the first read still counts as consumption", { skip: !GOLD_OK }, async () => {
  const w = toyWorld({ missing: true }); // the manifest lists paths that do not exist: reading them throws
  try {
    await withEnv(w, async () => {
      const r = await measure({ language: "python", split: "test" });
      assert.equal(r.pass, null);
      assert.ok(r.gaps.some((g) => String(g.reason).startsWith("unmeasured")), JSON.stringify(r.gaps));
      assert.ok(r.gaps.some((g) => g.reason === "test_split_consumed_by_failed_run"), JSON.stringify(r.gaps));
      const led = JSON.parse(fs.readFileSync(w.ledger, "utf8"));
      assert.equal(led["c4:python"].status, "failed");
      const again = await measure({ language: "python", split: "test" });
      assert.equal(again.refused, true);
      assert.ok(again.gaps.some((g) => g.reason === "test_split_already_consumed"), JSON.stringify(again.gaps));
    });
  } finally { fs.rmSync(w.dir, { recursive: true, force: true }); }
});

test("A8 (6) a completed TEST run settles the ledger; a programmatic retest is LOGGED (ledger retests[], result.retest, a note), never silent", { skip: !GOLD_OK }, async () => {
  const w = toyWorld();
  try {
    await withEnv(w, async () => {
      const r = await measure({ language: "python", split: "test", ...FAST });
      assert.ok(!r.refused && r.n === 3, JSON.stringify(r.gaps));
      assert.equal(r.development, false);
      assert.equal(r.pass, null); // 3 files: not measurable, never a pass
      assert.equal(r.verdict_label, "UNMEASURED");
      let led = JSON.parse(fs.readFileSync(w.ledger, "utf8"));
      assert.equal(led["c4:python"].status, "completed");
      assert.equal(led["c4:python"].files, 3);
      const refused = await measure({ language: "python", split: "test", ...FAST });
      assert.equal(refused.refused, true);
      const re = await measure({ language: "python", split: "test", allowRetest: true, ...FAST });
      assert.equal(re.retest, true);
      assert.ok(re.notes.some((n) => n.startsWith("RETEST")), JSON.stringify(re.notes));
      led = JSON.parse(fs.readFileSync(w.ledger, "utf8"));
      assert.equal(led["c4:python"].retests.length, 1);
      assert.equal(led["c4:python"].retests[0].status, "completed");
      assert.equal(led["c4:python"].status, "completed", "the original consumption stands");
    });
  } finally { fs.rmSync(w.dir, { recursive: true, force: true }); }
});

test("A8 (6) CLI: a refused second test run never overwrites the card; --allow-retest does not exist; --limit on test is refused", { skip: !GOLD_OK }, () => {
  const w = toyWorld();
  try {
    const first = cli(w, ["--language", "python", "--split", "test"]);
    assert.equal(first.status, 0, first.stderr);
    const card = path.join(w.out, "c4-python-test.json");
    assert.ok(fs.existsSync(card));
    const before = fs.readFileSync(card, "utf8");
    assert.equal(JSON.parse(before).split, "test");
    assert.notEqual(JSON.parse(before).refused, true);
    const second = cli(w, ["--language", "python", "--split", "test"]);
    assert.equal(second.status, 0);
    assert.equal(JSON.parse(second.stdout.trim()).refused, true);
    assert.equal(fs.readFileSync(card, "utf8"), before, "the card is byte for byte what the one real run wrote");
    const refusedFile = path.join(w.out, "c4-python-test-refused.json");
    assert.ok(fs.existsSync(refusedFile));
    assert.ok(JSON.parse(fs.readFileSync(refusedFile, "utf8")).gaps.some((g) => g.reason === "test_split_already_consumed"));
    const ledgerBefore = fs.readFileSync(w.ledger, "utf8");
    const retest = cli(w, ["--language", "python", "--split", "test", "--allow-retest"]);
    assert.equal(retest.status, 2);
    assert.match(retest.stderr, /--allow-retest does not exist/);
    assert.equal(fs.readFileSync(w.ledger, "utf8"), ledgerBefore);
    assert.equal(fs.readFileSync(card, "utf8"), before);
    // a fresh ledger: --limit on test is refused and neither spends TEST nor writes a card
    const w2 = toyWorld();
    try {
      const lim = cli(w2, ["--language", "python", "--split", "test", "--limit", "1"]);
      assert.equal(JSON.parse(lim.stdout.trim()).refused, true);
      assert.equal(fs.existsSync(w2.ledger), false);
      assert.equal(fs.existsSync(path.join(w2.out, "c4-python-test.json")), false);
      assert.ok(fs.existsSync(path.join(w2.out, "c4-python-test-refused.json")));
    } finally { fs.rmSync(w2.dir, { recursive: true, force: true }); }
  } finally { fs.rmSync(w.dir, { recursive: true, force: true }); }
});

test("A8 (6e) a test card already on disk is consumption even when the /private/tmp ledger was wiped; the CLI refuses and the card survives", { skip: !GOLD_OK }, () => {
  const w = toyWorld();
  try {
    fs.mkdirSync(w.out, { recursive: true });
    const card = path.join(w.out, "c4-python-test.json");
    fs.writeFileSync(card, "SENTINEL");
    const r = cli(w, ["--language", "python", "--split", "test"]);
    assert.equal(r.status, 0, r.stderr);
    const res = JSON.parse(r.stdout.trim());
    assert.equal(res.refused, true);
    assert.ok(res.gaps.some((g) => g.reason === "test_split_already_consumed"));
    assert.equal(fs.readFileSync(card, "utf8"), "SENTINEL");
    assert.equal(fs.existsSync(w.ledger), false, "a refusal records nothing");
  } finally { fs.rmSync(w.dir, { recursive: true, force: true }); }
});

test("A8 (6) writeResult: the TEST card is created with wx and never replaced (the result goes to a -dup file); a refusal never takes the card's name", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c4-write-"));
  try {
    const out = path.join(dir, "o");
    const a = writeResult(out, "c4-python-test", { id: "C4", split: "test", n: 1 }, "test");
    assert.equal(a.kind, "card");
    const card = path.join(out, "c4-python-test.json");
    const first = fs.readFileSync(card, "utf8");
    const b = writeResult(out, "c4-python-test", { id: "C4", split: "test", n: 2 }, "test");
    assert.equal(b.kind, "dup");
    assert.match(path.basename(b.path), /^c4-python-test-dup-\d+\.json$/);
    assert.equal(fs.readFileSync(card, "utf8"), first, "the card is untouched");
    assert.equal(JSON.parse(fs.readFileSync(b.path, "utf8")).n, 2);
    const r = writeResult(out, "c4-python-test", { refused: true, gaps: [] }, "test");
    assert.equal(r.kind, "refused");
    assert.equal(path.basename(r.path), "c4-python-test-refused.json");
    assert.equal(fs.readFileSync(card, "utf8"), first);
    // dev results are overwritten in place, as they always were
    writeResult(out, "c4-python-dev", { n: 1 }, "dev");
    writeResult(out, "c4-python-dev", { n: 2 }, "dev");
    assert.equal(JSON.parse(fs.readFileSync(path.join(out, "c4-python-dev.json"), "utf8")).n, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── reader exceptions are typed gaps; dev results are flagged; the unseen-repo probe (real DEV/TRAIN data, skipped if absent) ──
test("A8 (i) a reader exception is a typed reader_error gap with its denominator and fails the language; the file stays scored", { skip: !fs.existsSync(MANIFEST) || !GOLD_OK }, async () => {
  let k = 0;
  const boom = { calls: [], imports: [], extends: [], declared: [], consumed: 0, disclosure: { error: "reader error: injected for the test" } };
  const r = await measure({ language: "python", split: "dev", limit: 40, ...FAST, _readEdges: (o) => (k++ === 0 ? boom : readEdges(o)) });
  assert.ok(r.n >= 20, `n ${r.n}`);
  assert.equal(r.details.reader_errors.count, 1);
  assert.equal(r.details.reader_errors.of, r.n);
  const g = r.gaps.find((x) => x.reason === "reader_error");
  assert.ok(g && g.count === 1 && g.of === r.n, JSON.stringify(r.gaps));
  assert.equal(r.pass, false);
  assert.ok(r.notes.some((n) => n.startsWith("reader errors: 1 of")), JSON.stringify(r.notes));
});

test("A8 dev smoke: a DEV result is development:true (never a competence PASS), names its authority, and C/Go/Java say they have no second authority", { skip: !fs.existsSync(MANIFEST) || !GOLD_OK }, async () => {
  const c = await measure({ language: "c", split: "dev", limit: 12, ...FAST });
  assert.equal(c.development, true);
  assert.equal(c.provenance.second_authority, null);
  assert.match(c.provenance.second_authority_gap, /tree-sitter is the only authority/);
  assert.ok(c.notes.some((n) => /development figure/.test(n)));
  assert.ok(["UNMEASURED", "PASS-DEV", "FAIL-DEV"].includes(c.verdict_label));
});

test("A8 (5) the standing unseen-repository probe scores the TRAIN split beside DEV and never gates", { skip: !fs.existsSync(MANIFEST) || !GOLD_OK }, async () => {
  const { result, probeFull } = await measureWithProbe({ language: "python", split: "dev", limit: 12, ...FAST });
  const p = result.details.unseen_repo_probe;
  assert.equal(p.split, "train");
  assert.equal(probeFull.split, "train");
  assert.equal(probeFull.development, true);
  assert.ok(p.files > 0 && p.files <= CONST.PROBE_LIMIT);
  assert.ok(p.kinds.calls && "naive_f1" in p.kinds.calls && p.kinds.calls.catastrophic);
  assert.match(p.role, /never gating/);
  assert.equal(p.contamination, null, "only C carries the contamination note");
  assert.equal(result.pass, null, "12 dev files: still not measurable; the probe did not change the dev verdict");
  const c = summarizeProbe({ language: "c", split: "train", n: 1, pass: true, verdict_label: "PASS-TRAIN", details: { repos: ["a"] }, gaps: [] });
  assert.match(c.contamination, /Python_ceval\.c/);
});
