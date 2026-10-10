// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══  eval/barker/profiles-smoke.mjs  (Barker, the profile: gates)
// Written BEFORE the first run. This file implements, verbatim, the gates, controls, power checks and pass rules stated
// in the pre-registration header of eval/barker/profiles.mjs (G0 integrity, G4 noise floor, G5 shuffle control,
// G6 planted word order, G7 determinism, G8 hygiene, N3/P3/P4 sequence and Zipf plants, the descriptive K-facts and
// the informational R1-xcheck). Nothing is restated or tuned here. Splits: TRAIN and DEV only; the held-out split of any
// corpus is never opened (the profile reader's split guard throws). No model, no network, no EO module.
//   usage: node eval/barker/profiles-smoke.mjs g0 | g4 | g5 | g5c | g6 | g7 | plants | kfacts | xcheck | hygiene | twins | coverage | all
//   The G4/K-facts/xcheck gates read cached profiles from /private/tmp/claude-501/barker/profiles/ (build them first with
//   `node eval/barker/profiles.mjs build <system>`); G0/G5/G6/G7 read the corpora directly.
// `twins` (S-twin: cmn vs cmn-hans, kor vs kor-kaist) and `coverage` (typed-gap census) are DESCRIPTIVE diagnostics added with no pass rule:
// they print and gate nothing. Output: /private/tmp/claude-501/barker/out/profiles-smoke.json (failures are reported as failures).
// ── ADDENDUM F (2026-10-05; written after G5 was run and FAILED as registered; before G5c below was ever run) ────────────────────
//  What had been SEEN: G5 as registered in profiles.mjs (cluster-robust z, band +/-1.96, in-band fraction not significantly below
//  0.95) returned: (a) FAIL, 528 of 576 (language, cell) pairs in band = 0.917, P(out-of-band >= observed | 5%) = 0.0005;
//  (b) PASS, dependency length rose in 49 of 49 systems. THE REGISTERED RULE IS NOT CHANGED AND THE RESULT STANDS AS A FAIL.
//  Diagnosis, run after the fact and labelled post hoc: over 200 independent shuffles of the hun sample the mean order share is
//  0.5000 (|z of mean| <= 1.83 in all 7 cells tried), so the shuffle is symmetric and the instrument sends order to chance; the
//  cluster-robust z of the exact null has SD 1.04 and 6.4 percent beyond +/-1.96 over 940 null draws (4 languages x 20 shuffles x
//  12 cells), and its 12 cells per language are dependent (a12 pools the others), so the registered binomial rule, which treats them
//  as independent tests of a 5 percent band, was miscalibrated. A companion rule is REGISTERED HERE, before its first run, to test
//  the same claim (the instrument reads order, not labels) with a calibrated statistic; it does not replace G5(a):
//  G5c: for each of the 12 systems {arb cmn deu eng fin hin hun jpn kor spa tur vie} (those with a reachable budget), draw R = 50
//  independent within-sentence shuffles of the seed-1 union (seeds 1000..1049); for each cell a01..a11 and all-arcs with >= 30 arcs
//  let m = the mean of the 50 shuffled order shares and s their SD; z_m = (m - 0.5)/(s/sqrt(50)). A pair is in band iff |z_m| <= 2.58.
//  PASS iff the number of out-of-band pairs is not significantly above the nominal 1.3 percent (P(X >= k | n, 0.013) > 0.01 by the exact
//  binomial), AND a22 rises in every system. DISCLOSURE: hun's 200-shuffle means had been seen (all |z_m| <= 1.83) before this rule was
//  written; its other 11 systems had not.
// ═══ END PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSeededRng } from "../../kernel/rng.js";
import * as P from "./profiles.mjs";
import * as ST from "./profile-stats.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(P.DIRS.out, "profiles-smoke.json");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const nlRows = () => P.discoverSystems({ refreshFirstSeen: false }).systems.filter((r) => r.kind === "nl" && r.trainFile);

