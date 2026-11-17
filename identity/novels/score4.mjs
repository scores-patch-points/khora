// score4.mjs <id8>... — holograph query (answer4.mjs) on DEVELOPMENT books (all seen): cut size, gold-in-shown vs chance, ranks, F1/EM of H (the graph's act) vs E.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ids = process.argv.slice(2);
const norm = (s) => s.toLowerCase().replace(/[!-/:-@[-`{-~]/g, '').replace(/\b(a|an|the)\b/g, ' ').split(/\s+/).filter(Boolean);
const f1 = (p, g) => { const a = norm(p), b = norm(g); if (!a.length || !b.length) return +(a.length === b.length); const c = new Map(); for (const t of b) c.set(t, (c.get(t) ?? 0) + 1); let o = 0; for (const t of a) if (c.get(t) > 0) { o++; c.set(t, c.get(t) - 1); } if (!o) return 0; const p_ = o / a.length, r_ = o / b.length; return 2 * p_ * r_ / (p_ + r_); };
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const rows = ids.flatMap((id) => { const W = JSON.parse(fs.readFileSync(path.join(HERE, 'weft', id + '.weft.json'), 'utf8')); return JSON.parse(fs.readFileSync(path.join(HERE, 'answers4', id + '.json'), 'utf8')).answers.map((r) => ({ ...r, NS: W.sentences.length })); });
const ref = rows.filter((r) => r.basis === 'referent'), sur = rows.filter((r) => r.basis !== 'referent');
console.log('questions', rows.length, ' referent basis', ref.length, ' surface fallback', sur.length);
console.log('cut size (sentences shown) mean', mean(ref.map((r) => r.shown)).toFixed(1), ' median', ref.map((r) => r.shown).sort((a, b) => a - b)[ref.length >> 1], ' as share of book', mean(ref.map((r) => r.shown / r.NS)).toFixed(4));
console.log('gold sentence inside the cut:', mean(ref.map((r) => +r.goldInShown)).toFixed(3), ' chance for the same share:', mean(ref.map((r) => r.shown / r.NS)).toFixed(4));
for (const k of ['plain', 'E', 'H']) console.log('retrieval', k.padEnd(5), 'top5', mean(rows.map((r) => +(r.rank[k] <= 5))).toFixed(3), 'top25', mean(rows.map((r) => +(r.rank[k] <= 25))).toFixed(3), '| referent-basis only top5', mean(ref.map((r) => +(r.rank[k] <= 5))).toFixed(3), 'top25', mean(ref.map((r) => +(r.rank[k] <= 25))).toFixed(3));
const sc = (key, set) => { const v = set.map((r) => { const x = r[key]?.text; return x == null ? [0, 0] : [Math.max(...r.answers.map((g) => f1(x, g))), Math.max(...r.answers.map((g) => +(norm(x).join(' ') === norm(g).join(' '))))]; }); return `F1 ${mean(v.map((x) => x[0])).toFixed(3)} EM ${mean(v.map((x) => x[1])).toFixed(3)} answered ${set.filter((r) => r[key]).length}/${set.length}`; };
console.log('E (round 3) ', sc('E', rows)); console.log('H (graph act)', sc('H', rows)); const hm = rows.filter((r) => r.H?.actMatch); console.log('H where the act matched a question lemma:', hm.length, sc('H', hm));
