// induce.mjs — K1 / K1b of PREREG.md: induce kinds of word forms from COMPANY ONLY, derive K from half-split stability vs a shuffled-company null,
// then (IRC only) characterise AFTER the fact with the nickname gold. Usage: node induce.mjs --corpus irc|sms|cosem|enron   (run with nohup; progress in results/induce.<corpus>.log)
// Everything numeric that is typed is in PREREG.md section 2. No gold, no POS, no capital, no list enters the induction.
import fs from "node:fs";
import path from "node:path";
import * as L from "./lib.mjs";

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CORPUS = opt("--corpus", "irc");
const MINC = CORPUS === "irc" ? 30 : 10, F_MAX = 1000, D = 48, LADDER = [2, 3, 4, 6, 8, 12, 16, 24], MIN_HALF = 8, NULL_DRAWS = 4, SESOI = 0.10;
fs.mkdirSync(L.RESULTS, { recursive: true });
const LOG = path.join(L.RESULTS, `induce.${CORPUS}.log`);
const log = (...a) => { const s = `[${new Date().toISOString().slice(11, 19)}] ${a.join(" ")}\n`; fs.appendFileSync(LOG, s); };
fs.writeFileSync(LOG, "");

// ── corpora ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let dev, conf = null;       // arrays of {name, stream, ...}
if (CORPUS === "irc") {
  const days = L.ircDays();
  dev = days.filter((d) => d.split === "DEV").map(L.loadIrcDay);
  conf = days.filter((d) => d.split === "CONF").map(L.loadIrcDay);
} else if (CORPUS === "sms") dev = L.loadSmsDocs();
else if (CORPUS === "cosem") dev = L.loadCosemDocs();
else if (CORPUS === "enron") dev = L.loadEnronDocs();
else throw new Error("corpus");
const flat = (docs) => docs.map((d) => d.stream);
log("corpus", CORPUS, "dev docs", dev.length, "tokens", flat(dev).reduce((a, d) => a + d.reduce((b, m) => b + m.length, 0), 0), conf ? `conf docs ${conf.length}` : "");

