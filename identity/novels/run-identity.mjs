// run-identity.mjs — Task 2 of PREREG-ROUND5-NOTE-1: record identity (Open Library editions), leave-one-SUBJECT-out. Same attend.mjs, no per-task tuning.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { trainAttend, score, auc, seeded } from './attend.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const RAW = path.join(HERE, '..', 'books', 'raw');
const SUBJECTS = ['fiction', 'poetry', 'history', 'science', 'philosophy', 'religion', 'children', 'biography', 'mathematics', 'art']; const RELS = ['title_tok', 'author', 'language', 'translated_from', 'publisher', 'year', 'pages', 'format', 'class', 'subject', 'series'];
const nfkc = (s) => String(s).normalize('NFKC').toLowerCase(); const normPub = (p) => nfkc(p).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const keys = (xs) => new Set((xs ?? []).filter((x) => x && x.key).map((x) => x.key.split('/').pop()));
function rec(e) { const r = {}; r.title_tok = new Set((nfkc(e.title ?? '').match(/[\p{L}\p{N}]{2,}/gu) ?? [])); r.author = keys(e.authors); r.language = keys(e.languages); r.translated_from = keys(e.translated_from); r.publisher = new Set((e.publishers ?? []).filter((p) => typeof p === 'string').map(normPub).filter(Boolean));
  const m = String(e.publish_date ?? '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/); r.year = m ? new Set([+m[1]]) : new Set(); r.pages = Number.isInteger(e.number_of_pages) ? new Set([String(e.number_of_pages)]) : new Set(); r.format = typeof e.physical_format === 'string' ? new Set([nfkc(e.physical_format)]) : new Set();
  r.class = new Set([...(e.lc_classifications ?? []).filter((x) => typeof x === 'string').map((x) => 'lc:' + nfkc(x)), ...(e.dewey_decimal_class ?? []).filter((x) => typeof x === 'string').map((x) => 'dd:' + nfkc(x))]); r.subject = new Set((e.subjects ?? []).filter((x) => typeof x === 'string').map(nfkc)); r.series = new Set((e.series ?? []).filter((x) => typeof x === 'string').map(nfkc)); return r; }
const NAMES = []; const CHAN = []; for (const r of RELS) for (const st of ['agree', 'disagree', 'missing']) { NAMES.push(r + ':' + st); CHAN.push(r); } NAMES.push('title_jaccard'); CHAN.push('title_tok'); NAMES.push('year_close'); CHAN.push('year');
function vec(a, b) { const x = []; let jac = 0, yc = 0; for (const r of RELS) { const A = a[r], B = b[r]; const both = A.size && B.size; let inter = 0; if (both) for (const v of A) if (B.has(v)) inter++; x.push(both && inter ? 1 : 0, both && !inter ? 1 : 0, both ? 0 : 1);
    if (r === 'title_tok' && both) jac = inter / (A.size + B.size - inter); if (r === 'year' && both) yc = 1 / (1 + Math.min(...[...A].flatMap((p) => [...B].map((q) => Math.abs(p - q))))); } x.push(jac, yc); return x; }
const R = seeded(20261117); const rows = [];
for (const s of SUBJECTS) { const works = JSON.parse(fs.readFileSync(path.join(RAW, s + '.json'), 'utf8')).works.map((w) => w.editions.map(rec)); const multi = works.filter((w) => w.length >= 2);
  for (const w of multi) { const i = Math.floor(R() * w.length); let j = Math.floor(R() * (w.length - 1)); if (j >= i) j++; rows.push({ x: vec(w[i], w[j]), y: 1, g: s }); }
  for (let k = 0; k < multi.length; k++) { const a = Math.floor(R() * works.length); let b = Math.floor(R() * (works.length - 1)); if (b >= a) b++; rows.push({ x: vec(works[a][Math.floor(R() * works[a].length)], works[b][Math.floor(R() * works[b].length)]), y: 0, g: s }); } }
console.log('pairs', rows.length, 'positives', rows.filter((r) => r.y).length, 'subjects', SUBJECTS.length);
const lo = (opt) => { const per = {}; const all = []; for (const s of SUBJECTS) { const tr = rows.filter((r) => r.g !== s), te = rows.filter((r) => r.g === s); const m = trainAttend(tr, CHAN, opt); const sc = te.map((r) => score(m, r.x)); per[s] = { auc: auc(sc, te.map((r) => r.y)), acc: sc.reduce((a, z, i) => a + ((z > 0) === !!te[i].y), 0) / te.length, kept: Object.entries(m.gate).filter(([, v]) => v).map(([c]) => c), lam: m.lam }; all.push(per[s]); } return { per, auc: all.reduce((a, x) => a + x.auc, 0) / all.length, acc: all.reduce((a, x) => a + x.acc, 0) / all.length }; };
const out = {};
out.ungated = lo({ gated: false }); out.gated = lo({ gated: true });
for (const c of RELS) out['only_' + c] = lo({ gated: false, only: [c] });
const jacAuc = SUBJECTS.map((s) => { const te = rows.filter((r) => r.g === s); return auc(te.map((r) => r.x[NAMES.indexOf('title_jaccard')]), te.map((r) => r.y)); }); out.titleJaccardRaw = jacAuc.reduce((a, b) => a + b, 0) / jacAuc.length;
fs.writeFileSync(path.join(HERE, 'identity-loso.json'), JSON.stringify(out));
const p = (x) => x.toFixed(4); console.log('title Jaccard alone (no learning) mean AUC', p(out.titleJaccardRaw));
for (const c of RELS) console.log('only', c.padEnd(16), 'LOSO AUC', p(out['only_' + c].auc));
console.log('UNGATED LOSO AUC', p(out.ungated.auc), 'acc', p(out.ungated.acc)); console.log('GATED   LOSO AUC', p(out.gated.auc), 'acc', p(out.gated.acc));
const kept = {}; for (const s of SUBJECTS) for (const c of out.gated.per[s].kept) kept[c] = (kept[c] ?? 0) + 1; console.log('channels kept (of 10 folds):', JSON.stringify(kept)); console.log('L2 chosen:', JSON.stringify(SUBJECTS.map((s) => out.gated.per[s].lam)));
console.log('best single channel AUC', p(Math.max(...RELS.map((c) => out['only_' + c].auc))));
