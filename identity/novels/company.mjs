// company.mjs <id8>... — PREREG-ROUND7.md. A referent is the company it keeps: query-likelihood over each referent's company (sentences within +-1 of its mentions), Dirichlet-smoothed with mu = the mean company length,
// times a prior = the referent's share of mention-sentences. Answers questions that name no referent. Variants: C (prior + likelihood), PRIOR, LIK. B1 from round 1's frozen answers/.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { seeded } from './attend.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ids = process.argv.slice(2);
const wordsOf = (s) => (String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []); const normT = (s) => s.toLowerCase().replace(/[!-/:-@[-`{-~]/g, '').replace(/\b(a|an|the)\b/g, ' ').split(/\s+/).filter(Boolean);
const f1t = (p, g) => { const a = normT(p), b = normT(g); if (!a.length || !b.length) return +(a.length === b.length); const c = new Map(); for (const t of b) c.set(t, (c.get(t) ?? 0) + 1); let o = 0; for (const t of a) if (c.get(t) > 0) { o++; c.set(t, c.get(t) - 1); } if (!o) return 0; const p_ = o / a.length, r_ = o / b.length; return 2 * p_ * r_ / (p_ + r_); };
const WH = new Set(['who', 'whom', 'whose', 'what', 'which', 'where', 'how', 'many', 'much']); const GLOBAL = /\b(story|novel|play|book|protagonist|main character|narrative|poem)\b/i;
const rows = [];
for (const id of ids) {
  const W = JSON.parse(fs.readFileSync(path.join(HERE, 'weft', id + '.weft.json'), 'utf8')), TR = JSON.parse(fs.readFileSync(path.join(HERE, 'tracked', id + '.json'), 'utf8')); const Q = JSON.parse(fs.readFileSync(path.join(HERE, `questions-${id}.json`), 'utf8')); const A1 = JSON.parse(fs.readFileSync(path.join(HERE, 'answers', id + '.json'), 'utf8')).answers;
  const S = W.sentences, N = S.length, off = S.map((s) => s.offset); const sentOf = (p) => { let a = 0, b = N - 1; while (a < b) { const k = (a + b + 1) >> 1; if (off[k] <= p) a = k; else b = k - 1; } return a; };
  const ms = new Map(), nameOf = new Map(), allNames = new Map(); for (const c of W.cast ?? []) { ms.set(c.ref, new Set((c.mentionSpans ?? []).map((sp) => sentOf(sp[0])))); nameOf.set(c.ref, c.surface); allNames.set(c.ref, (c.allSurfaces ?? [c.surface]).map((x) => x.toLowerCase())); }
  for (const [k, ref] of Object.entries(TR.args)) { const sn = W.clauses[+k.split(':')[0]]?.sentence; if (sn != null && ms.has(ref)) ms.get(ref).add(sn); } for (const b of TR.bindings) if (ms.has(b.ref)) ms.get(b.ref).add(sentOf(b.offset));
  const st = S.map((s) => wordsOf(s.text)); const tot = new Map(); let T = 0; for (const t of st) for (const w of t) { tot.set(w, (tot.get(w) ?? 0) + 1); T++; } const pb = (w) => ((tot.get(w) ?? 0) + 0.5) / (T + 1);
  const df = new Map(); for (const t of st) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1); const surp = (w) => -Math.log2((df.get(w) ?? 0.5) / N);
  const docs = []; let msum = 0; for (const [r, ss] of ms) { if (!ss.size) continue; const idx = new Set(); for (const i of ss) for (const d of [-1, 0, 1]) if (i + d >= 0 && i + d < N) idx.add(i + d); const tf = new Map(); let len = 0; for (const i of idx) for (const w of st[i]) { tf.set(w, (tf.get(w) ?? 0) + 1); len++; } docs.push({ r, tf, len, mass: ss.size }); msum += ss.size; }
  const mu = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length);
  const surfaces = new Set([...allNames.values()].flat().map((x) => normT(x).join(' ')));
  Q.forEach((q, qi) => {
    const ql = q.q.toLowerCase(); const named = [...allNames.values()].some((ns) => ns.some((n) => n.length > 2 && new RegExp('(^|[^\\p{L}])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'u').test(ql))); if (named) return;
    const gold = q.answers.filter((a) => a.split(/\s+/).length <= 4); const isRef = gold.some((a) => surfaces.has(normT(a).join(' '))); const qw = [...new Set(wordsOf(q.q))].filter((w) => !WH.has(w)); const sv = qw.map(surp).sort((a, b) => a - b); const med = sv[sv.length >> 1] ?? 0; const terms = qw.filter((w) => surp(w) >= med);
    const best = (fn) => { let b = null; for (const d of docs) { const s = fn(d); if (!b || s > b.s || (s === b.s && d.mass > b.mass)) b = { s, d }; } return b ? nameOf.get(b.d.r) : null; };
    const lik = (d) => terms.reduce((a, w) => a + Math.log(((d.tf.get(w) ?? 0) + mu * pb(w)) / (d.len + mu)), 0); const prior = (d) => Math.log(d.mass / msum);
    const ans = { C: best((d) => prior(d) + lik(d)), PRIOR: best(prior), LIK: best(lik) }; const sc = (t) => t == null ? [0, 0] : [Math.max(...q.answers.map((g) => f1t(t, g))), Math.max(...q.answers.map((g) => +(normT(t).join(' ') === normT(g).join(' '))))];
    const r = { book: id, q: q.q, isRef, global: GLOBAL.test(q.q) }; for (const [k, t] of Object.entries(ans)) { [r[k + 'f'], r[k + 'e']] = sc(t); r[k + 't'] = t; } const b1 = A1[qi]?.B1?.text; [r.b1f, r.b1e] = sc(b1); rows.push(r);
  });
}
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN; const show = (name, rs) => { console.log(`\n== ${name}: ${rs.length} questions`); for (const k of ['C', 'PRIOR', 'LIK']) console.log(k.padEnd(6), 'F1', mean(rs.map((r) => r[k + 'f'])).toFixed(3), 'EM', mean(rs.map((r) => r[k + 'e'])).toFixed(3)); console.log('B1    ', 'F1', mean(rs.map((r) => r.b1f)).toFixed(3), 'EM', mean(rs.map((r) => r.b1e)).toFixed(3)); };
const ref = rows.filter((r) => r.isRef); console.log('no-name questions', rows.length, ' answer is a referent surface', ref.length, `(${(100 * ref.length / Math.max(1, rows.length)).toFixed(0)}%)`);
show('referent-answer questions (primary)', ref); show('  of which about the whole book', ref.filter((r) => r.global)); show('  of which describing the answer', ref.filter((r) => !r.global)); show('all no-name questions', rows);
const byBook = new Map(); ref.forEach((r) => { if (!byBook.has(r.book)) byBook.set(r.book, []); byBook.get(r.book).push(r); }); const books = [...byBook.keys()]; const R = seeded(707);
const ci = (get) => { if (!books.length) return 'n/a'; const ds = []; for (let k = 0; k < 10000; k++) { let s = 0, n = 0; for (let i = 0; i < books.length; i++) { const bk = byBook.get(books[Math.floor(R() * books.length)]); for (let j = 0; j < bk.length; j++) { s += get(bk[Math.floor(R() * bk.length)]); n++; } } ds.push(n ? s / n : 0); } ds.sort((a, b) => a - b); return `[${ds[250].toFixed(3)}, ${ds[9749].toFixed(3)}]`; };
console.log('\nC1 F1 C - B1', ci((r) => r.Cf - r.b1f)); console.log('C2 F1 C - PRIOR', ci((r) => r.Cf - r.PRIORf)); console.log('   F1 C - LIK  ', ci((r) => r.Cf - r.LIKf));
fs.writeFileSync(path.join(HERE, process.env.OUT ?? 'company-rows.json'), JSON.stringify(rows));