// ── G0 integrity against the received priors ──────────────────────────────────────────────────────────────────
export function gateG0() {
  const rows = []; let comparable = 0; let mismatches = 0;
  for (const r of nlRows()) {
    if (r.twinOf) continue;
    const pp = path.join(P.DIRS.priors, `pos-${r.stem}.json`); if (!fs.existsSync(pp)) { rows.push({ stem: r.stem, comparable: false, why: "no_pos_prior" }); continue; }
    if (r.stem === "eng") { rows.push({ stem: r.stem, comparable: false, why: "excluded:role-config built from train+dev" }); continue; }
    const pos = readJson(pp); const prov = pos.provenance; const text = fs.readFileSync(r.trainFile, "utf8"); const c = P.parseConllu(text);
    const same = c.nBlocks === prov.sentences_read && c.nTokens === prov.tokens_read;
    if (!same) { rows.push({ stem: r.stem, comparable: false, why: "source_differs", mine: { sentences: c.nBlocks, tokens: c.nTokens }, prior: { sentences: prov.sentences_read, tokens: prov.tokens_read } }); continue; }
    comparable += 1;
    const forms = new Map();
    for (const s of c.sentences) for (let i = 0; i < s.n; i++) { let m = forms.get(s.lower[i]); if (!m) { m = new Set(); forms.set(s.lower[i], m); } m.add(s.upos[i]); }
    let amb = 0; for (const m of forms.values()) if (m.size > 1) amb += 1;
    const row = { stem: r.stem, comparable: true, tokensEq: true, sentencesEq: true, distinctEq: forms.size === prov.distinct_forms, ambiguousEq: amb === prov.ambiguous_forms, mine: { distinct: forms.size, ambiguous: amb }, prior: { distinct: prov.distinct_forms, ambiguous: prov.ambiguous_forms } };
    const rcp = path.join(P.DIRS.priors, `role-config-${r.stem}.json`);
    if (fs.existsSync(rcp)) {
      const rc = readJson(rcp); let sB = 0; let sA = 0; let oB = 0; let oA = 0;
      for (const s of c.sentences) for (let i = 0; i < s.n; i++) { const d = s.depb[i]; const before = i + 1 < s.head[i];
        if (d === "nsubj") { if (before) sB++; else sA++; } else if (d === "obj" || d === "iobj") { if (before) oB++; else oA++; } }
      row.roleConfig = { subjectEq: rc.subject.before === sB && rc.subject.after === sA, objectEq: rc.object.before === oB && rc.object.after === oA, mine: { sB, sA, oB, oA }, prior: { sB: rc.subject.before, sA: rc.subject.after, oB: rc.object.before, oA: rc.object.after }, source: rc.provenance?.source ?? null };
    } else row.roleConfig = null;
    const bad = !row.distinctEq || !row.ambiguousEq || (row.roleConfig && (!row.roleConfig.subjectEq || !row.roleConfig.objectEq));
    if (bad) mismatches += 1; rows.push(row);
  }
  return { gate: "G0", rule: "PASS iff zero mismatches among stems whose pos prior has equal sentences_read and tokens_read; UNDERPOWERED if fewer than 20 comparable", comparable, mismatches,
    verdict: comparable < 20 ? "UNDERPOWERED" : (mismatches === 0 ? "PASS" : "FAIL"), rows };
}

