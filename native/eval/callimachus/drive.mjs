#!/usr/bin/env node
// drive.mjs — the Callimachus answer ladder over the-fold's 48 answerable no-model prompts. Pre-registration: PREREG.md (read it first).
//
//   node native/eval/callimachus/drive.mjs --run A [--root DIR] [--only id,id]   collect live once per prompt, then replay twice from pins
//   node native/eval/callimachus/drive.mjs --run A --replay-only                  replay from the pins already on disk (no network)
//
// Per prompt: callimachus-run.mjs --question <first turn> --ask <last turn> --search 10 (live, once, no retries), then --replay twice; the
// first replay's answers.json is the scored one and the second must match it byte for byte. Writes <root>/<run>/<id>/ and a
// drive.<run>.jsonl log beside this file. No model is called anywhere: the runner has no model path.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, appendFileSync, symlinkSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const runner = resolve(here, "../../scripts/callimachus-run.mjs");
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const run = opt("--run") ?? "A";
const root = resolve(opt("--root") ?? "/Users/mlacy/Documents/3.0/callimachus-runs/drive-eval-2026-10-14");
const only = opt("--only")?.split(",");
const replayOnly = args.includes("--replay-only");
// Amendment 1: --prompts FILE (default prompts.json), --lang/--qlang passed to the runner, and --from-run R: no collection — each prompt's
// directory is seeded from run R's pinned record (layers linked, record.json copied) and the ask is replayed over it.
const promptsFile = opt("--prompts") ?? "prompts.json";
const lang = opt("--lang"), qlang = opt("--qlang"), fromRun = opt("--from-run");
const extra = [...(lang ? ["--lang", lang] : []), ...(qlang ? ["--qlang", qlang] : [])];
const SEARCH = "10"; // PREREG: the budget of CALLIMACHUS §9, not tuned here
const { prompts } = JSON.parse(readFileSync(join(here, promptsFile), "utf8"));
const log = join(here, replayOnly ? `drive.${run}.replay.jsonl` : `drive.${run}.jsonl`);
writeFileSync(log, "");

const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const node = (argv) => {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [runner, ...argv], { encoding: "utf8", maxBuffer: 1 << 28 });
  return { code: r.status, ms: Date.now() - t0, stderr: r.stderr ?? "", stdout: r.stdout ?? "" };
};

for (const p of prompts) {
  if (only && !only.includes(p.id)) continue;
  const dir = join(root, run, p.id.replace("#", "-"));
  mkdirSync(dir, { recursive: true });
  // Over another run's record, the record keeps the question it was collected for; only the ask is new.
  const collectedFor = fromRun ? (p.en_turns ?? p.turns)[0] : p.turns[0];
  const base = ["--question", collectedFor, "--ask", p.turns.at(-1), "--out", dir, ...extra];
  const row = { id: p.id, run, question: collectedFor, ask: p.turns.at(-1), ...(fromRun ? { from_run: fromRun } : {}) };
  if (fromRun) {
    const src = realpathSync(join(root, fromRun, p.id.replace("#", "-")));
    if (!existsSync(join(dir, "layers"))) symlinkSync(join(src, "layers"), join(dir, "layers"));
    if (existsSync(join(src, "record.json"))) copyFileSync(join(src, "record.json"), join(dir, "record.json"));
  } else if (!replayOnly) {
    const c = node([...base, "--search", SEARCH]);
    row.collect = { code: c.code, ms: c.ms, error: c.code ? c.stderr.split("\n").find((l) => /Error|error/.test(l)) ?? c.stderr.split("\n").filter(Boolean).at(-1) ?? null : null };
  }
  if (existsSync(join(dir, "record.json"))) {
    const r1 = node([...base, "--replay"]);
    row.replay = { code: r1.code, ms: r1.ms, error: r1.code ? r1.stderr.split("\n").filter(Boolean).at(-1) : null };
    if (r1.code === 0) {
      copyFileSync(join(dir, "answers.json"), join(dir, "answers.replay1.json"));
      const r2 = node([...base, "--replay"]);
      row.deterministic = r2.code === 0 && sha(join(dir, "answers.json")) === sha(join(dir, "answers.replay1.json"));
      row.answers_sha256 = sha(join(dir, "answers.replay1.json"));
    }
  } else row.replay = { code: null, error: "no record.json: collection did not finish" };
  appendFileSync(log, JSON.stringify(row) + "\n");
  console.error(`${run} ${p.id}  collect ${row.collect?.code ?? "-"}  replay ${row.replay?.code}  det ${row.deterministic ?? "-"}`);
}
