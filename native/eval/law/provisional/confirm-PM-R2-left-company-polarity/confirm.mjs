// confirm-PM-R2-left-company-polarity/confirm.mjs -- INDEPENDENT CONFIRMATION of provisional rule PM-R2-left-company-polarity on data NOT read by the scoper's own confirmation. NEW FILE.
//
//   node confirm.mjs --family ud|irc|book|code [--stems a,b] [--tag t]    -> results/conf.<family>[.tag].jsonl ; mechanical verdict by verdict.mjs
//   (never pass "run" as the first argument: name-company.mjs starts its main() on argv[2]==="run".)
//
// ═══ PRE-REGISTRATION (written 2026-10-07 BEFORE this file was ever run and before any feature, label, AUC or rareL_edge was computed on any of the data below) ═══════════════════
// RULE UNDER TEST (verbatim core): "If a register's own stream has a large share of its rare forms (own-stream rank bin >= 7) at unit index 0 (rareL_edge >= ~0.10: chat, code) then names' LEFT-neighbour
//   diversity, measured as excess over a position-preserving null and compared with matched controls (DLx), is HIGH (matched-pair AUC > 0.5, ~0.60-0.70); if that share is small (< ~0.05: novels, most treebank prose)
//   it is LOW (AUC < 0.5, ~0.39-0.47). The sign follows the register property, not the language."  Out of scope per the rule: ranking languages INSIDE UD; right company; Ax; raw diversity; first mentions; word-order families.
// DISCLOSURE (what I had seen). I read the scoper's code (polarity-map/{lib,lib2,lib3,registers,confirm,verdict,select-new-code}.mjs) and its OWN confirmation outcome, which the rule JSON quotes: IRC DLx 0.704/0.681/0.631/0.639, code
//   js 0.700 / py 0.602, novels 0.388/0.467/0.418, UD PO median 0.457 (1 POS, 10 NEG of 36), rho(rareL_edge, DLx) +0.471 (n 45). THEREFORE the data of that confirmation (UD test.conllu of all 53 stems; the reserved IRC days of
//   results/irc-split.json 'conf'; the 24 files of confirm-code-files.json; Tom Sawyer, Middlemarch, Frankenstein) is NOT untouched and is NOT used here as evidence (the task text said UD test.conllu was unread by any earlier
//   test; the scoper's confirm.mjs/conf.ud.*.jsonl show it was read). I have computed NO feature of any kind on the fresh data below; what I have seen of it is only file names, sizes, token counts, message counts and
//   day-id mentions (data/manifest.json). I know the concurrent sibling confirmation of PM-R1 (confirm-PM-R1-unit-initial-excess) reads the same UD train files (its windows are seeded differently) and the same fresh English IRC
//   days (pooled) for a DIFFERENT statistic (unit-initial excess pInitX); it uses other books and other code files. Overlap is therefore partial for UD and IRC and nil for books and code.
// DATA (fresh; selection mechanical and result-blind: select-data.mjs, data/manifest.json sha256 c4f83ffea302afa6eeb1cf8c8fca5351f1c834f8d719534c9d78d08bc397a9f6).
//   UD: the TRAIN split of the 59 treebanks of /Users/mlacy/Documents/data/ud that have one (first part in name order); no khora eval mentions that directory (grep, recorded in the manifest). One register per treebank: a window of
//     consecutive sentences from a seeded random start (seedFor('pm-r2-confirm', treebank, 'window')) to >= 40000 non-PUNCT word units (whole file if smaller); lowercase NFC word units, as the scoper reads UD. Class PO (PROPN vs
//     NOUN/VERB/ADJ) is the rule's class. (Train and dev/test of one treebank are disjoint sentences from the same sources: fresh data, not a new genre.)
//   IRC: English days of the 7 ubuntu-irc channels not mentioned by the scoper (48 days), earlier name tests, kinds-swarm or any non-provisional law file; all 32 non-English days were read by the scoper -> NO fresh de/es/it. 37 days remain,
//     all read by other provisional lenses for other statistics (company/first-mention), never for DLx or rareL_edge; their 12 'never mentioned anywhere' companions are tiny (<=140 messages) and are not a usable register.
//     Registers = one per channel (kubuntu 10 days, ubuntu-server 11, xubuntu 16, ~3.3-4.0k messages each; pooled stream, own bins). Report-only: the 37 days pooled. Gold = metadata nick of a speaker with >= 3 messages (scoper ircBase).
//   Books: six English novels from ethos gitenberg/, fixed novel list, >= 60000 tokens, hash order (War of the Worlds, Great Expectations, Treasure Island, Anne of Green Gables, Wuthering Heights, Crime and Punishment); gold
//     = capital-share labels via labelBook (evaluation only); none used by the scoper, the discovery agents or the PM-R1 sibling.
//   Code: 12 js + 12 py + 8 rb files, ant-code's candidate pools and checks with salt 'pm-r2-confirm-fresh', minus ant-code's 32, the scoper's 24 and the PM-R1 sibling's 32; gold = parser class U (bound in file) vs E (external), len>=3.
//     Registers = one per language, files pooled (scoper convention); rareL_edge = mean over the files.
// OBSERVABLES (label-free; rule definitions, scoper functions features2 for DLx and the rareL_edge formula; PLUS my own independent re-implementation dlxOwn (below) used as an implementation check). DLx = unbiased pair-collision
//   diversity of the form's left-neighbour forms (edge ^) minus its mean under the position-preserving null (neighbour = random OTHER token of the unit, each mention keeps its index; B0 = 8). rareL_edge = share of tokens of
//   own-stream rank bin >= 7 that are unit-initial. Mode FULL only (all mentions, >= 3). Gold (UPOS, nick metadata, capital share, parser class) is used ONLY to build the P / N classes.
// CELLS. Matched pairs by the scoper's pairsOf LATER (exact on form-frequency bin, unit-index bucket, char-length bucket, unit-length bucket), NAME_COMPANY_PAIRBLOCK=1 (set by polarity-map/lib.mjs), <= 3 pairs per form, <= 600 pairs
//   per cell, seeds under prefix "pm-r2-confirm". AUC = matched-pair win rate with cluster-bootstrap 95% CI (B=500, clusters = positive form), plus a two-sided cluster sign-flip permutation p (B=2000). VALID cell: pairs >= 60 AND
//   position control (AUC of the unit-index bucket between pair members) in [0.45,0.55] AND frequency control (AUC of log2 mentions) in [0.45,0.55] (the frequency condition is a TIGHTENING over the scoper). Also reported, not
//   gating: char-length, unit-length, k-prior controls and the raw DLf AUC.
// CONTROLS BUILT TO FAIL. (1) SHUF: the same pipeline on within-unit shuffled streams (company destroyed, unit length, class counts and counts kept; pairs re-matched on the shuffled stream); Delta = AUC(real) - AUC(shuf).
//   (2) SHAM: the NEGATIVES of the class are split by a form-hash parity into pseudo-P / pseudo-N (no name information at all): must read ~0.5; family median |AUC-0.5| <= 0.03 or the family is VOID. (3) Position and frequency
//   controls above. (4) Register-level permutation null for rho (B=2000, targets shuffled). (5) IMPLEMENTATION CHECK: |AUC(dlxOwn) - AUC(features2.DLx)| <= 0.03 on >= 90% of valid real cells, else the run is void.
// PASS CRITERIA (taken from the rule's passIf; tightened never loosened; registered family scaling is proportional where the sample is larger):
//   P1 rho = Spearman(rareL_edge, AUC(DLx)) over all valid real registers (IRC channel sets, code js/py/rb, 6 books, valid UD windows; the 37-day pooled IRC set and nothing else is excluded) >= +0.30 AND one-sided permutation p < 0.05.
//   P2 IRC: every valid channel set (>= 2 of 3 valid) has DLx >= 0.55 with CI lower > 0.5 (CI condition is a tightening).
//   P3 code: every valid language among js, py, rb (>= 2 valid, js and py among them) has DLx >= 0.55 with CI lower > 0.5 (rb and the CI condition are tightenings).
//   P4 books: >= 2/3 of the valid books (>= 3 valid) have DLx <= 0.47.
//   P5 UD (class PO): >= 20 valid windows; median DLx <= 0.48; POS cells <= 10% and NEG cells >= 25% of valid cells ("POS" = CI lower > 0.5 and AUC >= 0.53; "NEG" = CI upper < 0.5 and AUC <= 0.47).
//   P6 median Delta (real - shuf, DLx) >= +0.05 for IRC and for code, and <= -0.05 for books.
//   Family credit requires its controls valid (sham, implementation check). VERDICT: CONFIRMED = P1 and P2-P6 all hold with all controls valid. PARTIAL = not CONFIRMED but at least one family's own sign criterion (P2+P6 IRC,
//   P3+P6 code, P4+P6 books, P5 UD) holds; the verdict then names exactly which families hold and which fail. NOT_CONFIRMED = no family holds.
// REPORT-ONLY (non-gating): rho inside UD (out of scope per the rule), rho without code / without IRC / without UD / books+IRC+code only; the 37-day pooled IRC set; sign accuracy of the rule's side-of-0.5 prediction from rareL_edge
//   alone (>= 0.10 -> AUC > 0.5, < 0.05 -> AUC < 0.5, otherwise no prediction) over valid registers, with a binomial p against a coin; CIs of every cell.
// BLIND PREDICTIONS. P1 holds 0.70 (rho ~0.45, range 0.30-0.60); P2 IRC all >= 0.55 with CI lower > 0.5: 0.65 (channel sets are 3-4k messages, ~0.62, range 0.55-0.70); P3 code js 0.66, py 0.60, rb 0.62, all pass 0.50;
//   P4 books median ~0.43 (range 0.35-0.50), >= 2/3 <= 0.47: 0.60; P5 UD median ~0.46 (<=0.48 with prob 0.70), POS <= 10% 0.75, NEG >= 25% 0.55, all three 0.35; P6 Delta IRC/code 0.85, books 0.45 (the shuffle control
//   itself sat 0.43-0.46 in the scoper's IRC cells, i.e. not at 0.5); SHAM family dev <= 0.03: 0.80; implementation check passes: 0.95. Overall: CONFIRMED 0.12, PARTIAL 0.65, NOT_CONFIRMED 0.23.
// NOT TESTED / OUT OF SCOPE: German, Spanish, Italian chat (no fresh day exists); Chinese or other IRC channels (none on disk); SMS (cosem, nus-sms) and e-mail (no name gold); right company, Ax, first mentions; neighbour identity;
//   any fitted classifier (none is used: DLx and rareL_edge are fixed scores).
// ═══ END OF PRE-REGISTRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shuffledOf, headerSha, seedFor, rngFor, round, mean, docOf, formCap, pairsOf, pairAuc, pooledAuc } from "../polarity-map/lib.mjs";
import { features2 } from "../polarity-map/lib2.mjs";
import * as R from "../polarity-map/registers.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HDR = headerSha(fileURLToPath(import.meta.url)), family = opt("--family"), tag = opt("--tag", "");
const OUT = path.join(HERE, "results", `conf.${family}${tag ? "." + tag : ""}.jsonl`), SP = "pm-r2-confirm";
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR.slice(0, 16), ...o }) + "\n");
const MAN = JSON.parse(fs.readFileSync(path.join(HERE, "data", "manifest.json"), "utf8"));
const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
const wr = (x, y) => (x > y ? 1 : x === y ? 0.5 : 0);

