// clause-attach.js — attach every clause argument of a read text to a cast referent, the way a tracker assigns detections to standing hypotheses.
//
//   attachClauses(text, weft, { dials }) -> { args, bindings, gaps, stats }
//
// `weft` is the one reader's output (native/the-fold/read-process.mjs::readToWeft): cast (mention spans), clauses (subject / object spans), sentences.
// Three rungs, in order, for each clause argument (subject and object):
//   (1) OVERLAP: its span overlaps a mention span of a cast referent -> that referent ("the King" holds the mention "King").
//   (2) PRONOUN: a third-person singular pronoun the presence rung binds (./pronouns.js::resolvePronounsByPresence, decayed presence over the cast's
//       mentions) -> the bound referent. The canonical read already carries these bindings (`weft.pronounsPresence`, the default dials, ./pronoun-presence-chosen.js); they are reused.
//   (3) SPEAKER: "I / me / my / myself" in a quotation, or in a play's speech paragraph, -> the speaker: the nearest cast mention after the closing quote,
//       else before the opening quote, in the same paragraph without crossing another quote mark; a cast mention that opens a paragraph and is followed by
//       "." or ":" (after an optional parenthesis) or a newline labels a play speech. No numeric window.
// "you", "we", "it", "they", relatives and below-margin pronouns stay UNATTACHED: a typed gap, never a guess.
//
// `args` maps "<clauseIndex>:subj" | "<clauseIndex>:obj" to a referent. `bindings` are the presence rung's pronoun bindings ({ offset, ref, sentence, pronoun }).
// Status: EXPERIMENTAL. The speaker rung has no gold set; the pronoun rung's 84% precision is on GUM slice B, not on novels (identity/novels rounds 4, 9).
import { resolvePronounsByPresence } from "./pronouns.js";
import { defaultPronounPresence } from "./pronoun-presence-chosen.js";

const FIRST = new Set(["i", "me", "my", "myself"]);
const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export function attachClauses(text, weft, { dials } = {}) {
  const T = String(text ?? "");
  const mentions = [];
  for (const c of weft?.cast ?? []) for (const sp of c.mentionSpans ?? []) mentions.push({ ref: c.ref, start: sp[0], end: sp[1] });
  mentions.sort((a, b) => a.start - b.start);
  // the canonical read (read-process.mjs::readToWeft) already bound the pronouns (`weft.pronounsPresence`, the chosen dials): use them, one source of truth.
  // Explicit `dials`, or a weft read without the rung, recompute with the same pure rung over the same mentions.
  let bindings, gaps = [];
  if (!dials && Array.isArray(weft?.pronounsPresence)) bindings = weft.pronounsPresence.map((p) => ({ offset: p.at[0], referentId: p.ref, sentenceOrder: p.sentence, pronoun: p.pronoun }));
  else ({ bindings, gaps } = resolvePronounsByPresence(weft?.sentences ?? [], mentions, dials ?? defaultPronounPresence()));
  const bAt = new Map(bindings.map((b) => [b.offset, b]));

  const paras = [];
  { const re = /[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g; for (let m; (m = re.exec(T));) paras.push({ s: m.index, e: m.index + m[0].length }); }
  const paraOf = (x) => {
    let a = 0, b = paras.length - 1, r = -1;
    while (a <= b) { const m = (a + b) >> 1; if (paras[m].s <= x) { r = m; a = m + 1; } else b = m - 1; }
    return r >= 0 && x < paras[r].e ? paras[r] : null;
  };
  const speakerCache = new Map();
  const speakerAt = (x) => {
    const P = paraOf(x); if (!P) return null;
    const key = P.s + ":" + x; if (speakerCache.has(key)) return speakerCache.get(key);
    let out = null; const pt = T.slice(P.s, P.e); const rel = x - P.s;
    const qs = []; for (let i = 0; i < pt.length; i++) if (pt[i] === '"' || pt[i] === "“" || pt[i] === "”") qs.push(i);
    let open = -1, close = -1;
    for (let k = 0; k + 1 < qs.length; k += 2) if (qs[k] < rel && rel < qs[k + 1]) { open = qs[k]; close = qs[k + 1]; break; }
    const inP = mentions.filter((m) => m.start >= P.s && m.end <= P.e);
    if (open >= 0) {
      const after = inP.filter((m) => m.start - P.s > close && !qs.some((q) => q > close && q < m.start - P.s)).sort((a, b) => a.start - b.start)[0];
      const before = inP.filter((m) => m.end - P.s <= open && !qs.some((q) => q < open && q > m.end - P.s)).sort((a, b) => b.end - a.end)[0];
      out = (after ?? before)?.ref ?? null;
    } else {
      const first = inP[0];
      if (first && first.start - P.s <= 2 && /^[ \t]*(\([^)]*\))?[ \t]*([.:]|\n)/.test(T.slice(first.end, first.end + 120))) out = first.ref;
    }
    speakerCache.set(key, out); return out;
  };

  const lo = (x) => { let a = 0, b = mentions.length; while (a < b) { const m = (a + b) >> 1; if (mentions[m].end <= x) a = m + 1; else b = m; } return a; };
  const exact = new Set(mentions.map((m) => m.start + ":" + m.end));
  const args = {};
  const stats = { clauses: 0, subj: 0, subjExact: 0, subjOverlap: 0, subjPron: 0, subjSpk: 0, obj: 0, objExact: 0, objOverlap: 0, objPron: 0, objSpk: 0 };
  (weft?.clauses ?? []).forEach((c, ci) => {
    stats.clauses++;
    for (const [role, a] of [["subj", c.subject], ["obj", c.object]]) {
      if (!a) continue; stats[role]++;
      if (exact.has(a.start + ":" + a.end)) stats[role + "Exact"]++;
      let ref = null;
      for (let k = lo(a.start); k < mentions.length && mentions[k].start < a.end; k++) if (overlaps(mentions[k], a)) { ref = mentions[k].ref; stats[role + "Overlap"]++; break; }
      if (!ref) for (const [off, b] of bAt) if (off >= a.start && off < a.end) { ref = b.referentId; stats[role + "Pron"]++; break; }
      if (!ref && FIRST.has(String(a.text ?? T.slice(a.start, a.end)).trim().toLowerCase())) { const sp = speakerAt(a.start); if (sp) { ref = sp; stats[role + "Spk"]++; } }
      if (ref) args[ci + ":" + role] = ref;
    }
  });
  return { args, bindings: bindings.map((b) => ({ offset: b.offset, ref: b.referentId, sentence: b.sentenceOrder, pronoun: b.pronoun })), gaps, stats };
}
