// eval/kinds-swarm/ant-shape/analyse.mjs — the pre-registered analyses L1-L4 (+ descriptive extras) over the collected records. Offline, deterministic, incremental
// (every unit writes its own JSON under results/, so a kill loses nothing). See PREREG.md for every threshold; none is changed here.
//   node analyse.mjs l1 [--B 200] [--stems a,b]      own-language CV, all arms, FULL permutation null, form-block check, per-class AUC, univariate AUCs
//   node analyse.mjs l4                              the same on the within-sentence-shuffled records (UD + IRC)
//   node analyse.mjs l2 [--scheme 2|3] [--z] [--draws 20]   family transfer, equalised
//   node analyse.mjs l3                              cross-register transfer UD<->IRC
//   node analyse.mjs l2b                             model-free shape-vector similarity, same vs other family
import fs from "node:fs";
import path from "node:path";
import { fitLogit, predict } from "../../law/name-war-and-peace.mjs";
import { ARMS, F, STEMS25, TWIN, DATA, RES, aucOf, buildFolds, foldScores, permNull, permuteWithin, transferScores, capRows, featAuc, pearson, signTestOneSided, bootMean, families, loadLang, loadIrcRows, isInformative, round, mean, sd, quantile, rngFor, seedFor } from "./cvlib.mjs";

const args = process.argv.slice(2), cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const B_PERM = Number(opt("--B", 200)), DRAWS = Number(opt("--draws", 20)), CAP = 60;
const STEMS = opt("--stems", null)?.split(",") ?? STEMS25;
fs.mkdirSync(RES, { recursive: true });
const cached = (file, fn) => { const p = path.join(RES, file); if (fs.existsSync(p) && !args.includes("--force")) return JSON.parse(fs.readFileSync(p, "utf8")); const r = fn(); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(r)); return r; };
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);
const REAL = () => STEMS.map((s) => loadLang(s, "ud")).filter(isInformative);

// ── per-language own CV ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ownCv(L, { perm = false, withExtras = false } = {}) {
  const rows = L.rows, y = rows.map((r) => r.y), n = rows.length, pos = rows.map((r) => r.posBlock), out = { stem: L.stem, n, nPos: y.filter((v) => v === 1).length, M: L.M, N: L.N, auc: {} };
  let foldsFull = null, scoresFull = null;
  for (const [name, parts] of Object.entries(ARMS)) {
    const folds = buildFolds(rows, parts, pos);
    const sc = foldScores(folds, y, n);
    out.auc[name] = round(aucOf(sc, y));
    if (name === "FULL") { foldsFull = folds; scoresFull = sc; }
  }
  if (perm) { const nulls = permNull(foldsFull, y, pos, B_PERM, seedFor("ant-shape", "perm", L.stem)); out.permFull = nulls.map((x) => round(x, 4)); out.permFullQ95 = round(quantile(nulls, 0.95)); }
  if (withExtras) {
    // A2 identity-leakage check: blocks by hash of the form
    const fb = rows.map((r) => r.formBlock);
    out.aucFullFormBlock = round(aucOf(foldScores(buildFolds(rows, ARMS.FULL, fb), y, n), y));
    // A6 per negative class
    const cls = {};
    for (const c of ["NOUN", "VERB", "ADJ"]) { const idx = rows.map((r, k) => k).filter((k) => y[k] === 1 || rows[k].upos === c); const nn = idx.filter((k) => y[k] === 0).length; cls[c] = nn >= 15 ? { n: nn, auc: round(aucOf(scoresFull, y, idx)) } : { n: nn, auc: null }; }
    out.perClass = cls;
    // A7 univariate AUC of the 144 FULL features (all rows) + the other arms' means for context
    const X = rows.map(F.FULL); out.uniAuc = X[0].map((_, j) => round(featAuc(X.map((r) => r[j]), y), 4));
    out.rivalUniAuc = rows[0].rivals.map((_, j) => round(featAuc(rows.map((r) => r.rivals[j]), y), 4));
    out.nullShare = { pos: round(mean(rows.filter((r) => r.y === 1).map((r) => (r.isNull ? 1 : 0)))), neg: round(mean(rows.filter((r) => r.y === 0).map((r) => (r.isNull ? 1 : 0)))) };
    out.scores = scoresFull.map((v) => (v == null ? null : round(v, 4)));
    out.ids = rows.map((r) => [r.s, r.i, r.id, r.y, r.upos]);
  }
  return out;
}

