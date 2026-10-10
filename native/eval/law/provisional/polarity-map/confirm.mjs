// provisional/polarity-map/confirm.mjs — CONFIRMATION of two provisional rules on UNTOUCHED data (UD test.conllu, unused IRC days, unused code files, unused novels). New file.
//
//   node provisional/polarity-map/confirm.mjs --family ud|irc|book|code [--stems a,b] [--tag t]    -> results/conf.<family>[.tag].jsonl ; verdicts by verdict.mjs
//
// ═══ PRE-REGISTRATION (written 2026-10-07 BEFORE this file was ever run and before any untouched dataset was read by any script of mine) ═══════════════════════════════
// DISCLOSURE. Discovery (all on dev / drawn discovery days / ant-code's 32 files / three novels) is complete and has been read in full: map.mjs (raw diversity), map2.mjs (position-preserving excess DLx/DRx, asymmetry
//   Ax, slot composition), map3.mjs (unit-initial excess pInitX), analyse*.mjs; the discovery numbers behind the two rules are in the headers of map2.mjs and map3.mjs and in results/analysis.{disc,e,u}.json. Registered discovery
//   gates that FAILED or passed narrowly, said now: map3 RULE GATE overall FAILED (UD POS 18/34 = 53% < 60%, UD SHUF median dev 0.037 > 0.03, books POS 2/3 and SHUF dev 0.066, books CAUSAL4 0.52); map2 E1 failed marginally
//   (UD 0.0304, IRC DRx 0.0504). D5 (property search) passed its registered test: rareL_edge vs DLx rho +0.575 (null q95 0.446) on 45 registers, +0.486 NL-only, +0.248 UD-only. The confirmation claims below are therefore SCOPED
//   to what discovery supported and are not the failed gate. NOT yet read by any script of mine: every UD test.conllu (53 stems), the reserved IRC days (results/irc-split.json 'conf': en 8 days, de 5, es 5, it 5),
//   the 24 code files of results/confirm-code-files.json (12 js + 12 py, chosen by the mechanical ant-code hash rule minus ant-code's 24), Tom Sawyer (pg1661), Middlemarch (pg145), Frankenstein (pg84).
// FEATURES (all label-free; definitions in lib2.mjs / lib3.mjs, unchanged from discovery). pInitX = share of a form's mentions at unit index 0 minus the mean 1/len of their units (unit-initial EXCESS). DLx = observed unbiased
//   pair-collision diversity of the form's left neighbours minus its mean under the position-preserving null (B0=8). rareL_edge = share of the register's tokens of own-stream rank bin >= 7 that are unit-initial (a property of
//   the REGISTER, computed from its stream only). Mode FULL = all mentions (>= 3); CAUSAL4 = the 4 mentions before (>= 5th mention; prefix only). Matched pairs: pairsOf LATER, exact on form-frequency bin, unit index bucket,
//   char-length bucket, unit-length bucket; <= 3 pairs per form; <= 600 pairs per cell; seeds under prefix "polarity-map-confirm". Valid cell: pairs >= 60 and position control in [0.45,0.55]. cmn-hans dropped.
//   Classes: UD PN (primary for R1) and PO (primary for R2), IRC NK, novels NAMES, code PE. SHUF = the same pipeline on within-unit shuffled streams; Delta = AUC(real) - AUC(shuf).
// RULE 1 (UNIT-INITIAL EXCESS). Statement: in natural-language and code registers a form recurring in the stream whose mentions are unit-initial more often than its units' lengths predict (pInitX high) is more likely a
//   name / nickname / user identifier than a matched open-class form; the effect is huge in chat, moderate elsewhere, and is a POSITION/RECURRENCE rule, not a company rule. PASS CRITERIA (matched-pair AUC; "POS" = CI lower > 0.5):
//   R1a every valid IRC set (en, de, es, it) FULL >= 0.80 with CI lower > 0.5, and CAUSAL4 >= 0.75 for en; R1b code js and py each FULL >= 0.55 with CI lower > 0.5; R1c UD test PN: median over valid languages FULL >= 0.55,
//   CAUSAL4 median >= 0.55, NEG cells <= 10% of valid cells; R1d novels: >= 2 of 3 with FULL >= 0.55 and CI lower > 0.5; R1e per family median Delta >= 0.05 (UD: PN real vs PN shuf). VERDICT: HOLDS if all of R1a-e;
//   otherwise HOLDS-IN-SCOPE(the families whose sub-criteria and R1e pass) and FAILS-ELSEWHERE.
// RULE 2 (LEFT-COMPANY POLARITY ALONG rareL_edge). Statement: relative to a position-preserving null, a name's LEFT company is more diverse than a matched control's (DLx AUC > 0.5) in registers where many rare forms are
//   unit-initial (high rareL_edge: chat, code) and less diverse (DLx AUC < 0.5) where few are (novels, treebank prose); the sign is carried by the register property, not by the language. PASS CRITERIA:
//   R2a over all valid confirmation registers (UD test PO languages, IRC sets, novels, code js and py): Spearman(rareL_edge, AUC(DLx)) >= +0.30 and one-sided permutation p < 0.05 (B=2000); R2b signs: every valid IRC set
//   DLx >= 0.55, code js and py DLx >= 0.55, >= 2 of 3 novels DLx <= 0.47, UD PO median DLx <= 0.48 with POS cells <= 10% and NEG cells >= 25% of valid cells; R2c per family median Delta(DLx) has the claimed sign with
//   |Delta| >= 0.05 in IRC (+), code (+), novels (-). R2-UD (report only, not gating): Spearman(rareL_edge, DLx) inside the UD test languages. VERDICT as for Rule 1.
// BLIND PREDICTIONS (probability my prior gives each criterion): R1a 0.85; R1b 0.75; R1c 0.60 (median) / 0.45 (all three UD sub-criteria); R1d 0.45; R1e 0.55; R2a 0.65; R2b IRC 0.75, code 0.80, novels 0.55, UD 0.55;
//   R2c 0.45; R2-UD rho > 0: 0.60. I expect Rule 1 to hold in chat and code, be borderline in UD and novels, and Rule 2 to hold only in the chat/code/novel scope, with the property failing inside UD.
// NOT TESTED / OUT OF SCOPE: first mentions (a recurrence statistic needs recurrence); languages with < 60 valid pairs; neighbour identity; any fitted classifier.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shuffledOf, headerSha, seedFor, propsOf, round } from "./lib.mjs";
import { allFeatures, runCellsG, FEATS_ALL } from "./lib3.mjs";
import * as R from "./registers.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HDR = headerSha(fileURLToPath(import.meta.url)).slice(0, 16), family = opt("--family"), tag = opt("--tag", "");
const OUT = path.join(HERE, "results", `conf.${family}${tag ? "." + tag : ""}.jsonl`), SP = "polarity-map-confirm";
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, ...o }) + "\n");
const rareLedge = (P) => { let n = 0, le = 0; for (const u of P.stream) u.forEach((w, i) => { if ((P.bins.get(w) ?? 11) >= 7) { n++; if (i === 0) le++; } }); return round(le / n); };

