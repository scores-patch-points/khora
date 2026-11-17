// wormhole-eval.mjs <id8>... — PREREG-ROUND6.md retrieval test. Entries = referents the question names, plus (wormhole) referents entered through a question word that is an admitted description head.
// Cut = round 4's tracked-graph referent cut (hop 0 / hop 1, dmd depth in {2,4,8,16,32}); WORMHOLE arm adds the mouths of admitted links as mentions of their referent. Baseline for no-name questions: plain BM25 top-k, k = the wormhole cut's size.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { seeded } from './attend.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ids = process.argv.slice(2);
const norm = (s) => ' ' + s.toLowerCase().replace(/[!-/:-@[-`{-~]/g, '').replace(/\b(a|an|the)\b/g, ' ').split(/\s+/).filter(Boolean).join(' ') + ' ';
const wordsOf = (s) => (String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
const rows = [];
for (const id of ids) {
  const W = JSON.parse(fs.readFileSync(path.join(HERE, 'weft', id + '.weft.json'), 'utf8')), TR = JSON.parse(fs.readFileSync(path.join(HERE, 'tracked', id + '.json'), 'utf8')), WH = JSON.parse(fs.readFileSync(path.join(HERE, 'wormholes', id + '.json'), 'utf8'));
  const Q = JSON.parse(fs.readFileSync(path.join(HERE, `questions-${id}.json`), 'utf8')); const S = W.sentences, N = S.length, off = S.map((s) => s.offset); const sentOf = (p) => { let a = 0, b = N - 1; while (a < b) { const k = (a + b + 1) >> 1; if (off[k] <= p) a = k; else b = k - 1; } return a; };
  const names = new Map(), base = new Map(); for (const c of W.cast ?? []) { names.set(c.ref, (c.allSurfaces ?? [c.surface]).map((x) => x.toLowerCase()).filter((x) => x.length > 2)); base.set(c.ref, new Set((c.mentionSpans ?? []).map((sp) => sentOf(sp[0])))); }
  const withTracked = new Map([...base].map(([r, s]) => [r, new Set(s)])); for (const [k, ref] of Object.entries(TR.args)) { const sn = W.clauses[+k.split(':')[0]]?.sentence; if (sn != null && withTracked.has(ref)) withTracked.get(ref).add(sn); } for (const b of TR.bindings) if (withTracked.has(b.ref)) withTracked.get(b.ref).add(sentOf(b.offset));
  const withWorm = new Map([...withTracked].map(([r, s]) => [r, new Set(s)])); const args2 = { ...TR.args }; const headRef = new Map(); for (const l of WH.links) { headRef.set(l.head, l.ref); for (const s of l.mouths) if (withWorm.has(l.ref)) withWorm.get(l.ref).add(s); for (const a of l.args) args2[a] = l.ref; }
  const clausesBySent = new Map(); (W.clauses ?? []).forEach((c, ci) => { const s = c.sentence; if (s == null) return; if (!clausesBySent.has(s)) clausesBySent.set(s, []); clausesBySent.get(s).push({ ci, pl: c.predicate?.lemma ? String(c.predicate.lemma).toLowerCase() : null }); });
  const cutOf = (active, RS, args) => { if (!active.size) return null; const carried = (i) => [...active].filter((r) => RS.get(r)?.has(i)).length; const hop0 = [...new Set([...active].flatMap((r) => [...(RS.get(r) ?? [])]))].sort((a, b) => carried(b) - carried(a) || a - b); const h0 = new Set(hop0);
    const co = new Set(); for (const [r, ss] of RS) if (!active.has(r) && hop0.some((i) => ss.has(i))) co.add(r); const hop1 = [...new Set([...co].flatMap((r) => [...RS.get(r)]))].filter((i) => !h0.has(i)).sort((a, b) => a - b); const ranked = [...hop0, ...hop1];
    const acts = (i) => { const o = new Set(); for (const c of clausesBySent.get(i) ?? []) for (const role of ['subj', 'obj']) { const r = args[c.ci + ':' + role]; if (r && active.has(r) && c.pl) o.add('act:' + c.pl); } return o; };
    const reachOf = (i) => { const o = new Set(); for (const [r, ss] of RS) if (ss.has(i)) o.add('ref:' + r); for (const a of acts(i)) o.add(a); return o; }; const reachAt = (d) => { const o = new Set(); for (const i of ranked.slice(0, d)) for (const x of reachOf(i)) o.add(x); return o.size; };
    const cs = [2, 4, 8, 16, 32]; let d = cs[cs.length - 1]; for (let k = 0; k + 1 < cs.length; k++) if (reachAt(cs[k]) === reachAt(cs[k + 1])) { d = cs[k]; break; } return new Set(ranked.slice(0, Math.min(d, ranked.length))); };
  // BM25 over sentences
  const st = S.map((s) => wordsOf(s.text)); const df = new Map(); for (const t of st) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1); const avg = st.reduce((a, t) => a + t.length, 0) / N; const surp = (w) => -Math.log2((df.get(w) ?? 0.5) / N);
  const bm = (terms) => st.map((t) => { const tf = new Map(); for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1); let sc = 0; for (const w of terms) { const f = tf.get(w) ?? 0; if (!f) continue; const d = df.get(w) ?? 0; sc += Math.log(1 + (N - d + 0.5) / (d + 0.5)) * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * t.length / avg)); } return sc; });
  const Sn = S.map((s) => norm(s.text));
  for (const q of Q) {
    const ql = q.q.toLowerCase(); const named = new Set([...names].filter(([, ns]) => ns.some((n) => new RegExp('(^|[^\\p{L}])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'u').test(ql))).map(([r]) => r));
    const qw = wordsOf(q.q); const entered = new Set(); for (const w of qw) if (headRef.has(w) && !named.has(headRef.get(w))) entered.add(headRef.get(w));
    const g = q.answers.filter((a) => a.split(/\s+/).length <= 4).map(norm).filter((x) => x.trim()); const gold = new Set(S.map((x, i) => i).filter((i) => g.some((x) => Sn[i].includes(x)))); if (!gold.size) continue;
    const hit = (cut) => !!cut && [...gold].some((i) => cut.has(i));
    const cutBase = cutOf(named, withTracked, TR.args); const act = new Set([...named, ...entered]); const cutW = cutOf(act, withWorm, args2);
    const k = cutW ? cutW.size : 0; let bmHit = null; if (k) { const ws = qw.map(surp), md = [...ws].sort((a, b) => a - b)[ws.length >> 1] ?? 0; const terms = [...new Set(qw)].filter((w, i) => surp(w) >= md); const sc = bm(terms); const top = new Set([...sc.keys()].sort((a, b) => sc[b] - sc[a] || a - b).slice(0, k)); bmHit = [...gold].some((i) => top.has(i)); }
    rows.push({ book: id, named: named.size, entered: entered.size, baseHit: cutBase ? hit(cutBase) : null, wormHit: cutW ? hit(cutW) : null, k, kShare: k / N, bmHit });
  }
}
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN; const noName = rows.filter((r) => r.named === 0), named = rows.filter((r) => r.named > 0);
console.log('questions with a gold sentence', rows.length, ' naming a referent', named.length, ' naming none', noName.length);
const gained = noName.filter((r) => r.entered > 0); console.log('NO-NAME questions that gain an entry through a wormhole:', gained.length, `(${(100 * gained.length / Math.max(1, noName.length)).toFixed(1)}%)`);
if (gained.length) { console.log('  gold inside the wormhole cut', mean(gained.map((r) => +r.wormHit)).toFixed(3), ' plain BM25 top-k (same k)', mean(gained.map((r) => +r.bmHit)).toFixed(3), ' mean cut share of book', mean(gained.map((r) => r.kShare)).toFixed(4)); }
const nm = named.filter((r) => r.baseHit != null && r.wormHit != null); console.log('NAMED questions: gold inside cut: tracked graph', mean(nm.map((r) => +r.baseHit)).toFixed(3), ' with wormhole mouths', mean(nm.map((r) => +r.wormHit)).toFixed(3), ' (n', nm.length + ')');
const byBook = new Map(); rows.forEach((r) => { if (!byBook.has(r.book)) byBook.set(r.book, []); byBook.get(r.book).push(r); }); const books = [...byBook.keys()]; const R = seeded(606);
const ci = (sel, get) => { const ds = []; for (let k = 0; k < 10000; k++) { let s = 0, n = 0; for (let i = 0; i < books.length; i++) { const bk = byBook.get(books[Math.floor(R() * books.length)]).filter(sel); if (!bk.length) continue; for (let j = 0; j < bk.length; j++) { s += get(bk[Math.floor(R() * bk.length)]); n++; } } ds.push(n ? s / n : 0); } ds.sort((a, b) => a - b); return `[${ds[250].toFixed(3)}, ${ds[9749].toFixed(3)}]`; };
if (gained.length >= 3) console.log('W2 gold-in-cut minus BM25(k) on gained questions 95%', ci((r) => r.named === 0 && r.entered > 0, (r) => +r.wormHit - +r.bmHit));
console.log('W3 gold-in-cut with minus without wormhole mouths on named questions 95%', ci((r) => r.named > 0 && r.baseHit != null && r.wormHit != null, (r) => +r.wormHit - +r.baseHit));
