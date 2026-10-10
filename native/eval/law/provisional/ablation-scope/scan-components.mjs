// eval/law/provisional/ablation-scope/scan-components.mjs — WHICH single, fixed component of the ablation record separates names from matched unlabelled tokens (per kind and group)?
//
//   node scan-components.mjs --data DIR --out FILE [--B 500]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written BEFORE this script was run on any data; discovery round 2 was being read while this header was written and was not opened) ═══
// WHY. Round 1 of analyse-strata.mjs (results/d1/discovery.json, 1,831 pairs, matching v1) found NO ACTIVE cell under the registered voiding rules (controls failed on character length and, in
// War and Peace, message index; matching v2 repairs that). It also showed two things I was not predicting: (a) the scalar S_ENTRY is exactly constant (AUC 0.500) at c2 and almost constant at c3
// in every corpus (the reader's recurrence floor), is weak for message-initial tokens (group A) at any c, but in IRC NON-initial tokens (group B) rises with the local count (0.67 at c4_6, 0.79 at
// c7_15, 0.80 at c16p; controls marginal in v1); (b) a PROBE on the whole record separates names from matched tokens far better than any scalar (IRC A 0.84, IRC B 0.77, WP A 0.69, WP B 0.66;
// the probe on the matching variables alone 0.54-0.56). So the record carries more than S_ENTRY. This script asks which FIXED component of it does, so that a rule can be a fixed score with a
// direction and a threshold instead of a fitted classifier.
// DISCLOSURE. I have seen all of round 1 (tables in results/d1, printed by show.py), the design-time control balance of matching v2, and nothing of round 2 or of UD or of any confirmation data.
// DATA. DIR = read-strata JSONL (round 2: 8 IRC days, War and Peace, matching v2, strata c2..c16p). Complete pairs. Cluster blocks = document x stream quartile.
// COMPONENTS (about 220 numbers, all fixed outputs of the impact record, none fitted): counts (72 typed delta counts: family x radius band x type), sig (85), atm (19), span (32), c (8: company
//   structure impact), extent.tokens/frames/radius, noSlot, nTokenSlots, laterEdges, isNull. Direction is NOT fixed in advance here: it is read from the discovery sign, then frozen.
// TESTS.
//   T1 for each (kind, group) pooled over c2..c16p and for each component: stratified AUC (pair-weighted mean of stratum AUCs), two-sided statistic |AUC - 0.5|.
//   T2 family-wise null: one within-pair label-swap permutation (the same swaps for all components), B=500; the max over components of |AUC - 0.5| gives the null of the maximum; q95 of it is the bar.
//   T3 NOMINATED component: |AUC - 0.5| above the q95 of the max-null AND cluster-bootstrap 95% lower bound of the oriented AUC > 0.55 AND the (kind, group) pooled controls in [0.45, 0.55]
//      (R_LOGC, R_POS, R_IPOS, R_FB, R_LEN, R_SL; a cell-level control CI check is applied afterwards by analyse-strata.mjs-style gating in the confirmation script).
//   T4 the nominee with the highest oriented lower bound per (kind, group) is the candidate fixed score; its per-stratum AUCs say where it is active (oriented AUC >= 0.60, lower bound > 0.5).
//      Its frozen threshold = the value, among the 50/60/70/80/90th percentiles of the NEGATIVE members, that maximises balanced accuracy (the only fitted quantity; labelled).
// BLIND PREDICTIONS.
//   Q1 In IRC group A (message-initial) at least one component is nominated (the probe 0.84 is not an artefact of the matching variables).  (belief 0.80)
//   Q2 The nominee(s) in IRC A are company-structure (c) or atmosphere (atm) components rather than ref-entry slot counts.  (0.50)
//   Q3 In WP B no component is nominated.  (0.55)
//   Q4 The same component is nominated (same sign) in IRC A and IRC B.  (0.30)
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { FAMILIES, DELTA_TYPES, SIG_LABELS, ATM_LABELS, SPAN_LABELS, C_LABELS, rngFor } from "../../impact.mjs";
import { aucPN, bootStrat, round, quantile } from "./stats.mjs";
import { loadRows, buildPairs, cellPairs, CONTROLS } from "./features.mjs";
import { STRATA } from "./lib-pairs.mjs";

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DATA = opt("--data", "data/discovery2"), OUTF = opt("--out", "results/d2/components.json"), B = Number(opt("--B", 500));
const POOLED = STRATA.filter((s) => s !== "c1"), SEED = 7770001;
const NAMES = [
  ...FAMILIES.flatMap((f, fi) => [0, 1, 2].flatMap((b) => DELTA_TYPES.map((t) => `counts.${f}.r${b}.${t}`))),
  ...SIG_LABELS.map((l) => `sig.${l}`), ...ATM_LABELS.map((l) => `atm.${l}`), ...SPAN_LABELS.map((l) => `span.${l}`), ...C_LABELS.map((l) => `c.${l}`),
  "extent.tokens", "extent.frames", "extent.radius", "noSlot", "nTokenSlots", "laterEdges", "isNull"];
const vec = (rec) => [...rec.counts, ...rec.sig, ...rec.atm, ...rec.span, ...rec.c, rec.extent.tokens, rec.extent.frames, rec.extent.radius, rec.noSlot ? 1 : 0, rec.nTokenSlots, rec.laterEdges, rec.isNull ? 1 : 0];
const stratAucJ = (byStratum, j, flip = null) => {
  let w = 0, a = 0;
  byStratum.forEach((ps, si) => { if (ps.length < 2) return; const x = aucPN(ps.map((q, k) => (flip && flip[si][k] ? q.n.v[j] : q.p.v[j])), ps.map((q, k) => (flip && flip[si][k] ? q.p.v[j] : q.n.v[j]))); if (x != null) { a += x * ps.length; w += ps.length; } });
  return w ? a / w : null;
};

