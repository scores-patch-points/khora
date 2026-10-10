// provisional/polarity-map/map.mjs — POLARITY MAP of company DIVERSITY for names, per register (DISCOVERY run). New file; edits nothing.
//
//   node provisional/polarity-map/map.mjs --family ud --stems eng,spa,... | irc | book | code   (appends JSONL to results/disc.<family>[.tag].jsonl)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 before the first FULL run of this file) ═══════════════════════════════
// DISCLOSURE. Seen before this header: NAME-COMPANY/NAME-RULE/NAME-SHAPE results; the beings ladder; ant-code summary.txt, including the single-rival AUCs
//   (names/identifiers in code are MORE diverse: leftDiv 0.53-0.60, rightDiv 0.52-0.55, sameLeft 0.36-0.43, sameRight 0.38-0.43 over js/py/rb, PA np) and
//   transfer.json (code -> IRC nicknames 0.33-0.41, a significant REVERSAL); lib.mjs rivalsOf (the leftDiv/sameLeft definitions). A smoke run of lib.mjs on
//   ENGLISH UD DEV ONLY (class PO, FULL and CAUSAL4, B=100, seed tag "smoke") printed FULL DLf 0.412 [0.353,0.467], DRf 0.494, DLb 0.440, DRb 0.502, position
//   control 0.500; CAUSAL4 DLf 0.436, DRf 0.569 (188 pairs); so P3 below is NOT blind for English. Nothing else of mine has touched any other register. NOT yet read
//   by any script of mine: every UD test.conllu, the IRC days not drawn below (the confirmation set), code files beyond ant-code's 32, books other than those named.
// OBJECT. For the occurrence of a word FORM w at (s,i): the DIVERSITY of the company that form keeps, computed from the stream alone (no case, POS, list, label;
//   gold only SELECTS classes). Per form, over its occurrences O: left neighbour form (edge = "^"), right neighbour form (edge = "$"), and their rank-bin (own-stream
//   frequency rank, floor(log2(rank+1)) capped at 11, edge 12). Direction is fixed: HIGHER = MORE DIVERSE, so AUC > 0.5 means names are more diverse than controls.
//   DLf/DRf = 1 - unbiased pair-collision rate of left/right neighbour FORMS (sum c(c-1)/(n(n-1)); independent of n in expectation); DLRf = their mean (the primary
//   score); DLb/DRb/DLRb = the same over rank bins; ELb/ERb = Shannon entropy (bits) of the left/right bin; TLf/TRf = distinct neighbour forms / n (the ant-code leftDiv/
//   rightDiv definition; n-biased, so valid only when the frequency control passes). MODE FULL: O = all occurrences (non-causal; needs n >= 3). MODE CAUSAL4: O = the 4
//   occurrences immediately BEFORE (prefix only; needs k >= 4), plus NOVL = 1 - share of those whose left form equals the current left form, NOVR (right = 1 token lookahead).
// DATA (discovery). UD: every stem with a dev.conllu (53; cmn and cmn-hans are the same text and count as ONE language in every denominator); gold UPOS; classes
//   PO = PROPN vs NOUN/VERB/ADJ (primary), PN = PROPN vs NOUN. IRC English: 8 days (>= 1500 msgs, lang en, ubuntu/kubuntu/xubuntu/ubuntu-server) drawn by seed from the days
//   NOT in name-rule-informal gold.files or name-company C3.days, a DISJOINT second 8 reserved for confirmation; ubuntu-de/es/it: all days of the channel, seeded
//   shuffle, first ceil(n/2) discovery pooled into one stream, the rest reserved; class NK = nickname (spoke >= 3 messages that day, not the speaker, not a topic word)
//   vs ordinary >= 3-char non-nick tokens, exactly the rule of name-rule-informal.mjs; the speaker field is metadata for gold only. BOOKS: War and Peace (Maude), Pride and
//   Prejudice (pg1342), A Tale of Two Cities (pg98), name-war-and-peace.mjs labelBook (capital share >= 0.9 = NAME/CHAR vs COMMON); classes NAMES (CHAR u NAME vs COMMON), and
//   CHAR (cast of 48) for War and Peace. CODE: ant-code's 12 js, 12 py, 8 rb lexed files (kinds-swarm/ant-code/data/lex, NP view, one unit = one logical statement), gold from
//   the parsers: PE = user identifier U vs external E, PA = U vs E u K u L, both >= 3 characters; pairs pooled per language over files.
// MATCHING. pairsOf (eval/law/name-company.mjs; NAME_COMPANY_PAIRBLOCK=1) stratum LATER, matched exactly on form-frequency bin, within-unit index bucket, char-length bucket,
//   unit-length bucket (the unit-length bucket relaxed first); then at most 3 pairs per positive form and 3 per negative form; at most 600 pairs per register cell.
// TESTS (every threshold fixed here; SESOI 0.03 AUC; CV-free, no fitted parameter).
//   D1 MAP: matched-pair AUC (share of pairs where the name outscores its control; ties 1/2) for every feature, with a cluster-bootstrap 95% CI (clusters = positive form, B=300).
//      A cell is THIN (<60 pairs: excluded from every count) or VOID (position control, the matched-pair AUC of within-unit index bucket, outside [0.45,0.55]). ELb/ERb/TLf/TRf
//      are void when the frequency control (matched-pair AUC of log2 form count) is outside [0.45,0.55]; the D- features are only flagged. SIGN of a cell: POS if CI lower > 0.5
//      and AUC >= 0.53; NEG if CI upper < 0.5 and AUC <= 0.47; else FLAT.
//   D2 CONTROLS BUILT TO FAIL (FULL mode, primary class of each register): SHUF = the same pipeline on a within-unit shuffled stream (company destroyed, unit length kept): the
//      median |AUC - 0.5| of DLf, DRf over registers must be < 0.03; SHAM = pseudo-classes made by form-hash parity inside the NEGATIVE pool: |AUC - 0.5| < 0.03 in >= 80% of cells.
//      If SHUF or SHAM fails for a register family the map for that family is reported but its signs do not count.
//   D3 POLARITY SUMMARY per family: counts of POS/NEG/FLAT among valid cells, median AUC with a language-bootstrap CI (UD), for DLf, DRf, DLRf, DLb, DRb, and the CAUSAL4 counterpart.
//   D4 PROPERTY -> SIGN. Nine label-free register properties computed from the register's whole stream (no gold; see lib.mjs propsOf): logMeanLen, initRareEnrich, finalRareEnrich,
//      leftRigid, rightRigid, asymRigid, topLeftShare, rareRareLeft, ttr10k ("rare" = own-stream rank bin >= 7). Target = AUC(DLf)-0.5 and AUC(DRf)-0.5 per valid register (one
//      point per UD language, per IRC set, per book, per code language). Spearman rho of each property with each target; the winner is the max |rho| over the 18 combinations,
//      judged against a permutation null of that maximum (register <-> target shuffled, B=2000). Thresholds for a rule are then fixed on discovery, and checked on untouched data.
// PREDICTIONS (blind except where marked).
//   P1 code (js, py), PE, FULL: DLf and DRf AUC >= 0.53 with CI lower > 0.5 (identifiers are the open-neighbour tokens; replicates ant-code's direction under matched pairs).
//   P2 IRC English NK, FULL: DLf AUC <= 0.47 (a nickname sits in the message-initial vocative slot, so its left neighbour is the edge); DRf >= 0.50.
//   P3 UD PO: median DLf over languages < 0.47 (names carry repeated left companions: titles, multiword names) [NOT blind for English: 0.41]; median DRf in [0.47,0.53].
//   P4 the sign of company diversity differs between registers (code POS, IRC or UD NEG): it is not a universal name property.
//   P5 books: DLf < 0.47 for War and Peace NAMES (titles and patronymics repeat: "prince", "count").
//   P6 D2 holds: SHUF median |AUC-0.5| < 0.03 and SHAM within the band in >= 80% of cells.
//   P7 at least one label-free property reaches |rho| >= 0.5 against a target and beats the q95 of its permutation null (my prior: ~40%).
// NOT TESTED: neighbour identity features; anything fitted; FIRST mentions (a diversity needs recurrence).
// ═══ END OF PRE-REGISTRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCells, shuffledOf, propsOf, headerSha, rngFor, seedFor, shuffleIn, round } from "./lib.mjs";
import * as R from "./registers.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HDR = headerSha(fileURLToPath(import.meta.url)).slice(0, 16);
const family = opt("--family"), tag = opt("--tag", "");
const OUT = path.join(HERE, "results", `disc.${family}${tag ? "." + tag : ""}.jsonl`);
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, ...o }) + "\n");

