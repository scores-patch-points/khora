// joint.mjs — PREREG.md PIECE 2 (sha in PREREG.sha256): joint ablation of all tokens of a kind in a window vs frequency+position matched random sets and random partitions.
//   node joint.mjs run --novel wp [--windows 8] [--rand 6] [--parts 12] [--smoke] ; node joint.mjs report --novel wp
import fs from "node:fs";
import path from "node:path";
import { makeSnapshot, readWindow, slotStructure, slotDeltas, tokenSlotsOf, sentenceText } from "../../law/impact.mjs";
import { loadNovel, rngFor, seedFor, binFreq, round, mean, quantile, OUT } from "./lib.mjs";
const args = process.argv.slice(2), cmd = args[0], opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const NOVEL = opt("--novel", "wp"), SMOKE = args.includes("--smoke"), W = Number(opt("--windows", SMOKE ? 2 : 8)), RAND = Number(opt("--rand", SMOKE ? 2 : 6)), PARTS = Number(opt("--parts", SMOKE ? 2 : 12));
const M = 128, FAM = 4, TYPES = ["emptied", "retyped", "rebound", "refilled", "shifted", "born"], DIM = FAM * TYPES.length;
const FILE = path.join(OUT, `joint-${NOVEL}${SMOKE ? ".smoke" : ""}.json`);
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : null; };
const posClass = (i, L) => (i === 0 ? "I" : i === L - 1 ? "F" : "M");

function runAll() {
  const book = loadNovel(NOVEL), stream = book.stream, N = stream.length;
  const KJ = JSON.parse(fs.readFileSync(path.join(OUT, `kinds-${NOVEL}${SMOKE ? ".smoke" : ""}.json`), "utf8")), fk = new Map(Object.entries(KJ.formKind)), K = KJ.leaves;
  const freq = new Map(); for (const s of stream) for (const w of s) freq.set(w, (freq.get(w) ?? 0) + 1);
  const rnd = rngFor(seedFor("joint", NOVEL));
  // R2 partitions: labels shuffled among kinded forms of the same log2 frequency bin (kind sizes preserved)
  const kinded = [...fk.keys()], byBin = new Map(); kinded.forEach((w) => { const b = binFreq(freq.get(w)); (byBin.get(b) ?? byBin.set(b, []).get(b)).push(w); });
  const parts = Array.from({ length: PARTS }, () => { const m = new Map(); for (const ws of byBin.values()) { const lab = ws.map((w) => fk.get(w)); for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; } ws.forEach((w, q) => m.set(w, lab[q])); } return m; });
  const ends = Array.from({ length: W }, (_, k) => Math.floor(M + ((k + 0.5) * (N - M)) / W));
  const out = { novel: NOVEL, K, M, W, RAND, PARTS, windows: [] };
  for (const e of ends) {
    const snap = makeSnapshot(stream, e, { M, F: 0, seedTag: "jt" });
    const toks = []; snap.sents.forEach((s, k) => s.forEach((w, i) => toks.push({ k, i, w, key: `${k}:${i}`, kind: fk.get(w), bin: binFreq(freq.get(w)), pc: posClass(i, s.length) })));
    const joint = (del) => {
      const sents1 = snap.sents.map((sent, k) => sent.filter((_, i) => !del.has(`${k}:${i}`)));
      const sd = slotDeltas(snap.sl0, slotStructure(readWindow(sents1.map(sentenceText), snap.ropts, snap.ceiling ?? null)));
      const I = new Set(); let noSlot = 0;
      for (const key of del) { const [k, i] = key.split(":").map(Number); const ids = tokenSlotsOf(snap.sl0, snap.sents, k, i); if (!ids.length) noSlot++; ids.forEach((id) => I.add(id)); }
      const fam = [0, 0, 0, 0]; for (const id of I) { const [, kind, , f] = id.split(":"); fam[kind === "r" ? Number(f) : 3] += 1; }
      const all = new Array(DIM).fill(0), direct = new Array(DIM).fill(0), coll = new Array(DIM).fill(0); let n = 0, ch = 0;
      for (const r of sd.records) { n++; if (r.type === "unchanged") continue; ch++; const c = r.fam * 6 + TYPES.indexOf(r.type); all[c]++; (r.side === 0 && I.has(r.id) ? direct : coll)[c]++; }
      return { all, direct, coll, fam, noSlot, tokens: del.size, changed: ch, nrec: n };
    };
    const win = { end: e, nTokens: toks.length, kinds: [], sham: joint(new Set()).changed };
    for (let c = 0; c < K; c++) {
      const inK = toks.filter((t) => t.kind === c); if (!inK.length) { win.kinds.push(null); continue; }
      const rec = { c, n: inK.length, obs: joint(new Set(inK.map((t) => t.key))), rand: [], unmatched: 0, posFallback: 0 };
      const others = toks.filter((t) => t.kind !== c);
      for (let d = 0; d < RAND; d++) {
        const used = new Set(), del = new Set();
        for (const t of inK) {
          let pool = others.filter((o) => o.bin === t.bin && o.pc === t.pc && !used.has(o.key)), fb = false;
          if (!pool.length) { pool = others.filter((o) => o.bin === t.bin && !used.has(o.key)); fb = true; }
          if (!pool.length) { rec.unmatched++; continue; }
          if (fb) rec.posFallback++;
          const o = pool[Math.floor(rnd() * pool.length)]; used.add(o.key); del.add(o.key);
        }
        rec.rand.push(joint(del));
      }
      win.kinds.push(rec);
    }
    win.parts = parts.map((pm) => Array.from({ length: K }, (_, c) => { const del = new Set(toks.filter((t) => pm.get(t.w) === c).map((t) => t.key)); return del.size ? joint(del) : null; }));
    out.windows.push(win);
    console.error(`window ${out.windows.length}/${W} end ${e} tokens ${toks.length} done`);
  }
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(out));
}
if (cmd === "run") runAll();

