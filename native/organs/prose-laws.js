// prose-laws.js — the laws a mechanical sentence must obey, and the composer that builds sentences out of byte-addressed segments. Pure.
// Spec: CALLIMACHUS draft 1 §9.2 (frames), with the house's own writing rules gathered into one checkable set.
//
//   seg.frame(text)                 → a frame segment: words from the closed frame set (this file and cube-telling.js), giver: the author
//   seg.source(text, address)       → a source segment: bytes copied from a pinned source at a versioned address (L4)
//   sentence(segs, grounds)         → { segs, grounds, text }
//   lintSentence(s) / lintParagraph(ss) → violations [{ law, detail }]; empty = lawful
//   firstLawful(candidates)         → the first candidate sentence with no violations, plus every refusal on the way (never paraphrased)
//   num(n) / count(n, noun) / agree(n, one, many) / article(word) / listOf(xs)
//                                   → the frame helpers that make the laws hold by construction (the lint still checks them)
//
// THE LAWS. Each names its giver. A law is a check, never a rewrite: a candidate that breaks one is passed over for the next candidate or
// refused with the law's id. Source bytes are never edited to satisfy a law; only the span chosen can change (trimSpan narrows a span to a
// clean clause and mints the narrower address).
export const LAWS = Object.freeze({
  PL1: { says: "a sentence opens with a capital letter", giver: "standard orthography (Chicago Manual of Style, 17th ed., 6.1)" },
  PL2: { says: "a sentence ends with terminal punctuation", giver: "standard orthography (CMOS 6.12)" },
  PL3: { says: "a sentence never opens with a numeral", giver: "CMOS 9.5" },
  PL4: { says: "zero through nine are spelled out in frame text", giver: "CMOS 9.2" },
  PL5: { says: "a count and its verb agree", giver: "standard grammar; enforced by agree()/count()" },
  PL6: { says: "'a' before a consonant sound, 'an' before a vowel sound (by letter, declared approximation)", giver: "CMOS 5.72, approximated by initial letter" },
  PL7: { says: "quotation marks balance", giver: "CMOS 6.9" },
  PL8: { says: "a quotation is a clean whole clause: no citation markup, at least four words, opens with a capital", giver: "the author, 2026-10-14; the voice brief's 'their words, never ours' (docs/VOICE.md)" },
  PL9: { says: "frame text claims no cause", giver: "the-fold telling.mjs: connectors are grammatical, never causal; the record holds no cause" },
  PL10: { says: "plain language: no machinery words in frame text", giver: "fold-chat-folds.js PLAIN LANGUAGE; memory: EO canon stays backstage" },
  PL11: { says: "adjacent sentences in a paragraph do not open with the same word", giver: "the author, 2026-10-14 (variety of openers)" },
  PL12: { says: "frame text stays within 35 words a sentence", giver: "the author, 2026-10-14, after plainlanguage.gov's short-sentence guidance" },
  PL13: { says: "every source segment is byte-addressed, and every sentence has grounds", giver: "CALLIMACHUS L2, L4" },
  PL14: { says: "every frame word belongs to its cell's declared word set", giver: "callimachus_1 proof, prose.mjs verifySentence (2026-10-14)" },
});

const WORDS_0_9 = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
export const num = (n) => (Number.isInteger(n) && n >= 0 && n <= 9 ? WORDS_0_9[n] : Number(n).toLocaleString("en-US"));
const IRREGULAR = { person: "people", chain: "chains", country: "countries", party: "parties", body: "bodies" };
export const pluralOf = (noun) => IRREGULAR[noun] ?? (/(s|x|ch|sh)$/.test(noun) ? `${noun}es` : /[^aeiou]y$/.test(noun) ? `${noun.slice(0, -1)}ies` : `${noun}s`);
export const count = (n, noun, many = pluralOf(noun)) => (n === 0 ? `no ${many}` : `${num(n)} ${n === 1 ? noun : many}`);
export const agree = (n, one, many) => (n === 1 ? one : many);
export const article = (word) => (/^[aeiou]/i.test(String(word)) ? "an" : "a");
export const listOf = (xs) => (xs.length <= 1 ? xs.join("") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")}, and ${xs.at(-1)}`);
export const capFirst = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);

export const seg = {
  frame: (t) => ({ kind: "frame", t: String(t) }),
  // A value the record computed (a count, a date, a host): not source bytes, not frame words; grounded by the sentence's grounds.
  value: (t) => ({ kind: "value", t: String(t) }),
  source: (t, address) => ({ kind: "source", t: String(t), address }),
};

