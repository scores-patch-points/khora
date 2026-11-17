// answer.mjs <id8> — NOVELS-PREREG.md + AMEND-1/2. No model. Reads the book's weft (readToWeft output) and the question's weft (same reader) and writes every system's answer
// for every question to answers/<id8>.json: B0, B1, B2 (baselines), F (Tier 1 frame fold + Tier 2 entity fold, higher evidence), F1only, F2only, R (role-blind), and the Stage A oracle.
// The gold answers are used ONLY by the `oracle` field; no system's choice reads them.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
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

const out = [];
for (const q of Q) {
  const ty = qtype(q.q), qt = words(q.q), qw = [...new Set(qt)].filter((w) => !WH.has(w));
  const ws = qw.map(surp), med = median(ws); const content = new Set(qw.filter((w, i) => ws[i] >= med));      // content = at least the question's own median surprisal (relative, not a stop list)
  const excluded = (c) => words(c.text).some((w) => content.has(w));
  const pool = cands.filter((c) => contentful(c.text) && typeOk(c, ty) && !excluded(c));
  const rec = { q: q.q, answers: q.answers, type: ty, pool: pool.length };
  // B0, B1
  if (pool.length) { const r = rng(hash(q.q)); rec.B0 = { text: pool[Math.floor(r() * pool.length)].text, score: 0 }; const cnt = new Map(); for (const c of pool) { const k = norm(c.text).join(' '); const e = cnt.get(k) ?? { n: 0, text: c.text, first: c.start }; e.n++; cnt.set(k, e); } const best = [...cnt.values()].sort((a, b) => b.n - a.n || a.first - b.first)[0]; rec.B1 = { text: best.text, score: best.n }; }
  // B2: BM25 over sentences, query = content lemmas
  const bm = stoks.map((t, i) => { const tf = new Map(); for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1); let sc = 0; for (const w of content) { const f = tf.get(w) ?? 0; if (!f) continue; const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5)); sc += idf * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * t.length / avgdl)); } return { i, sc }; }).sort((a, b) => b.sc - a.sc || a.i - b.i);
  const firstIn = (si) => (byS.get(si) ?? []).find((c) => contentful(c.text) && typeOk(c, ty) && !excluded(c));
  for (const b of bm.slice(0, 5)) { const c = firstIn(b.i); if (c) { rec.B2 = { text: c.text, score: bm[0].sc, sent: b.i }; break; } }
  // Tier 1: frame fold. sentence score = surprisal of the question's LCS anchors with the sentence (order-aware, as pair-diff)
  const t1 = stoks.map((t, i) => { const a = LCS(qt.filter((w) => !WH.has(w)), t); return { i, sc: a.reduce((s, w) => s + surp(w), 0), anchors: a }; }).sort((a, b) => b.sc - a.sc || a.i - b.i);
  // the wh-word's role in the question's own parse
  let role = 'other', pred = null; for (const c of q.clauses ?? []) { const sj = c.subject?.text?.toLowerCase(), ob = c.object?.text?.toLowerCase(); const pl = c.predicate?.lemma ? String(c.predicate.lemma).toLowerCase() : null; if (sj && WH.has(sj.split(/\s+/)[0])) { role = 'subj'; pred = pl; break; } if (ob && WH.has(ob.split(/\s+/)[0])) { role = 'obj'; pred = pl; break; } }
  rec.role = role; rec.pred = pred;
  // the aligned head: among the sentence's clause predicates, the one whose lemma is an LCS anchor with the highest surprisal (the question's own parse of its predicate is not trusted)
  const frameIn = (si, anchors) => { const cs = (byS.get(si) ?? []).filter((c) => (c.role === 'subj' || c.role === 'obj') && c.pl && anchors.includes(c.pl)); if (!cs.length) return null; const hv = Math.max(...cs.map((c) => surp(c.pl))); const heads = new Set(cs.filter((c) => surp(c.pl) === hv).map((c) => c.ci)); const roles = role === 'other' ? ['subj', 'obj'] : [role];
    for (const ro of roles) for (const ci of heads) { const cl = clauseOf[ci]; const arg = ro === 'subj' ? cl.subject : cl.object; if (!arg) continue; const c = (byS.get(si) ?? []).find((x) => x.ci === ci && x.start === arg.start && x.end === arg.end && x.role === ro); if (c && contentful(c.text) && typeOk(c, ty) && !excluded(c)) return c; } return null; };
  for (const b of t1.slice(0, 5)) { if (b.sc <= 0) break; const c = frameIn(b.i, b.anchors); if (c) { rec.F1only = { text: c.text, score: t1[0].sc, evidence: b.sc, sent: b.i, anchors: b.anchors.length }; break; } }
  // FL: F climbed up the terrain ladder (sentence -> its neighbouring window, radius 0,1,2): when the best sentences do not satisfy the frame, widen the window around each, nearest sentence first; the span returned is still one reader span (drill-down).
  fl: for (let r = 0; r <= 2; r++) for (const b of t1.slice(0, 5)) { if (b.sc <= 0) break; const win = []; for (let d = 0; d <= r; d++) for (const si of d ? [b.i - d, b.i + d] : [b.i]) if (si >= 0 && si < N) win.push(si); const anc = [...new Set(win.flatMap((si) => t1[t1.findIndex((x) => x.i === si)].anchors))]; for (const si of win) { const c = frameIn(si, anc); if (c) { rec.FL = { text: c.text, score: t1[0].sc, evidence: b.sc, sent: si, radius: r }; break fl; } } }
  for (const b of t1.slice(0, 5)) { if (b.sc <= 0) break; const c = firstIn(b.i); if (c) { rec.R = { text: c.text, score: t1[0].sc, evidence: b.sc, sent: b.i }; break; } }
  // Tier 2: entity fold. E = the longest cast surface that the question names; claims = clauses whose subject or object is E and whose predicate lemma the question carries
  let E = null; const ql = q.q.toLowerCase(); for (const c of W.cast ?? []) for (const s of c.allSurfaces ?? [c.surface]) if (s.length > 2 && ql.includes(s.toLowerCase()) && (!E || s.length > E.s.length)) E = { s, c };
  if (E) {
    const spans = new Set((E.c.mentionSpans ?? []).map((m) => m[0] + ':' + m[1])); let best = null;
    for (const c of cands) { if (c.role !== 'subj' && c.role !== 'obj') continue; if (!spans.has(c.start + ':' + c.end) && !(c.ref && c.ref === E.c.ref)) continue; const cl = clauseOf[c.ci]; const pl = c.pl; if (!pl || !qt.includes(pl)) continue; const other = c.role === 'subj' ? cl.object : cl.subject; if (!other) continue; const oc = cands.find((x) => x.start === other.start && x.end === other.end && x.ci === c.ci); if (!oc || !typeOk(oc, ty) || excluded(oc)) continue; const ev = surp(pl) + surp(E.s.toLowerCase().split(/\s+/)[0]); if (!best || ev > best.ev) best = { text: oc.text, ev, sent: c.s, m: 1 }; }
    if (best) { const mc = cands.filter((c) => c.role !== 'edge' && c.role !== 'cast' && c.pl && qt.includes(c.pl) && (spans.has(c.start + ':' + c.end) || (c.ref && c.ref === E.c.ref))).length; rec.F2only = { text: best.text, score: best.ev, evidence: best.ev + Math.log2(1 + mc), sent: best.sent, E: E.s }; }
  }
  // F: the tier with the higher evidence
  const c1 = rec.F1only, c2 = rec.F2only; const pick = c1 && c2 ? (c2.evidence > c1.evidence ? c2 : c1) : c1 ?? c2; if (pick) rec.F = { ...pick, tier: pick === c2 ? 2 : 1 };
  // Stage A oracle (uses gold; no system reads it): best F1 over every candidate / over the type-matched pool
  let ob = 0, obp = 0, hit = false; for (const c of cands) { const s = Math.max(...q.answers.map((g) => f1(c.text, g))); if (s > ob) ob = s; if (s === 1 && q.answers.some((g) => norm(c.text).join(' ') === norm(g).join(' '))) hit = true; } for (const c of pool) { const s = Math.max(...q.answers.map((g) => f1(c.text, g))); if (s > obp) obp = s; }
  rec.oracle = { any: ob, typed: obp, exact: hit };
  rec.bm25top = bm[0].sc; rec.t1top = t1[0].sc;
  out.push(rec);
}
fs.mkdirSync(path.join(HERE, 'answers'), { recursive: true }); fs.writeFileSync(path.join(HERE, 'answers', `${id8}.json`), JSON.stringify({ book: id8, candidates: cands.length, sentences: N, answers: out }, null, 1));
console.log(JSON.stringify({ book: id8, candidates: cands.length, questions: out.length }));
