// attack-PM-R2-left-company-polarity/summarize-B.mjs -- mechanical summary for ATTACK B (criteria fixed in attack-B-newdata.mjs's header; the property/multiplicity block below is part B's analysis of existing cells and
// is declared here BEFORE it was first run: properties compared = rareL_edge vs log mean unit length vs log tokens, across registers, with a FAMILY-block permutation null).  node summarize-B.mjs -> results/B-summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, CONF, round, mean, rngFor, seedFor, quantile, shuffleIn } from "./attack-lib.mjs";
const RES = path.join(HERE, "results"), jl = (re, dir = RES) => fs.readdirSync(dir).filter((f) => re.test(f)).flatMap((f) => fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const A = jl(/^A\..*\.jsonl$/), Bn = jl(/^B\..*\.jsonl$/), CF = jl(/^conf\..*\.jsonl$/, path.join(CONF, "results")), A2 = jl(/^A2\.irc\..*\.jsonl$/);
const med = (xs) => (xs.length ? round(quantile(xs, 0.5)) : null), sign = (d) => (d.lo > 0.5 && d.auc >= 0.53 ? "POS" : d.hi < 0.5 && d.auc <= 0.47 ? "NEG" : "FLAT");
const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j < o.length && o[j][0] === o[i][0]) j++; for (let k = i; k < j; k++) r[o[k][1]] = (i + j + 1) / 2; i = j; } return r; };
const spear = (a, b) => { const ra = rank(a), rb = rank(b), ma = mean(ra), mb = mean(rb); let s = 0, x = 0, y = 0; for (let i = 0; i < ra.length; i++) { s += (ra[i] - ma) * (rb[i] - mb); x += (ra[i] - ma) ** 2; y += (rb[i] - mb) ** 2; } return x && y ? s / Math.sqrt(x * y) : 0; };
const permP = (x, y, tag, B = 4000) => { const obs = spear(x, y), rnd = rngFor(seedFor("pm-r2-attack-B", "perm", tag)); let ge = 0; for (let b = 0; b < B; b++) { const idx = shuffleIn(y.map((_, i) => i), rnd); if (spear(x, idx.map((i) => y[i])) >= obs - 1e-12) ge++; } return { rho: round(obs), p1: round((ge + 1) / (B + 1)), n: x.length }; };
const out = { ud: {}, code: {}, property: {}, multiplicity: {} };
// ── (1)+(2) UD window 1 vs window 2 ─────────────────────────────────────────────────────────────────────────────────────
const w1 = (v) => Object.fromEntries(A.filter((r) => r.fam === "ud" && r.variant === v && r.pairs > 0).map((r) => [r.reg, r])), w2 = (v) => Object.fromEntries(Bn.filter((r) => r.fam === "ud" && r.variant === v && r.pairs > 0).map((r) => [r.reg, r]));
const rl1 = Object.fromEntries(A.filter((r) => r.kind === "props").map((r) => [r.reg, r.rareL_edge])), rl2 = Object.fromEntries(Bn.filter((r) => r.kind === "props" && r.reg).map((r) => [r.reg, r.rareL_edge]));
for (const [va, vb] of [["M2", "M2"], ["M0", "R0m"]]) {
  const a = w1(va), b = w2(vb), common = Object.keys(b).filter((k) => a[k]), x = common.map((k) => a[k].DLx.auc), y = common.map((k) => b[k].DLx.auc);
  const val2 = Object.values(b).filter((c) => c.valid), sg = val2.map((c) => sign(c.DLx)), all2 = Object.values(b);
  out.ud[`${va}-vs-${vb}`] = { nCommon: common.length, spearmanW1W2: round(spear(x, y)), permP1: permP(x, y, `udagree-${va}`).p1, signAgree: round(common.filter((k, i) => (x[i] > 0.5) === (y[i] > 0.5)).length / common.length), medW1: med(x), medW2: med(y), w2: { cells: all2.length, valid: val2.length, medAll: med(all2.map((c) => c.DLx.auc)), medValid: med(val2.map((c) => c.DLx.auc)), POS: sg.filter((s) => s === "POS").length, NEG: sg.filter((s) => s === "NEG").length, nLow47: val2.filter((c) => c.DLx.auc <= 0.47).length } };
  // property inside UD (both windows)
  const pts = [...common.map((k) => [rl1[k], a[k].DLx.auc]), ...common.map((k) => [rl2[k], b[k].DLx.auc])].filter((p) => typeof p[0] === "number");
  out.ud[`${va}-vs-${vb}`].propertyInsideUD = { ...permP(pts.map((p) => p[0]), pts.map((p) => p[1]), `udprop-${va}`), above10: pts.filter((p) => p[0] >= 0.1).map((p) => p[1]).map((v) => round(v)), nAbove10: pts.filter((p) => p[0] >= 0.1).length, share_gt_half_above10: round(pts.filter((p) => p[0] >= 0.1 && p[1] > 0.5).length / Math.max(1, pts.filter((p) => p[0] >= 0.1).length)), medBelow05: med(pts.filter((p) => p[0] < 0.05).map((p) => p[1])), medAbove10: med(pts.filter((p) => p[0] >= 0.1).map((p) => p[1])) };
}
// bootstrap over treebanks of the median M2 AUC (w1 and w2 pooled as separate observations of the same treebank)
{ const a = w1("M2"), b = w2("M2"), tbs = Object.keys(a), rnd = rngFor(seedFor("pm-r2-attack-B", "bootUD")), meds = []; for (let t = 0; t < 2000; t++) { const s = []; for (let i = 0; i < tbs.length; i++) { const k = tbs[Math.floor(rnd() * tbs.length)]; s.push(a[k].DLx.auc); if (b[k]) s.push(b[k].DLx.auc); } meds.push(quantile(s, 0.5)); } out.ud.bootstrapMedianM2 = { med: round(quantile(meds, 0.5)), lo: round(quantile(meds, 0.025)), hi: round(quantile(meds, 0.975)) }; }
// ── (3) code: leave-one-file-out and random half-splits ───────────────────────────────────────────────────────────────────
for (const variant of ["M2", "R0m"]) for (const lg of ["code-js", "code-py", "code-rb"]) {
  const cs = Bn.filter((r) => r.fam === "code" && r.lang === lg && r.variant === variant && r.pairs > 0), W = cs.map((c) => [...c.wins].map((w) => (w === "1" ? 1 : w === "0" ? 0 : 0.5))), pool = (idx) => { const w = idx.flatMap((i) => W[i]); return w.length ? mean(w) : null; }, all = cs.map((_, i) => i);
  const loo = all.map((i) => pool(all.filter((j) => j !== i))), rnd = rngFor(seedFor("pm-r2-attack-B", "halves", lg, variant)); let ge = 0, tot = 0; const hv = [];
  for (let t = 0; t < 400; t++) { const idx = shuffleIn(all.slice(), rnd), h = Math.floor(idx.length / 2); for (const part of [idx.slice(0, h), idx.slice(h)]) { const v = pool(part); if (v != null) { tot++; hv.push(v); if (v >= 0.55) ge++; } } }
  out.code[`${lg}-${variant}`] = { files: cs.length, pairs: cs.reduce((a, c) => a + c.pairs, 0), pooled: round(pool(all)), perFile: cs.map((c) => round(c.DLx.auc)), filesAbove05: cs.filter((c) => c.DLx.auc > 0.5).length, looMin: round(Math.min(...loo)), looMax: round(Math.max(...loo)), halves: { n: tot, shareGe055: round(ge / tot), q05: round(quantile(hv, 0.05)), q50: round(quantile(hv, 0.5)), q95: round(quantile(hv, 0.95)) } };
}
// ── (4) property across registers: rareL_edge vs cheap rivals (log mean unit length, log tokens), with FAMILY-BLOCK permutation ─────────────────────────────────────────
{ const props = Object.fromEntries(CF.filter((r) => r.ctl === "props").map((r) => [r.reg, r])), regs = [];
  const m2 = Object.fromEntries(A.filter((r) => r.variant === "M2" && r.pairs > 0).map((r) => [r.reg, r])), pr = Object.fromEntries(A.filter((r) => r.kind === "props").map((r) => [r.reg, r]));
  for (const [reg, c] of Object.entries(m2)) { const fam = c.fam === "irc-pooled" ? null : c.fam; if (!fam || !props[reg]) continue; regs.push({ reg, fam, rare: pr[reg]?.rareL_edge ?? props[reg].rareL_edge, lml: Math.log2(props[reg].tokens / props[reg].units), ltok: Math.log2(props[reg].tokens), auc: c.DLx.auc, valid: c.valid }); }
  const sets = { "all-M2 (every cell with pairs>0)": regs, "valid-only": regs.filter((r) => r.valid), "no-IRC": regs.filter((r) => r.fam !== "irc"), "non-UD": regs.filter((r) => r.fam !== "ud"), "UD only": regs.filter((r) => r.fam === "ud") };
  for (const [nm, set] of Object.entries(sets)) if (set.length >= 5) out.property[nm] = { n: set.length, byFamily: Object.fromEntries(["irc", "code", "book", "ud"].map((f) => [f, set.filter((r) => r.fam === f).length])), rareL_edge: permP(set.map((r) => r.rare), set.map((r) => r.auc), `prop-rare-${nm}`), logMeanUnitLen: permP(set.map((r) => -r.lml), set.map((r) => r.auc), `prop-lml-${nm}`), logTokens: permP(set.map((r) => r.ltok), set.map((r) => r.auc), `prop-ltok-${nm}`) };
  // family-block permutation: the 24 reassignments of the four families' (sets of AUCs) to the four families' (sets of rareL values), pairing within a family by sorted order
  const fams = ["irc", "code", "book", "ud"].filter((f) => regs.some((r) => r.fam === f)), fm = (f) => ({ med: med(regs.filter((r) => r.fam === f).map((r) => r.rare)), auc: med(regs.filter((r) => r.fam === f).map((r) => r.auc)) });
  const fmed = fams.map(fm); out.property.familyMedians = Object.fromEntries(fams.map((f, i) => [f, fmed[i]])); const obs = spear(fmed.map((x) => x.med), fmed.map((x) => x.auc)); let ge = 0, tot = 0;
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
  for (const p of perms(fmed.map((_, i) => i))) { tot++; if (spear(fmed.map((x) => x.med), p.map((i) => fmed[i].auc)) >= obs - 1e-12) ge++; }
  out.property.familyLevel = { families: fams, rho: round(obs), exactPermP1: round(ge / tot), perms: tot, note: "Spearman over family medians; exact one-sided permutation over family reassignments; the minimum attainable p with 4 families is 1/24 = 0.042" };
}
// ── (5) multiplicity / binomial references ───────────────────────────────────────────────────────────────────────────────
{ const binomTail = (n, k, p) => { let t = 0; for (let j = k; j <= n; j++) { let c = 1; for (let i = 0; i < j; i++) c = (c * (n - i)) / (i + 1); t += c * p ** j * (1 - p) ** (n - j); } return t; };
  const M2 = (fam) => A.filter((r) => r.fam === fam && r.variant === "M2" && r.pairs > 0 && r.valid), ud1 = M2("ud"), ud2 = Bn.filter((r) => r.fam === "ud" && r.variant === "M2" && r.pairs > 0 && r.valid);
  for (const [nm, cs] of [["ud-w1-M2", ud1], ["ud-w2-M2", ud2]]) { const neg = cs.filter((c) => sign(c.DLx) === "NEG").length, pos = cs.filter((c) => sign(c.DLx) === "POS").length; out.multiplicity[nm] = { valid: cs.length, NEG: neg, POS: pos, binomP_NEG_atLeast_under_alpha0025: binomTail(cs.length, neg, 0.025), binomP_POS_atLeast: binomTail(cs.length, pos, 0.025), nBelow05: cs.filter((c) => c.DLx.auc < 0.5).length, binomP_below05_fair_coin: binomTail(cs.length, cs.filter((c) => c.DLx.auc < 0.5).length, 0.5) }; }
  const code = A.filter((r) => r.fam === "code" && r.variant === "M2" && r.pairs > 0); out.multiplicity.codeM2 = code.map((c) => ({ reg: c.reg, auc: c.DLx.auc, lo: c.DLx.lo, hi: c.DLx.hi })); out.multiplicity.note = "see C-summary.json for company-destroyed (sham) AUC mean/SD per cell: z = (AUC - shamMean)/shamSd";
}
fs.writeFileSync(path.join(RES, "B-summary.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
