// classify-gates.mjs — G0 (planted worlds + shuffled-real controls), G3 (tokenisation grain) and the false-PRESENT expectation. Uses the mapping fixed in classify-config.mjs.
import * as CFG from "./classify-config.mjs";
import { STAT, pockets, cells, byId, sIndex, round } from "./classify-data.mjs";
import { fin } from "./classify-lib.mjs";

const cellIn = (pid, sid) => { const p = byId.get(pid); return p ? cells[pockets.indexOf(p)][sIndex.get(sid)] : null; };
const halfRate = (pids) => { // share of (statistic, half) cells with finite z that have |z| >= 4 / >= 2, and PRESENT cells
  let n = 0, g4 = 0, g2 = 0, cellsDef = 0, present = []; const perWorld = {};
  for (const pid of pids) {
    const p = byId.get(pid); if (!p || p.thin) continue; let wn = 0, w4 = 0;
    STAT.forEach((s, j) => { const c = cells[pockets.indexOf(p)][j]; for (const z of [c.zD, c.zC]) if (fin(z)) { n++; wn++; if (Math.abs(z) >= 4) { g4++; w4++; } if (Math.abs(z) >= 2) g2++; }
      if (c.st === "P+" || c.st === "P-") present.push({ pocket: pid, stat: s.id, zD: round(c.zD, 4), zC: round(c.zC, 4) }); if (c.st !== "zundef" && c.st !== "nodata") cellsDef++; });
    perWorld[pid] = { halfCells: wn, absZge4: w4 };
  }
  return { halfCells: n, definedCells: cellsDef, absZge4: g4, absZge2: g2, rate4: n ? g4 / n : null, rate2: n ? g2 / n : null, present, perWorld };
};

export function g0Checks() {
  const ctrlIds = pockets.filter((p) => p.kind === "control").map((p) => p.id);
  const iid = halfRate(CFG.IID_WORLDS), ctrl = halfRate(ctrlIds);
  const phenomena = CFG.G0_PHENOMENA.map((ph) => {
    const rows = Object.entries(ph.cands).map(([sid, e]) => { const c = cellIn(ph.world, sid); return { stat: sid, expected: e, status: c?.st ?? "missing", zD: round(c?.zD, 4), zC: round(c?.zC, 4), ok: !!c && c.st === (e > 0 ? "P+" : "P-"), contradicts: !!c && c.st === (e > 0 ? "P-" : "P+") }; });
    return { world: ph.world, id: ph.id, candidates: rows, recovered: rows.some((r) => r.ok), testable: rows.length > 0 };
  });
  const ab = CFG.G0_ABBREV, abL = cellIn(ab.world, ab.stat), abIid = ab.iidWorlds.map((w) => cellIn(w, ab.stat));
  const abbrev = { stat: ab.stat, plLengthV: [abL?.vD ?? null, abL?.vC ?? null], iidV: abIid.map((c) => [c?.vD ?? null, c?.vC ?? null]),
    pass: !!abL && fin(abL.vD) && fin(abL.vC) && abL.vD < ab.vMax && abL.vC < ab.vMax && abIid.every((c) => c && Math.abs(c.vD) < ab.iidAbs && Math.abs(c.vC) < ab.iidAbs) };
  const cn = CFG.G0_CANCEL, cc = cellIn(cn.world, cn.stat), cancel = { stat: cn.stat, world: cn.world, status: cc?.st ?? "missing", zD: round(cc?.zD, 4), zC: round(cc?.zC, 4), pass: !!cc && cc.st !== "P+" && cc.st !== "P-" };
  // statistic-level planted check
  const per = {};
  STAT.forEach((s, j) => {
    const falseIid = CFG.IID_WORLDS.filter((w) => { const c = cellIn(w, s.id); return c && (c.st === "P+" || c.st === "P-"); });
    const falseCtrl = ctrlIds.filter((id) => { const c = cellIn(id, s.id); return c && (c.st === "P+" || c.st === "P-"); });
    const maps = phenomena.flatMap((ph) => ph.candidates.filter((r) => r.stat === s.id).map((r) => ({ world: ph.world, id: ph.id, ...r })));
    const contradict = maps.filter((m) => m.contradicts).map((m) => `${m.world}/${m.id}`), fired = maps.filter((m) => m.ok).map((m) => `${m.world}/${m.id}`);
    const anyDefined = pockets.some((p, i) => !p.thin && p.kind !== "control" && cells[i][j].st !== "zundef" && cells[i][j].st !== "nodata" && cells[i][j].st !== "thin");
    const fail = falseIid.length > 0 || falseCtrl.length > 0 || contradict.length > 0 || !anyDefined;
    per[s.id] = { fail, reasons: [...falseIid.map((w) => `PRESENT in iid world ${w}`), ...falseCtrl.map((c) => `PRESENT in control ${c}`), ...contradict.map((c) => `opposite sign in ${c}`), ...(anyDefined ? [] : ["z undefined in every cell (inert)"])],
      validation: fail ? "failed" : fired.length ? "validated" : maps.length ? "mapped-but-not-recovered" : "unmapped", mappedIn: maps.map((m) => `${m.world}/${m.id}:${m.status}`), firedAsExpected: fired };
  });
  const testable = phenomena.filter((p) => p.testable);
  const gate = { iidRate4: iid.rate4, iidPass: iid.rate4 != null && iid.rate4 < 0.02, phenomenaRecovered: phenomena.filter((p) => p.recovered).length, phenomenaTestable: testable.length, phenomenaTotal: phenomena.length,
    unrecovered: phenomena.filter((p) => !p.recovered).map((p) => `${p.world}/${p.id}${p.testable ? "" : " (no candidate statistic exists)"}`), abbrevPass: abbrev.pass, cancelPass: cancel.pass };
  gate.pass = gate.iidPass && gate.unrecovered.length === 0 && gate.abbrevPass && gate.cancelPass;
  return { iid, ctrl, phenomena, abbrev, cancel, perStat: per, gate };
}