// ── own independent implementation of DLx (implementation check; same definition, separate code) ─────────────────────────────────
const divOf = (a) => { const n = a.length; if (n < 2) return null; const m = new Map(); for (const x of a) m.set(x, (m.get(x) ?? 0) + 1); let c = 0; for (const v of m.values()) c += v * (v - 1); return 1 - c / (n * (n - 1)); };
function dlxOwn(P, s, i, rnd, B0 = 8) {
  const o = P.occ.get(P.stream[s][i]), obs = [], nul = Array.from({ length: B0 }, () => []);
  for (let j = 0; j < o.length; j += 2) {
    const u = P.stream[o[j]], b = o[j + 1];
    if (b === 0) { obs.push("^"); for (const a of nul) a.push("^"); continue; }
    obs.push(u[b - 1]);
    for (const a of nul) { let q = Math.floor(rnd() * (u.length - 1)); if (q >= b) q += 1; a.push(u[q]); }
  }
  return divOf(obs) - mean(nul.map(divOf));
}
// ── cluster sign-flip permutation p (two-sided) for the matched-pair win rate against 0.5 ──────────────────────────────────────────
function flipP(vp, vn, cl, B, rnd) {
  const sums = new Map(); vp.forEach((x, k) => sums.set(cl[k], (sums.get(cl[k]) ?? 0) + wr(x, vn[k]) - 0.5));
  const S = [...sums.values()], obs = Math.abs(S.reduce((a, b) => a + b, 0)); let ge = 0;
  for (let b = 0; b < B; b++) { let t = 0; for (const x of S) t += rnd() < 0.5 ? x : -x; if (Math.abs(t) >= obs - 1e-12) ge++; }
  return round((ge + 1) / (B + 1));
}
const rareLedge = (P) => { let n = 0, le = 0; for (const u of P.stream) u.forEach((w, i) => { if ((P.bins.get(w) ?? 11) >= 7) { n++; if (i === 0) le++; } }); return n ? le / n : null; };