// ── G4 noise floor: halves identify their own system ─────────────────────────────────────────────────────────
const G4_GROUPS = { A: (id) => /^a(0[1-9]|1\d|20|22)$/.test(id), B: (id) => /^b/.test(id), D: (id) => /^d0[1-6]$/.test(id), E: (id) => /^e0[1-8]/.test(id) && !/p$/.test(id), F: (id) => /^f/.test(id), G: (id) => /^g/.test(id) };
export function gateG4(profiles) {
  const nl = profiles.filter((p) => p.kind === "nl" && Object.keys(p.cells).length > 40 && !p.labels.twinOf);
  const ids = Object.keys(P.FEATURE_REGISTRY).filter((id) => Object.values(G4_GROUPS).some((f) => f(id)));
  const complete = ids.filter((id) => nl.every((p) => p.cells[id] && Number.isFinite(p.cells[id].resamples[0]) && Number.isFinite(p.cells[id].resamples[1])));
  const half = (p, k) => complete.map((id) => p.cells[id].resamples[k]);
  const rowsA = nl.map((p) => half(p, 0)); const rowsB = nl.map((p) => half(p, 1)); const all = rowsA.concat(rowsB);
  const mu = complete.map((_, j) => ST.mean(all.map((r) => r[j]))); const sd = complete.map((_, j) => ST.sd(all.map((r) => r[j])) || 1);
  const z = (r) => r.map((v, j) => (v - mu[j]) / sd[j]);
  const groupOf = complete.map((id) => Object.entries(G4_GROUPS).find(([, f]) => f(id))[0]); const groups = [...new Set(groupOf)];
  const dist = (a, b) => { let tot = 0; for (const g of groups) { let s = 0; let n = 0; a.forEach((v, j) => { if (groupOf[j] === g) { s += (v - b[j]) ** 2; n++; } }); tot += s / n; } return Math.sqrt(tot); };
  const ZA = rowsA.map(z); const ZB = rowsB.map(z); let hit = 0; const misses = [];
  nl.forEach((p, i) => { let best = -1; let bd = Infinity; ZA.forEach((za, t) => { const d = dist(ZB[i], za); if (d < bd) { bd = d; best = t; } }); if (best === i) hit += 1; else misses.push({ system: p.system, nearest: nl[best].system }); });
  const n = nl.length; const pval = ST.binomUpperTail(hit, n, 1 / n);
  return { gate: "G4", rule: "PASS iff identification >= 0.90 of n AND exact binomial p <= 0.01 vs chance 1/n", n, cellsUsed: complete.length, groups, identified: hit, fraction: hit / n, p: pval, misses,
    verdict: hit / n >= 0.9 && pval <= 0.01 ? "PASS" : "FAIL" };
}

// ── G5 shuffle control and G6 planted word order ──────────────────────────────────────────────────────────────
const ORDER_IDS = [["a01", "nsubj"], ["a02", "obj"], ["a03", "case"], ["a04", "amod"], ["a05", "nmod"], ["a06", "aux"], ["a07", "acl"], ["a08", "mark"], ["a09", "det"], ["a10", "advmod"], ["a11", "cop"]];
function seed1Sample(row) {
  const corpus = P.loadCorpus(row.trainFile, "train"); const d = P.drawSample(corpus, 1, row.system, P.PROVISIONAL.N);
  return { corpus, idx: d.U, ok: d.ok };
}
function statsOf(sentences) { return sentences.map((s) => P.sentenceStats(s).st); }
function sumVec(stats) { const V = new Float64Array(P.STAT_LEN); for (const st of stats) for (let k = 0; k < V.length; k++) V[k] += st[k]; return V; }
export function gateG5(rows = nlRows().filter((r) => r.budgetReachable && !r.twinOf)) {
  let cells = 0; let inBand = 0; const per = []; let rises = 0; let sys = 0;
  for (const row of rows) {
    const { corpus, idx, ok } = seed1Sample(row); if (!ok) continue;
    const orig = idx.map((j) => corpus.sentences[j]); const rng = createSeededRng({ seed: 11, system: row.system, purpose: "shuffle" });
    const shuf = orig.map((s) => P.shuffleSentenceWords(s, rng)); const st = statsOf(shuf); const stO = statsOf(orig);
    const Vs = sumVec(st); const Vo = sumVec(stO); const I = P.IDX; let nbCells = 0; let nbIn = 0;
    const consider = (nName, bName, label) => {
      const tot = Vs[I[nName]]; if (tot < P.PROVISIONAL.MIN_ARCS) return;
      let num = 0; for (const x of st) num += (x[I[bName]] - 0.5 * x[I[nName]]) ** 2;
      const se = Math.sqrt(num) / tot; const zz = (Vs[I[bName]] / tot - 0.5) / se; cells += 1; nbCells += 1; if (Math.abs(zz) <= 1.96) { inBand += 1; nbIn += 1; }
      return { label, z: zz };
    };
    for (const [, r] of ORDER_IDS) consider(`n_${r}`, `b_${r}`, r);
    consider("n_all", "b_all", "all");
    const dlS = Vs[I.dl_sum] / Vs[I.n_all]; const dlO = Vo[I.dl_sum] / Vo[I.n_all]; sys += 1; if (dlS > dlO) rises += 1;
    per.push({ system: row.system, cells: nbCells, inBand: nbIn, depLenOriginal: dlO, depLenShuffled: dlS });
  }
  const pa = ST.binomUpperTail(cells - inBand, cells, 0.05); // P(out-of-band >= observed | p=0.05): small => significantly more out-of-band than 5%
  const passA = pa > 0.01; const passB = sys > 0 && rises / sys >= 0.9;
  return { gate: "G5", rule: "(a) in-band fraction not significantly below 0.95 (P(out-of-band >= observed | 0.05) > 0.01); (b) a22 rises in >= 90% of systems", systems: sys, cells, inBand, fractionInBand: inBand / cells, pOutOfBand: pa, a: passA ? "PASS" : "FAIL", b: passB ? "PASS" : "FAIL", risesOf: `${rises}/${sys}`, verdict: passA && passB ? "PASS" : "FAIL", per };
}

