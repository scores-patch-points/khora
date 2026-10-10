// validate-adversarial.mjs: VALIDATE the AUTHORED adversarial programs of C5 (c5-tasks/adversarial/<language>.c5) and write
// c5-tasks/adversarial/MANIFEST.json (schema C5AdversarialManifest@1). It is the adversarial twin of validate.mjs (which it does not touch).
//
//   node eval/coding-competence/c5-tasks/validate-adversarial.mjs [--language a,b,c] [--keep]
//
// Per program (ADVERSARIAL tasks of c5-agree.mjs x the languages that have a bundle and a spec):
//   1. sha256 of the program text (c5-agree.mjs `vouch` refuses a program whose text changed after validation);
//   2. EXECUTE it when a local toolchain exists (python, javascript through node, c through gcc -std=c11) and compare stdout with the
//      spec's canonical output; the program is kept only if they are equal;
//   3. PARSE it with tree-sitter (gold.mjs; parse metadata only) and require zero ERROR / MISSING nodes;
//   4. go has NO toolchain on this machine: it carries executed:false and is validated by parse alone (hand-checked for type errors,
//      which is a human check and is not recorded as execution).
// It runs NO khora reader and computes NO agreement score. The programs are AUTHORED by the model with knowledge of the reader's weak
// cases (c5-agree.mjs A5 DISCLOSURE): they are never held-out natural data.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseBundle, ADVERSARIAL, ADVERSARIAL_LANGUAGES, programFileName, sha256, TASK_DIR } from "../c5-agree.mjs";
import { goldBatch, goldAvailable } from "../gold.mjs";

const RUN_DIR = process.env.C5_RUN_DIR || path.join(os.tmpdir(), "c5-adv-run");
const TIMEOUT_MS = 60000;
const norm = (s) => String(s ?? "").split(/\r?\n/).map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\s+$/, "");
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: 1 << 24, ...opts });
const firstLine = (r) => String((r.stdout || "") + (r.stderr || "")).trim().split("\n")[0] ?? "";

const TOOLCHAIN = {
  python: { cmd: "python3", probe: ["python3", ["--version"]], file: "prog.py", run: (d, f) => ["python3", [f]] },
  javascript: { cmd: "node", probe: ["node", ["--version"]], file: "prog.js", run: (d, f) => ["node", [f]] },
  c: { cmd: "gcc -std=c11", probe: ["gcc", ["--version"]], file: "prog.c", build: (d, f) => ["gcc", ["-std=c11", "-Wall", "-Wextra", "-o", path.join(d, "prog"), f]], run: (d) => [path.join(d, "prog"), []] },
};
const NO_TOOLCHAIN = { go: "no go toolchain on this machine (go not on PATH, not in /opt/homebrew)" };

function execute(language, task, text) {
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

export async function validate({ languages = null } = {}) {
  const gold = goldAvailable();
  if (!gold.available) throw new Error(`tree-sitter parse validation needs gold: ${gold.reason}`);
  const tcs = {};
  for (const [lang, t] of Object.entries(TOOLCHAIN)) { const r = sh(t.probe[0], t.probe[1]); tcs[lang] = r.status === 0 ? { available: true, command: t.cmd, version: firstLine(r) } : { available: false, command: t.cmd, reason: firstLine(r) }; }
  const programs = {};
  const summary = {};
  const items = [];
  const meta = [];
  for (const language of ADVERSARIAL_LANGUAGES) {
    if (languages && !languages.includes(language)) continue;
    const file = path.join(TASK_DIR, "adversarial", `${language}.c5`);
    if (!fs.existsSync(file)) continue;
    const bundle = parseBundle(fs.readFileSync(file, "utf8"));
    programs[language] = {};
    summary[language] = { authored: 0, not_applicable: [], missing: [], executed: 0, output_ok: 0, output_bad: [], parse_ok: 0, parse_bad: [], kept: 0, toolchain: tcs[language]?.available ? tcs[language].command : (NO_TOOLCHAIN[language] ?? "none") };
    for (const T of ADVERSARIAL) {
      const sp = T.spec[language];
      if (!sp) continue;
      if (sp.na) { summary[language].not_applicable.push(T.id); continue; }
      const text = bundle.get(T.id);
      if (text === undefined) { summary[language].missing.push(T.id); continue; }
      summary[language].authored += 1;
      const e = { sha256: sha256(text), bytes: Buffer.byteLength(text), executed: false, output_ok: null, parse: { ok: null } };
      if (tcs[language]?.available) {
        const x = execute(language, T.id, text);
        e.executed = true;
        if (!x.ok) { e.output_ok = false; e.exec_failure = x.why; e.exec_log = x.log; }
        else {
          e.output_ok = norm(x.stdout) === norm(sp.out);
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
  for (const language of Object.keys(programs)) {
    const s = summary[language];
    for (const [task, e] of Object.entries(programs[language])) {
      if (e.executed) s.executed += 1;
      if (e.executed && e.output_ok) s.output_ok += 1;
      if (e.executed && !e.output_ok) s.output_bad.push(task);
      if (e.parse.ok) s.parse_ok += 1; else s.parse_bad.push(task);
      if (e.parse.ok && (!e.executed || e.output_ok)) s.kept += 1;
    }
  }
  return {
    schema: "C5AdversarialManifest@1",
    label: "authored: model-written ADVERSARIAL programs, written with knowledge of the reader's weak cases; never held-out natural data",
    author: "model (claude), human review pending",
    validated_at: new Date().toISOString(),
    task_ids: ADVERSARIAL.map((t) => t.id),
    toolchains: { executed_with: tcs, no_toolchain: NO_TOOLCHAIN },
    gold: { grammar_pack: gold.versions ?? null, gold_version: gold.goldVersion ?? null },
    summary,
    programs,
  };
}

async function main(argv) {
  const arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const languages = arg("--language") ? arg("--language").split(",") : null;
  const manifest = await validate({ languages });
  const file = path.join(TASK_DIR, "adversarial", "MANIFEST.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(manifest, null, 1) + "\n");
  if (!argv.includes("--keep")) fs.rmSync(RUN_DIR, { recursive: true, force: true });
  console.log(JSON.stringify({ file, summary: manifest.summary }, null, 1));
  const bad = Object.values(manifest.summary).filter((s) => s.kept < s.authored || s.missing.length);
  if (bad.length) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => { console.error(e?.stack ?? e); process.exit(2); });
}
