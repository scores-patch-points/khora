// joint_report.mjs -- ant-code T1 statistics (PREREG_A2.md): paired U/N draws, sign-flip tests; whole-class shapes; cross-language cosines. usage: node joint_report.mjs
import fs from "node:fs"; import { rngFor, seedFor } from "../../law/impact.mjs";
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1), r4 = (x) => (typeof x === "number" ? Number(x.toFixed(4)) : x);
const norm = (c) => { const t = c.reduce((a, b) => a + b, 0); return t ? c.map((x) => x / t) : c.map(() => 0); };
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : null; };
const eu = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
const addv = (a, b) => a.map((x, i) => x + b[i]);
const sumJ = (js, f) => js.reduce((a, j) => addv(a, f(j)), f(js[0]).map(() => 0));
const fams = (j) => [...j.imprint.fam, j.imprint.noSlot];
const amp = (j) => { const d = j.direct.reduce((a, b) => a + b, 0), c = j.collateral.reduce((a, b) => a + b, 0); return [d, c]; };
function signFlip(stat, pairs, B, seed) { // pairs: array of [Ud, Nd] vectors (or scalars); stat(UsList, NsList) -> number
  const rnd = rngFor(seed), obs = stat(pairs.map((p) => p[0]), pairs.map((p) => p[1])); let ge = 0;
  for (let b = 0; b < B; b++) { const sw = pairs.map((p) => (rnd() < 0.5 ? [p[1], p[0]] : p)); if (stat(sw.map((p) => p[0]), sw.map((p) => p[1])) >= obs - 1e-12) ge += 1; }
  return { obs: r4(obs), p: r4((ge + 1) / (B + 1)) };
}
const meanVec = (L) => L[0].map((_, i) => mean(L.map((v) => v[i])));
const distStat = (U, N) => eu(meanVec(U), meanVec(N));
const absMean = (U, N) => Math.abs(mean(U) - mean(N));
const res = {}, whole = {};
for (const lang of ["js", "py"]) {
  const f = `results/joint-${lang}.json`; if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, "utf8")), W = d.windows, usable = W.filter((w) => w.pairs.length);
  const D = d.DRAWS, per = []; // per draw pooled over windows
  for (let k = 0; k < D; k++) { const ws = usable.filter((w) => w.pairs[k]); const U = ws.map((w) => w.pairs[k].U), N = ws.map((w) => w.pairs[k].N); if (!ws.length) continue;
    const mk = (js) => ({ shadow: norm(sumJ(js, (j) => j.counts)), collateral: norm(sumJ(js, (j) => j.collateral)), imprint: norm(sumJ(js, fams)), amp: (() => { const s = js.reduce((a, j) => { const [dd, cc] = amp(j); return [a[0] + dd, a[1] + cc]; }, [0, 0]); return s[0] ? s[1] / s[0] : 0; })(), mag: js.reduce((a, j) => a + j.changed, 0) / js.reduce((a, j) => a + j.all, 0) });
    per.push([mk(U), mk(N)]); }
  const R = { windows: W.length, usableWindows: usable.length, draws: per.length, meanM: r4(mean(usable.map((w) => w.m))), exactCoverage: r4(mean(usable.flatMap((w) => w.pairs.map((p) => p.exact)))),
    sham: W.filter((w) => w.sham !== undefined).map((w) => w.sham).every((x) => x === 0), determinism: W.filter((w) => w.determinism != null).map((w) => w.determinism).every(Boolean) };
  const seed = seedFor("ant-code", "t1", lang), B = 5000;
  for (const obj of ["shadow", "collateral", "imprint"]) R[obj] = { ...signFlip(distStat, per.map((p) => [p[0][obj], p[1][obj]]), B, seed), meanU: meanVec(per.map((p) => p[0][obj])).map(r4), meanN: meanVec(per.map((p) => p[1][obj])).map(r4), cosUN: r4(cos(meanVec(per.map((p) => p[0][obj])), meanVec(per.map((p) => p[1][obj])))) };
  for (const obj of ["amp", "mag"]) R[obj] = { ...signFlip(absMean, per.map((p) => [p[0][obj], p[1][obj]]), B, seed), meanU: r4(mean(per.map((p) => p[0][obj]))), meanN: r4(mean(per.map((p) => p[1][obj]))) };
  // window-level paired test (the inference unit that generalises: windows, not draws)
  const wl = usable.map((w) => { const mk = (key) => { const js = w.pairs.map((p) => p[key]); return { shadow: norm(sumJ(js, (j) => j.counts)), collateral: norm(sumJ(js, (j) => j.collateral)), imprint: norm(sumJ(js, fams)), amp: (() => { const s2 = js.reduce((a, j) => { const [dd, cc] = amp(j); return [a[0] + dd, a[1] + cc]; }, [0, 0]); return s2[0] ? s2[1] / s2[0] : 0; })(), mag: js.reduce((a, j) => a + j.changed, 0) / js.reduce((a, j) => a + j.all, 0) }; }; return [mk("U"), mk("N")]; });
  R.winLevel = {};
  for (const obj of ["shadow", "collateral", "imprint"]) R.winLevel[obj] = signFlip(distStat, wl.map((p) => [p[0][obj], p[1][obj]]), B, seed + 1);
  for (const obj of ["amp", "mag"]) R.winLevel[obj] = { ...signFlip(absMean, wl.map((p) => [p[0][obj], p[1][obj]]), B, seed + 1), windowsUgtN: wl.filter((p) => p[0][obj] > p[1][obj]).length, of: wl.length };
  // whole-class deletions, pooled over windows
  whole[lang] = {};
  for (const C of ["U", "E", "K", "L"]) { const js = W.map((w) => w.classes[C]).filter(Boolean); if (js.length) whole[lang][C] = { windows: js.length, shadow: norm(sumJ(js, (j) => j.counts)), collateral: norm(sumJ(js, (j) => j.collateral)), imprint: norm(sumJ(js, fams)), mag: r4(js.reduce((a, j) => a + j.changed, 0) / js.reduce((a, j) => a + j.all, 0)), amp: (() => { const s = js.reduce((a, j) => { const [dd, cc] = amp(j); return [a[0] + dd, a[1] + cc]; }, [0, 0]); return r4(s[0] ? s[1] / s[0] : 0); })() }; }
  res[lang] = R;
}
const X = {};
for (const obj of ["shadow", "collateral", "imprint"]) { X[obj] = {};
  for (const lang of Object.keys(whole)) for (const a of ["U", "E", "K", "L"]) for (const b of ["U", "E", "K", "L"]) if (a <= b && whole[lang][a] && whole[lang][b]) X[obj][`${lang}:${a}-${b}`] = r4(cos(whole[lang][a][obj], whole[lang][b][obj]));
  if (whole.js && whole.py) for (const a of ["U", "E", "K", "L"]) for (const b of ["U", "E", "K", "L"]) if (whole.js[a] && whole.py[b]) X[obj][`js:${a}~py:${b}`] = r4(cos(whole.js[a][obj], whole.py[b][obj])); }
fs.writeFileSync("results/joint-report.json", JSON.stringify({ paired: res, whole, cosines: X }, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(res).map(([l, r]) => [l, { w: `${r.usableWindows}/${r.windows}`, m: r.meanM, exact: r.exactCoverage, sham: r.sham, det: r.determinism, shadow: [r.shadow.obs, r.shadow.p, r.shadow.cosUN], coll: [r.collateral.obs, r.collateral.p], imp: [r.imprint.obs, r.imprint.p], amp: [r.amp.meanU, r.amp.meanN, r.amp.p], mag: [r.mag.meanU, r.mag.meanN, r.mag.p], win: Object.fromEntries(Object.entries(r.winLevel).map(([k, v]) => [k, [v.obs, v.p, v.windowsUgtN]])) }]))));
console.log(JSON.stringify(X.shadow));
