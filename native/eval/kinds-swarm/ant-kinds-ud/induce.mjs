// induce.mjs — ant-kinds-ud step 1 + K1. Pre-registration: PREREG.md (sha256 in PREREG.sha256).
//   node induce.mjs run --stems eng,spa [--src dev|fold80] [--out DIR] [--S 10] [--ctrl 10] [--mm 5]
// Gold UPOS is read ONLY after induction, to describe kinds; it never enters induction.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readConlluStream } from "../../law/impact.mjs";
import { induce, buildSpace, vectors, kmeans, stability, ari, nmi, mean, median, quantile, round, rngFor, seedFor, shuffleSentences } from "./lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const STEMS = (opt("--stems", "eng")).split(",");
const SRC = opt("--src", "dev");
const OUT = opt("--out", path.join(HERE, SRC === "dev" ? "induced" : "induced-" + SRC));
const S = Number(opt("--S", 10)), CTRL = Number(opt("--ctrl", 10)), MM = Number(opt("--mm", 5));
export const fileOf = (stem, src = SRC) => (src === "dev" ? `/private/tmp/claude-501/ud-eval/${stem}/dev.conllu` : `/private/tmp/claude-501/fold80/${stem}/tail.conllu`);

function runStem(stem) {
  const t0 = Date.now();
  const { sents, upos } = readConlluStream(fileOf(stem));
  const N = sents.length, ntok = sents.reduce((a, s) => a + s.length, 0);
  const tag = `kinds-ud:${stem}:${SRC}`;
  const R = induce(sents, { mm: MM, S, tag });
  const res = { stem, src: SRC, N, tokens: ntok, mm: MM, S };
  if (R.gap) return { ...res, gap: R.gap, nForms: R.nForms };
  const { space, curve, Kstar, top, leaf, parent, nLeaves, subInfo } = R;
  Object.assign(res, { nForms: R.nForms, Kcap: R.Kcap, curve, Kstar, margin: round(R.margin), nLeaves, subInfo });
  // gold description (AFTER induction)
  const dist = Array.from({ length: nLeaves }, () => new Map());
  const tdist = Array.from({ length: Math.max(1, Kstar) }, () => new Map());
  const tokLeaf = [], tokUpos = [], tokTop = [], tokForm = [];
  sents.forEach((s, si) => s.forEach((w, i) => {
    const fi = space.fidx.get(w); if (fi === undefined || leaf[fi] < 0) return;
    const u = upos[si][i];
    dist[leaf[fi]].set(u, (dist[leaf[fi]].get(u) ?? 0) + 1); tdist[top[fi]].set(u, (tdist[top[fi]].get(u) ?? 0) + 1);
    tokLeaf.push(leaf[fi]); tokTop.push(top[fi]); tokUpos.push(u); tokForm.push(fi);
  }));
  const formUpos = new Map(); sents.forEach((s, si) => s.forEach((w, i) => { const m = formUpos.get(w) ?? formUpos.set(w, new Map()).get(w); m.set(upos[si][i], (m.get(upos[si][i]) ?? 0) + 1); }));
  const topU = (m) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
  const leaves = [];
  for (let l = 0; l < nLeaves; l++) {
    const members = []; for (let f = 0; f < space.forms.length; f++) if (leaf[f] === l) members.push(f);
    const total = [...dist[l].values()].reduce((a, b) => a + b, 0) || 1;
    const sh = (u) => (dist[l].get(u) ?? 0) / total;
    const sorted = [...dist[l]].sort((a, b) => b[1] - a[1]);
    members.sort((a, b) => space.cnt.get(space.forms[b]) - space.cnt.get(space.forms[a]));
    leaves.push({ leaf: l, top: parent[l], forms: members.length, tokens: total, purity: round(sorted[0][1] / total, 3), majority: sorted[0][0], propn: round(sh("PROPN"), 3), noun: round(sh("NOUN"), 3), nominal: round(sh("PROPN") + sh("NOUN"), 3), upos: sorted.slice(0, 4).map(([u, n]) => `${u}:${round(n / total, 2)}`).join(" "), members: members.slice(0, 12).map((f) => `${space.forms[f]}/${topU(formUpos.get(space.forms[f]))}`) });
  }
  res.leaves = leaves;
  // K1 controls
  const tokW = null;
  const nmiKindUpos = nmi(tokTop, tokUpos), nmiLeafUpos = nmi(tokLeaf, tokUpos);
  // NMI of kinds induced on a shuffled stream (company destroyed) at the same K*
  let nmiNull = null;
  if (Kstar >= 2) {
    const nl = [];
    for (let r = 0; r < 3; r++) {
      const z = shuffleSentences(sents, seedFor(tag, "nmi-null", r));
      const v = vectors(space, z, null, 0), lab = kmeans(v.X, Kstar, space.nF, rngFor(seedFor(tag, "nmi-null-km", r)), { restarts: 3 });
      const lm = new Map(v.fi.map((f, j) => [f, lab[j]]));
      const tl = [], tu = []; sents.forEach((s, si) => s.forEach((w, i) => { const fi = space.fidx.get(w); if (fi === undefined || !lm.has(fi)) return; tl.push(lm.get(fi)); tu.push(upos[si][i]); }));
      nl.push(nmi(tl, tu));
    }
    nmiNull = round(mean(nl));
  }
  // frequency bands: equal-count bands of the same number as K* over forms with a kind
  const byF = [...Array(space.forms.length).keys()].filter((f) => top[f] >= 0).sort((a, b) => space.cnt.get(space.forms[a]) - space.cnt.get(space.forms[b]) || a - b);
  const band = new Int32Array(space.forms.length).fill(-1); byF.forEach((f, r) => { band[f] = Math.floor((r * Math.max(2, Kstar)) / byF.length); });
  const fa = [], fb = []; for (const f of byF) { fa.push(top[f]); fb.push(band[f]); }
  const nmiBand = round(nmi(fa, fb)), ariBand = round(ari(fa, fb));
  // chronological halves at K*
  let chrono = null, terc = null;
  if (Kstar >= 2) {
    const c = stability(space, sents, null, Kstar, S, tag + ":chrono", { chrono: true });
    chrono = { medObs: round(c.medObs), q95Null: round(c.q95Null), margin: round(c.margin), pass: c.margin != null && c.margin > 0 };
    const third = Math.floor(byF.length / 3);
    terc = [0, 1, 2].map((t) => { const sub = byF.slice(t * third, t === 2 ? byF.length : (t + 1) * third); const r = stability(space, sents, sub, 4, S, tag + ":terc" + t); return { forms: sub.length, medObs: round(r.medObs), q95Null: round(r.q95Null), margin: round(r.margin), pass: r.margin != null && r.margin > 0 }; });
  }
  res.k1 = { a_margin: Kstar >= 2, b_chrono: chrono, c_terciles: terc, tercilesPassed: terc ? terc.filter((x) => x.pass).length : 0, nmiKindsVsFreqBands: nmiBand, ariKindsVsFreqBands: ariBand, nmiKindsUpos: round(nmiKindUpos), nmiLeavesUpos: round(nmiLeafUpos), nmiShuffledKindsUpos: nmiNull };
  res.k1.pass = res.k1.a_margin && chrono?.pass === true && res.k1.tercilesPassed >= 2;
  // control built to fail: the K selection run on shuffled streams must give K*=1 (>= 90%); reduced ladder cost: top-level ladder only
  const ctrl = [], ctrlM = [];
  for (let r = 0; r < CTRL; r++) {
    const z = shuffleSentences(sents, seedFor(tag, "ctrl", r));
    const zs = buildSpace(z, MM);
    let best = 1, bm = 0;
    for (const K of curve.map((c) => c.K)) { const st = stability(zs, z, null, K, S, tag + ":ctrl" + r); if (st.margin != null && st.margin > bm) { bm = st.margin; best = K; } }
    ctrl.push(best); ctrlM.push(round(bm));
  }
  // AMENDMENT A1 (2026-10-06, after the control failed in cmn-hans on the first run): the observed best margin is also ranked against the best margins of the shuffled runs (an empirical p; the dataset-level variance of one shuffle is shared by all its splits, so margin>0 alone has an inflated false-positive rate). The kinds and K* are unchanged.
  res.control = { shuffledKstar: ctrl, shuffledMargins: ctrlM, shareK1: ctrl.length ? round(ctrl.filter((k) => k === 1).length / ctrl.length, 2) : null, obsMargin: round(R.margin), empiricalP: ctrl.length ? round((1 + ctrlM.filter((m) => m >= R.margin).length) / (ctrl.length + 1), 3) : null };
  // form table
  res.forms = space.forms.map((w, f) => [w, space.cnt.get(w), top[f], leaf[f]]);
  res.ms = Date.now() - t0;
  return res;
}

if (args[0] === "run") {
  fs.mkdirSync(OUT, { recursive: true });
  for (const stem of STEMS) {
    const r = runStem(stem);
    fs.writeFileSync(path.join(OUT, `${stem}.json`), JSON.stringify(r));
    console.error(`${stem}: ${r.gap ?? `K*=${r.Kstar} leaves=${r.nLeaves} forms=${r.nForms} k1=${r.k1?.pass} nmiBand=${r.k1?.nmiKindsVsFreqBands} ctrlShareK1=${r.control?.shareK1}`} ${r.ms}ms`);
  }
}
