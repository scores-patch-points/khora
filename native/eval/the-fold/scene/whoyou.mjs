import fs from "node:fs";
const r = await import(`file://${process.cwd()}/reader.mjs`).then(m => m.readGreek({ chars: 150000 }));
for (const x of (r.eot?.referents ?? [])) {
  if (x.name === "you" || x.name === "I") {
    console.log("REFERENT:", JSON.stringify(x));
    const back = [...r.refMap.entries()].filter(([, v]) => v === x.hash || (v.startsWith("N:") && ("N:" + v.slice(2)) === x.hash) || v.includes(x.hash));
    console.log("  refMap keys:", back.slice(0, 20).map(([k]) => k).join(", "));
  }
}