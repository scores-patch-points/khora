// ud-tokenize.js — raw text → the treebank's SYNTACTIC words, for any language with a UD treebank. Everything is learned from the treebank's
// own training split; nothing names a language:
//   contractions   a surface token the treebank writes as a multiword token ("del" → de el, "du" → de le, "zum" → zu dem) is expanded to its
//                  most frequent parts, when it is a multiword token more often than a word of its own
//   elision        a chunk that is no known word splits after an apostrophe whose left side is a known word ("L'aéroport" → L' aéroport)
//   abbreviations  a chunk the treebank keeps whole with its final period ("Inc.", "Dr.") keeps it
//   no spaces      a run of characters from a script the treebank writes without spaces (Han, Hiragana, Katakana, Thai …) is cut by a
//                  character segmenter trained on the treebank's own word boundaries
// Output keeps byte spans into the text: { form, start, end }; the parts of a contraction share the contraction's span.
import { Perceptron, seeded } from "./english-parser.js";

export const UD_TOKENIZER_SCHEMA = "UDTokenizer@1";
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const PUNCT = /[\p{P}\p{S}]/u;
const lc = (s) => s.toLowerCase();

/** the character class a segmenter feature names: script for letters, digit, punctuation, space */
const kind = (c) => (!c ? "_" : /\p{Script=Han}/u.test(c) ? "H" : /\p{Script=Hiragana}/u.test(c) ? "h" : /\p{Script=Katakana}/u.test(c) ? "k" : /\d/.test(c) ? "D" : /\p{L}/u.test(c) ? "L" : PUNCT.test(c) ? "P" : "S");
function segFeats(cs, i) {
  const c = (k) => cs[i + k] ?? "_", t = (k) => kind(cs[i + k]);
  return ["b", `c0=${c(0)}`, `c-1=${c(-1)}`, `c1=${c(1)}`, `c-2=${c(-2)}`, `c2=${c(2)}`, `c-1c0=${c(-1)}${c(0)}`, `c0c1=${c(0)}${c(1)}`, `c-2c-1=${c(-2)}${c(-1)}`, `c-1c1=${c(-1)}${c(1)}`,
    `t0=${t(0)}`, `t-1t0=${t(-1)}${t(0)}`, `t0t1=${t(0)}${t(1)}`, `t-1t0t1=${t(-1)}${t(0)}${t(1)}`];
}

