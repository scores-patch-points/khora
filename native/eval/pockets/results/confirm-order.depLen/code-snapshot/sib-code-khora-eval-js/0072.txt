// attackX.mjs: EXPLORATORY (POST-HOC) ATTACK X on rule R2-later-both-fwc32: is 'historical or ancient text' a better moderator of the in-scope hit rate than the FWC32 threshold?   mode:  analyse
//   (reads results only; never use the mode word "run": name-company.mjs starts main() when process.argv[2] === "run"; run with NAME_COMPANY_PAIRBLOCK=1)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file; STATUS: POST-HOC / EXPLORATORY, motivated by data already seen) ═══
// DISCLOSURE. SEEN before this header: attackW results (fresh windows: in-scope languages cat 6/6 audible, grc 2/2, is 1/5, lat 0/1, lzh 1/3; in-scope share 10/17), the confirmer's primary in-scope misses (got 0.564, lzh 0.577, srp 0.590) and the confirmer's own
//   remark that set A is ancient or Bible-style text; attackB (in-scope audible share 0.78 fresh). The REGISTER LABEL below was chosen by me from what I know of the treebanks AFTER seeing those results: so this is exploratory, creates a forking path of my own,
//   and cannot be a confirmation of anything; it can only name a candidate narrower scope for a future pre-registered test.
// LABEL (fixed now, before the numbers of this script): HISTORICAL = treebanks of ancient or historical text: got (Gothic Bible), grc (Ancient Greek), lat (Latin PROIEL), lzh (Classical Chinese), chu (Old Church Slavonic), cop (Coptic Scriptorium), is (IcePaHC, 12th-21st c.),
//   fao (FarPaHC, historical Faroese). MODERN = every other stem of sets A and B (be, bul, cat, ces, cym, dan, est, eus, gle, glg, hrv, hun, hye, kat, lav, lit, mlt, nob, ron, slk, slv, srp, tam, wol, yor, kaz, afr, mar, tel, uig); set C and DEV languages are all modern (reported separately).
// TESTS (fixed now). Observations = all eligible windows of sets A and B (confirmer primary windows, confirmer extension windows, attackW windows) and TEST-new rows; IN = FWC32 >= 0.2795 and pairs >= 250; audible = AUC >= 0.60.
//   X1 in-scope audible share by register (windows; language-cluster bootstrap B = 4000) and at language level (a language counts once with its mean AUC >= 0.60).   X2 Fisher exact test (language level) of register vs audible among IN languages.
//   X3 out-of-scope: audible share by register at pairs >= 250 (is the low modern-out share what the threshold is really about?).   X4 within MODERN only: audible share for FWC32 >= 0.2795 vs < 0.2795 at pairs >= 250 (does FWC32 separate once register is removed?), language level.
//   A candidate narrower scope is 'worth a pre-registered test' only if X1 shows MODERN in-scope window share >= 0.80 with language-cluster lower bound >= 0.60 AND HISTORICAL in-scope share <= 0.55.
// BLIND PREDICTIONS. X1 MODERN in-scope 0.88, HISTORICAL 0.45; X2 p about 0.10 (few languages); X4 the FWC32 split within modern separates 0.85 vs 0.50 (P 0.6).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { RESULTS, CONF_DIR, AUDIBLE, TSCOPE, confirmRows, eligible, round, mean, share, headerSha, mulberry } from "./common.mjs";
const SHA = headerSha(import.meta.url), [mode] = process.argv.slice(2), HIST = new Set(["got", "grc", "lat", "lzh", "chu", "cop", "is", "fao"]);
const lf = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
function fisher(a, b, c, d) { const n = a + b + c + d, r1 = a + b, c1 = a + c, hyp = (x) => Math.exp(lf(r1) + lf(n - r1) + lf(c1) + lf(n - c1) - lf(n) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(n - r1 - c1 + x)), lo = Math.max(0, c1 - (n - r1)), hi = Math.min(r1, c1), p0 = hyp(a); let p = 0; for (let x = lo; x <= hi; x++) { const px = hyp(x); if (px <= p0 + 1e-12) p += px; } return Math.min(1, p); }
const ok = (p) => p >= 0.45 && p <= 0.55;
function load() {
  const obs = []; for (const r of confirmRows()) if (eligible(r) && r.set !== "C") obs.push({ stem: r.stem, set: r.set, fwc: r.fwc32, pairs: r.pairs, auc: r.auc, src: "primary" });
  for (const [dir, tag] of [[path.join(CONF_DIR, "results", "ext"), "ext"], [path.join(RESULTS, "W"), "W"]]) for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) { const e = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); if (e.set === "C") continue; for (const w of e.windows ?? []) if (w.pairs >= 60 && w.auc != null && ok(w.position)) obs.push({ stem: e.stem, set: e.set, fwc: w.fwc32, pairs: w.pairs, auc: w.auc, src: tag }); }
  for (const r of JSON.parse(fs.readFileSync(path.join(CONF_DIR, "..", "company-moderators", "results", "confirm.new.test.json"), "utf8")).rows) if (r.LATER && !r.LATER.thin && ok(r.LATER.position)) obs.push({ stem: r.stem, set: "new", fwc: r.fwc32, pairs: r.LATER.pairs, auc: r.LATER.auc, src: "test" });
  return obs.map((o) => ({ ...o, hist: HIST.has(o.stem) }));
}
const aud = (s) => (s.length ? share(s, (o) => o.auc >= AUDIBLE) : null);
function boot(obs, stat, B = 4000, seed = 77) { const g = new Map(); for (const o of obs) (g.get(o.stem) ?? g.set(o.stem, []).get(o.stem)).push(o); const ks = [...g.keys()], r = mulberry(seed), v = [];
  for (let b = 0; b < B; b++) { const x = []; for (let k = 0; k < ks.length; k++) x.push(...g.get(ks[Math.floor(r() * ks.length)])); const y = stat(x); if (y != null && Number.isFinite(y)) v.push(y); } v.sort((a, c) => a - c); const q = (p) => (v.length ? v[Math.min(v.length - 1, Math.max(0, Math.ceil(p * v.length) - 1))] : null); return { point: round(stat(obs), 3), lo: round(q(0.025), 3), hi: round(q(0.975), 3), clusters: ks.length }; }
