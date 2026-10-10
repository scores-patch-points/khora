// attackB2.mjs: ATTACK B2 (THE RULE'S OTHER CLAIMS: LOW SIDE, MIXED BAND, ISOLATING EXCEPTION) on rule R2-later-both-fwc32.   mode:  analyse   (reads results only; never use the mode word "run": name-company.mjs starts main() when process.argv[2] === "run")
//   (run with NAME_COMPANY_PAIRBLOCK=1 because common.mjs imports name-company.mjs)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══
// DISCLOSURE. SEEN: everything listed in attackB.mjs (rule, confirmer's results incl. its LOW verdict: 3 of 4 PRIMARY single windows with FWC32 < 0.20 are audible: kaz 0.654, lit 0.789, kat 0.613; tam 0.566 is not; window-level audible share below 0.20 = 29%, 0.20-0.2795 = 38%,
//   >= 0.2795 = 79%), and attackB results (B1-B7). NOT SEEN: any clade-cluster interval for the LOW side or for the band shares; the isolating-language counts across all samples.
// WHAT IS ATTACKED. The rule's statement has three more clauses besides the in-scope sufficient condition: (L) 'FWC32 < 0.20 implies not audible', (M) 'the 0.20-0.28 band is mixed', (I) 'isolating languages cmn, cmn-hans, ind, vie are audible at FWC32 0.22-0.26'.
// DATA (independent of the rule's fit): FRESH windows = the confirmer's primary windows of sets A and B plus its extension windows of A and B (each window: FWC32, pairs, BOTH AUC, POSITION AUC; eligible = pairs >= 60 and POSITION in [0.45, 0.55]) plus TEST-new rows of the scoper
//   (28 new stems, LATER stratum; same eligibility). DEV-FIT = dev rows (22 stems) and window/test rows of sets C and old; reported separately (not used for verdicts). Clusters = language and coarse clade (as attackB).
// TESTS (fixed now; may be tightened, never loosened).
//   L: among FRESH observations with FWC32 < 0.20 (pairs >= 60, eligible): audible share (AUC >= 0.60) <= 0.25 AND the clade-cluster-bootstrap (B = 4000) upper 95% bound < 0.50. FALLS otherwise. Also with the pair floor 250 where n allows.
//   M: audible share in 0.20-0.2795 reported with its bootstrap interval; 'mixed' is supported if the interval for the share is neither entirely <= 0.25 nor entirely >= 0.75.
//   BANDS: audible share and mean AUC in four FWC32 bands (<0.20, 0.20-0.2795, 0.2795-0.35, >= 0.35) at pairs >= 60 and at pairs >= 250 (FRESH), with clade-cluster intervals; monotone? (Spearman of band index with share).
//   I: for each of cmn, cmn-hans, ind, vie: all observations in any sample (dev, train windows, ext windows, test) with their FWC32, pairs and AUC; 'holds' if >= 75% of eligible observations with pairs >= 60 have AUC >= 0.60 and at least two of the four languages have >= 2 eligible observations.
//   LOW-WITH-PAIR-CONTROL: among FRESH observations with pairs >= 150 only, the audible share for FWC32 < 0.20 versus 0.20-0.2795 (is the low side low because of fewer pairs?).
// BLIND PREDICTIONS (my priors). L FAILS (P 0.85; FRESH audible share below 0.20 about 0.40-0.55). M supported (P 0.8). Bands: monotone increasing in share (P 0.8). I holds for cmn and ind, vie too thin: overall I holds (P 0.55).
// REGISTERED CAVEATS. Very few languages below 0.20 (kaz, kat, lit, tam, uig, fin, tur, kor): the intervals are wide; extension windows of one language are not independent; ancient and modern texts mix in set A.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { RESULTS, CONF_DIR, AUDIBLE, confirmRows, eligible, round, mean, share, quantile, headerSha, mulberry, spearman } from "./common.mjs";
const SHA = headerSha(import.meta.url), [mode] = process.argv.slice(2);
const CLADE = { eng: "Germanic", deu: "Germanic", nld: "Germanic", swe: "Germanic", dan: "Germanic", nob: "Germanic", afr: "Germanic", is: "Germanic", fao: "Germanic", got: "Germanic", spa: "Romance", fra: "Romance", ita: "Romance", por: "Romance", ron: "Romance", cat: "Romance", glg: "Romance", lat: "Romance",
  rus: "Slavic", ukr: "Slavic", pol: "Slavic", ces: "Slavic", slk: "Slavic", slv: "Slavic", hrv: "Slavic", srp: "Slavic", bul: "Slavic", be: "Slavic", chu: "Slavic", cym: "Celtic", gle: "Celtic", lav: "Baltic", lit: "Baltic", ell: "Hellenic", grc: "Hellenic", fas: "Indo-Iranian", hin: "Indo-Iranian", urd: "Indo-Iranian", mar: "Indo-Iranian",
  hye: "Armenian", arb: "Afroasiatic", heb: "Afroasiatic", mlt: "Afroasiatic", cop: "Afroasiatic", fin: "Uralic", est: "Uralic", hun: "Uralic", tur: "Turkic", kaz: "Turkic", uig: "Turkic", cmn: "Sinitic", "cmn-hans": "Sinitic", lzh: "Sinitic", tam: "Dravidian", tel: "Dravidian", wol: "Niger-Congo", yor: "Niger-Congo",
  ind: "Austronesian", vie: "Austroasiatic", kat: "Kartvelian", eus: "Basque", jpn: "Japonic", kor: "Koreanic" };
