#!/usr/bin/env node
// eval/reading-baseline/record.mjs — record the reading baseline: the sha256 of every reading-critical file next to the numbers the reading was MEASURED at.
//   node eval/reading-baseline/record.mjs --note "why the reading changed and what the numbers did"   (re-hashes the files, keeps BASELINE.json's metrics, appends the note to CHANGES.md)
// native/tests/reading-baseline.test.mjs fails whenever a reading-critical file differs from the recorded hash: a reading change cannot land without this file being re-recorded, and re-recording needs a note.
// To change the METRICS, re-run the gold check (identity/novels gum-falsify3.mjs on slices E, C, D, F, or eval/referents/pronoun-golden.mjs) and edit BASELINE.json's `metrics` with the new numbers in the same commit.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."); const FILE = path.join(ROOT, "eval/reading-baseline/BASELINE.json");
export const READING_FILES = ["native/reading.js", "native/the-fold/pharos-gate.mjs", "holon.json", "native/tests/door-allowlist.json", "native/the-fold/read-process.mjs", "native/the-fold/read-core.mjs", "native/the-fold/language-grammar.js", "native/the-fold/language-names.js", "native/the-fold/language-names.data.js", "native/adapters/text/pronouns.js", "native/adapters/text/pronoun-registers.js",
  "native/adapters/text/pronoun-presence-chosen.js", "native/adapters/text/clause-attach.js", "native/adapters/text/non-personal.js", "native/adapters/text/name-prior.js", "native/adapters/text/name-prior/eng.json", "native/adapters/text/case-marked-clauses.js", "native/adapters/text/greek-seam.js", "native/the-fold/prior-source.mjs", "native/adapters/text/pronoun-registers/grc.json", "native/adapters/text/pronoun-registers/san.json", "native/priors-shipped/frame-san.json", "native/adapters/text/language-competency.js",
  "native/adapters/text/karaka-total.mjs", "native/adapters/text/text-mereology.mjs",
  "native/reading-in-order.mjs", "native/reading-in-order.worker.mjs", "native/adapters/text/referents-in-order.mjs", "native/adapters/text/gender-from-corpus.js", "native/adapters/text/name-convention.js", "native/priors-shipped/convention-spread-eng.json", "native/adapters/text/role-collapse.js", "native/priors-shipped/role-collapse-eng.json"];
export const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, f))).digest("hex");
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const i = process.argv.indexOf("--note"); const note = i > 0 ? process.argv[i + 1] : null; if (!note) { console.error('a note is required: --note "why the reading changed"'); process.exit(2); }
  const b = JSON.parse(fs.readFileSync(FILE, "utf8")); const before = b.files ?? {}; b.files = Object.fromEntries(READING_FILES.map((f) => [f, sha(f)])); b.recorded = new Date().toISOString().slice(0, 10);
  const changed = READING_FILES.filter((f) => before[f] !== b.files[f]); fs.writeFileSync(FILE, JSON.stringify(b, null, 1) + "\n");
  fs.appendFileSync(path.join(ROOT, "eval/reading-baseline/CHANGES.md"), `\n## ${b.recorded}: ${note}\nfiles changed since the last record: ${changed.length ? changed.join(", ") : "(none)"}\n`);
  console.log(`recorded ${READING_FILES.length} files, ${changed.length} changed; note appended to CHANGES.md`);
}
