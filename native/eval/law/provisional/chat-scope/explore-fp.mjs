// explore-fp.mjs — DISCOVERY-DAYS-ONLY descriptive look at which ordinary words fire the ISHARE_Cinf rule (false positives) and which nicks it misses. Not a test.
import { daysOf, collect } from "./collect.mjs";
const days = daysOf("discovery").filter((d) => d.lang === (process.argv[2] ?? "en"));
const { out } = collect(days, "real", 400);
const thr = 0.67, fp = new Map(), fn = new Map(); let np = 0, nn = 0;
for (const p of out.LATER) { np++; if (p.neg.ISHARE_Cinf >= thr) fp.set(p.neg.w, (fp.get(p.neg.w) ?? 0) + 1); if (p.pos.ISHARE_Cinf < thr) fn.set(p.pos.w, (fn.get(p.pos.w) ?? 0) + 1); }
const top = (m, k = 40) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([w, c]) => `${w}:${c}`).join(" ");
console.log("pairs", np, "FP forms", fp.size, "FP total", [...fp.values()].reduce((a, b) => a + b, 0), "\nFP:", top(fp), "\nMISSED nicks:", top(fn));
