// fragility.mjs — PREREG.md PIECE 3 (sha in PREREG.sha256). One-mention deletion size vs mention count m, per induced kind.
//   node fragility.mjs plan --novel wp ; node fragility.mjs run --novel wp --shard 0/4 [--shuf] ; node fragility.mjs report --novel wp
import fs from "node:fs";
import path from "node:path";
import { makeSnapshot, impactOfToken, shuffleSentences } from "../../law/impact.mjs";
import { loadNovel, castWP, castPP, rngFor, seedFor, binFreq, fold, round, mean, quantile, OUT } from "./lib.mjs";
const args = process.argv.slice(2), cmd = args[0], opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const NOVEL = opt("--novel", "wp"), SHUF = args.includes("--shuf"), SMOKE = args.includes("--smoke");
const M = 128, NCELL = Number(opt("--ncell", SMOKE ? 3 : 30)), NCAST = SMOKE ? 4 : 40, MBINS = [[1, 1], [2, 2], [3, 3], [4, 5], [6, 9], [10, 17], [18, 33], [34, 1e9]];
export const mbinOf = (m) => MBINS.findIndex(([a, b]) => m >= a && m <= b);
const posClass = (i, L) => (i === 0 ? "I" : i === L - 1 ? "F" : "M");
const PLAN = path.join(OUT, `frag-plan-${NOVEL}${SHUF ? ".shuf" : ""}${SMOKE ? ".smoke" : ""}.json`);

