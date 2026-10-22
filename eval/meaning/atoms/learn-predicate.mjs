// learn-predicate.mjs — train the predicate chooser (native/organs/atom-predicate.js) on gold predicates and measure it on a held-out set.
// A path candidate whose participants meet a gold atom (proxy-recall.mjs, by their words in the sentence) is an example; its right options
// are those whose words best name that gold atom's predicate (atom-predicate.js overlap), when any option names it at all.
//   node eval/meaning/atoms/learn-predicate.mjs --train a,b,… --test c [--model out.json]      (a set: <dir>:<cands.json>)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { optionsOf, overlap, trainChooser, choosePredicate } = await import(path.join(HERE, "../../../native/organs/atom-predicate.js"));
const { metBy } = await import(path.join(HERE, "proxy-recall.mjs"));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
export function examplesOf(spec) {
  const [dir, cands] = spec.split(":"), S = new Map(read(path.join(dir, "sentences.json")).map((s) => [s.sid, s])), G = read(path.join(dir, "gold.json")), Y = new Map(read(cands).sentences.map((s) => [s.sid, s]));
  const out = [];
  for (const g of G.sentences) {
    const ctx = { mentions: g.mentions, entities: G.entities[S.get(g.sid).title] ?? [] }, lang = S.get(g.sid).lang;
    for (const c0 of Y.get(g.sid)?.cands ?? []) {
      if (c0.args.length < 2 || c0.copula || !(c0.words ?? []).length) continue;
      const c = { ...c0, lang }, asWords = { pred: c.pred, args: c.args.map((a, i) => ({ ...a, texts: [c.surfaces?.[i]] })) };
      const golds = g.atoms.filter((ga) => ga.args.length >= 2 && metBy(ga, [asWords], ctx).length);
      if (!golds.length) continue;
      const os = optionsOf(c), sc = os.map((o) => Math.max(...golds.map((ga) => overlap(c, o, ga.pred)))), best = Math.max(...sc);
      if (best <= 0) { out.push({ cand: c, right: [], gold: golds.map((x) => x.pred) }); continue; }
      out.push({ cand: c, right: sc.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0), gold: golds.map((x) => x.pred) });
    }
  }
  return out;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const train = arg("train").split(",").flatMap(examplesOf), test = examplesOf(arg("test"));
  const model = trainChooser(train.filter((e) => e.right.length));
  if (arg("model")) fs.writeFileSync(arg("model"), JSON.stringify(model));
  const lab = test.filter((e) => e.right.length);
  const acc = (pick) => (100 * lab.filter((e) => { const os = optionsOf(e.cand), p = pick(e, os); return e.right.includes(p); }).length) / lab.length;
  const learned = acc((e, os) => os.findIndex((o) => o.pred === choosePredicate(e.cand, model)));
  const joined = acc((e, os) => { const i = os.findIndex((o) => o.pred === e.cand.pred); return i; });
  const first = acc(() => 0);
  console.log(`train ${train.length} aligned (${train.filter((e) => e.right.length).length} with a naming option); test ${lab.length} of ${test.length}: learned ${learned.toFixed(1)}%, all words joined (run 17) ${joined.toFixed(1)}%, first word ${first.toFixed(1)}%`);
}
