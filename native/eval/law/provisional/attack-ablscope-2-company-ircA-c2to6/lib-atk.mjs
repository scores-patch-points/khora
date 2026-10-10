// lib-atk.mjs -- shared helpers for the ATTACK on ablscope-2-company-ircA-c2to6 (NEW FILE; imports existing modules only).
// Pair rows come from the confirmer's results/rows.en.jsonl (read only) or are recomputed here with the confirmer's closed-form instrument (lib-dself.mjs).
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { strat, boot, perm, aucOfPairs, perStratum, caliperOf, controlAucs, inBand, round, mean, quantile, CONTROLS, companyAt, occOf, initShare } from "../confirm-ablscope-2-company-ircA-c2to6/lib-dself.mjs";
import { aucPN } from "../ablation-scope/stats.mjs";
import { rngFor } from "../../impact.mjs";
export { strat, boot, perm, aucOfPairs, perStratum, caliperOf, controlAucs, inBand, round, mean, quantile, CONTROLS, companyAt, occOf, initShare, aucPN, rngFor };

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONF = path.join(HERE, "..", "confirm-ablscope-2-company-ircA-c2to6", "results");
export const RES = path.join(HERE, "results");
/** sha256 of the text of the calling script before its END marker (the pre-registration header). */
export const headerSha = (file) => createHash("sha256").update(fs.readFileSync(file, "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
export const readJsonl = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
export const NEG = (m) => -m.dSelf;                       // the rule's score, HIGHER = name
export const nInit = (m) => Math.round(m.R_INIT * m.nWin);
export const looInit = (m) => (m.nWin > 1 ? (nInit(m) - 1) / (m.nWin - 1) : 0);   // initial share of the OTHER window mentions (the evaluated one is initial in group A)
export const groupBy = (xs, key) => { const m = new Map(); for (const x of xs) { const k = key(x); (m.get(k) ?? m.set(k, []).get(k)).push(x); } return m; };
export const sha256File = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
