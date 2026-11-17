// score5.mjs <id8>... — holograph query (answer4.mjs) on DEVELOPMENT books (all seen): cut size, gold-in-shown vs chance, ranks, F1/EM of H (the graph's act) vs E.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ids = process.argv.slice(2);
const norm = (s) => s.toLowerCase().replace(/[!-/:-@[-`{-~]/g, '').replace(/\b(a|an|the)\b/g, ' ').split(/\s+/).filter(Boolean);
const f1 = (p, g) => { const a = norm(p), b = norm(g); if (!a.length || !b.length) return +(a.length === b.length); const c = new Map(); for (const t of b) c.set(t, (c.get(t) ?? 0) + 1); let o = 0; for (const t of a) if (c.get(t) > 0) { o++; c.set(t, c.get(t) - 1); } if (!o) return 0; const p_ = o / a.length, r_ = o / b.length; return 2 * p_ * r_ / (p_ + r_); };
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const rows = ids.flatMap((id) => { const W = JSON.parse(fs.readFileSync(path.join(HERE, 'weft', id + '.weft.json'), 'utf8')); return JSON.parse(fs.readFileSync(path.join(HERE, 'answers5', id + '.json'), 'utf8')).answers.map((r) => ({ ...r, NS: W.sentences.length })); });
const ref = rows.filter((r) => r.basis === 'referent'), sur = rows.filter((r) => r.basis !== 'referent'); const ref4 = rows.filter((r) => r.basis4 === 'referent');
console.log('questions', rows.length, ' referent basis: untracked', ref.length, ' tracked', ref4.length);
const cut = (set, k, k2) => `cut mean ${mean(set.map((r) => r[k])).toFixed(1)} median ${set.map((r) => r[k]).sort((a, b) => a - b)[set.length >> 1]} share of book ${mean(set.map((r) => r[k] / r.NS)).toFixed(4)}`;
console.log('H  (untracked)', cut(ref, 'shown'), ' gold inside cut', mean(ref.map((r) => +r.goldInShown)).toFixed(3));
console.log('H4 (tracked)  ', cut(ref4, 'shown4'), ' gold inside cut', mean(ref4.map((r) => +r.goldInShown4)).toFixed(3));
for (const k of ['plain', 'E', 'H', 'H4']) console.log('retrieval', k.padEnd(5), 'top5', mean(rows.map((r) => +(r.rank[k] <= 5))).toFixed(3), 'top25', mean(rows.map((r) => +(r.rank[k] <= 25))).toFixed(3));
const sc = (key, set) => { const v = set.map((r) => { const x = r[key]?.text; return x == null ? [0, 0] : [Math.max(...r.answers.map((g) => f1(x, g))), Math.max(...r.answers.map((g) => +(norm(x).join(' ') === norm(g).join(' '))))]; }); return `F1 ${mean(v.map((x) => x[0])).toFixed(3)} EM ${mean(v.map((x) => x[1])).toFixed(3)} answered ${set.filter((r) => r[key]).length}/${set.length}`; };
for (const k of ['E', 'H', 'H4']) console.log(k.padEnd(3), sc(k, rows)); const ans4 = rows.filter((r) => r.H4); console.log('H4 on the questions it answered:', sc('H4', ans4), ' | E on those same:', sc('E', ans4)); const m4 = rows.filter((r) => r.H4?.actMatch); console.log('H4 where the act matched a question lemma:', sc('H4', m4));
