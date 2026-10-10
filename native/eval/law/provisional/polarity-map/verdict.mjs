// provisional/polarity-map/verdict.mjs — mechanical verdicts of Rule 1 and Rule 2 on the confirmation cells (results/conf.*.jsonl -> results/verdict.json). New file.
// ═══ PRE-REGISTRATION (written before the first run of this file and before results/conf.*.jsonl existed) ═══════════════════════════════════════════════════════
// This script implements the PASS CRITERIA written in confirm.mjs's header VERBATIM (R1a-R1e, R2a-R2c, R2-UD report-only); it has no discretion. Conventions: valid cell = pairs >= 60 and position control in
// [0.45,0.55]; cmn-hans dropped; "POS" = CI lower > 0.5 and AUC >= 0.53, "NEG" = CI upper < 0.5 and AUC <= 0.47; Delta = AUC(real) - AUC(shuf) of the same feature, same class; UD Rule 1 uses class PN, UD Rule 2 class PO;
// Spearman with mid-ranks; permutation p one-sided over B=2000 target shuffles. Family scope in a verdict = the families whose own sub-criteria hold (and whose Delta criterion holds where the criteria list one).
// ═══ END OF PRE-REGISTRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { headerSha, rngFor, seedFor, round, mean, quantile } from "./lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(HERE, "results");
const all = fs.readdirSync(RES).filter((f) => /^conf\..*\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const cells = all.filter((r) => r.feats), props = Object.fromEntries(all.filter((r) => r.props).map((r) => [r.reg, r.props]));
const valid = (c) => c && c.pairs >= 60 && c.posControlOk, med = (xs) => (xs.length ? round(quantile(xs, 0.5)) : null);
const sign = (f) => (f.lo > 0.5 && f.auc >= 0.53 ? "POS" : f.hi < 0.5 && f.auc <= 0.47 ? "NEG" : "FLAT");
const find = (reg, def, mode, ctl = "real") => cells.find((c) => c.reg === reg && c.def === def && c.mode === mode && c.ctl === ctl);
const regs = (f) => [...new Set(cells.filter((c) => c.fam === f).map((c) => c.reg))].filter((r) => r !== "ud-cmn-hans").sort();
const CL = { ud: "PN", irc: "NK", book: "NAMES", code: "PE" };
const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j < o.length && o[j][0] === o[i][0]) j++; for (let k = i; k < j; k++) r[o[k][1]] = (i + j + 1) / 2; i = j; } return r; };
const spear = (a, b) => { const ra = rank(a), rb = rank(b), ma = mean(ra), mb = mean(rb); let s = 0, x = 0, y = 0; for (let i = 0; i < ra.length; i++) { s += (ra[i] - ma) * (rb[i] - mb); x += (ra[i] - ma) ** 2; y += (rb[i] - mb) ** 2; } return x && y ? s / Math.sqrt(x * y) : 0; };
const permP = (x, y, tag) => { const obs = spear(x, y), rnd = rngFor(seedFor("polarity-map-confirm", "perm", tag)); let ge = 0; for (let b = 0; b < 2000; b++) { const idx = y.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } if (spear(x, idx.map((i) => y[i])) >= obs) ge++; } return { rho: round(obs), p: round((ge + 1) / 2001), n: x.length }; };
const out = { headerSha: headerSha(fileURLToPath(import.meta.url)), confHdr: [...new Set(all.map((r) => r.hdr))], R1: {}, R2: {}, tables: {} };
const get = (reg, def, mode, k, ctl = "real") => { const c = find(reg, def, mode, ctl); return c && c.pairs >= 60 ? c.feats[k] : null; };
const ok = (f, thr) => f && f.auc >= thr && f.lo > 0.5;
const deltaMed = (fam, def, k) => med(regs(fam).map((r) => ({ a: find(r, def, "FULL"), s: find(r, def, "FULL", "shuf") })).filter((x) => valid(x.a) && x.s && x.s.pairs >= 60).map((x) => x.a.feats[k].auc - x.s.feats[k].auc));
// ── Rule 1 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const R1 = out.R1;
const irc = regs("irc").filter((r) => valid(find(r, "NK", "FULL")));
R1.irc = { valid: irc, full: irc.map((r) => [r, get(r, "NK", "FULL", "pInitX").auc]), a: irc.length > 0 && irc.every((r) => ok(get(r, "NK", "FULL", "pInitX"), 0.8)) && (!irc.includes("irc-en") || (get("irc-en", "NK", "CAUSAL4", "pInitX")?.auc ?? 0) >= 0.75), delta: deltaMed("irc", "NK", "pInitX") };
const code = ["code-js", "code-py"];
R1.code = { full: code.map((r) => [r, get(r, "PE", "FULL", "pInitX")?.auc, get(r, "PE", "FULL", "pInitX")?.lo]), b: code.every((r) => ok(get(r, "PE", "FULL", "pInitX"), 0.55)), delta: deltaMed("code", "PE", "pInitX") };
const ud = regs("ud").filter((r) => valid(find(r, "PN", "FULL"))), udc = regs("ud").filter((r) => valid(find(r, "PN", "CAUSAL4")));
R1.ud = { validFull: ud.length, medFull: med(ud.map((r) => get(r, "PN", "FULL", "pInitX").auc)), medCausal: med(udc.map((r) => get(r, "PN", "CAUSAL4", "pInitX").auc)), POS: ud.filter((r) => sign(get(r, "PN", "FULL", "pInitX")) === "POS").length, NEG: ud.filter((r) => sign(get(r, "PN", "FULL", "pInitX")) === "NEG").length, delta: deltaMed("ud", "PN", "pInitX") };
R1.ud.c = R1.ud.medFull >= 0.55 && R1.ud.medCausal >= 0.55 && R1.ud.NEG <= 0.1 * ud.length;
const bk = regs("book").filter((r) => valid(find(r, "NAMES", "FULL"))); R1.book = { full: bk.map((r) => [r, get(r, "NAMES", "FULL", "pInitX").auc, get(r, "NAMES", "FULL", "pInitX").lo]), d: bk.filter((r) => ok(get(r, "NAMES", "FULL", "pInitX"), 0.55)).length >= 2, delta: deltaMed("book", "NAMES", "pInitX") };
R1.famPass = { irc: R1.irc.a && R1.irc.delta >= 0.05, code: R1.code.b && R1.code.delta >= 0.05, ud: R1.ud.c && R1.ud.delta >= 0.05, book: R1.book.d && R1.book.delta >= 0.05 };
R1.verdict = Object.values(R1.famPass).every(Boolean) ? "HOLDS" : Object.values(R1.famPass).some(Boolean) ? `HOLDS-IN-SCOPE(${Object.entries(R1.famPass).filter(([, v]) => v).map(([k]) => k).join(",")}); FAILS-ELSEWHERE(${Object.entries(R1.famPass).filter(([, v]) => !v).map(([k]) => k).join(",")})` : "FAILS";
// ── Rule 2 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const R2 = out.R2, pts = [];
for (const [f, d] of [["ud", "PO"], ["irc", "NK"], ["book", "NAMES"], ["code", "PE"]]) for (const r of regs(f)) { const c = find(r, d, "FULL"); if (valid(c) && typeof props[r]?.rareL_edge === "number") pts.push({ r, f, x: props[r].rareL_edge, y: c.feats.DLx.auc }); }
R2.a = { all: permP(pts.map((p) => p.x), pts.map((p) => p.y), "all"), nl: permP(pts.filter((p) => p.f !== "code").map((p) => p.x), pts.filter((p) => p.f !== "code").map((p) => p.y), "nl"), ud: permP(pts.filter((p) => p.f === "ud").map((p) => p.x), pts.filter((p) => p.f === "ud").map((p) => p.y), "ud") };
R2.a.pass = R2.a.all.rho >= 0.3 && R2.a.all.p < 0.05;
const ircv = regs("irc").filter((r) => valid(find(r, "NK", "FULL"))), bkv = regs("book").filter((r) => valid(find(r, "NAMES", "FULL"))), udp = regs("ud").filter((r) => valid(find(r, "PO", "FULL")));
const dl = (r, d) => get(r, d, "FULL", "DLx");
R2.irc = { dlx: ircv.map((r) => [r, dl(r, "NK").auc]), ok: ircv.length > 0 && ircv.every((r) => dl(r, "NK").auc >= 0.55), delta: deltaMed("irc", "NK", "DLx") };
R2.code = { dlx: code.map((r) => [r, dl(r, "PE")?.auc]), ok: code.every((r) => dl(r, "PE") && dl(r, "PE").auc >= 0.55), delta: deltaMed("code", "PE", "DLx") };
R2.book = { dlx: bkv.map((r) => [r, dl(r, "NAMES").auc]), ok: bkv.filter((r) => dl(r, "NAMES").auc <= 0.47).length >= 2, delta: deltaMed("book", "NAMES", "DLx") };
R2.ud = { valid: udp.length, med: med(udp.map((r) => dl(r, "PO").auc)), POS: udp.filter((r) => sign(dl(r, "PO")) === "POS").length, NEG: udp.filter((r) => sign(dl(r, "PO")) === "NEG").length, delta: deltaMed("ud", "PO", "DLx") };
R2.ud.ok = R2.ud.med <= 0.48 && R2.ud.POS <= 0.1 * udp.length && R2.ud.NEG >= 0.25 * udp.length;
R2.famPass = { irc: R2.irc.ok && R2.irc.delta >= 0.05, code: R2.code.ok && R2.code.delta >= 0.05, book: R2.book.ok && R2.book.delta <= -0.05, ud: R2.ud.ok };
const sc = Object.entries(R2.famPass).filter(([, v]) => v).map(([k]) => k), fl = Object.entries(R2.famPass).filter(([, v]) => !v).map(([k]) => k);
R2.verdict = !R2.a.pass ? (sc.length ? `PROPERTY-FAILS; SIGNS-HOLD-IN(${sc.join(",")}) FAIL(${fl.join(",")})` : "FAILS") : fl.length ? `HOLDS-IN-SCOPE(${sc.join(",")}); FAILS-ELSEWHERE(${fl.join(",")})` : "HOLDS";
// ── control summaries and the tables ──────────────────────────────────────────────────────────────────────────────────────────────────
out.controls = {}; for (const [f, d] of [["ud", "PN"], ["ud", "PO"], ["irc", "NK"], ["book", "NAMES"], ["code", "PE"]]) for (const ctl of ["shuf", "sham"]) { const cs = regs(f).map((r) => find(r, d, "FULL", ctl)).filter((c) => c && c.pairs >= 60); out.controls[`${f}-${d}|${ctl}`] = { n: cs.length, pInitX_medDev: med(cs.map((c) => Math.abs(c.feats.pInitX.auc - 0.5))), DLx_medDev: med(cs.map((c) => Math.abs(c.feats.DLx.auc - 0.5))) }; }
out.tables.registers = Object.fromEntries(["ud", "irc", "book", "code"].flatMap((f) => regs(f).map((r) => { const d = f === "ud" ? "PO" : CL[f], c = find(r, d, "FULL"), c4 = find(r, d, "CAUSAL4"), cn = find(r, "PN", "FULL"); return [r, { fam: f, pairs: c?.pairs, valid: valid(c), rareL_edge: props[r]?.rareL_edge, DLx: c?.feats.DLx.auc, Ax: c?.feats.Ax.auc, pInitX_PO: c?.feats.pInitX.auc, pInitX_PN: cn?.feats.pInitX.auc, pInitX_causal: c4?.feats.pInitX.auc, pEdgeL: c?.feats.pEdgeL.auc, pRareR: c?.feats.pRareR.auc, DLf: c?.feats.DLf.auc }]; })));
fs.writeFileSync(path.join(RES, "verdict.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ R1: { ...R1 }, R2: { ...R2 }, controls: out.controls }, null, 1));
