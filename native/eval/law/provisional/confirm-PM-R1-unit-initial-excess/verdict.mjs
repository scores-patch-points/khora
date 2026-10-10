// confirm-PM-R1-unit-initial-excess/verdict.mjs -- MECHANICAL verdict of the PM-R1 fresh-data confirmation (results/*.jsonl -> results/verdict.json + results/tables.txt). New file.
// ═══ PRE-REGISTRATION (written after confirm.mjs's rows existed on disk but BEFORE any of them was read by me; no number of results/*.jsonl had been seen when this was written) ═══════════════
// This file implements the PASS CRITERIA of confirm.mjs's header VERBATIM and has no discretion. Conventions fixed here: medians in the gates are LOWER medians (quantile 0.5 = element ceil(n/2), the
// scoper's convention, never looser than the mean-of-two-middles); valid cell = pairs >= 60 and position control in [0.45,0.55]; POS = CI lower > 0.5 and AUC >= 0.53; NEG = CI upper < 0.5 and AUC <= 0.47;
// Delta = AUC(real FULL) - AUC(shuf FULL) of the same register and class (a cell whose shuffled twin has < 60 pairs has no Delta); control validity of a family = median |AUC - 0.5| over its valid shuffled
// cells <= 0.03 and over its sham cells (pairs >= 60) <= 0.03, else that family's comparison is reported VOID and does not pass. FRESH rows (tier "FRESH") gate; REPLICATE rows (tier "REPLICATE") are
// summarised with the same functions and never gate. EXPLORATORY blocks (typology groups of UD treebanks hand-assigned from general knowledge, strata, strict-valid sensitivity, PO class, LOO, pFinalX) are
// reported, not gated, and can change no verdict.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { headerSha, round, mean, quantile } from "./lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(HERE, "results");
const rows = fs.readdirSync(RES).filter((f) => /\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const cells = rows.filter((r) => r.feats), infos = rows.filter((r) => r.info);
const find = (tier, reg, def, mode, ctl = "real") => cells.find((c) => c.tier === tier && c.reg === reg && c.def === def && c.mode === mode && c.ctl === ctl);
const DEFOF = { ud: "PN", irc: "NK", book: "NAMES", code: "PE" };
const regsAll = (tier, fam) => [...new Set(rows.filter((c) => c.tier === tier && c.fam === fam).map((c) => c.reg))].sort();
const regs = (tier, fam) => regsAll(tier, fam).filter((r) => cells.find((c) => c.tier === tier && c.reg === r && c.def === DEFOF[fam] && c.mode === "FULL" && c.ctl === "real"));
const valid = (c) => c && c.pairs >= 60 && c.posControlOk;
const lowMed = (xs) => (xs.length ? round(quantile(xs, 0.5)) : null), trueMed = (xs) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b), n = s.length; return round(n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2); };
const sign = (f) => (f.lo > 0.5 && f.auc >= 0.53 ? "POS" : f.hi < 0.5 && f.auc <= 0.47 ? "NEG" : "FLAT");
const A = (c, f = "pInitX") => c.feats[f].auc;
const delta = (tier, reg, def) => { const a = find(tier, reg, def, "FULL"), s = find(tier, reg, def, "FULL", "shuf"); return valid(a) && s && s.pairs >= 60 ? round(A(a) - A(s)) : null; };
const ctrlValid = (tier, fam, def) => {
  const R = regs(tier, fam), sh = R.map((r) => find(tier, r, def, "FULL", "shuf")).filter((c) => c && c.pairs >= 60).map((c) => Math.abs(A(c) - 0.5)), sm = R.map((r) => find(tier, r, def, "FULL", "sham")).filter((c) => c && c.pairs >= 60).map((c) => Math.abs(A(c) - 0.5));
  const shM = sh.length ? lowMed(sh) : null, smM = sm.length ? lowMed(sm) : null; return { shufMedDev: shM, shamMedDev: smM, nShuf: sh.length, nSham: sm.length, ok: shM !== null && smM !== null && shM <= 0.03 && smM <= 0.03 };
};
const out = { headerSha: headerSha(fileURLToPath(import.meta.url)), confirmHdr: [...new Set(rows.map((r) => r.hdr))], manifestOK: true, FRESH: {}, REPLICATE: {}, exploratory: {} };
const T = []; const say = (s) => T.push(s);
const f4 = (x) => (x === null || x === undefined ? "  -  " : x.toFixed(3));

