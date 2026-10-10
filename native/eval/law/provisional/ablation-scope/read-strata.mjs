// eval/law/provisional/ablation-scope/read-strata.mjs — READ matched names / unlabelled tokens in local-count strata with the ablation instrument (impactBatch).
//
//   node read-strata.mjs --corpus irc|wp|mm --doc NAME --out DIR [--strata c1,c2,...] [--nA 12] [--nB 6] [--n1 6] [--M 256] [--tag t] [--ctl 8]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file; tests and thresholds are in analyse-strata.mjs, also written first) ═══
// WHY. NAME-RULE-RESULTS.md records an UNTESTED hypothesis: "affects the field" (S_ENTRY: how many referent-entry slots change when a token is deleted) measures
// FRAGILITY NEAR THE READER'S RECURRENCE FLOOR, not name-ness; a frequent character loses nothing when one mention is deleted. IRC S_ENTRY AUC 0.843 was tied by a
// local mention count (0.853) and confounded by message-initial position (92.1% of nickname mentions open their message). This lens measures S_ENTRY (and the full
// record) INSIDE strata of the local mention count c, with names and unlabelled tokens matched pairwise on c AND on within-message position.
// DISCLOSURE (what I had seen before this header). The aggregate tables of NAME-RULE-RESULTS.md, NAME-COMPANY-RESULTS.md, NAME-SHAPE-RESULTS.md (no per-token or
// per-stratum numbers: the stored JSONs hold aggregates only). A timing benchmark (bench.mjs: 6 random tokens per corpus, seconds only: IRC 3.6 s, WP 1.9 s per
// token impact under load 270). The Middlemarch GOLD LIST (which forms are gold, by capitalisation; curated by hand from the list, before any reading, see lib-book.mjs).
// No ablation record of any token in a stratum has been read. The IRC days were drawn by seed from the pool of English channel-days not used by name-rule-informal
// or name-company (days.json); other ants (kinds-swarm) read some of those days with other instruments; this is stated, not corrected.
//
// READER AND WINDOW. impact.mjs impactBatch, mode delete, frame-causal F=0, the three prior-free readers exactly as name-rule-informal.mjs used them. M = 256 messages
// (IRC; about 3,000 word units) or 128 sentences (WP, Middlemarch). One token = one snapshot + one re-read.
// TOKENS. Eligible: s >= M (full window), form >= 3 characters, form occurs >= 3 times in the document, and not the speaker's own nick (IRC). Gold: IRC = the form of a
// nick that spoke >= 3 messages that day (topic words removed); WP = hand-verified cast forms (titles removed); Middlemarch = capitalised-form gold (evaluation labels only).
// Negatives (UNLABELLED): not a gold form; excluded from the pool: any form equal to a nick that spoke at all (IRC), any cast token incl. titles (WP), any form
// capitalised in >= 20% of >= 3 non-initial occurrences, titles, curated non-names (Middlemarch). Positive-unlabelled; stated.
// STRATA of the local count c (occurrences of the form in the reader's window [s-M, s], the evaluated message in full): c1, c2, c3, c4_6, c7_15, c16p.
// MATCHING (lib-pairs.mjs): within one document, same third-octave bin of c (floor(3 log2 c)), same within-message position class (I0 initial / I1 / I2 later),
// then nearest on form frequency (log2 bin <= 1 apart), character length (<= 2 apart), message length (<= 1 log2 bucket) and distance in the stream. Groups: A = I0 (message-
// initial), B = I1 and I2 (not initial). At most 4 occurrences of one form per cell and class. A pair with no admissible partner is dropped and counted.
// RECORDED PER TOKEN (everything the impact record holds, nothing fitted): counts(72), sig(85), atm(19), span(32), c(8), extent, isNull, noSlot, nTokenSlots,
// laterEdges, hash; plus the design fields (stratum, group, c, cBefore, last16, form frequency, length, position, pair id, class y). Pairs are read in RANDOM order, 5 pairs per
// chunk, so a killed run still holds an unbiased subsample.
// CONTROLS BUILT TO FAIL (per run): K1 sham ablation of --ctl tokens must give 100% null signatures; K6 determinism: --ctl tokens re-read must reproduce the hash.
// Position (message index, in-message index) and local count are matched, so their AUCs must lie in [0.45, 0.55] (checked in analyse-strata.mjs).
// SIZES are command-line parameters, recorded in the output. No threshold or prediction lives in this file.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

