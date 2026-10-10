// robust.mjs: POST-HOC robustness of the dev moderator result (dev only; no test file).   node robust.mjs OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══
// STATUS: POST-HOC. Written after results/moderators.dev.json was seen (M1 FWC32 best single moderator, skill 0.245 LATER / 0.231 FIRST; M1+M3 0.46 LATER; M3 sign negative in FIRST).
// It exists to find out whether that result is an artefact, and it asserts no verdict; nothing here can promote a rule (rules are promoted only by confirm.mjs on test).
// DATA: dev only: own.json, descriptors.dev.json, dev.conllu (for the K sweep and the subsample check), ircDocs days (for a register boundary number).
// CHECKS (no thresholds, report only):
//   (1) cmn and cmn-hans are the same text in two scripts, so leave-one-language-out leaks across them: re-run LOLO with cmn-hans dropped.
//   (2) leave-one-CLADE-out (clades fixed here by hand before running: Germanic eng deu nld swe; Romance spa fra ita por; Slavic rus pol ukr; Sinitic cmn cmn-hans; Indo-Iranian fas hin urd;
//       Semitic heb arb; singletons jpn kor tur fin vie ind ell): skill of M1 and M1+M3 (LATER), M1 (FIRST) with the whole clade held out.
//   (3) K sweep: Spearman of FWC_K (K = 8 16 32 64 128 256) with each AUC (K = 32 is the registered one; the others are EXPLORATORY); size sensitivity: FWC32 on the first ~8000 tokens vs all.
//   (4) corpus-size confound: Spearman of FWC32 and of TTR with log2 tokens.
//   (5) register boundary: FWC32 of the 8 IRC days of name-company C3 next to the reported chat AUCs.
// BLIND PREDICTIONS: (1) skill barely moves; (2) skill shrinks but stays > 0 for M1 (clade-level relatedness explains some but not all); (3) rho flat across K 16-128;
//   (4) FWC32 uncorrelated with size (|rho| < 0.3) while TTR strongly anti-correlated; (5) IRC FWC32 is high (chat is function-word heavy) yet its FIRST AUC is near chance.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UD, readConllu, round, mean, headerSha } from "./util.mjs";
import { skillOf, spearman, lolo, rmse, fitOls } from "./stats.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), LAW = path.join(HERE, "..", "..");
const own = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/own.json"), "utf8")), D = JSON.parse(fs.readFileSync(path.join(HERE, "results/descriptors.dev.json"), "utf8")).languages;
const CLADE = { eng: "Germanic", deu: "Germanic", nld: "Germanic", swe: "Germanic", spa: "Romance", fra: "Romance", ita: "Romance", por: "Romance", rus: "Slavic", pol: "Slavic", ukr: "Slavic", cmn: "Sinitic", "cmn-hans": "Sinitic", fas: "IndoIranian", hin: "IndoIranian", urd: "IndoIranian", heb: "Semitic", arb: "Semitic" };
const STR = { LATER: "BOTH", FIRST: "LEFT" }, R = { headerSha256: headerSha(import.meta.url), status: "POST-HOC robustness, dev only", strata: {} };
const feat = (l, st) => [D[l].FWC32, D[l].propn.CHAIN, Math.log2(own[l][st].pairs)];
function loco(langs, y, X, cols) { // hold out whole clades; pooled RMSE of model vs mean-only on the same held-out rows
  const cl = (l) => CLADE[l] ?? l, groups = [...new Set(langs.map(cl))], pm = [], pb = [], ys = [];
  for (const g of groups) { const te = langs.map((l, i) => i).filter((i) => cl(langs[i]) === g), tr = langs.map((l, i) => i).filter((i) => cl(langs[i]) !== g);
    const fit = fitOls(tr.map((i) => cols.map((j) => X[i][j])), tr.map((i) => y[i])), mb = mean(tr.map((i) => y[i])); for (const i of te) { pm.push(fit.predict(cols.map((j) => X[i][j]))); pb.push(mb); ys.push(y[i]); } }
  return { skill: round(1 - rmse(pm, ys) / rmse(pb, ys)), rmseModel: round(rmse(pm, ys)), rmseBase: round(rmse(pb, ys)), groups: groups.length };
}
const fwcK = (S, K, maxTok = Infinity) => { const c = new Map(); let n = 0; const keep = []; for (const s of S) { if (n >= maxTok) break; keep.push(s); n += s.w.length; } for (const s of keep) for (const w of s.w) c.set(w, (c.get(w) ?? 0) + 1);
  const top = new Set([...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, K).map((x) => x[0])); let fw = 0; for (const s of keep) for (const w of s.w) if (top.has(w)) fw += 1; return fw / n; };
