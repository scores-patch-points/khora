#!/usr/bin/env node
// manifest.mjs — what was pinned, per run and prompt: every page's pinax id, URL, raw and text sha256 and bytes, every typed absence.
// The layers themselves live outside the repo (PREREG §Procedure 2); this manifest lets anyone check a copy of them byte for byte.
//
//   node native/eval/callimachus/manifest.mjs --runs A,A-fix,B [--root DIR]   → manifest.json
import { readFileSync, writeFileSync, existsSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const root = resolve(opt("--root") ?? "/Users/mlacy/Documents/3.0/callimachus-runs/drive-eval-2026-10-14");
const runs = (opt("--runs") ?? "A").split(",");
const out = { root, runs: {} };
for (const run of runs) {
  out.runs[run] = {};
  for (const d of readdirSync(join(root, run)).sort()) {
    const dir = join(root, run, d);
    const real = realpathSync(dir);
    const f = join(dir, "record.json");
    if (!existsSync(f)) { out.runs[run][d] = { record: null, layers: readdirSync(join(dir, "layers")).length }; continue; }
    const rec = JSON.parse(readFileSync(f, "utf8"));
    out.runs[run][d] = {
      ...(real !== resolve(dir) ? { same_as: real.slice(root.length + 1) } : {}),
      sources: rec.sources.map((s) => ({ id: s.id, url: s.url, retrieved_at: s.retrieved_at, raw_sha256: s.raw?.sha256, text_sha256: s.text?.sha256, text_bytes: s.text?.bytes, seed: s.fetch?.seed })),
      absences: rec.absences ?? [],
    };
  }
}
writeFileSync(join(here, "manifest.json"), JSON.stringify(out, null, 1));
console.log(Object.fromEntries(Object.entries(out.runs).map(([r, ps]) => [r, Object.values(ps).reduce((k, p) => k + (p.sources?.length ?? 0), 0)])));