// ── splits ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function halvings(n) {
  const even = [...Array(n).keys()].filter((i) => i % 2 === 0), odd = [...Array(n).keys()].filter((i) => i % 2 === 1);
  const rnd = L.rngFor(L.seedFor("kinds-chat", "halves", CORPUS)), p = [...Array(n).keys()];
  for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return [[even, odd], [p.slice(0, n >> 1).sort((a, b) => a - b), p.slice(n >> 1).sort((a, b) => a - b)]];
}
function vocabOf(counts, ...halves) {
  const v = new Map(); let i = 0;
  for (const [w, c] of [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) {
    if (c < MINC) continue;
    if (halves.length && halves.some((h) => (h.get(w) ?? 0) < MIN_HALF)) continue;
    v.set(w, i++);
  }
  return v;
}
/** the stability curve of one pool (array of docs, each an array of messages): ARI between two independently clustered halves, per K, per split */
function curve(poolDocs, tag) {
  const counts = L.countTypes(poolDocs), nTypesMin = [...counts.values()].filter((c) => c >= MINC).length;
  const fi = L.featureIndex(counts, Math.min(F_MAX, nTypesMin));
  const out = { V: [], perK: Object.fromEntries(LADDER.map((K) => [K, []])) };
  halvings(poolDocs.length).forEach(([ia, ib], s) => {
    const A = ia.map((i) => poolDocs[i]), B = ib.map((i) => poolDocs[i]);
    const ca = L.countTypes(A), cb = L.countTypes(B), vocab = vocabOf(counts, ca, cb);
    out.V.push(vocab.size);
    if (vocab.size < 60) return;
    const lab = [A, B].map((H, h) => {
      const rnd = L.rngFor(L.seedFor("kinds-chat", "curve", CORPUS, tag, s, h));
      const csr = L.companyCSR(H, vocab, fi), fb = L.fitBasis(csr, Math.min(D, vocab.size - 2), rnd), E = L.project(csr, fb);
      return LADDER.map((K) => L.kmeans(E, csr.V, fb.D, Math.min(K, vocab.size - 1), rnd, { restarts: 3, iters: 30 }).labels);
    });
    LADDER.forEach((K, k) => out.perK[K].push(L.ari(lab[0][k], lab[1][k])));
    log(`curve ${tag} split ${s} done V=${vocab.size}`);
  });
  return out;
}

const result = { module: "ant-kinds-chat/induce.mjs", corpus: CORPUS, preregSha256: L.preregSha(), MINC, F_MAX, D, LADDER, MIN_HALF, NULL_DRAWS, SESOI, devDocs: dev.length };
const devDocs = flat(dev);

// ── conformance of my integer-id company vectors against kind-standing.js contextVectors ────────────────────────────────────────────────
{
  const { contextVectors } = await import("../../../organs/kind-standing.js");
  const sub = devDocs[0].slice(0, 400), counts = L.countTypes([sub]), forms = [...counts].filter(([, c]) => c >= 3).map(([w]) => w).slice(0, 25);
  const ref = contextVectors(sub.map((m) => ({ text: m.join(" ") })), forms, { clean: (t) => t });
  const vocab = new Map(forms.map((w, i) => [w, i])), fi = L.featureIndex(counts, 100000), csr = L.companyCSR([sub], vocab, fi);
  let bad = 0, checked = 0;
  forms.forEach((w, r) => {
    const v = ref.get(w); if (!v) return;
    const mine = new Map(); for (let q = csr.ptr[r]; q < csr.ptr[r + 1]; q++) mine.set(fi.names[csr.idx[q] >> 1] + ((csr.idx[q] & 1) ? "$a" : "$b"), Math.round(csr.val[q] ** 2));
    for (const [f, n] of v) { checked++; const [kind, tok] = [f.split("=")[0], f.slice(f.indexOf("=") + 1)]; if (mine.get(tok + (kind === "after" ? "$a" : "$b")) !== n) bad++; }
  });
  result.conformance = { formsChecked: forms.length, featuresChecked: checked, mismatches: bad };
  log("conformance", JSON.stringify(result.conformance));
}

// ── K1: curves (real + shuffled-company null) ─────────────────────────────────────────────────────────────────────────────────────────────
const t0 = Date.now();
const real = curve(devDocs, "real");
const nulls = Array.from({ length: NULL_DRAWS }, (_, d) => curve(L.shuffleDocs(devDocs, L.seedFor("kinds-chat", "null", CORPUS, d)), `null${d}`));
const mn = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
result.curve = LADDER.map((K) => {
  const r = mn(real.perK[K]), nvals = nulls.map((n) => mn(n.perK[K])).filter((x) => x !== null);
  return { K, real: L.round(r), realBySplit: real.perK[K].map((x) => L.round(x)), nullMean: L.round(mn(nvals)), nullMax: L.round(Math.max(...nvals)), gap: L.round(r - Math.max(...nvals)) };
});
result.vocabHalves = real.V;
const best = result.curve.filter((c) => c.gap !== null && Number.isFinite(c.gap)).reduce((a, c) => (c.gap > a.gap + 1e-12 ? c : a));
result.Kstar = best.K; result.gapKstar = best.gap;
result.K1_curve_holds = result.curve.some((c) => c.gap >= SESOI);
log("curve done", ((Date.now() - t0) / 1000).toFixed(0), "s; K* =", best.K, "gap", best.gap);
fs.writeFileSync(path.join(L.RESULTS, `induce.${CORPUS}.json`), JSON.stringify(result, null, 1));

// ── final fit on the whole DEV pool at K*; relabel kinds by token mass (0 = the heaviest) ───────────────────────────────────────────────
const KS = Math.min(result.Kstar, 24);
const countsDev = L.countTypes(devDocs), nMin = [...countsDev.values()].filter((c) => c >= MINC).length, fi = L.featureIndex(countsDev, Math.min(F_MAX, nMin));
const vocab = vocabOf(countsDev), forms = [...vocab.keys()];
const csr = L.companyCSR(devDocs, vocab, fi), rndF = L.rngFor(L.seedFor("kinds-chat", "final", CORPUS));
const fb = L.fitBasis(csr, Math.min(D, vocab.size - 2), rndF), E = L.project(csr, fb);
const fit = L.kmeans(E, csr.V, fb.D, KS, rndF, { restarts: 8, iters: 40 });
const mass = new Array(KS).fill(0); forms.forEach((w, i) => { mass[fit.labels[i]] += countsDev.get(w); });
const order = [...Array(KS).keys()].sort((a, b) => mass[b] - mass[a]), remap = new Map(order.map((k, r) => [k, r]));
const devLabel = new Map(forms.map((w, i) => [w, remap.get(fit.labels[i])]));
const Cr = new Float64Array(KS * fb.D); order.forEach((k, r) => { for (let j = 0; j < fb.D; j++) Cr[r * fb.D + j] = fit.centroids[k * fb.D + j]; });
result.final = { V: vocab.size, K: KS, tokenShare: order.map((k) => L.round(mass[k] / mass.reduce((a, b) => a + b, 0))), types: order.map((k) => forms.filter((w) => fit.labels[vocab.get(w)] === k).length) };
fs.writeFileSync(path.join(L.RESULTS, `kindmap.${CORPUS}.dev.json`), JSON.stringify({ K: KS, minc: MINC, labels: Object.fromEntries(devLabel) }));
// frequency control
{
  const lab = forms.map((w) => devLabel.get(w)), ranked = forms.map((w, i) => [i, countsDev.get(w)]).sort((a, b) => b[1] - a[1]);
  const dec = new Array(forms.length), band = new Array(forms.length);
  ranked.forEach(([i], r) => { dec[i] = Math.floor((10 * r) / forms.length); band[i] = Math.floor((KS * r) / forms.length); });
  result.frequency = { NMI_decile: L.round(L.nmi(lab, dec)), ARI_bands: L.round(L.ari(lab, band)), NMI_bands: L.round(L.nmi(lab, band)) };
}
// kind signatures: the company features that carry each kind (KL contribution), named by the material's own tokens
{
  const P = csr.P, tot = new Float64Array(P), perK = Array.from({ length: KS }, () => new Float64Array(P));
  for (let i = 0; i < csr.V; i++) for (let q = csr.ptr[i]; q < csr.ptr[i + 1]; q++) { const c = csr.val[q] ** 2; tot[csr.idx[q]] += c; perK[devLabel.get(forms[i])][csr.idx[q]] += c; }
  const T = tot.reduce((a, b) => a + b, 0);
  result.signatures = perK.map((v) => { const n = v.reduce((a, b) => a + b, 0); return [...v].map((c, f) => [f, (c / n) * Math.log((c / n + 1e-12) / (tot[f] / T + 1e-12))]).filter(([f, s]) => v[f] > 0 && s > 0).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f]) => `${f & 1 ? "after" : "before"}=${fi.names[f >> 1]}`); });
}
fs.writeFileSync(path.join(L.RESULTS, `induce.${CORPUS}.json`), JSON.stringify(result, null, 1));
log("final fit done", JSON.stringify(result.final), JSON.stringify(result.frequency));

