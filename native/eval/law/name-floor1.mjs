// eval/law/name-floor1.mjs — CAN THE HOLOGRAPH REGISTER A NAME THAT APPEARS ONCE? A reader that admits at the first mention.
//
//   node eval/law/name-floor1.mjs collect V0|V1|V2 [--out DIR] [--pairs 100] [--irc-pairs 50]   (one process per variant; persists rows + records)
//   node eval/law/name-floor1.mjs analyse [--out DIR]                                          (merges the three variants, scores, writes report.json)
//
// WHY. The user's single-mention rule: "a name can appear once and be a name"; a being is born at first admission and known by its effect on the holograph, not by
// recurrence (docs/LAW-FALSIFICATION.md 1.5). Every prior-free reader in eval/law/impact.mjs floors recurrence at 2 (minMentions 2 for the kind/being reader R-B, minRec 2
// for the relation reader R-C), so a single mention can leave NO slot to ablate: causally the effect of a first mention is 0 for names and non-names alike (found: the
// first-mention AUC is exactly 0.500 on IRC, War and Peace and UD). That is a typed gap about the READER, not a finding about names. This file runs the labelled floor-1
// counterfactual (impact.mjs READERS["R-B1"]: minMentions 1; here also minRec 1, so R-C's figures admit one-mention words) and asks whether the holograph then registers
// a first mention as a name, and whether it does so from the prefix alone.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══════════════════════════════════════════════════
// DISCLOSURE. Seen before this header: all earlier results (name-rule IRC, name-shape, ant-shape, ant-kinds-*, ant-adversary CRITIQUE with its confound lessons).
//   Not seen: any impact record read with minMentions 1 / minRec 1. name-company.mjs is running concurrently; its results are not read.
// DATA. FIRST-mention pairs, matched as in name-company.mjs pairsOf (the adversary's lessons): positive = the FIRST occurrence of a name form in the stream; negative = the
//   first occurrence of an ordinary form matched on the log2 frequency of the form, the within-sentence index bucket, the character-length bucket and the sentence-length
//   bucket. UD: eng spa rus fas jpn tur (DEV; PROPN vs NOUN/VERB/ADJ; 100 pairs per language, M = min(128, floor(N/5)) sentences). IRC: 8 channel-days not used by
//   eval/law/name-rule-informal (nickname gold from speaker metadata; negatives >= 3 characters and not nickname forms; 50 pairs per day, M = 256 messages).
// READERS. impact.mjs's three PRIOR-FREE readers, A-DEL, with three variants of the SAME tokens: V0 = floor 2, causal (F=0): the reference, expected deaf; V1 = floor 1,
//   causal (F=0): THE TEST; V2 = floor 1, non-causal (F=32: the next 32 sentences are visible to the ablation; never a claim about reading).
// SCORES (fixed, no fitting): non-null share by class; S_ENTRY (non-unchanged deltas in the ref-entry family, bands 0-1) AUC; and a LEARNED arm: the 144-d record
//   (sig 85 + atm 19 + span 32 + c 8) by ridge-logistic leave-one-BLOCK-out CV (blocks = the 6 UD languages and the 8 IRC days; PCA-24 fitted on the training blocks,
//   lambda 1.0), exactly the learner exported by eval/law/name-war-and-peace.mjs (cvScores, aucOf, bootDiff). Rivals on the same rows (case-free, causal): LEFT = the
//   company profile of the two left neighbours' frequency-rank bins (name-company.mjs ARMS.LEFT), POSITION (control; must be in [0.45, 0.55]), RIVALS = position +
//   character length + frequency. Controls: sham ablation (null share 100%), label permutation within blocks (B = 100) for the learned arms, determinism (40 tokens re-read).
// TESTS. F1 DEAFNESS (reference): V0 names' non-null share <= 0.20 and S_ENTRY AUC in [0.45, 0.55]. F2 FLOOR-1 CAUSAL: V1 FULL-record CV AUC >= 0.60 pooled, above its
//   permutation q95, in >= 8 of 14 blocks. F3 BEYOND COMPANY: (FULL + LEFT) - LEFT >= 0.03 with a block-bootstrap lower bound > 0 (V1). F4 CAUSAL vs LOOKAHEAD: V2 - V1 >= 0.03.
//   F5 REGISTER: V1 AUC reported separately for UD and IRC blocks.
// VERDICTS (SESOI 0.03 AUC). THE HOLOGRAPH REGISTERS A SINGLE MENTION (causal) if F2 holds; and it does so BEYOND company if F3 holds. If F2 fails: the floor-1 reader is
//   as deaf as the floor-2 reader at the first mention, and the single-mention rule is not exercised by these readers even when the floor is removed.
// PREDICTIONS (blind; orders are the claims). P1 F1 holds (V0 deaf). P2 F2 FAILS narrowly: pooled V1 AUC in [0.52, 0.62] — removing the floor lets the reader form entries
//   for every one-mention word, so the first-mention ablation changes slots for names and non-names alike. P3 F3 fails: the record adds < 0.03 to the company profile. P4 F4
//   holds: lookahead adds >= 0.03 over causal at floor 1. P5 the IRC blocks score higher than the UD blocks (the vocative convention is a company/position cue).
// DISCLOSURE ADDED BEFORE THE FULL RUN (2026-10-07; no rule, threshold or prediction changed). A smoke run of an earlier version of this code, launched as --pairs 4, turned out to
//   apply --pairs only to UD (4 pairs per language) while IRC ran at its registered 50 pairs per day (about 400 IRC pairs, header sha256 34e4d118c98d96e259f4fecd5ec76aa819f66cb9576ccfe489f01b8320577925).
//   I have therefore SEEN an IRC-dominated version of the result (UD blocks of 8 tokens are noise). Pooled FULL-record AUC: V0 0.635 (IRC 0.642), V1 0.686 (IRC 0.700), V2 0.758 (IRC 0.773);
//   V0 names' non-null share 0.050 vs controls 0.140 and S_ENTRY 0.500; V1 names 0.227 vs 0.258, S_ENTRY 0.500; V2 names 0.508 vs 0.296, S_ENTRY 0.625; POSITION 0.521, LEFT 0.537;
//   (FULL+LEFT)-LEFT at V1 +0.043 [0.017, 0.074]; V2-V1 +0.072. Read: the learned record is NOT deaf at floor 2 (V0 0.635) although the slot scalar is, so F1 is registered on the
//   slot channel only and the V0 FULL value is reported as a finding about non-slot channels (atmosphere, span, company-structure). The smoke also hard-coded determinism total 40
//   (the 8 tokens re-read were identical, 8/8). The full run uses --pairs 100 for UD and 50 for IRC as registered, persists records per variant, and runs the variants as separate processes.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { impactBatch, rngFor, seedFor, DELTA_TYPES } from "./impact.mjs";
import { pairsOf, udDoc, ircDocs, ARMS } from "./name-company.mjs";
import { cvScores, aucOf, bootDiff, mean, quantile, round } from "./name-war-and-peace.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = opt("--out", path.join(HERE, "results", "name-floor1"));
const UD_PAIRS = Number(opt("--pairs", 100)), IRC_PAIRS = Number(opt("--irc-pairs", 50));
const VARIANTS = { V0: [{}, 0], V1: [{ minMentions: 1, minRec: 1 }, 0], V2: [{ minMentions: 1, minRec: 1 }, 32] };
const T = DELTA_TYPES.length;
const entryScore = (rec) => { let s = 0; for (const band of [0, 1]) for (let t = 0; t < T; t++) s += rec.counts[(3 * 3 + band) * T + t]; return s; };
const CH = { sig: (r) => r.sig, atm: (r) => r.atm, span: (r) => r.span, c: (r) => r.c, FULL: (r) => [...r.sig, ...r.atm, ...r.span, ...r.c] };
const slim = (r) => (r && !r.gap ? { sig: r.sig, atm: r.atm, span: r.span, c: r.c, counts: r.counts, hash: r.hash, isNull: r.isNull } : null);
const shuffleY = (y, block, rnd) => { const by = new Map(); block.forEach((b, k) => (by.get(b) ?? by.set(b, []).get(b)).push(k)); const o = y.slice(); for (const ks of by.values()) { const lab = ks.map((k) => y[k]); for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; } ks.forEach((k, j) => { o[k] = lab[j]; }); } return o; };

