#!/usr/bin/env node
// native/scripts/check-reading-hygiene.mjs — the "one door, full output" rule, made a failing gate.
// Recurring regression (2026-11-20/21): a session needs a reading, so it imports readWith directly,
// flips process.env.KHORA_ALLOW_DEGRADED="1" to bypass the pharos FULL-CAPACITY gate, sets
// minCharacters:0, and reads only .parse/.sentences — ignoring the real WeftEntry@4 output
// (cast/edges/clauses/quality/pronouns). one-door.test.mjs already fences the shipped door and its
// importers; this script fences the one escape hatch a scratch read slips in through: a file that
// ASSIGNS the degraded flag into the environment (the door itself only READS it as `=== "1"`, so an
// assignment anywhere in shipped source is a bypass, never a legitimate use).
//
// Run as part of `npm test` or standalone: node native/scripts/check-reading-hygiene.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SELF = fileURLToPath(import.meta.url);
const SKIP = new Set(["node_modules", ".git", "legacy-ported", "vendor", "tests", "eval", "gym", "identity", "assay"]);
const bad = [];
(function walk(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith(".")) walk(f); continue; }
    if (!/\.(mjs|js)$/.test(e.name) || f === SELF) continue;
    const s = fs.readFileSync(f, "utf8");
    // assignment into the environment = bypass (the door reads it; no shipped code writes it)
    if (/KHORA_ALLOW_DEGRADED\s*=\s*["'`]1["'`]/.test(s)) bad.push(path.relative(ROOT, f));
  }
})(ROOT);
if (bad.length) { console.error("READING-HYGIENE GUARD FAIL: a shipped file assigns KHORA_ALLOW_DEGRADED=1, bypassing the pharos FULL-CAPACITY gate. Go through the door (reading-one.mjs#read / readDocument) and read the full WeftEntry@4; a capacity gap is fixed or named, never bypassed.\n  - " + bad.join("\n  - ")); process.exit(1); }
console.log("reading-hygiene guard: clean — no shipped file bypasses the FULL-CAPACITY gate");