// ── IRC: held-out K1 (transfer, re-induction) ───────────────────────────────────────────────────────────────────────────────────────────
let confLabel = null;
if (CORPUS === "irc") {
  const confDocs = flat(conf), countsC = L.countTypes(confDocs), vocC = vocabOf(countsC), formsC = [...vocC.keys()];
  const assign = (docs, vocabX, tag) => { const c = L.companyCSR(docs, vocabX, fi), Ex = L.project(c, fb); const lab = L.assignTo(Ex, c.V, fb.D, Cr, KS); return lab; };
  const labC = assign(confDocs, vocC, "conf");
  confLabel = new Map(formsC.map((w, i) => [w, labC[i]]));
  fs.writeFileSync(path.join(L.RESULTS, `kindmap.${CORPUS}.conf.json`), JSON.stringify({ K: KS, minc: MINC, labels: Object.fromEntries(confLabel) }));
  const shared = formsC.filter((w) => devLabel.has(w));
  const a = shared.map((w) => devLabel.get(w)), b = shared.map((w) => confLabel.get(w));
  const nullT = Array.from({ length: NULL_DRAWS }, (_, d) => { const lab = assign(L.shuffleDocs(confDocs, L.seedFor("kinds-chat", "confnull", d)), vocC); return L.ari(a, shared.map((w) => lab[vocC.get(w)])); });
  // re-induction on CONF at K*
  const rndC = L.rngFor(L.seedFor("kinds-chat", "confreinduce")), cC = L.companyCSR(confDocs, vocC, fi), fbC = L.fitBasis(cC, Math.min(D, vocC.size - 2), rndC), EC = L.project(cC, fbC);
  const kmC = L.kmeans(EC, cC.V, fbC.D, KS, rndC, { restarts: 4, iters: 30 });
  const reTransfer = L.ari(Array.from(labC), Array.from(kmC.labels));
  const reNull = Array.from({ length: NULL_DRAWS }, (_, d) => {
    const sh = L.shuffleDocs(confDocs, L.seedFor("kinds-chat", "confnull2", d)), c2 = L.companyCSR(sh, vocC, fi), f2 = L.fitBasis(c2, Math.min(D, vocC.size - 2), rndC), E2 = L.project(c2, f2);
    return L.ari(Array.from(labC), Array.from(L.kmeans(E2, c2.V, f2.D, KS, rndC, { restarts: 2, iters: 25 }).labels));
  });
  result.heldOut = { confV: vocC.size, shared: shared.length, transferARI: L.round(L.ari(a, b)), transferNullARI: nullT.map((x) => L.round(x)), reinductionARI_vs_transfer: L.round(reTransfer), reinductionNull: reNull.map((x) => L.round(x)) };
  result.K1_heldout_holds = result.heldOut.transferARI - Math.max(...nullT) >= SESOI;
  log("held-out", JSON.stringify(result.heldOut));
}
result.K1_holds = result.gapKstar >= SESOI && (result.K1_heldout_holds ?? true) && result.frequency.NMI_decile <= 0.5;
fs.writeFileSync(path.join(L.RESULTS, `induce.${CORPUS}.json`), JSON.stringify(result, null, 1));