function plan() {
  const book = loadNovel(NOVEL), stream = book.stream, N = stream.length;
  const KJ = JSON.parse(fs.readFileSync(path.join(OUT, `kinds-${NOVEL}${SMOKE ? ".smoke" : ""}.json`), "utf8")), fk = new Map(Object.entries(KJ.formKind));
  const freq = new Map(); for (const s of stream) for (const w of s) freq.set(w, (freq.get(w) ?? 0) + 1);
  const cast = NOVEL === "wp" ? castWP() : castPP();
  const isCast = (w) => cast.core.has(fold(w));
  const rnd = rngFor(seedFor("frag-plan", NOVEL, SHUF));
  const win = new Map(), cells = new Map(), allByF = new Map(), allByK = new Map(), castTok = [], pop = {};
  for (let s = 0; s < N; s++) {
    for (const w of stream[s]) win.set(w, (win.get(w) ?? 0) + 1);
    if (s - M - 1 >= 0) for (const w of stream[s - M - 1]) { const c = win.get(w) - 1; if (c) win.set(w, c); else win.delete(w); }
    if (s < M) continue;
    const L = stream[s].length;
    stream[s].forEach((w, i) => {
      if (w.length < 3) return;
      const k = fk.get(w); if (k === undefined) return;
      const m = win.get(w), mb = mbinOf(m), pc = posClass(i, L), key = s * 1000 + i;
      const ck = `${k}|${mb}`; (cells.get(ck) ?? cells.set(ck, []).get(ck)).push(key); pop[ck] = (pop[ck] ?? 0) + 1;
      const tok = { key, w, k, m, mb, pc, fb: binFreq(freq.get(w)) };
      if (isCast(w)) castTok.push(tok);
      else { const a = `${mb}|${tok.fb}|${pc}`, b = `${k}|${mb}|${pc}`; (allByF.get(a) ?? allByF.set(a, []).get(a)).push(tok); (allByK.get(b) ?? allByK.set(b, []).get(b)).push(tok); }
    });
  }
  const pick = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const toks = new Map();
  const add = (t, g) => { const e = toks.get(t.key) ?? { ...t, groups: [] }; if (!e.groups.includes(g)) e.groups.push(g); toks.set(t.key, e); return e; };
  const infoOf = (key) => { const s = Math.floor(key / 1000), i = key % 1000, w = stream[s][i]; const m = win.get(w) ?? null; return null; };
  void infoOf;
  // stratified cell sample: need token info; rebuild from key
  const winAt = (s) => { const c = new Map(); for (let q = Math.max(0, s - M); q <= s; q++) for (const w of stream[q]) c.set(w, (c.get(w) ?? 0) + 1); return c; };
  for (const [ck, keys] of cells) {
    const [k, mb] = ck.split("|").map(Number);
    for (const key of pick(keys, NCELL)) { const s = Math.floor(key / 1000), i = key % 1000, w = stream[s][i], m = winAt(s).get(w); add({ key, w, k, m, mb, pc: posClass(i, stream[s].length), fb: binFreq(freq.get(w)) }, "cell"); }
  }
  const pairs = []; let fbF = 0, fbK = 0, nc = 0;
  for (let mb = 0; mb < MBINS.length; mb++) {
    for (const t of pick(castTok.filter((x) => x.mb === mb), NCAST)) {
      const c = add(t, "cast"); nc++;
      let a = allByF.get(`${mb}|${t.fb}|${t.pc}`) ?? []; if (!a.length) { fbF++; a = [...allByF].filter(([k]) => k.startsWith(`${mb}|${t.fb}|`)).flatMap(([, v]) => v); }
      let b = allByK.get(`${t.k}|${mb}|${t.pc}`) ?? []; if (!b.length) { fbK++; b = [...allByK].filter(([k]) => k.startsWith(`${t.k}|${mb}|`)).flatMap(([, v]) => v); }
      const f = a.length ? add(a[Math.floor(rnd() * a.length)], "ctrlF") : null, kk = b.length ? add(b[Math.floor(rnd() * b.length)], "ctrlK") : null;
      pairs.push({ cast: c.key, ctrlF: f?.key ?? null, ctrlK: kk?.key ?? null });
    }
  }
  let list = [...toks.values()];
  const sham = pick(list, SMOKE ? 5 : 100).map((t) => t.key);
  if (SHUF) { const sh = shuffleSentences(stream, seedFor("frag-shuf", NOVEL)); list = pick(list.filter((t) => t.groups.includes("cell")), SMOKE ? 20 : 600).map((t) => { const s = Math.floor(t.key / 1000), i = sh[s].indexOf(t.w); return { ...t, key: s * 1000 + i, origKey: t.key }; }); }
  const out = { novel: NOVEL, shuf: SHUF, M, mbins: MBINS, tokens: list, pairs: SHUF ? [] : pairs, sham, pop, fallback: { ctrlF: fbF, ctrlK: fbK, cast: nc }, castTokensAvailable: castTok.length, kinds: KJ.leaves };
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(PLAN, JSON.stringify(out));
  console.log(JSON.stringify({ tokens: list.length, cast: nc, fallback: out.fallback, sentences: new Set(list.map((t) => Math.floor(t.key / 1000))).size }));
}
if (cmd === "plan") plan();