function evalRows(rows, rnd, B) {
  const n = rows.length / 2; if (!n) return { pairs: 0 };
  const F = rows.map((r) => features2(r.P, r.s, r.i, "FULL", rnd)), OWN = rows.map((r) => dlxOwn(r.P, r.s, r.i, rnd));
  const pos = rows.filter((_, k) => k % 2 === 0), neg = rows.filter((_, k) => k % 2 === 1), cl = pos.map((r) => `${r.doc}|${r.w}`), y = rows.map((r) => r.y);
  const half = (x) => [x.filter((_, k) => k % 2 === 0), x.filter((_, k) => k % 2 === 1)];
  const cell = { pairs: n, nPosForms: new Set(cl).size, ctrl: {} };
  const one = (name, x, withCi) => { const [vp, vn] = half(x); const a = pairAuc(vp, vn, cl, withCi ? B : 0, rnd); cell[name] = { auc: a.auc, ...(withCi ? { lo: a.lo, hi: a.hi, nClusters: a.nClusters } : {}), pooled: round(pooledAuc(x, y)), meanP: round(mean(vp)), meanN: round(mean(vn)) }; return [vp, vn]; };
  const [vp, vn] = one("DLx", F.map((o) => o.DLx), true); cell.DLx.pPerm = flipP(vp, vn, cl, 2000, rnd);
  one("own", OWN, false); one("DLf", F.map((o) => o.DLf), false); one("DLbx", F.map((o) => o.DLbx), false);
  const ctl = { pos: (r) => ib(r.i), logn: (r) => Math.log2(r.P.occ.get(r.w).length / 2), len: (r) => [...r.w].length, slen: (r) => r.P.stream[r.s].length, kprior: (r) => r.P.kArr[r.s][r.i] };
  for (const [nm, g] of Object.entries(ctl)) cell.ctrl[nm] = round(pairAuc(pos.map(g), neg.map(g), cl, 0, rnd).auc);
  cell.posControlOk = cell.ctrl.pos >= 0.45 && cell.ctrl.pos <= 0.55; cell.freqControlOk = cell.ctrl.logn >= 0.45 && cell.ctrl.logn <= 0.55;
  return cell;
}
function runCell(bases, def, ctag, { get = (b) => ({ P: b.P, gold: b.gold }), B = 500, maxPairs = 600 } = {}) {
  const rows = [], per = Math.ceil(maxPairs / bases.length), meta = { dropped: 0, pairsBeforeCap: 0 };
  for (const b of bases) {
    const { P, gold } = get(b), r = rngFor(seedFor(SP, ctag, b.name, "pairs")), pr = pairsOf(docOf(b, def, "FULL", P, gold), "LATER", r, Math.max(3000, per * 5));
    meta.dropped += pr.dropped; meta.pairsBeforeCap += pr.pairs;
    for (const x of formCap(pr.rows, 3, per)) { x.P = P; rows.push(x); }
  }
  return { ...evalRows(rows, rngFor(seedFor(SP, "eval", ctag, bases[0].name)), B), ...meta };
}
function doRegister(reg, fam, tier, bases, def, note = {}) {
  const t0 = Date.now(), cache = new Map(), shufGet = (b) => { let x = cache.get(b.name); if (!x) cache.set(b.name, (x = shuffledOf(b, seedFor(SP, "shuf", b.name)))); return x; };
  const props = bases.map((b) => rareLedge(b.P)).filter((x) => x !== null), rl = props.length ? round(mean(props)) : null;
  const tokens = bases.reduce((a, b) => a + b.P.stream.reduce((c, u) => c + u.length, 0), 0), units = bases.reduce((a, b) => a + b.P.stream.length, 0);
  emit({ reg, fam, tier, ctl: "props", rareL_edge: rl, tokens, units, nBases: bases.length, ...note });
  emit({ reg, fam, tier, ctl: "real", rareL_edge: rl, ...runCell(bases, def, `real:${reg}`) });
  emit({ reg, fam, tier, ctl: "shuf", ...runCell(bases, def, `shuf:${reg}`, { get: shufGet }) });
  emit({ reg, fam, tier, ctl: "sham", ...runCell(bases, R.shamOf(def, "sham1"), `sham:${reg}`) });
  console.error(`${reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s tokens ${tokens} rareL_edge ${rl}`);
}
// ── UD train windows (class PO) ──────────────────────────────────────────────────────────────────────────────────────────────────────
import { prep } from "../polarity-map/lib.mjs";
function udBaseTrain(tb, file) {
  const { sents, upos } = R.readConllu(file), rnd = rngFor(seedFor(SP, tb, "window")), N = sents.length, a = Math.floor(rnd() * N);
  let tok = 0, b = a; const S = [], U = [];
  while (tok < MAN.ud.windowTokens && S.length < N) { S.push(sents[b]); U.push(upos[b]); tok += sents[b].length; b = (b + 1) % N; }
  return { name: `ud-${tb}-trainwin`, kind: "ud", P: prep(S), gold: U, window: { start: a, sentences: S.length, tokens: tok, totalSentences: N } };
}
async function main() {
  if (family === "ud") {
    const tbs = opt("--stems") ? opt("--stems").split(",") : Object.keys(MAN.ud.files);
    for (const tb of tbs) { const b = udBaseTrain(tb, MAN.ud.files[tb]); doRegister(`ud-${tb}`, "ud", "fresh-train", [b], R.UD_DEFS.PO, { window: b.window }); }
  } else if (family === "irc") {
    const cand = (x) => ({ id: x.id, path: path.join(R.IRC_ROOT, x.id) }), by = MAN.irc.T3_lensByChannel;
    for (const ch of Object.keys(by).sort()) doRegister(`irc-${ch}`, "irc", "T3-lens-read", [R.ircBase(`irc-${ch}`, by[ch].map(cand))], R.IRC_DEFS.NK, { days: by[ch].map((x) => x.id) });
    const allDays = Object.values(by).flat(); doRegister("irc-pooled37", "irc-pooled", "T3-lens-read", [R.ircBase("irc-pooled37", allDays.map(cand))], R.IRC_DEFS.NK, { days: allDays.length });
  } else if (family === "book") {
    for (const b of MAN.books.picked) { const base = R.bookBase(b.name, R.loadText(b.file)); doRegister(b.name, "book", "fresh-gitenberg", [base], R.BOOK_DEFS.NAMES, { file: b.file }); }
  } else if (family === "code") {
    const dir = path.join(HERE, "data", "lex");
    for (const lg of ["js", "py", "rb"]) { const n = MAN.code[lg].length; doRegister(`code-${lg}`, "code", "fresh-files", Array.from({ length: n }, (_, i) => R.codeBase(lg, i, dir)), R.CODE_DEFS.PE, { files: MAN.code[lg].map((x) => x.file) }); }
  } else throw new Error("--family ud|irc|book|code");
}
await main();
