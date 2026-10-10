// provenance.mjs — hashes of the final family files and the check that the blind PREDICT table is unchanged since the freeze.
import fs from "node:fs";
import { createHash } from "node:crypto";
const sha = (p) => createHash("sha256").update(fs.readFileSync(new URL(p, import.meta.url))).digest("hex");
const files = ["order.mjs", "_order_prep.mjs", "_order_pos.mjs", "_order_pair.mjs", "_order_surp.mjs"], fin = Object.fromEntries(files.map((f) => [f, sha(`../../${f}`)]));
const fz = JSON.parse(fs.readFileSync(new URL("./predict-frozen.json", import.meta.url), "utf8"));
const src = fs.readFileSync(new URL("../../order.mjs", import.meta.url), "utf8"), P = Function(`return (${src.match(/export const PREDICT = (\{[\s\S]*?\n\});/)[1]})`)();
const now = createHash("sha256").update(JSON.stringify(Object.keys(P).sort().map((k) => [k, P[k]]))).digest("hex");
const prov = { family: "order", finalFileSha256: fin, predictSha256Frozen: fz.sha256, predictSha256Now: now, predictUnchangedSinceFreeze: now === fz.sha256, orderMjsUnchangedSinceFreeze: fin["order.mjs"] === fz.orderMjsSha256AtFreeze, protocolSha256: sha("../../../PROTOCOL.md"),
  note: "order.mjs was written and PREDICT frozen (freeze-predict.mjs) before the helper modules _order_*.mjs existed and before any order statistic was computed. After the first runs only the helpers were edited (floating-point residue guards for constant x, two-pass sd); no definition and no PREDICT entry was changed after seeing any result." };
fs.writeFileSync(new URL("./provenance.json", import.meta.url), JSON.stringify(prov, null, 1) + "\n"); console.log(JSON.stringify(prov, null, 1));