function run() {
  const P = JSON.parse(fs.readFileSync(PLAN, "utf8")), book = loadNovel(NOVEL);
  const stream = SHUF ? shuffleSentences(book.stream, seedFor("frag-shuf", NOVEL)) : book.stream;
  const [si, sn] = opt("--shard", "0/1").split("/").map(Number);
  const bySent = new Map();
  for (const t of P.tokens) { const s = Math.floor(t.key / 1000); if (s % sn !== si) continue; (bySent.get(s) ?? bySent.set(s, []).get(s)).push(t); }
  const shamSet = new Set(P.sham), outFile = path.join(OUT, `frag-${NOVEL}${SHUF ? ".shuf" : ""}${SMOKE ? ".smoke" : ""}-shard${si}.jsonl`);
  fs.writeFileSync(outFile, "");
  const t0 = Date.now(); let done = 0, det = { same: 0, total: 0 };
  for (const s of [...bySent.keys()].sort((a, b) => a - b)) {
    const snap = makeSnapshot(stream, s, { M, F: 0, seedTag: "fr" });
    const beings = new Set(snap.reading0.beings.map((b) => b.surface)), figs = snap.reading0.figures;
    for (const t of bySent.get(s)) {
      const i = t.key % 1000; if (stream[s][i] !== t.w) { console.error("token mismatch", s, i, t.w); continue; }
      const r = impactOfToken(snap, i, { mode: "delete", withC: false, keepDeltas: true });
      const changed = r.counts.reduce((a, b) => a + b, 0), entry = r.counts.slice(54, 72).reduce((a, b) => a + b, 0);
      const ts = new Set(r.sd.tokenSlots); let direct = 0; for (const x of r.sd.records) if (x.type !== "unchanged" && x.side === 0 && ts.has(x.id)) direct++;
      const rec = { key: t.key, k: t.k, m: t.m, mb: t.mb, pc: t.pc, fb: t.fb, w: t.w, groups: t.groups, changed, entry, direct, collateral: changed - direct, null: r.isNull, extentTokens: r.extent.tokens, extentFrames: r.extent.frames, noSlot: r.noSlot, nSlots: r.nTokenSlots, isFigure: figs.has(t.w), isBeing: beings.has(t.w), hash: r.hash };
      if (shamSet.has(t.key)) rec.shamChanged = impactOfToken(snap, i, { mode: "sham", withC: false }).counts.reduce((a, b) => a + b, 0);
      if (si === 0 && det.total < 40) { const r2 = impactOfToken(snap, i, { mode: "delete", withC: false }); det.total++; if (r2.hash === r.hash) det.same++; }
      fs.appendFileSync(outFile, JSON.stringify(rec) + "\n"); done++;
    }
    if (done % 100 < bySent.get(s).length) console.error(`shard ${si}: ${done} tokens, ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  if (si === 0) fs.appendFileSync(outFile, JSON.stringify({ determinism: det }) + "\n");
  console.error(`shard ${si} finished ${done} tokens ${Math.round((Date.now() - t0) / 1000)}s`);
}
if (cmd === "run") run();

// ── report ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const l2 = (m) => Math.log2(m);
function loadRecs(suffix = "") {
  const recs = []; let det = null;
  for (const f of fs.readdirSync(OUT).filter((f) => f.startsWith(`frag-${NOVEL}${suffix}-shard`) && f.endsWith(".jsonl"))) for (const line of fs.readFileSync(path.join(OUT, f), "utf8").split("\n").filter(Boolean)) { const r = JSON.parse(line); if (r.determinism) det = r.determinism; else { r.D1 = Math.log2(1 + r.changed); recs.push(r); } }
  return { recs, det };
}
const ols = (xs, ys, ws = null) => { const w = ws ?? xs.map(() => 1); const sw = w.reduce((a, b) => a + b, 0), mx = xs.reduce((a, x, i) => a + w[i] * x, 0) / sw, my = ys.reduce((a, y, i) => a + w[i] * y, 0) / sw; let sxx = 0, sxy = 0; xs.forEach((x, i) => { sxx += w[i] * (x - mx) ** 2; sxy += w[i] * (x - mx) * (ys[i] - my); }); return sxx > 1e-12 ? { b: sxy / sxx, a: my - (sxy / sxx) * mx } : null; };
const ci = (xs) => (xs.length ? [round(quantile(xs, 0.025)), round(quantile(xs, 0.975))] : null);
function bootstrap(recs, blockOf, stat, B = 1000, seed = 7) {
  const rnd = rngFor(seed), byB = new Map(); recs.forEach((r) => { const b = blockOf(r); (byB.get(b) ?? byB.set(b, []).get(b)).push(r); });
  const ids = [...byB.keys()], out = [];
  for (let t = 0; t < B; t++) { const rs = []; for (let k = 0; k < ids.length; k++) rs.push(...byB.get(ids[Math.floor(rnd() * ids.length)])); const v = stat(rs); if (v != null && Number.isFinite(v)) out.push(v); }
  return out;
}
/** post-stratified pooled bin means: weights pop[k|mb] / n sampled in that cell */
function pooledCurve(cellRecs, pop) {
  const cn = new Map(); cellRecs.forEach((r) => cn.set(`${r.k}|${r.mb}`, (cn.get(`${r.k}|${r.mb}`) ?? 0) + 1));
  const num = new Array(8).fill(0), den = new Array(8).fill(0);
  cellRecs.forEach((r) => { const ck = `${r.k}|${r.mb}`, w = (pop[ck] ?? 0) / cn.get(ck); num[r.mb] += w * r.D1; den[r.mb] += w; });
  return num.map((v, i) => (den[i] ? v / den[i] : null));
}
function pooledSlope(cellRecs, pop, from = 3) {
  const cn = new Map(); cellRecs.forEach((r) => cn.set(`${r.k}|${r.mb}`, (cn.get(`${r.k}|${r.mb}`) ?? 0) + 1));
  const rs = cellRecs.filter((r) => r.m >= from), w = rs.map((r) => (pop[`${r.k}|${r.mb}`] ?? 0) / cn.get(`${r.k}|${r.mb}`));
  const f = ols(rs.map((r) => l2(r.m)), rs.map((r) => r.D1), w); return f ? f.b : null;
}
function cvForms(rs, weights = null) {
  const blocks = [...new Set(rs.map((r) => r.blk))], loss = { CONST: 0, FLOOR: 0, FLOORLOG: 0, LOG: 0, HYP: 0 }; let n = 0;
  for (const b of blocks) {
    const tr = rs.filter((r) => r.blk !== b), te = rs.filter((r) => r.blk === b); if (tr.length < 12 || !te.length) continue;
    const gm = mean(tr.map((r) => r.D1)), cls = (m) => (m === 1 ? 1 : m === 2 ? 2 : 3);
    const lev = {}; for (const c of [1, 2, 3]) { const x = tr.filter((r) => cls(r.m) === c); lev[c] = x.length ? mean(x.map((r) => r.D1)) : gm; }
    const hi = tr.filter((r) => r.m >= 3), fh = hi.length > 4 ? ols(hi.map((r) => l2(r.m)), hi.map((r) => r.D1)) : null;
    const fl = ols(tr.map((r) => l2(r.m)), tr.map((r) => r.D1)), fy = ols(tr.map((r) => 1 / r.m), tr.map((r) => r.D1));
    for (const r of te) { const pr = { CONST: gm, FLOOR: lev[cls(r.m)], FLOORLOG: r.m >= 3 && fh ? fh.a + fh.b * l2(r.m) : lev[cls(r.m)], LOG: fl ? fl.a + fl.b * l2(r.m) : gm, HYP: fy ? fy.a + fy.b / r.m : gm }; for (const k of Object.keys(loss)) loss[k] += (pr[k] - r.D1) ** 2; n++; }
  }
  const mse = Object.fromEntries(Object.entries(loss).map(([k, v]) => [k, n ? round(v / n, 4) : null]));
  const best = Object.entries(mse).sort((a, b) => a[1] - b[1])[0]?.[0];
  return { n, mse, best };
}

function report() {
  const P = JSON.parse(fs.readFileSync(PLAN, "utf8")), N = loadNovel(NOVEL).stream.length;
  const { recs, det } = loadRecs(SMOKE ? ".smoke" : ""), byKey = new Map();
  const blockOf = (r) => Math.min(19, Math.floor((Math.floor(r.key / 1000) / N) * 20));
  recs.forEach((r) => { r.blk = blockOf(r); byKey.set(r.key, r); });
  const cell = recs.filter((r) => r.groups.includes("cell")), pop = P.pop;
  const out = { novel: NOVEL, tokensRead: recs.length, cellTokens: cell.length, determinism: det, sham: { n: recs.filter((r) => r.shamChanged !== undefined).length, nonzero: recs.filter((r) => r.shamChanged > 0).length } };
  // pooled curve + F1 cliff + F2 slope, with block bootstrap
  const curve = pooledCurve(cell, pop); out.pooledCurveD1 = curve.map((x) => round(x, 3)); out.curveBins = P.mbins.map((b) => b.join("-"));
  const cliff = (rs) => { const c = pooledCurve(rs, pop); return c[1] != null && c[2] != null ? c[1] - c[2] : null; };
  const bc = bootstrap(cell, blockOf, cliff, 500, 11); out.F1 = { cliff_m2_minus_m3: round(cliff(cell)), ci: ci(bc), n1minus: round(curve[0] - curve[2]), pass: ci(bc)?.[0] > 0 };
  const bs = bootstrap(cell, blockOf, (rs) => pooledSlope(rs, pop), 500, 12), ps = pooledSlope(cell, pop);
  out.F2_pooled = { slopePerDoubling: round(ps), ci: ci(bs), flat: Math.abs(ps) < 0.1 && ci(bs)?.[0] <= 0 && ci(bs)?.[1] >= 0 };
  // mechanism: D1 by isFigure at m=1,2,>=3 (cell tokens)
  const mech = {}; for (const [nm, f] of [["m1", (r) => r.m === 1], ["m2", (r) => r.m === 2], ["m3+", (r) => r.m >= 3]]) { const x = cell.filter(f); mech[nm] = { n: x.length, meanD1: round(mean(x.map((r) => r.D1))), shareNull: round(mean(x.map((r) => (r.null ? 1 : 0)))), shareFigure: round(mean(x.map((r) => (r.isFigure ? 1 : 0)))), shareBeing: round(mean(x.map((r) => (r.isBeing ? 1 : 0)))), meanDirect: round(mean(x.map((r) => r.direct)), 2), meanCollateral: round(mean(x.map((r) => r.collateral)), 2) }; }
  out.mechanism = mech;
  // per kind
  const K = P.kinds, kinds = [];
  for (let k = 0; k < K; k++) {
    const rs = cell.filter((r) => r.k === k); if (!rs.length) continue;
    const hi = rs.filter((r) => r.m >= 3), bins = [...new Set(hi.map((r) => r.mb))];
    const slope = (x) => { const f = x.length > 8 ? ols(x.map((r) => l2(r.m)), x.map((r) => r.D1)) : null; return f ? f.b : null; };
    const sb = hi.length >= 100 && bins.length >= 3 ? bootstrap(hi, blockOf, slope, 300, 20 + k) : [];
    const curveK = Array.from({ length: 8 }, (_, mb) => { const x = rs.filter((r) => r.mb === mb); return x.length ? { n: x.length, d1: round(mean(x.map((r) => r.D1)), 2), nonNull: round(1 - mean(x.map((r) => (r.null ? 1 : 0))), 2) } : null; });
    kinds.push({ k, tokens: rs.length, popTokens: Object.entries(pop).filter(([c]) => c.startsWith(k + "|")).reduce((a, [, v]) => a + v, 0), curve: curveK, slopeAbove3: round(slope(hi)), slopeCI: ci(sb), departing: sb.length > 0 && (ci(sb)[0] > 0 || ci(sb)[1] < 0), cv: rs.some((r) => r.m <= 2) && hi.length ? cvForms(rs) : { best: "n/a(no m<=2)", note: "no low-m tokens" } });
  }
  out.kinds = kinds;
  const ps_ = out.F2_pooled.slopePerDoubling;
  out.F2_departing = kinds.filter((x) => x.departing).map((x) => ({ k: x.k, slope: x.slopeAbove3, ci: x.slopeCI, reversal: Math.sign(x.slopeAbove3) !== Math.sign(ps_) }));
  const withLow = kinds.filter((x) => x.cv.mse); out.F3 = { kindsWithLowM: withLow.length, floorWins: withLow.filter((x) => x.cv.best === "FLOOR").length, winners: Object.fromEntries(withLow.map((x) => [x.k, x.cv.best])), pooledSampleCV: cvForms(cell) };
  fs.writeFileSync(path.join(OUT, `frag-${NOVEL}${SMOKE ? ".smoke" : ""}.report.json`), JSON.stringify(out, null, 1));
  return { out, recs, cell, pop, N, blockOf, byKey, P };
}
if (cmd === "report") { const R = report(); const { cast } = castPart(R); console.log(JSON.stringify({ F1: R.out.F1, F2: R.out.F2_pooled, departing: R.out.F2_departing, F3: R.out.F3, cast, mech: R.out.mechanism, sham: R.out.sham, det: R.out.determinism }, null, 1)); }

function hetero(cellRecs, kindOf) {
  const hi = cellRecs.filter((r) => r.mb >= 2), pooled = Array.from({ length: 8 }, (_, mb) => mean(hi.filter((r) => r.mb === mb).map((r) => r.D1)));
  const by = new Map(); hi.forEach((r) => { const k = kindOf(r); (by.get(k) ?? by.set(k, []).get(k)).push(r); });
  const devs = [], slopes = [];
  for (const [, rs] of by) {
    const bins = [...new Set(rs.map((r) => r.mb))].filter((mb) => rs.filter((r) => r.mb === mb).length >= 3);
    if (rs.length < 40 || bins.length < 3) continue;
    devs.push(mean(bins.map((mb) => mean(rs.filter((r) => r.mb === mb).map((r) => r.D1)) - pooled[mb])));
    const f = ols(rs.map((r) => l2(r.m)), rs.map((r) => r.D1)); if (f) slopes.push(f.b);
  }
  const vr = (x) => { if (x.length < 2) return null; const m = mean(x); return x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1); };
  return { H: vr(devs), Hs: vr(slopes), kinds: devs.length };
}
function castPart(R) {
  const { cell, byKey, P, blockOf } = R, out = {};
  const KJ = JSON.parse(fs.readFileSync(path.join(OUT, `kinds-${NOVEL}${SMOKE ? ".smoke" : ""}.json`), "utf8")), fk = new Map(Object.entries(KJ.formKind));
  // F4 pairs
  for (const which of ["ctrlF", "ctrlK"]) {
    const d = P.pairs.map((p) => { const c = byKey.get(p.cast), t = p[which] != null ? byKey.get(p[which]) : null; return c && t ? { c, t, d: c.D1 - t.D1, blk: c.blk, mb: c.mb, pcM: c.pc === "M" && t.pc === "M" } : null; }).filter(Boolean);
    const stat = (f) => (rs) => { const x = rs.filter(f); return x.length ? mean(x.map((q) => q.d)) : null; };
    const sel = { m1: (q) => q.mb === 0, m2: (q) => q.mb === 1, "m3+": (q) => q.mb >= 2, "m3+_midOnly": (q) => q.mb >= 2 && q.pcM };
    out[which] = { pairs: d.length, castMeanD1: round(mean(d.map((q) => q.c.D1))), ctrlMeanD1: round(mean(d.map((q) => q.t.D1))) };
    for (const [nm, f] of Object.entries(sel)) { const b = bootstrap(d, (q) => q.blk, stat(f), 600, 31); out[which][nm] = { n: d.filter(f).length, meanDiff: round(stat(f)(d)), ci: ci(b), excludes0: b.length > 0 && (ci(b)[0] > 0 || ci(b)[1] < 0) }; }
    const sl = (rs, key) => { const x = rs.map((q) => q[key]).filter((r) => r.m >= 3); const f = x.length > 8 ? ols(x.map((r) => l2(r.m)), x.map((r) => r.D1)) : null; return f ? f.b : null; };
    const sd_ = (rs) => { const a = sl(rs, "c"), b = sl(rs, "t"); return a != null && b != null ? a - b : null; };
    const bb = bootstrap(d, (q) => q.blk, sd_, 600, 32); out[which].slopeCastMinusCtrl = { point: round(sd_(d)), castSlope: round(sl(d, "c")), ctrlSlope: round(sl(d, "t")), ci: ci(bb), excludes0: bb.length > 0 && (ci(bb)[0] > 0 || ci(bb)[1] < 0) };
    out[which].position = { castShareInitial: round(mean(d.map((q) => (q.c.pc === "I" ? 1 : 0)))), ctrlShareInitial: round(mean(d.map((q) => (q.t.pc === "I" ? 1 : 0)))), castShareBeing: round(mean(d.map((q) => (q.c.isBeing ? 1 : 0)))), ctrlShareBeing: round(mean(d.map((q) => (q.t.isBeing ? 1 : 0)))), castShareFigure: round(mean(d.map((q) => (q.c.isFigure ? 1 : 0)))), ctrlShareFigure: round(mean(d.map((q) => (q.t.isFigure ? 1 : 0)))) };
  }
  // F5 heterogeneity with permutation of kind labels among forms within log2 frequency bin
  const freq = new Map(); for (const r of cell) freq.set(r.w, r.fb);
  const obs = hetero(cell, (r) => r.k), rnd = rngFor(seedFor("frag-perm", NOVEL)), ws = [...freq.keys()], nullH = [], nullS = [];
  const bins = new Map(); ws.forEach((w) => { const b = freq.get(w); (bins.get(b) ?? bins.set(b, []).get(b)).push(w); });
  for (let p = 0; p < 1000; p++) { const pm = new Map(); for (const g of bins.values()) { const lab = g.map((w) => fk.get(w)); for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; } g.forEach((w, q) => pm.set(w, lab[q])); } const h = hetero(cell, (r) => pm.get(r.w)); if (h.H != null) nullH.push(h.H); if (h.Hs != null) nullS.push(h.Hs); }
  out.F5 = { kinds: obs.kinds, H: round(obs.H, 5), nullQ95: round(quantile(nullH, 0.95), 5), nullMedian: round(quantile(nullH, 0.5), 5), HPass: obs.H > quantile(nullH, 0.95), pH: round((1 + nullH.filter((x) => x >= obs.H).length) / (1 + nullH.length), 4), Hslope: round(obs.Hs, 5), nullSlopeQ95: round(quantile(nullS, 0.95), 5), HslopePass: obs.Hs > quantile(nullS, 0.95), pHslope: round((1 + nullS.filter((x) => x >= obs.Hs).length) / (1 + nullS.length), 4) };
  fs.writeFileSync(path.join(OUT, `frag-${NOVEL}${SMOKE ? ".smoke" : ""}.cast.json`), JSON.stringify(out, null, 1));
  return { cast: out };
}

// ── S3: company-shuffled book (reported, not gating) ───────────────────────────────────────────────────────────────────
function shufReport() {
  const { recs } = loadRecs(".shuf"), real = loadRecs("").recs.filter((r) => r.groups.includes("cell"));
  const cell = recs.filter((r) => r.groups.includes("cell")), mu = (rs, mb) => mean(rs.filter((r) => r.mb === mb).map((r) => r.D1));
  const N = loadNovel(NOVEL).stream.length; const blockOf = (r) => Math.min(19, Math.floor((Math.floor(r.key / 1000) / N) * 20));
  const cl = (rs) => mu(rs, 1) - mu(rs, 2);
  const bs = bootstrap(cell, blockOf, cl, 400, 41);
  const hr = hetero(cell, (r) => r.k), hreal = hetero(real, (r) => r.k);
  const out = { shuffledTokens: cell.length, cliffUnweighted_shuffled: round(cl(cell)), ci: ci(bs), cliffUnweighted_real: round(cl(real)), meanD1ByBin_shuffled: Array.from({ length: 8 }, (_, mb) => round(mu(cell, mb), 2)), meanD1ByBin_real: Array.from({ length: 8 }, (_, mb) => round(mu(real, mb), 2)), nullShare_shuffled: round(mean(cell.map((r) => (r.null ? 1 : 0)))), nullShare_real: round(mean(real.map((r) => (r.null ? 1 : 0)))), heteroShuffled: { H: round(hr.H, 5), kinds: hr.kinds }, heteroReal: { H: round(hreal.H, 5), kinds: hreal.kinds } };
  fs.writeFileSync(path.join(OUT, `frag-${NOVEL}.shuf.report.json`), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
}
if (cmd === "shufreport") shufReport();
