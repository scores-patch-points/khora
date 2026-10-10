import fs from "node:fs";
const r = await import(`file://${process.cwd()}/reader.mjs`).then(m => m.readGreek({ chars: 150000, out: "eot-odyssey-150000.json" }));
const eot = JSON.parse(fs.readFileSync("eot-odyssey-150000.json", "utf8"));
console.log("referents:", eot.referents.length, "| has you:", eot.referents.some(x=>x.name==="you"), "| has I:", eot.referents.some(x=>x.name==="I"), "| named:", eot.referents.filter(x=>!String(x.name).startsWith("?")).length);
console.log("clauses:", eot.counts.clauses, "bindings:", eot.counts.bindings, "zero-ana:", eot.counts.zeroAnaphora);