export function gateG5c(stems = ["arb", "cmn", "deu", "eng", "fin", "hin", "hun", "jpn", "kor", "spa", "tur", "vie"], R = 50) {
  const rows = nlRows().filter((r) => stems.includes(r.stem) && r.budgetReachable && !r.twinOf); const per = []; let pairs = 0; let out = 0; let rises = 0;
  for (const row of rows) {
    const { corpus, idx, ok } = seed1Sample(row); if (!ok) continue; const orig = idx.map((j) => corpus.sentences[j]); const I = P.IDX; const Vo = sumVec(statsOf(orig));
    const shares = {}; const dls = [];
    for (let r = 0; r < R; r++) {
      const rng = createSeededRng({ seed: 1000 + r, system: row.system, purpose: "shuffle-c" }); const Vs = sumVec(statsOf(orig.map((s) => P.shuffleSentenceWords(s, rng))));
      for (const [, rel] of ORDER_IDS.concat([["all", "all"]])) { const nN = `n_${rel}`; if (Vs[I[nN]] >= P.PROVISIONAL.MIN_ARCS) (shares[rel] ??= []).push(Vs[I[`b_${rel}`]] / Vs[I[nN]]); }
      dls.push(Vs[I.dl_sum] / Vs[I.n_all]);
    }
    let nb = 0; let no = 0;
    for (const [rel, xs] of Object.entries(shares)) { if (xs.length < R) continue; const m = ST.mean(xs); const s = ST.sd(xs); const z = s > 0 ? (m - 0.5) / (s / Math.sqrt(R)) : 0; nb += 1; if (Math.abs(z) > 2.58) no += 1; }
    pairs += nb; out += no; const dlO = Vo[I.dl_sum] / Vo[I.n_all]; const rise = ST.mean(dls) > dlO; if (rise) rises += 1;
    per.push({ system: row.system, cells: nb, outOfBand: no, depLenRises: rise });
  }
  const p = ST.binomUpperTail(out, pairs, 0.013);
  return { gate: "G5c", rule: "PASS iff out-of-band pairs (|z_m|>2.58) not significantly above 1.3% (P(X>=k|n,0.013)>0.01) AND a22 rises in every system", systems: per.length, R, pairs, outOfBand: out, fractionOut: pairs ? out / pairs : null, p, risesAll: rises === per.length,
    verdict: pairs > 0 && p > 0.01 && rises === per.length ? "PASS" : "FAIL", per };
}
export function gateG6(stems = ["spa", "jpn", "eng", "tur", "fin", "arb"]) {
  const rows = nlRows().filter((r) => stems.includes(r.stem) && r.budgetReachable); const out = []; let ok = true;
  for (const row of rows) {
    const { corpus, idx } = seed1Sample(row); const orig = idx.map((j) => corpus.sentences[j]); const res = { system: row.system };
    for (const mode of ["final", "initial"]) {
      const V = sumVec(statsOf(orig.map((s) => P.lineariseSentence(s, mode)))); const I = P.IDX;
      const a12 = V[I.b_all] / V[I.n_all]; const a02 = V[I.n_obj] >= P.PROVISIONAL.MIN_ARCS ? V[I.b_obj] / V[I.n_obj] : null;
      res[mode] = { a12, a02 }; const want = mode === "final";
      if (want ? a12 < 0.99 : a12 > 0.01) ok = false; if (a02 != null && (want ? a02 < 0.99 : a02 > 0.01)) ok = false;
    }
    out.push(res);
  }
  return { gate: "G6", rule: "head-final: a12 >= 0.99 and a02 >= 0.99 (where defined); head-initial: <= 0.01", systems: out.length, verdict: ok && out.length >= 4 ? "PASS" : "FAIL", out };
}

