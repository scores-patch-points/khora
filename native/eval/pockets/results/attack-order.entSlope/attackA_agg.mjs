// attackA_agg.mjs -- aggregate A_raw_*.jsonl: per variant, retention of status / sign relative to the atlas PRESENT status, drift of v, size/unit-length rho, register sign-split at the reduced size.
//   node attackA_agg.mjs -> A_summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, spearman, rngOf, seedOf, f } from "./lib.mjs";
const rows = []; for (const fn of fs.readdirSync(HERE).filter((x) => /^A_raw_\d+\.jsonl$/.test(x))) for (const l of fs.readFileSync(path.join(HERE, fn), "utf8").split("\n").filter(Boolean)) rows.push(JSON.parse(l));
rows.sort((a, b) => (a.id < b.id ? -1 : 1));
const med = (a) => { a = a.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
const eta2 = (y, g) => { const m = y.reduce((a, b) => a + b, 0) / y.length, sst = y.reduce((a, b) => a + (b - m) ** 2, 0); if (!sst) return 0; const s = new Map(), c = new Map(); y.forEach((v, i) => { s.set(g[i], (s.get(g[i]) || 0) + v); c.set(g[i], (c.get(g[i]) || 0) + 1); }); let ssb = 0; for (const [k, v] of s) ssb += c.get(k) * (v / c.get(k) - m) ** 2; return ssb / sst; };
const permP = (y, g, tag, B = 1000) => { const rnd = rngOf(seedOf("attackA-agg", tag)), obs = eta2(y, g), gg = g.slice(); let ge = 0; for (let b = 0; b < B; b++) { for (let i = gg.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [gg[i], gg[j]] = [gg[j], gg[i]]; } if (eta2(y, gg) >= obs - 1e-12) ge++; } return { eta2: obs, p: (ge + 1) / (B + 1) }; };
const out = { n: rows.length, baseMaxAbsDiffToAtlas: Math.max(...rows.map((r) => r.variants.base.maxAbsDiffToAtlas)), variants: {} };
const sg = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
for (const name of Object.keys(rows[0].variants).filter((n) => n !== "base")) {
  const ev = rows.filter((r) => !r.variants[name].skipped && r.variants[name].status !== "undef" && r.variants[name].v != null), sk = {}; const nUndef = rows.filter((r) => !r.variants[name].skipped && r.variants[name].status === "undef").length; for (const r of rows) if (r.variants[name].skipped) sk[r.variants[name].skipped] = (sk[r.variants[name].skipped] || 0) + 1;
  const o = { evaluated: ev.length, undefinedBecauseFewUnitsOrNullSd: nUndef, skipped: sk, byOriginal: {} };
  for (const cls of ["P+", "P-"]) {
    const s = ev.filter((r) => r.status0 === cls), c = { n: s.length, P_same: 0, P_opposite: 0, M: 0, A: 0, undef: 0, signKept: 0, signedDetectedSame: 0, signedDetectedOpp: 0 }, want = cls === "P+" ? 1 : -1;
    for (const r of s) { const v = r.variants[name]; const st = v.status; if (st === "P+" || st === "P-") { if ((st === "P+") === (cls === "P+")) c.P_same++; else c.P_opposite++; } else c[st]++; if (sg(v.v) === want) c.signKept++; const dz = [v.discover.z, v.confirm.z]; if (dz.every((z) => z != null && Math.abs(z) >= 2 && sg(z) === sg(dz[0]))) { if (sg(dz[0]) === want) c.signedDetectedSame++; else c.signedDetectedOpp++; } }
    c.medianDrift = med(s.map((r) => r.variants[name].v - r.v0)); c.medianV0 = med(s.map((r) => r.v0)); c.medianV = med(s.map((r) => r.variants[name].v)); o.byOriginal[cls] = c;
  }
  o.spearmanVvsV0 = spearman(ev.map((r) => r.variants[name].v), ev.map((r) => r.v0));
  o.rhoV_unitLen0 = spearman(ev.map((r) => r.variants[name].v), ev.map((r) => r.mul0)); o.rhoV_unitLenReduced = spearman(ev.map((r) => r.variants[name].v), ev.map((r) => (r.variants[name].discover.mul + r.variants[name].confirm.mul) / 2));
  o.rhoV_logTokens0 = spearman(ev.map((r) => r.variants[name].v), ev.map((r) => Math.log10(r.tokens))); o.rhoV0_unitLen0 = spearman(ev.map((r) => r.v0), ev.map((r) => r.mul0));
  const pr = ev.filter((r) => r.variants[name].status === "P+" || r.variants[name].status === "P-");
  o.reducedPresent = { n: pr.length, pos: pr.filter((r) => r.variants[name].status === "P+").length };
  if (pr.length >= 20) { const y = pr.map((r) => (r.variants[name].status === "P+" ? 1 : 0)); o.reducedPresent.registerSignSplit = permP(y, pr.map((r) => r.register), name + "-reg"); o.reducedPresent.groupSignSplit = permP(y, pr.map((r) => r.group), name + "-grp"); const orig = pr.filter((r) => r.variants[name].status === "P+" ? r.status0 === "P+" : r.status0 === "P-").length; o.reducedPresent.agreeWithOriginalSign = orig / pr.length; }
  // v-level register eta2 among the same evaluated set
  o.registerEta2OfV = permP(ev.map((r) => r.variants[name].v), ev.map((r) => r.register), name + "-vreg");
  out.variants[name] = o;
}
// replicate ceiling for the 7,500-token variants
for (const base of ["tok7500", "tok7500len10"]) { const s = rows.filter((r) => !r.variants[base + "_r0"].skipped && !r.variants[base + "_r1"].skipped), pp = s.filter((r) => ["P+", "P-"].includes(r.variants[base + "_r0"].status) && ["P+", "P-"].includes(r.variants[base + "_r1"].status)); out.variants[base + "_replicateCeiling"] = { nBoth: s.length, bothPresent: pp.length, sameSignWhenBothPresent: pp.filter((r) => r.variants[base + "_r0"].status === r.variants[base + "_r1"].status).length, spearmanV_r0_r1: spearman(s.map((r) => r.variants[base + "_r0"].v), s.map((r) => r.variants[base + "_r1"].v)) }; }
fs.writeFileSync(path.join(HERE, "A_summary.json"), JSON.stringify(out, null, 1));
for (const [n, o] of Object.entries(out.variants)) { if (!o.byOriginal) { console.log(n, JSON.stringify(o)); continue; } console.log(`${n}: eval ${o.evaluated} undef ${o.undefinedBecauseFewUnitsOrNullSd} skip ${JSON.stringify(o.skipped)}`); for (const cls of ["P+", "P-"]) { const c = o.byOriginal[cls]; console.log(`   orig ${cls} n=${c.n}: same ${c.P_same} opp ${c.P_opposite} M ${c.M} A ${c.A} undef ${c.undef} | signKept ${c.signKept} | detected(|z|>=2 both) same ${c.signedDetectedSame} opp ${c.signedDetectedOpp} | median v0 ${f(c.medianV0, 4)} -> ${f(c.medianV, 4)}`); } console.log(`   rho(v,v0)=${f(o.spearmanVvsV0)} rho(v,unitLen0)=${f(o.rhoV_unitLen0)} (orig ${f(o.rhoV0_unitLen0)}) rho(v,logTok0)=${f(o.rhoV_logTokens0)}; reducedPresent ${o.reducedPresent.n} (+${o.reducedPresent.pos}) regSignSplit ${o.reducedPresent.registerSignSplit ? f(o.reducedPresent.registerSignSplit.eta2) + " p=" + f(o.reducedPresent.registerSignSplit.p, 4) : "NA"} agreeOrig ${f(o.reducedPresent.agreeWithOriginalSign)}`); }
