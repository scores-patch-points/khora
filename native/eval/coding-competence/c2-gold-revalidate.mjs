// c2-gold-revalidate.mjs : re-validate the C2 gold on an INDEPENDENT ENGINE, on files that are not TEST files (amendment A8).
//
// WHY. The gold (gold.py, tree-sitter queries plus authored top-ups) was corrected while looking at smoke files that include
// TEST-split repositories (c2-names.mjs A8). TEST is therefore not blind with respect to the gold. This script does not repair
// that; it measures how far the gold's definition names agree with an authority that was never tuned against them, on a fixed
// DEV sample, so the card can carry a number instead of a hope.
//
// PRE-REGISTRATION (written before the first run; never tuned after it):
//   AUTHORITIES (independent of tree-sitter): python  -> the `ast` module of the venv's CPython (FunctionDef, AsyncFunctionDef,
//   ClassDef); ruby -> `Ripper.sexp` of the local ruby (:def, :defs, :class, :module). javascript, c, go, java have no independent
//   engine on this machine (node exposes no parser, gcc/clang need the project's include paths, there is no go toolchain, javac is
//   a shim without a JRE): TYPED GAP, never a pass.
//   SAMPLE. selectFiles(manifest DEV rows, N=80) per language (deterministic: sha256 order inside each repository, repositories
//   round-robin). TRAIN and TEST rows are never read. A file the engine cannot parse is excluded and counted.
//   COMPARISON. Per file, the multiset of (line, name) of gold CORE definitions (function, method, class, module) against the
//   multiset of (line, name) of the engine's definitions; for ruby a `Foo::Bar` class name is compared by its last segment.
//   STATISTIC. precision = |gold and engine| / |gold|, recall = |gold and engine| / |engine|, F1.
//   PREDICTION. python agreement F1 >= 0.97 (the authored fixtures matched 169/170 fields and python's tags are the best-attested
//   grammar); ruby F1 >= 0.90 (singleton methods, `class << self` and heredocs are where tree-sitter and Ripper differ).
//   DECISION. Reported as run. A language below 0.97 / 0.90 is reported as a FAILED re-validation, and every C2 card for it then
//   carries the number next to the caveat (details.gold). gold.py is FROZEN (A8): this script reports, it never edits.
//   CONTROL BUILT TO FAIL. The same comparison with the engine's lines shifted by one (a derangement that keeps every name) must
//   score far below the real comparison; if it does not, the comparison is not measuring agreement and the run is voided.
//
// No model is called. node eval/coding-competence/c2-gold-revalidate.mjs [--n 80]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { goldAvailable, goldBatch, isCoreKind, PYTHON } from "./gold.mjs";
import { loadManifest, selectFiles, OUT_DIR } from "./c2-lib.mjs";

/** pure: compare two arrays of {line, name} as multisets of `line:name`. shiftEngine derives the control built to fail. */
export function compareDefs(goldDefs, engineDefs, { shiftEngine = 0 } = {}) {
  const key = (d, shift = 0) => `${d.line + shift}:${d.name}`;
  const bag = new Map();
  for (const e of engineDefs) bag.set(key(e, shiftEngine), (bag.get(key(e, shiftEngine)) ?? 0) + 1);
  let matched = 0;
  const goldOnly = [];
  for (const g of goldDefs) {
    const k = key(g);
    const n = bag.get(k) ?? 0;
    if (n > 0) { matched++; bag.set(k, n - 1); } else goldOnly.push(g);
  }
  const engineOnly = [];
  for (const [k, n] of bag) for (let i = 0; i < n; i++) { const [line, ...rest] = k.split(":"); engineOnly.push({ line: Number(line), name: rest.join(":") }); }
  const precision = goldDefs.length ? matched / goldDefs.length : null;
  const recall = engineDefs.length ? matched / engineDefs.length : null;
  const f1 = precision != null && recall != null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : precision === null && recall === null ? null : 0;
  return { gold: goldDefs.length, engine: engineDefs.length, matched, precision, recall, f1, goldOnly, engineOnly };
}

