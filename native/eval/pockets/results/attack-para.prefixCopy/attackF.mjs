// attackF.mjs -- ATTACK F (the REVERSAL): anatomy of the pockets where prefixCopy is below the null. Pockets: the 3 atlas P- (cd-mscx, cd-sbgn, ml-lat-summa) and the 4 further pockets that are P- under the within-document null
// (cd-musicxml, fm-law-sk, ml-grc-lyric, ml-lzh-bencao).  Per pocket and half: z of prefixCopy under (global 50 draws | within-doc 50 draws) for the full half and after deleting the K commonest types (K = 5, 10, 20, 50),
// after exact-duplicate removal (dedupAll), and the LAG PROFILE (P(same 2-token opening at lag L) for L = 1..6, observed vs within-document null mean).  Output out/F/anatomy.json.
import fs from "node:fs";
import path from "node:path";
import { halves, cells, loadCached, HERE, sha256, prepView, withinDocPerm, seedOf } from "./lib.mjs";
const IDS = (process.argv[2] ?? "cd-mscx,cd-sbgn,ml-lat-summa,cd-musicxml,fm-law-sk,ml-grc-lyric,ml-lzh-bencao").split(",");
fs.mkdirSync(path.join(HERE, "out/F"), { recursive: true });
const counts = (units) => { const c = new Map(); for (const u of units) for (const w of u) c.set(w, (c.get(w) || 0) + 1); return c; };
const topK = (view, K) => [...counts(view.units)].map(([w, n]) => [n, sha256("dropT:" + w), w]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1)).slice(0, K).map((x) => x[2]);
function dropTypes(view, drop) { const units = [], docOf = []; view.units.forEach((u, k) => { const r = u.filter((w) => !drop.has(w)); if (r.length) { units.push(r); docOf.push(view.docOf[k]); } }); return { id: view.id, which: view.which, units, docOf }; }
function dedupAll(view) { const seen = new Set(), units = [], docOf = []; view.units.forEach((u, k) => { const key = u.join(" "); if (seen.has(key)) return; seen.add(key); units.push(u); docOf.push(view.docOf[k]); }); return { id: view.id, which: view.which, units, docOf }; }
function lagProfile(view, maxL = 6, draws = 50) {
  const P = prepView(view), U = P.U, ident = Int32Array.from({ length: U }, (_, k) => k);
  const rate = (perm, L) => { let np = 0, h = 0; for (let u = L; u < U; u++) { if (P.docOf[u] !== P.docOf[u - L]) continue; const a = perm[u - L], b = perm[u]; if (P.len[a] < 2 || P.len[b] < 2) continue; np++; if (P.ids8[a * 8] === P.ids8[b * 8] && P.ids8[a * 8 + 1] === P.ids8[b * 8 + 1]) h++; } return np ? h / np : null; };
  const out = [];
  for (let L = 1; L <= maxL; L++) {
    const o = rate(ident, L), xs = []; for (let k = 0; k < draws; k++) xs.push(rate(withinDocPerm(P.docOf, seedOf(view.id, view.which, "F", "lag", L, k)), L));
    const m = xs.reduce((a, b) => a + b, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
    out.push({ lag: L, obs: o, nullMean: m, z: sd > 0 ? (o - m) / sd : null });
  }
  return out;
}
const openers = (view, n = 5) => { const c = new Map(); for (const u of view.units) if (u.length >= 2) { const k = u[0] + " " + u[1]; c.set(k, (c.get(k) || 0) + 1); } return [...c].sort((a, b) => b[1] - a[1]).slice(0, n); };
const res = {};
for (const id of IDS) {
  const H = halves(loadCached(id)); res[id] = { variants: {}, lag: {}, openers: {} };
  for (const which of ["discover", "confirm"]) {
    const V = H[which];
    const vars = { full: V, dropTop5: dropTypes(V, new Set(topK(V, 5))), dropTop10: dropTypes(V, new Set(topK(V, 10))), dropTop20: dropTypes(V, new Set(topK(V, 20))), dropTop50: dropTypes(V, new Set(topK(V, 50))), dedupAll: dedupAll(V) };
    for (const [name, v] of Object.entries(vars)) {
      if (v.units.length < 60) continue;
      const g = cells(v, { keys: ["prefixCopy"], nullKind: "unit-order", draws: 50 }), w = cells(v, { keys: ["prefixCopy"], nullKind: "within-doc", draws: 50, tag: "F" });
      (res[id].variants[name] ??= {})[which] = { zGlobal: g.prefixCopy.z, zWithin: w.prefixCopy.z, v: g.prefixCopy.v, nullMeanGlobal: g.prefixCopy.nullMean, nullMeanWithin: w.prefixCopy.nullMean, np: g._meta.np, units: v.units.length };
    }
    res[id].lag[which] = lagProfile(V); res[id].openers[which] = openers(V);
  }
  console.error(id, "done");
}
fs.writeFileSync(path.join(HERE, "out/F/anatomy.json"), JSON.stringify(res, null, 1));
