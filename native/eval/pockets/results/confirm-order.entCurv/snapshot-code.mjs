// results/confirm-order.entCurv/snapshot-code.mjs — records path + sha256 of every source file of the three code siblings (the loaders read the live 3.0 checkout; this snapshot lets anyone verify it is unchanged).
import fs from "node:fs";
import { sha256 } from "../../lib/pocket.mjs";
import { loadAll } from "./describe-siblings.mjs";
const out = {};
for (const p of await loadAll(["ec-cd-js", "ec-cd-ts", "ec-cd-py"])) out[p.id] = p.meta.fileList.map((f) => [f, sha256(fs.readFileSync(f))]);
fs.writeFileSync(new URL("./code-snapshot.json", import.meta.url), JSON.stringify(out));
console.error(Object.entries(out).map(([k, v]) => `${k}: ${v.length} files`).join("; "));