// ── G7 determinism (two builds, same contentHash) ─────────────────────────────────────────────────────────────
export function gateG7(stems = ["hun", "vie", "slk"]) {
  const out = []; let same = 0;
  for (const s of stems) {
    const row = P.discoverSystems({ refreshFirstSeen: false }).systems.find((r) => r.system === `nl:${s}`); if (!row || !row.budgetReachable) continue;
    const a = P.buildNlProfile(row); const b = P.buildNlProfile(row); out.push({ system: row.system, equal: a.contentHash === b.contentHash, hash: a.contentHash }); if (a.contentHash === b.contentHash) same += 1;
  }
  return { gate: "G7", rule: "contentHash equal across two builds for >= 3 systems", systems: out.length, same, verdict: out.length >= 3 && same === out.length ? "PASS" : "FAIL", out };
}

// ── planted checks: P3 Zipf, N3/P4 sequence ────────────────────────────────────────────────────────────────────
export function plants() {
  const c = P.powerChecks({ refresh: true });
  return { gate: "plants", ...c, cellStatus: P.cellStatus(), verdict: `P3 ${c.P3.pass ? "PASS" : "FAIL"}; P3o ${c.P3o.pass ? "PASS" : "FAIL"}; P3r ${c.P3r.pass ? "PASS" : "FAIL"}; N3 ${c.N3.pass ? "PASS" : "FAIL"}; P4 ${c.P4.pass ? "PASS" : "FAIL"}` };
}

