import fs from "node:fs"; import { loadInv } from "./loadinv.mjs";
const inv = JSON.parse(fs.readFileSync(process.env.INV ?? "inv.json")); const out = { docs: {} };
for (const doc of Object.keys(inv.docs)) { const L = loadInv(doc); out.docs[doc] = { entities: L.entities, ignore: L.ignore }; }
fs.writeFileSync(process.env.OUT ?? "inv.dev.json", JSON.stringify(out, null, 1));
console.log(Object.values(out.docs).reduce((a, d) => a + Object.keys(d.entities).length, 0), "entities");
