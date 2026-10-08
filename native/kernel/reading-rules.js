// kernel/reading-rules.js — the ONE seam for the reading-rule NUMBERS.
// The rules of reading are Relate's (janus/priors/reading-rules.json is their
// home). Khora RECEIVES them here as DATA — a path read, never a module
// import, never a constant it codified itself — and releases them with the
// trace. Data-gated: an absent file leaves the reader BARE, reported as a
// typed gap (never a guessed number, never a silent fallback to a value khora
// once owned). This file is the only place in khora that knows the path.
//
// THE TAO (the receptacle reading, 2026-10-08): "the reading rules are in
// janus" and khora is the empty receptacle — it receives all, codifies none.
// Every consumer of a reading-rule number reads it from here; a number that
// a caller still hardcodes in khora code is a form the receptacle accreted.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// native/kernel → up three = the three-repo root; the rules live beside every
// other prior at <root>/janus/priors (priors-have-one-home-janus).
export const READING_RULES_FILE =
  process.env.ER7_READING_RULES_FILE ?? path.join(HERE, "..", "..", "..", "janus", "priors", "reading-rules.json");

// The live resolver: an operator's ER7_READING_RULES_FILE override wins per
// CALL, so a test (or a bare deployment) can repoint without re-import. The
// default is the resolved janus path computed above.
export const resolveReadingRulesFile = () => process.env.ER7_READING_RULES_FILE ?? READING_RULES_FILE;

let _cache = null;

/** loadReadingRules() → { schema, source, rules|null, gap|null }
 *  Rules arrive as received DATA, frozen, never mutated. An absent or
 *  malformed file is a typed gap on the record — the reader is bare, never a
 *  guessed number. */
export function loadReadingRules() {
  if (_cache) return _cache;
  const source = resolveReadingRulesFile();
  let rules = null, gap = null;
  try {
    const d = JSON.parse(fs.readFileSync(source, "utf8"));
    rules = Object.freeze(d?.rules ?? null);
    if (!rules || rules.surprise === undefined) gap = { refused: "no_reading_rule", detail: `reading rules at ${source} carry no rule object` };
  } catch {
    gap = { refused: "absent", detail: `reading rules not found at ${source} — the khora is bare (a typed gap, never a guessed number)` };
  }
  _cache = Object.freeze({ schema: "ReadingRules@1", source, rules, gap });
  return _cache;
}

/** resetReadingRules() — test seam only: clears the once-only load so a test
 *  can repoint ER7_READING_RULES_FILE and re-derive the bare/loaded states. */
export function resetReadingRules() {
  _cache = null;
}