// ── K1b: characterisation (IRC: nick gold; others: samples only) + sample dump to be READ ──────────────────────────────────────────────
function characterise(docs, labelOf, tag) {
  const mass = new Array(KS + 1).fill(0), gmass = new Array(KS + 1).fill(0), occ = new Map(), gocc = new Map();
  for (const d of docs) d.stream.forEach((m, k) => m.forEach((w, i) => {
    const c = labelOf.has(w) ? labelOf.get(w) : KS; mass[c]++; occ.set(w, (occ.get(w) ?? 0) + 1);
    if (d.gold?.has(`${k}:${i}`)) { gmass[c]++; gocc.set(w, (gocc.get(w) ?? 0) + 1); }
  }));
  const T = mass.reduce((a, b) => a + b, 0), G = gmass.reduce((a, b) => a + b, 0);
  const nickTypes = new Set([...gocc].filter(([w, g]) => labelOf.has(w) && g / occ.get(w) >= 0.5).map(([w]) => w));
  const typesIn = Array.from({ length: KS }, (_, k) => [...labelOf].filter(([w, c]) => c === k && occ.has(w)).map(([w]) => w));
  const rows = typesIn.map((ws, k) => ({ kind: k, types: ws.length, tokenShare: L.round(mass[k] / T), goldShare: G ? L.round(gmass[k] / G) : null, enrichment: G && mass[k] ? L.round(gmass[k] / G / (mass[k] / T)) : null, nickTypes: ws.filter((w) => nickTypes.has(w)).length, purity: ws.length ? L.round(ws.filter((w) => nickTypes.has(w)).length / ws.length) : null }));
  const thin = { tokenShare: L.round(mass[KS] / T), goldShare: G ? L.round(gmass[KS] / G) : null };
  // nick types vs frequency-matched non-nick types: where do they land?
  let landing = null;
  if (G) {
    const cstar = rows.reduce((a, r) => (r.goldShare > a.goldShare ? r : a)).kind, rnd = L.rngFor(L.seedFor("kinds-chat", "landing", tag));
    const pool = [...labelOf].filter(([w]) => occ.has(w) && !nickTypes.has(w) && !gocc.has(w)).map(([w]) => w), byBin = new Map();
    for (const w of pool) { const b = L.log2bin(occ.get(w)); (byBin.get(b) ?? byBin.set(b, []).get(b)).push(w); }
    let hit = 0, hitN = 0, n = 0; const nd = new Array(KS).fill(0), md = new Array(KS).fill(0);
    for (const w of nickTypes) { const c = byBin.get(L.log2bin(occ.get(w))); if (!c?.length) continue; const m = c[Math.floor(rnd() * c.length)]; n++; nd[labelOf.get(w)]++; md[labelOf.get(m)]++; if (labelOf.get(w) === cstar) hit++; if (labelOf.get(m) === cstar) hitN++; }
    landing = { cstar, nickTypesMatched: n, nickTypesInCstar: L.round(hit / n), matchedNonNickInCstar: L.round(hitN / n), nickTypesByKind: nd, matchedByKind: md };
  }
  return { tag, rows, thin, goldTokens: G, landing, nickTypeCount: nickTypes.size, nickTypes, occ };
}
const sampleDump = (ch, labelOf, tag) => {
  const rnd = L.rngFor(L.seedFor("kinds-chat", "sample", CORPUS, tag)), lines = [`# ${CORPUS} ${tag}: K=${KS}; "*" marks a NICK TYPE (gold, used only to describe). signature = the company features that carry the kind.\n`];
  for (let k = 0; k < KS; k++) {
    const ws = [...labelOf].filter(([w, c]) => c === k && ch.occ.has(w)).map(([w]) => w).sort((a, b) => ch.occ.get(b) - ch.occ.get(a)), mark = (w) => (ch.nickTypes.has(w) ? w + "*" : w);
    const rest = ws.slice(40), rs = []; for (let i = 0; i < Math.min(40, rest.length); i++) rs.push(rest.splice(Math.floor(rnd() * rest.length), 1)[0]);
    lines.push(`## kind ${k}  types ${ws.length}  tokenShare ${ch.rows[k].tokenShare}  goldShare ${ch.rows[k].goldShare}  nickTypes ${ch.rows[k].nickTypes}  signature: ${result.signatures[k]?.join(", ")}\ntop: ${ws.slice(0, 40).map(mark).join(" ")}\nrandom: ${rs.map(mark).join(" ")}\n`);
  }
  fs.writeFileSync(path.join(L.RESULTS, `kinds.${CORPUS}.${tag}.txt`), lines.join("\n"));
};
const chDev = characterise(dev, devLabel, "dev"); sampleDump(chDev, devLabel, "dev");
result.characterise = { dev: { rows: chDev.rows, thin: chDev.thin, goldTokens: chDev.goldTokens, landing: chDev.landing, nickTypeCount: chDev.nickTypeCount } };
if (conf) { const chC = characterise(conf, confLabel, "conf"); sampleDump(chC, confLabel, "conf"); result.characterise.conf = { rows: chC.rows, thin: chC.thin, goldTokens: chC.goldTokens, landing: chC.landing, nickTypeCount: chC.nickTypeCount }; }
result.seconds = L.round((Date.now() - t0) / 1000, 1);
fs.writeFileSync(path.join(L.RESULTS, `induce.${CORPUS}.json`), JSON.stringify(result, null, 1));
log("DONE", result.seconds, "s");
console.log(JSON.stringify({ corpus: CORPUS, Kstar: result.Kstar, gap: result.gapKstar, K1_holds: result.K1_holds, frequency: result.frequency, heldOut: result.heldOut, seconds: result.seconds }, null, 1));
