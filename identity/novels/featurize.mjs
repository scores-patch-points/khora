// featurize.mjs <id8> (round 5: the candidate pool and its features, for the learner) derived from answer3.mjs <id8> (round 3: entity -> scene -> role -> word) derived from answer.mjs <id8> — NOVELS-PREREG.md + AMEND-1/2. No model. Reads the book's weft (readToWeft output) and the question's weft (same reader) and writes every system's answer
// for every question to answers/<id8>.json: B0, B1, B2 (baselines), F (Tier 1 frame fold + Tier 2 entity fold, higher evidence), F1only, F2only, R (role-blind), and the Stage A oracle.
// The gold answers are used ONLY by the `oracle` field; no system's choice reads them.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url'; import { buildFold, wordsOf } from './fold.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const id8 = process.argv[2];
const man = JSON.parse(fs.readFileSync(path.join(HERE, 'books-manifest.json'), 'utf8')).find((m) => m.ok && m.document_id.startsWith(id8));
const text = fs.readFileSync(path.join(HERE, man.file), 'utf8');
const W = JSON.parse(fs.readFileSync(path.join(HERE, 'weft', `${id8}.weft.json`), 'utf8'));
const Q = JSON.parse(fs.readFileSync(path.join(HERE, `questions-${id8}.read.json`), 'utf8'));
const WH = new Set(['who', 'whom', 'whose', 'what', 'which', 'where', 'how', 'many', 'much']);

