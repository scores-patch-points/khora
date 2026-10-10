// validate.mjs: VALIDATE the AUTHORED C5 suite (c5-tasks/<split>/<language>.c5) and write c5-tasks/MANIFEST.json.
//
//   node eval/coding-competence/c5-tasks/validate.mjs [--split dev] [--language a,b,c] [--keep]
//
// What it does, per program (12 tasks x each authored language):
//   1. sha256 of the program text (c5-agree.mjs `vouch` refuses a program whose text changed after validation);
//   2. EXECUTE it when a local toolchain exists (python, javascript and typescript through node, ruby, c through gcc
//      -std=c11, java through the keg-only OpenJDK) and compare stdout with the task's canonical output (trailing
//      whitespace ignored); the program is KEPT only if they are equal;
//   3. PARSE it with tree-sitter (gold.mjs; parse metadata only) and require zero ERROR / MISSING nodes;
//   4. languages with NO toolchain here (go, rust) carry executed:false and are validated by parse alone.
// It runs NO khora reader and computes NO agreement score. The authoring discipline of c5-agree.mjs applies: a program
// is edited after a validation only to make it parse, to make it print the canonical output, or to repair a slip against
// the task spec, and every such edit is logged in the AMENDMENTS of c5-agree.mjs.
//
// The suite is AUTHORED (model-written, label authored): it is never held-out natural data.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseBundle, TASKS, programFileName, sha256, TASK_DIR, authoredLanguages } from "../c5-agree.mjs";
import { goldBatch, goldAvailable } from "../gold.mjs";

const JAVA_HOME = process.env.C5_JAVA_HOME || "/opt/homebrew/opt/openjdk";
const RUN_DIR = process.env.C5_RUN_DIR || path.join(os.tmpdir(), "c5-run");
const TIMEOUT_MS = 60000;

const norm = (s) => String(s ?? "").split(/\r?\n/).map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\s+$/, "");
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: 1 << 24, ...opts });
const firstLine = (r) => String((r.stdout || "") + (r.stderr || "")).trim().split("\n")[0] ?? "";

/** language -> { probe: [cmd,args] version probe, ext, build?(dir, file) -> [cmd,args], run(dir, file) -> [cmd,args] } */
const TOOLCHAIN = {
  python: { cmd: "python3", probe: ["python3", ["--version"]], file: "prog.py", run: (d, f) => ["python3", [f]] },
  javascript: { cmd: "node", probe: ["node", ["--version"]], file: "prog.js", run: (d, f) => ["node", [f]] },
  typescript: { cmd: "node (type stripping)", probe: ["node", ["--version"]], file: "prog.ts", run: (d, f) => ["node", [f]] },
  ruby: { cmd: "ruby", probe: ["ruby", ["--version"]], file: "prog.rb", run: (d, f) => ["ruby", [f]] },
  c: { cmd: "gcc -std=c11", probe: ["gcc", ["--version"]], file: "prog.c", build: (d, f) => ["gcc", ["-std=c11", "-Wall", "-Wextra", "-o", path.join(d, "prog"), f]], run: (d) => [path.join(d, "prog"), []] },
  java: { cmd: `${JAVA_HOME}/bin/javac + java`, probe: [`${JAVA_HOME}/bin/javac`, ["-version"]], file: "Main.java", build: (d, f) => [`${JAVA_HOME}/bin/javac`, ["-d", d, f]], run: (d) => [`${JAVA_HOME}/bin/java`, ["-cp", d, "Main"]] },
};
const NO_TOOLCHAIN = { go: "no go toolchain on this machine (go not on PATH, not in /opt/homebrew)", rust: "no rustc/cargo on this machine" };

function probeToolchains() {
  const out = {};
  for (const [lang, t] of Object.entries(TOOLCHAIN)) {
    const [c, a] = t.probe;
    const r = sh(c, a);
    out[lang] = r.status === 0 ? { available: true, command: t.cmd, version: firstLine(r) } : { available: false, command: t.cmd, reason: firstLine(r) || String(r.error?.message ?? "not runnable") };
  }
  return out;
}

function execute(language, task, text, tc) {
  const T = TOOLCHAIN[language];
  const dir = path.join(RUN_DIR, language, task);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, T.file);
  fs.writeFileSync(file, text);
  const log = {};
  if (T.build) {
    const [c, a] = T.build(dir, file);
    const b = sh(c, a, { cwd: dir });
    log.build_status = b.status;
    if (b.status !== 0) return { ok: false, why: "build_failed", log: { ...log, stderr: String(b.stderr).slice(0, 600) } };
    if (String(b.stderr).trim()) log.build_warnings = String(b.stderr).trim().split("\n").length;
  }
  const [c, a] = T.run(dir, file);
  const r = sh(c, a, { cwd: dir });
  log.exit = r.status;
  if (r.status !== 0) return { ok: false, why: r.error?.code === "ETIMEDOUT" ? "timeout" : "nonzero_exit", log: { ...log, stderr: String(r.stderr).slice(0, 600) } };
  return { ok: true, stdout: r.stdout, stderr: String(r.stderr).trim(), log };
}

