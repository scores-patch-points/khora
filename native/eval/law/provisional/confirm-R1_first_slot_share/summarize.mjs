// summarize.mjs — applies the pre-registered VERDICT MAP of confirm.mjs to results/{a,b,c,e}.json and records the blind-prediction scorecard. Reads results only.
import fs from "node:fs";
import { createHash } from "node:crypto";
const J = (f) => JSON.parse(fs.readFileSync(new URL(`./results/${f}`, import.meta.url), "utf8"));
const a = J("a.json"), b = J("b.json"), c = J("c.json"), e = J("e.json"), post = { daysize: J("post-daysize.json"), uddev: J("post-ud-dev-top.json") };
const sha = createHash("sha256").update(fs.readFileSync(new URL("./confirm.mjs", import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
const shaOk = [a, b, c, e].every((x) => x.headerSha256 === sha);
const en = b.cells["EN|ALL"], ne = b.cells["NONEN|ALL"], u = en.used, un = ne.used;
const B = { EN_auc: u.auc, EN_ci: u.ci, EN_inBand: u.auc >= 0.81 && u.auc <= 0.89, lowerOk: u.ci[0] >= 0.65, controlsOk: en.variant === "full" || en.variant === "strict", shufDrop: en.shufDrop, shufOk: en.shufDrop >= 0.1, beyond: u.beyond.CNT_C128, beyondOk: u.beyond.CNT_C128.auc >= 0.6, NONEN_auc: un.auc, NONEN_n: un.n, NONEN_inBand: un.auc >= 0.75 && un.auc <= 0.92, causalBad: b.checks.causal.bad, crossBad: b.checks.cross.bad };
B.reproduces = B.EN_inBand && B.lowerOk && B.controlsOk && B.shufOk && B.beyondOk && B.NONEN_inBand && B.causalBad === 0 && B.crossBad === 0;
const A1 = a.strat.POOLED, A = { covered: A1.covered, nPos: A1.nPos, auc: A1.auc.ishare, ci: A1.ci, checks: A1.checks, failed: A1.failed, pass: A1.holds, refuted: A1.covered >= 40 && A1.ctlOk && A1.auc.ishare < 0.6, matched: { variant: a.cells.POOLED.variant, n: (a.cells.POOLED.used ?? a.cells.POOLED.full).n, auc: (a.cells.POOLED.used ?? a.cells.POOLED.full).auc } };
const verdict = A.pass && B.reproduces ? "CONFIRMED" : !B.reproduces || A.refuted ? "NOT_CONFIRMED" : "PARTIAL";
const C = { ...c.summary, vocative: c.vocative, pooledPROPN: c.vocative.allPROPN };
const out = { headerSha256: sha, allResultsCarryHeaderSha: shaOk, dryHeaderSha: "d3ee2990899c9ae45a97b060cf5ee76e7e3f08823c94fd63c9c8dc253d66cea5", verdict, B, A, C, E: e.headline, post };
fs.writeFileSync(new URL("./results/summary.json", import.meta.url), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ verdict, shaOk, sha, B: { auc: B.EN_auc, reproduces: B.reproduces }, A: { covered: A.covered, auc: A.auc, failed: A.failed }, C: c.summary }, null, 1));