const lineOf = (text, pos) => { let n = 1; for (let i = 0; i < pos; i++) if (text.charCodeAt(i) === 10) n++; return n; };

const PY_ENGINE = String.raw`
import ast, json, sys
out = {}
for p in json.load(sys.stdin):
    try:
        src = open(p, encoding="utf-8", errors="replace").read()
        tree = ast.parse(src)
    except Exception as e:
        out[p] = {"ok": False, "err": type(e).__name__}
        continue
    defs = []
    for n in ast.walk(tree):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
            defs.append({"line": n.lineno, "name": n.name, "kind": "function"})
        elif isinstance(n, ast.ClassDef):
            defs.append({"line": n.lineno, "name": n.name, "kind": "class"})
    out[p] = {"ok": True, "defs": defs}
print(json.dumps(out))
`;

const RB_ENGINE = String.raw`
require "ripper"; require "json"
def walk(n, acc)
  return unless n.is_a?(Array)
  case n[0]
  when :def
    id = n[1]; acc << {"line" => id[2][0], "name" => id[1], "kind" => "method"} if id.is_a?(Array) && id[2].is_a?(Array)
  when :defs
    id = n[3]; acc << {"line" => id[2][0], "name" => id[1], "kind" => "method"} if id.is_a?(Array) && id[2].is_a?(Array)
  when :class, :module
    ref = n[1]
    tok = nil
    if ref.is_a?(Array)
      if ref[0] == :const_ref then tok = ref[1]
      elsif ref[0] == :const_path_ref then tok = ref[2]
      elsif ref[0] == :top_const_ref then tok = ref[1]
      end
    end
    acc << {"line" => tok[2][0], "name" => tok[1], "kind" => n[0].to_s} if tok.is_a?(Array) && tok[2].is_a?(Array)
  end
  n.each { |c| walk(c, acc) if c.is_a?(Array) }
end
out = {}
JSON.parse($stdin.read).each do |p|
  begin
    src = File.read(p, encoding: "UTF-8").scrub
    sx = Ripper.sexp(src)
    if sx.nil? then out[p] = {"ok" => false, "err" => "syntax"}; next end
    acc = []; walk(sx, acc); out[p] = {"ok" => true, "defs" => acc}
  rescue => e
    out[p] = {"ok" => false, "err" => e.class.to_s}
  end
end
puts JSON.generate(out)
`;

function runEngine(language, paths) {
  if (language === "python") return spawnSync(PYTHON, ["-c", PY_ENGINE], { input: JSON.stringify(paths), encoding: "utf8", maxBuffer: 1 << 28, timeout: 300000 });
  return spawnSync("ruby", ["-e", RB_ENGINE], { input: JSON.stringify(paths), encoding: "utf8", maxBuffer: 1 << 28, timeout: 300000 });
}

const NO_ENGINE = {
  javascript: "node exposes no parser; no independent JS parser installed (typed gap)",
  c: "gcc/clang need the project's include paths for a faithful AST; not attempted (typed gap)",
  go: "no go toolchain on this machine (typed gap)",
  java: "javac is a macOS shim with no Java Runtime installed (typed gap)",
};

