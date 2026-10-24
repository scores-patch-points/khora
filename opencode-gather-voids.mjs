// opencode-gather-voids.mjs — the VOID an account has to fill, defined before anything is written.
// An essay is not the pages' sentences strung together; it answers what the corpus shows a reader would ask. A void is one such gap: a
// facet the independent pages say several things about, with the sentences that bear on it and the pages they came from. It is found from
// the corpus alone (no list of facets): the content word that the most remaining sentences share, across at least two sites, seeds a
// void; the sentences that carry it are its material; they leave the pool; the next seed is found among what is left. A nominator (a model,
// given only cards: the facet words and one line each) may rename or drop a void, never add material: what fills a void is the pages'.
import { classOf } from "./opencode-route.mjs";
const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
export const LIMITS = { voids: 6, minSentences: 3, minHosts: 2, perVoid: 6, sentenceChars: 300, minWord: 4, maxShare: 0.5 };

const STOP = new Set(["which", "their", "there", "these", "those", "other", "about", "would", "could", "should", "where", "while", "being", "after", "before", "between", "through", "during", "often", "every", "still", "since", "because", "however", "another", "around", "within", "without", "under", "above", "among", "usually", "called", "known", "found", "many", "most", "some", "such", "more", "than", "also", "only", "both", "each", "into", "from", "with", "that", "this", "they", "them", "have", "been", "were", "when", "what", "will", "your", "just", "like", "over", "very", "much", "make", "made", "well", "even", "most", "several", "different", "including", "number", "large", "small", "called", "does", "none", "same", "then", "than", "here", "less", "least", "form", "forms", "type", "types", "year", "years", "time", "part", "parts", "area", "areas", "group", "groups", "kind", "kinds", "long", "near", "away", "back", "down", "away", "come", "comes", "take", "takes", "much", "must", "away", "used", "uses", "using", "show", "shows", "said", "says", "give", "gives", "keep", "kept", "tend", "tends"]);
const wordsOf = (s) => (s.toLowerCase().match(/[\p{L}]{4,}/gu) ?? []).filter((w) => !STOP.has(w));
const shown = new Map(); // stem -> the form most often written, for a label a person can read
const stem = (w) => w.replace(/(?:ies)$/, "y").replace(/(?:es|s)$/, "");

/** sentences: [{ text, host }] (prose sentences from the read pages); topic: the word(s) every sentence is already about. */
// wordClass: a form's part of speech from the language's prior (NOUN, PROPN, ADJ, NUM, ...), null when unknown; the void's LABEL prefers nouns, so a
// section is titled "River dolphins · Amazon", never "Three" or "Numerous and accredited" (2026-10-23: titles that were the seed words as written).
export function defineVoids(sentences, { topic = "", wordClass = (w) => classOf("en", w) } = {}) {
  const topicStems = new Set(clean(topic).toLowerCase().split(/\s+/).map(stem));
  shown.clear();
  const forms = new Map();
  for (const s of sentences) for (const w of wordsOf(s.text)) { const k = stem(w); const m = forms.get(k) ?? forms.set(k, new Map()).get(k); m.set(w, (m.get(w) ?? 0) + 1); }
  const word = (k) => [...(forms.get(k) ?? new Map([[k, 1]]))].sort((a, b) => b[1] - a[1])[0][0];
  const pool = sentences.map((s, i) => ({ ...s, i, ws: new Set(wordsOf(s.text).map(stem).filter((w) => !topicStems.has(w))) }));
  const voids = [];
  let left = pool.slice();
  while (voids.length < LIMITS.voids && left.length >= LIMITS.minSentences) {
    const df = new Map(), hosts = new Map();
    for (const s of left) for (const w of s.ws) { df.set(w, (df.get(w) ?? 0) + 1); (hosts.get(w) ?? hosts.set(w, new Set()).get(w)).add(s.host); }
    // a seed word: shared by enough sentences from enough sites, but not by most of the pool (that is the topic's own vocabulary)
    const seed = [...df].filter(([w, n]) => n >= LIMITS.minSentences && hosts.get(w).size >= LIMITS.minHosts && n <= left.length * LIMITS.maxShare).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (!seed) break;
    const mine = left.filter((s) => s.ws.has(seed[0]));
    const co = new Map();
    for (const s of mine) for (const w of s.ws) if (w !== seed[0]) co.set(w, (co.get(w) ?? 0) + 1);
    const ranked = [...co].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([w]) => w);
    const isNoun = (k) => { try { const c = wordClass ? wordClass(word(k)) : null; return c === null ? true : c === "NOUN" || c === "PROPN"; } catch { return true; } };
    // the label: the seed when it is a noun, then the most shared nouns among the void's sentences (two words at most); a void with no noun keeps its seed
    const labelStems = isNoun(seed[0]) ? [seed[0]] : [];
    for (const w of ranked) { if (labelStems.length >= 2) break; if (isNoun(w) && !labelStems.includes(w)) labelStems.push(w); }
    if (!labelStems.length) labelStems.push(seed[0]);
    const second = ranked[0];
    voids.push({ id: `v${voids.length + 1}`, label: labelStems.map(word).join(" · "), seed: seed[0], sentences: mine.slice(0, LIMITS.perVoid).map((s) => ({ text: s.text.slice(0, LIMITS.sentenceChars), host: s.host })), hosts: [...hosts.get(seed[0])], size: mine.length });
    const gone = new Set(mine.map((s) => s.i));
    left = left.filter((s) => !gone.has(s.i));
  }
  return voids;
}

/** A nominator's reply is data: `label` lines keyed by void id ("v2: how they hunt"); anything else is dropped; material is never touched. */
export const applyNames = (voids, reply) => {
  const names = new Map([...String(reply ?? "").matchAll(/^\s*(v\d+)\s*[:\-–]\s*(.{3,60})$/gim)].map((m) => [m[1].toLowerCase(), clean(m[2])]));
  return voids.map((v) => (names.has(v.id) ? { ...v, label: names.get(v.id), named: "model" } : v));
};

export const voidPrompt = (voids) => voids.map((v) => `${v.id} (${v.label}): ${v.sentences.slice(0, 2).map((s) => s.text.slice(0, 90)).join(" / ")}`).join("\n");
