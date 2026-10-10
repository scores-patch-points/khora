// attack-relatedness-romance-set/atk-final.mjs — COLLATION ONLY (no test, no AUC): reads the summaries of attacks A, A2, B, B2, B3, C, C2, C3 and writes results/ATTACK-FINAL.json with the key numbers and the header sha256 of every test script.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), rd = (f) => JSON.parse(fs.readFileSync(path.join(HERE, "results", f), "utf8")), sha = (s) => createHash("sha256").update(s).digest("hex");
const hdr = (f) => sha(fs.readFileSync(path.join(HERE, f), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]);
const A = rd("A-summary.json"), A2 = rd("A2-summary.json"), B = rd("B-summary.json"), B2 = rd("B2-summary.json"), B3 = rd("B3-summary.json"), C = rd("C-summary.json"), C2 = rd("C2-summary.json"), C3 = rd("C3-summary.json");
const v = (p) => ({ a: p.a, g: p.g, e: p.e, aMinusE: p.aMinusE.mean, aMinusG: p.aMinusG.mean, pass: p.passAll ?? p.pass, pos: p.pos, shuf: p.shuf });
const out = { headers: Object.fromEntries(["atk-a.mjs", "atk-a2.mjs", "atk-b.mjs", "atk-b2.mjs", "atk-b3.mjs", "atk-c.mjs", "atk-c2.mjs", "atk-c3.mjs"].map((f) => [f, hdr(f)])),
  A: Object.fromEntries(Object.entries(A.primary).map(([k, p]) => [k, v(p)])), A_verdicts: A.verdicts, A2: Object.fromEntries(Object.entries(A2.variants).map(([k, p]) => [k, v(p.primary)])), A_germanicTargets: { V0M0: v(A.germanicTargets.V0M0) },
  B1: B.B1, B_perSplit: B.perSplit, B_rates: B.B3.rates, B_matrix: B.matrix, B2: { B4a: B2.B4a, top3Share: B2.top3Share, meanRank: B2.meanRank }, B3: B3.pooled,
  C: { romance: Object.fromEntries(Object.entries(C.groups.romance).map(([k, p]) => [k, { a: p.a, e: p.e, aMinusE: p.aMinusE.mean, share: p.shareOfAboveChance }])), germanic: Object.fromEntries(["BOTH", "NBRRARE", "NBRMEAN", "FIX_RARE", "ADJ", "BAG"].map((k) => [k, { a: C.groups.germanic[k].a, share: C.groups.germanic[k].shareOfAboveChance }])), attackSucceeds: C.attackSucceeds, adjReproducesBoth: C.adjReproducesBoth },
  C2: { romance: C2.groups.romance, C2a: C2.C2a, C2b: C2.C2b }, C3: { perSplit: C3.perSplit, verdict: C3.ONLYTOP4_verdict, replicatesIn: C3.ONLYTOP4_replicatesInSplits, rareAgnostic: C3.RARE_genusAgnosticSplits } };
fs.writeFileSync(path.join(HERE, "results", "ATTACK-FINAL.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.headers, null, 1), Object.keys(out));
