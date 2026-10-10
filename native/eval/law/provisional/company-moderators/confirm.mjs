// confirm.mjs: CONFIRMATION of the two company-moderator rules on UD test.conllu.   modes:  sanity | collect new|old OUT.json | verdict NEW.json OLD.json OUT.json
//   (always run with NAME_COMPANY_PAIRBLOCK=1; never pass "run" as the first argument of name-company.mjs; this script is not name-company.mjs)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══
// DISCLOSURE. Seen before this header: all dev results of this lens (moderators.dev.json: FWC32 best single moderator, skill 0.245 LATER / 0.231 FIRST, p 0.0005 / 0.001; robust.dev.json: survives
//   leave-one-clade-out, dropping cmn-hans, K sweep; fixed-score.dev.json: S3 at FIRST in-scope mean 0.633, S2 0.592, S1 0.579, LATER fixed scores weak) and the dev own-language AUCs of the 25 stems.
//   NOT seen: any test.conllu of any language (none has been opened by any script of this lens); anything at all for the 28 NEW languages (no AUC, no descriptor, no PROPN count).
//   Because M1 and M3 were suggested by looking at the dev AUC table, the dev regression cannot confirm them; this file can.
// FROZEN INPUTS (results/frozen.dev.json, sha256 b11fd69fb9aed6c8e0773ae84ba6bdcddc69512b3eee07f1200271d08cfc12f3; moderators-prereg.txt sha256 81293b19b4b03a212de3988f09684de56abdd7fb2b030f5ba30155d967142df1):
//   FWC32 scope thresholds T_FIRST = 0.2378, T_LATER = 0.2795 (the FWC32 at which the dev M1-only OLS predicts AUC 0.60). Dev mean AUC (the no-moderator baseline): FIRST 0.62359, LATER 0.61537.
//   FIRST model: AUC = 0.623591 + 0.038715 * (FWC32 - 0.303335) / 0.107580.  LATER model: AUC = 0.615373 + 0.037707 * (FWC32 - 0.313932) / 0.097050 + 0.033284 * (log2 pairs - 8.195517) / 1.071844.
// DATA. PRIMARY = test.conllu of 28 languages never used by name-company: afr bul cat ces cym dan est eus gle glg hrv hun hye kat lav lit lzh mar mlt nob ron slk slv srp tam tel uig wol.
//   SECONDARY = test.conllu of the 25 name-company stems (same languages, new text; no verdict can come from it alone). Pipeline = name-company's own (pairsOf with NAME_COMPANY_PAIRBLOCK=1, same
//   features, ridge-logistic, 4 sentence-quartile blocks, leave-block-out CV), seeded rngFor(seedFor("company-moderators", stem, "test")), <= 600 pairs. The sanity mode first re-computes dev eng and fra
//   with name-company's seeds and must reproduce own.json to 3 decimals (else the run is invalid).
// OBSERVABLES AT READING TIME: FWC32 (share of tokens in the stream's 32 commonest forms) as the scope variable; the probe uses only frequency-rank bins of the 4 neighbours (name-company arms LEFT at FIRST,
//   BOTH at LATER; the probe is a fitted EXISTENCE TEST, labelled as such); the fixed scores S1 = b(left1), S2 = b(left1)+b(left2) (causal), S3 = S2 + b(right1)+b(right2) (lookahead), higher = more name-like,
//   direction fixed. No capital, POS, list, treebank label or speaker field is a feature. Gold UPOS (PROPN vs NOUN/VERB/ADJ) selects and evaluates only.
// ELIGIBLE language-stratum: >= 60 matched pairs AND the POSITION arm (matched out, same CV) in [0.45, 0.55] (else VOID for that language-stratum, counted and listed). If fewer than 8 eligible, the rule is VOID.
// RULE R1 (single mention, causal): "In written treebank text with FWC32 >= 0.2378, the LEFT-company probe at FIRST mention has AUC >= 0.60; below 0.2378 it does not."  Stratum FIRST, arm LEFT.
// RULE R2 (repeat mention): "In written treebank text with FWC32 >= 0.2795 and >= 250 matched pairs, the BOTH-company probe at LATER mention has AUC >= 0.60; below 0.2795 it does not." Stratum LATER, arm BOTH.
// PASS/FAIL (PRIMARY set; every clause fixed now). For rule X in {R1, R2}, over ELIGIBLE languages:
//   (a) DIRECTION: Spearman(FWC32, AUC) >= +0.40 and a one-sided permutation p <= 0.05 (B = 2000 permutations of the AUC vector).
//   (b) FROZEN SKILL: skill = 1 - RMSE(frozen model) / RMSE(dev-mean baseline) >= 0.10 (R1: FIRST model; R2: LATER model with the language's own pair count).
//   (c) SCOPE HIT RATE among eligible languages with >= 250 pairs: in-scope (FWC32 >= T) share with AUC >= 0.60 is >= 0.70 (needs >= 4 in-scope languages, else clause (c) is NOT EVALUABLE and the rule cannot PASS);
//       out-of-scope share with AUC >= 0.60 is <= 0.50 (needs >= 3 out-of-scope languages, else this half is reported but does not block).
//   (d) SEPARATION: mean AUC in-scope minus out-of-scope >= 0.04 over all eligible languages (needs >= 3 each side, else NOT EVALUABLE and the rule cannot PASS).
//   VERDICT: PASS iff (a)(b)(c)(d) all hold; PARTIAL iff (a) holds and at least one of (b)(d) holds but not PASS; FAIL otherwise; VOID as above. The PRIMARY verdict is the rule's verdict.
//   SECONDARY set: the same clauses are computed and reported, plus Spearman(dev AUC, test AUC) across the 25 stems as a reliability figure; they cannot raise a PRIMARY FAIL or PARTIAL to PASS.
// FIXED-SCORE SUB-RULES (zero-shot; PRIMARY set; stratum FIRST; each eligible language contributes its paired AUC): R1-S2 PASS iff in-scope (FWC32 >= 0.2378) mean paired AUC >= 0.55 AND in-scope share with
//   paired AUC > 0.50 >= 0.75 AND in-scope minus out-of-scope mean >= 0.02 (>= 4 in-scope, >= 3 out-of-scope languages needed). R1-S3 (lookahead): mean >= 0.58, share > 0.50 >= 0.75, difference >= 0.04.
//   Reported also at LATER (no pass/fail; they failed on dev). These are sub-tests of R1, not additional rules.
// BLIND PREDICTIONS (priors written now): languages with small function-word coverage (hun est eus uig tam tel mar kat lav lit ces slk slv hrv srp, where function is carried by suffixes) will have FIRST AUC
//   mostly < 0.60; analytic ones (cat glg ron afr dan nob bul) will be at or above 0.60. P(R1 PASS) about 0.55, P(R2 PASS) about 0.40 (R2 is more fragile: it needs repeated names, so fewer eligible languages, and
//   it depends on the pair-count term). Frozen-model skill on new languages will be smaller than on dev (shrinkage), probably 0.05-0.20. The fixed score S2 will be weaker than S3 and may fail its sub-rule.
//   Registered CAVEATS: the new languages include relatives of dev languages (Romance, Slavic, Germanic) so the test is partly a relatedness test; a PASS still leaves "FWC32" standing for a correlated bundle
//   (analytic morphology, tokenisation, treebank genre), not for a mechanism; the set is written text, and the rule is NOT claimed for chat (IRC: FWC32 0.33 yet FIRST AUC 0.526).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pairsOf, ARMS } from "../../name-company.mjs";
import { rngFor, seedFor } from "../../impact.mjs";
import { fitLogit, predict, standardise, aucOf } from "../../name-war-and-peace.mjs";
import { SCORES, pairedAuc } from "./fixed-score.mjs";
import { UD, readConllu, round, mean, headerSha } from "./util.mjs";
import { spearman, shuffleIn, mulberry, rmse } from "./stats.mjs";
if (process.env.NAME_COMPANY_PAIRBLOCK !== "1") throw new Error("set NAME_COMPANY_PAIRBLOCK=1");
const HERE = path.dirname(fileURLToPath(import.meta.url)), LAW = path.join(HERE, "..", "..");
const NEW = "afr bul cat ces cym dan est eus gle glg hrv hun hye kat lav lit lzh mar mlt nob ron slk slv srp tam tel uig wol".split(" ");
const OLD = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
const OPEN = new Set(["NOUN", "VERB", "ADJ"]), ARM = { LATER: "BOTH", FIRST: "LEFT" }, T = { FIRST: 0.2378, LATER: 0.2795 }, DEVMEAN = { FIRST: 0.62359, LATER: 0.61537 };
const MODEL = { FIRST: (f) => 0.623591 + (0.038715 * (f.fwc - 0.303335)) / 0.10758, LATER: (f) => 0.615373 + (0.037707 * (f.fwc - 0.313932)) / 0.09705 + (0.033284 * (Math.log2(f.pairs) - 8.195517)) / 1.071844 };
function cvAuc(rows, arm) { // identical to name-company.mjs cvScoresLocal + cvAuc (not exported there)
  const X = rows.map((r) => ARMS[arm](r.f)), y = rows.map((r) => r.y), block = rows.map((r) => r.block), out = new Array(X.length).fill(null);
  for (const b of new Set(block)) { const tr = [], te = []; block.forEach((bb, r) => (bb === b ? te : tr).push(r)); if (!te.length || new Set(tr.map((r) => y[r])).size < 2) continue;
    const [Xtr, Xte] = standardise(tr.map((r) => X[r]), te.map((r) => X[r])); if (!Xtr[0]?.length) continue; const w = fitLogit(Xtr, tr.map((r) => y[r])); te.forEach((r, k) => { out[r] = predict(w, Xte[k]); }); }
  return aucOf(out, y);
}
function docOf(stem, split) {
  const S = readConllu(`${UD}/${stem}/${split}.conllu`), n = S.length, c = new Map(); let tok = 0; for (const s of S) for (const w of s.w) { c.set(w, (c.get(w) ?? 0) + 1); tok += 1; }
  const top = new Set([...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 32).map((x) => x[0])); let fw = 0; for (const s of S) for (const w of s.w) if (top.has(w)) fw += 1;
  return { doc: { name: stem, stream: S.map((s) => s.w), cls: (s, i) => (S[s].upos[i] === "PROPN" ? "P" : OPEN.has(S[s].upos[i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) }, fwc: fw / tok, tokens: tok, sentences: n };
}
function rowOf(stem, split, seedTag, rnd0) {
  const { doc, fwc, tokens, sentences } = docOf(stem, split), r = rnd0 ?? rngFor(seedFor(...seedTag)), pr = { LATER: pairsOf(doc, "LATER", r), FIRST: pairsOf(doc, "FIRST", r) }, row = { stem, split, fwc32: round(fwc), tokens, sentences };
  for (const st of ["LATER", "FIRST"]) { const p = pr[st], o = { pairs: p.pairs, dropped: p.dropped, thin: p.pairs < 60 }; if (!o.thin) { o.auc = round(cvAuc(p.rows, ARM[st])); o.position = round(cvAuc(p.rows, "POSITION")); for (const [k, fn] of Object.entries(SCORES)) o[k] = round(pairedAuc(p.rows, fn).auc); } row[st] = o; }
  return row;
}
// ── verdicts ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const share = (xs, f) => (xs.length ? xs.filter(f).length / xs.length : null);
function permP(a, b, B = 2000, seed = 4242) { const rho = spearman(a, b), r = mulberry(seed); let ge = 0; for (let k = 0; k < B; k++) if (spearman(a, shuffleIn(b.slice(), r)) >= rho - 1e-12) ge += 1; return { rho, p: (ge + 1) / (B + 1) }; }
function evalRule(rows, st) {
  const live = rows.filter((r) => r[st] && !r[st].thin), el = live.filter((r) => r[st].position >= 0.45 && r[st].position <= 0.55), voided = live.filter((r) => !(r[st].position >= 0.45 && r[st].position <= 0.55)).map((r) => r.stem + ":" + r[st].position);
  const out = { stratum: st, arm: ARM[st], languages: rows.length, thin: rows.filter((r) => r[st]?.thin).map((r) => r.stem), voidedControl: voided, eligible: el.length };
  if (el.length < 8) return { ...out, verdict: "VOID", why: "fewer than 8 eligible languages" };
  const auc = el.map((r) => r[st].auc), fw = el.map((r) => r.fwc32), t = T[st], pm = permP(fw, auc), pred = el.map((r) => MODEL[st]({ fwc: r.fwc32, pairs: r[st].pairs }));
  const rb = rmse(auc.map(() => DEVMEAN[st]), auc), rm = rmse(pred, auc), skill = 1 - rm / rb, shift = mean(auc) - mean(pred), skillRecentred = 1 - rmse(pred.map((v) => v + shift), auc) / rmse(auc.map(() => mean(auc)), auc);
  const big = el.filter((r) => r[st].pairs >= 250), ins = big.filter((r) => r.fwc32 >= t), outs = big.filter((r) => r.fwc32 < t);
  const cIn = ins.length >= 4 ? share(ins, (r) => r[st].auc >= 0.6) : null, cOut = outs.length >= 3 ? share(outs, (r) => r[st].auc >= 0.6) : null;
  const insA = el.filter((r) => r.fwc32 >= t), outA = el.filter((r) => r.fwc32 < t), diff = insA.length >= 3 && outA.length >= 3 ? mean(insA.map((r) => r[st].auc)) - mean(outA.map((r) => r[st].auc)) : null;
  const A = pm.rho >= 0.4 && pm.p <= 0.05, Bc = skill >= 0.1, C = cIn != null && cIn >= 0.7 && (cOut == null || cOut <= 0.5), Dc = diff != null && diff >= 0.04;
  const verdict = A && Bc && C && Dc ? "PASS" : A && (Bc || Dc) ? "PARTIAL" : "FAIL";
  const fixed = {}; for (const k of ["S1", "S2", "S3"]) { const mi = insA.length ? mean(insA.map((r) => r[st][k])) : null, mo = outA.length ? mean(outA.map((r) => r[st][k])) : null; fixed[k] = { inMean: round(mi), outMean: round(mo), diff: round(mi != null && mo != null ? mi - mo : null), inShareAbove50: round(share(insA, (r) => r[st][k] > 0.5)), allMean: round(mean(el.map((r) => r[st][k]))), nIn: insA.length, nOut: outA.length }; }
  const sub = (k, m, d) => { const f = fixed[k]; return f.nIn >= 4 && f.nOut >= 3 ? (f.inMean >= m && f.inShareAbove50 >= 0.75 && f.diff >= d ? "PASS" : "FAIL") : "NOT EVALUABLE"; };
  if (st === "FIRST") { fixed.R1_S2 = sub("S2", 0.55, 0.02); fixed.R1_S3 = sub("S3", 0.58, 0.04); }
  return { ...out, verdict, clauses: { a_direction: { rho: round(pm.rho, 3), p: round(pm.p, 4), pass: A }, b_frozenSkill: { skill: round(skill), rmseModel: round(rm), rmseBaseline: round(rb), meanShift: round(shift), skillRecentredDiagnostic: round(skillRecentred), pass: Bc },
    c_scopeHit: { inScopeN: ins.length, inScopeShareAbove60: round(cIn), outScopeN: outs.length, outScopeShareAbove60: round(cOut), pass: C }, d_separation: { nIn: insA.length, nOut: outA.length, diff: round(diff), pass: Dc } },
    meanAuc: round(mean(auc)), shareAbove60: round(share(el, (r) => r[st].auc >= 0.6)), fixedScores: fixed, rows: el.map((r) => ({ stem: r.stem, fwc32: r.fwc32, pairs: r[st].pairs, auc: r[st].auc, pos: r[st].position, pred: round(MODEL[st]({ fwc: r.fwc32, pairs: r[st].pairs })), inScope: r.fwc32 >= t, S1: r[st].S1, S2: r[st].S2, S3: r[st].S3 })) };
}
const [mode, a1, a2, a3] = process.argv.slice(2);
if (mode === "sanity") { // dev only: reproduce name-company's own.json for two languages with its own seeds
  const own = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/own.json"), "utf8")), res = [];
  for (const s of ["eng", "fra"]) { const row = rowOf(s, "dev", null, rngFor(seedFor("name-company", s))); for (const st of ["LATER", "FIRST"]) res.push({ stem: s, st, mine: row[st].auc, own: own[s][st][ARM[st]], positionMine: row[st].position, positionOwn: own[s][st].POSITION, ok: Math.abs(row[st].auc - own[s][st][ARM[st]]) < 0.0015 }); }
  console.log(JSON.stringify(res)); process.exit(res.every((x) => x.ok) ? 0 : 3);
}
if (mode === "collect") {
  const list = a1 === "new" ? NEW : a1 === "old" ? OLD : null; if (!list) throw new Error("collect new|old"); const R = { headerSha256: headerSha(import.meta.url), set: a1, rows: [] };
  for (const s of list) { try { R.rows.push(rowOf(s, "test", ["company-moderators", s, "test"])); const r = R.rows.at(-1); console.error(s, "fwc", r.fwc32, "LATER", r.LATER.pairs, r.LATER.auc ?? "-", "FIRST", r.FIRST.pairs, r.FIRST.auc ?? "-"); } catch (e) { R.rows.push({ stem: s, error: String(e).slice(0, 200) }); console.error(s, "ERROR", String(e).slice(0, 120)); } fs.writeFileSync(a2, JSON.stringify(R)); }
  console.log("collected", a1, R.rows.length);
}
if (mode === "verdict") {
  const NEWR = JSON.parse(fs.readFileSync(a1, "utf8")), OLDR = JSON.parse(fs.readFileSync(a2, "utf8")), own = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/own.json"), "utf8")), V = { headerSha256: headerSha(import.meta.url), primary: {}, secondary: {} };
  for (const st of ["FIRST", "LATER"]) { V.primary[st] = evalRule(NEWR.rows.filter((r) => !r.error), st); V.secondary[st] = evalRule(OLDR.rows.filter((r) => !r.error), st); }
  const pairs = OLDR.rows.filter((r) => !r.error).map((r) => ({ st: "FIRST", s: r.stem })); V.secondary.reliability = {};
  for (const st of ["FIRST", "LATER"]) { const xs = OLDR.rows.filter((r) => !r.error && !r[st].thin && !own[r.stem][st].thin), d = xs.map((r) => own[r.stem][st][ARM[st]]), t = xs.map((r) => r[st].auc); V.secondary.reliability[st] = { n: xs.length, spearmanDevTest: round(spearman(d, t), 3), meanDev: round(mean(d)), meanTest: round(mean(t)) }; }
  fs.writeFileSync(a3, JSON.stringify(V, null, 1)); const brief = (x) => ({ verdict: x.verdict, eligible: x.eligible, thin: x.thin?.length, voided: x.voidedControl?.length, clauses: x.clauses, fixed: x.fixedScores && { R1_S2: x.fixedScores.R1_S2, R1_S3: x.fixedScores.R1_S3 } }); console.log(JSON.stringify({ primary: { FIRST: brief(V.primary.FIRST), LATER: brief(V.primary.LATER) }, secondary: { FIRST: brief(V.secondary.FIRST), LATER: brief(V.secondary.LATER), reliability: V.secondary.reliability } }, null, 1));
}
