// design-counts.mjs -- DESIGN-TIME COUNTS ONLY for the attack (no AUC, no score of any kind is computed or printed). Purpose: size the strict-matching subsets and the fresh-day pool before pre-registering.
import { readJsonl, CONF } from "./lib-atk.mjs";
import path from "node:path";
const rows = readJsonl(path.join(CONF, "rows.en.jsonl")), prim = rows.filter((r) => r.grp === "A" && ["c2", "c3", "c4_6"].includes(r.stratum));
const d = (r, k) => r.p[k] - r.n[k];
const defs = {
  all: () => true,
  exactC: (r) => r.p.c === r.n.c,
  exactC_FB: (r) => r.p.c === r.n.c && r.p.R_FB === r.n.R_FB,
  exactC_FB_LEN: (r) => r.p.c === r.n.c && r.p.R_FB === r.n.R_FB && r.p.R_LEN === r.n.R_LEN,
  exactC_FB_LEN_SL: (r) => r.p.c === r.n.c && r.p.R_FB === r.n.R_FB && r.p.R_LEN === r.n.R_LEN && Math.abs(d(r, "R_SL")) <= 0.35,
};
const cdist = {}; for (const r of prim) { const k = Math.abs(r.p.c - r.n.c); cdist[k] = (cdist[k] ?? 0) + 1; }
console.log("primary pairs", prim.length, "|dc| distribution", JSON.stringify(cdist));
for (const [k, f] of Object.entries(defs)) console.log(k, prim.filter(f).length);
console.log("all rows by grp/stratum", JSON.stringify(rows.reduce((a, r) => { const k = r.grp + r.stratum; a[k] = (a[k] ?? 0) + 1; return a; }, {})));
