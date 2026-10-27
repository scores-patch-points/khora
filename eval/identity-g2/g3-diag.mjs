// POST-HOC DIAGNOSTIC, read only: lists the pairs behind the A3 numbers. Changes no rule and no result.
import fs from "node:fs";
const lib = fs.readFileSync("g3-measure.mjs", "utf8").split("if (process.argv[2] === \"--selftest\")")[0];
fs.writeFileSync("g3-lib.mjs", lib);
const { a3, conceptOf, scopeOf } = await import("./g3-lib.mjs");
const G = JSON.parse(fs.readFileSync("/Users/mlacy/Downloads/workspace/g2-pairs/g2-pairs.json", "utf8")).pairs, M = JSON.parse(fs.readFileSync("g2m.json", "utf8")).pairs;
console.log("A3 refuses natural aligned pairs:");
for (const p of G.filter((x) => x.origin === "natural")) { const r = a3(p); if (r.v === "refused" && r.step !== "entity") console.log(" ", p.id, p.concept, r.rule, "prose-concept:", r.prose ?? "-", "cues:", JSON.stringify(r.cues ?? []), "|", p.prose.quote.slice(0, 200).replace(/\s+/g, " ")); }
console.log("\nscope pairs A3 did NOT refuse:");
for (const p of M.filter((x) => x.truth_rule === "scope")) { const r = a3(p); if (r.rule !== "scope") console.log(" ", p.id, "cue inserted:", p.cueInserted, "->", r.v, "|", p.prose.quote.slice(0, 220).replace(/\s+/g, " ")); }