const clade = (s) => CLADE[s] ?? "?" + s, ok = (pos) => pos >= 0.45 && pos <= 0.55;
function observations() {
  const fresh = [], fit = [], all = [];
  for (const r of confirmRows()) if (eligible(r)) { const o = { stem: r.stem, set: r.set, fwc: r.fwc32, pairs: r.pairs, auc: r.auc, src: "train" }; (r.set === "C" ? fit : fresh).push(o); all.push(o); }
  const d = path.join(CONF_DIR, "results", "ext"); for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".json"))) { const e = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); for (const w of e.windows ?? []) if (w.pairs >= 60 && w.auc != null && ok(w.position)) { const o = { stem: e.stem, set: e.set, fwc: w.fwc32, pairs: w.pairs, auc: w.auc, src: "ext" }; (e.set === "C" ? fit : fresh).push(o); all.push(o); } }
  for (const [f, set] of [["confirm.new.test.json", "new"], ["confirm.old.test.json", "old"]]) for (const r of JSON.parse(fs.readFileSync(path.join(CONF_DIR, "..", "company-moderators", "results", f), "utf8")).rows) if (r.LATER && !r.LATER.thin && ok(r.LATER.position)) { const o = { stem: r.stem, set, fwc: r.fwc32, pairs: r.LATER.pairs, auc: r.LATER.auc, src: "test" }; (set === "new" ? fresh : fit).push(o); all.push(o); }
  const own = JSON.parse(fs.readFileSync(path.join(CONF_DIR, "..", "..", "results/name-company-pairblocks/own.json"), "utf8")), fz = JSON.parse(fs.readFileSync(path.join(CONF_DIR, "..", "company-moderators", "results", "frozen.dev.json"), "utf8")).models.LATER_M1.devClassAtT;
  for (const x of fz) if (!own[x.l]?.LATER?.POSITION || ok(own[x.l].LATER.POSITION)) { const o = { stem: x.l, set: "dev", fwc: x.fwc, pairs: x.pairs, auc: x.auc, src: "dev" }; fit.push(o); all.push(o); }
  return { fresh, fit, all };
}
const BANDS = [["<0.20", 0, 0.2], ["0.20-0.2795", 0.2, 0.2795], ["0.2795-0.35", 0.2795, 0.35], [">=0.35", 0.35, 9]];
const inBand = (o, b) => o.fwc >= b[1] && o.fwc < b[2];
function boot(obs, stat, key, B = 4000, seed = 23) { const g = new Map(); for (const o of obs) (g.get(key(o)) ?? g.set(key(o), []).get(key(o))).push(o); const ks = [...g.keys()], r = mulberry(seed), v = [];
  for (let b = 0; b < B; b++) { const s = []; for (let k = 0; k < ks.length; k++) s.push(...g.get(ks[Math.floor(r() * ks.length)])); const x = stat(s); if (x != null) v.push(x); }
  const s = (p) => { const a = v.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1))] : null; }; return { point: round(stat(obs), 3), lo: round(s(0.025), 3), hi: round(s(0.975), 3), clusters: ks.length }; }
