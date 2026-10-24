// learn-select.mjs — train the atom selector (native/organs/atom-select.js) on the judged atoms of some sets and estimate, on a held-out one,
// the precision and recall the kept atoms would have had, from that set's own judges (precision: stated among kept; recall: gold atoms the
// recall judge found in a kept atom). The threshold is chosen inside the training sets (each one held out in turn), never on the test set.
//   node eval/meaning/atoms/learn-select.mjs --train a,b --test c [--model out.json]    (a set: <sentences.json>:<system.json>:<judged dir>)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { atomFeatures, scoreAtom, trainSelector } = await import(path.join(HERE, "../../../native/organs/atom-select.js"));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
function loadSet(spec) {
  const [sents, sys, judged] = spec.split(":"), S = new Map(read(sents).map((s) => [s.sid, s])), Y = new Map(read(sys).sentences.map((s) => [s.sid, s]));
  const P = new Map(), R = [];
  for (let k = 0; k < 4; k++) { for (const v of read(path.join(judged, `judged-P${k}.json`))) P.set(`${v.sid}\t${v.i}`, v.verdict === "stated"); R.push(...read(path.join(judged, `judged-R${k}.json`))); }
  const atoms = [];
  for (const [sid, y] of Y) { const s = S.get(sid); (y.atoms ?? []).forEach((a, i) => { if (P.has(`${sid}\t${i}`)) atoms.push({ sid, i, y: P.get(`${sid}\t${i}`), f: atomFeatures(a, { sentence: s.sentence, atoms: y.atoms, title: s.title, lang: s.lang }) }); }); }
  return { atoms, R };
}
const measure = (set, model, th) => {
  const kept = new Set(set.atoms.filter((a) => scoreAtom(a.f, model) > th).map((a) => `${a.sid}\t${a.i}`));
  const st = set.atoms.filter((a) => kept.has(`${a.sid}\t${a.i}`) && a.y).length;
  const found = set.R.filter((r) => r.found && (r.by ?? []).some((i) => kept.has(`${r.sid}\t${i}`))).length;
  return { A1: (100 * st) / Math.max(1, kept.size), A2: (100 * found) / Math.max(1, set.R.length), kept: kept.size, of: set.atoms.length };
};
const train = arg("train").split(",").map(loadSet), test = loadSet(arg("test")), all = (xs) => xs.flatMap((s) => s.atoms.map((a) => [a.f, a.y]));
// the threshold: the share of atoms to keep that, with each training set held out in turn, best keeps precision up without losing recall
// (their harmonic mean); a share, not a raw score, since one model's scores are not on another's scale
const hm = (m) => (2 * m.A1 * m.A2) / Math.max(1e-9, m.A1 + m.A2);
const at = (set, model, q) => { const sc = set.atoms.map((a) => scoreAtom(a.f, model)).sort((a, b) => b - a); return q >= 1 ? -1e9 : sc[Math.floor(q * sc.length)]; };
const qs = [1, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6];
let q = 1;
if (train.length > 1) {
  const inner = train.map((held, j) => ({ held, model: trainSelector(all(train.filter((_, k) => k !== j))) }));
  q = qs.map((x) => [x, inner.reduce((a, i) => a + hm(measure(i.held, i.model, at(i.held, i.model, x))), 0)]).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}
const m0 = trainSelector(all(train)), pooled = { atoms: train.flatMap((s) => s.atoms) };
const model = { ...m0, keepShare: q, threshold: +at(pooled, m0, q).toFixed(4) };
if (arg("model")) fs.writeFileSync(arg("model"), JSON.stringify(model));
const base = measure(test, { w: {} }, -1), got = measure(test, model, model.threshold);
console.log(JSON.stringify({ threshold: model.threshold, keepAll: { A1: base.A1.toFixed(1), A2: base.A2.toFixed(1), n: base.kept }, selected: { A1: got.A1.toFixed(1), A2: got.A2.toFixed(1), kept: `${got.kept}/${got.of}` } }));
if (process.argv.includes("--curve")) {
  const sc = test.atoms.map((a) => scoreAtom(a.f, model)).sort((a, b) => b - a);
  for (const q of [1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5]) { const t = q >= 1 ? -1e9 : sc[Math.floor(q * sc.length)]; const m = measure(test, model, t); console.log(`  keep ${q * 100}%: A1 ${m.A1.toFixed(1)} A2 ${m.A2.toFixed(1)}`); }
}
