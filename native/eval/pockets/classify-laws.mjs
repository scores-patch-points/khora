// classify-laws.mjs — law status, G1, constant-varies and shared property per statistic (PROTOCOL.md "Law status over pockets", "CONSTANT VARIES", "SHARED PROPERTY").
import * as CFG from "./classify-config.mjs";
import { STAT, pockets, cells, lawIdx, round, attrsFor } from "./classify-data.mjs";
import { fin, mean, sd, median, quantile, spearman, dummyCats, permEta2Cat, seedFor } from "./classify-lib.mjs";
import { sharedProperty, levelProfile, numProfile } from "./classify-prop.mjs";

const EPS = 1e-12;
export function statusesOf(nPos, nNeg, nAbs, N) {
  const out = []; if (!N) return out;
  const maxShare = Math.max(nPos, nNeg) / N, any = nPos + nNeg;
  if (maxShare >= 0.85 - EPS) out.push("UNIVERSAL"); else if (maxShare >= 0.60 - EPS) out.push("MAJORITY");
  if (nPos >= 3 && nNeg >= 3) out.push("REVERSAL");
  if (any >= 2 && any / N <= 0.59 + EPS && nAbs / N >= 0.25 - EPS) out.push("POCKET-SPECIFIC");
  if (any < 2) out.push("NULL-LAW");
  return out;
}
const DEF = new Set(["P+", "P-", "A", "M"]);
const counts = (idxs, j) => { const c = { N: 0, nPos: 0, nNeg: 0, nAbs: 0, nAmb: 0, zUndef: 0, noData: 0, zUndefShifted: 0 };
  for (const i of idxs) { const k = cells[i][j]; if (DEF.has(k.st)) { c.N++; if (k.st === "P+") c.nPos++; else if (k.st === "P-") c.nNeg++; else if (k.st === "A") c.nAbs++; else c.nAmb++; } else if (k.st === "zundef") { c.zUndef++; if (k.shifted) c.zUndefShifted++; } else c.noData++; }
  return c; };
const domSign = (c) => (c.nPos > c.nNeg ? "+" : c.nNeg > c.nPos ? "-" : c.nPos ? "0" : null);

