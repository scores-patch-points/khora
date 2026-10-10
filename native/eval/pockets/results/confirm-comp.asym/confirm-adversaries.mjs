// results/confirm-comp.asym/confirm-adversaries.mjs — NEW FILE written after the header was hashed: the registered adversaries ADV-1..ADV-6 (PREREG.adversaries), computed mechanically.
import fs from "node:fs";
import path from "node:path";

export async function addAdversaries(result, { PREREG, HERE, POCKETS, done, scoredStatus, spearman, eta2, isEn }) {
  const A = {}, body = done.filter((r) => ["PRESENT+", "PRESENT-"].includes(r.status) && !["control", "power-check", "thin"].includes(r.role));
  // ADV-1 estimator, ADV-2 unit edge: PRESENT cells only
  const chg = (key) => body.map((r) => ({ id: r.id, main: r.status, alt: r[key].status, zD: r[key].zD, zC: r[key].zC, same: r[key].status === r.status, undefinedCell: r[key].zD == null || r[key].zC == null }));
  const a1 = chg("plug"), a2 = chg("deep");
  A["ADV-1 estimator"] = { presentCells: body.length, unchanged: a1.filter((x) => x.same).length, changed: a1.filter((x) => !x.same).map((x) => `${x.id}: ${x.main} -> ${x.alt} (z ${x.zD?.toFixed(1)}, ${x.zC?.toFixed(1)})`), fractionChanged: a1.length ? a1.filter((x) => !x.same).length / a1.length : null, estimatorFragile: a1.length ? a1.filter((x) => !x.same).length / a1.length > 0.2 : null };
  A["ADV-2 unit edge"] = { presentCells: body.length, unchanged: a2.filter((x) => x.same).length, undefined: a2.filter((x) => x.undefinedCell).map((x) => x.id), changed: a2.filter((x) => !x.same && !x.undefinedCell).map((x) => `${x.id}: ${x.main} -> ${x.alt} (z ${x.zD?.toFixed(1)}, ${x.zC?.toFixed(1)})`),
    fractionUnchangedWhereDefined: (() => { const d = a2.filter((x) => !x.undefinedCell); return d.length ? d.filter((x) => x.same).length / d.length : null; })(), survives: (() => { const d = a2.filter((x) => !x.undefinedCell); return d.length ? d.filter((x) => x.same).length / d.length >= 0.8 : null; })() };
  // ADV-3 rival order.fnBefore
  const both = body.filter((r) => r.fnBefore && ["PRESENT+", "PRESENT-"].includes(r.fnBefore.status)), sg = (x) => Math.sign(x), agree = both.filter((r) => sg(r.zD + r.zC) === sg(r.fnBefore.zD + r.fnBefore.zC));
  const allZ = done.filter((r) => r.fnBefore && !["control", "power-check", "thin"].includes(r.role) && r.zD != null && r.fnBefore.zD != null);
  const matrix = JSON.parse(fs.readFileSync(path.join(POCKETS, "results/atlas-matrix.json"), "utf8")), ia = matrix.statistics.indexOf("comp.asym"), ib = matrix.statistics.indexOf("order.fnBefore");
  const ap = matrix.pockets.filter((p) => p.kind === "real" && !p.thin && p.cells[ia]?.[0] != null && p.cells[ia]?.[2] != null && p.cells[ib]?.[0] != null && p.cells[ib]?.[2] != null);
  const va = ap.map((p) => (p.cells[ia][0] + p.cells[ia][2]) / 2), vb = ap.map((p) => (p.cells[ib][0] + p.cells[ib][2]) / 2), za = ap.map((p) => (p.cells[ia][1] + p.cells[ia][3]) / 2), zb = ap.map((p) => (p.cells[ib][1] + p.cells[ib][3]) / 2);
  const apBoth = ap.filter((p) => ["P+", "P-"].includes(p.cells[ia][4]) && ["P+", "P-"].includes(p.cells[ib][4]));
  A["ADV-3 rival order.fnBefore"] = { siblingsBothPresent: both.length, signAgreement: both.length ? agree.length / both.length : null, disagree: both.filter((r) => !agree.includes(r)).map((r) => `${r.id}: asym ${r.status}, fnBefore ${r.fnBefore.status}`),
    siblingSpearmanOfMeanZ: allZ.length >= 5 ? spearman(allZ.map((r) => (r.zD + r.zC) / 2), allZ.map((r) => (r.fnBefore.zD + r.fnBefore.zC) / 2)) : null, siblingsInSpearman: allZ.length,
    atlas: { realPockets: ap.length, spearmanV: spearman(va, vb), spearmanMeanZ: spearman(za, zb), bothPresent: apBoth.length, bothPresentSameSign: apBoth.filter((p) => p.cells[ia][4] === p.cells[ib][4]).length },
    notIndependent: (() => { const r = spearman(va, vb); return Math.abs(r) >= 0.8 || (both.length >= 4 && agree.length / both.length >= 0.9); })() };
  // ADV-4 language versus register (atlas only)
  const pres = matrix.pockets.filter((p) => p.kind === "real" && !p.thin && ["P+", "P-"].includes(p.cells[ia]?.[4])), sign = pres.map((p) => (p.cells[ia][4] === "P+" ? 1 : -1)), en = pres.map((p) => (isEn(p.language) ? "en" : "non-en")), reg = pres.map((p) => p.register);
  const idxEn = pres.map((p, i) => i).filter((i) => en[i] === "en"), regEn = eta2(idxEn.map((i) => sign[i]), idxEn.map((i) => reg[i])), both2 = eta2(sign, pres.map((p, i) => `${reg[i]}|${en[i]}`));
  const tab = {}; pres.forEach((p, i) => { const k = `${en[i]}`; tab[k] ??= { "P+": 0, "P-": 0 }; tab[k][p.cells[ia][4]]++; });
  const dramaTab = {}; pres.forEach((p, i) => { if (reg[i] === "drama") { const k = en[i]; dramaTab[k] ??= { "P+": 0, "P-": 0 }; dramaTab[k][p.cells[ia][4]]++; } });
  A["ADV-4 language vs register (atlas only)"] = { presentCells: pres.length, etaSquaredSignOnRegister: eta2(sign, reg), etaSquaredSignOnEnglishFlag: eta2(sign, en), etaSquaredSignOnRegisterWithinEnglish: regEn, etaSquaredSignOnRegisterXEnglish: both2, tableByEnglish: tab, dramaByEnglish: dramaTab,
    shareOfPresentMinusThatIsNonEnglish: pres.filter((p, i) => sign[i] < 0 && en[i] === "non-en").length / Math.max(1, sign.filter((s) => s < 0).length),
    englishFlagExplainsAtLeastAsMuchAsRegister: eta2(sign, en).eta2 >= eta2(sign, reg).eta2 };
  // ADV-5 multiplicity
  const nScored = done.filter((r) => !["control", "power-check", "thin"].includes(r.role) && !r.thin).length, p = 0.00008488153720463878, nPresent = done.filter((r) => ["PRESENT+", "PRESENT-"].includes(r.status) && !["control", "power-check", "thin"].includes(r.role)).length;
  A["ADV-5 multiplicity"] = { siblingsTested: nScored, cellsTested: nScored * 2, pFalsePresentPerSibling: p, expectedFalsePresentSiblings: nScored * p, probAtLeastOneFalse: 1 - (1 - p) ** nScored, observedPresentSiblings: nPresent, controlsPresent: done.filter((r) => r.role === "control" && r.status.startsWith("PRESENT")).length };
  const lk = path.join(HERE, "leak.json"); A["ADV-6 leakage"] = fs.existsSync(lk) ? JSON.parse(fs.readFileSync(lk, "utf8")) : "leak.json not computed";
  result.adversaries = A;
}