// ── IRC ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function irc(tier) {
  const R = regs(tier, "irc"), set = (r) => { const c = find(tier, r, "NK", "FULL"), c4 = find(tier, r, "NK", "CAUSAL4"), l = find(tier, r, "NK", "LOO"); return { reg: r, pairs: c.pairs, valid: valid(c), auc: A(c), lo: c.feats.pInitX.lo, hi: c.feats.pInitX.hi, p: c.feats.pInitX.p, causal: c4 && c4.pairs >= 60 ? A(c4) : null, causalPairs: c4?.pairs, loo: l && l.pairs >= 60 ? A(l) : null, delta: delta(tier, r, "NK"), sham: find(tier, r, "NK", "FULL", "sham")?.feats.pInitX.auc, pFinalX: c.feats.pFinalX.auc, pInit: c.feats.pInit.auc, invLen: c.feats.invLen.auc, ctrl: c.ctrl, strictOk: c.strictOk }; };
  const sets = R.map(set), cv = ctrlValid(tier, "irc", "NK"), o = { sets, control: cv };
  if (tier === "FRESH") { const p = sets.find((s) => s.reg === "irc-en-fresh"); o.primary = p; o.pass = !!(p.valid && p.auc >= 0.8 && p.lo > 0.5 && p.p < 0.01 && p.causal !== null && p.causal >= 0.75 && p.delta !== null && p.delta >= 0.05 && cv.ok); }
  else { const v = sets.filter((s) => s.valid); o.allGE80 = v.length > 0 && v.every((s) => s.auc >= 0.8 && s.lo > 0.5); o.nValid = v.length; }
  return o;
}
// ── UD ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ud(tier) {
  const R = regs(tier, "ud"), cell = (r) => { const c = find(tier, r, "PN", "FULL"), c4 = find(tier, r, "PN", "CAUSAL4"), po = find(tier, r, "PO", "FULL"), l = find(tier, r, "PN", "LOO"); return { reg: r, pairs: c.pairs, valid: valid(c), strict: valid(c) && c.strictOk, auc: A(c), lo: c.feats.pInitX.lo, hi: c.feats.pInitX.hi, p: c.feats.pInitX.p, sign: c.pairs >= 60 ? sign(c.feats.pInitX) : "THIN", causal: c4 && valid(c4) ? A(c4) : null, delta: delta(tier, r, "PN"), pFinalX: c.pairs >= 60 ? c.feats.pFinalX.auc : null, po: po && valid(po) ? A(po) : null, loo: l && valid(l) ? A(l) : null, pInit: c.pairs >= 60 ? c.feats.pInit.auc : null, invLen: c.pairs >= 60 ? c.feats.invLen.auc : null, strata: c.strata }; };
  const cs = R.map(cell), v = cs.filter((x) => x.valid), cv = ctrlValid(tier, "ud", "PN"), c4v = cs.filter((x) => x.causal !== null);
  const o = { nCells: regsAll(tier, "ud").length, nNoPairsAtAll: regsAll(tier, "ud").length - cs.length, nValid: v.length, nThin: cs.filter((x) => x.pairs < 60).length + (regsAll(tier, "ud").length - cs.length), medFullLower: lowMed(v.map((x) => x.auc)), medFullTrue: trueMed(v.map((x) => x.auc)), nCausal: c4v.length, medCausalLower: lowMed(c4v.map((x) => x.causal)), medCausalTrue: trueMed(c4v.map((x) => x.causal)), POS: v.filter((x) => x.sign === "POS").length, NEG: v.filter((x) => x.sign === "NEG").length, FLAT: v.filter((x) => x.sign === "FLAT").length, gt50: v.filter((x) => x.auc > 0.5).length, medDeltaLower: lowMed(v.map((x) => x.delta).filter((d) => d !== null)), nDelta: v.filter((x) => x.delta !== null).length, control: cv, medPFinalX: trueMed(v.map((x) => x.pFinalX)), medPO: trueMed(cs.map((x) => x.po).filter((z) => z !== null)), medLOO: trueMed(cs.map((x) => x.loo).filter((z) => z !== null)), medStrictFull: trueMed(cs.filter((x) => x.strict).map((x) => x.auc)), nStrict: cs.filter((x) => x.strict).length, cells: cs };
  o.q = { p10: round(quantile(v.map((x) => x.auc), 0.1)), p25: round(quantile(v.map((x) => x.auc), 0.25)), p75: round(quantile(v.map((x) => x.auc), 0.75)), p90: round(quantile(v.map((x) => x.auc), 0.9)) };
  const n = v.length; o.gates = { medFull: o.medFullLower >= 0.55, medCausal: o.medCausalLower >= 0.55, neg: o.NEG <= 0.1 * n, gt50: o.gt50 >= 0.7 * n, pos: o.POS >= 0.4 * n, delta: o.medDeltaLower >= 0.05, control: cv.ok };
  o.pass = Object.values(o.gates).every(Boolean);
  const stratMed = (nm) => trueMed(v.map((x) => x.strata?.[nm]?.auc).filter((z) => typeof z === "number")); o.strata = Object.fromEntries(["evalInitial", "evalNonInitial", "nMent3-5", "nMent6-15", "nMent16+"].map((k) => [k, { med: stratMed(k), n: v.filter((x) => typeof x.strata?.[k]?.auc === "number").length }]));
  return o;
}
// ── books / code ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function book(tier) {
  const R = regs(tier, "book"), cs = R.map((r) => { const c = find(tier, r, "NAMES", "FULL"), c4 = find(tier, r, "NAMES", "CAUSAL4"); return { reg: r, pairs: c.pairs, valid: valid(c), auc: A(c), lo: c.feats.pInitX.lo, hi: c.feats.pInitX.hi, p: c.feats.pInitX.p, causal: c4 && c4.pairs >= 60 ? A(c4) : null, delta: delta(tier, r, "NAMES"), sham: find(tier, r, "NAMES", "FULL", "sham")?.feats.pInitX.auc, pFinalX: c.feats.pFinalX.auc, pInit: c.feats.pInit.auc, invLen: c.feats.invLen.auc, ctrl: c.ctrl }; });
  const cv = ctrlValid(tier, "book", "NAMES"), nPass = cs.filter((x) => x.valid && x.auc >= 0.55 && x.lo > 0.5).length, o = { cells: cs, control: cv, nPass, nBooks: cs.length, medDeltaLower: lowMed(cs.map((x) => x.delta).filter((d) => d !== null)) };
  o.pass = tier === "FRESH" ? nPass >= 3 && o.medDeltaLower >= 0.05 && cv.ok : nPass >= Math.ceil((2 * cs.length) / 3) && o.medDeltaLower >= 0.05; return o;
}
function code(tier) {
  const cs = regs(tier, "code").map((r) => { const c = find(tier, r, "PE", "FULL"), c4 = find(tier, r, "PE", "CAUSAL4"); const d = delta(tier, r, "PE"); return { reg: r, pairs: c.pairs, valid: valid(c), auc: A(c), lo: c.feats.pInitX.lo, hi: c.feats.pInitX.hi, p: c.feats.pInitX.p, causal: c4 && c4.pairs >= 60 ? A(c4) : null, delta: d, shuf: find(tier, r, "PE", "FULL", "shuf")?.feats.pInitX.auc, sham: find(tier, r, "PE", "FULL", "sham")?.feats.pInitX.auc, pFinalX: c.feats.pFinalX.auc, pInit: c.feats.pInit.auc, invLen: c.feats.invLen.auc, pass: !!(valid(c) && A(c) >= 0.55 && c.feats.pInitX.lo > 0.5 && d !== null && d >= 0.05), ctrl: c.ctrl }; });
  return { cells: cs, control: ctrlValid(tier, "code", "PE"), passPy: cs.find((x) => x.reg === "code-py")?.pass ?? false, passJs: cs.find((x) => x.reg === "code-js")?.pass ?? false };
}
for (const tier of ["FRESH", "REPLICATE"]) out[tier] = { irc: irc(tier), ud: ud(tier), book: book(tier), code: code(tier) };
const F = out.FRESH;
out.famPass = { "irc-en": F.irc.pass, "ud-prose": F.ud.pass, "novels": F.book.pass, "code-py": F.code.passPy && F.code.control.ok, "code-js(out-of-scope; literal passIf)": F.code.passJs && F.code.control.ok };
out.untestable = ["irc-de", "irc-es", "irc-it (no fresh day exists: all 32 non-en days were read by the scoper)"];
const pass = Object.entries(out.famPass).filter(([, v]) => v).map(([k]) => k), fail = Object.entries(out.famPass).filter(([, v]) => !v).map(([k]) => k);
out.verdict = pass.length === 0 ? "NOT_CONFIRMED" : "PARTIAL"; // CONFIRMED unreachable: de/es/it cannot be tested on fresh data (pre-stated)
out.verdictDetail = { passingFamilies: pass, failingFamilies: fail, untestable: out.untestable };
// exploratory: hand-assigned typology groups of the UD treebanks (general knowledge, NOT from the data)
const GRP = { SOV: "ja ko tr hi ur fa ta ka hy kk ug eu", VSO: "ga cy ar cop", FREESYN: "la grc got cu sa", };
const grpOf = (tb) => { const c = tb.split("_")[0]; return Object.entries(GRP).find(([, v]) => v.split(" ").includes(c))?.[0] ?? "SVO-ish"; };
const byG = {}; for (const x of F.ud.cells.filter((z) => z.valid)) (byG[grpOf(x.reg.replace(/^ud-/, ""))] ??= []).push(x.auc);
out.exploratory.udTypologyGroups = Object.fromEntries(Object.entries(byG).map(([g, v]) => [g, { n: v.length, medTrue: trueMed(v), min: round(Math.min(...v)), max: round(Math.max(...v)) }]));
fs.writeFileSync(path.join(RES, "verdict.json"), JSON.stringify(out, null, 1));
// ── tables ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
for (const tier of ["FRESH", "REPLICATE"]) {
  const X = out[tier]; say(`\n======== ${tier} ========`);
  say(`IRC (controls shufMedDev=${X.irc.control.shufMedDev} shamMedDev=${X.irc.control.shamMedDev}${tier === "FRESH" ? `; PASS=${X.irc.pass}` : ""})`);
  for (const s of X.irc.sets) say(`  ${s.reg.padEnd(20)} pairs ${String(s.pairs).padStart(4)} valid ${s.valid ? "Y" : "n"}  FULL ${f4(s.auc)} [${f4(s.lo)},${f4(s.hi)}] p=${s.p}  CAUSAL4 ${f4(s.causal)} (${s.causalPairs})  LOO ${f4(s.loo)}  Delta ${f4(s.delta)}  sham ${f4(s.sham)}  pFinalX ${f4(s.pFinalX)} pInit ${f4(s.pInit)} invLen ${f4(s.invLen)} ctrl ${JSON.stringify(s.ctrl)}`);
  const u = X.ud; say(`UD PN: cells ${u.nCells}, valid ${u.nValid}, thin ${u.nThin}; FULL median lower ${u.medFullLower} true ${u.medFullTrue}; CAUSAL4 median lower ${u.medCausalLower} true ${u.medCausalTrue} over ${u.nCausal}; POS ${u.POS} NEG ${u.NEG} FLAT ${u.FLAT}; AUC>0.5 ${u.gt50}/${u.nValid}; Delta median ${u.medDeltaLower} (n ${u.nDelta}); controls ${JSON.stringify(u.control)}; quantiles ${JSON.stringify(u.q)}; pFinalX median ${u.medPFinalX}; PO median ${u.medPO}; LOO median ${u.medLOO}; strict-valid ${u.nStrict} median ${u.medStrictFull}; gates ${JSON.stringify(u.gates)} PASS=${u.pass}`);
  say(`  strata (median of cell AUCs): ${JSON.stringify(u.strata)}`);
  for (const x of u.cells) say(`  ${x.reg.padEnd(24)} pairs ${String(x.pairs).padStart(4)} ${x.valid ? " " : "x"} ${x.sign.padEnd(4)} FULL ${f4(x.auc)} [${f4(x.lo)},${f4(x.hi)}] CAUSAL4 ${f4(x.causal)} Delta ${f4(x.delta)} pFinalX ${f4(x.pFinalX)} PO ${f4(x.po)} LOO ${f4(x.loo)}`);
  const b = X.book; say(`BOOKS (nPass ${b.nPass}/${b.nBooks}; Delta median ${b.medDeltaLower}; controls ${JSON.stringify(b.control)}; PASS=${b.pass})`);
  for (const x of b.cells) say(`  ${x.reg.padEnd(20)} pairs ${String(x.pairs).padStart(4)} valid ${x.valid ? "Y" : "n"} FULL ${f4(x.auc)} [${f4(x.lo)},${f4(x.hi)}] p=${x.p} CAUSAL4 ${f4(x.causal)} Delta ${f4(x.delta)} sham ${f4(x.sham)} pFinalX ${f4(x.pFinalX)} pInit ${f4(x.pInit)} invLen ${f4(x.invLen)} ctrl ${JSON.stringify(x.ctrl)}`);
  const c = X.code; say(`CODE (controls ${JSON.stringify(c.control)}; py pass ${c.passPy}; js pass ${c.passJs})`);
  for (const x of c.cells) say(`  ${x.reg.padEnd(10)} pairs ${String(x.pairs).padStart(4)} valid ${x.valid ? "Y" : "n"} FULL ${f4(x.auc)} [${f4(x.lo)},${f4(x.hi)}] p=${x.p} CAUSAL4 ${f4(x.causal)} shuf ${f4(x.shuf)} Delta ${f4(x.delta)} sham ${f4(x.sham)} pFinalX ${f4(x.pFinalX)} pInit ${f4(x.pInit)} invLen ${f4(x.invLen)} pass ${x.pass} ctrl ${JSON.stringify(x.ctrl)}`);
}
say(`\nfamPass ${JSON.stringify(out.famPass)}\nVERDICT ${out.verdict} ${JSON.stringify(out.verdictDetail)}\nUD typology groups (exploratory) ${JSON.stringify(out.exploratory.udTypologyGroups)}`);
fs.writeFileSync(path.join(RES, "tables.txt"), T.join("\n") + "\n"); console.log(T.join("\n"));
