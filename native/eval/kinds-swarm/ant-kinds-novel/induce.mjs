// induce.mjs — PREREG.md PIECE 1 (header sha256 in PREREG.sha256): company kinds on a novel + cast distribution + K1 controls.
//   node induce.mjs --novel wp|pp [--smoke]
import fs from "node:fs";
import path from "node:path";
import { loadNovel, castWP, castPP, induce, assignThin, formTable, ari, nmi, shuffleSentences, seedFor, rngFor, binFreq, round, mean, median, quantile, OUT, fold } from "./lib.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const NOVEL = opt("--novel", "wp"), SMOKE = args.includes("--smoke"), CONTROLS = args.includes("--controls");
const lf = [0]; for (let i = 1; i < 20000; i++) lf[i] = lf[i - 1] + Math.log(i);
const logC = (n, k) => lf[n] - lf[k] - lf[n - k];
/** P(X >= k) for X ~ Hypergeom(N, K successes, n draws) */
const hyperTail = (N, K, n, k) => { let t = 0; for (let x = k; x <= Math.min(K, n); x++) t += Math.exp(logC(K, x) + logC(N - K, n - x) - logC(N, n)); return t; };

function describe(book, ind, kindMap, castSets) {
  const { stream, orig } = book, nTok = stream.reduce((a, s) => a + s.length, 0);
  const st = new Map();
  stream.forEach((s, si) => s.forEach((w, i) => { const r = st.get(w) ?? { n: 0, ni: 0, cap: 0 }; r.n++; if (i > 0) { r.ni++; if (/^\p{Lu}/u.test(orig[si][i])) r.cap++; } st.set(w, r); }));
  const L = ind.leaves.map((l) => ({ id: l.id, path: l.path, forms: [], tokens: 0, bef: new Map(), aft: new Map(), castCore: [], castAll: [] }));
  for (const [w, k] of kindMap) { const r = st.get(w); if (!r) continue; L[k].forms.push(w); L[k].tokens += r.n; if (castSets.core.has(fold(w))) L[k].castCore.push(w); else if (castSets.all.has(fold(w))) L[k].castAll.push(w); }
  const gAll = new Map();
  stream.forEach((s) => s.forEach((w, i) => { const k = kindMap.get(w); const b = i > 0 ? s[i - 1] : "^", a = i + 1 < s.length ? s[i + 1] : "$"; gAll.set("b:" + b, (gAll.get("b:" + b) ?? 0) + 1); gAll.set("a:" + a, (gAll.get("a:" + a) ?? 0) + 1); if (k === undefined) return; const l = L[k]; l.bef.set(b, (l.bef.get(b) ?? 0) + 1); l.aft.set(a, (l.aft.get(a) ?? 0) + 1); }));
  return L.map((l) => {
    const fs_ = l.forms.slice().sort((a, b) => st.get(b).n - st.get(a).n);
    const capw = fs_.filter((w) => st.get(w).ni >= 5), capShare = capw.length ? capw.reduce((a, w) => a + st.get(w).cap / st.get(w).ni * st.get(w).n, 0) / capw.reduce((a, w) => a + st.get(w).n, 0) : null;
    const top = (m, p) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, n]) => `${c}:${round(n / l.tokens, 2)}`).join(" ");
    const lift = (m, p) => [...m].filter(([, n]) => n >= 30).map(([c, n]) => [c, (n / l.tokens) / ((gAll.get(p + ":" + c) ?? 1) / nTok)]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, v]) => `${c}:x${round(v, 1)}`).join(" ");
    return { id: l.id, path: l.path, forms: l.forms.length, tokenShare: round(l.tokens / nTok), capShareWeighted: round(capShare), shareFormsCap90: round(capw.filter((w) => st.get(w).cap / st.get(w).ni >= 0.9).length / Math.max(1, capw.length)), meanLog2n: round(mean(l.forms.map((w) => Math.log2(st.get(w).n))), 2), top: fs_.slice(0, 14), before: top(l.bef), after: top(l.aft), beforeLift: lift(l.bef, "b"), afterLift: lift(l.aft, "a"), castCore: l.castCore, castAllExtra: l.castAll };
  });
}

function halvesTest(book, kindMap, nTotal) {
  const BS = 100, ev = [], od = [];
  book.stream.forEach((s, i) => (Math.floor(i / BS) % 2 === 0 ? ev : od).push(s));
  const A = induce(ev, { nmin: 10, ctxMin: 25 }, "induce-halfA-" + NOVEL), B = induce(od, { nmin: 10, ctxMin: 25 }, "induce-halfB-" + NOVEL);
  const common = [...A.kindOf.keys()].filter((w) => B.kindOf.has(w));
  const a = common.map((w) => A.kindOf.get(w)), b = common.map((w) => B.kindOf.get(w));
  const obs = ari(a, b);
  const bins = new Map(); common.forEach((w, i) => { const k = binFreq(nTotal.get(w)); (bins.get(k) ?? bins.set(k, []).get(k)).push(i); });
  const rnd = rngFor(seedFor("halves-null", NOVEL)), nul = [];
  for (let p = 0; p < 500; p++) { const bp = b.slice(); for (const idxs of bins.values()) { const lab = idxs.map((i) => b[i]); for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; } idxs.forEach((i, q) => { bp[i] = lab[q]; }); } nul.push(ari(a, bp)); }
  return { leavesA: A.leaves.length, leavesB: B.leaves.length, commonForms: common.length, ariObs: round(obs), nullMax: round(Math.max(...nul)), nullQ99: round(quantile(nul, 0.99)), pass: obs > Math.max(...nul) && obs >= 0.25 };
}

