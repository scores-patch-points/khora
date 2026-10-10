// postsham3.mjs: DESCRIPTIVE (no test, no bar): which forms carry the XYEAR sham AUC (postsham2)? Lists sham-positive forms flagged at ISHARE >= 0.67 and the forms' share among all sham positives. Run: node postsham3.mjs
import { loadDay, SETS, LANG, buildIx, feat, laterOccs } from "./lib.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const EN = (k) => LANG[k.split("/")[0]] === "en", RC = [...SETS.R, ...SETS.C].filter(EN).filter((k) => /^(ubuntu|kubuntu)\//.test(k)), docs = RC.map((k) => loadDay(k)), F = new Map(), A = new Map();
for (const d of docs) { const o = docs.find((x) => d.channel === x.channel && Math.abs(d.year - x.year) >= 6); if (!o) continue; const sham = new Set([...o.nicks].filter((n) => !d.nicks.has(n))), ix = buildIx(d.T);
  for (const oc of laterOccs({ ...d, nicks: new Set(), topic: new Set() })) { if (!sham.has(oc.w) || [...oc.w].length < 3) continue; const f = feat(ix, oc.k, oc.w).ishare >= 0.67; A.set(oc.w, (A.get(oc.w) ?? 0) + 1); if (f) F.set(oc.w, (F.get(oc.w) ?? 0) + 1); } }
const tot = [...A.values()].reduce((s, x) => s + x, 0), fl = [...F.values()].reduce((s, x) => s + x, 0);
console.log("sham-positive LATER mentions", tot, "flagged", fl, "share", (fl / tot).toFixed(3), "distinct forms", A.size, "distinct flagged", F.size);
console.log("top flagged:", JSON.stringify([...F].sort((a, b) => b[1] - a[1]).slice(0, 40)));
console.log("top unflagged-by-count:", JSON.stringify([...A].filter(([w]) => !F.has(w)).sort((a, b) => b[1] - a[1]).slice(0, 25)));