const SEL = { LATER: [[0], [0, 2], [2]], FIRST: [[0], [0, 1], [1], [2]] }, NAME = ["M1", "M2", "M3"];
const streams = {}; for (const l of Object.keys(own)) if (D[l]) streams[l] = readConllu(`${UD}/${l}/dev.conllu`);
for (const st of ["LATER", "FIRST"]) {
  const langs = Object.keys(own).filter((l) => !own[l][st].thin && D[l]), y = langs.map((l) => own[l][st][STR[st]]), X = langs.map((l) => feat(l, st)), out = { n: langs.length };
  out.dropCmnHans = {}; const keep = langs.map((l, i) => i).filter((i) => langs[i] !== "cmn-hans"); for (const cols of SEL[st]) out.dropCmnHans[cols.map((j) => NAME[j]).join("+")] = { skill: round(skillOf(keep.map((i) => cols.map((j) => X[i][j])), keep.map((i) => y[i])).skill), full: round(skillOf(X.map((r) => cols.map((j) => r[j])), y).skill) };
  out.leaveOneCladeOut = {}; for (const cols of SEL[st]) out.leaveOneCladeOut[cols.map((j) => NAME[j]).join("+")] = loco(langs, y, X, cols);
  out.kSweepSpearman = {}; for (const K of [8, 16, 32, 64, 128, 256]) out.kSweepSpearman[K] = round(spearman(langs.map((l) => fwcK(streams[l], K)), y), 3);
  out.fwc32Subsample8000 = { rhoWithAuc: round(spearman(langs.map((l) => fwcK(streams[l], 32, 8000)), y), 3), rhoWithFullFwc32: round(spearman(langs.map((l) => fwcK(streams[l], 32, 8000)), langs.map((l) => D[l].FWC32)), 3) };
  out.sizeConfound = { fwc32_vs_log2tokens: round(spearman(langs.map((l) => D[l].FWC32), langs.map((l) => Math.log2(D[l].tokens))), 3), ttr_vs_log2tokens: round(spearman(langs.map((l) => D[l].TTR), langs.map((l) => Math.log2(D[l].tokens))), 3) };
  R.strata[st] = out;
}
try { const { ircDocs } = await import("../../name-company.mjs"), { seedFor } = await import("../../impact.mjs"); const days = ircDocs(seedFor("name-company", "irc-days")), c3 = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/report.json"), "utf8")).C3;
  const f = days.map((d) => { const c = new Map(); let n = 0; for (const s of d.stream) for (const w of s) { c.set(w, (c.get(w) ?? 0) + 1); n += 1; } const top = new Set([...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 32).map((x) => x[0])); let fw = 0; for (const s of d.stream) for (const w of s) if (top.has(w)) fw += 1; return round(fw / n); });
  R.irc = { days: days.map((d) => d.name), fwc32PerDay: f, fwc32Mean: round(mean(f)), reportedC3: { LATER_BOTH: c3.LATER, FIRST_LEFT: c3.FIRST } }; } catch (e) { R.irc = { error: String(e).slice(0, 200) }; }
fs.writeFileSync(process.argv[2], JSON.stringify(R, null, 1)); console.log("written");
