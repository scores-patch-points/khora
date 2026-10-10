// provisional/polarity-map/analyse3.mjs — U1-U4 and the Rule-1 gate of map3.mjs (results/u.*.jsonl -> results/analysis.u.json). New file.
// ═══ PRE-REGISTRATION (written before the first run of this file; implements map3.mjs exactly) ══════════════════════════════════════════════════════════════
// DISCLOSURE: as in map3.mjs's header; no pInitX number seen. DEFINITIONS: primary class per register UD PN (and PO reported), IRC NK, books NAMES, code PE; valid cell: pairs >= 60 and position control in [0.45,0.55];
//   cmn-hans dropped; family median over valid registers; POS = CI lo > 0.5 and AUC >= 0.53; SHUF family median |AUC-0.5| < 0.03; Delta = AUC(real) - AUC(shuf) per register (median per family >= 0.05).
//   GATE = map3.mjs RULE GATE verbatim: FULL median >= 0.55 in each of UD(PN), IRC, books, code; POS >= 60% of UD valid cells and every valid cell of the others; CAUSAL4 median >= 0.53 each; SHUF passes each; Delta median >= 0.05 each.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { headerSha, round, quantile } from "./lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(HERE, "results");
const cells = fs.readdirSync(RES).filter((f) => /^u\..*\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))).filter((r) => r.feats);
const valid = (c) => c && c.pairs >= 60 && c.posControlOk, med = (xs) => (xs.length ? round(quantile(xs, 0.5)) : null);
const sign = (f) => (f.lo > 0.5 && f.auc >= 0.53 ? "POS" : f.hi < 0.5 && f.auc <= 0.47 ? "NEG" : "FLAT");
const find = (reg, def, mode, ctl = "real") => cells.find((c) => c.reg === reg && c.def === def && c.mode === mode && c.ctl === ctl);
const regs = [...new Set(cells.map((c) => c.reg))].filter((r) => r !== "ud-cmn-hans").sort(), fam = (r) => cells.find((c) => c.reg === r).fam;
const PRIMARY = { ud: "PN", irc: "NK", book: "NAMES", code: "PE" }, out = { headerSha: headerSha(fileURLToPath(import.meta.url)), mapHeaderSha: [...new Set(cells.map((c) => c.hdr))], U: {}, controls: {}, gate: {}, perRegister: {} };
const combos = [["ud", "PN"], ["ud", "PO"], ["irc", "NK"], ["book", "NAMES"], ["book", "CHAR"], ["code", "PE"], ["code", "PA"]];
for (const [f, d] of combos) for (const mode of ["FULL", "CAUSAL4"]) {
  const cs = regs.filter((r) => fam(r) === f).map((r) => ({ r, c: find(r, d, mode) })).filter((x) => valid(x.c)), o = { n: cs.length };
  for (const k of ["pInitX", "pFinalX", "pInit", "pFinal"]) { const s = cs.map((x) => sign(x.c.feats[k])); o[k] = { med: med(cs.map((x) => x.c.feats[k].auc)), POS: s.filter((v) => v === "POS").length, NEG: s.filter((v) => v === "NEG").length }; }
  out.U[`${f}-${d}|${mode}`] = o;
}
for (const f of ["ud", "irc", "book", "code"]) {
  const d = PRIMARY[f], dc = f === "ud" ? "PO" : d; // DEVIATION from the header (recorded in out.controlDef): map3.mjs ran SHUF/SHAM for the FIRST classdef of each register, which is PO for UD
  out.controlDef = { ...(out.controlDef ?? {}), [f]: dc };
  for (const ctl of ["shuf", "sham"]) { const cs = regs.filter((r) => fam(r) === f).map((r) => find(r, dc, "FULL", ctl)).filter((c) => c && c.pairs >= 60); out.controls[`${f}|${ctl}`] = { n: cs.length, medAbsDev: med(cs.map((c) => Math.abs(c.feats.pInitX.auc - 0.5))), medAUC: med(cs.map((c) => c.feats.pInitX.auc)) }; }
  const cs = regs.filter((r) => fam(r) === f).map((r) => ({ r, real: find(r, dc, "FULL"), shuf: find(r, dc, "FULL", "shuf") })).filter((x) => valid(x.real) && x.shuf && x.shuf.pairs >= 60);
  const delta = cs.map((x) => x.real.feats.pInitX.auc - x.shuf.feats.pInitX.auc), full = out.U[`${f}-${d}|FULL`], cau = out.U[`${f}-${d}|CAUSAL4`];
  const posNeed = f === "ud" ? 0.6 * full.n : full.n;
  out.gate[f] = { fullMed: full.pInitX.med, posCells: full.pInitX.POS, validCells: full.n, causalMed: cau.pInitX.med, shufMedAbsDev: out.controls[`${f}|shuf`].medAbsDev, deltaMed: med(delta), pass: full.pInitX.med >= 0.55 && full.pInitX.POS >= posNeed && cau.pInitX.med >= 0.53 && out.controls[`${f}|shuf`].medAbsDev < 0.03 && med(delta) >= 0.05 };
  for (const x of cs) out.perRegister[x.r] = { pairs: x.real.pairs, pInitX: x.real.feats.pInitX.auc, ci: [x.real.feats.pInitX.lo, x.real.feats.pInitX.hi], shuf: x.shuf.feats.pInitX.auc, delta: round(x.real.feats.pInitX.auc - x.shuf.feats.pInitX.auc) };
}
out.gate.ALL = Object.values(out.gate).every((g) => g.pass);
fs.writeFileSync(path.join(RES, "analysis.u.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ U: out.U, controls: out.controls, gate: out.gate }, null, 1));
