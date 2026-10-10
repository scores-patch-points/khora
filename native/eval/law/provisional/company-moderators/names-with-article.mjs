// names-with-article.mjs: POST-HOC mechanism check on dev (reads JSON only): does the zero-shot left-company score fail where names take an article (names preceded by a determiner)?
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══
// STATUS: POST-HOC, EXPLORATORY, dev only. Written after seeing that ell (names preceded by DET on 65% of PROPN tokens in dev) has a reversed fixed score (S1 FIRST 0.41, S2 0.39) and the largest negative residual of the confirmation.
// TEST (no threshold; description): Spearman over dev languages between propn.precededBy.DET (share of PROPN tokens whose stream-left neighbour is a DET) and the FIRST paired AUC of S1 and S2, and the same for the LEFT probe.
// BLIND PREDICTION: negative rho for S1/S2 (mechanism: a name that takes an article looks like a common noun to a left-rank-bin score). With one outlier (ell) a Spearman can be driven by it, so the number is also reported without ell.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { round, headerSha } from "./util.mjs";
import { spearman } from "./stats.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), F = JSON.parse(fs.readFileSync(path.join(HERE, "results/fixed-score.dev.json"), "utf8")).per, D = JSON.parse(fs.readFileSync(path.join(HERE, "results/descriptors.dev.json"), "utf8")).languages, own = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "results/name-company-pairblocks/own.json"), "utf8"));
const ls = Object.keys(F).filter((l) => !F[l].FIRST.thin && D[l] && D[l].propn.n >= 100), out = { headerSha256: headerSha(import.meta.url), n: ls.length, rho: {} };
for (const [name, f] of [["S1_FIRST", (l) => F[l].FIRST.S1], ["S2_FIRST", (l) => F[l].FIRST.S2], ["S3_FIRST", (l) => F[l].FIRST.S3], ["probeLEFT_FIRST", (l) => own[l].FIRST.LEFT]]) { const all = ls.map((l) => D[l].propn.precededBy.DET), y = ls.map(f), k = ls.filter((l) => l !== "ell"); out.rho[name] = { withEll: round(spearman(all, y), 3), withoutEll: round(spearman(k.map((l) => D[l].propn.precededBy.DET), k.map(f)), 3) }; }
out.detShare = Object.fromEntries(ls.map((l) => [l, D[l].propn.precededBy.DET])); fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.rho), "n", out.n, "minPropn>=100");
