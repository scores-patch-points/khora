// eval/beings-graded.mjs — TEST: every rule turned on to the degree that it makes a difference that makes a difference (DMD)
//
//   node eval/beings-graded.mjs run --stage <label> [--source dev|tail] [--tail-dir DIR] [--priors-dir DIR] [--stems a,b]
//   node eval/beings-graded.mjs report --stage <label>
//
// THE IDEA UNDER TEST (user, 2026-10-06): "all our rules should be turned on to the degree that they create a difference that makes a difference";
// "[the number] should likely be a born rule". The shipped beings tier turns each rule fully ON or OFF with a typed cut (2 arrivals, a 5% gate, a
// refusal floor, a PROPN share). The graded cast (adapters/text/listening-cast.js, graded()) turns each rule into evidence in [0, 1] per candidate and
// weights each rule by its DMD on THIS material: the label-free change it makes to the conclusion, mapped by the Born rule over rules
// (w_k = D_k^2 / sum D^2). No candidate is cut by a rule; a typed count is no one's floor.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of the graded cast on any text) ═══════════════════════════════════
// DISCLOSURE. Seen before this header: the whole beings ladder (eval/beings-ladder.mjs, stages s0-s5, t1, t2) and a post-hoc diagnostic on its
// saved results: across 25 stems x 3 runs, a rule's label-free change to the beings set correlated with its measured gain (standing rho 0.92, affix
// 0.93, refusal 0.00; pooled with |gain| 0.82). That diagnostic motivated this test; it is not evidence for it. No graded number has been read.
//
// THE FOUR EVIDENCE RULES (each in [0, 1] per candidate; the candidate set is every word unit the cast reads, including one-mention words):
//   class   mean NOUN+PROPN mass of the form's occurrences (classAt)         [replaces refusal: plurality / loss-bounded floor]
//   proper  mean PROPN+X mass of its occurrences                              [replaces the names-exempt cut and the common-noun deferral]
//   key     1 - the exact binomial tail of its arrivals vs the received rate  [replaces the 5% standing gate]
//   recur   mid-rank percentile of its arrivals among this material's candidates [replaces the 2-arrivals floor]
// The affix ear (A) is NOT graded: it re-draws the word grid, and a grid cannot be applied to a degree without making the ledger nondeterministic.
// Graded and shipped arms read the SAME grid (affix on), so A is held fixed; its DMD (the share of tokens it changes) is reported only.
// DMD OF A RULE. The conclusion = the candidates whose Born mass p = m^2 / sum m^2 (m = equal-weight mean evidence) exceeds the uniform share 1/N.
//   D_k = 1 - Jaccard(conclusion, conclusion with rule k's evidence dropped). This is FIRST-ORDER: it measures a difference in the conclusion, not
//   whether the difference propagates into later readings. Said once: it is a weaker DMD than the kernel's dmdWindow.
// WEIGHTS. w_k = D_k^2 / sum_j D_j^2 (the Born map over rules); if every D_k is 0 the weights are equal (the declared bootstrap).
// MASS. m_i = sum_k w_k e_ki. A being is ranked by m_i.
//
// ARMS (per block of the ladder's plan, fresh cast per block, the declared language, case-stripped text):
//   B0   the ORIGINAL design (gate, plurality refusal, no affix)             — what the competence card measured
//   B1   the SHIPPED design (names-exempt, loss-bounded, affix on)           — the on/off system under test
//   G    graded, weights "dmd"
//   Gq   graded, weights "equal"                                              [control: does the DMD weighting matter?]
//   Gd   graded, DMD weights ROTATED onto the wrong rules                     [control built to fail]
//   Sk   each rule alone as the ranking (class, proper, key, recur)           [which single rule carries it]
// SET SIZE. A graded ranking has no membership cut (the Born cut that would give one is not derived here). To compare with on/off membership the
//   graded arms take the top K by mass, K = |B1| of that block (SIZE-MATCHED). This is a comparison device, not a proposal; a graded cast needs a
//   derived cut before it can ship, and that is not tested here.
// GOLD (UD PROPN, case-stripped text, exact match, the ladder's blocks): REC = PROPN forms recurring >= 2 in the block (the ladder's gold);
//   ALL = every PROPN form in the block; SINGLE = ALL minus REC (a name mentioned once, the single-mention rule).
// METRICS. macro F1 over blocks with gold on REC and on ALL; AUC of mass for REC among candidates with >= 2 arrivals; for SINGLE: among the graded
//   top-K set, precision and recall of the one-arrival candidates against SINGLE, and the base rate (SINGLE among all one-arrival candidates).
// DATA. DEV (shipped priors; INFORMATIONAL, the ladder's design data), fold A and fold B (the held-out 20% slices with priors rebuilt without them,
//   eval/make-fold-priors.mjs; neither the priors nor any diagnostic has seen them). Verdicts are on fold A and fold B only.
// CONTROLS. C3 causality: graded() after 60% of block 0 equals a fresh cast fed that 60%. C1 licence: G scored against the NEXT block's gold must fall
//   below G on its own (misaligned). C-order: the graded ranking is invariant to the order of equal-mass candidates (ties broken by arrivals, then form).
// VERDICTS (SESOI 0.02 F1, a bare provisional number).
//   VG1 NOT WORSE      mean dF1(G - B1) on REC >= -0.01 on BOTH folds, and at most 5 stems below B1 - 0.02.
//   VG2 DMD MATTERS    G beats Gq in >= 15 of 25 stems on both folds AND beats Gd in >= 18 of 25 on both folds.
//   VG3 SINGLE MENTION on both folds, in >= 15 stems the G top-K contains one-arrival candidates, recalls > 0 of SINGLE, and their precision >= 2 x base rate.
//   VG4 ALL-PROPN GOLD mean dF1(G - B1) on ALL >= +0.02 on BOTH folds.
//   GRADED BEATS ON/OFF  VG1 and VG2 and (VG3 or VG4).   NOT SHOWN  otherwise (each failed clause named).
// PREDICTIONS (blind; orders are the claims).
//   P1 VG1 holds with |mean dF1| <= 0.02: a smooth combination of the same evidence ranks about as well as the cuts it replaces.
//   P2 VG2 FAILS on the Gq clause: equal weights are within 0.01 of DMD weights in most stems (the evidence rules already agree), and the Gd control is
//      below G in >= 18 of 25 stems (a wrong weighting does hurt).
//   P3 VG3 holds: one-mention names are recovered at >= 2x the base rate in >= 15 stems.
//   P4 VG4 holds (G recovers names that the 2-arrivals floor cannot).
//   P5 The DMD weights differ by language: for at least 2 of the 4 rules the across-stem coefficient of variation of the Born weight exceeds 0.3.
//   P6 Of the single rules, `proper` is the best single ranking in >= 15 stems on REC.
// NOT TESTED: an unsupervised membership cut for the graded cast; propagating DMD (dmdWindow) in place of first-order DMD; the affix ear graded;
//   informal English (IRC) — a separate run once this one is read.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { createListeningCast, ORIGINAL } from "../adapters/text/listening-cast.js";
import { makeEar } from "../adapters/text/ear.js";
import { casedFraction, CASED_SCRIPT_FLOOR } from "../the-fold/language-context.js";
import { PRIORS_DIR } from "../the-fold/language-grammar.js";
import { readConllu, signTest, EVAL_DIR, auc } from "./competence/lib.mjs";
import { planBlocks, goldSets, sentenceText, prf, aggregate, pairedTest, norm } from "./competence/r3-beings.mjs";
import { loadGrammar } from "./beings-ladder.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, "beings-graded-results");
const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
const RULES = ["class", "proper", "key", "recur"];
const SESOI = 0.02;
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const forms = (list) => new Set(list.map((x) => norm(x.surface ?? x)));