async function controls() {
  const t0 = Date.now(), book = loadNovel(NOVEL), stream = SMOKE ? book.stream.slice(0, 6000) : book.stream;
  const nTotal = new Map(); for (const s of stream) for (const w of s) nTotal.set(w, (nTotal.get(w) ?? 0) + 1);
  const KJ = JSON.parse(fs.readFileSync(path.join(OUT, `kinds-${NOVEL}${SMOKE ? '.smoke' : ''}.json`), 'utf8')), kindMap = new Map(Object.entries(KJ.formKind)), ind = { kindOf: new Map(KJ.inducedForms.map((w) => [w, KJ.formKind[w]])) };
  const res = {};
  // K1b shuffled book
  const sh = induce(shuffleSentences(stream, seedFor("shufbook", NOVEL)), {}, "induce-shufbook-" + NOVEL);
  res.K1b = { shuffledLeaves: sh.leaves.length, pass: sh.leaves.length <= 2, nodes: sh.nodes.slice(0, 6).map(({ cent, ...n }) => n) };
  // K1d: NMI with frequency bin, real vs shuffled-book kinds
  const forms = [...ind.kindOf.keys()];
  res.K1d = { nmiRealKindVsFreqBin: round(nmi(forms.map((w) => ind.kindOf.get(w)), forms.map((w) => binFreq(nTotal.get(w))))), nmiShuffledKindVsFreqBin: round(nmi(sh.leaves.length > 1 ? [...sh.kindOf.keys()].map((w) => sh.kindOf.get(w)) : [0], [...sh.kindOf.keys()].map((w) => binFreq(nTotal.get(w))))) };
  res.K1d.pass = res.K1d.nmiRealKindVsFreqBin < 0.5;
  res.K1c = halvesTest({ stream }, kindMap, nTotal);
  fs.writeFileSync(path.join(OUT, `controls-${NOVEL}${SMOKE ? '.smoke' : ''}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ K1b: res.K1b?.pass, shufLeaves: res.K1b?.shuffledLeaves, K1c: res.K1c, K1d: res.K1d, seconds: round((Date.now() - t0) / 1000, 1) }));
}

async function main() {
  if (CONTROLS) return controls();
  const t0 = Date.now();
  const book = loadNovel(NOVEL);
  const stream = SMOKE ? book.stream.slice(0, 6000) : book.stream;
  const nTotal = new Map(); for (const s of stream) for (const w of s) nTotal.set(w, (nTotal.get(w) ?? 0) + 1);
  const ind = induce(stream, {}, "induce-" + NOVEL);
  const thin = assignThin(ind, stream, 5);
  const kindMap = new Map(ind.kindOf); for (const [w, k] of thin) kindMap.set(w, k);
  console.error(`${NOVEL}: ${stream.length} sentences, ${ind.T.F} forms n>=${ind.P.nmin}, leaves ${ind.leaves.length}, thin assigned ${thin.size}, ${(Date.now() - t0) / 1000}s`);
  const cast = NOVEL === "wp" ? castWP() : castPP();
  const desc = describe({ stream, orig: book.orig.slice(0, stream.length) }, ind, kindMap, cast);
  const res = { novel: NOVEL, smoke: SMOKE, params: ind.P, sentences: stream.length, formsInduced: ind.T.F, leaves: ind.leaves.length, thinAssigned: thin.size, nodes: ind.nodes.map(({ cent, ...n }) => n), kinds: desc, formKind: Object.fromEntries(kindMap), inducedForms: ind.T.forms };
  res.K1a = { leaves: ind.leaves.length, pass: ind.leaves.length >= 4 };
  // C1 cast
  if (cast.n) {
    const kinded = [...cast.core].map((f) => [f, [...kindMap].find(([w]) => fold(w) === f)?.[1]]).filter(([, k]) => k !== undefined);
    const per = new Map(); kinded.forEach(([, k]) => per.set(k, (per.get(k) ?? 0) + 1));
    const [bk, bc] = [...per].sort((a, b) => b[1] - a[1])[0];
    const N = kindMap.size, K = kinded.length, n = desc[bk].forms;
    res.C1 = { castCoreForms: cast.core.size, withKind: K, perKind: Object.fromEntries([...per].sort((a, b) => b[1] - a[1])), topKind: bk, topShare: round(bc / K), hyperP: hyperTail(N, K, n, bc), pass: bc / K >= 0.5 && hyperTail(N, K, n, bc) < 1e-6, titleLike: [...cast.titleLike] };
    const pa = new Map(); for (const k of desc.map((d) => d.castAllExtra).flat()) { const kk = kindMap.get(k); pa.set(kk, (pa.get(kk) ?? 0) + 1); }
    res.C1.castExtraPerKind = Object.fromEntries(pa);
  }
  res.seconds = round((Date.now() - t0) / 1000, 1);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `kinds-${NOVEL}${SMOKE ? ".smoke" : ""}.json`), JSON.stringify(res, null, 1));
  const lines = desc.map((d) => `kind ${d.id} [${d.path}] forms=${d.forms} tok=${d.tokenShare} cap=${d.capShareWeighted} cap90=${d.shareFormsCap90} cast=${d.castCore.length}\n  top: ${d.top.join(" ")}\n  before: ${d.before} | lift ${d.beforeLift}\n  after: ${d.after} | lift ${d.afterLift}`);
  fs.writeFileSync(path.join(OUT, `kinds-${NOVEL}${SMOKE ? ".smoke" : ""}.txt`), lines.join("\n") + "\n");
  console.log(JSON.stringify({ leaves: res.leaves, K1a: res.K1a, C1: res.C1 && { top: res.C1.topKind, share: res.C1.topShare, p: res.C1.hyperP, pass: res.C1.pass, perKind: res.C1.perKind }, seconds: res.seconds }));
}
await main();
