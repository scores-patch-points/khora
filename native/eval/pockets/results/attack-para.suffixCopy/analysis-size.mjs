// analysis-size.mjs -- prevalence of P+ (atlas statuses, 10 draws) by pocket size bin and code vs non-code; and logistic-free check: Spearman of z with log tokens within non-code.
import { atlasRows, writeJson, countBy } from "./common.mjs";
import { spearman } from "./stats.mjs";
const A = Object.values(atlasRows()), bins = [[0, 50000], [50000, 100000], [100000, 200000], [200000, 1e9]], out = { bins: [] };
for (const [lo, hi] of bins) for (const cls of ["code", "non-code"]) {
  const x = A.filter((r) => r.tokens >= lo && r.tokens < hi && (cls === "code") === (r.register === "code")), d = x.filter((r) => ["P+", "P-", "A", "M"].includes(r.status));
  out.bins.push({ tokens: `${lo}-${hi}`, cls, n: x.length, defined: d.length, "P+": x.filter((r) => r.status === "P+").length, shareOfAll: +(100 * x.filter((r) => r.status === "P+").length / Math.max(1, x.length)).toFixed(1), shareOfDefined: +(100 * x.filter((r) => r.status === "P+").length / Math.max(1, d.length)).toFixed(1) });
}
const nc = A.filter((r) => r.register !== "code" && r.zD != null && r.zC != null);
out.spearmanZvsLogTokensNonCode = +spearman(nc.map((r) => Math.log(r.tokens)), nc.map((r) => (r.zD + r.zC) / 2)).toFixed(3);
out.spearmanVvsLogTokensNonCode = +spearman(nc.map((r) => Math.log(r.tokens)), nc.map((r) => (r.vD + r.vC) / 2)).toFixed(3);
out.nNonCode = nc.length;
writeJson("out/analysis-size.json", out);
for (const b of out.bins) console.log(b.tokens.padEnd(16), b.cls.padEnd(9), "n", String(b.n).padStart(3), "P+", String(b["P+"]).padStart(3), `(${b.shareOfAll}% of all, ${b.shareOfDefined}% of defined)`);
console.log("non-code: Spearman(log tokens, mean z)", out.spearmanZvsLogTokensNonCode, " Spearman(log tokens, mean v)", out.spearmanVvsLogTokensNonCode, "n", out.nNonCode);