function doRegister(reg, fam, bases, defs) {
  const t0 = Date.now(), cache = new Map(), names = Object.keys(defs);
  const shufGet = (b) => { let x = cache.get(b.name); if (!x) cache.set(b.name, (x = shuffledOf(b, seedFor(SP, "shuf", b.name)))); return x; };
  const O = { seedPrefix: SP };
  for (const d of names) {
    for (const mode of ["FULL", "CAUSAL4"]) emit({ reg, fam, def: d, mode, ctl: "real", ...runCellsG(bases, defs[d], mode, `real:${d}`, allFeatures, FEATS_ALL, O) });
    emit({ reg, fam, def: d, mode: "FULL", ctl: "shuf", ...runCellsG(bases, defs[d], "FULL", `shuf:${d}`, allFeatures, FEATS_ALL, { ...O, get: shufGet }) });
  }
  emit({ reg, fam, def: names[0], mode: "FULL", ctl: "sham", ...runCellsG(bases, R.shamOf(defs[names[0]], "sham1"), "FULL", `sham:${names[0]}`, allFeatures, FEATS_ALL, O) });
  const pr = bases.map((b) => ({ rareL_edge: rareLedge(b.P), ...propsOf(b.P) })), props = {};
  for (const k of Object.keys(pr[0])) { const v = pr.map((p) => p[k]).filter((x) => typeof x === "number"); props[k] = v.length ? round(v.reduce((a, b) => a + b, 0) / v.length) : null; }
  emit({ reg, fam, props, tokens: bases.reduce((a, b) => a + b.P.stream.reduce((c, u) => c + u.length, 0), 0), units: bases.reduce((a, b) => a + b.P.stream.length, 0) });
  console.error(`${reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
async function main() {
  if (family === "ud") { const stems = opt("--stems") ? opt("--stems").split(",") : R.allStems(); for (const stem of stems) { const b = R.udBase(stem, "test"); if (b) doRegister(`ud-${stem}`, "ud", [b], R.UD_DEFS); } }
  else if (family === "irc") {
    const sp = JSON.parse(fs.readFileSync(path.join(HERE, "results", "irc-split.json"), "utf8")), cand = (id) => ({ id, path: path.join(R.IRC_ROOT, id) });
    for (const lg of Object.keys(sp)) doRegister(`irc-${lg}`, "irc", [R.ircBase(`irc-${lg}-conf`, sp[lg].conf.map(cand))], R.IRC_DEFS);
  } else if (family === "book") {
    const G = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/";
    for (const [nm, f] of [["book-tom-sawyer", "pg1661_The_Adventures_of_Tom_Sawyer.txt"], ["book-middlemarch", "pg145_Middlemarch-George-Eliot.txt"], ["book-frankenstein", "pg84_Frankenstein.txt"]]) doRegister(nm, "book", [R.bookBase(nm, R.loadText(G + f))], { NAMES: R.BOOK_DEFS.NAMES });
  } else if (family === "code") {
    const dir = path.join(HERE, "results", "lex-confirm");
    for (const lg of ["js", "py"]) doRegister(`code-${lg}`, "code", Array.from({ length: 12 }, (_, i) => R.codeBase(lg, i, dir)), R.CODE_DEFS);
  } else throw new Error("--family ud|irc|book|code");
}
await main();
