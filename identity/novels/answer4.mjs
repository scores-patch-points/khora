// answer3.mjs <id8> (round 3: entity -> scene -> role -> word) derived from answer.mjs <id8> — NOVELS-PREREG.md + AMEND-1/2. No model. Reads the book's weft (readToWeft output) and the question's weft (same reader) and writes every system's answer
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
const out = [];
for (const q of Q) {
  const ty = qtype(q.q), qt = words(q.q), qw = [...new Set(qt)].filter((w) => !WH.has(w)); const ws = qw.map(surp), med = median(ws);
  const ql = q.q.toLowerCase();
  // 1. named entities: cast referents whose surface appears in the question as a whole word
  const ents = []; for (const [ref, names] of refNames) if (names.some((n) => new RegExp('(^|[^\\p{L}])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'u').test(ql))) ents.push(ref);
  const entWords = new Set(ents.flatMap((r) => refNames.get(r).flatMap((n) => words(n))));
  const content = qw.filter((w, i) => ws[i] >= med && !entWords.has(w));
  const excludedW = new Set([...qw.filter((w, i) => ws[i] >= med), ...entWords]); const excluded = (c) => words(c.text).some((w) => excludedW.has(w));
  // 2. scene
  let scene = null; const sc = ents.map((r) => near(refSents.get(r))).filter((x) => x.size);
  if (sc.length) { const both = sc.length > 1 ? new Set([...sc[0]].filter((i) => sc.every((x) => x.has(i)))) : sc[0]; scene = both.size ? both : sc.reduce((a, b) => (b.size < a.size ? b : a)); }
  const inScene = (i) => !scene || scene.has(i);
  // 3. inside the scene: BM25 on exact classes (E) or fold classes (Ef); ties by named-entity mentions in the sentence, then reading order
  const entHits = (i) => ents.reduce((n, r) => n + (refSents.get(r).has(i) ? 1 : 0), 0);
  const exactCl = content.map((w) => [w]), foldCl = content.map((w) => { const mem = new Set([w]); for (const f of FOLD.foldOf(w)) { const l = lex.get(f.word) ?? f.word; if (df.has(l)) mem.add(l); } return [...mem]; });
  const rankWith = (classes) => { const cdfs = classes.map(sdf); const sc_ = bm25(classes, cdfs); const idx = [...sc_.keys()].sort((a, b) => (inScene(b) - inScene(a)) || sc_[b] - sc_[a] || entHits(b) - entHits(a) || a - b); return { sc_, idx }; };
  const E = rankWith(exactCl), Ef = rankWith(foldCl), P = (() => { const cdfs = exactCl.map(sdf); return bm25(exactCl, cdfs); })();
  const rec = { q: q.q, answers: q.answers, type: ty, ents: ents.length, sceneCover: scene ? scene.size / NS : 1 };
  const pick = (idx) => { for (const i of idx.slice(0, 5)) { const c = (byS.get(i) ?? []).find((c) => contentful(c.text) && typeOk(c, ty) && !excluded(c)); if (c) return { text: c.text, sent: i }; } return null; };
  // proximity variant (Ep, Efp): in the sentence, the typed candidate nearest (in characters) to an occurrence of a question content term; ties by reading order
  const pickP = (idx, classes) => { for (const i of idx.slice(0, 5)) { const sent = S[i], terms = new Set(classes.flat()); const at = []; const re = /[\p{L}\p{N}]+/gu; for (let m; (m = re.exec(sent.text));) if (terms.has(lex.get(m[0].toLowerCase()) ?? m[0].toLowerCase())) at.push(sent.offset + m.index + m[0].length / 2); const cs = (byS.get(i) ?? []).filter((c) => contentful(c.text) && typeOk(c, ty) && !excluded(c)); if (!cs.length) continue; if (!at.length) return { text: cs[0].text, sent: i }; const d = (c) => Math.min(...at.map((p) => Math.abs((c.start + c.end) / 2 - p))); cs.sort((a, b) => d(a) - d(b) || a.start - b.start); return { text: cs[0].text, sent: i }; } return null; };
  const eA = pick(E.idx), fA = pick(Ef.idx), epA = pickP(E.idx, exactCl), efpA = pickP(Ef.idx, foldCl); if (eA) rec.E = eA; if (fA) rec.Ef = fA; if (epA) rec.Ep = epA; if (efpA) rec.Efp = efpA;
  // retrieval ranks (uses gold; no system reads it): plain BM25 over the whole book, E and Ef orderings
  const gnorm = q.answers.filter((a) => a.split(/\s+/).length <= 4).map((a) => ' ' + norm(a).join(' ') + ' ').filter((x) => x.trim()); const gold = new Set(S.map((x, i) => i).filter((i) => { const t = ' ' + norm(S[i].text).join(' ') + ' '; return gnorm.some((g) => t.includes(g)); }));
  const rk = (idx) => { let best = Infinity; for (const g of gold) { const p = idx.indexOf(g) + 1; if (p < best) best = p; } return best; };   // idx is a strict total order (position = rank)
  rec.rank = { plain: pess(P, gold), E: rk(E.idx), Ef: rk(Ef.idx) }; rec.gold = gold.size;

  // ---- H: the holograph query (THE-HOLOGRAPH.md; activation-retrieval.js): the question activates the referents it names; hop 0 = the sentences they stand in, hop 1 = the referents those co-mention and their sentences;
  // ranked by hop, then by how many active referents a sentence carries, then document order; CUT by the measurement: the smallest depth d in {2,4,8,16,32} at which showing the next candidate depth adds nothing to the reach.
  // reach of a sentence = the active referents it carries + the referents it co-mentions + the acts (predicate lemmas) it states about an active referent. No question word is used for retrieval; with no referent named the basis is "surface" (plain BM25 order).
  {
    const active = new Set(ents); let order = null, basis = 'surface', shownN = 0;
    const actsAbout = (i) => { const o = new Set(); for (const c of byS.get(i) ?? []) if ((c.role === 'subj' || c.role === 'obj') && c.pl && c.ref && active.has(c.ref)) o.add('act:' + c.pl); return o; };
    if (active.size) {
      basis = 'referent'; const carried = (i) => [...active].filter((r) => refSents.get(r).has(i)).length;
      const hop0 = [...new Set([...active].flatMap((r) => [...refSents.get(r)]))].sort((a, b) => carried(b) - carried(a) || a - b); const h0 = new Set(hop0);
      const co = new Set(); for (const [r, ss] of refSents) if (!active.has(r) && hop0.some((i) => ss.has(i))) co.add(r);
      const hop1 = [...new Set([...co].flatMap((r) => [...refSents.get(r)]))].filter((i) => !h0.has(i)).sort((a, b) => a - b);
      const ranked = [...hop0, ...hop1];
      const reachOf = (i) => { const o = new Set(); for (const [r, ss] of refSents) if (ss.has(i)) o.add('ref:' + r); for (const a of actsAbout(i)) o.add(a); return o; };
      const reachAt = (d) => { const o = new Set(); for (const i of ranked.slice(0, d)) for (const x of reachOf(i)) o.add(x); return o.size; };
      const cands_ = [2, 4, 8, 16, 32]; let d = cands_[cands_.length - 1]; for (let k = 0; k + 1 < cands_.length; k++) if (reachAt(cands_[k]) === reachAt(cands_[k + 1])) { d = cands_[k]; break; }
      shownN = Math.min(d, ranked.length); const rest = [...Array(NS).keys()].filter((i) => !ranked.includes(i)); order = [...ranked, ...rest];
      // the answer from the graph: acts about an active referent in the shown sentences; the other end of the act; the act whose predicate lemma the question carries first
      const qlem = new Set(qt); let best = null;
      for (const i of ranked.slice(0, shownN)) for (const c of byS.get(i) ?? []) { if ((c.role !== 'subj' && c.role !== 'obj') || !c.ref || !active.has(c.ref)) continue; const cl = clauseOf[c.ci]; const other = c.role === 'subj' ? cl.object : cl.subject; if (!other) continue; const oc = (byS.get(i) ?? []).find((x) => x.ci === c.ci && x.start === other.start && x.end === other.end && x.role !== c.role); if (!oc || !contentful(oc.text) || !typeOk(oc, ty) || excluded(oc)) continue; const key = (qlem.has(c.pl) ? 0 : 1); if (!best || key < best.key) best = { key, text: oc.text, sent: i }; }
      if (best) rec.H = { text: best.text, sent: best.sent, actMatch: best.key === 0 };
    }
    rec.basis = basis; rec.shown = shownN;
    const ord = order ?? E.idx; rec.rank.H = (() => { let b = Infinity; for (const g of gold) { const p = ord.indexOf(g) + 1; if (p < b) b = p; } return b; })(); rec.goldInShown = shownN ? [...gold].some((g) => order.slice(0, shownN).includes(g)) : null;
  }
  out.push(rec);
}
fs.mkdirSync(path.join(HERE, 'answers4'), { recursive: true }); fs.writeFileSync(path.join(HERE, 'answers4', `${id8}.json`), JSON.stringify({ book: id8, answers: out }, null, 1));
console.log(JSON.stringify({ book: id8, questions: out.length, withEntity: out.filter((r) => r.ents).length }));