// ---------------------------------------------------------------- G3: tokenisation grain
export function g3() {
  const g = {}; for (const p of pockets) if (p.inLaw) { const o = g[p.grain] || (g[p.grain] = { pockets: 0, tokens: 0, ids: [] }); o.pockets++; o.tokens += p.tokens; if (o.ids.length < 400) o.ids.push(p.id); }
  return { rule: "headline statuses pool all grains (as the protocol counts N); per-grain breakdowns and a word-grain-only status are reported beside them. char-bigram, code and notation pockets are never compared with word pockets silently.",
    grains: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { pockets: v.pockets, tokens: v.tokens }])), idsByGrain: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.ids])) };
}

/** Expected number of false PRESENT cells = defined real cells x P(|z| >= 4 in both halves with the same sign under the null), with p taken from the planted iid worlds and from the
 *  shuffled-real controls. P(PRESENT) = rate4^2 / 2 (independent halves, symmetric sign) and, as a direct estimate, PRESENT cells / defined cells in the null pockets (rule of three if zero). */
export function falsePresent(g0, nDefinedReal, nObservedPresent) {
  const mk = (h) => { const direct = h.present.length / Math.max(1, h.definedCells), ind = h.rate4 != null ? (h.rate4 ** 2) / 2 : null;
    return { halfCells: h.halfCells, definedCells: h.definedCells, absZge4: h.absZge4, rate4: round(h.rate4, 4), presentCellsObserved: h.present.length, pPresentDirect: direct, pPresentFromRate4: ind,
      ruleOfThreeUpper: h.present.length === 0 ? 3 / Math.max(1, h.definedCells) : null, expectedFalseFromRate4: ind != null ? round(ind * nDefinedReal, 4) : null,
      expectedFalseDirect: round(direct * nDefinedReal, 4), expectedFalseUpper: h.present.length === 0 ? round(3 / Math.max(1, h.definedCells) * nDefinedReal, 4) : null }; };
  const ref = (p) => ({ mean: round(p * nDefinedReal, 4), sd: round(Math.sqrt(nDefinedReal * p * (1 - p)), 4) });
  const iid = mk(g0.iid), ctrl = mk(g0.ctrl);
  const pRef = Math.max(iid.pPresentFromRate4 ?? 0, ctrl.pPresentFromRate4 ?? 0);
  return { nDefinedRealCells: nDefinedReal, observedPresentRealCells: nObservedPresent, plantedIid: iid, controls: ctrl, binomialReference: { p: pRef, ...ref(pRef) },
    note: "PRESENT = |z| >= 4 in both halves with one sign. expected false cells = defined real cells x p; binomial reference uses the larger of the two rate4^2/2 estimates." };
}
