// attackW.mjs: ATTACK W (FRESH-WINDOW REPLICATION BY THE ATTACKER) on rule R2-later-both-fwc32.   modes:  win STEM... | summary
//   (always run with NAME_COMPANY_PAIRBLOCK=1; never pass "run" as the first argument of name-company.mjs; this script is not name-company.mjs)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══
// DISCLOSURE. SEEN: the rule, the confirmer's scripts and ALL its results (62 primary windows, 154 extension windows), the scoper's dev and test results, and all my own results: attackA (matching, tie, unique form, interior, no-PROPN), attackA2 (punctuation kept,
//   negative class restricted), attackB (forking paths: PRIMARY 9/12, FRESH stacked in-scope share 0.78, lift +0.165 with an interval touching 0; window-level fresh in-scope share 0.77, lift +0.17), attackB2 (fresh windows by FWC32 band: pairs >= 250 audible share
//   <0.20: 0.20, 0.20-0.2795: 0.46, 0.2795-0.35: 0.57, >= 0.35: 0.87; Spearman 0.32-0.49). NOT SEEN: any window from this script's candidate list.
// WHAT IS DONE. New windows for the NEVER-FITTED languages (sets A and B of the confirmer): the candidate blocks (>= 20,000 tokens, built exactly as extend.mjs extraWindows builds them: same files, same dedupe against ud-eval dev/test, same exclusion of the primary window
//   and of the sibling R1 window, same seeded shuffle rngFor(seedFor("confirm-R2-ext", stem, "pick"))) are taken from position 5 onward: the confirmer's extension used positions 0-4, so positions 5..10 (at most 6 windows per language) are TOKEN-DISJOINT from the primary window, the extension windows
//   and the R1 window. Per window: FWC32 (punctuation dropped, as the rule), the confirmer's pipeline (my pairs.mjs orig mode, reproducing it to 0.0015: attackA repro), <= 600 pairs LATER, BOTH and POSITION CV AUC. Eligible = pairs >= 60 and POSITION in [0.45, 0.55].
//   These windows come from the same treebanks (same genre) as the earlier windows: they are fresh TEXT, not fresh genres; languages are the same as PRIMARY.
// TESTS (fixed now; may be tightened, never loosened). IN = FWC32 >= 0.2795 and pairs >= 250; BIG = pairs >= 250 (eligible). Audible = AUC >= 0.60. Intervals: language-cluster bootstrap (B = 4000; a language's windows resampled together); clade-cluster reported (clades as attackB).
//   W1 SUFFICIENT CONDITION ON NEW WINDOWS: audible share among IN windows >= 0.70 AND language-cluster lower 95% bound >= 0.55.
//   W2 LIFT OVER THE PAIR FLOOR: share(IN audible) - share(BIG audible) has a language-cluster lower 95% bound > 0.
//   W3 THE 0.35 SPLIT (a replication of an exploratory band result of attackB2, not a search): among BIG windows, share audible with FWC32 >= 0.35 must be >= 0.80 AND share with 0.2795 <= FWC32 < 0.35 must be < 0.70 (points).
//   W4 LOW SIDE: among eligible windows (pairs >= 60) with FWC32 < 0.20: audible share <= 0.25 (reported with its interval; needs >= 5 windows).
//   W5 DESCRIPTIVE: Spearman(FWC32, AUC) over eligible windows; the same restricted to BIG; per-language means for languages with >= 3 new windows.
// BLIND PREDICTIONS (my priors). W1 point 0.75 (0.60-0.88); P(pass) 0.50. W2 point +0.12; P(pass) 0.40. W3 share >= 0.35: 0.85 (P(>= 0.80) 0.65); share 0.2795-0.35: 0.55 (P(< 0.70) 0.70); P(both) 0.45. W4 FAILS (P 0.70), share ~0.35.
// REGISTERED CAVEATS. Same treebanks as the earlier windows (genre shared); only large treebanks have >= 6 candidate blocks, so the languages are the big-treebank subset of A+B; windows within a language are not independent; relatives not independent; the FWC32 of a window is its own.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { RESULTS, CONF_DIR, UD, AUDIBLE, TSCOPE, readConllu, fwcK, rngFor, seedFor, shuffleIn, round, mean, share, headerSha, cvAucX, mulberry, spearman } from "./common.mjs";
import { buildPairs } from "./pairs.mjs";
const OUT = path.join(RESULTS, "W"); fs.mkdirSync(OUT, { recursive: true });
const SHA = headerSha(import.meta.url), [mode, ...rest] = process.argv.slice(2), EO = "/Users/mlacy/Documents/EO Testing/EO Embedding testing/data/ud", TARGET = 20000, SKIP = 5, TAKE = 6;
const W = JSON.parse(fs.readFileSync(path.join(CONF_DIR, "windows.json"), "utf8"));
const blocksOf = (sents) => { const bl = []; let s = 0; while (s < sents.length) { let e = s, t = 0; while (e < sents.length && t < TARGET) { t += sents[e].length; e += 1; } if (t < TARGET) break; bl.push([s, e]); s = e; } return bl; };
const dupKeys = (stem) => { const s = new Set(); for (const sp of ["dev", "test"]) for (const x of readConllu(path.join(UD, stem, sp + ".conllu")).sents) s.add(x.join(" ")); return s; };
const OPEN = new Set(["NOUN", "VERB", "ADJ"]);
function candidates(stem) { // identical to extend.mjs extraWindows, before its slice
  const w = W[stem]; if (!w || w.error) return [];
  const files = w.set === "A" ? (["kaz", "yor"].includes(stem) ? [] : ["train", "dev", "test"].map((sp) => path.join(EO, path.basename(path.dirname(w.source)), `${path.basename(path.dirname(w.source))}-ud-${sp}.conllu`)).filter((f) => fs.existsSync(f))) : [w.source];
  const cand = [], D = w.set === "A" ? null : dupKeys(stem);
  for (const f of files) { const t = readConllu(f); for (const [s, e] of blocksOf(t.sents)) {
    if (f === w.source && !(e <= w.offset || s >= w.offset + w.taken)) continue;
    if (w.set !== "A" && w.r1Taken != null && !(e <= w.r1Offset || s >= w.r1Offset + w.r1Taken)) continue;
    let sents = t.sents.slice(s, e), upos = t.upos.slice(s, e); if (D) { const keep = sents.map((x) => !D.has(x.join(" "))); sents = sents.filter((_, i) => keep[i]); upos = upos.filter((_, i) => keep[i]); }
    cand.push({ source: f, s, e, sents, upos }); } }
  return shuffleIn(cand, rngFor(seedFor("confirm-R2-ext", stem, "pick")));
}
const mkDoc = (stem, sents, upos) => { const n = sents.length; return { name: stem, stream: sents, cls: (s, i) => (upos[s][i] === "PROPN" ? "P" : OPEN.has(upos[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) }; };
if (mode === "win") for (const stem of rest) {
  const f = path.join(OUT, stem + ".json"); if (fs.existsSync(f)) { console.error(stem, "exists"); continue; } const t0 = Date.now();
  try { const all = candidates(stem), pick = all.slice(SKIP, SKIP + TAKE), out = { stem, set: W[stem].set, headerSha256: SHA, nCandidates: all.length, windows: [] };
    pick.forEach((x, k) => { const doc = mkDoc(stem, x.sents, x.upos), pr = buildPairs(doc, "LATER", rngFor(seedFor("attackR2-W", stem, "pairs", k)), { mode: "orig" }), o = { rank: SKIP + k, source: path.basename(x.source), s: x.s, e: x.e, tokens: x.sents.reduce((t, a) => t + a.length, 0), fwc32: round(fwcK(x.sents, 32)), pairs: pr.pairs };
      if (pr.pairs >= 60) { o.auc = round(cvAucX(pr.rows, "BOTH")); o.position = round(cvAucX(pr.rows, "POSITION")); } out.windows.push(o); });
    out.seconds = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(f, JSON.stringify(out)); console.error(stem, out.set, "cand", all.length, out.windows.map((o) => `${o.fwc32}/${o.pairs}/${o.auc ?? "-"}`).join(" "), out.seconds + "s");
  } catch (e) { console.error(stem, "ERROR", String(e).slice(0, 300)); fs.writeFileSync(f + ".error", String(e.stack ?? e)); }
}
const CLADE = { afr: "Germanic", dan: "Germanic", nob: "Germanic", is: "Germanic", fao: "Germanic", got: "Germanic", cat: "Romance", glg: "Romance", lat: "Romance", ron: "Romance", ces: "Slavic", slk: "Slavic", slv: "Slavic", hrv: "Slavic", srp: "Slavic", bul: "Slavic", be: "Slavic", chu: "Slavic",
  cym: "Celtic", gle: "Celtic", lav: "Baltic", lit: "Baltic", grc: "Hellenic", hye: "Armenian", mlt: "Afroasiatic", cop: "Afroasiatic", est: "Uralic", hun: "Uralic", kaz: "Turkic", uig: "Turkic", lzh: "Sinitic", tam: "Dravidian", tel: "Dravidian", wol: "Niger-Congo", yor: "Niger-Congo", kat: "Kartvelian", eus: "Basque", mar: "Indo-Iranian" };
if (mode === "summary") {
  const obs = []; for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith(".json"))) { const o = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); for (const w of o.windows) if (w.pairs >= 60 && w.auc != null && w.position >= 0.45 && w.position <= 0.55) obs.push({ stem: o.stem, set: o.set, fwc: w.fwc32, pairs: w.pairs, auc: w.auc, rank: w.rank }); }
  const aud = (s) => (s.length ? share(s, (o) => o.auc >= AUDIBLE) : null), big = obs.filter((o) => o.pairs >= 250), inn = big.filter((o) => o.fwc >= TSCOPE), cl = (o) => CLADE[o.stem] ?? "?" + o.stem;
  const boot = (s, stat, key, B = 4000, seed = 41) => { const g = new Map(); for (const o of s) (g.get(key(o)) ?? g.set(key(o), []).get(key(o))).push(o); const ks = [...g.keys()], r = mulberry(seed), v = [];
    for (let b = 0; b < B; b++) { const x = []; for (let k = 0; k < ks.length; k++) x.push(...g.get(ks[Math.floor(r() * ks.length)])); const y = stat(x); if (y != null && Number.isFinite(y)) v.push(y); } v.sort((a, c) => a - c); const qq = (p) => (v.length ? v[Math.min(v.length - 1, Math.max(0, Math.ceil(p * v.length) - 1))] : null); return { point: round(stat(s), 3), lo: round(qq(0.025), 3), hi: round(qq(0.975), 3), clusters: ks.length }; };
  const liftStat = (s) => { const b = s.filter((o) => o.pairs >= 250), a = b.filter((o) => o.fwc >= TSCOPE); return a.length ? aud(a) - aud(b) : null; };
  const inStat = (s) => aud(s.filter((o) => o.pairs >= 250 && o.fwc >= TSCOPE)), mid = (s) => aud(s.filter((o) => o.pairs >= 250 && o.fwc >= TSCOPE && o.fwc < 0.35)), hi = (s) => aud(s.filter((o) => o.pairs >= 250 && o.fwc >= 0.35));
  const R = { headerSha256: SHA, generated: new Date().toISOString(), windows: obs.length, languages: new Set(obs.map((o) => o.stem)).size, big: big.length, inScope: inn.length, inScopeLanguages: [...new Set(inn.map((o) => o.stem))] };
  R.W1 = { audibleIn: inn.filter((o) => o.auc >= AUDIBLE).length, nIn: inn.length, share: round(aud(inn), 3), langBoot: boot(obs, inStat, (o) => o.stem), cladeBoot: boot(obs, inStat, cl), pass: inn.length > 0 && aud(inn) >= 0.7 && boot(obs, inStat, (o) => o.stem).lo >= 0.55 };
  R.W2 = { baseRate: round(aud(big), 3), lift: boot(obs, liftStat, (o) => o.stem), cladeLift: boot(obs, liftStat, cl) }; R.W2.pass = R.W2.lift.lo > 0;
  R.W3 = { nHigh: big.filter((o) => o.fwc >= 0.35).length, shareHigh: round(hi(obs), 3), nMid: big.filter((o) => o.fwc >= TSCOPE && o.fwc < 0.35).length, shareMid: round(mid(obs), 3), langBootHigh: boot(obs, hi, (o) => o.stem), langBootMid: boot(obs, mid, (o) => o.stem) }; R.W3.pass = R.W3.shareHigh >= 0.8 && R.W3.shareMid < 0.7;
  const low = obs.filter((o) => o.fwc < 0.2); R.W4 = { n: low.length, languages: [...new Set(low.map((o) => o.stem))], share: round(aud(low), 3), pass: low.length >= 5 ? aud(low) <= 0.25 : "NOT EVALUABLE" };
  R.W5 = { spearmanAll: round(spearman(obs.map((o) => o.fwc), obs.map((o) => o.auc)), 3), spearmanBig: round(spearman(big.map((o) => o.fwc), big.map((o) => o.auc)), 3), perLanguage: [...new Set(obs.map((o) => o.stem))].sort().map((s) => { const v = obs.filter((o) => o.stem === s); return { stem: s, n: v.length, meanFwc: round(mean(v.map((o) => o.fwc))), meanPairs: Math.round(mean(v.map((o) => o.pairs))), meanAuc: round(mean(v.map((o) => o.auc))), aucs: v.map((o) => o.auc) }; }) };
  R.inScopeWindows = inn.map((o) => `${o.stem}:${o.fwc}/${o.pairs}/${o.auc}`);
  fs.writeFileSync(path.join(RESULTS, "W.summary.json"), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
}
