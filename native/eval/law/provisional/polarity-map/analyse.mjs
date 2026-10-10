// provisional/polarity-map/analyse.mjs — D1-D4 summaries of the discovery map (results/disc.*.jsonl -> results/analysis.disc.json, results/map-table.txt). New file.
// ═══ PRE-REGISTRATION (written before the first run of this file; implements D1-D4 exactly as pre-registered in map.mjs, whose header sha256 is carried in every row) ═══
// DISCLOSURE. Before this header I had printed the UD class-PO FULL cells (all 53 stems): DLf < 0.5 in most languages with >= 200 pairs (cat .37 eng .43 eus .37 fin .37 hrv .36
//   hun .34 lzh .37 nld .38 nob .35 por .40 spa .41 srp .38 vie .32 wol .32; ~0.5 for cmn hin fas fra lav pol heb bul), DRf mostly 0.4-0.57 (nob .37, urd .41). I had NOT seen CAUSAL4,
//   PN, controls (SHUF/SHAM), IRC, books, code, or any property. D4 (property vs sign) is therefore run after seeing the UD DLf pattern; it is exploratory until confirmed on untouched data.
// DEFINITIONS (all fixed here). Primary class per register: UD PO, IRC NK, books NAMES, code PE. Primary mode FULL; primary features DLf, DRf, DLRf (CAUSAL4 reported alongside).
//   VALID cell: pairs >= 60 and position control in [0.45,0.55]. Languages: cmn-hans is dropped from every UD count (same text as cmn). SIGN: POS (CI lo > 0.5 & AUC >= 0.53),
//   NEG (CI hi < 0.5 & AUC <= 0.47), else FLAT. UD language-bootstrap CI: B=2000 resamples of valid languages, median. D4 as pre-registered: Spearman of each of 9 properties with
//   AUC(DLf)-0.5 and AUC(DRf)-0.5 over valid registers; max |rho| judged against max over the 18 combinations under a joint register-permutation (B=2000, seeded).
//   Secondary D4 (UD only) and leave-family-out D4 (UD languages averaged to ONE point, plus IRC/book/code points) are reported, not gating.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { headerSha, rngFor, seedFor, round, mean, quantile, PROP_NAMES } from "./lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(HERE, "results");
const files = fs.readdirSync(RES).filter((f) => /^disc\..*\.jsonl$/.test(f));
const rows = files.flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const PRIMARY = { ud: "PO", irc: "NK", book: "NAMES", code: "PE" };
const cells = rows.filter((r) => r.ctl && r.feats), propsOf = Object.fromEntries(rows.filter((r) => r.props).map((r) => [r.reg, r.props]));
const lang = (r) => r.reg !== "ud-cmn-hans";
const valid = (c) => c.pairs >= 60 && c.posControlOk;
const sign = (f) => (f && f.lo > 0.5 && f.auc >= 0.53 ? "POS" : f && f.hi < 0.5 && f.auc <= 0.47 ? "NEG" : "FLAT");
const find = (reg, def, mode, ctl = "real") => cells.find((c) => c.reg === reg && c.def === def && c.mode === mode && c.ctl === ctl);
const regs = [...new Set(cells.map((c) => c.reg))].filter((r) => r !== "ud-cmn-hans").sort();
const fam = (reg) => cells.find((c) => c.reg === reg).fam;
const boot = (xs, B = 2000, rnd = rngFor(seedFor("polarity-map", "analyse-boot"))) => { const m = []; for (let b = 0; b < B; b++) { const s = []; for (let k = 0; k < xs.length; k++) s.push(xs[Math.floor(rnd() * xs.length)]); m.push(quantile(s, 0.5)); } return { median: round(quantile(xs, 0.5)), lo: round(quantile(m, 0.025)), hi: round(quantile(m, 0.975)), n: xs.length }; };
const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j < o.length && o[j][0] === o[i][0]) j++; for (let k = i; k < j; k++) r[o[k][1]] = (i + j + 1) / 2; i = j; } return r; };
const spear = (a, b) => { const ra = rank(a), rb = rank(b), ma = mean(ra), mb = mean(rb); let s = 0, x = 0, y = 0; for (let i = 0; i < ra.length; i++) { s += (ra[i] - ma) * (rb[i] - mb); x += (ra[i] - ma) ** 2; y += (rb[i] - mb) ** 2; } return x && y ? s / Math.sqrt(x * y) : 0; };
const out = { headerSha: headerSha(fileURLToPath(import.meta.url)), mapHeaderSha: [...new Set(rows.map((r) => r.hdr))], D1: {}, D2: {}, D3: {}, D4: {} };
// ── D1: the map (primary class, FULL and CAUSAL4), and the text table ───────────────────────────────────────────────────────────────────
const FE = ["DLf", "DRf", "DLRf", "DLb", "DRb", "TLf", "TRf", "ELb", "ERb"], lines = [];
for (const mode of ["FULL", "CAUSAL4"]) {
  lines.push(`\n=== MAP ${mode} (primary class per register; matched-pair AUC [cluster CI]; flags V=valid, p=position control void, t=thin) ===`);
  for (const reg of regs) {
    const c = find(reg, PRIMARY[fam(reg)], mode); if (!c || !c.pairs) { lines.push(`${reg} none`); continue; }
    const v = valid(c); out.D1[`${reg}|${mode}`] = { pairs: c.pairs, valid: v, posControl: c.ctrl.pos, freqControl: c.ctrl.logn, signs: Object.fromEntries(FE.concat(mode === "FULL" ? [] : ["NOVL"]).map((f) => [f, sign(c.feats[f])])), auc: Object.fromEntries(FE.map((f) => [f, [c.feats[f].auc, c.feats[f].lo, c.feats[f].hi]])) };
    lines.push(`${reg.padEnd(26)} n=${String(c.pairs).padStart(4)} ${v ? "V" : c.pairs < 60 ? "t" : "p"} fq=${c.ctrl.logn.toFixed(2)} ` + ["DLf", "DRf", "DLRf"].map((f) => `${f} ${c.feats[f].auc.toFixed(2)}[${c.feats[f].lo.toFixed(2)},${c.feats[f].hi.toFixed(2)}]${sign(c.feats[f])[0]}`).join("  ") + "  " + ["DLb", "DRb", "TLf", "TRf"].map((f) => `${f} ${c.feats[f].auc.toFixed(2)}`).join(" "));
  }
}
// ── D2: controls ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
for (const ctl of ["shuf", "sham"]) {
  out.D2[ctl] = {};
  for (const f of ["UD", "ud", "irc", "book", "code"].filter((x) => x !== "UD")) {
    const cs = regs.filter((r) => fam(r) === f).map((r) => find(r, PRIMARY[f], "FULL", ctl)).filter((c) => c && c.pairs >= 60);
    const dev = (k) => cs.map((c) => Math.abs(c.feats[k].auc - 0.5));
    out.D2[ctl][f] = { n: cs.length, medAbsDev_DLf: round(quantile(dev("DLf"), 0.5)), medAbsDev_DRf: round(quantile(dev("DRf"), 0.5)), withinBand: cs.filter((c) => Math.abs(c.feats.DLf.auc - 0.5) < 0.03 && Math.abs(c.feats.DRf.auc - 0.5) < 0.03).length, posControlOk: cs.filter((c) => c.posControlOk).length, medAUC_DLf: round(quantile(cs.map((c) => c.feats.DLf.auc), 0.5)), medAUC_DRf: round(quantile(cs.map((c) => c.feats.DRf.auc), 0.5)) };
  }
}
// ── D3: polarity summary per family ─────────────────────────────────────────────────────────────────────────────────────────────────────
for (const f of ["ud", "irc", "book", "code"]) for (const mode of ["FULL", "CAUSAL4"]) {
  const cs = regs.filter((r) => fam(r) === f).map((r) => find(r, PRIMARY[f], mode)).filter((c) => c && valid(c)), o = { validRegisters: cs.length };
  for (const k of ["DLf", "DRf", "DLRf", "DLb", "DRb"]) { const s = cs.map((c) => sign(c.feats[k])); o[k] = { POS: s.filter((x) => x === "POS").length, NEG: s.filter((x) => x === "NEG").length, FLAT: s.filter((x) => x === "FLAT").length, ...boot(cs.map((c) => c.feats[k].auc)) }; }
  out.D3[`${f}|${mode}`] = o;
}
out.D3.udPN = {}; for (const mode of ["FULL", "CAUSAL4"]) { const cs = regs.filter((r) => fam(r) === "ud").map((r) => find(r, "PN", mode)).filter((c) => c && valid(c)); out.D3.udPN[mode] = { n: cs.length, DLf: boot(cs.map((c) => c.feats.DLf.auc)), DRf: boot(cs.map((c) => c.feats.DRf.auc)) }; }
// ── D4: property -> sign ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const pts = regs.map((r) => ({ reg: r, fam: fam(r), c: find(r, PRIMARY[fam(r)], "FULL"), p: propsOf[r] })).filter((x) => x.c && valid(x.c) && x.p);
const T = { DLf: pts.map((x) => x.c.feats.DLf.auc - 0.5), DRf: pts.map((x) => x.c.feats.DRf.auc - 0.5) };
const corr = (P, Tt) => Object.fromEntries(PROP_NAMES.map((k) => { const ok = P.map((x, i) => (typeof x.p[k] === "number" ? i : -1)).filter((i) => i >= 0); return [k, Object.fromEntries(Object.entries(Tt).map(([t, v]) => [t, round(spear(ok.map((i) => P[i].p[k]), ok.map((i) => v[i])))]))]; }));
const maxAbs = (P, Tt) => { let m = 0; for (const k of PROP_NAMES) for (const v of Object.values(Tt)) { const ok = P.map((x, i) => (typeof x.p[k] === "number" ? i : -1)).filter((i) => i >= 0); m = Math.max(m, Math.abs(spear(ok.map((i) => P[i].p[k]), ok.map((i) => v[i])))); } return m; };
const rndP = rngFor(seedFor("polarity-map", "analyse-perm")), obs = maxAbs(pts, T), nulls = [];
for (let b = 0; b < 2000; b++) { const idx = pts.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rndP() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } nulls.push(maxAbs(pts, { DLf: idx.map((i) => T.DLf[i]), DRf: idx.map((i) => T.DRf[i]) })); }
out.D4 = { points: pts.length, byFamily: Object.fromEntries(["ud", "irc", "book", "code"].map((f) => [f, pts.filter((x) => x.fam === f).length])), rho: corr(pts, T), maxAbsRho: round(obs), nullQ95: round(quantile(nulls, 0.95)), nullQ99: round(quantile(nulls, 0.99)), perm_p: round((nulls.filter((x) => x >= obs).length + 1) / (nulls.length + 1)) };
const ud = pts.filter((x) => x.fam === "ud"), Tu = { DLf: ud.map((x) => x.c.feats.DLf.auc - 0.5), DRf: ud.map((x) => x.c.feats.DRf.auc - 0.5) };
out.D4.udOnly = { points: ud.length, rho: corr(ud, Tu) };
const one = [{ reg: "UD-mean", fam: "ud", p: Object.fromEntries(PROP_NAMES.map((k) => [k, mean(ud.map((x) => x.p[k]).filter((v) => typeof v === "number"))])) }, ...pts.filter((x) => x.fam !== "ud")];
const To = { DLf: [mean(Tu.DLf), ...pts.filter((x) => x.fam !== "ud").map((x) => x.c.feats.DLf.auc - 0.5)], DRf: [mean(Tu.DRf), ...pts.filter((x) => x.fam !== "ud").map((x) => x.c.feats.DRf.auc - 0.5)] };
out.D4.familyPoints = { points: one.length, rho: corr(one, To) };
out.D4.table = pts.map((x) => ({ reg: x.reg, fam: x.fam, dDLf: round(x.c.feats.DLf.auc - 0.5), dDRf: round(x.c.feats.DRf.auc - 0.5), ...x.p }));
fs.writeFileSync(path.join(RES, "analysis.disc.json"), JSON.stringify(out, null, 1)); fs.writeFileSync(path.join(RES, "map-table.txt"), lines.join("\n") + "\n");
console.log(JSON.stringify({ D2: out.D2, D3: out.D3, D4: { ...out.D4, table: undefined } }, null, 1));