const aud = (s) => (s.length ? share(s, (o) => o.auc >= AUDIBLE) : null), mAuc = (s) => (s.length ? mean(s.map((o) => o.auc)) : null);
if (mode === "analyse") {
  const { fresh, fit, all } = observations(), R = { headerSha256: SHA, generated: new Date().toISOString(), n: { fresh: fresh.length, fit: fit.length }, bands: {} };
  for (const [name, floor] of [["pairs>=60", 60], ["pairs>=150", 150], ["pairs>=250", 250]]) { R.bands[name] = {};
    for (const b of BANDS) { const s = fresh.filter((o) => o.pairs >= floor && inBand(o, b)), f2 = fit.filter((o) => o.pairs >= floor && inBand(o, b));
      R.bands[name][b[0]] = { n: s.length, languages: new Set(s.map((o) => o.stem)).size, audibleShare: round(aud(s), 3), meanAuc: round(mAuc(s)), cladeBootShare: s.length ? boot(s, aud, (o) => clade(o.stem)) : null, langBootShare: s.length ? boot(s, aud, (o) => o.stem) : null, fitN: f2.length, fitAudibleShare: round(aud(f2), 3) }; }
    const s = fresh.filter((o) => o.pairs >= floor); R.bands[name].spearmanFwcAuc = round(spearman(s.map((o) => o.fwc), s.map((o) => o.auc)), 3); R.bands[name].n = s.length; }
  const low = fresh.filter((o) => o.pairs >= 60 && o.fwc < 0.2), lowCl = low.length ? boot(low, aud, (o) => clade(o.stem)) : null;
  R.L = { n: low.length, languages: [...new Set(low.map((o) => o.stem))], audibleShare: round(aud(low), 3), cladeBoot: lowCl, rows: low.map((o) => `${o.stem}:${o.src}:${o.fwc}/${o.pairs}/${o.auc}`), pass: low.length >= 3 && aud(low) <= 0.25 && lowCl.hi < 0.5 };
  const m = fresh.filter((o) => o.pairs >= 60 && inBand(o, BANDS[1])), mc = m.length ? boot(m, aud, (o) => clade(o.stem)) : null; R.M = { n: m.length, audibleShare: round(aud(m), 3), cladeBoot: mc, mixedSupported: mc ? !(mc.hi <= 0.25 || mc.lo >= 0.75) : null };
  const f150 = fresh.filter((o) => o.pairs >= 150); R.lowWithPairControl = { "<0.20": { n: f150.filter((o) => o.fwc < 0.2).length, share: round(aud(f150.filter((o) => o.fwc < 0.2)), 3) }, "0.20-0.2795": { n: f150.filter((o) => inBand(o, BANDS[1])).length, share: round(aud(f150.filter((o) => inBand(o, BANDS[1]))), 3) } };
  const iso = {}; for (const l of ["cmn", "cmn-hans", "ind", "vie"]) { const s = all.filter((o) => o.stem === l && o.pairs >= 60); iso[l] = { n: s.length, audibleShare: round(aud(s), 3), rows: s.map((o) => `${o.src}:${o.fwc}/${o.pairs}/${o.auc}`) }; }
  const withObs = Object.entries(iso).filter(([, v]) => v.n >= 2), allIso = all.filter((o) => ["cmn", "cmn-hans", "ind", "vie"].includes(o.stem) && o.pairs >= 60);
  R.I = { languages: iso, pooledAudibleShare: round(aud(allIso), 3), nObs: allIso.length, languagesWithGe2: withObs.length, holds: withObs.length >= 2 && aud(allIso) >= 0.75, note: "cmn and cmn-hans are the same corpus" };
  fs.writeFileSync(path.join(RESULTS, "B2.summary.json"), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
}