if (cmd === "l1") {
  for (const stem of STEMS) {
    const L = loadLang(stem, "ud"); if (!L) continue;
    if (!isInformative(L)) { cached(`l1/${stem}.json`, () => ({ stem, gap: "not_informative", pos: L.rows.filter((r) => r.y === 1).length })); log(stem, "not informative"); continue; }
    const r = cached(`l1/${stem}.json`, () => ownCv({ ...L, stem }, { perm: true, withExtras: true }));
    log(stem, "FULL", r.auc.FULL, "RIV", r.auc.RIVALS, "POS", r.auc.POSITION);
  }
} else if (cmd === "l4") {
  for (const stem of STEMS) {
    const L = loadLang(stem, "ud-shuffled"); const R = loadLang(stem, "ud"); if (!L || !R || !isInformative(R)) continue;
    const r = cached(`l4/${stem}.json`, () => ownCv({ ...L, stem }, { perm: false, withExtras: false }));
    log(stem, "shuffled FULL", r.auc.FULL, "RIV", r.auc.RIVALS);
  }
  for (const [tag, file] of [["irc-real", "irc.json"], ["irc-shuffled", "irc-shuffled.json"]]) {
    const I = loadIrcRows(file); if (!I) continue;
    cached(`l4/${tag}.json`, () => {
      const rows = I.rows, y = rows.map((r) => r.y), blocks = rows.map((r) => r.doc), res = { tag, n: rows.length, auc: {} };
      let foldsFull = null;
      for (const [name, parts] of Object.entries(ARMS)) { const folds = buildFolds(rows, parts, blocks); res.auc[name] = round(aucOf(foldScores(folds, y, rows.length), y)); if (name === "FULL") foldsFull = folds; }
      const nulls = permNull(foldsFull, y, blocks, B_PERM, seedFor("ant-shape", "irc-perm", tag)); res.permFullQ95 = round(quantile(nulls, 0.95)); res.permFullMean = round(mean(nulls));
      return res;
    });
    log(tag, "done");
  }
} else if (cmd === "l2") {
  const scheme = opt("--scheme", "2"), z = args.includes("--z");
  const fam = families(), lab = scheme === "2" ? fam.two : fam.three;
  const Ls = REAL().map((L) => L), langs = Ls.map((L) => L.stem ?? L.rows[0].lang);
  const rowsOf = Object.fromEntries(Ls.map((L, k) => [langs[k], L.rows]));
  const capped = Object.fromEntries(langs.map((l) => [l, capRows(rowsOf[l], CAP, seedFor("ant-shape", "cap", l))]));
  const sample = (arr, k, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };
  for (const t of langs) {
    const tag = `l2/s${scheme}${z ? "z" : ""}-${t}.json`;
    const r = cached(tag, () => {
      const twin = TWIN[t], cands = langs.filter((l) => l !== t && l !== twin);
      const same = cands.filter((l) => lab[l] === lab[t]), other = cands.filter((l) => lab[l] !== lab[t]), k = Math.min(same.length, other.length);
      if (k < 1) return { stem: t, gap: "no_equalised_pool", same: same.length, other: other.length };
      const sampled = same.length > k || other.length > k, nd = sampled ? DRAWS : 1, rnd = rngFor(seedFor("ant-shape", "l2", scheme, z, t));
      const y = rowsOf[t].map((x) => x.y), aS = [], aO = [];
      for (let d = 0; d < nd; d++) {
        const sS = same.length > k ? sample(same, k, rnd) : same, sO = other.length > k ? sample(other, k, rnd) : other;
        aS.push(aucOf(transferScores(sS.flatMap((l) => capped[l]), rowsOf[t], [F.FULL], { z }), y));
        aO.push(aucOf(transferScores(sO.flatMap((l) => capped[l]), rowsOf[t], [F.FULL], { z }), y));
      }
      const aAll = aucOf(transferScores(cands.flatMap((l) => capped[l]), rowsOf[t], [F.FULL], { z }), y);
      return { stem: t, family: lab[t], k, nSame: same.length, nOther: other.length, draws: nd, same: round(mean(aS)), other: round(mean(aO)), all: round(aAll), sameSd: round(sd(aS)), otherSd: round(sd(aO)) };
    });
    log(scheme, z ? "z" : "", t, r.gap ?? `same ${r.same} other ${r.other} all ${r.all} k=${r.k}`);
  }
} else if (cmd === "l3") {
  const eng = loadLang("eng", "ud"), irc = loadIrcRows("irc.json");
  if (!eng || !irc) { console.error("need eng and irc"); process.exit(1); }
  const fam = families(), Ls = REAL(), langs = Ls.map((L) => L.rows[0].lang), rowsOf = Object.fromEntries(Ls.map((L) => [L.rows[0].lang, L.rows]));
  const capped = Object.fromEntries(langs.map((l) => [l, capRows(rowsOf[l], CAP, seedFor("ant-shape", "cap", l))]));
  const res = cached("l3.json", () => {
    const out = {}, yI = irc.rows.map((r) => r.y), yE = eng.rows.map((r) => r.y), rnd = rngFor(seedFor("ant-shape", "l3"));
    const nullQ = (scores, y) => { const a = []; for (let b = 0; b < B_PERM; b++) { const yp = y.slice(); for (let i = yp.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [yp[i], yp[j]] = [yp[j], yp[i]]; } a.push(aucOf(scores, yp)); } return round(quantile(a, 0.95)); };
    const T = (name, train, test, y, parts = [F.FULL], z = false) => { const sc = transferScores(train, test, parts, { z }); const a = aucOf(sc, y); out[name] = { auc: round(a), q95: nullQ(sc, y), nTrain: train.length, nTest: test.length }; log(name, out[name].auc, out[name].q95); };
    for (const z of [false, true]) {
      const zt = z ? "Z " : "";
      T(`${zt}a UD-eng -> IRC`, eng.rows, irc.rows, yI, [F.FULL], z);
      T(`${zt}b all-UD -> IRC`, langs.flatMap((l) => capped[l]), irc.rows, yI, [F.FULL], z);
      T(`${zt}d IRC -> UD-eng`, irc.rows, eng.rows, yE, [F.FULL], z);
      T(`${zt}e all-UD-but-eng -> IRC`, langs.filter((l) => l !== "eng").flatMap((l) => capped[l]), irc.rows, yI, [F.FULL], z);
    }
    for (const arm of ["RIVALS", "MAGNITUDE", "SHAPE24", "SLOT", "ATM", "SPAN", "C"]) { T(`arm ${arm}: UD-eng -> IRC`, eng.rows, irc.rows, yI, ARMS[arm]); T(`arm ${arm}: IRC -> UD-eng`, irc.rows, eng.rows, yE, ARMS[arm]); }
    // c) IRC leave-one-channel-day-out, all arms, within-file permutation null for FULL
    const blocks = irc.rows.map((r) => r.doc); out["c IRC LOFO"] = { auc: {} };
    let fF = null;
    for (const [name, parts] of Object.entries(ARMS)) { const folds = buildFolds(irc.rows, parts, blocks); out["c IRC LOFO"].auc[name] = round(aucOf(foldScores(folds, yI, irc.rows.length), yI)); if (name === "FULL") fF = folds; }
    const nulls = permNull(fF, yI, blocks, B_PERM, seedFor("ant-shape", "l3-lofo")); out["c IRC LOFO"].q95 = round(quantile(nulls, 0.95)); out["c IRC LOFO"].nullMean = round(mean(nulls));
    log("c IRC LOFO", JSON.stringify(out["c IRC LOFO"]));
    // f) SOV-like vs SVO-like, equalised, excluding eng from both pools (English is the target language of the register)
    const sov = langs.filter((l) => fam.two[l] === "SOV"), svo = langs.filter((l) => fam.two[l] === "SVO" && l !== "eng" && l !== "cmn-hans" && l !== "cmn");
    const k = Math.min(sov.length, svo.length), aS = { irc: [], eng: [] }, aV = { irc: [], eng: [] };
    const sample = (arr, kk) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, kk); };
    for (let d = 0; d < DRAWS; d++) {
      const sV = sample(svo, k), sS = sov.length > k ? sample(sov, k) : sov;
      for (const [tag, test, y] of [["irc", irc.rows, yI], ["eng", eng.rows, yE]]) {
        aV[tag].push(aucOf(transferScores(sV.flatMap((l) => capped[l]), test, [F.FULL]), y));
        aS[tag].push(aucOf(transferScores(sS.flatMap((l) => capped[l]), test, [F.FULL]), y));
      }
    }
    out["f SVO-like(k) vs SOV-like(k) -> IRC / UD-eng"] = { k, sovLangs: sov, svoPool: svo, irc: { svo: round(mean(aV.irc)), sov: round(mean(aS.irc)) }, eng: { svo: round(mean(aV.eng)), sov: round(mean(aS.eng)) } };
    log("f", JSON.stringify(out["f SVO-like(k) vs SOV-like(k) -> IRC / UD-eng"]));
    return out;
  });
  console.log(JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.auc ?? v])), null, 1).slice(0, 4000));
} else if (cmd === "l2b") {
  const fam = families(), Ls = REAL(), st = Ls.map((L) => L.rows[0].lang);
  const v = {}; for (const l of st) { const r = JSON.parse(fs.readFileSync(path.join(RES, "l1", `${l}.json`), "utf8")); if (r.uniAuc) v[l] = r.uniAuc.map((a) => a - 0.5); }
  const langs = Object.keys(v), pairs = [];
  for (let a = 0; a < langs.length; a++) for (let b = a + 1; b < langs.length; b++) if (TWIN[langs[a]] !== langs[b]) pairs.push([langs[a], langs[b], pearson(v[langs[a]], v[langs[b]])]);
  const stat = (lab) => { const s = pairs.filter(([a, b]) => lab[a] === lab[b]).map((p) => p[2]), o = pairs.filter(([a, b]) => lab[a] !== lab[b]).map((p) => p[2]); return { same: mean(s), other: mean(o), diff: mean(s) - mean(o), nSame: s.length, nOther: o.length }; };
  const res = {};
  for (const [name, lab] of [["2-family", fam.two], ["3-cluster", fam.three]]) {
    const obs = stat(lab), rnd = rngFor(seedFor("ant-shape", "l2b", name)); let ge = 0; const Bn = 10000;
    for (let b = 0; b < Bn; b++) { const ls = langs.slice(); for (let i = ls.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ls[i], ls[j]] = [ls[j], ls[i]]; } const pl = {}; langs.forEach((l, k) => { pl[l] = lab[ls[k]]; }); if (stat(pl).diff >= obs.diff) ge += 1; }
    res[name] = { ...Object.fromEntries(Object.entries(obs).map(([k, x]) => [k, round(x)])), p: round((ge + 1) / (Bn + 1)) };
  }
  res.meanPairCorr = round(mean(pairs.map((p) => p[2])));
  fs.writeFileSync(path.join(RES, "l2b.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res));
} else if (cmd === "l5") {
  // L5 kinds (ant-kinds-ud's company-induced leaves per form; whole-stream company, so NOT causal; labelled as such). Does a kind label add to FULL, and does conditioning on kind help?
  const IND = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "ant-kinds-ud", "induced");
  const out = {};
  for (const stem of STEMS) {
    const f = path.join(IND, `${stem}.json`), L = loadLang(stem, "ud");
    if (!fs.existsSync(f) || !isInformative(L)) continue;
    const ind = JSON.parse(fs.readFileSync(f, "utf8")); if (!ind.forms) continue;
    const leafOf = new Map(ind.forms.map(([w, , top, leaf]) => [w, leaf]));
    const rows = L.rows, y = rows.map((r) => r.y), n = rows.length, pos = rows.map((r) => r.posBlock);
    const leaves = [...new Set(rows.map((r) => leafOf.get(r.id) ?? -1))].sort((a, b) => a - b);
    const kind = rows.map((r) => leafOf.get(r.id) ?? -1);
    const hot = (r, k) => leaves.map((lf) => (kind[k] === lf ? 1 : 0));
    rows.forEach((r, k) => { r.kindHot = hot(r, k); });
    const res = { stem, n, nLeaves: leaves.length, unknownShare: round(kind.filter((k) => k < 0).length / n), auc: {} };
    const A = (name, parts) => { const folds = buildFolds(rows, parts, pos); const sc = foldScores(folds, y, n); res.auc[name] = round(aucOf(sc, y)); return sc; };
    const scFull = A("FULL", ARMS.FULL); A("KIND", [(r) => r.kindHot]); A("FULL+KIND", [F.FULL, (r) => r.kindHot]); A("FULL+KIND+RIVALS", [F.FULL, (r) => r.kindHot, F.RIVALS]); A("RIVALS+KIND", [F.RIVALS, (r) => r.kindHot]);
    // conditioning: one FULL model per kind (>= 30 training rows with both classes >= 8), pooled model otherwise; scores are log-odds
    const folds = buildFolds(rows, ARMS.FULL, pos), cond = new Array(n).fill(null);
    for (const fd of folds) {
      const bk = new Map(); fd.tr.forEach((r, i) => (bk.get(kind[r]) ?? bk.set(kind[r], []).get(kind[r])).push(i));
      const pooledW = fitLogit(fd.A, fd.tr.map((r) => y[r]));
      const W = new Map();
      for (const [kk, ii] of bk) { const yy = ii.map((i) => y[fd.tr[i]]); if (ii.length >= 30 && yy.filter((v) => v === 1).length >= 8 && yy.filter((v) => v === 0).length >= 8) W.set(kk, fitLogit(ii.map((i) => fd.A[i]), yy)); }
      fd.te.forEach((r, i) => { cond[r] = predict(W.get(kind[r]) ?? pooledW, fd.B[i]); });
    }
    res.auc["FULL conditioned on kind"] = round(aucOf(cond, y));
    // Simpson check: per-kind out-of-fold FULL AUC and the share of PROPN rows
    res.perKind = leaves.map((lf) => { const idx = rows.map((r, k) => k).filter((k) => kind[k] === lf); const np = idx.filter((k) => y[k] === 1).length, nn = idx.length - np; return { leaf: lf, n: idx.length, propnShare: round(np / Math.max(1, idx.length)), aucFull: np >= 8 && nn >= 8 ? round(aucOf(scFull, y, idx)) : null }; });
    out[stem] = res; log("l5", stem, JSON.stringify(res.auc));
  }
  fs.writeFileSync(path.join(RES, "l5.json"), JSON.stringify(out, null, 1));
} else { console.error("commands: l1 | l2 [--scheme 2|3] [--z] | l3 | l4 | l2b | l5"); process.exit(2); }