/** trainTokenizer(sents, { iterations }) → UDTokenizer@1 JSON. sents: parseConllu's shape (tokens and multi) */
export function trainTokenizer(sents, { iterations = 5, seed = "ud-tokenize", log = null } = {}) {
  const asMwt = new Map(), asWord = new Map(), words = new Set(), abbrev = new Set();
  for (const s of sents) {
    for (const t of s.tokens) { const f = lc(t.form); words.add(f); asWord.set(f, (asWord.get(f) ?? 0) + 1); if (/\p{L}\.$/u.test(t.form) && t.form.length > 2) abbrev.add(f); }
    for (const m of s.multi ?? []) {
      const form = lc(m.form ?? m.surface ?? ""), [a, b] = String(m.id ?? m.range ?? "").split("-").map(Number);
      if (!form || !a || !b) continue;
      const parts = s.tokens.slice(a - 1, b).map((t) => lc(t.form)).join(" "), e = asMwt.get(form) ?? new Map();
      e.set(parts, (e.get(parts) ?? 0) + 1); asMwt.set(form, e);
    }
  }
  // an abbreviation keeps its period only when the treebank writes the word with it more often than without ("Inc." yes, "kg." no:
  // "kg" is the unit, and "60 kg." ends a sentence)
  for (const a of [...abbrev]) if ((asWord.get(a) ?? 0) <= (asWord.get(a.slice(0, -1)) ?? 0)) abbrev.delete(a);
  const mwt = {};
  for (const [form, e] of asMwt) { const n = [...e.values()].reduce((x, y) => x + y, 0); if (n > (asWord.get(form) ?? 0)) mwt[form] = [...e.entries()].sort((x, y) => y[1] - x[1])[0][0].split(" "); }
  // the segmenter: only when the treebank has words in an unspaced script
  let segmenter = null;
  const runs = [];
  for (const s of sents) { const ws = s.tokens.map((t) => t.form).filter((f) => UNSPACED.test(f)); if (ws.length) { const cs = [], tags = []; for (const t of s.tokens) { const ch = [...t.form]; ch.forEach((c, k) => { cs.push(c); tags.push(k === 0 ? 1 : 0); }); } runs.push({ cs, tags }); } }
  if (runs.length > sents.length * 0.3) {
    const P = new Perceptron(["I", "B"]), rnd = seeded(seed);
    for (let it = 0; it < iterations; it++) {
      const order = runs.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      let ok = 0, n = 0;
      for (const i of order) { const { cs, tags } = runs[i]; for (let k = 0; k < cs.length; k++) { const f = segFeats(cs, k), g = P.best(f); P.update(tags[k], g, f); ok += g === tags[k]; n++; } }
      log?.(`segmenter iteration ${it + 1}: ${(100 * ok / n).toFixed(2)}% boundaries`);
    }
    P.average(); segmenter = P.toJSON();
  }
  // multi-character punctuation the treebank keeps whole ("``", "''", "..."), clitics it writes after a hyphen ("-il", "-t-il"), and whether it
  // cuts words at their hyphens ("Bosnien - Herzegowina"): it does when words with an inner hyphen are rarer as words than as text
  const punctRuns = [...words].filter((w) => w.length > 1 && [...w].every((c) => PUNCT.test(c)));
  const hyphenClitics = [...words].filter((w) => /^-\p{L}/u.test(w));
  let inText = 0, asWords = 0;
  for (const s of sents) { inText += (s.text?.match(/\p{L}-\p{L}/gu) ?? []).length; asWords += s.tokens.filter((t) => /\p{L}-\p{L}/u.test(t.form)).length; }
  return { schema: UD_TOKENIZER_SCHEMA, mwt, abbrev: [...abbrev], words: [...words].filter((w) => /['’]$/.test(w)), punctRuns, hyphenClitics, splitHyphens: inText > 0 && asWords < inText / 2, segmenter };
}

/** loadTokenizer(json) → a tokenizer tokenizeWith() takes */
export function loadTokenizer(json) {
  return { mwt: new Map(Object.entries(json.mwt ?? {})), abbrev: new Set(json.abbrev ?? []), elided: new Set((json.words ?? []).map((w) => w.replace(/’/g, "'"))), punctRuns: [...(json.punctRuns ?? [])].sort((a, b) => b.length - a.length),
    clitics: [...(json.hyphenClitics ?? [])].sort((a, b) => b.length - a.length), splitHyphens: !!json.splitHyphens, seg: json.segmenter ? Perceptron.fromJSON(json.segmenter) : null };
}

/** cut a run of unspaced characters into words with the segmenter */
function segmentRun(seg, run) { const cs = [...run], out = []; let cur = ""; cs.forEach((c, k) => { if (k > 0 && seg.best(segFeats(cs, k)) === 1) { out.push(cur); cur = ""; } cur += c; }); if (cur) out.push(cur); return out; }

/** tokenizeWith(tok, text) → [{ form, start, end }] the treebank's syntactic words */
export function tokenizeWith(tok, text) {
  const raw = String(text ?? ""), out = [];
  const push = (form, start, end) => out.push({ form, start, end });
  for (const m of raw.matchAll(/\S+/g)) {
    let chunk = m[0], at = m.index;
    // leading and trailing punctuation, except an abbreviation's own period and a number's separators
    const lead = [], trail = [];
    const runAt = (end) => tok.punctRuns.find((r) => (end ? chunk.endsWith(r) : chunk.startsWith(r)) && chunk.length > r.length) ?? null;
    while (chunk.length > 1 && PUNCT.test(chunk[0]) && !/^['’]\p{L}/u.test(chunk)) { const r = runAt(false) ?? chunk[0]; lead.push(r); chunk = chunk.slice(r.length); }
    while (chunk.length > 1 && PUNCT.test(chunk.at(-1)) && !tok.abbrev.has(lc(chunk))) { const r = runAt(true) ?? chunk.at(-1); trail.unshift(r); chunk = chunk.slice(0, -r.length); }
    if (tok.punctRuns.includes(chunk) || (chunk.length > 1 && [...chunk].every((c) => PUNCT.test(c)) && !tok.punctRuns.length)) { push(chunk, at, at + chunk.length); at += chunk.length; for (const p of trail) { push(p, at, at + p.length); at += p.length; } continue; }
    for (const p of lead) { push(p, at, at + p.length); at += p.length; }
    const pieces = [];
    // an elided word glued to the next ("L'aéroport", "d'eau", "qu'il")
    const el = /^(\p{L}+['’])(\p{L}.*)$/u.exec(chunk);
    // an elision is the same word with a straight or a curly apostrophe ("l'", "l’")
    let rest = chunk; if (el && tok.elided.has(lc(el[1]).replace(/’/g, "'"))) { pieces.push(el[1]); rest = el[2]; }
    // a clitic after a hyphen ("a-t-il" → a -t-il), then the treebank's own hyphen policy
    const cl = tok.clitics.find((c) => lc(rest).endsWith(c) && rest.length > c.length);
    const tail = cl ? rest.slice(rest.length - cl.length) : null; if (cl) rest = rest.slice(0, rest.length - cl.length);
    if (tok.splitHyphens && /\p{L}-\p{L}/u.test(rest)) for (const x of rest.split(/(-)/)) { if (x) pieces.push(x); } else pieces.push(rest);
    if (tail) pieces.push(tail);
    for (const p of pieces) {
      if (tok.seg && UNSPACED.test(p)) {
        // split the chunk into unspaced runs and the rest (digits, Latin, punctuation inside it)
        for (const r of p.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}ー々〆]+|\d+(?:[.,]\d+)*|[\p{L}\p{M}]+|[^\s]/gu) ?? [p]) {
          const ws = UNSPACED.test(r) ? segmentRun(tok.seg, r) : [r];
          for (const w of ws) { push(w, at, at + w.length); at += w.length; }
        }
        continue;
      }
      const parts = tok.mwt.get(lc(p));
      if (parts) { parts.forEach((x, k) => push(k === 0 && /^\p{Lu}/u.test(p) ? x[0].toUpperCase() + x.slice(1) : x, at, at + p.length)); at += p.length; }
      else { push(p, at, at + p.length); at += p.length; }
    }
    for (const p of trail) { push(p, at, at + p.length); at += p.length; }
  }
  // a run of unspaced script inside running punctuation-free text was handled above; trailing sentence punctuation is its own token
  return out;
}