// ── K-facts (descriptive) ─────────────────────────────────────────────────────────────────────────────────────
export function kFacts(profiles) {
  const by = new Map(profiles.filter((p) => p.kind === "nl").map((p) => [p.system.replace(/^nl:/, ""), p]));
  const val = (s, id) => by.get(s)?.cells?.[id]?.value ?? null;
  const rom = ["spa", "ita", "por", "fra", "ron", "cat", "glg"]; const sla = ["rus", "ukr", "pol", "bul", "ces", "slk", "slv", "hrv", "srp"]; const tr = ["jpn", "kor", "tur"];
  const defd = (xs, id) => xs.map((s) => val(s, id)).filter((v) => v != null);
  const facts = [];
  const add = (id, text, fn) => { try { const r = fn(); facts.push({ id, text, ...r }); } catch (e) { facts.push({ id, text, status: "unmeasured", why: e.message }); } };
  const need = (cond, why) => { if (!cond) throw new Error(why); };
  add("K1", "case-before: every measured Romance/Slavic > every measured jpn/kor/tur", () => { const a = defd([...rom, ...sla], "a03"); const b = defd(tr, "a03"); need(a.length && b.length, "a03 gap"); return { status: Math.min(...a) > Math.max(...b) ? "holds" : "fails", min: Math.min(...a), maxTR: Math.max(...b) }; });
  add("K2", "obj-before > 0.5 for jpn kor tur; < 0.5 for Romance/Slavic", () => { const a = defd(tr, "a02"); const b = defd([...rom, ...sla], "a02"); need(a.length && b.length, "a02 gap"); return { status: a.every((v) => v > 0.5) && b.every((v) => v < 0.5) ? "holds" : "fails", tr: a, others: b }; });
  add("K3", "subj-before > 0.5 for all measured", () => { const a = [...by.keys()].map((s) => val(s, "a01")).filter((v) => v != null); need(a.length, "a01 gap"); return { status: a.every((v) => v > 0.5) ? "holds" : "fails", n: a.length, min: Math.min(...a) }; });
  add("K5", "min head_final over jpn/kor/tur > max over Romance", () => { const a = defd(tr, "a12"); const b = defd(rom, "a12"); need(a.length && b.length, "a12 gap"); return { status: Math.min(...a) > Math.max(...b) ? "holds" : "fails", minTR: Math.min(...a), maxRom: Math.max(...b) }; });
  add("K8", "ws_per_word: jpn < 0.3 and the spaced languages > 0.5", () => { const j = val("jpn", "a21"); need(j != null, "jpn a21 gap"); const sp = [...rom, ...sla, "eng", "deu", "nld", "swe", "fin", "tur", "kor"].map((s) => val(s, "a21")).filter((v) => v != null); return { status: j < 0.3 && sp.every((v) => v > 0.5) ? "holds" : "fails", jpn: j, minSpaced: Math.min(...sp) }; });
  add("K9", "c01 > 0 everywhere", () => { const a = [...by.keys()].map((s) => val(s, "c01")).filter((v) => v != null); need(a.length, "c01 gap"); return { status: a.every((v) => v > 0) ? "holds" : "fails", n: a.length, min: Math.min(...a) }; });
  add("K11", "e03 > e04 everywhere", () => { const rowsE = [...by.keys()].map((s) => [val(s, "e03"), val(s, "e04")]).filter(([x, y]) => x != null && y != null); need(rowsE.length, "e03/e04 gap"); return { status: rowsE.every(([x, y]) => x > y) ? "holds" : "fails", n: rowsE.length }; });
  const measured = facts.filter((f) => f.status !== "unmeasured"); const holds = measured.filter((f) => f.status === "holds").length;
  return { gate: "K-facts", descriptive: true, summary: `${holds} of ${measured.length} measured facts hold`, facts };
}

// ── R1-xcheck: shared cells vs the sibling pilot (informational) ─────────────────────────────────────────────
export function pilotXcheck(profiles) {
  const dir = "/private/tmp/claude-501/barker/work/prof"; if (!fs.existsSync(dir)) return { gate: "R1-xcheck", status: "pilot_profiles_not_found" };
  const map = { a01: "a01_subj_before", a02: "a02_obj_before", a03: "a03_case_before", a04: "a04_amod_before", a05: "a05_nmod_before", a06: "a06_aux_before", a12: "a12_head_final_all", a13: "a13_case_rate", a14: "a14_det_rate", a18: "a18_nonproj_sent", a19: "a19_nonproj_arc", a20: "a20_upos_entropy", a21: "a21_ws_per_word",
    b01: "b01_height_mean", b02: "b02_depth_mean", b09: "b09_branching", b10: "b10_leaf_share", b11: "b11_clause_embed", b12: "b12_subtree_slope", c01: "c01_boundary_gap", c02: "c02_h2_bits", c03: "c03_h0_bits", c04: "c04_zlib_bpc",
    d02: "d02_heaps_beta", d03: "d03_hapax_types", d04: "d04_hapax_tokens", d05: "d05_ttr", d06: "d06_top10_mass", e01: "e01_closed_share", e02: "e02_closed_types_per_1k", e03: "e03_closed_dev_cov", e04: "e04_open_dev_cov", e06: "e06_hapax_gap" };
  const rowsOut = []; let agree = 0; let total = 0;
  for (const p of profiles.filter((q) => q.kind === "nl")) {
    const f = path.join(dir, `${p.system.replace(/^nl:/, "")}.json`); if (!fs.existsSync(f)) continue;
    const pj = readJson(f); const seeds = Object.values(pj.per_seed).map((s) => s.U);
    for (const [id, pid] of Object.entries(map)) {
      const c = p.cells[id]; const pv = seeds.map((s) => s[pid]).filter((v) => typeof v === "number" && Number.isFinite(v)); if (!c || pv.length < 3) continue;
      const pm = ST.mean(pv); const pse = ST.sd(pv) / Math.sqrt(pv.length); const mv = c.resamples.filter((x) => x != null); const mse = mv.length > 2 ? ST.sd(mv) / Math.sqrt(mv.length) * 0.5 : 0;
      const tol = 2 * Math.max(pse, mse, 1e-9); total += 1; const ok = Math.abs(pm - c.value) <= tol; if (ok) agree += 1; rowsOut.push({ system: p.system, id, mine: c.value, pilot: pm, tol, ok });
    }
  }
  return { gate: "R1-xcheck", informational: true, comparisons: total, agree, fraction: total ? agree / total : null, worst: rowsOut.filter((r) => !r.ok).sort((a, b) => Math.abs(b.mine - b.pilot) / b.tol - Math.abs(a.mine - a.pilot) / a.tol).slice(0, 15) };
}