function corporaOf() {
  const corpora = [];
  for (const stem of ["eng", "spa", "rus", "fas", "jpn", "tur"]) {
    const doc = udDoc(stem); if (!doc) continue;
    corpora.push({ name: stem, kind: "UD", doc, M: Math.min(128, Math.floor(doc.stream.length / 5)), rows: pairsOf(doc, "FIRST", rngFor(seedFor("name-floor1", stem)), UD_PAIRS).rows });
  }
  const rI = rngFor(seedFor("name-floor1", "irc"));
  for (const day of ircDocs(seedFor("name-floor1", "days"))) corpora.push({ name: day.name, kind: "IRC", doc: day, M: 256, rows: pairsOf(day, "FIRST", rI, IRC_PAIRS).rows });
  return corpora;
}
const sha = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex");

// ── collect <V>: read every sampled first-mention token under one variant; persist rows + records ──────────────────
async function collect(v) {
  const t0 = Date.now(); fs.mkdirSync(OUT, { recursive: true });
  const [opts, F] = VARIANTS[v], corpora = corporaOf();
  const meta = corpora.map((c) => ({ name: c.name, kind: c.kind, M: c.M, rows: c.rows.length }));
  const rowsFile = path.join(OUT, `rows-${v}.json`);
  fs.writeFileSync(rowsFile, JSON.stringify({ meta, rows: corpora.map((c) => c.rows) }));
  const out = { variant: v, opts, F, meta, rowsSha: sha(corpora.map((c) => c.rows.map((r) => [r.s, r.i, r.y]))), records: [], extra: {} };
  for (const [ci, c] of corpora.entries()) {
    const modes = v === "V1" && ci === 0 ? ["delete", "sham"] : ["delete"];
    const r = impactBatch(c.doc.stream, c.rows.map((x) => ({ s: x.s, i: x.i })), { M: c.M, F, modes, seedTag: `${c.name}:${v}`, ...opts });
    out.records.push(r.records.delete.map(slim));
    if (r.records.sham) out.extra.sham = { n: r.records.sham.length, nullShare: round(mean(r.records.sham.map((x) => (x && !x.gap && x.isNull ? 1 : 0)))) };
    console.error(`${v} ${c.name}: ${c.rows.length} tokens, ${round((Date.now() - t0) / 1000, 0)} s`);
    fs.writeFileSync(path.join(OUT, `records-${v}.partial.json`), JSON.stringify({ upTo: ci }));
  }
  if (v === "V1") {
    const c0 = corpora[0], n = Math.min(40, c0.rows.length);
    const det = impactBatch(c0.doc.stream, c0.rows.slice(0, n).map((x) => ({ s: x.s, i: x.i })), { M: c0.M, F, modes: ["delete"], seedTag: `${c0.name}:${v}`, ...opts });
    out.extra.determinism = { same: det.records.delete.filter((r, k) => r && out.records[0][k] && r.hash === out.records[0][k].hash).length, total: n };
  }
  out.seconds = round((Date.now() - t0) / 1000, 1);
  fs.writeFileSync(path.join(OUT, `records-${v}.json`), JSON.stringify(out));
  console.log(JSON.stringify({ variant: v, seconds: out.seconds, extra: out.extra }));
}

