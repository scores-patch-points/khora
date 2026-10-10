import fs from "node:fs";
const r = await import(`file://${process.cwd()}/reader.mjs`).then(m => m.readGreek({ chars: 150000 }));
const { bySentence, zaBind, nameOfId } = r;
const youIds = new Set();
for (const id of bySentence.values()) { const nm = nameOfId(id); if (nm === "you" || nm === "I") youIds.add(id); }
for (const id of zaBind.values()) { const nm = nameOfId(id); if (nm === "you" || nm === "I") youIds.add(id); }
console.log("bySentence/zaBind ids named you/I:", [...youIds]);
// where do these ids come from? check the bindings list (resolver output)
for (const b of (r.bindings ?? [])) if (nameOfId(b.referentId) === "you" || nameOfId(b.referentId) === "I") console.log("BINDING → you/I:", JSON.stringify(b).slice(0, 160));
console.log("bindings count:", (r.bindings ?? []).length, "gaps:", (r.gaps ?? []).length);