const earOf = (g) => makeEar({ posPrior: g.posPrior, proclitics: g.proclitics, enclitics: g.enclitics, contractions: g.contractions });
const hearOf = (stem, g) => { const ear = earOf(g); const ctx = { language: stem, grammar: { posPrior: g.posPrior, framePrior: g.framePrior, refusalFloor: g.refusalFloor }, ear, declared: true }; return () => ctx; };

let TAIL_DIR = null;
function sentencesFor(stem, source) {
  if (source === "tail") { const p = path.join(TAIL_DIR ?? "", stem, "tail.conllu"); return TAIL_DIR && fs.existsSync(p) ? readConllu(p) : null; }
  const p = path.join(EVAL_DIR, stem, "dev.conllu");
  return fs.existsSync(p) ? readConllu(p) : null;
}
const topK = (cands, K) => new Set(cands.slice(0, K).map((c) => norm(c.surface)));
const rankBy = (g, w) => {
  // re-rank a graded result's candidates under a given weight vector (the evidence is already in each candidate)
  const res = g.candidates.map((c) => ({ ...c, mass: c.evidence.reduce((a, e, k) => a + w[k] * e, 0) }));
  res.sort((a, b) => b.mass - a.mass || b.arrivals - a.arrivals || (a.surface < b.surface ? -1 : 1));
  return res;
};

