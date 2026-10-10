// eval/law/name-floor1-posthoc.mjs — POST-HOC (not pre-registered) per-register re-analysis of the persisted name-floor1 records.
// Why: the registered pooled leave-one-block-out learner is trained mostly on UD blocks (1200 rows) and tested on IRC days (800 rows); the earlier IRC-dominated smoke (48 UD rows) gave IRC 0.700 at V1,
// the full run gives IRC 0.558 under pooled training. Does a register-specific learner hear the first mention? IRC-only leave-one-day-out, UD-only leave-one-language-out.
import fs from "node:fs";
import path from "node:path";
import { ARMS } from "./name-company.mjs";
import { cvScores, aucOf, quantile } from "./name-war-and-peace.mjs";
import { rngFor, seedFor } from "./impact.mjs";
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "results", "name-floor1");
const R = Object.fromEntries(["V0", "V1", "V2"].map((v) => [v, JSON.parse(fs.readFileSync(path.join(OUT, `records-${v}.json`), "utf8"))]));
const { meta, rows } = JSON.parse(fs.readFileSync(path.join(OUT, "rows-V0.json"), "utf8"));
const CH = { sig: (r) => r.sig, atm: (r) => r.atm, span: (r) => r.span, c: (r) => r.c, FULL: (r) => [...r.sig, ...r.atm, ...r.span, ...r.c] };
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const shuffleY = (y, block, rnd) => { const by = new Map(); block.forEach((b, k) => (by.get(b) ?? by.set(b, []).get(b)).push(k)); const o = y.slice(); for (const ks of by.values()) { const lab = ks.map((k) => y[k]); for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; } ks.forEach((k, j) => { o[k] = lab[j]; }); } return o; };
const out = {};
for (const kind of ["IRC", "UD"]) {
  const A = []; rows.forEach((rs, ci) => { if (meta[ci].kind === kind) rs.forEach((x, k) => A.push({ x, ci, k })); });
  const y = A.map((a) => a.x.y), block = A.map((a) => a.ci), rnd = rngFor(seedFor("name-floor1-posthoc", kind));
  const res = { rows: A.length, blocks: new Set(block).size, controls: {} };
  for (const arm of ["LEFT", "POSITION", "RIVALS"]) res.controls[arm] = r4(aucOf(cvScores(A.map((a) => ARMS[arm](a.x.f)), y, block), y));
  for (const v of ["V0", "V1", "V2"]) {
    res[v] = {};
    for (const ch of ["FULL", "sig", "atm", "span", "c"]) {
      const X = A.map((a) => CH[ch](R[v].records[a.ci][a.k])), a0 = aucOf(cvScores(X, y, block), y);
      const nulls = []; if (ch === "FULL") for (let b = 0; b < 60; b++) { const yp = shuffleY(y, block, rnd); const q = aucOf(cvScores(X, yp, block), yp); if (q != null) nulls.push(q); }
      res[v][ch] = ch === "FULL" ? { auc: r4(a0), permQ95: r4(quantile(nulls, 0.95)) } : r4(a0);
    }
  }
  out[kind] = res; console.error(kind, JSON.stringify(res));
}
fs.writeFileSync(path.join(OUT, "posthoc.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
