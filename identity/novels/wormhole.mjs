// wormhole.mjs <id8>... — PREREG-ROUND6.md. Wormholes for DESCRIPTIONS: "the girl", "the old man": an identity link between all the places a description occurs and one cast referent, admitted only if no difference survives.
// DESCRIPTION: a clause argument that starts with the / this / that / these / those and overlaps no cast mention; HEAD = its last word before "of" or the span end.
// BINDING of each occurrence: decayed presence over the cast (the tracker's declared dials: window 4, boost 2, floor 2, margin 0.3; kernel gammaFor), unbound when no floor/margin is cleared.
// IDENTITY TEST: head h links to its most frequent referent r* only when the share of its bound occurrences going to r* exceeds the random-presence-binding null (200 draws, each occurrence to a uniformly random present referent) by z >= sqrt(2 ln H), H = heads with >= 3 bound occurrences;
// else a typed gap (too_few / not_concentrated). Silver check from appositives ("X, the h" / "the h, X" / "X was the h").
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url'; import { seeded } from './attend.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');
const { gammaFor } = await import(pathToFileURL(path.join(KH, 'native/kernel/activation.js')).href);
const DIALS = { window: 4, boost: 2, floor: 2, margin: 0.3, draws: 200 }; const gamma = gammaFor(DIALS.window);
fs.mkdirSync(path.join(HERE, 'wormholes'), { recursive: true });
const man = JSON.parse(fs.readFileSync(path.join(HERE, 'books-manifest.json'), 'utf8')).filter((m) => m.ok);
for (const id of process.argv.slice(2)) {
  const m = man.find((x) => x.document_id.startsWith(id)); const T = fs.readFileSync(path.join(HERE, m.file), 'utf8');
  const W = JSON.parse(fs.readFileSync(path.join(HERE, 'weft', id + '.weft.json'), 'utf8')); const TR = JSON.parse(fs.readFileSync(path.join(HERE, 'tracked', id + '.json'), 'utf8')); const S = W.sentences; const N = S.length; const off = S.map((s) => s.offset);
  const sentOf = (p) => { let a = 0, b = N - 1; while (a < b) { const k = (a + b + 1) >> 1; if (off[k] <= p) a = k; else b = k - 1; } return a; };
  const mentions = []; for (const c of W.cast ?? []) for (const sp of c.mentionSpans ?? []) mentions.push({ ref: c.ref, start: sp[0], end: sp[1] }); mentions.sort((a, b) => a.start - b.start);
  const overlapsMention = (a, b) => mentions.some((x) => x.start < b && a < x.end);
  // descriptions
  const DET = /^(the|this|that|these|those)\s+/i; const occ = [];
  (W.clauses ?? []).forEach((c, ci) => { for (const [role, a] of [['subj', c.subject], ['obj', c.object]]) { if (!a) continue; const t = T.slice(a.start, a.end); const dm = t.match(DET); if (!dm) continue; if (overlapsMention(a.start, a.end)) continue; let rest = t.slice(dm[0].length).replace(/\s+/g, ' ').trim(); rest = rest.split(/\s+of\s+/i)[0]; const ws = rest.match(/[\p{L}'-]+/gu); if (!ws) continue; const head = ws[ws.length - 1].toLowerCase(); if (head.length < 3) continue; occ.push({ ci, role, pos: a.start, sent: c.sentence ?? sentOf(a.start), head, bound: null, cands: [] }); } });
  // presence simulation in reading order
  const events = new Map(); const push = (s, e) => { if (!events.has(s)) events.set(s, []); events.get(s).push(e); };
  for (const mm of mentions) push(sentOf(mm.start), { k: 'm', pos: mm.start, ref: mm.ref }); for (const b of TR.bindings) push(sentOf(b.offset), { k: 'm2', pos: b.offset, ref: b.ref }); for (const o of occ) push(o.sent, { k: 'd', pos: o.pos, o });
  const state = new Map(); const pres = (r, t) => { const c = state.get(r); return c ? c.v * gamma ** (t - c.t) : 0; }; const fire = (r, t, w) => state.set(r, { v: pres(r, t) + w, t });
  for (let t = 0; t < N; t++) { const ev = (events.get(t) ?? []).sort((a, b) => a.pos - b.pos); let first = true;
    for (const e of ev) { if (e.k === 'm') { fire(e.ref, t, first ? DIALS.boost : 1); first = false; } else if (e.k === 'm2') fire(e.ref, t, 1); else { const cs = []; for (const [r] of state) { const p = pres(r, t); if (p > 0) cs.push([r, p]); } cs.sort((a, b) => b[1] - a[1]); e.o.cands = cs.map((x) => x[0]); if (!cs.length) continue; const top = cs[0][1], second = cs[1]?.[1] ?? 0; if (top >= DIALS.floor && (top - second) / top >= DIALS.margin) e.o.bound = cs[0][0]; } } }
  // identity test per head
  const byHead = new Map(); for (const o of occ) { if (!byHead.has(o.head)) byHead.set(o.head, []); byHead.get(o.head).push(o); }
  const tested = [...byHead].filter(([, os]) => os.filter((o) => o.bound).length >= 3); const H = Math.max(2, tested.length); const thr = Math.sqrt(2 * Math.log(H)); const R = seeded(2026);
  const links = [], gaps = { too_few: 0, not_concentrated: 0 }; const allBinding = new Map();
  for (const [h, os] of byHead) { const bd = os.filter((o) => o.bound); if (bd.length < 3) { gaps.too_few++; continue; }
    const cnt = new Map(); for (const o of bd) cnt.set(o.bound, (cnt.get(o.bound) ?? 0) + 1); const [rs, top] = [...cnt].sort((a, b) => b[1] - a[1])[0]; const s = top / bd.length; allBinding.set(h, rs);
    const nulls = []; for (let d = 0; d < DIALS.draws; d++) { const c2 = new Map(); for (const o of bd) { const r = o.cands[Math.floor(R() * o.cands.length)]; c2.set(r, (c2.get(r) ?? 0) + 1); } nulls.push(Math.max(...c2.values()) / bd.length); }
    const mu = nulls.reduce((a, b) => a + b, 0) / nulls.length; const sd = Math.max(Math.sqrt(nulls.reduce((a, b) => a + (b - mu) ** 2, 0) / nulls.length), 1 / bd.length); const z = (s - mu) / sd;
    if (z >= thr) links.push({ head: h, ref: rs, n: bd.length, occurrences: os.length, share: +s.toFixed(3), z: +z.toFixed(2), mouths: [...new Set(os.map((o) => o.sent))], args: os.map((o) => o.ci + ':' + o.role) }); else gaps.not_concentrated++; }
  // silver witnesses from appositives
  const wit = new Map(); const addW = (h, ref) => { if (!wit.has(h)) wit.set(h, new Map()); wit.get(h).set(ref, (wit.get(h).get(ref) ?? 0) + 1); };
  for (const mm of mentions) { const after = T.slice(mm.end, mm.end + 90), before = T.slice(Math.max(0, mm.start - 70), mm.start);
    let a = after.match(/^\s*,\s*(?:the|a|an)\s+((?:[\p{L}'-]+\s+){0,3}?[\p{L}'-]+)(?=\s*[,.;:])/iu); if (a) addW(a[1].split(/\s+/).pop().toLowerCase(), mm.ref);
    a = after.match(/^\s+(?:was|is|were|are)\s+the\s+((?:[\p{L}'-]+\s+){0,2}?[\p{L}'-]+?)(?=\s*[,.;:]|\s+(?:who|which|that|of)\b)/iu); if (a) addW(a[1].split(/\s+/).pop().toLowerCase(), mm.ref);
    const b = before.match(/\bthe\s+((?:[\p{L}'-]+\s+){0,3}?[\p{L}'-]+)\s*,\s*$/iu); if (b) addW(b[1].split(/\s+/).pop().toLowerCase(), mm.ref); }
  const witRef = (h) => { const m = wit.get(h); return m ? [...m].sort((a, b) => b[1] - a[1])[0][0] : null; };
  const adm = links.filter((l) => witRef(l.head)); const unf = [...allBinding].filter(([h]) => witRef(h));
  const silver = { witnessedHeads: wit.size, admittedWitnessed: adm.length, admittedCorrect: adm.filter((l) => witRef(l.head) === l.ref).length, unfilteredWitnessed: unf.length, unfilteredCorrect: unf.filter(([h, r]) => witRef(h) === r).length };
  fs.writeFileSync(path.join(HERE, 'wormholes', id + '.json'), JSON.stringify({ book: id, dials: DIALS, thr: +thr.toFixed(3), tested: tested.length, occurrences: occ.length, bound: occ.filter((o) => o.bound).length, links, gaps, silver }));
  console.log(id, `descriptions ${occ.length} (bound ${occ.filter((o) => o.bound).length}) heads ${byHead.size} tested ${tested.length} thr ${thr.toFixed(2)} | LINKS ${links.length} gaps ${JSON.stringify(gaps)} | silver admitted ${silver.admittedCorrect}/${silver.admittedWitnessed} unfiltered ${silver.unfilteredCorrect}/${silver.unfilteredWitnessed}`);
}
