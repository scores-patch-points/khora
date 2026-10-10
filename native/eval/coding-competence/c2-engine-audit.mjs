// c2-engine-audit.mjs : an independent check of the KEYWORD REFUSAL (tier T1) of the C2 reader, by the language's OWN ENGINE.
//
// Not part of the C2 pass rule (c2-names.mjs header, "ENGINE AUDIT"). The gold of C2 is a tree-sitter definition-name node, which
// knows tags-level definitions only. The claim behind T1 is stronger: "a hard keyword can never name a being". Whether that is
// true is a fact of the language's own law, so it is asked of the engine that enforces the law: for each word the received
// CodeKeywordPrior@1 refuses, does CPython / node / ruby / clang ACCEPT a declaration that names a being with that word?
//   python      def W(): pass                | class W: pass
//   javascript  function W(){}               | class W{}            | member form  class A{ W(){} }
//   ruby        def W; end  (method form)    | (class form needs a Constant: lowercase words cannot, reported as such)
//   c           int W(void){return 0;}       | struct W {int x;};
//   java, go    no engine here (javac is a macOS shim without a Java Runtime; no go toolchain): a TYPED GAP, never a pass.
// It also asks the engine about the TRAIN-settled words, to find hard keywords the received prior MISSED (for example C `int`,
// `void`, `char`): words the engine rejects as a declaration name that the keyword prior does not refuse. Settled words the
// engine ACCEPTS are legal names that the TRAIN statistics settle as non-names in practice: T2 is a statistical refusal, not law.
// No model is used. Results are facts about the installed engine versions, recorded in the output.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

const PY = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";

function runLines(cmd, args, input) {
  const r = spawnSync(cmd, args, { input, encoding: "utf8", maxBuffer: 1 << 24, timeout: 120000 });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function version(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 20000 });
  return ((r.stdout || "") + (r.stderr || "")).trim().split("\n")[0] || null;
}

// each tester: (words) -> { form: Set(acceptedWords) }
function testPython(words) {
  const script = `
import sys, json, ast
words = json.load(sys.stdin)
def ok(src):
    try:
        ast.parse(src); return True
    except SyntaxError:
        return False
    except Exception:
        return False
out = {"def": [w for w in words if ok("def %s(): pass" % w)], "class": [w for w in words if ok("class %s: pass" % w)]}
print(json.dumps(out))
`;
  const r = runLines(PY, ["-c", script], JSON.stringify(words));
  if (!r.ok) throw new Error("python audit failed: " + r.err.slice(0, 200));
  const o = JSON.parse(r.out);
  return { function: new Set(o.def), class: new Set(o.class) };
}
function testJs(words) {
  const accepts = (src) => { try { new vm.Script(src); return true; } catch { return false; } };
  const out = { function: new Set(), class: new Set(), member: new Set(), variable: new Set() };
  for (const w of words) {
    if (accepts(`function ${w}(){}`)) out.function.add(w);
    if (accepts(`class ${w}{}`)) out.class.add(w);
    if (accepts(`class A{ ${w}(){} }`)) out.member.add(w);
    if (accepts(`var ${w}=1`)) out.variable.add(w);
  }
  return out;
}
function testRuby(words) {
  const script = `
require 'json'
words = JSON.parse(STDIN.read)
def ok(src)
  RubyVM::InstructionSequence.compile(src)
  true
rescue SyntaxError, StandardError
  false
end
out = { "def" => words.select { |w| ok("def #{w}; end") }, "class" => words.select { |w| ok("class #{w}; end") } }
puts JSON.generate(out)
`;
  const r = runLines("ruby", ["-e", script], JSON.stringify(words));
  if (!r.ok) throw new Error("ruby audit failed: " + r.err.slice(0, 200));
  const o = JSON.parse(r.out);
  return { function: new Set(o.def), class: new Set(o.class) };
}
function testC(words) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c2-cc-"));
  const out = { function: new Set(), class: new Set() };
  const compiles = (src) => {
    const f = path.join(dir, "t.c");
    fs.writeFileSync(f, src);
    const r = spawnSync("clang", ["-fsyntax-only", "-w", "-x", "c", f], { encoding: "utf8", timeout: 20000 });
    return r.status === 0;
  };
  for (const w of words) {
    if (compiles(`int ${w}(void){return 0;}\n`)) out.function.add(w);
    if (compiles(`struct ${w} {int x;};\n`)) out.class.add(w);
  }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temp dir */ }
  return out;
}

const ENGINES = {
  python: { name: () => `CPython ${version(PY, ["--version"])}`, test: testPython, forms: ["function (def)", "class"], std: null },
  javascript: { name: () => `node ${process.version} (V8 vm.Script, sloppy script)`, test: testJs, forms: ["function declaration", "class declaration", "member (class A{ W(){} })", "var"], std: null },
  ruby: { name: () => version("ruby", ["--version"]), test: testRuby, forms: ["method (def W; end)", "class (needs a Constant)"], std: null },
  c: { name: () => `${version("clang", ["--version"])} (default gnu17)`, test: testC, forms: ["function definition", "struct tag"], std: "gnu17: C23 keywords (constexpr, nullptr, alignas, thread_local, noreturn) are not reserved here" },
};

/**
 * auditRefusedWords(language, keywordWords, { settledWords }) -> {
 *   available, engine?, reason?, tested, acceptedAs:{form:[words]}, lawPrecision:{form: share of tested words the engine REJECTS},
 *   missedByPrior:{tested, rejectedAsFunctionName:[words the engine rejects but the keyword prior does not refuse]} }
 */
export async function auditRefusedWords(language, keywordWords, { settledWords = [] } = {}) {
  const eng = ENGINES[language];
  if (!eng) {
    const reason = language === "java" ? "no engine: javac is a macOS shim with no Java Runtime installed" : language === "go" ? "no engine: no go toolchain on this machine" : `no engine adapter for ${language}`;
    return { available: false, reason, tested: 0, note: "typed gap: the refusal of this language's keywords is measured against gold only" };
  }
  try {
    const words = [...new Set(keywordWords)].sort();
    const acc = eng.test(words);
    const tested = words.length;
    const acceptedAs = Object.fromEntries(Object.entries(acc).map(([k, s]) => [k, [...s].sort()]));
    const lawPrecision = Object.fromEntries(Object.entries(acc).map(([k, s]) => [k, tested ? Number((1 - s.size / tested).toFixed(4)) : null]));
    const kw = new Set(words);
    const extra = [...new Set(settledWords)].filter((w) => !kw.has(w) && /^[A-Za-z_]\w*$/.test(w)).sort();
    const accExtra = extra.length ? eng.test(extra) : { function: new Set() };
    const rejectedByEngine = extra.filter((w) => !accExtra.function.has(w));
    return {
      available: true, engine: eng.name(), forms: eng.forms, std: eng.std, tested, acceptedAs, lawPrecision,
      // the two names the summary prints
      acceptedAsFunctionName: acceptedAs.function ?? [],
      acceptedAsMemberName: acceptedAs.member ?? null,
      missedByPrior: { tested: extra.length, rejectedAsFunctionName: rejectedByEngine, note: "TRAIN-settled words the engine rejects as a function name that the received keyword prior does not refuse: hard keywords the giver missed" },
      note: "an engine-ACCEPTED keyword is a word the prior refuses although the language lets it name a being in that form; lawPrecision is the share of the prior's words the engine rejects in each form",
    };
  } catch (e) {
    return { available: false, reason: `engine run failed: ${String(e?.message ?? e).slice(0, 200)}`, tested: 0 };
  }
}
