// attack-PM-R1-unit-initial-excess/attack-B.mjs -- ATTACK B (FORKING PATHS, MULTIPLICITY, RE-DERIVED SCOPE) on rule PM-R1 (pInitX). New file; edits nothing.
//
//   node attack-B.mjs meta|halves|irc|design|summary    -> results/B-<name>.json(l)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; thresholds below may be tightened, never loosened, after any result) ════════════════════════
// DISCLOSURE. I have seen: the rule JSON; the confirmer's tables.txt (every UD cell AUC/CI/sign, IRC, books, code, its typology groups: SOV median 0.6725 vs rest 0.547) and jsonl rows; the results of my own attacks
//   A (strict matching: pInitX survives K1-K3 in IRC/UD/py/js, local-matching K4 costs IRC ~0.1; books' segmenter leak in Middlemarch) and C/C2 (locality rivals span/loc/burst reproduce or exceed pInitX on the same
//   rows in UD/py/js; pInitX keeps UD 0.557, IRC 0.78, py 0.675 after dispersion matching). Nothing below has been computed on the HALVES, the IRC day bootstrap, or the design variants. The META block recomputes
//   statistics from numbers the confirmer already published (so it is a re-analysis, not a new test).
// QUESTIONS AND TESTS (each with thresholds fixed now).
//   B0 THRESHOLD AUDIT (meta): sha256 of confirm.mjs's header == results/prereg-sha.txt; every results row carries that hdr; confirm.mjs's mtime precedes the birth time of every results/*.jsonl; the manifest sha matches.
//   B1 FAMILY-CLUSTER BOOTSTRAP of the UD claim (meta): valid FULL cells of results/ud.jsonl (pairs >= 60, position control ok) grouped by language family (hand-assigned by genealogy in this file); resample families
//      with replacement (B=4000), recompute the LOWER median of cell AUCs; same for CAUSAL4 cells. ROBUST if P(median >= 0.55) >= 0.95, MARGINAL if in [0.80,0.95), FRAGILE if < 0.80. Also leave-one-family-out range.
//   B2 MULTIPLICITY (meta): Benjamini-Hochberg on the one-sided cluster-permutation p of the valid FULL cells (q = 0.05 and 0.10), count of rejected cells vs the confirmer's POS gate of 40% of valid cells;
//      and the exact binomial tail P(X >= #POS | n valid, p0) with p0 = empirical POS rate of the confirmer's shuffled and sham rows (>= 0.05 floor). ROBUST if BH(0.05) rejects >= 40% of valid cells.
//   B3 RE-DERIVED SCOPE ON A DIFFERENT SPLIT (halves): each treebank's whole train file is cut into blocks of 250 sentences, even blocks = half A, odd blocks = half B (<= 60000 word units each; K0 key, FULL and
//      CAUSAL4, <= 600 pairs, B=200). (a) Spearman rho between A and B cell AUCs over cells valid in both, permutation p (B=5000); (b) scope derived in A (cells POS in A) vs the rest: median AUC_B(POS_A) - median
//      AUC_B(non-POS_A), and the same B -> A; (c) the confirmer's exploratory SOV hypothesis (ja ko tr hi ur fa ta ka hy kk ug eu vs everything else) re-tested in A and in B: diff of lower medians + label-permutation p
//      (B=5000). NOT A LUCKY SUBSET if rho >= 0.40 (p < 0.01) AND both (b) differences >= 0.03 AND the SOV difference >= 0.05 in both halves.
//   B4 SPLIT MULTIPLICITY (halves): four declared binary typological splits (SOV, CASE-rich, ARTICLE, INDO-EUROPEAN, labelled in this file before any run); for each, |median diff| in A, in B and in the
//      confirmer's window cells; multiplicity-adjusted p = P(max over the 4 splits of |diff| under random permutation of the AUC vector over languages >= observed |diff| of the SOV split) (B=5000).
//   B5 CHAT BOOTSTRAP (irc): the 50 fresh en days pooled (K0, FULL, 600 pairs): (a) cluster bootstrap over DAYS (B=2000) of the matched-pair AUC; (b) leave-one-CHANNEL-out pools (kubuntu, ubuntu, ubuntu-server,
//      xubuntu) AUC; (c) 20 random 25/25 splits of the days. ROBUST if the day-bootstrap lower bound >= 0.80, every leave-one-channel-out AUC >= 0.80 and every random half >= 0.80.
//   B6 DESIGN SENSITIVITY (design): the discovery-chosen design knobs varied one at a time: per-form pair cap 1 and 10 (default 3), maximum pairs 300 and 1200 (600), form must have >= 5 mentions (3), class PO
//      (PROPN vs NOUN/VERB/ADJ) instead of PN; UD median of lower-median over valid cells (FULL) and the IRC pooled AUC. ROBUST if UD median >= 0.55 and IRC >= 0.80 in every variant.
// BLIND PREDICTIONS (probability my prior gives). B0 passes: 0.95. B1 FULL ROBUST: 0.55, MARGINAL 0.35; CAUSAL4 ROBUST: 0.15, FRAGILE: 0.45. B2 BH(0.05) >= 40%: 0.75. B3 rho >= 0.40: 0.70; (b) both >= 0.03: 0.65;
//   (c) SOV >= 0.05 in both halves: 0.65; the whole B3 NOT-LUCKY: 0.40. B4 SOV multiplicity-adjusted p < 0.05: 0.55. B5 ROBUST: 0.90. B6 ROBUST: 0.50.
// NOT TESTED. Anything fresh beyond the confirmer's tiers (no new text sources were opened); causal use below 5 mentions; non-UPOS gold definitions of names.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { PRE, MAN, ircFiles, ircLoad, prep, readConllu, occsOf, buildPairs, evalPairs, SPECS, UD_DEFS, IRC_DEFS, rngFor, seedFor, headerSha, sha256, round, mean, quantile, lowMed, trueMed, sign, validCell, shuffleIn, wr, featuresOf, log } from "./attack-lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), name = process.argv[2], HDR = headerSha(fileURLToPath(import.meta.url)), CONF = path.join(HERE, "..", "confirm-PM-R1-unit-initial-excess");
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
const RES = (f) => path.join(HERE, "results", f), rj = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
// ── declared labels (genealogy / typology from general knowledge; fixed before any run) ───────────────────────────────────────────────────
const FAM = { Germanic: "da de en is fo no sv nl af got", Romance: "ca es fr gl it pt ro la", Slavic: "be bg cs cu hr pl ru sk sl sr uk", Baltic: "lt lv", Celtic: "cy ga", Hellenic: "grc", IndoIranian: "hi ur sa fa", Armenian: "hy", Uralic: "et fi hu", Turkic: "tr kk ug", Kartvelian: "ka", Basque: "eu", Afroasiatic: "ar he mt cop", SinoTibetan: "zh lzh", Japonic: "ja", Koreanic: "ko", Austronesian: "id", Austroasiatic: "vi", Dravidian: "ta", NigerCongo: "wo" };
const famOf = (tb) => { const c = tb.split("_")[0]; return Object.entries(FAM).find(([, v]) => v.split(" ").includes(c))?.[0] ?? "other"; };
const SPLITS = {
  SOV: "ja ko tr hi ur fa ta ka hy kk ug eu",
  CASE: "ru uk be pl cs sk sl hr sr cu la grc got is fo lt lv et fi hu tr kk ug ka hy hi ur ta sa eu",
  ARTICLE: "en de nl da sv no is fo af fr es ca gl it pt ro bg ar he mt cy cop grc ga",
  INDOEUROPEAN: "af be bg ca cs cu cy da de en es fa fr ga gl got grc hi hr hy is it la lt lv nl no pl pt ro ru sa sk sl sr uk ur fo sv",
};
const ARTICLE_NO = "la cu cs sk sl hr sr pl ru uk be lt lv et fi hu tr kk ug ka ja ko zh lzh hi ur ta vi id wo fa sa got"; // ARTICLE split uses only labelled languages
const splitOf = (sp, lang) => { const s = SPLITS[sp].split(" "); if (sp === "ARTICLE") return s.includes(lang) ? 1 : ARTICLE_NO.split(" ").includes(lang) ? 0 : null; return s.includes(lang) ? 1 : 0; };
const lang = (tb) => tb.split("_")[0];
// ── statistics helpers ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ranks = (xs) => { const o = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; const rk = (i + j) / 2 + 1; for (let t = i; t <= j; t++) r[o[t][1]] = rk; i = j + 1; } return r; };
const pearson = (a, b) => { const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0; for (let k = 0; k < a.length; k++) { sab += (a[k] - ma) * (b[k] - mb); saa += (a[k] - ma) ** 2; sbb += (b[k] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
const spearman = (a, b) => pearson(ranks(a), ranks(b));
const binTail = (k, n, p) => { let lc = 0, s = 0; const lf = [0]; for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i); for (let x = k; x <= n; x++) s += Math.exp(lf[n] - lf[x] - lf[n - x] + x * Math.log(p) + (n - x) * Math.log(1 - p)); return s; };
const bhCount = (ps, q) => { const s = ps.slice().sort((a, b) => a - b), m = s.length; let k = 0; for (let i = 0; i < m; i++) if (s[i] <= (q * (i + 1)) / m) k = i + 1; return k; };
// ── META (B0, B1, B2): re-analysis of the confirmer's published rows ──────────────────────────────────────────────────────────────────
function meta() {
  const out = { hdr: HDR }, R = path.join(CONF, "results"), files = fs.readdirSync(R).filter((f) => /\.jsonl$/.test(f));
  const header = headerSha(path.join(CONF, "confirm.mjs")), reg = fs.readFileSync(path.join(R, "prereg-sha.txt"), "utf8"), hdrs = new Set(files.filter((f) => !f.startsWith("prospective")).flatMap((f) => rj(path.join(R, f)).map((r) => r.hdr)));
  const confM = fs.statSync(path.join(CONF, "confirm.mjs")).mtimeMs, births = files.map((f) => [f, fs.statSync(path.join(R, f)).birthtimeMs]);
  out.B0 = { headerShaNow: header, recorded: /header sha256 (\w+)/.exec(reg)?.[1], match: header === /header sha256 (\w+)/.exec(reg)?.[1], rowHdrs: [...hdrs], allRowsMatch: hdrs.size === 1 && hdrs.has(header), manifestShaMatches: sha256(fs.readFileSync(path.join(CONF, "data", "manifest.json"), "utf8")) === "0d45c42c643ef58ce4b5764add3a928d53ea54ee93b11104800b21124c247c4d", confirmMtime: new Date(confM).toISOString(), resultBirths: Object.fromEntries(births.map(([f, t]) => [f, new Date(t).toISOString()])), confirmPrecedesAllResults: births.filter(([f]) => !f.startsWith("prospective")).every(([, t]) => t > confM) };
  const ud = rj(path.join(R, "ud.jsonl")).filter((r) => r.feats && r.def === "PN" && r.ctl === "real"), cellsOf = (mode) => ud.filter((r) => r.mode === mode && r.pairs >= 60 && r.posControlOk).map((r) => ({ tb: r.reg.replace(/^ud-/, ""), auc: r.feats.pInitX.auc, lo: r.feats.pInitX.lo, p: r.feats.pInitX.p }));
  out.B1 = {};
  for (const mode of ["FULL", "CAUSAL4"]) {
    const cells = cellsOf(mode), fams = [...new Set(cells.map((c) => famOf(c.tb)))], byF = Object.fromEntries(fams.map((f) => [f, cells.filter((c) => famOf(c.tb) === f).map((c) => c.auc)])), rnd = rngFor(seedFor(PRE, "B1", mode)), meds = [];
    for (let b = 0; b < 4000; b++) { const xs = []; for (let t = 0; t < fams.length; t++) xs.push(...byF[fams[Math.floor(rnd() * fams.length)]]); meds.push(lowMed(xs)); }
    const cb = rngFor(seedFor(PRE, "B1cell", mode)), cm = []; for (let b = 0; b < 4000; b++) { const xs = []; for (let t = 0; t < cells.length; t++) xs.push(cells[Math.floor(cb() * cells.length)].auc); cm.push(lowMed(xs)); }
    const lofo = fams.map((f) => [f, lowMed(cells.filter((c) => famOf(c.tb) !== f).map((c) => c.auc))]);
    const pge = round(mean(meds.map((m) => (m >= 0.55 ? 1 : 0)))), v = pge >= 0.95 ? "ROBUST" : pge >= 0.8 ? "MARGINAL" : "FRAGILE";
    out.B1[mode] = { nCells: cells.length, nFamilies: fams.length, medLower: lowMed(cells.map((c) => c.auc)), famBootCI: [round(quantile(meds, 0.025)), round(quantile(meds, 0.975))], pMedianGE055_family: pge, cellBootCI: [round(quantile(cm, 0.025)), round(quantile(cm, 0.975))], pMedianGE055_cell: round(mean(cm.map((m) => (m >= 0.55 ? 1 : 0)))), lofoMin: lofo.reduce((a, b) => (b[1] < a[1] ? b : a)), lofoMax: lofo.reduce((a, b) => (b[1] > a[1] ? b : a)), verdict: v, familySizes: Object.fromEntries(fams.map((f) => [f, byF[f].length])) };
  }
  const full = cellsOf("FULL"), nPos = full.filter((c) => c.lo > 0.5 && c.auc >= 0.53).length, nullRows = rj(path.join(R, "ud.jsonl")).filter((r) => r.feats && r.def === "PN" && (r.ctl === "shuf" || r.ctl === "sham") && r.pairs >= 60), nullPos = nullRows.filter((r) => r.feats.pInitX.lo > 0.5 && r.feats.pInitX.auc >= 0.53).length, p0 = Math.max(0.05, nullPos / nullRows.length);
  const ps = full.map((c) => c.p);
  out.B2 = { nValid: full.length, nPOS: nPos, bh05: bhCount(ps, 0.05), bh10: bhCount(ps, 0.1), bhShare05: round(bhCount(ps, 0.05) / full.length), pMin: Math.min(...ps), nullRows: nullRows.length, nullPOS: nullPos, p0, binomialTail: binTail(nPos, full.length, p0), verdict: bhCount(ps, 0.05) / full.length >= 0.4 ? "ROBUST" : "NOT-ROBUST" };
  fs.writeFileSync(RES("B-meta.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
}
if (name === "meta") meta();
// ── HALVES (B3, B4 data): interleaved halves of each treebank's whole train file ──────────────────────────────────────────────────────────
function halves() {
  const OUT = RES("B-halves.jsonl"); fs.writeFileSync(OUT, "");
  for (const [tb, file] of Object.entries(MAN.ud.files)) {
    const r = readConllu(file), H = { A: { s: [], u: [], tok: 0 }, B: { s: [], u: [], tok: 0 } };
    r.sents.forEach((s, i) => { const h = H[Math.floor(i / 250) % 2 === 0 ? "A" : "B"]; if (h.tok >= 60000) return; h.s.push(s); h.u.push(r.upos[i]); h.tok += s.length; });
    for (const hk of ["A", "B"]) { const h = H[hk], P = prep(h.s); for (const mode of ["FULL", "CAUSAL4"]) { const oc = occsOf(P, h.u, UD_DEFS.PN, mode, null, `${tb}-${hk}`), { pairs } = buildPairs(P, oc, SPECS.K0, rngFor(seedFor(PRE, "B3", tb, hk, mode)), { maxPairs: 600, mode }); fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, tb, half: hk, mode, nTok: h.tok, ...evalPairs(P, pairs, mode, `${tb}${hk}`, { B: 200, Bperm: 0, name: `${tb}-${hk}` }) }) + "\n"); } }
    log(`halves ${tb}`);
  }
}
// ── IRC (B5) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function clusterBoot(wins, cl, Bn, rnd) { const cid = new Map(); cl.forEach((c, k) => { let a = cid.get(c); if (!a) cid.set(c, (a = [0, 0])); a[0] += wins[k]; a[1]++; }); const cs = [...cid.values()], bs = []; for (let b = 0; b < Bn; b++) { let s = 0, m = 0; for (let t = 0; t < cs.length; t++) { const c = cs[Math.floor(rnd() * cs.length)]; s += c[0]; m += c[1]; } bs.push(s / m); } return { auc: round(mean(wins)), lo: round(quantile(bs, 0.025)), hi: round(quantile(bs, 0.975)), nClusters: cs.length }; }
function pooled(ids, tag) { const b = ircLoad(tag, ircFiles(ids)), oc = occsOf(b.P, b.gold, IRC_DEFS.NK, "FULL", null, tag), { pairs } = buildPairs(b.P, oc, SPECS.K0, rngFor(seedFor(PRE, "B5", tag)), { maxPairs: 600 }); return { b, pairs }; }
function irc() {
  const ids = MAN.irc.freshEnAll.map((x) => x.id), out = { hdr: HDR }, { b, pairs } = pooled(ids, "irc-en-fresh");
  const wins = pairs.map(([p, q]) => wr(featuresOf(b.P, p.s, p.i, "FULL").pInitX, featuresOf(b.P, q.s, q.i, "FULL").pInitX)), rnd = rngFor(seedFor(PRE, "B5boot"));
  out.byDay = clusterBoot(wins, pairs.map(([p]) => b.day[p.s]), 2000, rnd); out.byForm = clusterBoot(wins, pairs.map(([p]) => p.w), 2000, rnd); out.nPairs = pairs.length; log("day bootstrap");
  out.loco = {}; for (const ch of ["kubuntu", "ubuntu", "ubuntu-server", "xubuntu"]) { const keepIds = ids.filter((id) => id.split("/")[0] !== ch), r = pooled(keepIds, "loco-" + ch); out.loco[ch] = { nDays: keepIds.length, ...evalPairs(r.b.P, r.pairs, "FULL", "loco" + ch, { B: 400, Bperm: 0, name: "loco-" + ch }) }; log("loco " + ch); }
  out.halves = []; const rr = rngFor(seedFor(PRE, "B5halves")); for (let t = 0; t < 20; t++) { const sh = shuffleIn(ids.slice(), rr), a = sh.slice(0, 25); const r = pooled(a, "half" + t); out.halves.push(evalPairs(r.b.P, r.pairs, "FULL", "half" + t, { B: 0, Bperm: 0, name: "half" + t }).auc); }
  out.halfRange = [Math.min(...out.halves), Math.max(...out.halves)];
  out.verdict = out.byDay.lo >= 0.8 && Object.values(out.loco).every((x) => x.auc >= 0.8) && out.halfRange[0] >= 0.8 ? "ROBUST" : "NOT-ROBUST";
  fs.writeFileSync(RES("B-irc.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
}
// ── DESIGN SENSITIVITY (B6) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const DESIGNS = { default: {}, cap1: { cap: 1 }, cap10: { cap: 10 }, max300: { maxPairs: 300 }, max1200: { maxPairs: 1200 }, min5: { minN: 5 }, classPO: { def: "PO" } };
function design() {
  const OUT = RES("B-design.jsonl"); fs.writeFileSync(OUT, ""); const run = (b, dsg, tag, def0) => { const o = DESIGNS[dsg], def = o.def ? UD_DEFS[o.def] : def0; let oc = occsOf(b.P, b.gold, def, "FULL", null, b.name); if (o.minN) oc = oc.filter((x) => x.n >= o.minN); const { pairs } = buildPairs(b.P, oc, SPECS.K0, rngFor(seedFor(PRE, "B6", tag, dsg)), { maxPairs: o.maxPairs ?? 600, cap: o.cap ?? 3 }); return evalPairs(b.P, pairs, "FULL", tag + dsg, { B: 200, Bperm: 0, name: b.name }); };
  for (const tb of Object.keys(MAN.ud.files)) { const b = udWindowB(tb); for (const d of Object.keys(DESIGNS)) fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, reg: tb, design: d, ...run(b, d, tb, UD_DEFS.PN) }) + "\n"); log(`design ${tb}`); }
  const ib = ircLoad("irc-en-fresh", ircFiles(MAN.irc.freshEnAll.map((x) => x.id))); for (const d of Object.keys(DESIGNS)) if (d !== "classPO") fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, reg: "irc-en-fresh", design: d, ...run(ib, d, "irc", IRC_DEFS.NK) }) + "\n");
}
import { udWindow as udWindowB } from "./attack-lib.mjs";
if (name === "halves") halves(); else if (name === "irc") irc(); else if (name === "design") design();
// ── SUMMARY (mechanical implementation of the verdict rules of the header) ────────────────────────────────────────────────────────────────
function permP(vals, isG1, stat, Bn, rnd) { const obs = stat(vals, isG1); let ge = 0; for (let b = 0; b < Bn; b++) { const sh = shuffleIn(vals.slice(), rnd); if (stat(sh, isG1) >= obs - 1e-12) ge++; } return { obs: round(obs), p: round((ge + 1) / (Bn + 1)) }; }
const diffStat = (v, g) => lowMed(v.filter((_, k) => g[k] === 1)) - lowMed(v.filter((_, k) => g[k] === 0));
function summary() {
  const T = [], out = { hdr: HDR }, say = (s) => T.push(s), f3 = (x) => (x === null || x === undefined || Number.isNaN(x) ? "  -  " : Number(x).toFixed(3));
  const meta0 = JSON.parse(fs.readFileSync(RES("B-meta.json"), "utf8")); out.B0 = meta0.B0; out.B1 = meta0.B1; out.B2 = meta0.B2;
  say(`B0 header sha match ${meta0.B0.match}, all rows ${meta0.B0.allRowsMatch}, manifest ${meta0.B0.manifestShaMatches}, confirm.mjs precedes every result file ${meta0.B0.confirmPrecedesAllResults}`);
  for (const m of ["FULL", "CAUSAL4"]) { const o = meta0.B1[m]; say(`B1 ${m}: ${o.nCells} cells, ${o.nFamilies} families, lower-median ${f3(o.medLower)}; family-bootstrap 95% [${f3(o.famBootCI[0])},${f3(o.famBootCI[1])}] P(median>=0.55)=${f3(o.pMedianGE055_family)} -> ${o.verdict}; cell-bootstrap [${f3(o.cellBootCI[0])},${f3(o.cellBootCI[1])}] P=${f3(o.pMedianGE055_cell)}; leave-one-family-out ${o.lofoMin[0]} ${f3(o.lofoMin[1])} .. ${o.lofoMax[0]} ${f3(o.lofoMax[1])}`); }
  say(`B2: ${meta0.B2.nPOS}/${meta0.B2.nValid} POS; BH q=0.05 rejects ${meta0.B2.bh05} (${f3(meta0.B2.bhShare05)}), q=0.10 ${meta0.B2.bh10}; null POS rate in shuffled+sham rows ${meta0.B2.nullPOS}/${meta0.B2.nullRows} (p0 ${meta0.B2.p0}); binomial tail ${meta0.B2.binomialTail.toExponential(2)} -> ${meta0.B2.verdict}`);
  // B3 / B4
  const H = fs.existsSync(RES("B-halves.jsonl")) ? rj(RES("B-halves.jsonl")) : [], W = rj(path.join(CONF, "results", "ud.jsonl")).filter((r) => r.feats && r.def === "PN" && r.ctl === "real" && r.mode === "FULL").map((r) => ({ tb: r.reg.replace(/^ud-/, ""), auc: r.feats.pInitX.auc, lo: r.feats.pInitX.lo, pairs: r.pairs, posCtl: r.posControlOk ? 0.5 : 0 }));
  out.B3 = {}; out.B4 = {};
  for (const mode of ["FULL", "CAUSAL4"]) {
    const get = (hk) => new Map(H.filter((x) => x.half === hk && x.mode === mode && validCell(x)).map((x) => [x.tb, x])), A = get("A"), Bm = get("B"), both = [...A.keys()].filter((t) => Bm.has(t));
    const a = both.map((t) => A.get(t).auc), bb = both.map((t) => Bm.get(t).auc), rho = spearman(a, bb), rnd = rngFor(seedFor(PRE, "B3perm", mode)); let ge = 0; for (let i = 0; i < 5000; i++) if (spearman(a, shuffleIn(bb.slice(), rnd)) >= rho - 1e-12) ge++;
    const scope = (X, Y) => { const pos = [...X.keys()].filter((t) => Y.has(t) && sign(X.get(t)) === "POS"), non = [...X.keys()].filter((t) => Y.has(t) && sign(X.get(t)) !== "POS"); return { nPOS: pos.length, nNon: non.length, medYofPOS: lowMed(pos.map((t) => Y.get(t).auc)), medYofNon: lowMed(non.map((t) => Y.get(t).auc)), diff: round(lowMed(pos.map((t) => Y.get(t).auc)) - lowMed(non.map((t) => Y.get(t).auc))), posRateInYofPOS: round(mean(pos.map((t) => (sign(Y.get(t)) === "POS" ? 1 : 0)))), posRateInYofNon: round(mean(non.map((t) => (sign(Y.get(t)) === "POS" ? 1 : 0)))) }; };
    const sov = (M) => { const ts = [...M.keys()], v = ts.map((t) => M.get(t).auc), g = ts.map((t) => splitOf("SOV", lang(t))); const r = permP(v, g, diffStat, 5000, rngFor(seedFor(PRE, "B3sov", mode, ts.length))); return { n: ts.length, nSOV: g.filter((x) => x === 1).length, diff: r.obs, p: r.p, medSOV: lowMed(v.filter((_, k) => g[k] === 1)), medRest: lowMed(v.filter((_, k) => g[k] === 0)) }; };
    out.B3[mode] = { nA: A.size, nB: Bm.size, nBoth: both.length, rho: round(rho), rhoP: round((ge + 1) / 5001), scopeAtoB: scope(A, Bm), scopeBtoA: scope(Bm, A), sovA: sov(A), sovB: sov(Bm), medA: lowMed([...A.values()].map((x) => x.auc)), medB: lowMed([...Bm.values()].map((x) => x.auc)) };
    const o = out.B3[mode]; o.notLucky = o.rho >= 0.4 && o.rhoP < 0.01 && o.scopeAtoB.diff >= 0.03 && o.scopeBtoA.diff >= 0.03 && o.sovA.diff >= 0.05 && o.sovB.diff >= 0.05;
    say(`B3 ${mode}: halves valid A ${o.nA} B ${o.nB} both ${o.nBoth}; medians A ${f3(o.medA)} B ${f3(o.medB)}; Spearman rho ${f3(o.rho)} (perm p ${o.rhoP}); scope A->B: POS_A n=${o.scopeAtoB.nPOS} median AUC_B ${f3(o.scopeAtoB.medYofPOS)} vs rest n=${o.scopeAtoB.nNon} ${f3(o.scopeAtoB.medYofNon)} (diff ${f3(o.scopeAtoB.diff)}; POS-rate in B ${f3(o.scopeAtoB.posRateInYofPOS)} vs ${f3(o.scopeAtoB.posRateInYofNon)}); B->A diff ${f3(o.scopeBtoA.diff)}; SOV in A: n ${o.sovA.n}/${o.sovA.nSOV} diff ${f3(o.sovA.diff)} p ${o.sovA.p} (SOV ${f3(o.sovA.medSOV)} vs rest ${f3(o.sovA.medRest)}); SOV in B diff ${f3(o.sovB.diff)} p ${o.sovB.p} (${f3(o.sovB.medSOV)} vs ${f3(o.sovB.medRest)}); NOT-A-LUCKY-SUBSET ${o.notLucky}`);
    // B4 (FULL only is the headline; run both)
    const sets = { A, B: Bm, window: new Map(W.filter((x) => x.pairs >= 60 && x.posCtl === 0.5).map((x) => [x.tb, x])) };
    out.B4[mode] = {}; if (mode === "FULL") for (const [sn, M] of Object.entries(sets)) {
      const ts = [...M.keys()], v = ts.map((t) => M.get(t).auc), diffs = {}; for (const sp of Object.keys(SPLITS)) { const g = ts.map((t) => splitOf(sp, lang(t))), idx = g.map((x, k) => (x === null ? -1 : k)).filter((k) => k >= 0); diffs[sp] = round(diffStat(idx.map((k) => v[k]), idx.map((k) => g[k]))); }
      const rnd = rngFor(seedFor(PRE, "B4", sn)); let ge = 0; const obs = Math.abs(diffs.SOV), Bn = 3000;
      for (let b = 0; b < Bn; b++) { const sh = shuffleIn(v.slice(), rnd); let mx = 0; for (const sp of Object.keys(SPLITS)) { const g = ts.map((t) => splitOf(sp, lang(t))), idx = g.map((x, k) => (x === null ? -1 : k)).filter((k) => k >= 0), d = Math.abs(diffStat(idx.map((k) => sh[k]), idx.map((k) => g[k]))); if (d > mx) mx = d; } if (mx >= obs - 1e-12) ge++; }
      out.B4[mode][sn] = { n: ts.length, diffs, maxAdjustedP_forSOV: round((ge + 1) / (Bn + 1)) }; say(`B4 ${sn}: n ${ts.length} signed median diffs ${JSON.stringify(diffs)}; P(max |diff| over 4 splits >= |SOV diff|) = ${out.B4[mode][sn].maxAdjustedP_forSOV}`);
    }
  }
  // B5
  if (fs.existsSync(RES("B-irc.json"))) { const o = JSON.parse(fs.readFileSync(RES("B-irc.json"), "utf8")); out.B5 = o; say(`B5 IRC fresh 50 days: pairs ${o.nPairs}, AUC by-day bootstrap ${f3(o.byDay.auc)} [${f3(o.byDay.lo)},${f3(o.byDay.hi)}] (${o.byDay.nClusters} days), by-form [${f3(o.byForm.lo)},${f3(o.byForm.hi)}]; leave-one-channel-out ${Object.entries(o.loco).map(([k, v]) => `${k} ${f3(v.auc)}(${v.nDays}d,${v.pairs}p)`).join(" ")}; 20 random half-splits ${f3(o.halfRange[0])}..${f3(o.halfRange[1])} -> ${o.verdict}`); }
  // B6
  if (fs.existsSync(RES("B-design.jsonl"))) { const D = rj(RES("B-design.jsonl")); out.B6 = {}; for (const d of Object.keys(DESIGNS)) { const c = D.filter((x) => x.design === d && x.reg !== "irc-en-fresh" && validCell(x)), i = D.find((x) => x.design === d && x.reg === "irc-en-fresh"); out.B6[d] = { udValid: c.length, udMedLower: lowMed(c.map((x) => x.auc)), udPOS: c.filter((x) => sign(x) === "POS").length, ircAuc: i?.auc ?? null }; say(`B6 ${d.padEnd(8)} UD valid ${c.length} medLower ${f3(out.B6[d].udMedLower)} POS ${out.B6[d].udPOS}; IRC pooled ${f3(out.B6[d].ircAuc)}`); } out.B6verdict = Object.entries(out.B6).every(([d, o]) => o.udMedLower >= 0.55 && (o.ircAuc === null || o.ircAuc >= 0.8)) ? "ROBUST" : "NOT-ROBUST"; say(`B6 verdict ${out.B6verdict}`); }
  fs.writeFileSync(RES("B-summary.json"), JSON.stringify(out, null, 1)); fs.writeFileSync(RES("B-summary.txt"), T.join("\n") + "\n"); console.log(T.join("\n"));
}
if (name === "summary") summary();
