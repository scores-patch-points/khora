#!/usr/bin/env node
// scripts/check-wiring.mjs — A NAMED THING MUST EXIST (2026-11-18).
// Two ways this repo went quietly red or quietly broken: (1) package.json scripts name test files that are not in the tree, so the gate "runs" fewer tests than it says;
// (2) a cli/ entry point statically imports a file that is not in the tree (cli/eoreader7.mjs imports native/eval/lavar/lib/read-recipe.mjs), so the CLI cannot load.
// This check fails on any NEW such gap. The gaps that exist today are recorded in scripts/wiring-known.json, each with the reason it is open, so the red set can only shrink:
// fixing one means deleting its line; a new one fails here. Nothing is hidden: `node scripts/check-wiring.mjs --list` prints the known gaps.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const KNOWN = path.join(ROOT, "scripts/wiring-known.json");
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const gaps = [];
// 1. test files named in package.json scripts (root and native/)
for (const pj of ["package.json", "native/package.json"]) {
  const dir = path.dirname(pj); const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, pj), "utf8")).scripts ?? {};
  for (const [name, cmd] of Object.entries(scripts)) for (const tok of cmd.split(/\s+/)) {
    const t = tok.replace(/^["']|["']$/g, ""); if (!/\.(test\.)?(m?js)$/.test(t) || t.startsWith("-") || t.includes("*")) continue;
    const f = path.posix.normalize(path.posix.join(dir === "." ? "" : dir, t)); if (!exists(f)) gaps.push(`${pj}#${name} names a missing file: ${f}`);
  }
}
// 2. relative static imports of every cli/ entry point
const cliDir = path.join(ROOT, "cli");
if (fs.existsSync(cliDir)) for (const e of fs.readdirSync(cliDir)) {
  if (!/\.m?js$/.test(e)) continue; const src = fs.readFileSync(path.join(cliDir, e), "utf8");
  for (const m of src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s*["'](\.[^"']+)["']/gm)) { const f = path.posix.normalize(path.posix.join("cli", m[1])); if (f.startsWith("../")) continue; /* a sibling checkout beside this repo (janus): it exists or not by environment, so it is not a gap of THIS repo */ if (!exists(f)) gaps.push(`cli/${e} imports a missing file: ${f}`); }
}
const known = fs.existsSync(KNOWN) ? JSON.parse(fs.readFileSync(KNOWN, "utf8")).known : {};
if (process.argv.includes("--list")) { for (const g of gaps) console.log((g in known ? "KNOWN  " : "NEW    ") + g); process.exit(0); }
if (process.argv.includes("--record")) { const next = Object.fromEntries(gaps.map((g) => [g, known[g] ?? "TODO: say why this is open and who decides (lost / retired / never pushed)"])); fs.writeFileSync(KNOWN, JSON.stringify({ about: "Gaps check-wiring.mjs found when it was written. Each needs a reason. The list may only shrink.", known: next }, null, 1) + "\n"); console.log(`recorded ${gaps.length}`); process.exit(0); }
const fresh = gaps.filter((g) => !(g in known)); const fixed = Object.keys(known).filter((g) => !gaps.includes(g));
for (const g of fresh) console.error("NEW GAP: " + g);
for (const g of fixed) console.error("FIXED (remove its line from scripts/wiring-known.json): " + g);
if (fresh.length || fixed.length) { console.error(`check-wiring: ${fresh.length} new gap(s), ${fixed.length} fixed but still listed`); process.exit(1); }
console.log(`check-wiring: ok (${gaps.length} known gap(s), none new)`);