const sumV = (list) => list.reduce((a, c) => a.map((x, i) => x + c[i]), new Array(list[0].length).fill(0));
const shape = (v) => { const t = v.reduce((a, b) => a + b, 0); return t > 0 ? v.map((x) => x / t) : null; };
function report() {
  const R = JSON.parse(fs.readFileSync(FILE, "utf8")), K = R.K, Ws = R.windows;
  const impV = (x) => [...x.fam, x.noSlot];
  const pool = (recs, f) => { const l = recs.filter(Boolean).map(f); return l.length ? sumV(l) : null; };
  const out = { novel: R.novel, K, windows: R.W, perKind: [], sham: Ws.map((w) => w.sham) };
  const nullCos = [], nullImp = [];
  const perK = [];
  for (let c = 0; c < K; c++) {
    const obsRecs = Ws.map((w) => w.kinds[c]?.obs).filter(Boolean); if (!obsRecs.length) { perK.push(null); continue; }
    const shK = shape(pool(obsRecs, (x) => x.all)), impK = shape(pool(obsRecs, impV));
    const nd = Math.max(0, ...Ws.map((w) => w.kinds[c]?.rand.length ?? 0));
    const drawSh = [], drawImp = [];
    for (let d = 0; d < nd; d++) { const rr = Ws.map((w) => w.kinds[c]?.rand[d]).filter(Boolean); drawSh.push(shape(pool(rr, (x) => x.all))); drawImp.push(shape(pool(rr, impV))); }
    for (let i = 0; i < nd; i++) for (let j = i + 1; j < nd; j++) { if (drawSh[i] && drawSh[j]) nullCos.push(cos(drawSh[i], drawSh[j])); if (drawImp[i] && drawImp[j]) nullImp.push(cos(drawImp[i], drawImp[j])); }
    const rs = shape(pool(Ws.flatMap((w) => w.kinds[c]?.rand ?? []), (x) => x.all)), ri = shape(pool(Ws.flatMap((w) => w.kinds[c]?.rand ?? []), impV));
    const amp = (x) => { const d = x.direct.reduce((a, b) => a + b, 0), q = x.coll.reduce((a, b) => a + b, 0); return d ? q / d : null; };
    let ampWin = 0, ampN = 0; Ws.forEach((w) => { const k = w.kinds[c]; if (!k) return; const a = amp(k.obs), rr = k.rand.map(amp).filter((x) => x != null); if (a != null && rr.length) { ampN++; if (a > mean(rr)) ampWin++; } });
    const mag = (x) => x.changed / Math.max(1, x.nrec);
    perK.push({ c, tokens: obsRecs.reduce((a, x) => a + x.tokens, 0), magnitude: round(mean(obsRecs.map(mag))), randMagnitude: round(mean(Ws.flatMap((w) => w.kinds[c]?.rand.map(mag) ?? []))), cosShadowVsRand: round(shK && rs ? cos(shK, rs) : null), cosImprintVsRand: round(impK && ri ? cos(impK, ri) : null), imprint: impK?.map((x) => round(x, 3)), randImprint: ri?.map((x) => round(x, 3)), ampWindowsAbove: `${ampWin}/${ampN}`, ampObs: round(mean(Ws.map((w) => (w.kinds[c] ? amp(w.kinds[c].obs) : null)).filter((x) => x != null))), ampRand: round(mean(Ws.flatMap((w) => (w.kinds[c] ? w.kinds[c].rand.map(amp) : [])).filter((x) => x != null))), unmatchedShare: round(Ws.reduce((a, w) => a + (w.kinds[c]?.unmatched ?? 0), 0) / Math.max(1, obsRecs.reduce((a, x) => a + x.tokens, 0) * nd)), posFallbackShare: round(Ws.reduce((a, w) => a + (w.kinds[c]?.posFallback ?? 0), 0) / Math.max(1, obsRecs.reduce((a, x) => a + x.tokens, 0) * nd)), shape: shK?.map((x) => round(x, 3)) });
  }
  const q05 = quantile(nullCos, 0.05), q05i = quantile(nullImp, 0.05);
  perK.forEach((p) => { if (!p) return; p.J1_specific = p.cosShadowVsRand != null && q05 != null && p.cosShadowVsRand < q05; p.J2_imprintSpecific = p.cosImprintVsRand != null && q05i != null && p.cosImprintVsRand < q05i; });
  out.perKind = perK; out.nullCosShadowQ05 = round(q05); out.nullCosImprintQ05 = round(q05i); out.nullCosShadowMedian = round(quantile(nullCos, 0.5));
  const dBetween = (shapes) => { const s = shapes.filter(Boolean); const d = []; for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) d.push(1 - cos(s[i], s[j])); return d.length ? mean(d) : null; };
  const obsD = dBetween(perK.map((p) => (p ? p.shape.length ? shape(p.shape) : null : null)));
  const obsShapes = Array.from({ length: K }, (_, c) => { const r = Ws.map((w) => w.kinds[c]?.obs).filter(Boolean); return r.length ? shape(pool(r, (x) => x.all)) : null; });
  const partD = []; for (let p = 0; p < R.PARTS; p++) partD.push(dBetween(Array.from({ length: K }, (_, c) => { const r = Ws.map((w) => w.parts[p][c]).filter(Boolean); return r.length ? shape(pool(r, (x) => x.all)) : null; })));
  out.J4 = { dBetweenObserved: round(dBetween(obsShapes)), partitionDraws: partD.map((x) => round(x)), q95: round(quantile(partD.filter((x) => x != null), 0.95)), rank: partD.filter((x) => x != null && x >= dBetween(obsShapes)).length, pass: dBetween(obsShapes) > quantile(partD.filter((x) => x != null), 0.95) };
  void obsD;
  fs.writeFileSync(path.join(OUT, `joint-${NOVEL}${SMOKE ? ".smoke" : ""}.report.json`), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ sham: out.sham, q05: out.nullCosShadowQ05, J4: out.J4, perKind: out.perKind.map((p) => p && { c: p.c, tok: p.tokens, mag: p.magnitude, randMag: p.randMagnitude, cosSh: p.cosShadowVsRand, spec: p.J1_specific, cosImp: p.cosImprintVsRand, impSpec: p.J2_imprintSpecific, amp: `${p.ampObs}/${p.ampRand}`, win: p.ampWindowsAbove, unm: p.unmatchedShare }) }));
}
if (cmd === "report") report();
