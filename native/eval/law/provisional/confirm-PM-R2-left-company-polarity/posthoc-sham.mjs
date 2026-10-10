// confirm-PM-R2-left-company-polarity/posthoc-sham.mjs -- POST HOC (exploratory) SHAM ENSEMBLE: an empirical null distribution of the registered DLx cell from 24 random pseudo-class splits per register. NEW FILE.
//
//   node posthoc-sham.mjs --family ud|irc|book|code [--stems a,b] [--tag t]   -> results/sham.<family>[.tag].jsonl ; summarised by sham-summary.mjs
//
// ═══ PRE-REGISTRATION OF THE POST HOC RUN (written 2026-10-07 BEFORE this file was first run; AFTER the registered run was read) ══════════════════════════════════════════════════════════════
// DISCLOSURE. The registered run used ONE sham split per register (family median |AUC-0.5| <= 0.03 passed in all four families) but single cells deviated: code-py sham 0.579 (CI 0.519-0.639), great-expectations
//   0.565, gl_treegal 0.567, mt_mudt sham 0.432. A single sham cannot tell whether the real code-py AUC 0.618 is outside what a no-information class split produces in that register. This script draws
//   24 sham splits per register (the NEGATIVES of the class split by form-hash parity with tags 'sh0'..'sh23', no name information anywhere) through the REGISTERED pipeline (same pairsOf matching, same features2.DLx, <= 600
//   pairs, <= 3 per form, seeds under 'pm-r2-sham') and reports, per register, the sham AUC distribution and the empirical two-sided p of the registered real AUC: share of shams with |AUC-0.5| >= |real-0.5|, +1 smoothing.
// TEST (decided now). A register's effect is "calibrated" if empirical p <= 0.05. Family summaries: share of calibrated registers and the pooled sham SD. The registered real AUCs are read from results/conf.*.jsonl.
// BLIND PREDICTIONS: code js/py/rb calibrated 3/3 with prob 0.8 (sham SD 0.03-0.05); IRC 3/3: 0.6; books: <= 2 of 6 calibrated (0.7); UD: 20-40% of the 52 windows calibrated (0.7), with the NEG ones dominating.
// ═══ END OF PRE-REGISTRATION ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { headerSha, seedFor, rngFor, round, mean, docOf, formCap, pairsOf, pairAuc, prep } from "../polarity-map/lib.mjs";
import { features2 } from "../polarity-map/lib2.mjs";
import * as R from "../polarity-map/registers.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HDR = headerSha(fileURLToPath(import.meta.url)), family = opt("--family"), tag = opt("--tag", ""), NS = 24;
const OUT = path.join(HERE, "results", `sham.${family}${tag ? "." + tag : ""}.jsonl`), SP = "pm-r2-sham";
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR.slice(0, 16), ...o }) + "\n");
const MAN = JSON.parse(fs.readFileSync(path.join(HERE, "data", "manifest.json"), "utf8"));
function cellAuc(bases, def, ctag, maxPairs = 600) {
  const rows = [], per = Math.ceil(maxPairs / bases.length);
  for (const b of bases) { const r = rngFor(seedFor(SP, ctag, b.name, "pairs")), pr = pairsOf(docOf(b, def, "FULL", b.P, b.gold), "LATER", r, Math.max(3000, per * 5)); for (const x of formCap(pr.rows, 3, per)) { x.P = b.P; rows.push(x); } }
  if (rows.length < 120) return { pairs: rows.length / 2, auc: null };
  const rnd = rngFor(seedFor(SP, "eval", ctag, bases[0].name)), F = rows.map((r) => features2(r.P, r.s, r.i, "FULL", rnd).DLx), vp = F.filter((_, k) => k % 2 === 0), vn = F.filter((_, k) => k % 2 === 1);
  return { pairs: rows.length / 2, auc: pairAuc(vp, vn, vp.map((_, k) => k), 0, rnd).auc };
}
function doRegister(reg, fam, bases, def) {
  const t0 = Date.now(), au = [];
  for (let t = 0; t < NS; t++) { const c = cellAuc(bases, R.shamOf(def, `sh${t}`), `sh${t}:${reg}`); if (c.auc !== null && c.pairs >= 60) au.push(c.auc); }
  emit({ reg, fam, nSham: au.length, sham: au, shamMean: round(mean(au)), shamSd: au.length > 1 ? round(Math.sqrt(au.reduce((a, x) => a + (x - mean(au)) ** 2, 0) / (au.length - 1))) : null });
  console.error(`${reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s n=${au.length}`);
}
function udBaseTrain(tb, file) { // identical window to confirm.mjs
  const { sents, upos } = R.readConllu(file), rnd = rngFor(seedFor("pm-r2-confirm", tb, "window")), N = sents.length, a = Math.floor(rnd() * N);
  let tok = 0, b = a; const S = [], U = []; while (tok < MAN.ud.windowTokens && S.length < N) { S.push(sents[b]); U.push(upos[b]); tok += sents[b].length; b = (b + 1) % N; }
  return { name: `ud-${tb}-trainwin`, kind: "ud", P: prep(S), gold: U };
}
async function main() {
  if (family === "ud") { const tbs = opt("--stems") ? opt("--stems").split(",") : Object.keys(MAN.ud.files); for (const tb of tbs) doRegister(`ud-${tb}`, "ud", [udBaseTrain(tb, MAN.ud.files[tb])], R.UD_DEFS.PO); }
  else if (family === "irc") { const cand = (x) => ({ id: x.id, path: path.join(R.IRC_ROOT, x.id) }), by = MAN.irc.T3_lensByChannel; for (const ch of Object.keys(by).sort()) doRegister(`irc-${ch}`, "irc", [R.ircBase(`irc-${ch}`, by[ch].map(cand))], R.IRC_DEFS.NK); }
  else if (family === "book") { for (const b of MAN.books.picked) doRegister(b.name, "book", [R.bookBase(b.name, R.loadText(b.file))], R.BOOK_DEFS.NAMES); }
  else if (family === "code") { const dir = path.join(HERE, "data", "lex"); for (const lg of ["js", "py", "rb"]) doRegister(`code-${lg}`, "code", Array.from({ length: MAN.code[lg].length }, (_, i) => R.codeBase(lg, i, dir)), R.CODE_DEFS.PE); }
  else throw new Error("--family ud|irc|book|code");
}
await main();