// ═══ AMENDMENT 1 (2026-10-07; written after discovery ROUND 1 was analysed with analyse-strata.mjs; the header above and its sha256 are unchanged) ═══════════════════════════════
// Round 1 (matching v1) read 1,831 pairs. Under the registered voiding rules NO cell was ACTIVE (verdict NO-SCOPE) mainly because controls failed: character length 0.55-0.66, War and
// Peace message index 0.32-0.43 at c16p. That is a defect of MY matching (length tolerance 2, weak position term), not a finding. The amendment only TIGHTENS: --match v2 (lib-pairs.mjs
// pairsForCellV2: |dlen|<=1, |dfbin|<=1, |ds|<=20% of the stream, signed running balance on length, frequency bin, position, local count, message length) and --skip-dir DIR (never re-read a
// token read in another round). Design-time control (design-check.mjs, no ablation read) must put the pooled controls in [0.45, 0.55] before a round is read. Round 1 stays in the record
// (results/d1). Nothing else changes: same reader, same strata, same records.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { impactBatch, rngFor, seedFor } from "../../impact.mjs";
import { loadIrcDay, loadWp, IRC_ROOT } from "./lib-data.mjs";
import { loadMiddlemarch } from "./lib-book.mjs";
import { loadUd } from "./lib-ud.mjs";
import { indexAndCandidates, pairsForCell, pairsForCellV2, pairsForCellV3, STRATA } from "./lib-pairs.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CORPUS = opt("--corpus", "irc"), DOCNAME = opt("--doc", ""), OUT = opt("--out", "."), TAG = opt("--tag", "");
const strata = opt("--strata", STRATA.join(",")).split(",");
const nA = Number(opt("--nA", 12)), nB = Number(opt("--nB", 6)), n1 = Number(opt("--n1", 6)), CTL = Number(opt("--ctl", 8));
const M = Number(opt("--M", CORPUS === "irc" ? 256 : 128)), CHUNK = 5;
const round6 = (x) => Number(Number(x).toFixed(6));
const arr = (a) => Array.from(a, round6);

function loadDoc() {
  if (CORPUS === "ud") return loadUd(DOCNAME, opt("--split", "dev"));   // --doc eng --split dev|test (test only for a confirmation run)
  if (CORPUS === "irc") return loadIrcDay(path.join(IRC_ROOT, `${DOCNAME}.txt`), DOCNAME);
  return CORPUS === "wp" ? loadWp() : loadMiddlemarch();
}
const slim = (rec) => ({ counts: arr(rec.counts), sig: arr(rec.sig), atm: arr(rec.atm), span: arr(rec.span), c: arr(rec.c), extent: rec.extent, isNull: rec.isNull, noSlot: rec.noSlot, nTokenSlots: rec.nTokenSlots, laterEdges: rec.laterEdges, hash: rec.hash });

