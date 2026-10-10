// supplement-rows.mjs -- POST-VERDICT SUPPLEMENT to confirm.mjs (ablscope-2-company-ircA-c2to6). DESCRIPTIVE ONLY, reads the stored rows (results/rows.*.jsonl), recomputes no company score, changes no registered verdict.
//   node supplement-rows.mjs
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// DISCLOSURE. I have seen all arms of confirm.mjs (see supplement-pop.mjs header). Questions this file answers, each with a fixed definition and NO threshold:
//   Q1 (EN) bootstrap interval of the plain count R_INIT and of ALLINIT on the primary pairs, and of R_INIT on the decay pairs and the group-B pairs (the rule's "reduction" claim needs an interval, not a point).
//   Q2 (OTHER, de/es/it) the VOID verdict came from R_FB 0.444: the subset of pairs with identical frequency bin (|dfbin| = 0) and the German-only subset, with their controls (descriptive, not a replacement verdict).
//   Q3 (UD) the pooled controls were out of band (R_FB 0.436) but the strict-caliper subset was in band with AUC 0.414: its label-swap permutation q05/q95 (B=1000), and the number of languages (>= 25 pairs) with AUC < 0.5.
//   Q4 (BOOKS) per-novel AUC with a 95% interval (blocks = 10 per novel), R_INIT per novel, and the pooled decay arm (c7+) controls.
// BLIND PREDICTIONS (belief). Q1 R_INIT lower bound > 0.83 on EN primary (0.7). Q2 same-bin OTHER AUC >= 0.65 (0.65). Q3 caliper AUC below the permutation q05 (0.6); >= 9 of 14 languages below 0.5 (0.6). Q4 no novel above 0.62 (0.7).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { strat, boot, perm, caliperOf, controlAucs, inBand, perStratum, round } from "./lib-dself.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), R = (a) => fs.readFileSync(path.join(HERE, "results", `rows.${a}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const PRIM = ["c2", "c3", "c4_6"], NEG = (m) => -m.dSelf, RI = (m) => m.R_INIT, AI = (m) => m.ALLINIT, B = 1000;
const header = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0];
const sb = (ps, f, seed) => { const b = boot(ps, (x) => strat(x, f), { B, seed }); return { pairs: ps.length, auc: b.point, ci: [b.lo, b.hi] }; };
const out = { headerSha256: createHash("sha256").update(header).digest("hex") };
const en = R("en"), enA = en.filter((r) => r.grp === "A"), enP = enA.filter((r) => PRIM.includes(r.stratum)), enD = enA.filter((r) => !PRIM.includes(r.stratum)), enB = en.filter((r) => r.grp === "B");
out.Q1 = { negDSelf: sb(enP, NEG, 1), R_INIT: sb(enP, RI, 2), ALLINIT: sb(enP, AI, 3), R_INIT_decayArm: sb(enD, RI, 4), negDSelf_decayArm: sb(enD, NEG, 5), R_INIT_groupB: sb(enB, RI, 6), dSelf_groupB: sb(enB, (m) => m.dSelf, 7),
  R_INIT_perStratum: perStratum(enP, RI), R_INIT_perStratumDecay: perStratum(enD, RI) };
const ot = R("other").filter((r) => r.grp === "A"), sameBin = ot.filter((x) => x.p.R_FB === x.n.R_FB), de = ot.filter((x) => x.doc.startsWith("ubuntu-de")), deSame = de.filter((x) => x.p.R_FB === x.n.R_FB);
out.Q2 = { all: { ...sb(ot, NEG, 11), controls: controlAucs(ot) }, sameBin: { ...sb(sameBin, NEG, 12), controls: controlAucs(sameBin), inBand: inBand(controlAucs(sameBin)) }, german: { ...sb(de, NEG, 13), controls: controlAucs(de) },
  germanSameBin: { ...sb(deSame, NEG, 14), controls: controlAucs(deSame) }, R_INIT_all: sb(ot, RI, 15), R_INIT_sameBin: sb(sameBin, RI, 16) };
const ud = R("ud").filter((r) => r.grp === "A"), cal = caliperOf(ud), byLang = new Map(); for (const x of ud) (byLang.get(x.doc) ?? byLang.set(x.doc, []).get(x.doc)).push(x);
const pm = perm(cal, (x) => strat(x, NEG), { B, seed: 21 }), pmLow = perm(cal, (x) => 1 - strat(x, NEG), { B, seed: 21 }), langs = [...byLang].filter(([, ps]) => ps.length >= 25).map(([d, ps]) => [d.replace(".test", ""), strat(ps, NEG)]);
out.Q3 = { caliper: { ...sb(cal, NEG, 22), controls: controlAucs(cal), permQ95: pm.q95, permQ05: round(1 - pmLow.q95), permMean: pm.mean }, caliperR_INIT: sb(cal, RI, 23), languages: langs.length, below05: langs.filter(([, a]) => a < 0.5).length, aucs: Object.fromEntries(langs.map(([d, a]) => [d, round(a)])) };
const bk = R("books").filter((r) => r.grp === "A"), perBook = {};
for (const d of [...new Set(bk.map((x) => x.doc))]) { const ps = bk.filter((x) => x.doc === d && PRIM.includes(x.stratum)); perBook[d] = { negDSelf: sb(ps, NEG, 31), R_INIT: sb(ps, RI, 32) }; }
out.Q4 = { perBook, decayArmPooled: { ...sb(bk.filter((x) => !PRIM.includes(x.stratum)), NEG, 33), controls: controlAucs(bk.filter((x) => !PRIM.includes(x.stratum))) } };
fs.writeFileSync(path.join(HERE, "results", "supplement-rows.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ Q1: [out.Q1.negDSelf.auc, out.Q1.R_INIT, out.Q1.ALLINIT], Q2: [out.Q2.sameBin.auc, out.Q2.sameBin.pairs], Q3: [out.Q3.caliper.auc, out.Q3.permQ95, out.Q3.below05, out.Q3.languages], Q4: out.Q4.perBook, headerSha256: out.headerSha256 }));
