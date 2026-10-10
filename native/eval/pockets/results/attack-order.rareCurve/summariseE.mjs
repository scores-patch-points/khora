// summariseE.mjs -- digest of E_raw_*.jsonl -> E_summary.json. node summariseE.mjs
import fs from "node:fs";
import path from "node:path";
import { HERE, median } from "./lib.mjs";
const rows = []; for (const f of fs.readdirSync(HERE).filter((x) => /^E_raw_\d+\.jsonl$/.test(x)).sort()) for (const l of fs.readFileSync(path.join(HERE, f), "utf8").split("\n").filter(Boolean)) rows.push(JSON.parse(l));
const R = rows.filter((r) => r.v);
const out = { n: rows.length, baseMatchesAtlas: R.filter((r) => r.baseMatchesAtlas).length };
const tab = (st, filt = () => true) => { const c = {}; for (const r of R.filter((r) => r.status0 === st && filt(r))) { const k = `cL ${r.cLStatus} / cR ${r.cRStatus}`; c[k] = (c[k] || 0) + 1; } return c; };
const sgn = (r, key) => (r[key][0] > 0 && r[key][1] > 0 ? "+" : r[key][0] < 0 && r[key][1] < 0 ? "-" : "mixed");
const tab2 = (st, filt = () => true) => { const c = {}; for (const r of R.filter((r) => r.status0 === st && filt(r))) { const k = `left ${sgn(r, "cL")} right ${sgn(r, "cR")}`; c[k] = (c[k] || 0) + 1; } return c; };
const word = (r) => r.grain === "word", code = (r) => r.grain === "code";
out.byStatusPplus = { all: tab("P+"), word: tab("P+", word), code: tab("P+", code) };
out.byStatusPminus = { all: tab("P-"), word: tab("P-", word), code: tab("P-", code) };
out.bySignPplus = { all: tab2("P+"), word: tab2("P+", word), code: tab2("P+", code) };
out.bySignPminus = { all: tab2("P-"), word: tab2("P-", word), code: tab2("P-", code) };
const med = (st, key, filt = () => true) => +median(R.filter((r) => r.status0 === st && filt(r)).map((r) => (r[key][0] + r[key][1]) / 2)).toFixed(4);
out.medianSides = { "P+ all": { cL: med("P+", "cL"), cR: med("P+", "cR"), v: med("P+", "v") }, "P+ word": { cL: med("P+", "cL", word), cR: med("P+", "cR", word), v: med("P+", "v", word) }, "P- all": { cL: med("P-", "cL"), cR: med("P-", "cR"), v: med("P-", "v") }, "P- code": { cL: med("P-", "cL", code), cR: med("P-", "cR", code), v: med("P-", "v", code) }, "P- word": { cL: med("P-", "cL", word), cR: med("P-", "cR", word), v: med("P-", "v", word) } };
// document bootstrap
const bs = (st) => { const rs = R.filter((r) => r.status0 === st && r.ci?.v); const same = rs.filter((r) => (st === "P+" ? r.ci.v[0] > 0 : r.ci.v[1] < 0)).length, opp = rs.filter((r) => (st === "P+" ? r.ci.v[1] < 0 : r.ci.v[0] > 0)).length; return { n: rs.length, ciExcludesZeroSameSign: same, ciExcludesZeroOppositeSign: opp, ciCoversZero: rs.length - same - opp, medianDocsPerHalf: median(rs.map((r) => Math.min(...r.docs))) }; };
out.docBootstrap = { "P+": bs("P+"), "P-": bs("P-") };
out.docBootstrapByGrain = Object.fromEntries(["word", "code", "notation", "charbigram"].map((g) => [g, { "P+": (() => { const rs = R.filter((r) => r.status0 === "P+" && r.grain === g && r.ci?.v); return { n: rs.length, ok: rs.filter((r) => r.ci.v[0] > 0).length }; })(), "P-": (() => { const rs = R.filter((r) => r.status0 === "P-" && r.grain === g && r.ci?.v); return { n: rs.length, ok: rs.filter((r) => r.ci.v[1] < 0).length }; })() }]));
// P+ pockets whose bootstrap CI covers zero
out.pPlusCiCoversZero = R.filter((r) => r.status0 === "P+" && r.ci?.v && r.ci.v[0] <= 0).map((r) => `${r.id}(${r.register},${r.docs.join("/")} docs)`);
out.pMinusCiCoversZero = R.filter((r) => r.status0 === "P-" && r.ci?.v && r.ci.v[1] >= 0).map((r) => `${r.id}(${r.register},${r.docs.join("/")} docs)`);
// share of P+ pockets that are a TRUE two-sided U: both cL and cR positive in both halves
const trueU = R.filter((r) => r.status0 === "P+" && r.cL[0] > 0 && r.cL[1] > 0 && r.cR[0] > 0 && r.cR[1] > 0);
out.trueU = { nPplus: R.filter((r) => r.status0 === "P+").length, bothSidesPositiveBothHalves: trueU.length, byGrain: trueU.reduce((a, r) => { a[r.grain] = (a[r.grain] || 0) + 1; return a; }, {}), ids: trueU.map((r) => r.id) };
fs.writeFileSync(path.join(HERE, "E_summary.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