// ── analyse: merge the three variants, score, test ──────────────────────────────────────────────────────────────
function analyse() {
  const load = (v) => JSON.parse(fs.readFileSync(path.join(OUT, `records-${v}.json`), "utf8"));
  const R = { V0: load("V0"), V1: load("V1"), V2: load("V2") };
  if (new Set(Object.values(R).map((r) => r.rowsSha)).size !== 1) throw new Error("rows differ across variants");
  const { meta, rows } = JSON.parse(fs.readFileSync(path.join(OUT, "rows-V0.json"), "utf8"));
  const all = []; rows.forEach((rs, ci) => rs.forEach((x, k) => all.push({ x, ci, k, kind: meta[ci].kind })));
  const keep = all.map((a) => ["V0", "V1", "V2"].every((v) => R[v].records[a.ci][a.k])); // a gap in any variant drops the row from all
  const idx = all.map((_, k) => k).filter((k) => keep[k]);
  const A = idx.map((k) => all[k]);
  const y = A.map((a) => a.x.y), block = A.map((a) => a.ci), isUD = A.map((a) => a.kind === "UD");
  const sub = (sc, flag) => { const ix = sc.map((_, k) => k).filter((k) => isUD[k] === flag); return round(aucOf(ix.map((k) => sc[k]), ix.map((k) => y[k]))); };
  const rnd = rngFor(seedFor("name-floor1", "perm"));
  const LEFT = A.map((a) => ARMS.LEFT(a.x.f)), POS = A.map((a) => ARMS.POSITION(a.x.f)), RIV = A.map((a) => ARMS.RIVALS(a.x.f));
  const sL = cvScores(LEFT, y, block), sP = cvScores(POS, y, block), sR = cvScores(RIV, y, block);
  const out = { module: "eval/law/name-floor1.mjs", rowsKept: idx.length, rowsDropped: all.length - idx.length, corpora: meta, rivals: { LEFT: round(aucOf(sL, y)), POSITION: round(aucOf(sP, y)), RIVALS: round(aucOf(sR, y)) }, determinism: R.V1.extra.determinism, sham: R.V1.extra.sham, variants: {}, secondsCollect: Object.fromEntries(Object.entries(R).map(([v, r]) => [v, r.seconds])) };
  const sc = {};
  for (const v of ["V0", "V1", "V2"]) {
    const recs = A.map((a, j) => R[v].records[a.ci][a.k]);
    const share = (cls) => round(mean(recs.filter((_, k) => y[k] === cls).map((r) => (r.isNull ? 0 : 1))));
    const S = recs.map(entryScore), FULL = recs.map(CH.FULL);
    const sF = cvScores(FULL, y, block), sFL = cvScores(FULL.map((f, k) => [...f, ...LEFT[k]]), y, block);
    sc[v] = sF;
    const nulls = []; for (let b = 0; b < 100; b++) { const yp = shuffleY(y, block, rnd); const a = aucOf(cvScores(FULL, yp, block), yp); if (a != null) nulls.push(a); }
    const perBlock = meta.map((m, ci) => { const ix = A.map((_, k) => k).filter((k) => block[k] === ci); return { name: m.name, n: ix.length, auc: round(aucOf(ix.map((k) => sF[k]), ix.map((k) => y[k]))) }; });
    const channels = {}; for (const ch of ["sig", "atm", "span", "c"]) channels[ch] = round(aucOf(cvScores(recs.map(CH[ch]), y, block), y));
    out.variants[v] = { opts: R[v].opts, F: R[v].F, nonNullShare: { names: share(1), controls: share(0) }, S_ENTRY: round(aucOf(S, y)), FULL: { pooled: round(aucOf(sF, y)), UD: sub(sF, true), IRC: sub(sF, false), permQ95: round(quantile(nulls, 0.95)), blocksAbove060: perBlock.filter((b) => b.auc >= 0.6).length, perBlock }, channels, FULL_plus_LEFT: round(aucOf(sFL, y)), FULLplusLEFT_minus_LEFT: bootDiff(sFL, sL, y, block, 1000, 11), FULL_minus_RIVALS: bootDiff(sF, sR, y, block, 1000, 12) };
    console.error(v, JSON.stringify({ ...out.variants[v], FULL: { ...out.variants[v].FULL, perBlock: undefined } }));
  }
  out.V1_minus_V0 = bootDiff(sc.V1, sc.V0, y, block, 1000, 21); out.V2_minus_V1 = bootDiff(sc.V2, sc.V1, y, block, 1000, 22);
  const v0 = out.variants.V0, v1 = out.variants.V1;
  out.verdict = { F1_reference_deaf_slot_channel: v0.nonNullShare.names <= 0.2 && v0.S_ENTRY >= 0.45 && v0.S_ENTRY <= 0.55, F2_floor1_causal_hears: v1.FULL.pooled >= 0.6 && v1.FULL.pooled > v1.FULL.permQ95 && v1.FULL.blocksAbove060 >= 8, F3_beyond_company: v1.FULLplusLEFT_minus_LEFT.point >= 0.03 && v1.FULLplusLEFT_minus_LEFT.lo > 0, F4_lookahead_adds: out.V2_minus_V1.point >= 0.03, F5_reported_UD_IRC: [v1.FULL.UD, v1.FULL.IRC], positionControlInside: out.rivals.POSITION >= 0.45 && out.rivals.POSITION <= 0.55 };
  const hdr = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0];
  out.headerSha256 = createHash("sha256").update(hdr).digest("hex");
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ verdict: out.verdict, V1_minus_V0: out.V1_minus_V0, V2_minus_V1: out.V2_minus_V1, rivals: out.rivals, determinism: out.determinism, sham: out.sham, V: Object.fromEntries(Object.entries(out.variants).map(([v, x]) => [v, { ...x, FULL: { ...x.FULL, perBlock: undefined } }])), headerSha256: out.headerSha256 }, null, 1));
}

const cmd = argv[0];
if (cmd === "collect") await collect(argv[1]);
else if (cmd === "analyse") analyse();
