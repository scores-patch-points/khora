// post-ud-dev-top.mjs — POST-HOC exploratory (no verdict weight): the three best test stems of Part C (vie, fin, cmn) re-run on DEV (never R1-scored) as a winner's-curse check.
import { runStems } from "./part-c.mjs";
import fs from "node:fs";
const { cells } = await runStems(["vie", "fin", "cmn"], "dev", "post-dev-top");
const out = cells.filter((c) => c.neg === "ALLLEX").map((c) => ({ stem: c.stream, nPos: c.strat.nPos, covered: c.strat.covered, clusters: c.strat.clusters, auc: c.strat.auc.ishare, ci: c.strat.ci, ctlOk: c.strat.ctlOk, ctl: c.strat.auc, shuf: c.strat.shuf.auc, beyond: c.strat.beyond.auc, failed: c.strat.failed }));
fs.writeFileSync(new URL("./results/post-ud-dev-top.json", import.meta.url), JSON.stringify(out)); console.log(JSON.stringify(out));
