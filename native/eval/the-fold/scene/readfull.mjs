import fs from "node:fs";
const FULL = 521664;
const t0 = Date.now();
const r = await import(`file://${process.cwd()}/reader.mjs`).then(m => m.readGreek({ chars: FULL, out: `eot-odyssey-${FULL}.json` }));
const eot = JSON.parse(fs.readFileSync(`eot-odyssey-${FULL}.json`, "utf8"));
const vals = JSON.parse(fs.readFileSync(`eot-odyssey-${FULL}.json`, "utf8"));
console.log("FULL READ", (Date.now() - t0) + "ms");
console.log("referents:", eot.referents.length, "| named:", eot.referents.filter(x=>!String(x.name).startsWith("?")).length, "| edges:", eot.edges.length);
console.log("clauses:", eot.counts.clauses, "| bindings:", eot.counts.bindings, "| zero-ana:", eot.counts.zeroAnaphora);
console.log("has you/I:", eot.referents.some(x=>x.name==="you"||x.name==="I"));
const T = eot.referents.find(x=>x.name==="Telemachus");
if (T) { const nEdges = eot.edges.filter(e=>e.subject===T.hash || e.object===T.hash).length; console.log("Telemachus edges:", nEdges); }