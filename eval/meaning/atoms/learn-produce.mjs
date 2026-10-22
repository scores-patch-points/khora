// learn-produce.mjs — train the atom producer (native/organs/atom-produce.js) on gold atoms and estimate, on a held-out set, what its atoms
// add, by the mechanical proxy (proxy-recall.mjs; ~70% agreement with the recall judges on runs 13–16): recall = gold atoms some atom meets;
// precision = atoms that meet some gold atom. A candidate is a positive training example when it meets a gold atom of its sentence (its
// arguments by their words in the sentence). The threshold is chosen inside the training sets (each held out in turn), never on the test.
//   node eval/meaning/atoms/learn-produce.mjs --train a,b,c --test d [--model out.json]     (a set: <dir>:<cands.json from run.mjs CANDS=1>)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { trainProducer, scoreOf, select } = await import(path.join(HERE, "../../../native/organs/atom-produce.js"));
const { metBy } = await import(path.join(HERE, "proxy-recall.mjs"));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const key = (a) => a.entity ?? String(a.value ?? "").toLowerCase();
function loadSet(spec) {
  const [dir, cands] = spec.split(":"), S = new Map(read(path.join(dir, "sentences.json")).map((s) => [s.sid, s])), G = read(path.join(dir, "gold.json")), Y = new Map(read(cands).sentences.map((s) => [s.sid, s]));
  return G.sentences.map((g) => {
    const y = Y.get(g.sid) ?? { atoms: [], cands: [] }, ctx = { mentions: g.mentions, entities: G.entities[S.get(g.sid).title] ?? [] };
    const base = y.atoms ?? [], have = new Set(base.map((a) => (a.args ?? []).map(key).sort().join("\t")));
    const cands = (y.cands ?? []).filter((c) => c.args.length === 1 || !have.has(c.args.map(key).sort().join("\t")));
    // the label: the candidate, its arguments as the sentence words them, meets a gold atom
    const asWords = (c) => ({ pred: c.pred, args: c.args.map((a, i) => ({ ...a, texts: [c.surfaces?.[i]] })) });
    const y1 = cands.map((c) => g.atoms.some((ga) => metBy(ga, [asWords(c)], ctx).length > 0));
    return { sid: g.sid, gold: g.atoms, ctx, base, cands, y: y1 };
  });
}
// the proxy over a set with the candidates above t added (the atoms as the system names its arguments, as the judges read them)
function measure(set, model, t) {
  let met = 0, n = 0, good = 0, all = 0, addG = 0, add = 0;
  for (const s of set) {
    const extra = select(s.cands, { ...model, threshold: t }, { have: s.base }).map(([c]) => c), atoms = [...s.base, ...extra];
    for (const ga of s.gold) { n++; if (metBy(ga, atoms, s.ctx).length) met++; }
    for (const a of atoms) { all++; const ok = s.gold.some((ga) => metBy(ga, [a], s.ctx).length > 0); if (ok) good++; if (extra.includes(a)) { add++; if (ok) addG++; } }
  }
  return { R: (100 * met) / n, P: (100 * good) / all, added: add, addedP: add ? (100 * addG) / add : 0 };
}
const train = arg("train").split(",").map(loadSet), test = loadSet(arg("test"));
const ex = (xs) => xs.flat().flatMap((s) => s.cands.map((c, i) => [c.feats, s.y[i]]));
// the producer trained from five shuffles, its weights averaged (as the coreference ranker)
const bag = (xs) => { const ms = [1, 2, 3, 4, 5].map((sd) => trainProducer(xs, { seed: 7 * sd })), w = {}; for (const m of ms) for (const [x, v] of Object.entries(m.w)) w[x] = (w[x] ?? 0) + v / ms.length; return { schema: "AtomProducer@1", seeds: ms.length, w }; };
const hm = (m) => (2 * m.P * m.R) / Math.max(1e-9, m.P + m.R);
const ths = [-0.5, -0.25, 0, 0.25, 0.5, 1, 1.5, 2, 3, 1e9];
let th = 0;
if (train.length > 1) {
  const inner = train.map((held, j) => ({ held, model: bag(ex(train.filter((_, k) => k !== j))) }));
  th = ths.map((t) => [t, inner.reduce((a, i) => a + hm(measure(i.held, i.model, t)), 0)]).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}
const model = { ...bag(ex(train)), threshold: th };
if (arg("model")) fs.writeFileSync(arg("model"), JSON.stringify(model));
const pos = ex(train).filter((e) => e[1]).length;
const before = measure(test, model, 1e12), after = measure(test, model, th);
const f = (m) => `R ${m.R.toFixed(1)} P ${m.P.toFixed(1)}`;
console.log(`train ${ex(train).length} candidates (${pos} meet gold); threshold ${th}; test: atoms.js ${f(before)} → with produced ${f(after)} (+${after.added} atoms, ${after.addedP.toFixed(0)}% meet gold)`);
if (process.argv.includes("--curve")) for (const t of ths) { const m = measure(test, model, t); console.log(`  t=${t}: ${f(m)} +${m.added} (${m.addedP.toFixed(0)}%)`); }
