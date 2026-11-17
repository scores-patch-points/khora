// salience-test.mjs — does answer-bearing-ness correlate with holograph surprise? AUC of gold vs other sentences per question, mean over questions; with the prior (other books) and without. SPENT books only.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { salienceOf } from './salience.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const man = JSON.parse(fs.readFileSync(path.join(HERE, 'books-manifest.json'), 'utf8')).filter((m) => m.ok);
const spent = man.slice(0, 10), ids = ['9562ea78', 'b6154115', 'c9fab7d8', 'feacf157', '14fc0de6', '72ddeff1', '3bbc2ac0', '95e9be5f', '4a92bf27'];
const load = (m) => ({ W: JSON.parse(fs.readFileSync(path.join(HERE, 'weft', m.document_id.slice(0, 8) + '.weft.json'), 'utf8')), T: fs.readFileSync(path.join(HERE, m.file), 'utf8') });
const norm = (s) => ' ' + s.toLowerCase().replace(/[!-/:-@[-`{-~]/g, '').replace(/\b(a|an|the)\b/g, ' ').split(/\s+/).filter(Boolean).join(' ') + ' ';
const auc = (sc, gold) => { let w = 0, n = 0; const G = [...gold]; if (!G.length || G.length === sc.length) return null; const others = sc.map((x, i) => i).filter((i) => !gold.has(i)); for (const g of G) for (const o of others) { w += sc[g] > sc[o] ? 1 : sc[g] === sc[o] ? 0.5 : 0; n++; } return w / n; };
const A = { prior: [], local: [] };
for (const id of ids) {
  const m = man.find((x) => x.document_id.startsWith(id)); const { W, T } = load(m); const others = spent.filter((x) => x !== m).map(load);
  const sP = salienceOf(W, T, others.map((o) => o.W), others.map((o) => o.T)), sL = salienceOf(W, T, [], []);
  const S = W.sentences.map((s) => norm(s.text));
  for (const r of JSON.parse(fs.readFileSync(path.join(HERE, 'answers', id + '.json'), 'utf8')).answers) { const g = r.answers.filter((a) => a.split(/\s+/).length <= 4).map(norm).filter((x) => x.trim()); const gold = new Set(S.map((t, i) => i).filter((i) => g.some((x) => S[i].includes(x))));
    // the answer sentence is also where names recur; control: a sentence-length proxy
    const a1 = auc([...sP], gold), a2 = auc([...sL], gold); if (a1 != null) { A.prior.push(a1); A.local.push(a2); } }
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
for (const k of ['prior', 'local']) console.log(k.padEnd(6), 'mean AUC', mean(A[k]).toFixed(3), ' se', (sd(A[k]) / Math.sqrt(A[k].length)).toFixed(3), ' n', A[k].length);
