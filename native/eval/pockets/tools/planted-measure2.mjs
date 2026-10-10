// eval/pockets/tools/planted-measure2.mjs — realised properties of pl-frames and pl-mix (role knowledge from the lexicon index).
import { lexicon } from "../loaders/_planted-core.mjs";
import { nullView, seedOf } from "../lib/pocket.mjs";
import { FW, NAME0, NNAMES, VOC_P, CAST, MIX_ASSIGN, MIX_COUNTS, classOf } from "../loaders/_planted-worlds2.mjs";
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);

// Distributional-class check: left/right neighbour profiles (over the 30 commonest types) of the 120 commonest open-class types; mean cosine of same-class pairs vs cross-class pairs, observed and in 3 within-unit shuffles.
function classContext(p, idx) {
  const cnt = new Map(); for (const u of p.units) for (const w of u) cnt.set(w, (cnt.get(w) || 0) + 1);
  const rk = [...cnt.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([w]) => w), nv = new Map(rk.slice(0, 30).map((w, i) => [w, i])), open = rk.filter((w) => classOf(idx.get(w)) !== null).slice(0, 120), cls = open.map((w) => classOf(idx.get(w)));
  const mean = (view) => {
    const vec = new Map(open.map((w) => [w, new Float64Array(60)]));
    for (const u of view.units) for (let k = 0; k < u.length; k++) { const v = vec.get(u[k]); if (!v) continue; if (k && nv.has(u[k - 1])) v[nv.get(u[k - 1])]++; if (k + 1 < u.length && nv.has(u[k + 1])) v[30 + nv.get(u[k + 1])]++; }
    const cos = (a, b) => { let x = 0, y = 0, z = 0; for (let i = 0; i < 60; i++) { x += a[i] * b[i]; y += a[i] * a[i]; z += b[i] * b[i]; } return y > 0 && z > 0 ? x / Math.sqrt(y * z) : null; };
    let s = 0, ns = 0, c = 0, nc = 0;
    for (let i = 0; i < open.length; i++) for (let j = i + 1; j < open.length; j++) { const r = cos(vec.get(open[i]), vec.get(open[j])); if (r == null) continue; if (cls[i] === cls[j]) { s += r; ns++; } else { c += r; nc++; } }
    return { sameClass: s / ns, crossClass: c / nc };
  };
  const obs = mean(p), sh = [0, 1, 2].map((k) => mean(nullView(p, "within-unit", seedOf("planted-truth", "classContext", k))));
  return { observedSameClassMeanCosine: r4(obs.sameClass), observedCrossClassMeanCosine: r4(obs.crossClass), shuffledSameClassMeanCosine: r4(sh.reduce((a, x) => a + x.sameClass, 0) / 3), shuffledCrossClassMeanCosine: r4(sh.reduce((a, x) => a + x.crossClass, 0) / 3), note: "profiles = counts of the 30 commonest types immediately left and right of a type, 120 commonest open-class types; classes known from the generator, not given to any statistic" };
}
export function frames(p) {
  const idx = new Map(lexicon("A").map((w, i) => [w, i])), cnt = new Map();
  for (const u of p.units) for (const w of u) cnt.set(w, (cnt.get(w) || 0) + 1);
  const rk = [...cnt.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([w]) => idx.get(w)), role = (i) => (i < FW ? "fw" : i >= NAME0 ? "name" : classOf(i));
  let vocUnits = 0, nameTok = 0, nameInit = 0, fwTok = 0, N = 0, finalFw = 0, initFw = 0, initOpen = 0; const docsOfName = new Map();
  p.units.forEach((u, k) => { const i0 = idx.get(u[0]); if (i0 >= NAME0) vocUnits++; if (role(i0) === "fw") initFw++; if (role(i0) === "A" || role(i0) === "B") initOpen++; if (idx.get(u[u.length - 1]) < FW) finalFw++;
    u.forEach((w, j) => { N++; const i = idx.get(w); if (i < FW) fwTok++; if (i >= NAME0) { nameTok++; if (j === 0) nameInit++; (docsOfName.get(i) || docsOfName.set(i, new Set()).get(i)).add(p.docOf[k]); } }); });
  const nd = new Set(p.docOf).size, ranksOfNames = rk.map((i, r) => (i >= NAME0 ? r + 1 : null)).filter(Boolean);
  return { vocativeUnitRate: r4(vocUnits / p.units.length), designVocativeProb: VOC_P, nameTokens: nameTok, nameTokensAtUnitStart: r4(nameInit / nameTok), nameTypesSeen: docsOfName.size, meanDocShareOfAName: r4([...docsOfName.values()].reduce((a, s) => a + s.size / nd, 0) / docsOfName.size), designDocShareOfAName: r4(CAST / NNAMES),
    functionWordTokenShare: r4(fwTok / N), commonest8TypesAreFunctionWords: rk.slice(0, 8).filter((i) => i < FW).length, nameFrequencyRanks: { min: Math.min(...ranksOfNames), max: Math.max(...ranksOfNames) }, unitFinalIsFunctionWord: finalFw, unitInitialFunctionWordRate: r4(initFw / p.units.length), unitInitialOpenClassRate: r4(initOpen / p.units.length), meanUnitLen: r4(N / p.units.length), classContext: classContext(p, idx) };
}
export function mix(p) {
  const tok = { burst: 0, markov: 0, frames: 0 }, docs = { ...tok }, per = []; p.units.forEach((u, k) => { per[p.docOf[k]] = (per[p.docOf[k]] || 0) + u.length; });
  per.forEach((n, d) => { tok[MIX_ASSIGN[d]] += n; docs[MIX_ASSIGN[d]]++; });
  const T = tok.burst + tok.markov + tok.frames;
  return { documentsPerComponent: docs, designDocuments: MIX_COUNTS, tokenShare: { burst: r4(tok.burst / T), markov: r4(tok.markov / T), frames: r4(tok.frames / T) }, componentOfDocument: MIX_ASSIGN.join(" ").replace(/burst/g, "b").replace(/markov/g, "m").replace(/frames/g, "f"), note: "componentOfDocument lists the generator of document 0,1,2,... (b = burst, m = markov, f = frames)" };
}