export function sentence(segs, grounds = []) {
  const s = segs.filter((x) => x && x.t !== "");
  return { segs: s, grounds: [...new Set(grounds)], text: s.map((x) => x.t).join("") };
}

const CAUSAL = /\b(because|therefore|thus|hence|consequently|as a result|so that|led to|caused|causes|due to)\b/i;
const MACHINERY = /\b(atoms?|referents?|pinax|facets?|terrains?|ladder|holons?|spans?|sha256|EOT|GFP|nulls?)\b/;
const CITATION_DEBRIS = /\[\s*\d+\s*\]|↑|\[\s*citation needed\s*\]|\^\s*\w/;
const words = (t) => (String(t).match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []);

/** Quotation marks balance: “ with ”, and ‘ with ’ where ’ is not an apostrophe between letters. Straight quotes pair up. */
export function quotesBalance(t) {
  const s = String(t);
  const dq = (s.match(/“/g) ?? []).length === (s.match(/”/g) ?? []).length;
  const opens = (s.match(/‘/g) ?? []).length;
  const closes = [...s.matchAll(/’/g)].filter((m) => !(/\p{L}/u.test(s[m.index - 1] ?? "") && /\p{L}/u.test(s[m.index + 1] ?? ""))).length;
  const straight = (s.match(/"/g) ?? []).length % 2 === 0;
  const guillemets = (s.match(/«/g) ?? []).length === (s.match(/»/g) ?? []).length;
  return (dq || /„/.test(s)) && opens === closes && straight && guillemets;
}

/**
 * The laws a sentence obeys. Universal laws are checked here; `grammar` (adapters/text/telling-grammar.<lang>.js) supplies its language's
 * quotation marks, causal connectives, machinery words, frame-length bound, and its own language-specific laws (`lawsOf`). Without a
 * grammar the English defaults apply (the original behaviour, kept for callers that predate the grammars).
 */
export function lintSentence(s, grammar = null) {
  const v = [];
  const text = s.text;
  const causal = grammar?.causal ?? CAUSAL, machinery = grammar?.machinery ?? MACHINERY, maxFrame = grammar?.maxFrameWords ?? 35;
  const frameText = s.segs.filter((x) => x.kind === "frame").map((x) => x.t).join(" ");
  // PL1 applies only where the script has case: a sentence opening in a caseless script has nothing to capitalise.
  const first = (text.match(/\p{L}/u) ?? [""])[0];
  if (first && first.toLowerCase() !== first.toUpperCase() && !/^[“"‘«„¿¡(]?\p{Lu}/u.test(text)) v.push({ law: "PL1", detail: text.slice(0, 20) });
  if (!/[.!?。！？][”"’»“)]*$/.test(text.trim())) v.push({ law: "PL2", detail: text.slice(-20) });
  if (!quotesBalance(text)) v.push({ law: "PL7", detail: text.slice(0, 40) });
  for (const x of s.segs.filter((x) => x.kind === "source" && x.quoted)) {
    if (CITATION_DEBRIS.test(x.t)) v.push({ law: "PL8", detail: `citation markup in “${x.t.slice(0, 30)}”` });
    if (words(x.t).length < 4) v.push({ law: "PL8", detail: `fragment “${x.t}”` });
    const qf = (x.t.trim().match(/\p{L}/u) ?? [""])[0];
    if (qf && qf.toLowerCase() !== qf.toUpperCase() && !/^\p{Lu}/u.test(x.t.trim())) v.push({ law: "PL8", detail: `opens mid-clause “${x.t.slice(0, 20)}”` });
  }
  if (causal.test(frameText)) v.push({ law: "PL9", detail: frameText.match(causal)[0] });
  if (machinery.test(frameText)) v.push({ law: "PL10", detail: frameText.match(machinery)[0] });
  if (words(frameText).length > maxFrame) v.push({ law: "PL12", detail: `${words(frameText).length} frame words` });
  if (!s.grounds.length || s.segs.some((x) => x.kind === "source" && !x.address)) v.push({ law: "PL13", detail: "ungrounded" });
  v.push(...(grammar?.lawsOf ? grammar.lawsOf(s) : englishLaws(s)));
  return v;
}

// The English laws, for callers with no grammar (the grammar file carries the same rules as its `lawsOf`).
function englishLaws(s) {
  const v = [];
  if (/^\s*[“"(]?\d/.test(s.text)) v.push({ law: "PL3", detail: s.text.slice(0, 12) });
  const numeralMode = s.segs.some((x) => x.count >= 10);
  for (const x of s.segs.filter((y) => (y.kind === "frame" || y.kind === "value") && !y.cldr)) {
    if (!(numeralMode && x.count != null)) for (const m of x.t.matchAll(/(?<![\d,.\-–:])\b([0-9])\b(?![\d,.\-–:%])/g)) v.push({ law: "PL4", detail: `“${m[0]}” in “${x.t.trim()}”` });
    for (const m of x.t.matchAll(/\b(a|an) ([\p{L}]+)/giu)) {
      const want = article(m[2]);
      if (m[1].toLowerCase() !== want && !/^(one|uni|use|eu|hour|honest|honou?r)/i.test(m[2])) v.push({ law: "PL6", detail: m[0] });
    }
    if (/\b(one|1) [\p{L}]+s (are|were|have|declare|appear|carry|name|speak)\b/iu.test(x.t)) v.push({ law: "PL5", detail: x.t.trim() });
  }
  return v;
}

export function lintParagraph(ss) {
  const v = [];
  const opener = (s) => (words(s.text)[0] ?? "").toLowerCase();
  for (let i = 1; i < ss.length; i++) if (opener(ss[i]) && opener(ss[i]) === opener(ss[i - 1])) v.push({ law: "PL11", detail: `two sentences open with “${opener(ss[i])}”`, at: i });
  return v;
}

/** The first candidate that passes every law. Candidates are tried in the order given; each failure is kept as a typed refusal. */
/**
 * Every word of every FRAME segment must be one of the cell's declared words (lowercased); values and source bytes are slots and exempt.
 * After the zip proof's verifySentence: a realiser that invented a word fails here.
 */
export function verifyWords(s, allowed) {
  const bad = [];
  for (const x of s.segs.filter((y) => y.kind === "frame")) for (const w of words(x.t)) if (!allowed.has(w.toLowerCase())) bad.push(w);
  return bad.length ? [{ law: "PL14", detail: `undeclared frame words: ${[...new Set(bad)].join(", ")}` }] : [];
}

export function firstLawful(candidates) {
  const refused = [];
  for (const c of candidates) {
    if (!c) continue;
    const v = lintSentence(c);
    if (!v.length) return { sentence: c, refused };
    refused.push({ text: c.text.slice(0, 80), violations: v });
  }
  return { sentence: null, refused };
}

// ---- byte arithmetic for narrowing a source span --------------------------------------------------------------------------------

const enc = new TextEncoder();
const ADDR = /^(px_[0-9a-f]+)\/(raw|text)@([0-9a-f]+)#b(\d+)-(\d+)$/;

/**
 * Narrow a sliced span to [from, to) of its own text (UTF-16 indices into `text`), returning the new text and the new versioned address.
 * The bytes are not edited: the narrower address names a sub-span of the same pinned layer.
 */
export function narrow(address, text, from, to) {
  const m = String(address).match(ADDR);
  if (!m) return null;
  const b0 = Number(m[4]) + enc.encode(text.slice(0, from)).length;
  const b1 = Number(m[4]) + enc.encode(text.slice(0, to)).length;
  return { text: text.slice(from, to), address: `${m[1]}/${m[2]}@${m[3]}#b${b0}-${b1}` };
}

/** Trim citation debris, list bullets and outer quotation marks from a sliced span, by narrowing it; never by editing it. */
export function cleanSpan(address, text) {
  let s = 0, e = text.length;
  // A span that crosses a line break carries a heading or a list with it: narrow to its longest line.
  if (/\n/.test(text)) {
    let best = [0, 0], at = 0;
    for (const line of text.split("\n")) { if (line.trim().length > best[1] - best[0]) best = [at, at + line.length]; at += line.length + 1; }
    [s, e] = best;
  }
  const lead = /^(\s|-\s|↑\s?|\[\s*\d+\s*\]\s*|[“"‘])+/u.exec(text.slice(s, e));
  if (lead) s += lead[0].length;
  for (;;) {
    const tail = /(\s|[,;:]|\[\s*\d+\s*\]|[”"’](?![\p{L}]))+$/u.exec(text.slice(s, e));
    if (!tail || !tail[0].length) break;
    e -= tail[0].length;
  }
  return narrow(address, text, s, e);
}