// ── descriptive diagnostics (not gates): twin consistency and the typed-gap census ─────────────────────────────
export function twins(profiles) {
  const nl = profiles.filter((p) => p.kind === "nl" && Object.keys(p.cells).length > 40);
  const ids = Object.keys(P.FEATURE_REGISTRY).filter((id) => Object.values(G4_GROUPS).some((f) => f(id)) && nl.every((p) => p.cells[id]));
  const mu = ids.map((id) => ST.mean(nl.map((p) => p.cells[id].value))); const sd = ids.map((id) => ST.sd(nl.map((p) => p.cells[id].value)) || 1);
  const groupOf = ids.map((id) => Object.entries(G4_GROUPS).find(([, f]) => f(id))[0]); const groups = [...new Set(groupOf)];
  const vec = (p) => ids.map((id, j) => (p.cells[id].value - mu[j]) / sd[j]);
  const dist = (a, b) => { let tot = 0; for (const g of groups) { let s2 = 0; let n = 0; a.forEach((v, j) => { if (groupOf[j] === g) { s2 += (v - b[j]) ** 2; n++; } }); tot += s2 / n; } return Math.sqrt(tot); };
  const pairs = [["nl:cmn", "nl:cmn-hans"], ["nl:kor", "nl:kor-kaist"]]; const out = [];
  for (const [a, b] of pairs) {
    const pa = nl.find((p) => p.system === a); const pb = nl.find((p) => p.system === b); if (!pa || !pb) { out.push({ pair: [a, b], status: "unmeasured" }); continue; }
    const others = nl.filter((p) => p.system !== a && p.system !== b); const da = vec(pa);
    const dTwin = dist(da, vec(pb)); const rank = others.filter((o) => dist(da, vec(o)) < dTwin).length;
    out.push({ pair: [a, b], twinDistance: dTwin, closerOthers: rank, of: others.length, nearestOther: others.map((o) => [o.system, dist(da, vec(o))]).sort((x, y) => x[1] - y[1])[0] });
  }
  return { gate: "S-twin", descriptive: true, cellsUsed: ids.length, pairs: out };
}
export function coverage(profiles) {
  const out = {};
  for (const kind of ["nl", "code"]) {
    const ps = profiles.filter((p) => p.kind === kind && Object.keys(p.cells).length > 10); const ids = Object.values(P.FEATURE_REGISTRY).filter((r) => r.kinds.includes(kind) && r.group !== "T").map((r) => r.id);
    out[kind] = { systems: ps.length, cellsExpected: ids.length, sparse: ids.map((id) => [id, ps.filter((p) => p.cells[id]).length]).filter(([, n]) => n < ps.length).map(([id, n]) => `${id}:${n}/${ps.length}`) };
  }
  const reasons = {}; for (const p of profiles) for (const g of p.gaps) reasons[g.reason] = (reasons[g.reason] ?? 0) + 1;
  const empty = profiles.filter((p) => Object.keys(p.cells).length <= 10).map((p) => `${p.system}(${Object.keys(p.cells).length})`);
  return { gate: "coverage", descriptive: true, ...out, gapReasons: reasons, nearlyEmpty: empty };
}

