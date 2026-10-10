// zones.mjs: POST-HOC description of the dose-response in FWC32 zones, pooled over dev, test-new and test-old (reads JSON only; no new pipeline run).   node zones.mjs OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══
// STATUS: POST-HOC, written after results/confirm.verdict.json was seen (R1 and R2 PASS on the 28 new languages; secondary: R1 PARTIAL, R2 FAIL on the old 25 on clause c because out-of-scope cmn/cmn-hans/ind/vie
//   were audible at LATER). Nothing here can change a verdict; it describes where the PASSed rules are strong or weak so the NEXT confirmation can fix zones and thresholds in advance.
// ZONES (fixed here before computing): FWC32 < 0.20 | 0.20-0.24 | 0.24-0.28 | >= 0.28. For each stratum x dataset: n eligible (non-thin, POSITION control in band), share with AUC >= 0.60, mean AUC.
// DESCRIPTIVE SUBSETS (fixed here): Slavic = rus pol ukr ces slk hrv srp slv bul; non-Indo-European (nonIE) = kat eus est hun tam lzh wol mlt fin tur jpn kor vie ind cmn cmn-hans heb arb uig; IE = every other language.
//   Own.json carries no POSITION control column, so every non-thin dev language is treated as eligible (all dev POSITION values were inside [0.45, 0.55] in name-company).
// BLIND PREDICTION: the share audible rises monotonically with the zone at FIRST; at LATER the 0.20-0.28 zone is mixed (isolating languages cmn/ind/vie audible, agglutinative ones not).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { round, mean, headerSha } from "./util.mjs";
import { spearman } from "./stats.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), LAW = path.join(HERE, "..", "..");
const own = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/own.json"), "utf8")), D = JSON.parse(fs.readFileSync(path.join(HERE, "results/descriptors.dev.json"), "utf8")).languages;
const NEWR = JSON.parse(fs.readFileSync(path.join(HERE, "results/confirm.new.test.json"), "utf8")).rows, OLDR = JSON.parse(fs.readFileSync(path.join(HERE, "results/confirm.old.test.json"), "utf8")).rows;
const ARM = { FIRST: "LEFT", LATER: "BOTH" }, ZONES = [[0, 0.2], [0.2, 0.24], [0.24, 0.28], [0.28, 9]], SLAV = new Set("rus pol ukr ces slk hrv srp slv bul".split(" "));
const NONIE = new Set("kat eus est hun tam lzh wol mlt fin tur jpn kor vie ind cmn cmn-hans heb arb uig".split(" "));
const ok = (r, st) => r[st] && !r[st].thin && r[st].position >= 0.45 && r[st].position <= 0.55;
const data = (st) => ({ dev: Object.keys(own).filter((l) => !own[l][st].thin && D[l]).map((l) => ({ stem: l, fwc: D[l].FWC32, auc: own[l][st][ARM[st]], pairs: own[l][st].pairs })),
  testNew: NEWR.filter((r) => !r.error && ok(r, st)).map((r) => ({ stem: r.stem, fwc: r.fwc32, auc: r[st].auc, pairs: r[st].pairs })), testOld: OLDR.filter((r) => !r.error && ok(r, st)).map((r) => ({ stem: r.stem, fwc: r.fwc32, auc: r[st].auc, pairs: r[st].pairs })) });
const R = { headerSha256: headerSha(import.meta.url), status: "POST-HOC description", zones: {}, subsets: {} };
for (const st of ["FIRST", "LATER"]) { const ds = data(st); R.zones[st] = {};
  for (const [name, rows] of [...Object.entries(ds), ["pooled", [...ds.dev, ...ds.testNew, ...ds.testOld]]]) { R.zones[st][name] = ZONES.map(([lo, hi]) => { const z = rows.filter((r) => r.fwc >= lo && r.fwc < hi); return { zone: `${lo}-${hi === 9 ? "+" : hi}`, n: z.length, shareAudible: z.length ? round(z.filter((r) => r.auc >= 0.6).length / z.length, 3) : null, mean: round(mean(z.map((r) => r.auc))) }; }); }
  const sub = (name, f, rows) => { const z = rows.filter(f); return { n: z.length, rho: z.length >= 4 ? round(spearman(z.map((r) => r.fwc), z.map((r) => r.auc)), 3) : null, langs: z.map((r) => `${r.stem}:${r.fwc.toFixed(2)}/${r.auc}`).join(" ") }; };
  R.subsets[st] = { slavicPooled: sub("slavic", (r) => SLAV.has(r.stem), [...ds.dev, ...ds.testNew, ...ds.testOld]), slavicTestNewOnly: sub("slavic-new", (r) => SLAV.has(r.stem), ds.testNew), nonIE_testNew: sub("nonIE-new", (r) => NONIE.has(r.stem), ds.testNew), nonIE_dev: sub("nonIE-dev", (r) => NONIE.has(r.stem), ds.dev),
    testNewIE: sub("IE-new", (r) => !NONIE.has(r.stem), ds.testNew) }; }
fs.writeFileSync(process.argv[2], JSON.stringify(R, null, 1)); for (const st of ["FIRST", "LATER"]) { console.log(st); for (const [k, v] of Object.entries(R.zones[st])) console.log(" ", k.padEnd(8), v.map((z) => `${z.zone}: n=${z.n} aud=${z.shareAudible} m=${z.mean}`).join(" | ")); for (const [k, v] of Object.entries(R.subsets[st])) console.log("  *", k, "n", v.n, "rho", v.rho, "|", v.langs.slice(0, 260)); }
