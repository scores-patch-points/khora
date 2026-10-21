// wikt-gloss.js — a word of any language → its NEUTRAL KEY, from English Wiktionary's gloss of it: "descubrir" (Spanish verb) → "to discover"
// → discover; "proceso" → "process"; "grande" → "big". The keys the meaning check compares (eot-claim-match.js) are these glosses, so one
// relation said in two languages is one key. The gloss of a word is its entry's first sense for the part of speech the parse gave it; a
// sense that only names another form ("plural of grande", "first-person singular of pesar") is followed once to that form's entry. A word
// with no entry keeps its own lemma (the caller's fallback): nothing is guessed.
//   makeGlossary(lookup) → gloss(lang, lemma, upos) → key | null; lookup(lang, word) → wiktextract entries [{ pos, senses: [{ glosses, form_of }] }]
const POS = { VERB: ["verb"], AUX: ["verb"], NOUN: ["noun"], ADJ: ["adj", "verb"], ADV: ["adv"], NUM: ["num"] };
const ARTICLE = /^(a|an|the|to be|to)\s+/;

/** the head word of an English gloss for that part of speech: "to carry out" → carry; "the process of making" → process; "big, large" → big */
export function headOfGloss(gloss, pos) {
  // "synonym of クロロフィル (kurorofiru, “chlorophyll”)": the gloss is the quoted English, not the word "synonym"
  const q = /^(synonym|alternative form|alternative spelling|abbreviation|short form|clipping) of\b.*?“([^”]+)”/i.exec(String(gloss ?? ""));
  if (q) return headOfGloss(q[2], pos);
  let t = String(gloss ?? "").replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ").toLowerCase().split(/[;,:]/)[0].replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (pos === "verb") { t = t.replace(/^to\s+/, "").replace(/^be\s+/, ""); return t.split(" ")[0] || null; }
  t = t.replace(ARTICLE, "").replace(ARTICLE, "");
  if (pos === "noun") { t = t.split(/\s+(of|that|which|who|in|for|from|with|used)\s+/)[0]; return t.split(" ").at(-1) || null; }
  return t.split(" ")[0] || null;
}

export function makeGlossary(lookup) {
  const memo = new Map();
  const first = (lang, word, pos, depth) => {
    // a language that capitalizes its nouns (German) files them under the capital: "vorgang" is Vorgang, and "pflanze" (a verb form) is
    // also Pflanze — the capital is read whenever no entry has the part of speech the parse gave
    let es = []; try { es = lookup(lang, word) ?? []; if (!es.some((e) => pos.includes(e.pos)) && /^\p{Ll}/u.test(word)) es = [...es, ...(lookup(lang, word[0].toUpperCase() + word.slice(1)) ?? [])]; } catch { es = []; }
    for (const p of pos) for (const e of es ?? []) {
      if (e.pos !== p) continue;
      for (const s of e.senses ?? []) {
        const of = s.form_of?.[0]?.word ?? s.alt_of?.[0]?.word;
        if (of && depth < 1 && of !== word) { const g = first(lang, of, pos, depth + 1); if (g) return g; continue; }
        if (of) continue;
        const g = (s.glosses ?? []).at(-1); const h = g && headOfGloss(g, p === "adj" ? "adj" : p);
        if (h) return h;
      }
    }
    return null;
  };
  return (lang, lemma, upos) => {
    const k = `${lang}\t${lemma}\t${upos}`;
    if (!memo.has(k)) memo.set(k, POS[upos] ? first(lang, lemma, POS[upos], 0) : null);
    return memo.get(k);
  };
}