// ── G8 hygiene: static scan, EO-free profiles, split guard ──────────────────────────────────────────────────────
export function hygiene(profiles) {
  const files = ["profiles.mjs", "profile-stats.mjs", "profiles-smoke.mjs", "ast_extract.py"].map((f) => path.join(HERE, f));
  // the scan patterns are assembled from parts so that this file does not match its own scan
  const scanRe = new RegExp(["model" + "-server", "mouth\\" + ".js", "node:" + "https?", "fetch" + "\\(", "anthro" + "pic", "open" + "ai", "embed" + "ding"].join("|"), "i");
  const eoRe = new RegExp("(?:import|from)\\s*[\"'][^\"']*(" + ["cube\\.js", "phase" + "post", "relation" + "-kinds", "act" + "-prior", "case" + "-priors", "hyper" + "lexicon"].join("|") + ")"); const hits = [];
  const heldOutRe = new RegExp(["te" + "st", "conllu"].join("\\."));
  for (const f of files) { const lines = fs.readFileSync(f, "utf8").split("\n"); lines.forEach((l, i) => { if (scanRe.test(l)) hits.push({ file: path.basename(f), line: i + 1, why: "model/network token" }); if (eoRe.test(l)) hits.push({ file: path.basename(f), line: i + 1, why: "EO import" }); if (heldOutRe.test(l)) hits.push({ file: path.basename(f), line: i + 1, why: "names the held-out split" }); }); }
  let guard = false; try { P.conlluPath("eng", "test"); } catch { guard = true; }
  const contaminated = profiles.map((p) => ({ system: p.system, ...P.assertEoFree(p) })).filter((x) => !x.ok);
  const planted = P.assertEoFree({ cells: { x01_cell_ground: { id: "x01_cell_ground", group: "A", channel: "ud:deprel", definitionId: "x01_cell_ground", builder: "b" } } });
  return { gate: "G8", sourceHits: hits, splitGuardThrows: guard, profilesChecked: profiles.length, contaminated, plantedContaminationRejected: !planted.ok, verdict: hits.length === 0 && guard && contaminated.length === 0 && !planted.ok ? "PASS" : "FAIL" };
}

async function main(argv) {
  const which = argv[0] ?? "all"; const out = {}; const want = (g) => which === "all" || which === g;
  const profiles = (want("g4") || want("kfacts") || want("xcheck") || want("hygiene") || want("twins") || want("coverage")) ? P.loadProfiles() : [];
  if (want("g0")) out.g0 = gateG0();
  if (want("g4")) out.g4 = gateG4(profiles);
  if (want("g5")) out.g5 = gateG5();
  if (want("g5c")) out.g5c = gateG5c();
  if (want("g6")) out.g6 = gateG6();
  if (want("g7")) out.g7 = gateG7();
  if (want("plants")) out.plants = plants();
  if (want("kfacts")) out.kfacts = kFacts(profiles);
  if (want("xcheck")) out.xcheck = pilotXcheck(profiles);
  if (want("hygiene")) out.hygiene = hygiene(profiles);
  if (want("twins")) out.twins = twins(profiles);
  if (want("coverage")) out.coverage = coverage(profiles);
  fs.mkdirSync(P.DIRS.out, { recursive: true });
  const merged = { ...(fs.existsSync(OUT) ? readJson(OUT) : {}), ...out }; // re-read just before writing so concurrent gate runs do not clobber each other
  fs.writeFileSync(OUT, JSON.stringify(merged, null, 1));
  for (const [k, v] of Object.entries(out)) console.log(k, v.verdict ?? v.summary ?? "");
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main(process.argv.slice(2));