// ---- SQuAD normalisation and token F1 (for the oracle only) ----
const norm = (s) => s.toLowerCase().replace(/[!-/:-@[-`{-~]/g, '').replace(/\b(a|an|the)\b/g, ' ').split(/\s+/).filter(Boolean);
const f1 = (p, g) => { const a = norm(p), b = norm(g); if (!a.length || !b.length) return +(a.length === b.length); const c = new Map(); for (const t of b) c.set(t, (c.get(t) ?? 0) + 1); let o = 0; for (const t of a) if (c.get(t) > 0) { o++; c.set(t, c.get(t) - 1); } if (!o) return 0; const p_ = o / a.length, r_ = o / b.length; return 2 * p_ * r_ / (p_ + r_); };

// ---- the book's own lemma lexicon: predicate form -> lemma, from the reader's clauses ----
const lex = new Map();
for (const c of W.clauses ?? []) { const p = c.predicate; if (p?.lemma && p.text) for (const w of p.text.toLowerCase().split(/\s+/)) if (!lex.has(w) && w !== p.lemma) { /* only the head's own form */ } if (p?.head && p?.lemma) lex.set(String(p.head).toLowerCase(), String(p.lemma).toLowerCase()); }
const words = (s) => (String(s).toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? []).map((w) => lex.get(w) ?? w);

// ---- sentences, their tokens, document frequencies (surprisal = -log2 share of the book's sentences carrying the token) ----
const S = W.sentences; const starts = S.map((s) => s.offset);
const sentOf = (pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= pos) lo = m; else hi = m - 1; } return lo; };
const stoks = S.map((s) => words(s.text)); const df = new Map(); for (const t of stoks) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
const N = S.length, surp = (w) => -Math.log2((df.get(w) ?? 0.5) / N);
const avgdl = stoks.reduce((a, t) => a + t.length, 0) / N;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : 0; };

const tokS = []; for (const [w, n] of df) { const v = surp(w); for (let k = 0; k < n; k++) tokS.push(v); }
const MEDS = (() => { const a = tokS.sort((x, y) => x - y); return a[a.length >> 1] ?? 0; })();   // the typical token's surprisal in this book: a relative unit, no stop list
const contentful = (t) => words(t).some((w) => surp(w) > MEDS);
// ---- candidates: spans the reader itself delimited ----
const cands = []; const seen = new Set(); const clauseOf = [];
const longest = new Map(); for (const c of W.cast ?? []) { const best = [...(c.allSurfaces ?? [c.surface])].sort((a, b) => b.length - a.length)[0]; for (const sp of c.mentionSpans ?? []) longest.set(sp[0] + ':' + sp[1], { ref: c.ref, surface: best }); }
const addC = (start, end, role, extra = {}) => { if (!(end > start)) return; const k = start + ':' + end; const key = k + role; if (seen.has(key)) return; seen.add(key); let t = text.slice(start, end).replace(/\s+/g, ' ').trim(); const ln = longest.get(k); if (ln && ln.surface.length > t.length) t = ln.surface; if (!t) return; cands.push({ start, end, text: t, role, s: sentOf(start), ref: ln?.ref ?? null, ...extra }); };
(W.clauses ?? []).forEach((c, ci) => { const pl = c.predicate?.lemma ? String(c.predicate.lemma).toLowerCase() : null; if (c.subject) addC(c.subject.start, c.subject.end, 'subj', { ci, pl }); if (c.object) addC(c.object.start, c.object.end, 'obj', { ci, pl }); clauseOf[ci] = c; });
for (const c of W.cast ?? []) for (const sp of c.mentionSpans ?? []) addC(sp[0], sp[1], 'cast', { ref: c.ref });
for (const e of W.edges ?? []) for (const sp of e.spans ?? []) for (const face of [e.end1Face, e.end2Face]) { if (!face) continue; const at = text.indexOf(face, sp.start); if (at >= 0 && at < sp.end) addC(at, at + face.length, 'edge'); }
const byS = new Map(); for (const c of cands) { if (!byS.has(c.s)) byS.set(c.s, []); byS.get(c.s).push(c); } for (const l of byS.values()) l.sort((a, b) => a.start - b.start);

// ---- the type filter T(q), closed lists from AMEND-2 ----
const PREP = new Set('in at to from into near on upon through towards toward across over under behind beyond within outside inside of'.split(' '));
const NUMW = new Set('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty hundred thousand million dozen half both several many few some no'.split(' '));
const castRefs = new Set(cands.filter((c) => c.ref).map((c) => c.text.toLowerCase()));
const qtype = (q) => { const w = q.toLowerCase().split(/\s+/); if (w[0] === 'how' && (w[1] === 'many' || w[1] === 'much')) return 'num'; if (['who', 'whom', 'whose'].includes(w[0])) return 'who'; if (w[0] === 'where') return 'where'; return 'what'; };
const prevWord = (c) => (text.slice(Math.max(0, c.start - 24), c.start).toLowerCase().match(/([\p{L}]+)\s*$/u) ?? [])[1];
const typeOk = (c, ty) => {
  if (ty === 'who') return !!c.ref || (/^\p{Lu}/u.test(c.text) && text.slice(Math.max(0, c.start - 2), c.start).search(/[.!?"“]\s*$/) < 0);
  if (ty === 'where') return PREP.has(prevWord(c));
  if (ty === 'num') return /\d/.test(c.text) || c.text.toLowerCase().split(/\s+/).some((w) => NUMW.has(w));
  return true;
};
const hash = (s) => parseInt(crypto.createHash('sha256').update(s).digest('hex').slice(0, 8), 16);
const rng = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const LCS = (a, b) => { const m = a.length, n = b.length; const D = Array.from({ length: m + 1 }, () => new Int16Array(n + 1)); for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) D[i][j] = a[i] === b[j] ? D[i + 1][j + 1] + 1 : Math.max(D[i + 1][j], D[i][j + 1]); const out = []; let i = 0, j = 0; while (i < m && j < n) { if (a[i] === b[j]) { out.push(a[i]); i++; j++; } else if (D[i + 1][j] >= D[i][j + 1]) i++; else j++; } return out; };

// ---- round 3 (PREREG-ROUND3.md): E and Ef; the retrieval ranks of plain BM25, fold BM25 and E for the retrieval metric ----
const RAD = 3;
const manAll = JSON.parse(fs.readFileSync(path.join(HERE, 'books-manifest.json'), 'utf8')).filter((m) => m.ok); const round1 = manAll.slice(0, 10);
const bgTexts = round1.map((x) => fs.readFileSync(path.join(HERE, x.file), 'utf8')); if (!round1.includes(man)) bgTexts.push(text);
const FOLD = buildFold(bgTexts);
const sentOfPos = sentOf; const NS = S.length;
// mentions of each cast referent, by sentence
const refSents = new Map(), refNames = new Map(); for (const c of W.cast ?? []) { const set = new Set((c.mentionSpans ?? []).map((sp) => sentOfPos(sp[0]))); refSents.set(c.ref, set); refNames.set(c.ref, (c.allSurfaces ?? [c.surface]).map((x) => x.toLowerCase()).filter((x) => x.length > 2)); }
const near = (set) => { const o = new Set(); for (const k of set) for (let i = Math.max(0, k - RAD); i <= Math.min(NS - 1, k + RAD); i++) o.add(i); return o; };
const sdf = (cls) => { let n = 0; for (const t of sets) if (cls.some((w) => t.has(w))) n++; return n; };
const sets = stoks.map((t) => new Set(t));
const bm25 = (classes, cdfs) => stoks.map((t, i) => { let sc = 0; classes.forEach((cl, k) => { let f = 0; for (const w of t) if (cl.includes(w)) f++; if (!f) return; const d = cdfs[k]; sc += Math.log(1 + (NS - d + 0.5) / (d + 0.5)) * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * t.length / avgdl)); return; }); return sc; });
const pess = (sc, set) => { let best = Infinity; for (const i of set) { const r1 = 1 + sc.reduce((n, x, j) => n + (j !== i && x >= sc[i] ? 1 : 0), 0); if (r1 < best) best = r1; } return best; };

const TR = JSON.parse(fs.readFileSync(path.join(HERE, 'tracked', `${id8}.json`), 'utf8'));
const att = (c) => TR.args[c.ci + ':' + c.role] ?? null;
const refSents2 = new Map([...refSents].map(([r, s_]) => [r, new Set(s_)]));
for (const [k, ref] of Object.entries(TR.args)) { const ci = +k.split(':')[0]; const sn = W.clauses[ci]?.sentence; if (sn != null && refSents2.has(ref)) refSents2.get(ref).add(sn); }
for (const b of TR.bindings) if (refSents2.has(b.ref)) refSents2.get(b.ref).add(sentOfPos(b.offset));

// ---- round 5 (PREREG-ROUND5.md): the pool and its features ----
const normKey = (s) => norm(s).join(' ');
const freqBook = new Map(); for (const c of cands) { const k = normKey(c.text); freqBook.set(k, (freqBook.get(k) ?? 0) + 1); }
const FEATS = ['isref', 'role_subj', 'role_obj', 'role_cast', 'role_edge', 'cap', 'len', 'prep', 'digit', 'overlapsQ', 'logfreq', 'logfreq_cut', 'bm25_norm', 'rankpct', 'incut', 'hop0', 'inscene', 'ov_n', 'ov_idf', 'dist', 'before', 'after', 'actother', 'actmatch', 'first', 'ncand', 'ents'];
const TYPES = ['who', 'what', 'where', 'num']; const XT = ['isref', 'cap', 'prep', 'digit', 'role_subj', 'role_obj', 'first'];
const NAMES = [...FEATS, ...TYPES.flatMap((t) => XT.map((f) => t + '*' + f))];
const wordPos = (sent) => { const out = []; const re = /[\p{L}\p{N}]+/gu; for (let m; (m = re.exec(sent.text));) out.push({ w: lex.get(m[0].toLowerCase()) ?? m[0].toLowerCase(), at: sent.offset + m.index }); return out; };
const out = [];
for (const q of Q) {
  const ty = qtype(q.q), qt = words(q.q), qw = [...new Set(qt)].filter((w) => !WH.has(w)); const ws = qw.map(surp), med = median(ws); const ql = q.q.toLowerCase();
  const ents = []; for (const [ref, names] of refNames) if (names.some((n) => new RegExp('(^|[^\\p{L}])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'u').test(ql))) ents.push(ref);
  const entWords = new Set(ents.flatMap((r) => refNames.get(r).flatMap((n) => words(n))));
  const content = qw.filter((w, i) => ws[i] >= med && !entWords.has(w)); const contentSet = new Set(content);
  const excludedW = new Set([...qw.filter((w, i) => ws[i] >= med), ...entWords]); const excluded = (c) => words(c.text).some((w) => excludedW.has(w));
  let scene = null; const sc = ents.map((r) => near(refSents.get(r))).filter((x) => x.size);
  if (sc.length) { const both = sc.length > 1 ? new Set([...sc[0]].filter((i) => sc.every((x) => x.has(i)))) : sc[0]; scene = both.size ? both : sc.reduce((a, b) => (b.size < a.size ? b : a)); }
  const inScene = (i) => !scene || scene.has(i); const entHits = (i) => ents.reduce((n, r) => n + (refSents.get(r).has(i) ? 1 : 0), 0);
  const exactCl = content.map((w) => [w]); const cdfs = exactCl.map(sdf); const scE = bm25(exactCl, cdfs);
  const idxE = [...scE.keys()].sort((a, b) => (inScene(b) - inScene(a)) || scE[b] - scE[a] || entHits(b) - entHits(a) || a - b); const posE = new Map(idxE.map((i, k) => [i, k]));
  const idxP = [...scE.keys()].sort((a, b) => scE[b] - scE[a] || a - b); const maxE = Math.max(...scE, 1e-9);
  // the tracked-graph cut (H4)
  const active = new Set(ents); let cut = new Set(), hop0s = new Set();
  if (active.size) { const carried = (i) => [...active].filter((r) => refSents2.get(r)?.has(i)).length; const hop0 = [...new Set([...active].flatMap((r) => [...(refSents2.get(r) ?? [])]))].sort((a, b) => carried(b) - carried(a) || a - b); hop0s = new Set(hop0); const h0 = hop0s;
    const co = new Set(); for (const [r, ss] of refSents2) if (!active.has(r) && hop0.some((i) => ss.has(i))) co.add(r); const hop1 = [...new Set([...co].flatMap((r) => [...refSents2.get(r)]))].filter((i) => !h0.has(i)).sort((a, b) => a - b); const ranked = [...hop0, ...hop1];
    const actsAbout = (i) => { const o = new Set(); for (const c of byS.get(i) ?? []) if ((c.role === 'subj' || c.role === 'obj') && c.pl && att(c) && active.has(att(c))) o.add('act:' + c.pl); return o; };
    const reachOf = (i) => { const o = new Set(); for (const [r, ss] of refSents2) if (ss.has(i)) o.add('ref:' + r); for (const a of actsAbout(i)) o.add(a); return o; }; const reachAt = (d) => { const o = new Set(); for (const i of ranked.slice(0, d)) for (const x of reachOf(i)) o.add(x); return o.size; };
    const cs_ = [2, 4, 8, 16, 32]; let d = cs_[cs_.length - 1]; for (let k = 0; k + 1 < cs_.length; k++) if (reachAt(cs_[k]) === reachAt(cs_[k + 1])) { d = cs_[k]; break; } cut = new Set(ranked.slice(0, Math.min(d, ranked.length))); }
  const poolS = new Set([...cut, ...idxE.slice(0, 25), ...idxP.slice(0, 10)]);
  const qlem = new Set(qt);
  const inCutFreq = new Map(); for (const i of cut) for (const c of byS.get(i) ?? []) { const k = normKey(c.text); inCutFreq.set(k, (inCutFreq.get(k) ?? 0) + 1); }
  const gnorm = q.answers.filter((a) => a.split(/\s+/).length <= 4).map((a) => ' ' + norm(a).join(' ') + ' ').filter((x) => x.trim());
  const pool = [];
  for (const i of [...poolS].sort((a, b) => a - b)) {
    const typed = (byS.get(i) ?? []).filter((c) => contentful(c.text) && typeOk(c, ty) && !excluded(c)); if (!typed.length) continue;
    const wp = wordPos(S[i]); const termIdx = wp.map((x, k) => (contentSet.has(x.w) ? k : -1)).filter((k) => k >= 0); const ovn = new Set(wp.filter((x) => contentSet.has(x.w)).map((x) => x.w));
    const ovidf = [...ovn].reduce((a, w) => a + surp(w), 0);
    typed.forEach((c, fi) => {
      const wi = wp.filter((x) => x.at < c.start).length; let dist = 30, before = 0, after = 0; if (termIdx.length) { let bd = 1e9, bk = -1; for (const k of termIdx) { const dd = Math.abs(k - wi); if (dd < bd) { bd = dd; bk = k; } } dist = bd; before = +(wi < bk); after = +(wi > bk); }
      const other = c.role === 'subj' ? 'obj' : c.role === 'obj' ? 'subj' : null; const oa = other && c.ci != null ? TR.args[c.ci + ':' + other] : null; const k = normKey(c.text);
      const f = { isref: +!!(c.ref || att(c)), role_subj: +(c.role === 'subj'), role_obj: +(c.role === 'obj'), role_cast: +(c.role === 'cast'), role_edge: +(c.role === 'edge'), cap: +/^\p{Lu}/u.test(c.text), len: Math.log1p(c.text.split(/\s+/).length), prep: +PREP.has(prevWord(c)), digit: +/\d/.test(c.text),
        overlapsQ: 0, logfreq: Math.log1p(freqBook.get(k) ?? 0), logfreq_cut: Math.log1p(inCutFreq.get(k) ?? 0), bm25_norm: scE[i] / maxE, rankpct: 1 - (posE.get(i) ?? NS) / NS, incut: +cut.has(i), hop0: +hop0s.has(i), inscene: +inScene(i), ov_n: ovn.size, ov_idf: ovidf / 10, dist: Math.log1p(dist), before, after,
        actother: +!!(oa && active.has(oa)), actmatch: +!!(oa && active.has(oa) && c.pl && qlem.has(c.pl)), first: +(fi === 0), ncand: Math.log1p(typed.length), ents: ents.length };
      const x = FEATS.map((n) => f[n]); for (const t of TYPES) for (const n of XT) x.push(ty === t ? f[n] : 0);
      const fs_ = Math.max(...q.answers.map((g) => f1(c.text, g)));
      pool.push({ text: c.text, sent: i, x: x.map((v) => +v.toFixed(4)), f1: +fs_.toFixed(3), y: +(fs_ >= 0.5), em: +q.answers.some((g) => normKey(c.text) === normKey(g)) });
    });
  }
  // B1 for the same question (round 1's rule): the most frequent typed candidate of the whole book
  out.push({ q: q.q, answers: q.answers, type: ty, ents: ents.length, pool, poolRecall: pool.some((c) => c.em) });
}
fs.mkdirSync(path.join(HERE, 'features'), { recursive: true }); fs.writeFileSync(path.join(HERE, 'features', `${id8}.json`), JSON.stringify({ book: id8, names: NAMES, questions: out }));
console.log(JSON.stringify({ book: id8, questions: out.length, meanPool: Math.round(out.reduce((a, r) => a + r.pool.length, 0) / Math.max(1, out.length)), poolRecallExact: +(out.filter((r) => r.poolRecall).length / Math.max(1, out.length)).toFixed(3), anyPositive: +(out.filter((r) => r.pool.some((c) => c.y)).length / Math.max(1, out.length)).toFixed(3) }));
