// tracker.mjs <id8>... — round 4 (PREREG-ROUND4.md). Attach every clause argument of a book's weft to a cast referent, the way a tracker assigns detections to standing hypotheses:
//   (1) an argument whose span overlaps a mention span of a cast referent is that referent (overlap, not exact match: "the King" holds the mention "King");
//   (2) a third-person singular pronoun the presence rung binds (khora native/adapters/text/pronouns.js::resolvePronounsByPresence, decayed presence over the cast's mentions; the dials are
//       the ones declared and validated in eval/referents/PREREG-PRESENCE.md and are NOT retuned here: window 4, boost 2, feed 1, floor 2, margin 0.3, locality off) attaches the argument to the bound referent.
// Writes tracked/<id8>.json { args: {"<ci>:subj"|"<ci>:obj": ref}, bindings: [{offset, ref, sentence}], stats }.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');
const { resolvePronounsByPresence } = await import(pathToFileURL(path.join(KH, 'native/adapters/text/pronouns.js')).href);
const DIALS = { window: 4, boost: 2, feed: 1, floor: 2, margin: 0.3, locality: false, language: 'en' };
fs.mkdirSync(path.join(HERE, 'tracked'), { recursive: true });
for (const id of process.argv.slice(2)) {
  const W = JSON.parse(fs.readFileSync(path.join(HERE, 'weft', id + '.weft.json'), 'utf8'));
  const mentions = []; for (const c of W.cast ?? []) for (const sp of c.mentionSpans ?? []) mentions.push({ ref: c.ref, start: sp[0], end: sp[1] });
  mentions.sort((a, b) => a.start - b.start);
  const { bindings, gaps } = resolvePronounsByPresence(W.sentences, mentions, DIALS);
  const bAt = new Map(bindings.map((b) => [b.offset, b]));
  // rung 2: SPEAKER. "I / me / my / myself" in a quoted span is the speaker: the cast referent attributed beside the quote inside the same paragraph and not across another quote mark (the nearest mention after the closing
  // quote, else before the opening quote); in a play, a cast mention that opens a paragraph and is followed by "." or ":" labels the paragraph's speaker. No numeric window.
  const man = JSON.parse(fs.readFileSync(path.join(HERE, 'books-manifest.json'), 'utf8')).find((m) => m.ok && m.document_id.startsWith(id)); const T = fs.readFileSync(path.join(HERE, man.file), 'utf8');
  const paras = []; { const re = /[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g; for (let m; (m = re.exec(T));) paras.push({ s: m.index, e: m.index + m[0].length }); }
  const paraOf = (x) => { let a = 0, b = paras.length - 1, r = -1; while (a <= b) { const m = (a + b) >> 1; if (paras[m].s <= x) { r = m; a = m + 1; } else b = m - 1; } return r >= 0 && x < paras[r].e ? paras[r] : null; };
  const speakerCache = new Map();
  const speakerAt = (x) => { const P = paraOf(x); if (!P) return null; if (speakerCache.has(P.s + ':' + x)) return speakerCache.get(P.s + ':' + x);
    let out = null; const pt = T.slice(P.s, P.e); const rel = x - P.s;
    const qs = []; for (let i = 0; i < pt.length; i++) if (pt[i] === '"' || pt[i] === '\u201c' || pt[i] === '\u201d') qs.push(i);
    let open = -1, close = -1; for (let k = 0; k + 1 < qs.length; k += 2) if (qs[k] < rel && rel < qs[k + 1]) { open = qs[k]; close = qs[k + 1]; break; }
    const inP = mentions.filter((m) => m.start >= P.s && m.end <= P.e);
    if (open >= 0) { const after = inP.filter((m) => m.start - P.s > close && !qs.some((q) => q > close && q < m.start - P.s)).sort((a, b) => a.start - b.start)[0]; const before = inP.filter((m) => m.end - P.s <= open && !qs.some((q) => q < open && q > m.end - P.s)).sort((a, b) => b.end - a.end)[0]; out = (after ?? before)?.ref ?? null; }
    else { const first = inP[0]; if (first && first.start - P.s <= 2 && /^[ \t]*(\([^)]*\))?[ \t]*([.:]|\n)/.test(T.slice(first.end, first.end + 120))) out = first.ref; }
    speakerCache.set(P.s + ':' + x, out); return out; };
  const FIRST = new Set(['i', 'me', 'my', 'myself']); const ov = (a, b) => a.start < b.end && b.start < a.end;
  const args = {}; const st = { clauses: 0, subj: 0, subjOverlap: 0, subjPron: 0, obj: 0, objOverlap: 0, objPron: 0, subjExact: 0, objExact: 0 };
  const exact = new Set(mentions.map((m) => m.start + ':' + m.end));
  // mention index by start for a binary-ish scan
  const lo = (x) => { let a = 0, b = mentions.length; while (a < b) { const m = (a + b) >> 1; if (mentions[m].end <= x) a = m + 1; else b = m; } return a; };
  (W.clauses ?? []).forEach((c, ci) => { st.clauses++;
    for (const [role, a] of [['subj', c.subject], ['obj', c.object]]) { if (!a) continue; st[role]++; if (exact.has(a.start + ':' + a.end)) st[role + 'Exact']++;
      let ref = null; for (let k = lo(a.start); k < mentions.length && mentions[k].start < a.end; k++) if (ov(mentions[k], a)) { ref = mentions[k].ref; st[role + 'Overlap']++; break; }
      if (!ref) for (const [off, b] of bAt) { if (off >= a.start && off < a.end) { ref = b.referentId; st[role + 'Pron']++; break; } }
      if (!ref && FIRST.has(a.text.trim().toLowerCase())) { const sp = speakerAt(a.start); if (sp) { ref = sp; st[role + 'Spk'] = (st[role + 'Spk'] ?? 0) + 1; } }
      if (ref) args[ci + ':' + role] = ref; } });
  fs.writeFileSync(path.join(HERE, 'tracked', id + '.json'), JSON.stringify({ args, bindings: bindings.map((b) => ({ offset: b.offset, ref: b.referentId, sentence: b.sentenceOrder, pronoun: b.pronoun })), gaps: gaps.length, stats: st }));
  const pc = (n, d) => (100 * n / d).toFixed(1) + '%';
  console.log(id, `clauses ${st.clauses} | subjects ${st.subj}: exact ${pc(st.subjExact, st.subj)} overlap ${pc(st.subjOverlap, st.subj)} +pronoun-bound ${pc(st.subjPron, st.subj)} +speaker ${pc(st.subjSpk ?? 0, st.subj)} => attached ${pc(st.subjOverlap + st.subjPron + (st.subjSpk ?? 0), st.subj)} | objects ${st.obj}: overlap ${pc(st.objOverlap, st.obj)} +pron ${pc(st.objPron, st.obj)} | pronouns bound ${bindings.length}`);
}
