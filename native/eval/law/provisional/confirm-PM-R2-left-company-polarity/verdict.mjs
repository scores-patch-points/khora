// confirm-PM-R2-left-company-polarity/verdict.mjs -- mechanical verdict of PM-R2 on results/conf.*.jsonl -> results/verdict.json. NEW FILE.
// ═══ PRE-REGISTRATION (written before the first run of this file; results/conf.*.jsonl existed already, unread by me except for a first listing of cell numbers made to debug the runner) ═══
// This script implements PASS CRITERIA P1-P6, the VALID-cell definition, the SHAM and implementation controls and the VERDICT rule written in confirm.mjs's header VERBATIM; it has no discretion.
// Conventions: valid cell = pairs >= 60 AND position control in [0.45,0.55] AND frequency control in [0.45,0.55]; a family needs its minimum count of valid cells; "POS" = CI lower > 0.5 and AUC >= 0.53,
// "NEG" = CI upper < 0.5 and AUC <= 0.47; Delta = AUC(real) - AUC(shuf) (same register); Spearman with mid-ranks, permutation p one-sided over B=2000 shuffles of the targets, seeds under 'pm-r2-confirm-verdict'.
// SHAM family credit: median |AUC-0.5| over the family's sham cells (pairs >= 60) <= 0.03. Implementation check: |AUC(own) - AUC(features2)| <= 0.03 on >= 90% of the valid real cells of all families.
// The exploratory block `posthoc` (clearly labelled) is NOT part of the verdict; it reports what the pre-registered criteria would say under the scoper's validity convention (position control only).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { headerSha, rngFor, seedFor, round, mean, quantile } from "../polarity-map/lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(HERE, "results");
const all = fs.readdirSync(RES).filter((f) => /^conf\..*\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const cells = all.filter((r) => r.DLx), props = Object.fromEntries(all.filter((r) => r.ctl === "props").map((r) => [r.reg, r]));
const med = (xs) => (xs.length ? round(quantile(xs, 0.5)) : null);
const find = (reg, ctl) => cells.find((c) => c.reg === reg && c.ctl === ctl);
const okPos = (c) => c && c.pairs >= 60 && c.posControlOk, valid = (c) => okPos(c) && c.freqControlOk;
const sign = (f) => (f.lo > 0.5 && f.auc >= 0.53 ? "POS" : f.hi < 0.5 && f.auc <= 0.47 ? "NEG" : "FLAT");
const regsOf = (fam) => [...new Set(cells.filter((c) => c.fam === fam).map((c) => c.reg))].sort();
const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j < o.length && o[j][0] === o[i][0]) j++; for (let k = i; k < j; k++) r[o[k][1]] = (i + j + 1) / 2; i = j; } return r; };
const spear = (a, b) => { const ra = rank(a), rb = rank(b), ma = mean(ra), mb = mean(rb); let s = 0, x = 0, y = 0; for (let i = 0; i < ra.length; i++) { s += (ra[i] - ma) * (rb[i] - mb); x += (ra[i] - ma) ** 2; y += (rb[i] - mb) ** 2; } return x && y ? s / Math.sqrt(x * y) : 0; };
const permP = (x, y, tag) => { const obs = spear(x, y), rnd = rngFor(seedFor("pm-r2-confirm-verdict", "perm", tag)); let ge = 0; for (let b = 0; b < 2000; b++) { const idx = y.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } if (spear(x, idx.map((i) => y[i])) >= obs) ge++; } return { rho: round(obs), p: round((ge + 1) / 2001), n: x.length }; };
const out = { headerSha256: headerSha(path.join(HERE, "confirm.mjs")), runHdr: [...new Set(all.map((r) => r.hdr))], P: {}, controls: {}, tables: {}, report: {}, posthoc: {} };
const FAMS = { irc: regsOf("irc"), code: regsOf("code"), book: regsOf("book"), ud: regsOf("ud") };
const rowsOf = (vf) => Object.entries(FAMS).flatMap(([fam, rs]) => rs.map((r) => ({ fam, r, c: find(r, "real"), s: find(r, "shuf"), sh: find(r, "sham"), x: props[r]?.rareL_edge })).filter((o) => vf(o.c) && typeof o.x === "number"));
const V = rowsOf(valid);
// controls
for (const fam of Object.keys(FAMS)) { const sh = FAMS[fam].map((r) => find(r, "sham")).filter((c) => c && c.pairs >= 60); out.controls[`sham-${fam}`] = { n: sh.length, medDev: med(sh.map((c) => Math.abs(c.DLx.auc - 0.5))), ok: sh.length > 0 && med(sh.map((c) => Math.abs(c.DLx.auc - 0.5))) <= 0.03 }; }
const impl = V.map((o) => Math.abs(o.c.own.auc - o.c.DLx.auc)); out.controls.impl = { n: impl.length, shareWithin003: round(impl.filter((d) => d <= 0.03).length / impl.length), ok: impl.filter((d) => d <= 0.03).length / impl.length >= 0.9 };
// P1
const pts = V.filter((o) => o.fam !== "irc-pooled"), P1 = permP(pts.map((o) => o.x), pts.map((o) => o.c.DLx.auc), "all"); P1.pass = P1.rho >= 0.3 && P1.p < 0.05; out.P.P1 = P1; out.P.P1.byFamily = Object.fromEntries(Object.keys(FAMS).map((f) => [f, pts.filter((o) => o.fam === f).length]));
const sub = (f) => { const q = pts.filter(f); return q.length > 3 ? permP(q.map((o) => o.x), q.map((o) => o.c.DLx.auc), "sub" + q.length) : null; };
out.report.rho = { noCode: sub((o) => o.fam !== "code"), noIrc: sub((o) => o.fam !== "irc"), noUd: sub((o) => o.fam !== "ud"), udOnly: sub((o) => o.fam === "ud"), nonUd: sub((o) => o.fam !== "ud") };
// P2-P6
const famRows = (fam) => V.filter((o) => o.fam === fam), dmed = (fam) => med(famRows(fam).filter((o) => o.s && o.s.pairs >= 60).map((o) => o.c.DLx.auc - o.s.DLx.auc));
const irc = famRows("irc").filter((o) => o.r !== "irc-pooled37"), code = famRows("code"), bk = famRows("book"), ud = famRows("ud");
out.P.P2 = { valid: irc.length, cells: irc.map((o) => [o.r, o.c.DLx.auc, o.c.DLx.lo]), pass: irc.length >= 2 && irc.every((o) => o.c.DLx.auc >= 0.55 && o.c.DLx.lo > 0.5) };
out.P.P3 = { valid: code.length, cells: code.map((o) => [o.r, o.c.DLx.auc, o.c.DLx.lo]), pass: code.length >= 2 && ["code-js", "code-py"].every((n) => code.some((o) => o.r === n)) && code.every((o) => o.c.DLx.auc >= 0.55 && o.c.DLx.lo > 0.5) };
out.P.P4 = { valid: bk.length, cells: bk.map((o) => [o.r, o.c.DLx.auc]), nLow: bk.filter((o) => o.c.DLx.auc <= 0.47).length, pass: bk.length >= 3 && bk.filter((o) => o.c.DLx.auc <= 0.47).length >= (2 / 3) * bk.length - 1e-9 };
const sg = ud.map((o) => sign(o.c.DLx));
out.P.P5 = { valid: ud.length, median: med(ud.map((o) => o.c.DLx.auc)), POS: sg.filter((s) => s === "POS").length, NEG: sg.filter((s) => s === "NEG").length, FLAT: sg.filter((s) => s === "FLAT").length };
out.P.P5.pass = ud.length >= 20 && out.P.P5.median <= 0.48 && out.P.P5.POS <= 0.1 * ud.length && out.P.P5.NEG >= 0.25 * ud.length;
out.P.P6 = { irc: dmed("irc"), code: dmed("code"), book: dmed("book"), ud: dmed("ud") }; out.P.P6.pass = { irc: out.P.P6.irc >= 0.05, code: out.P.P6.code >= 0.05, book: out.P.P6.book !== null && out.P.P6.book <= -0.05 };
const ctlOk = (fam) => out.controls[`sham-${fam}`].ok && out.controls.impl.ok;
const fam = { irc: out.P.P2.pass && out.P.P6.pass.irc && ctlOk("irc"), code: out.P.P3.pass && out.P.P6.pass.code && ctlOk("code"), book: out.P.P4.pass && out.P.P6.pass.book && ctlOk("book"), ud: out.P.P5.pass && ctlOk("ud") };
out.famPass = fam; const hold = Object.entries(fam).filter(([, v]) => v).map(([k]) => k), fail = Object.entries(fam).filter(([, v]) => !v).map(([k]) => k);
out.verdict = out.P.P1.pass && fail.length === 0 ? "CONFIRMED" : hold.length ? `PARTIAL: holds(${hold.join(",")}) fails(${fail.join(",")}) P1=${out.P.P1.pass}` : "NOT_CONFIRMED";
// report-only: validity counts, sign accuracy of the property prediction
out.report.validity = Object.fromEntries(Object.entries(FAMS).map(([f, rs]) => [f, { total: rs.length, pairsGe60: rs.filter((r) => find(r, "real")?.pairs >= 60).length, posOk: rs.filter((r) => okPos(find(r, "real"))).length, valid: rs.filter((r) => valid(find(r, "real"))).length }]));
const decided = V.filter((o) => o.x >= 0.1 || o.x < 0.05 ).map((o) => ({ ...o, pred: o.x >= 0.1 ? 1 : -1, obs: o.c.DLx.auc > 0.5 ? 1 : -1 })), hit = decided.filter((o) => o.pred === o.obs).length;
const binom = (n, k) => { let p = 0; for (let j = k; j <= n; j++) { let c = 1; for (let t = 0; t < j; t++) c = (c * (n - t)) / (t + 1); p += c * 0.5 ** n; } return p; };
out.report.signAccuracy = { n: decided.length, hit, acc: round(hit / decided.length), pOneSidedBinom: round(binom(decided.length, hit)), byFamily: Object.fromEntries(Object.keys(FAMS).map((f) => { const d = decided.filter((o) => o.fam === f); return [f, { n: d.length, hit: d.filter((o) => o.pred === o.obs).length }]; })) };
out.report.udSignedAbove = (() => { const hi = ud.filter((o) => o.x >= 0.1); return hi.map((o) => [o.r, o.x, o.c.DLx.auc]); })();
out.tables.registers = Object.fromEntries(Object.entries(FAMS).flatMap(([f, rs]) => rs.map((r) => { const c = find(r, "real"), s = find(r, "shuf"), h = find(r, "sham"); return [r, { fam: f, rareL_edge: props[r]?.rareL_edge, tokens: props[r]?.tokens, pairs: c?.pairs, valid: valid(c), posOk: c?.posControlOk, freqOk: c?.freqControlOk, ctrl: c?.ctrl, DLx: c?.DLx.auc, lo: c?.DLx.lo, hi: c?.DLx.hi, pPerm: c?.DLx.pPerm, own: c?.own.auc, DLf: c?.DLf.auc, DLbx: c?.DLbx.auc, shuf: s?.DLx.auc, shufPairs: s?.pairs, sham: h?.DLx.auc, shamPairs: h?.pairs }]; })));
// ── POSTHOC (exploratory, not the verdict): the same criteria with position-only validity (scoper convention) ────────────────────────────────────────────────────────────────────────────────
{ const Vp = rowsOf(okPos), g = (fam) => Vp.filter((o) => o.fam === fam), pp = Vp.filter((o) => o.fam !== "irc-pooled"), p1 = permP(pp.map((o) => o.x), pp.map((o) => o.c.DLx.auc), "posthoc-all");
  const ircp = g("irc").filter((o) => o.r !== "irc-pooled37"), codep = g("code"), bkp = g("book"), udp = g("ud"), sgp = udp.map((o) => sign(o.c.DLx));
  const dm = (a) => med(a.filter((o) => o.s && o.s.pairs >= 60).map((o) => o.c.DLx.auc - o.s.DLx.auc));
  out.posthoc = { note: "position-only validity (scoper convention); NOT the registered verdict", P1: p1, irc: { valid: ircp.length, cells: ircp.map((o) => [o.r, o.c.DLx.auc, o.c.DLx.lo, o.c.ctrl.logn]), delta: dm(ircp) }, code: { valid: codep.length, delta: dm(codep) }, book: { valid: bkp.length, nLow: bkp.filter((o) => o.c.DLx.auc <= 0.47).length, delta: dm(bkp) },
    ud: { valid: udp.length, median: med(udp.map((o) => o.c.DLx.auc)), POS: sgp.filter((s) => s === "POS").length, NEG: sgp.filter((s) => s === "NEG").length, delta: dm(udp) } }; }
fs.writeFileSync(path.join(RES, "verdict.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ verdict: out.verdict, famPass: out.famPass, P: out.P, controls: out.controls, report: out.report, posthoc: out.posthoc }, null, 1));