async function runStem(stem, { source, priorsDir }) {
  const sentences = sentencesFor(stem, source);
  if (!sentences?.length) return { stem, source, gap: "no_gold" };
  const g0 = loadGrammar(stem, { dir: priorsDir, affix: false, floor: false });
  if (!g0) return { stem, source, gap: "no_prior" };
  const g1 = loadGrammar(stem, { dir: priorsDir, affix: true, floor: true });
  const plan = planBlocks(sentences.length);
  if (!plan.count) return { stem, source, gap: "no_block" };
  const used = sentences.slice(0, plan.used);
  const rows = { B0: [], B1: [], G: [], Gq: [], Gd: [], Gm: [], Gqm: [], ...Object.fromEntries(RULES.map((r) => [`S_${r}`, []])), ...Object.fromEntries(RULES.map((r) => [`Sm_${r}`, []])) };
  const rowsAll = { B0: [], B1: [], G: [], Gq: [], Gd: [] };
  const single = [], weightsPerBlock = [], aucs = [], misaligned = [], sizes = [], checks = {};
  const blocks = [];
  for (let b = 0; b < plan.count; b++) {
    const sl = used.slice(b * plan.size, (b + 1) * plan.size);
    const texts = sl.map((s) => sentenceText(s).text.toLowerCase());
    blocks.push({ sl, texts });
  }
  const goldOf = blocks.map((bl) => ({ rec: goldSets(bl.sl).propn, all: goldSets(bl.sl, { recur: 1 }).propn }));
  blocks.forEach((bl, b) => {
    const { texts } = bl, { rec, all } = goldOf[b];
    const cn = !(casedFraction(texts.join("\n")) >= CASED_SCRIPT_FLOOR);
    const b0 = createListeningCast({ hear: hearOf(stem, g0), commonNouns: cn, ...ORIGINAL });
    texts.forEach((t) => b0.add(t));
    const c1 = createListeningCast({ hear: hearOf(stem, g1), commonNouns: cn, graded: true });
    texts.forEach((t) => c1.add(t));
    const B0 = forms(b0.beings()), B1 = forms(c1.beings());
    const K = B1.size;
    const gr = c1.graded({ weights: "dmd" })[0];
    if (!gr) return;
    const wD = gr.weights, wQ = RULES.map(() => 1 / RULES.length), wX = RULES.map((_, k) => gr.bornWeights[(k + 1) % RULES.length]);
    const G = topK(gr.candidates, K), Gq = topK(rankBy(gr, wQ), K), Gd = topK(rankBy(gr, wX), K);
    const sk = Object.fromEntries(RULES.map((r, k) => [r, topK(rankBy(gr, RULES.map((_, j) => (j === k ? 1 : 0))), K)]));
    const arms = { B0, B1, G, Gq, Gd };
    for (const [a, set] of Object.entries(arms)) { rows[a].push(prf(set, rec)); rowsAll[a].push(prf(set, all)); }
    for (const r of RULES) rows[`S_${r}`].push(prf(sk[r], rec));
    // EXPLORATORY (post-hoc, added after the pre-registered stage g0 was read; labelled so): the same rankings restricted to candidates with >= 2 arrivals,
    // so the REC gold (recurring names only) does not charge the graded arms for the one-mention words they rank. Pre-registered numbers are unchanged.
    const onlyMulti = (cs) => cs.filter((c) => c.arrivals >= 2);
    rows.Gm.push(prf(topK(onlyMulti(gr.candidates), K), rec));
    rows.Gqm.push(prf(topK(onlyMulti(rankBy(gr, wQ)), K), rec));
    for (const [k, r] of RULES.entries()) rows[`Sm_${r}`].push(prf(topK(onlyMulti(rankBy(gr, RULES.map((_, j) => (j === k ? 1 : 0)))), K), rec));
    // AUC of the graded mass for REC among candidates with >= 2 arrivals
    const multi = gr.candidates.filter((c) => c.arrivals >= 2);
    aucs.push(rec.size && multi.length > 1 ? auc(multi.map((c) => c.mass), multi.map((c) => rec.has(norm(c.surface)))) : null);
    // single-mention slice
    const singleGold = new Set([...all].filter((f) => !rec.has(f)));
    const ones = gr.candidates.filter((c) => c.arrivals === 1);
    const baseRate = ones.length ? ones.filter((c) => singleGold.has(norm(c.surface))).length / ones.length : null;
    const pick = [...G].filter((f) => ones.some((c) => norm(c.surface) === f));
    const hit = pick.filter((f) => singleGold.has(f)).length;
    single.push({ nPicked: pick.length, hit, singleGold: singleGold.size, goldReachable: ones.filter((c) => singleGold.has(norm(c.surface))).length, baseRate });
    weightsPerBlock.push({ dmd: gr.dmd, born: gr.bornWeights });
    sizes.push({ K, cands: gr.candidates.length });
    // misaligned licence: G vs the next block's gold
    const nx = goldOf[(b + 1) % blocks.length].rec;
    misaligned.push(prf(G, nx));
    if (b === 0) {                                              // C3: the 60% prefix answer equals a fresh cast fed that prefix
      const k = Math.max(1, Math.floor(texts.length * 0.6));
      const mid = createListeningCast({ hear: hearOf(stem, g1), commonNouns: cn, graded: true });
      let snap = null;
      texts.forEach((t, i) => { mid.add(t); if (i + 1 === k) snap = JSON.stringify(mid.graded()[0]?.candidates.slice(0, 50).map((c) => [c.surface, round(c.mass, 9)])); });
      const fresh = createListeningCast({ hear: hearOf(stem, g1), commonNouns: cn, graded: true });
      texts.slice(0, k).forEach((t) => fresh.add(t));
      checks.c3_prefix = JSON.stringify(fresh.graded()[0]?.candidates.slice(0, 50).map((c) => [c.surface, round(c.mass, 9)])) === snap;
    }
  });
  const agg = (rs) => { const a = aggregate(rs); return { F1: round(a.macroF1), P: round(a.macroP), R: round(a.macroR), blocks: a.blocks, size: round(a.meanSize, 1) }; };
  const blockF1 = (rs) => rs.map((r) => (r.gold ? r.f1 ?? 0 : null));
  const res = { stem, source, plan, checks, rec: {}, all: {}, blockF1: {} };
  for (const a of Object.keys(rows)) { res.rec[a] = agg(rows[a]); res.blockF1[a] = blockF1(rows[a]); }
  for (const a of Object.keys(rowsAll)) { res.all[a] = agg(rowsAll[a]); res.blockF1[`all_${a}`] = blockF1(rowsAll[a]); }
  res.auc = round(mean(aucs.filter((x) => x != null)));
  res.licence = { G: res.rec.G.F1, misaligned: round(aggregate(misaligned).macroF1) };
  res.single = { blocksWithPicks: single.filter((s) => s.nPicked > 0).length, picked: single.reduce((a, s) => a + s.nPicked, 0), hit: single.reduce((a, s) => a + s.hit, 0), singleGold: single.reduce((a, s) => a + s.singleGold, 0), goldReachable: single.reduce((a, s) => a + s.goldReachable, 0), baseRate: round(mean(single.map((s) => s.baseRate).filter((x) => x != null))) };
  res.single.precision = res.single.picked ? round(res.single.hit / res.single.picked) : null;
  res.single.recall = res.single.singleGold ? round(res.single.hit / res.single.singleGold) : null;
  res.weights = { dmd: RULES.map((_, k) => round(mean(weightsPerBlock.map((w) => w.dmd[k])))), born: RULES.map((_, k) => round(mean(weightsPerBlock.map((w) => w.born[k])))) };
  res.sizes = { K: round(mean(sizes.map((s) => s.K)), 1), candidates: round(mean(sizes.map((s) => s.cands)), 0) };
  return res;
}