export async function validate({ split = "dev", languages = null } = {}) {
  const t0 = Date.now();
  const have = authoredLanguages(split).filter((l) => !languages || languages.includes(l));
  const tcs = probeToolchains();
  const programs = {};
  const summary = {};
  const gold = goldAvailable();
  if (!gold.available) throw new Error(`tree-sitter parse validation needs gold: ${gold.reason}`);
  const items = [];
  const meta = [];
  for (const language of have) {
    const bundle = parseBundle(fs.readFileSync(path.join(TASK_DIR, split, `${language}.c5`), "utf8"));
    programs[language] = {};
    summary[language] = { authored: 0, missing: [], executed: 0, output_ok: 0, output_bad: [], parse_ok: 0, parse_bad: [], kept: 0, toolchain: tcs[language]?.available ? tcs[language].command : (NO_TOOLCHAIN[language] ?? "none") };
    for (const T of TASKS) {
      const text = bundle.get(T.id);
      if (text === undefined) { summary[language].missing.push(T.id); continue; }
      summary[language].authored += 1;
      const e = { sha256: sha256(text), bytes: Buffer.byteLength(text), executed: false, output_ok: null, parse: { ok: null } };
      if (tcs[language]?.available) {
        const x = execute(language, T.id, text, tcs[language]);
        e.executed = x.ok || x.why !== "toolchain_absent";
        if (!x.ok) { e.output_ok = false; e.exec_failure = x.why; e.exec_log = x.log; }
        else {
          e.output_ok = norm(x.stdout) === norm(T.out);
          if (!e.output_ok) e.output_got = norm(x.stdout).slice(0, 300);
          if (x.stderr) e.stderr = x.stderr.slice(0, 200);
          if (x.log.build_warnings) e.build_warnings = x.log.build_warnings;
        }
      }
      programs[language][T.id] = e;
      items.push({ language, text, fileName: programFileName(language, T.id) });
      meta.push({ language, task: T.id });
    }
  }
  const res = await goldBatch(items, { chunk: 60 });
  res.forEach((g, i) => {
    const { language, task } = meta[i];
    const e = programs[language][task];
    if (!g || g.error) e.parse = { ok: false, error: String(g?.error ?? "gold returned nothing").slice(0, 200) };
    else e.parse = { ok: !g.parse.has_error && g.parse.error_nodes === 0 && g.parse.missing_nodes === 0, error_nodes: g.parse.error_nodes, missing_nodes: g.parse.missing_nodes, error_bytes_frac: g.parse.error_bytes_frac };
  });
  for (const language of have) {
    const s = summary[language];
    for (const [task, e] of Object.entries(programs[language])) {
      if (e.executed) s.executed += 1;
      if (e.executed && e.output_ok) s.output_ok += 1;
      if (e.executed && !e.output_ok) s.output_bad.push(task);
      if (e.parse.ok) s.parse_ok += 1; else s.parse_bad.push(task);
      if (e.parse.ok && (!e.executed || e.output_ok)) s.kept += 1;
    }
  }
  const manifest = {
    schema: "C5Manifest@1",
    label: "authored: model-written programs, never held-out natural data",
    author: "model (claude), human review pending",
    split,
    validated_at: new Date().toISOString(),
    task_ids: TASKS.map((t) => t.id),
    toolchains: { executed_with: tcs, no_toolchain: NO_TOOLCHAIN },
    gold: { grammar_pack: gold.versions ?? null, gold_version: gold.goldVersion ?? null },
    summary,
    programs,
  };
  return { manifest, seconds: (Date.now() - t0) / 1000 };
}

async function main(argv) {
  const arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const split = arg("--split", "dev");
  if (split !== "dev") { console.error("only the dev bundles exist; the test bundles are reserved for another hand (c5-agree.mjs SPLITS)"); process.exit(2); }
  const languages = arg("--language") ? arg("--language").split(",") : null;
  const { manifest, seconds } = await validate({ split, languages });
  // a partial run (--language) must not drop the other languages' entries
  const file = path.join(TASK_DIR, "MANIFEST.json");
  let out = manifest;
  if (languages) {
    try {
      const old = JSON.parse(fs.readFileSync(file, "utf8"));
      out = { ...old, ...manifest, programs: { ...old.programs, ...manifest.programs }, summary: { ...old.summary, ...manifest.summary } };
    } catch { /* first run */ }
  }
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
  if (!process.argv.includes("--keep")) fs.rmSync(RUN_DIR, { recursive: true, force: true });
  console.log(JSON.stringify({ file, seconds, summary: manifest.summary }, null, 1));
  const bad = Object.values(manifest.summary).filter((s) => s.kept < s.authored || s.missing.length);
  if (bad.length) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => { console.error(e?.stack ?? e); process.exit(2); });
}