function doRegister(reg, fam, bases, defs, extra = {}) {
  const t0 = Date.now(), cache = new Map(), names = Object.keys(defs), dn = names[0];
  const shufGet = (b) => { let x = cache.get(b.name); if (!x) cache.set(b.name, (x = shuffledOf(b, seedFor("polarity-map", "shuf", b.name)))); return x; };
  const info = { tokens: bases.reduce((a, b) => a + b.P.stream.reduce((c, u) => c + u.length, 0), 0), units: bases.reduce((a, b) => a + b.P.stream.length, 0), bases: bases.length, ...extra };
  for (const d of names) for (const mode of ["FULL", "CAUSAL4"]) emit({ reg, fam, def: d, mode, ctl: "real", info, ...runCells(bases, defs[d], mode, `real:${d}`) });
  emit({ reg, fam, def: dn, mode: "FULL", ctl: "shuf", ...runCells(bases, defs[dn], "FULL", `shuf:${dn}`, { get: shufGet }) });
  emit({ reg, fam, def: dn, mode: "FULL", ctl: "sham", ...runCells(bases, R.shamOf(defs[dn], "sham1"), "FULL", `sham:${dn}`) });
  const pp = bases.map((b) => propsOf(b.P)), props = {};
  for (const k of Object.keys(pp[0])) { const v = pp.map((p) => p[k]).filter((x) => typeof x === "number"); props[k] = v.length ? round(v.reduce((a, b) => a + b, 0) / v.length) : null; }
  emit({ reg, fam, props });
  console.error(`${reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
async function main() {
  if (family === "ud") {
    const stems = opt("--stems") ? opt("--stems").split(",") : R.allStems();
    for (const stem of stems) { const b = R.udBase(stem, "dev"); if (b) doRegister(`ud-${stem}`, "ud", [b], R.UD_DEFS, { stem }); }
  } else if (family === "irc") {
    const en = R.ircCandidates(["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"], 1500, "en", R.usedIrcDays());
    shuffleIn(en, rngFor(seedFor("polarity-map", "irc-en-split")));
    const split = { en: { disc: en.slice(0, 8).sort((a, b) => (a.id < b.id ? -1 : 1)), conf: en.slice(8, 16).sort((a, b) => (a.id < b.id ? -1 : 1)) } };
    for (const [ch, lg] of [["ubuntu-de", "de"], ["ubuntu-es", "es"], ["ubuntu-it", "it"]]) { const c = R.ircCandidates([ch], 0, lg); shuffleIn(c, rngFor(seedFor("polarity-map", "irc-split", ch))); const h = Math.ceil(c.length / 2); split[lg] = { disc: c.slice(0, h).sort((a, b) => (a.id < b.id ? -1 : 1)), conf: c.slice(h).sort((a, b) => (a.id < b.id ? -1 : 1)) }; }
    fs.writeFileSync(path.join(HERE, "results", "irc-split.json"), JSON.stringify(Object.fromEntries(Object.entries(split).map(([k, v]) => [k, { disc: v.disc.map((d) => d.id), conf: v.conf.map((d) => d.id) }])), null, 1));
    for (const lg of Object.keys(split)) doRegister(`irc-${lg}`, "irc", [R.ircBase(`irc-${lg}-disc`, split[lg].disc)], R.IRC_DEFS, { days: split[lg].disc.map((d) => d.id) });
  } else if (family === "book") {
    const G = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/";
    doRegister("book-war-and-peace", "book", [R.wpBase()], R.BOOK_DEFS);
    for (const [nm, f] of [["book-pride-and-prejudice", "pg1342_Pride_and_Prejudice.txt"], ["book-tale-of-two-cities", "pg98_A_Tale_of_Two_Cities.txt"]]) doRegister(nm, "book", [R.bookBase(nm, R.loadText(G + f))], { NAMES: R.BOOK_DEFS.NAMES });
  } else if (family === "code") {
    for (const [lg, n] of [["js", 12], ["py", 12], ["rb", 8]]) doRegister(`code-${lg}`, "code", Array.from({ length: n }, (_, i) => R.codeBase(lg, i)), R.CODE_DEFS, { lg });
  } else throw new Error("--family ud|irc|book|code");
}
await main();