async function main() {
  const t0 = Date.now(), rows = loadRows(DATA), pairs = buildPairs(rows);
  for (const x of pairs) { x.p.v = vec(x.p.raw.rec); x.n.v = vec(x.n.raw.rec); }
  const result = { module: "eval/law/provisional/ablation-scope/scan-components.mjs", data: DATA, B, rows: rows.length, pairs: pairs.length, nComponents: NAMES.length, cells: {}, candidates: [], predictions: {} };
  for (const kind of [...new Set(pairs.map((p) => p.kind))]) for (const grp of ["A", "B"]) {
    const key = `${kind}.${grp}`, by = cellPairs(pairs, kind, grp, POOLED), byS = POOLED.map((st) => by[st]), total = byS.flat().length;
    if (total < 60) { result.cells[key] = { n: total, skipped: "too few pairs" }; continue; }
    const obs = NAMES.map((_, j) => stratAucJ(byS, j));
    const rnd = rngFor(SEED + key.length * 31 + total), maxNull = [];
    for (let b = 0; b < B; b++) { const flip = byS.map((ps) => ps.map(() => rnd() < 0.5)); let m = 0; for (let j = 0; j < NAMES.length; j++) { const a = stratAucJ(byS, j, flip); if (a != null) m = Math.max(m, Math.abs(a - 0.5)); } maxNull.push(m); }
    const q95 = quantile(maxNull, 0.95);
    const ranked = obs.map((a, j) => ({ j, a, d: a == null ? 0 : Math.abs(a - 0.5) })).filter((x) => x.a != null).sort((x, y) => y.d - x.d).slice(0, 14);
    const controls = Object.fromEntries(CONTROLS.map((c) => [c, (() => { let w = 0, a = 0; for (const ps of byS) { if (ps.length < 2) continue; const x = aucPN(ps.map((q) => q.p[c]), ps.map((q) => q.n[c])); if (x != null) { a += x * ps.length; w += ps.length; } } return round(a / w); })()]));
    const top = ranked.map((r) => {
      const sgn = r.a >= 0.5 ? 1 : -1, f = (m) => sgn * m.v[r.j];
      const bs = bootStrat(by, f, { B: Math.min(B, 400), seed: SEED + r.j });
      const per = Object.fromEntries(POOLED.map((st) => [st, by[st].length >= 2 ? round(aucPN(by[st].map((q) => f(q.p)), by[st].map((q) => f(q.n)))) : null]));
      return { name: NAMES[r.j], j: r.j, sign: sgn, auc: round(sgn === 1 ? r.a : 1 - r.a), ci: [bs.lo, bs.hi], perStratum: per, nominated: Math.abs(r.a - 0.5) > q95 && bs.lo > 0.55 };
    });
    const ctrlOk = Object.values(controls).every((v) => v >= 0.45 && v <= 0.55);
    result.cells[key] = { n: total, maxNullQ95: round(q95), controls, controlsInBand: ctrlOk, top };
    const nominee = top.filter((t) => t.nominated).sort((x, y) => y.ci[0] - x.ci[0])[0];
    if (nominee && ctrlOk) {
      const sgn = nominee.sign, negs = byS.flat().map((q) => sgn * q.n.v[nominee.j]), poss = byS.flat().map((q) => sgn * q.p.v[nominee.j]);
      let best = null;
      for (const pc of [0.5, 0.6, 0.7, 0.8, 0.9]) {
        const T = quantile(negs, pc), tpr = poss.filter((v) => v > T).length / poss.length, tnr = negs.filter((v) => v <= T).length / negs.length, ba = (tpr + tnr) / 2;
        if (!best || ba > best.ba) best = { percentileOfNegatives: pc, threshold: T, tpr: round(tpr), tnr: round(tnr), ba: round(ba) };
      }
      const active = POOLED.filter((st) => nominee.perStratum[st] != null && nominee.perStratum[st] >= 0.60);
      result.candidates.push({ id: `${key}:${nominee.name}`, kind, group: grp, component: nominee.name, j: nominee.j, sign: sgn, direction: sgn === 1 ? "higher = name" : "lower = name", oriented: "score = sign * component", auc: nominee.auc, ci95: nominee.ci, perStratum: nominee.perStratum, activeStrata: active, thresholdFittedOnDiscovery: best });
    }
  }
  const nom = (k) => (result.cells[k]?.top ?? []).filter((t) => t.nominated);
  result.predictions = {
    Q1_ircA_nominated: { hold: nom("irc.A").length > 0, names: nom("irc.A").map((t) => t.name) },
    Q2_company_or_atm: { hold: nom("irc.A").length > 0 && /^(c|atm)\./.test(nom("irc.A")[0].name), first: nom("irc.A")[0]?.name },
    Q3_wpB_none: { hold: nom("wp.B").length === 0, names: nom("wp.B").map((t) => t.name) },
    Q4_same_component_A_and_B: { hold: nom("irc.A").some((a) => nom("irc.B").some((b) => b.name === a.name && b.sign === a.sign)) },
  };
  result.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  result.seconds = round((Date.now() - t0) / 1000, 1);
  fs.mkdirSync(path.dirname(OUTF), { recursive: true });
  fs.writeFileSync(OUTF, JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ candidates: result.candidates.map((c) => [c.id, c.auc, c.ci95, c.activeStrata]), predictions: Object.fromEntries(Object.entries(result.predictions).map(([k, v]) => [k, v.hold])), headerSha256: result.headerSha256 }, null, 1));
}
await main();