export async function revalidate({ n = 80 } = {}) {
  const out = { id: "c2-gold-revalidation", amendment: "A8", generated: new Date().toISOString(), sampleSize: n, sampleSplit: "dev", testFilesRead: 0, languages: {}, gaps: [] };
  const av = goldAvailable();
  if (!av.available) { out.gaps.push({ reason: "gold-unavailable", why: av.reason }); return out; }
  const manifest = loadManifest();
  for (const lang of ["python", "ruby"]) {
    const rows = selectFiles(manifest.languages[lang]?.dev ?? [], n);
    const items = rows.map((r) => ({ language: lang, text: fs.readFileSync(r.path, "utf8"), fileName: path.basename(r.path) }));
    const golds = await goldBatch(items);
    const eng = runEngine(lang, rows.map((r) => r.path));
    if (eng.status !== 0) { out.languages[lang] = { gap: `engine failed: ${(eng.stderr || "").slice(0, 200)}` }; continue; }
    const res = JSON.parse(eng.stdout);
    const acc = { gold: 0, engine: 0, matched: 0, ctrlMatched: 0 };
    const excluded = { engine_error: 0, gold_error: 0 };
    const disagreements = [];
    const perRepo = {};
    rows.forEach((r, k) => {
      const e = res[r.path];
      const g = golds[k];
      if (!e?.ok) { excluded.engine_error++; return; }
      if (g.error) { excluded.gold_error++; return; }
      const text = items[k].text;
      const lastSeg = (nm) => nm.split("::").pop();
      const gd = (g.defs ?? []).filter((d) => isCoreKind(d.kind)).map((d) => ({ line: lineOf(text, d.nameStart), name: lang === "ruby" ? lastSeg(d.name ?? text.slice(d.nameStart, d.nameEnd)) : (d.name ?? text.slice(d.nameStart, d.nameEnd)) }));
      const ed = e.defs.map((d) => ({ line: d.line, name: d.name }));
      const c = compareDefs(gd, ed);
      const ctrl = compareDefs(gd, ed, { shiftEngine: 1 });
      acc.gold += c.gold; acc.engine += c.engine; acc.matched += c.matched; acc.ctrlMatched += ctrl.matched;
      const pr = (perRepo[r.repo] ??= { files: 0, gold: 0, engine: 0, matched: 0 });
      pr.files++; pr.gold += c.gold; pr.engine += c.engine; pr.matched += c.matched;
      for (const d of c.goldOnly.slice(0, 2)) if (disagreements.length < 20) disagreements.push({ file: path.basename(r.path), repo: r.repo, side: "gold-only", ...d });
      for (const d of c.engineOnly.slice(0, 2)) if (disagreements.length < 20) disagreements.push({ file: path.basename(r.path), repo: r.repo, side: "engine-only", ...d });
    });
    const precision = acc.gold ? acc.matched / acc.gold : null, recall = acc.engine ? acc.matched / acc.engine : null;
    const f1 = precision != null && recall != null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
    const cp = acc.gold ? acc.ctrlMatched / acc.gold : null, cr = acc.engine ? acc.ctrlMatched / acc.engine : null;
    const cf1 = cp != null && cr != null && cp + cr > 0 ? (2 * cp * cr) / (cp + cr) : 0;
    const threshold = lang === "python" ? 0.97 : 0.90;
    const controlMoves = f1 != null && cf1 <= 0.5 * f1;
    out.languages[lang] = {
      authority: lang === "python" ? "CPython ast (venv python)" : "ruby Ripper.sexp", files: { requested: rows.length, used: rows.length - excluded.engine_error - excluded.gold_error, excluded },
      goldCoreDefs: acc.gold, engineDefs: acc.engine, matched: acc.matched, precision, recall, f1, predicted: `F1 >= ${threshold}`, held: f1 != null ? f1 >= threshold : null,
      controlShiftedLines: { f1: cf1, licenceMoves: controlMoves, note: "engine lines shifted by one: must score <= 0.5 * real, else the comparison does not measure agreement and the run is voided" },
      voided: !controlMoves, perRepo, sampleDisagreements: disagreements,
    };
  }
  for (const [l, why] of Object.entries(NO_ENGINE)) { out.languages[l] = { gap: why }; out.gaps.push({ reason: `no independent engine for ${l}`, why }); }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--n");
  const n = i >= 0 ? Number(process.argv[i + 1]) : 80;
  const r = await revalidate({ n });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "c2-gold-revalidation.json"), JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r, null, 1));
}