export function analyse() {
  const out = [], D = CFG.PERM_DRAWS;
  STAT.forEach((s, j) => {
    const all = counts(lawIdx, j), defIdx = lawIdx.filter((i) => DEF.has(cells[i][j].st));
    const rec = { stat: s.id, family: s.family, statement: s.statement, null: s.null, predict: s.predict, inertByConstruction: s.inert, ...all };
    rec.fracPos = all.N ? round(all.nPos / all.N, 4) : null; rec.fracNeg = all.N ? round(all.nNeg / all.N, 4) : null; rec.fracAbs = all.N ? round(all.nAbs / all.N, 4) : null;
    rec.fracPresent = all.N ? round((all.nPos + all.nNeg) / all.N, 4) : null; rec.dominantSign = domSign(all);
    rec.statuses = statusesOf(all.nPos, all.nNeg, all.nAbs, all.N);
    rec.primary = rec.statuses[0] ?? (all.N ? "PARTIAL" : "UNDEFINED");
    // per group / per grain breakdown of PRESENT shares (G3)
    const brk = (key) => { const o = {}; for (const i of defIdx) { const k = pockets[i][key], c = (o[k] ||= { n: 0, pos: 0, neg: 0, abs: 0 }); c.n++; const st = cells[i][j].st; if (st === "P+") c.pos++; else if (st === "P-") c.neg++; else if (st === "A") c.abs++; } return o; };
    rec.byGroup = brk("group"); rec.byGrain = brk("grain"); rec.byRegister = brk("register"); rec.byScript = brk("script");
    { const g = Object.values(rec.byGroup).filter((c) => c.n); rec.groupBalanced = g.length ? { fracPos: round(mean(g.map((c) => c.pos / c.n)), 3), fracNeg: round(mean(g.map((c) => c.neg / c.n)), 3), fracAbs: round(mean(g.map((c) => c.abs / c.n)), 3) } : null; }
    const wi = defIdx.filter((i) => pockets[i].grain === "word"), wc = counts(wi, j);
    rec.wordGrainOnly = { N: wc.N, nPos: wc.nPos, nNeg: wc.nNeg, nAbs: wc.nAbs, statuses: statusesOf(wc.nPos, wc.nNeg, wc.nAbs, wc.N) };
    // G1: pocket-level v (mean of the halves) against log10 tokens and mean unit length
    const vs = defIdx.map((i) => cells[i][j].v), zs = defIdx.map((i) => (cells[i][j].zD + cells[i][j].zC) / 2);
    const rT = spearman(vs, defIdx.map((i) => Math.log10(pockets[i].tokens))), rU = spearman(vs, defIdx.map((i) => pockets[i].meanUnitLength));
    rec.g1 = { rhoTokens: round(rT, 3), rhoUnitLength: round(rU, 3), rhoZtokens: round(spearman(zs, defIdx.map((i) => Math.log10(pockets[i].tokens))), 3), rhoZunitLength: round(spearman(zs, defIdx.map((i) => pockets[i].meanUnitLength)), 3) };
    rec.sizeConfounded = (rT != null && Math.abs(rT) >= CFG.SEL.sizeRho - EPS) || (rU != null && Math.abs(rU) >= CFG.SEL.sizeRho - EPS);
    rec.medianMinZ = defIdx.length ? round(median(defIdx.map((i) => cells[i][j].zmin)), 4) : null;
    // spread of v among PRESENT pockets
    const pres = defIdx.filter((i) => cells[i][j].st === "P+" || cells[i][j].st === "P-"), pv = pres.map((i) => cells[i][j].v);
    if (pv.length) { const q1 = quantile(pv, 0.25), q3 = quantile(pv, 0.75), md = median(pv.map(Math.abs)); rec.presentV = { n: pv.length, median: round(median(pv), 5), q1: round(q1, 5), q3: round(q3, 5), sd: round(sd(pv), 5), medianAbs: round(md, 5),
      heterogeneity: md > 1e-12 ? round((q3 - q1) / md, 4) : null, min: round(Math.min(...pv), 5), max: round(Math.max(...pv), 5) }; } else rec.presentV = null;
    rec.presentPockets = { pos: pres.filter((i) => cells[i][j].st === "P+").map((i) => pockets[i].id), neg: pres.filter((i) => cells[i][j].st === "P-").map((i) => pockets[i].id) };
    if (rec.presentPockets.pos.length > 60) rec.presentPockets.pos = `(${rec.presentPockets.pos.length} pockets; list omitted)`;
    if (rec.presentPockets.neg.length > 60) rec.presentPockets.neg = `(${rec.presentPockets.neg.length} pockets; list omitted)`;
    rec.absentPockets = defIdx.filter((i) => cells[i][j].st === "A").length > 60 ? null : defIdx.filter((i) => cells[i][j].st === "A").map((i) => pockets[i].id);
    // CONSTANT VARIES (UNIVERSAL or MAJORITY)
    if (rec.statuses.includes("UNIVERSAL") || rec.statuses.includes("MAJORITY")) {
      const sg = rec.dominantSign === "-" ? "P-" : "P+", pr = defIdx.filter((i) => cells[i][j].st === sg), y = pr.map((i) => cells[i][j].v);
      rec.constantVaries = { sign: sg, n: pr.length, spread: pr.length > 2 ? { median: round(median(y), 5), sd: round(sd(y), 5), iqrOverMedianAbs: median(y.map(Math.abs)) > 1e-12 ? round((quantile(y, 0.75) - quantile(y, 0.25)) / median(y.map(Math.abs)), 4) : null } : null, eta2: {}, classSpecific: [] };
      if (pr.length >= 10) for (const a of CFG.CAT_ATTRS) { const dc = dummyCats(pr.map((i) => pockets[i][a])); if (dc.k < 2 || dc.k >= pr.length) continue;
        const r = permEta2Cat(y, dc.cat, dc.k, D, seedFor("const", s.id, a)); rec.constantVaries.eta2[a] = { eta2: round(r.eta2, 4), p: round(r.p, 5), levels: dc.k };
        if (r.eta2 >= CFG.CONST_CLASS.eta2 && r.p < CFG.CONST_CLASS.p) rec.constantVaries.classSpecific.push(a); }
    }
    // SHARED PROPERTY (POCKET-SPECIFIC or REVERSAL)
    if (rec.statuses.includes("POCKET-SPECIFIC") || rec.statuses.includes("REVERSAL")) {
      const at = attrsFor(defIdx), ind = defIdx.map((i) => (cells[i][j].st === "P+" || cells[i][j].st === "P-" ? 1 : 0)), sp = sharedProperty(ind, at, D, seedFor("shared", s.id));
      if (sp) { const bestA = at.find((a) => a.name === sp.best.attr); sp.detail = bestA.type === "cat" ? levelProfile(ind, bestA).slice(0, 8) : numProfile(ind, bestA); rec.sharedProperty = sp; }
      if (rec.statuses.includes("REVERSAL")) { const ix = defIdx.filter((i) => cells[i][j].st === "P+" || cells[i][j].st === "P-"), at2 = attrsFor(ix), ind2 = ix.map((i) => (cells[i][j].st === "P+" ? 1 : 0)), sp2 = sharedProperty(ind2, at2, D, seedFor("sign", s.id));
        if (sp2) { const bA = at2.find((a) => a.name === sp2.best.attr); sp2.detail = bA.type === "cat" ? levelProfile(ind2, bA).slice(0, 8) : numProfile(ind2, bA); rec.signSplit = sp2; } }
    }
    out.push(rec);
  });
  return out;
}
