// atom-predicate.js — which of a path's words name the relation, chosen by a LEARNED ranker. A produced atom (atom-produce.js) carries the
// words on its dependency path: the content words between its participants and the case words of the second. The options are each word
// alone and each ordered pair of them (a verb and its case word: "flow_into"); a linear model scores each option by its words' parts of
// speech, roles, relations and lemmas (and their English keys, so languages share what they learn) and the best one is the predicate. The
// weights come from gold predicates (runs 13–17): an option is right when its words are the gold predicate's words, directly or by key.
//   optionsOf(cand) → [{ ids: [i…], pred }];  choosePredicate(cand, model) → pred;  trainChooser(examples) → model (PredicateChooser@1)
const low = (s) => String(s ?? "").normalize("NFC").toLowerCase();
const st = (w) => low(w).replace(/[^\p{L}\p{N}]/gu, "").slice(0, 5);

export function optionsOf(cand) {
  if (cand.copula) return [{ ids: [], pred: "is_a" }];
  const W = cand.words ?? [], out = [];
  if (!W.length) return [{ ids: [], pred: cand.pred }];
  W.forEach((_, i) => out.push({ ids: [i] }));
  for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) out.push({ ids: [i, j] });
  if (W.length > 2) out.push({ ids: W.map((_, i) => i) }); // every word, as the producer joined them
  for (const o of out) o.pred = o.ids.map((i) => W[i].lemma).join("_");
  return out;
}
export function optionFeatures(cand, o) {
  const W = cand.words ?? [], ws = o.ids.map((i) => W[i]), lang = cand.lang ?? "-";
  const shape = ws.map((w) => `${w.role}:${w.upos}`).join("+");
  const f = [`shape=${shape}`, `n=${ws.length}`, `all=${ws.length === W.length ? 1 : 0}`, `of=${W.length}`, `sig|${cand.sig}|${shape}`];
  for (const w of ws) f.push(`w:${w.role}:${w.upos}:${w.deprel}`, `w:lca=${w.lca ? 1 : 0}:${w.upos}`, `lemma=${w.lemma}`, `key=${w.keys?.[0] ?? w.lemma}`);
  // what is left out: a verb or case word the option skips
  for (const [i, w] of W.entries()) if (!o.ids.includes(i)) f.push(`skip:${w.role}:${w.upos}`);
  const out = []; for (const x of f) out.push(x, `${lang}|${x}`);
  out.push("bias");
  return out;
}
const score = (fs, w) => fs.reduce((a, x) => a + (w[x] ?? 0), 0);
export function choosePredicate(cand, model) {
  const os = optionsOf(cand); if (os.length === 1) return os[0].pred;
  let best = os[0], bv = -Infinity;
  for (const o of os) { const v = score(optionFeatures(cand, o), model?.w ?? {}); if (v > bv) { bv = v; best = o; } }
  return best.pred;
}
// how well an option's words name a gold predicate: words whose lemma or English key shares a stem with one of the gold predicate's words,
// less half a point for each word that does not (the gold writes "located_in", "flows_into", "has_length": English, any language)
const GENERIC = new Set(["has", "is", "a", "the", "be", "of_the"]);
export function overlap(cand, o, goldPred) {
  const gs = new Set(low(goldPred).split(/[_\s:]+/).filter((x) => x && !GENERIC.has(x)).map(st));
  const W = cand.words ?? []; let hit = 0, miss = 0;
  for (const i of o.ids) { const w = W[i], ss = [w.lemma, ...(w.keys ?? [])].flatMap((k) => low(k).split(/\s+/)).map(st).filter((x) => x.length >= 2); if (ss.some((x) => gs.has(x) || [...gs].some((g) => g.length >= 4 && x.length >= 4 && (g.startsWith(x) || x.startsWith(g))))) hit++; else miss++; }
  return hit - 0.5 * miss;
}
// examples: [{ cand, right: [option index…] }]; an averaged ranking perceptron, as the other learned organs here
export function trainChooser(examples, { epochs = 10, seed = 11 } = {}) {
  const w = {}, tot = {}, ts = {}; let t = 0, r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const upd = (fs, d) => { for (const x of fs) { tot[x] = (tot[x] ?? 0) + (t - (ts[x] ?? 0)) * (w[x] ?? 0); ts[x] = t; w[x] = (w[x] ?? 0) + d; } };
  for (let ep = 0; ep < epochs; ep++) for (const { cand, right } of [...examples].sort(() => rand() - 0.5)) {
    const os = optionsOf(cand), fs = os.map((o) => optionFeatures(cand, o)), vs = fs.map((f) => score(f, w));
    t++;
    const p = vs.indexOf(Math.max(...vs)); if (right.includes(p)) continue;
    const g = right.reduce((a, i) => (vs[i] > vs[a] ? i : a), right[0]);
    upd(fs[g], 1); upd(fs[p], -1);
  }
  const avg = {}; for (const x of Object.keys(w)) { const a = ((tot[x] ?? 0) + (t - (ts[x] ?? 0)) * w[x]) / Math.max(1, t); if (Math.abs(a) > 1e-9) avg[x] = +a.toFixed(5); }
  return { schema: "PredicateChooser@1", w: avg };
}