const langLevel = (s) => { const g = new Map(); for (const o of s) (g.get(o.stem) ?? g.set(o.stem, []).get(o.stem)).push(o); return [...g].map(([stem, v]) => ({ stem, hist: v[0].hist, n: v.length, fwc: mean(v.map((o) => o.fwc)), pairs: mean(v.map((o) => o.pairs)), auc: mean(v.map((o) => o.auc)) })); };
if (mode === "analyse") {
  const obs = load(), big = obs.filter((o) => o.pairs >= 250), inn = big.filter((o) => o.fwc >= TSCOPE), out = big.filter((o) => o.fwc < TSCOPE), R = { headerSha256: SHA, generated: new Date().toISOString(), observations: obs.length, languages: new Set(obs.map((o) => o.stem)).size };
  const reg = (s, h) => s.filter((o) => o.hist === h);
  R.X1 = { modern: { windows: reg(inn, false).length, languages: langLevel(reg(inn, false)).length, share: round(aud(reg(inn, false)), 3), boot: boot(reg(inn, false), aud) }, historical: { windows: reg(inn, true).length, languages: langLevel(reg(inn, true)).length, share: round(aud(reg(inn, true)), 3), boot: boot(reg(inn, true), aud) } };
  const li = langLevel(inn), lm = li.filter((l) => !l.hist), lh = li.filter((l) => l.hist), a1 = lm.filter((l) => l.auc >= AUDIBLE).length, a2 = lh.filter((l) => l.auc >= AUDIBLE).length;
  R.X1.languageLevel = { modern: `${a1}/${lm.length}`, historical: `${a2}/${lh.length}`, modernLangs: lm.map((l) => `${l.stem}:${l.fwc.toFixed(2)}/${Math.round(l.pairs)}/${l.auc.toFixed(3)}`), historicalLangs: lh.map((l) => `${l.stem}:${l.fwc.toFixed(2)}/${Math.round(l.pairs)}/${l.auc.toFixed(3)}`) };
  R.X2 = { fisherP: round(fisher(a1, lm.length - a1, a2, lh.length - a2), 4) };
  R.X3 = { outModern: { n: reg(out, false).length, share: round(aud(reg(out, false)), 3) }, outHistorical: { n: reg(out, true).length, share: round(aud(reg(out, true)), 3), langs: [...new Set(reg(out, true).map((o) => o.stem))] } };
  const mod = langLevel(big.filter((o) => !o.hist)), mi = mod.filter((l) => l.fwc >= TSCOPE), mo = mod.filter((l) => l.fwc < TSCOPE), am = mi.filter((l) => l.auc >= AUDIBLE).length, ao = mo.filter((l) => l.auc >= AUDIBLE).length;
  R.X4 = { modernInScopeLanguages: `${am}/${mi.length}`, modernOutLanguages: `${ao}/${mo.length}`, fisherP: round(fisher(am, mi.length - am, ao, mo.length - ao), 4), outLangs: mo.map((l) => `${l.stem}:${l.fwc.toFixed(2)}/${l.auc.toFixed(3)}`) };
  R.candidate = { modernLowerGe60: R.X1.modern.boot.lo >= 0.6, modernShareGe80: R.X1.modern.share >= 0.8, historicalLe55: R.X1.historical.share <= 0.55 }; R.candidate.worthPreregisteredTest = R.candidate.modernLowerGe60 && R.candidate.modernShareGe80 && R.candidate.historicalLe55;
  fs.writeFileSync(path.join(RESULTS, "X.summary.json"), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
}
