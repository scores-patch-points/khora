// retrieve.mjs <id8>... — PREREG-PARAPHRASE.md retrieval metric. For each question (from answers/<id>.json, whose questions were selected by select-questions.py): is a reference answer (SQuAD-normalised, <= 4 words) inside one of the
// top-k sentences under (P) plain BM25, (Fo) BM25 over fold classes, (W) window+fold (radius 2, anchors counted once per window). Background text = the round-1 books (manifest order, first 10 ok entries) plus the target book. Gold is used only to score.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { buildFold, wordsOf } from './fold.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ids = process.argv.slice(2).filter((x) => !x.startsWith('--')); const R = 2;
const man = JSON.parse(fs.readFileSync(path.join(HERE, 'books-manifest.json'), 'utf8')).filter((m) => m.ok); const round1 = man.slice(0, 10);
const normT = (s) => ' ' + s.toLowerCase().replace(/[!-/:-@[-`{-~]/g, '').replace(/\b(a|an|the)\b/g, ' ').split(/\s+/).filter(Boolean).join(' ') + ' ';
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : 0; };
const rows = [];
for (const id of ids) {
  const m = man.find((x) => x.document_id.startsWith(id)); const bg = round1.map((x) => fs.readFileSync(path.join(HERE, x.file), 'utf8')); if (!round1.includes(m)) bg.push(fs.readFileSync(path.join(HERE, m.file), 'utf8'));
  const F = buildFold(bg); const W = JSON.parse(fs.readFileSync(path.join(HERE, 'weft', `${id}.weft.json`), 'utf8')); const S = W.sentences; const N = S.length;
  const lex = new Map(); for (const c of W.clauses ?? []) if (c.predicate?.head && c.predicate?.lemma) lex.set(String(c.predicate.head).toLowerCase(), String(c.predicate.lemma).toLowerCase());
  const lem = (w) => lex.get(w) ?? w; const st = S.map((s) => wordsOf(s.text).map(lem)); const sets = st.map((t) => new Set(t)); const NT = st.map((t) => t.length), avg = NT.reduce((a, b) => a + b, 0) / N;
  const df = new Map(); for (const s of sets) for (const w of s) df.set(w, (df.get(w) ?? 0) + 1);
  const surp = (w) => -Math.log2((df.get(w) ?? 0.5) / N);
  const Q = JSON.parse(fs.readFileSync(path.join(HERE, 'answers', `${id}.json`), 'utf8')).answers;
  const WH = new Set(['who', 'whom', 'whose', 'what', 'which', 'where', 'how', 'many', 'much']);
  for (const r of Q) {
    const g = r.answers.filter((a) => a.split(/\s+/).length <= 4).map(normT).filter((x) => x.trim()); const gold = new Set(); S.forEach((s, i) => { const t = normT(s.text); if (g.some((x) => t.includes(x))) gold.add(i); });
    const qt = [...new Set(wordsOf(r.q).map(lem))].filter((w) => !WH.has(w)); const ws = qt.map(surp), med = median(ws); const content = qt.filter((w, i) => ws[i] >= med);
    // plain: BM25 on exact (lemma) terms
    const plain = st.map((t, i) => { const tf = new Map(); for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1); let sc = 0; for (const w of content) { const f = tf.get(w) ?? 0; if (!f) continue; const d = df.get(w) ?? 0; sc += Math.log(1 + (N - d + 0.5) / (d + 0.5)) * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * NT[i] / avg)); } return sc; });
    // fold classes: w + the book words folded with it (class present in a sentence if any member is)
    const classes = content.map((w) => { const mem = new Set([w]); for (const f of F.foldOf(w)) if (df.has(lem(f.word))) mem.add(lem(f.word)); return [...mem]; });
    const cdf = classes.map((c) => sets.reduce((n, s) => n + (c.some((w) => s.has(w)) ? 1 : 0), 0));
    const present = classes.map((c) => sets.map((s) => c.some((w) => s.has(w))));
    const fold = S.map((_, i) => { let sc = 0; classes.forEach((c, k) => { if (!present[k][i]) return; let f = 0; for (const w of st[i]) if (c.includes(w)) f++; const d = cdf[k]; sc += Math.log(1 + (N - d + 0.5) / (d + 0.5)) * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * NT[i] / avg)); }); return sc; });
    const win = S.map((_, i) => { let sc = 0; classes.forEach((c, k) => { let hit = false; for (let d = Math.max(0, i - R); d <= Math.min(N - 1, i + R); d++) if (present[k][d]) { hit = true; break; } if (hit) sc += Math.log(1 + (N - cdf[k] + 0.5) / (cdf[k] + 0.5)); }); return sc; });
    const rank = (sc, set) => { let best = Infinity; for (const i of set) { const r1 = 1 + sc.reduce((n, x, j) => n + (j !== i && x >= sc[i] ? 1 : 0), 0); if (r1 < best) best = r1; } return best; };   // pessimistic ties: every other sentence scoring >= it counts as ahead
    // window reach: gold in the union of the top-5 windows' sentences
    const order = [...win.keys()].sort((a, b) => win[b] - win[a] || fold[b] - fold[a] || a - b); const topW = []; for (const c of order) { if (win[c] <= 0) break; if (topW.every((t) => Math.abs(t - c) > R)) topW.push(c); if (topW.length === 5) break; } const reachW = topW.some((c) => [...gold].some((i) => Math.abs(i - c) <= R));
    const overlap = content.some((w) => [...gold].some((i) => sets[i].has(w)));   // R5 subset: the answer sentence shares a content term (exact lemma) with the question
    rows.push({ book: id, q: r.q, gold: gold.size, plain: rank(plain, gold), fold: rank(fold, gold), win: rank(win, gold), reachW, overlap, nfold: classes.reduce((n, c) => n + c.length - 1, 0), ncontent: content.length });
  }
  console.error(id, 'done', F.V, 'types');
}
fs.writeFileSync(path.join(HERE, process.env.OUT ?? 'retrieval-rows.json'), JSON.stringify(rows));
const sh = (f, k) => (rows.filter((r) => f(r) <= k).length / rows.length).toFixed(3);
console.log('questions', rows.length, ' folds per question mean', (rows.reduce((a, r) => a + r.nfold, 0) / rows.length).toFixed(1));
for (const [nm, key] of [['plain BM25', 'plain'], ['fold BM25', 'fold'], ['window+fold (pessimistic ties)', 'win']]) console.log(nm.padEnd(34), 'top1', sh((r) => r[key], 1), 'top5', sh((r) => r[key], 5), 'top25', sh((r) => r[key], 25), 'median rank', median(rows.map((r) => r[key])));
console.log('window top-5 windows reach (<=25 sentences):', (rows.filter((r) => r.reachW).length / rows.length).toFixed(3));
const z = rows.filter((r) => !r.overlap); console.log('R5 subset (no exact content-lemma overlap with answer sentence) n=', z.length, ' plain top5', (z.filter((r) => r.plain <= 5).length / z.length).toFixed(3), ' fold top5', (z.filter((r) => r.fold <= 5).length / z.length).toFixed(3), ' win reach', (z.filter((r) => r.reachW).length / z.length).toFixed(3));
