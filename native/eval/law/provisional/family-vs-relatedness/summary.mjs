// summary.mjs — descriptive tables from discovery-/confirm- cell JSON (no new AUC): per-target transfer by set type, donor-strength correlation, where transfer >= 0.60.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { genus, WO3 } from "./groups.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const pref = process.argv[2] || "discovery", cell = process.argv[3] || "LATER-BOTH";
const j = JSON.parse(fs.readFileSync(path.join(HERE, "results", `${pref}-${cell}.json`), "utf8"));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const rank = (xs) => { const o = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); o.forEach(([, i], k) => { r[i] = k; }); return r; };
const corr = (x, y) => { const mx = mean(x), my = mean(y); let n = 0, dx = 0, dy = 0; for (let i = 0; i < x.length; i++) { n += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; } return n / Math.sqrt(dx * dy); };
// donor strength vs donor transfer
const D = j.donors.filter((d) => j.own[d]), dm = D.map((d) => mean(Object.values(j.dyad.A[d]).filter((x) => x != null))), own = D.map((d) => j.own[d].cv);
const rho = corr(rank(dm), rank(own));
// target receptivity vs target own strength
const T = j.targets, tm = T.map((t) => mean(D.filter((d) => d !== t && j.dyad.A[d][t] != null).map((d) => j.dyad.A[d][t]))), town = T.map((t) => j.own[t].cv);
const rhoT = corr(rank(tm), rank(town));
console.log(`${pref} ${cell}: donor mean-transfer vs donor own-CV Spearman ${rho.toFixed(2)} (n=${D.length}); target mean-received vs target own-CV Spearman ${rhoT.toFixed(2)} (n=${T.length})`);
const f = (x) => (x ? x.mean.toFixed(3) : "  -  ");
console.log("tgt   genus        wo3   pairs own    a     b     c     d     e   | best set | any single donor>=0.60");
const rows = [];
for (const t of T.slice().sort()) {
  const r = j.sets[t], best = ["a", "b", "c", "d", "e"].filter((k) => r[k]).sort((x, y) => r[y].mean - r[x].mean)[0];
  const strong = j.donors.filter((d) => d !== t && j.dyad.A[d][t] >= 0.6).length;
  rows.push({ t, best, bestAuc: r[best].mean });
  console.log(t.padEnd(5), genus(t).padEnd(12), WO3[t].padEnd(5), String(j.own[t].pairs).padEnd(5), String(j.own[t].cv).padEnd(6), ["a", "b", "c", "d", "e"].map((k) => f(r[k])).join(" "), "|", best, r[best].mean.toFixed(3), "|", strong);
}
console.log("targets with some set mean >= 0.60:", rows.filter((x) => x.bestAuc >= 0.6).map((x) => `${x.t}(${x.best} ${x.bestAuc.toFixed(2)})`).join(" "));
console.log("targets with ALL sets < 0.55:", T.filter((t) => Object.values(j.sets[t]).filter(Boolean).every((s) => s.mean < 0.55)).join(" "));