// ── report ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const load = (stage) => { const d = path.join(OUT_DIR, stage); return fs.existsSync(d) ? Object.fromEntries(fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))])) : {}; };
const f3 = (x) => (x == null ? "  -  " : Number(x).toFixed(3));
const sgn = (x) => (x == null ? "  -  " : (x >= 0 ? "+" : "") + Number(x).toFixed(3));
const cv = (xs) => { const m = mean(xs); return m ? Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m : null; };
function report(R, stage) {
  const stems = STEMS25.filter((s) => R[s]?.rec);
  const L = [`# beings graded — stage ${stage}\n`, "stem      B0     B1     G      Gq     Gd     | dF1 G-B1  G-Gq   G-Gd | S:class proper key   recur | AUC   | ALL: B1    G     | weights(born) class proper key recur"];
  const dB1 = [], dQ = [], dD = [], dAll = [];
  for (const s of stems) {
    const r = R[s].rec, a = R[s].all;
    dB1.push(r.G.F1 - r.B1.F1); dQ.push(r.G.F1 - r.Gq.F1); dD.push(r.G.F1 - r.Gd.F1); dAll.push(a.G.F1 - a.B1.F1);
    L.push(`${s.padEnd(9)} ${["B0", "B1", "G", "Gq", "Gd"].map((k) => f3(r[k].F1)).join(" ")}  | ${sgn(r.G.F1 - r.B1.F1)} ${sgn(r.G.F1 - r.Gq.F1)} ${sgn(r.G.F1 - r.Gd.F1)} | ${RULES.map((k) => f3(r[`S_${k}`].F1)).join(" ")} | ${f3(R[s].auc)} | ${f3(a.B1.F1)} ${f3(a.G.F1)} | ${R[s].weights.born.map(f3).join(" ")}`);
  }
  const up = (xs, t = 0.0005) => xs.filter((x) => x > t).length, dn = (xs, t = 0.0005) => xs.filter((x) => x < -t).length;
  L.push(`mean dF1: G-B1 ${sgn(mean(dB1))}  G-Gq ${sgn(mean(dQ))}  G-Gd ${sgn(mean(dD))}   on ALL gold G-B1 ${sgn(mean(dAll))}`);
  L.push(`stems G>B1 ${up(dB1)} / G<B1 ${dn(dB1)} (below B1-0.02: ${dn(dB1, SESOI)});  G>Gq ${up(dQ)} / <${dn(dQ)};  G>Gd ${up(dD)} / <${dn(dD)};  ALL G>B1 ${up(dAll)} / <${dn(dAll)}`);
  const t = (u, d) => `p=${signTest(u, d).p.toFixed(4)}`;
  const em = stems.filter((x) => R[x].rec.Gm);
  if (em.length) {
    const dm = em.map((x) => R[x].rec.Gm.F1 - R[x].rec.B1.F1), dqm = em.map((x) => R[x].rec.Gm.F1 - R[x].rec.Gqm.F1), eqb = em.map((x) => R[x].rec.Gqm.F1 - R[x].rec.B1.F1);
    const bestSm = em.map((x) => RULES.map((k) => R[x].rec[`Sm_${k}`].F1)).map((v) => RULES[v.indexOf(Math.max(...v))]);
    L.push(`EXPLORATORY multi-arrival only: mean dF1 Gm-B1 ${sgn(mean(dm))} (Gm>B1 in ${up(dm)}), Gqm-B1 ${sgn(mean(eqb))} (in ${up(eqb)}), Gm-Gqm ${sgn(mean(dqm))}; best single rule ${RULES.map((k) => `${k} ${bestSm.filter((y) => y === k).length}`).join(", ")}; best single Sm vs B1: ${RULES.map((k) => `${k} ${sgn(mean(em.map((x) => R[x].rec[`Sm_${k}`].F1 - R[x].rec.B1.F1)))}`).join(" ")}`);
  }
  L.push(`across-stem sign tests (one-sided, G better): vs B1 ${t(up(dB1), dn(dB1))}; vs Gq ${t(up(dQ), dn(dQ))}; vs Gd ${t(up(dD), dn(dD))}; ALL vs B1 ${t(up(dAll), dn(dAll))}`);
  L.push("\n## single mention (graded top-K, one-arrival candidates): picked, hit, precision, base rate, recall of SINGLE gold");
  let ok = 0;
  for (const s of stems) { const x = R[s].single; const good = x.picked > 0 && x.hit > 0 && x.precision != null && x.baseRate != null && x.precision >= 2 * x.baseRate; if (good) ok += 1; L.push(`${s.padEnd(9)} picked ${String(x.picked).padStart(4)} hit ${String(x.hit).padStart(3)} prec ${f3(x.precision)} base ${f3(x.baseRate)} recall ${f3(x.recall)} ${good ? "ok" : ""}`); }
  L.push(`stems with precision >= 2x base and hits > 0: ${ok}/${stems.length}`);
  L.push("\n## DMD weights across stems (mean Born weight per rule) and coefficient of variation");
  RULES.forEach((k, i) => { const w = stems.map((s) => R[s].weights.born[i]); L.push(`${k.padEnd(7)} mean ${f3(mean(w))}  cv ${f3(cv(w))}  min ${f3(Math.min(...w))}  max ${f3(Math.max(...w))}`); });
  const bestSingle = stems.map((s) => RULES.map((k) => R[s].rec[`S_${k}`].F1)).map((v) => RULES[v.indexOf(Math.max(...v))]);
  L.push(`best single rule by stem: ${RULES.map((k) => `${k} ${bestSingle.filter((x) => x === k).length}`).join(", ")}`);
  const bad = stems.filter((s) => R[s].checks.c3_prefix === false);
  L.push(`C3 prefix invariance: ${bad.length ? "FAILED on " + bad.join(",") : "holds on every stem"}; C1 licence (G vs misaligned) weak on: ${stems.filter((s) => !(R[s].licence.misaligned < 0.5 * R[s].licence.G)).join(",") || "none"}`);
  return { text: L.join("\n"), dB1, dQ, dD, dAll, singleOk: ok, n: stems.length };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = { stage: null, stems: null, source: "dev", priorsDir: PRIORS_DIR };
  for (let i = 0; i < rest.length; i++) { const a = rest[i]; if (a === "--stage") o.stage = rest[++i]; else if (a === "--stems") o.stems = rest[++i].split(","); else if (a === "--source") o.source = rest[++i]; else if (a === "--priors-dir") o.priorsDir = rest[++i]; else if (a === "--tail-dir") TAIL_DIR = rest[++i]; }
  if (!o.stage) { console.error("usage: beings-graded.mjs run|report --stage <label> [--source dev|tail] [--tail-dir DIR] [--priors-dir DIR] [--stems a,b]"); process.exit(2); }
  if (cmd === "run") {
    const dir = path.join(OUT_DIR, o.stage); fs.mkdirSync(dir, { recursive: true });
    for (const stem of o.stems ?? STEMS25) { const t0 = Date.now(); const r = await runStem(stem, o); r.ms = Date.now() - t0; fs.writeFileSync(path.join(dir, `${stem}.json`), JSON.stringify(r)); console.error(`${stem}: ${r.gap ?? "ok"} ${r.ms}ms`); }
  } else if (cmd === "report") {
    const R = load(o.stage); console.log(report(R, o.stage).text);
  } else { console.error("unknown command"); process.exit(2); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
export { report, STEMS25, RULES };
void createHash;