async function main() {
  const t0 = Date.now();
  const doc = loadDoc();
  const cand = indexAndCandidates(doc, M);
  const SKIPDIR = opt("--skip-dir", null);
  if (SKIPDIR) {
    const used = new Set();
    for (const f of fs.existsSync(SKIPDIR) ? fs.readdirSync(SKIPDIR).filter((x) => x.endsWith(".jsonl")) : []) for (const l of fs.readFileSync(path.join(SKIPDIR, f), "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); if (o.doc === doc.name) used.add(`${o.s}:${o.i}`); }
    cand.P = cand.P.filter((r) => !used.has(`${r.s}:${r.i}`)); cand.N = cand.N.filter((r) => !used.has(`${r.s}:${r.i}`));
  }
  if (opt("--skip", "0") === "1") {   // a second draw (new tag) must not re-read a token already read for this document
    const used = new Set();
    for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT).filter((x) => x.endsWith(".jsonl")) : []) for (const l of fs.readFileSync(path.join(OUT, f), "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); if (o.doc === doc.name) used.add(`${o.s}:${o.i}`); }
    cand.P = cand.P.filter((r) => !used.has(`${r.s}:${r.i}`)); cand.N = cand.N.filter((r) => !used.has(`${r.s}:${r.i}`));
  }
  const design = {}, rows = [];
  for (const st of strata) for (const grp of ["A", "B"]) {
    const n = st === "c1" ? n1 : grp === "A" ? nA : nB;
    if (n <= 0) continue;
    const r = ({ v1: pairsForCell, v2: pairsForCellV2, v3: pairsForCellV3 }[opt("--match", "v1")])(cand, doc, M, { grp, stratum: st, n, seedTag: TAG });
    design[`${grp}:${st}`] = { requested: n, got: r.pairs.length, dropped: r.dropped, nPos: r.nPos, nNegPool: r.nNegPool };
    for (const p of r.pairs) rows.push({ grp, stratum: st, pos: p.pos, neg: p.neg });
  }
  const rnd = rngFor(seedFor("ablation-scope", "order", doc.name, TAG, strata.join()));
  for (let k = rows.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [rows[k], rows[j]] = [rows[j], rows[k]]; }
  rows.forEach((r, k) => { r.pair = `${doc.name}#${TAG}${k}`; });
  fs.mkdirSync(OUT, { recursive: true });
  const base = `${doc.name.replace(/\//g, "_")}${TAG ? "." + TAG : ""}.${strata.join("-")}`;
  const file = path.join(OUT, `${base}.jsonl`);
  fs.writeFileSync(file, "");
  console.error(`${doc.name}: ${doc.stream.length} units, ${doc.goldPos.size} gold occurrences, ${rows.length} pairs planned ${JSON.stringify(design)}`);
  let done = 0, gaps = 0;
  for (let a = 0; a < rows.length; a += CHUNK) {
    const chunk = rows.slice(a, a + CHUNK), toks = [];
    for (const r of chunk) { toks.push({ ...r.pos, y: 1, pair: r.pair, id: r.pos.w }); toks.push({ ...r.neg, y: 0, pair: r.pair, id: r.neg.w }); }
    const res = impactBatch(doc.stream, toks.map((t) => ({ s: t.s, i: t.i, id: t.id })), { M, F: 0, modes: ["delete"], seedTag: `${doc.name}:${TAG}`, maxSeconds: Infinity });
    const lines = [];
    toks.forEach((t, k) => {
      const rec = res.records.delete[k];
      if (!rec || rec.gap) { gaps += 1; return; }
      const { s, i, w, y, pair, c, cBefore, last16, docCount, rate, len, sl, fbin, stratum, mb, pc, grp } = t;
      lines.push(JSON.stringify({ corpus: CORPUS, doc: doc.name, pair, y, s, i, w, c, cBefore, last16, docCount, rate, len, sl, fbin, stratum, mb, pc, grp, rec: slim(rec) }));
    });
    fs.appendFileSync(file, lines.map((l) => l + "\n").join(""));
    done += chunk.length;
    if ((a / CHUNK) % 5 === 0) console.error(`  ${done}/${rows.length} pairs, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  // controls: sham (must be 100% null) and determinism (hash must reproduce)
  const ctl = rows.slice(0, CTL).flatMap((r) => [{ s: r.pos.s, i: r.pos.i, id: r.pos.w }, { s: r.neg.s, i: r.neg.i, id: r.neg.w }]).slice(0, CTL);
  const sham = impactBatch(doc.stream, ctl, { M, F: 0, modes: ["sham"], seedTag: `${doc.name}:${TAG}`, maxSeconds: Infinity });
  const redo = impactBatch(doc.stream, ctl, { M, F: 0, modes: ["delete"], seedTag: `${doc.name}:${TAG}`, maxSeconds: Infinity });
  const orig = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const key = (t) => `${t.s}:${t.i}`;
  const byKey = new Map(orig.map((o) => [`${o.s}:${o.i}`, o.rec.hash]));
  const summary = { corpus: CORPUS, doc: doc.name, M, tag: TAG, match: opt("--match", "v1"), strata, sizes: { nA, nB, n1 }, design, tokensRead: orig.length, gaps, seconds: round6((Date.now() - t0) / 1000),
    K1_sham: { nullShare: ctl.length ? sham.records.sham.filter((r) => r && r.isNull).length / ctl.length : null, n: ctl.length },
    K6_determinism: { same: ctl.filter((t, k) => redo.records.delete[k] && byKey.get(key(t)) === redo.records.delete[k].hash).length, n: ctl.length },
    headerSha256: createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex"), file };
  fs.writeFileSync(path.join(OUT, `${base}.summary.json`), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary));
}
await main();
