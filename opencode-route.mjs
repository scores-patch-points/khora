// opencode-route.mjs — THE CONVERSATION ROUTER: which handling does this ask get, decided before any model call, by INTENT, in any language.
//
//   routeOf(ask, { history }) -> { kind, research, why, language, also? } | { gap, detail, language }
//   kinds: account (an account of a world topic: research first, write from it, check), search (find resources, or something only true now),
//          work (code, files, the workspace), mechanical (settled by computation), creative (invented, or about the speaker's own thing: no research),
//          chat (the model's own view, a feeling, a greeting), followup (acts on the previous turn).
//   research is true for account and search: the asks whose answer is the world's, not the model's.
//
// NO REGEX. The router reads an ask as an INTENT, in two layers that are the same in every language:
//   STRUCTURE (language-neutral by construction): word segmentation by the platform's Unicode segmenter (Intl.Segmenter, which also cuts CJK and Thai), numbers,
//   the question marks of every script (? ¿ ？ ؟), code-shaped tokens (character tests: a backtick, a path, a file name, an identifier, a flag), how short the ask is
//   and whether it names anything, and whether there is a previous turn to act on.
//   KINDS: the words of a language are resolved to the KIND of intent they carry (an invented work, an informative genre, to seek, to convert, the model's own
//   view, a greeting, a work noun, an interrogative) through a per-language kind dictionary kept as DATA (opencode-route-kinds.json: attested surfaces, a giver, a
//   native speaker to refine). The code names no word. The decision is made on kinds, so the same rules route an ask in every language the dictionary covers, and a
//   language it does not cover is a typed gap, never a guess.
// English adds what the English parser (native parser-eng-ewt) alone reads: the root, subject and object, person and definiteness (an ask of the model's own state,
// a pronoun object that acts on the previous turn, a causative that changes a thing, writing about the speaker's own thing). There is no parser for the other
// languages here: that is the measured wall (eval/route/PREREG.md).
import fs from "node:fs";
import { loadEotParser } from "./native/the-fold/eot-notation.js";
import { laneFor } from "./opencode-lane.mjs";
import { languageContextFor } from "./native/the-fold/language-context.js";

const DICT = JSON.parse(fs.readFileSync(new URL("./opencode-route-kinds.json", import.meta.url), "utf8"));
export const KIND_LANGUAGES = Object.keys(DICT.languages);

// ── folding: the same on a surface and on an ask ──────────────────────────────────────────────────────────────────────
const ARABIC_ALEF = new Set(["أ", "إ", "آ"]);
const fold = (s) => {
  let out = "";
  for (const ch of String(s ?? "").normalize("NFD").toLowerCase()) {
    const c = ch.codePointAt(0);
    if ((c >= 0x300 && c <= 0x36f) || (c >= 0x64b && c <= 0x65f) || c === 0x670) continue;   // combining marks, Arabic vowel marks
    if (ARABIC_ALEF.has(ch)) out += "ا";
    else if (ch === "ß") out += "ss";
    else if (ch === "ё") out += "е";
    else out += ch;
  }
  return out;
};
const compiled = Object.fromEntries(Object.entries(DICT.languages).map(([lang, d]) => [lang, { script: d.script, kinds: Object.fromEntries(Object.entries(d).filter(([k]) => k !== "script").map(([k, v]) => [k, v.map(fold)])) }]));
const KIND_NAMES = ["invented", "invent", "genre", "account", "know", "seek", "compute", "arith", "fresh", "view", "greet", "work", "wh", "ask"];
const TOPIC_KINDS = [...KIND_NAMES, "frame"];   // the frame is stripped from a topic but is no intent: it never routes

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
const tokensOf = (folded) => [...segmenter.segment(folded)].filter((s) => s.isWordLike).map((s) => s.segment);
const isNumberToken = (t) => Number.isFinite(Number(t)) && [...t].some((ch) => ch >= "0" && ch <= "9");
const QUESTION_MARKS = new Set(["?", "¿", "？", "؟"]);

/** the language of the ask as a dictionary key: the language context's own reading; else the script (Cyrillic, Arabic, kana, han); else, for Latin script, the dictionary that
 *  reads the ask best (the most kinds of intent found), English on a tie. A plain-ASCII "bonsoir !" is not English because it is ASCII. */
function languageOf(text) {
  const ctx = languageContextFor(text, {});
  const map = { eng: "en", spa: "es", fra: "fr", deu: "de", cmn: "zh", "cmn-hans": "zh", "cmn-hant": "zh", jpn: "ja", arb: "ar", rus: "ru" };
  if (map[ctx.language]) return map[ctx.language];
  for (const ch of text) { const c = ch.codePointAt(0); if (c >= 0x400 && c <= 0x4ff) return "ru"; if (c >= 0x600 && c <= 0x6ff) return "ar"; if (c >= 0x3040 && c <= 0x30ff) return "ja"; if (c >= 0x4e00 && c <= 0x9fff) return "zh"; }
  let best = null, bestN = 0;
  for (const lang of Object.keys(compiled).filter((l) => compiled[l].script === "spaced")) {
    const n = Object.values(kindsIn(text, [lang]).hit).filter(Boolean).length;
    if (n > bestN || (n === bestN && n > 0 && lang === "en")) { best = lang; bestN = n; }
  }
  return best ?? ([...text].every((ch) => ch.codePointAt(0) < 0x80) ? "en" : null);   // nothing read and plain ASCII: English, and the English parser decides the rest
}

/** which kinds of intent the ask's words carry, in the dictionaries of `langs` */
function kindsIn(text, langs) {
  const folded = fold(text);
  const toks = tokensOf(folded);
  const hit = Object.fromEntries(KIND_NAMES.map((k) => [k, false]));
  const at = {};
  for (const lang of langs) {
    const d = compiled[lang];
    if (!d) continue;
    for (const kind of KIND_NAMES) for (const surface of d.kinds[kind] ?? []) {
      let found = false;
      if (d.script === "unspaced" || lang === "ar") found = folded.includes(surface);
      else {
        const parts = surface.split(" ");
        for (let i = 0; i + parts.length <= toks.length && !found; i++) found = parts.every((p, j) => (p.endsWith("*") ? toks[i + j].startsWith(p.slice(0, -1)) : toks[i + j] === p));
        if (found) at[kind] = Math.min(at[kind] ?? 99, toks.findIndex((t, i) => parts.every((p, j) => toks[i + j] !== undefined && (p.endsWith("*") ? toks[i + j].startsWith(p.slice(0, -1)) : toks[i + j] === p))));
      }
      if (found) { hit[kind] = true; break; }
    }
  }
  return { hit, toks, at };
}

// ── code-shaped tokens: character tests ───────────────────────────────────────────────────────────────────────────────
const isLetter = (ch) => ch.toLowerCase() !== ch.toUpperCase();
const isLower = (ch) => isLetter(ch) && ch === ch.toLowerCase();
const isUpper = (ch) => isLetter(ch) && ch === ch.toUpperCase();
const isDigit = (ch) => ch >= "0" && ch <= "9";
const stripEnds = (t) => {
  let a = 0, b = t.length;
  while (a < b && !isLetter(t[a]) && !isDigit(t[a]) && t[a] !== "-" && t[a] !== "." && t[a] !== "`") a++;
  while (b > a && !isLetter(t[b - 1]) && !isDigit(t[b - 1]) && t[b - 1] !== "`") b--;
  return t.slice(a, b);
};
const spaceWords = (s) => s.split("\n").join(" ").split("\t").join(" ").split(" ").filter(Boolean);
function codeShaped(token) {
  if (token.includes("`")) return true;
  const t = stripEnds(token);
  if (!t) return false;
  if (t.startsWith("--") && t.length > 3) return true;
  if (t.includes("/") && t.length > 3 && (t.includes(".") || t.split("/").length > 2)) return true;
  const dot = t.lastIndexOf(".");
  if (dot > 0 && dot < t.length - 2) {                       // a name, a dot, a tail of two to five letters: "cli.mjs", "app.tsx"
    const tail = t.slice(dot + 1);
    if (tail.length <= 5 && [...tail].every((ch) => isLetter(ch) && ch.codePointAt(0) < 0x250) && [...t.slice(0, dot)].some(isLetter)) return true;
  }
  const us = t.indexOf("_");
  if (us > 0 && us < t.length - 1 && [...t].some(isLetter)) return true;
  if (isLower(t[0])) for (let i = 1; i < t.length; i++) if (isUpper(t[i]) && isLower(t[i - 1])) return true;     // getUser, parseConfig
  return false;
}

// ── English only: what the English parser reads ───────────────────────────────────────────────────────────────────────
let parser = null;
async function parse(ask) {
  try { if (!parser) parser = await loadEotParser(); return parser?.ok ? parser.parse(ask) : null; } catch { return null; }
}
const rowsOf = (rec) => (rec?.surface?.lines ?? []).flatMap((line) => {
  const c = String(line).split("\t");
  const id = Number(c[0]);
  if (c.length < 8 || !Number.isInteger(id) || id < 1) return [];
  const feats = {};
  for (const kv of String(c[5] ?? "").split("|")) { const at = kv.indexOf("="); if (at > 0) feats[kv.slice(0, at)] = kv.slice(at + 1); }
  return [{ id, form: c[1], lemma: String(c[2] ?? "").toLowerCase(), upos: c[3], feats, head: Number(c[6]), deprel: c[7] ?? "" }];
});
const depIs = (r, name) => r.deprel === name || r.deprel.startsWith(`${name}:`);

async function englishFacts(text) {
  const rec = ((await parse(text)) ?? []).find((r) => rowsOf(r).length);
  if (!rec) return null;
  const rows = rowsOf(rec);
  const root = rows.find((r) => r.head === 0) ?? rows[0];
  const kids = (id, name) => rows.filter((r) => r.head === id && depIs(r, name));
  const nouns = rows.filter((r) => r.upos === "NOUN" || r.upos === "PROPN");
  const subj = [...kids(root.id, "nsubj"), ...kids(root.id, "csubj")][0];
  const anaphoric = (r) => r.upos === "PRON" && r.feats.Person !== "1" && r.feats.Person !== "2";
  const modifiedBy = (n) => rows.some((r) => r.head === n.id && (depIs(r, "nmod") || depIs(r, "compound") || depIs(r, "acl") || depIs(r, "appos")));
  const embedded = (head) => [...kids(head.id, "xcomp"), ...kids(head.id, "acl"), ...kids(head.id, "ccomp")].some((x) => x.upos === "VERB" && rows.some((r) => r.head === x.id && depIs(r, "obj")));
  const imperative = root.upos === "VERB" && !subj && root.feats.VerbForm === "Inf";
  return {
    rows, root, nouns, subj, imperative, lemmas: new Set(rows.map((r) => r.lemma)),
    interrogative: rows.some((r) => r.feats.PronType === "Int"),
    addressee: (subj && subj.feats.Person === "2") || (root.upos === "PRON" && root.feats.Person === "2"),   // "how are you": the addressee is the copular root
    speaker: Boolean(subj && subj.feats.Person === "1"),
    secondPerson: rows.some((r) => r.feats.Person === "2" && r.upos === "PRON"),
    pronObject: [...kids(root.id, "obj"), ...kids(root.id, "iobj"), ...kids(root.id, "xcomp")].some(anaphoric),
    causative: imperative && kids(root.id, "obj").length > 0 && (embedded(root) || kids(root.id, "obj").some(embedded)),
    evaluation: root.upos !== "VERB" && rows.some((r) => depIs(r, "nsubj") && anaphoric(r)) && rows.some((r) => depIs(r, "cop")) && rows.some((r) => r.upos === "ADJ"),
    privateReferent: nouns.some((n) => rows.some((r) => r.head === n.id && depIs(r, "nmod") && r.deprel.includes("poss") && r.feats.Person === "1")),
    referent: nouns.some((n) => n.upos === "PROPN" || modifiedBy(n)),
    onlyDefinite: nouns.length > 0 && nouns.every((n) => rows.some((r) => r.head === n.id && depIs(r, "det") && r.feats.Definite === "Def") || rows.some((r) => r.head === n.id && r.upos === "ADJ" && r.feats.NumType === "Ord")),
    whereCan: rows.some((r) => r.lemma === "where") && rows.some((r) => r.lemma === "can"),
    seeksImperative: imperative && ["get"].includes(root.lemma),
    barePluralGenre: !subj && root.upos === "NOUN" && root.feats.Number === "Plur",
    bareTopic: !subj && root.upos === "NOUN" && !rows.some((r) => r.head === root.id && r.upos !== "PUNCT"),
    modifiedTopic: !subj && root.upos === "NOUN" && modifiedBy(root),
    bareNoun: !subj && root.upos === "NOUN",
    questionTwoQuantities: rows.filter((r) => r.upos === "NUM").length >= 2 && !rows.some((r) => r.upos === "PROPN"),
    nounCount: nouns.length,
  };
}

// ── the topic: what the ask is about, once the request's frame is taken out ────────────────────────────────────────────
// A search or an account is run on the TOPIC ("dolphins"), never on the request ("write me an essay about dolphins": that finds essay mills). The topic is the
// ask's content words: the words that are not an intent kind (write, essay, explain, find are the request) and not closed-class or a verb, where the class is read
// from the language's own part-of-speech prior (UD gold, pos-<language>.json: the dominant class of the form) and, in English, from the parser. A form the prior has not
// seen is kept: an unknown word is more likely the subject than the frame.
const POS_FILE = { en: "eng", es: "spa", fr: "fra", de: "deu", ru: "rus", zh: "cmn-hans", ja: "jpn", ar: "arb" };
const posPriors = new Map();
function posPrior(lang) {
  if (!posPriors.has(lang)) {
    let forms = null;
    try { forms = JSON.parse(fs.readFileSync(new URL(`./native/priors/pos-${POS_FILE[lang]}.json`, import.meta.url), "utf8")).forms; } catch { /* no prior: every form is kept */ }
    posPriors.set(lang, forms);
  }
  return posPriors.get(lang);
}
const DROP_CLASSES = new Set(["ADP", "DET", "PRON", "AUX", "SCONJ", "CCONJ", "PART", "INTJ", "PUNCT", "VERB", "SYM"]);
function classOf(lang, token) {
  const row = posPrior(lang)?.[token];
  if (!row) return null;
  return Object.entries(row).sort((a, b) => b[1] - a[1])[0][0];
}
export async function topicOf(ask, { language = null } = {}) {
  const text = String(ask ?? "").trim();
  if (!text) return "";
  const lang = language ?? languageOf(text) ?? "en";
  const d = compiled[lang];
  const intentToken = (tok) => d && TOPIC_KINDS.some((k) => (d.kinds[k] ?? []).some((surface) => !surface.includes(" ") && (surface.endsWith("*") ? tok.startsWith(surface.slice(0, -1)) : tok === surface)));
  if (lang === "en") {
    const en = await englishFacts(text);
    // the parser's content words, and a word the parser took for a verb that the language's own prior knows as a noun ("earthquakes" after "what causes")
    if (en) return en.rows.filter((r) => (["NOUN", "PROPN", "ADJ", "NUM"].includes(r.upos) || (r.upos === "VERB" && ["NOUN", "PROPN"].includes(classOf("en", r.form.toLowerCase())))) && !intentToken(fold(r.form))).map((r) => r.form).join(" ");
  }
  let work = text;
  if (d?.script === "unspaced" || lang === "ar") {
    const folded = fold(text);
    for (const kind of TOPIC_KINDS) for (const surface of d.kinds[kind] ?? []) if (surface.length > 0) work = fold(work).split(surface).join(" ");
    work = fold(work);
  }
  const out = [];
  for (const seg of segmenter.segment(work)) {
    if (!seg.isWordLike) continue;
    const f = fold(seg.segment);
    if (d?.script !== "unspaced" && lang !== "ar" && intentToken(f)) continue;
    if ([...seg.segment].length === 1 && isLetter(seg.segment) && seg.segment.codePointAt(0) < 0x4e00) continue;   // a lone particle or clitic, not a han character
    const cls = classOf(lang, f) ?? classOf(lang, seg.segment.toLowerCase());
    if (cls && DROP_CLASSES.has(cls)) continue;
    out.push(seg.segment);
  }
  return out.join(" ");
}

export async function routeOf(ask, opts = {}) {
  const v = await decide(ask, opts);
  return v.research ? { ...v, topic: await topicOf(ask, { language: v.language === "undecided" ? null : v.language }) } : v;
}

async function decide(ask, { history = [] } = {}) {
  const text = String(ask ?? "").trim();
  if (!text) return { gap: "empty-ask", detail: "no ask to route" };
  const lang = languageOf(text);
  const langs = lang && compiled[lang] ? [lang] : Object.keys(compiled).filter((l) => compiled[l].script === "spaced");
  const verdict = (kind, why, extra = {}) => ({ kind, research: kind === "account" || kind === "search", why, language: lang ?? "undecided", ...extra });
  const gap = (g, detail) => ({ gap: g, detail, language: lang ?? "undecided" });
  const { hit, toks, at } = kindsIn(text, langs);
  const numbers = toks.filter(isNumberToken);
  const en = lang === "en" ? await englishFacts(text) : null;
  const last = [...text.trimEnd()].pop();
  const question = QUESTION_MARKS.has(last) || [...text].some((ch) => QUESTION_MARKS.has(ch)) || hit.ask || (en ? en.interrogative : hit.wh && at.wh === 0);
  const imperative = en ? en.imperative : false;

  // 1. settled by computation: the reason-gate's own mechanical lane (English), or arithmetic and conversion read as kinds over numbers
  { const lane = await laneFor({ ask: text }).catch(() => null); if (lane?.ok && lane.lane === "mechanical") return verdict("mechanical", "a mechanism settles it (computed, never generated)"); }
  if (hit.compute && numbers.length >= 1) return verdict("mechanical", "a computing verb over a number");
  if (hit.arith && numbers.length >= 2) return verdict("mechanical", "an arithmetic word over two numbers");
  if (en?.questionTwoQuantities && question) return verdict("mechanical", "a question over two quantities with nothing named");
  // 2. the code and the workspace
  if (spaceWords(text).some(codeShaped) || hit.work) return verdict("work", "a code-shaped token or a work noun");
  if (en?.causative) return verdict("work", "asks to change how a thing behaves");
  // 3. the model's own state, a greeting, feedback on what it just said
  if (en?.root.upos === "PRON" && en.root.feats.Person === "2") return verdict("chat", "a question about the addressee's own state");
  if (hit.greet && toks.length <= 6) return verdict("chat", "a greeting, thanks or farewell");
  if (en?.evaluation && !question) return verdict("chat", "an evaluation of the previous turn");
  // 4. acts on the previous turn: a pronoun object, only definite back-references, or a short ask that names no world referent
  if (history.length) {
    const rawToks = [...segmenter.segment(text)].filter((x) => x.isWordLike).map((x) => x.segment);
    const named = en ? en.referent : rawToks.slice(1).some((t) => isUpper(t[0]));   // a capital past the first word names something (cased scripts)
    const intentful = hit.invented || hit.genre || hit.account || hit.seek || hit.compute || hit.view || hit.invent;
    if (en?.pronObject) return verdict("followup", "acts on a pronoun object");
    if (toks.length <= 4 && !intentful && !named && !(hit.wh && toks.length > 1)) return verdict("followup", "short, and names nothing in the world");
    if (en?.onlyDefinite) return verdict("followup", "only definite back-references");
  }
  // 5. invented work, or writing about the speaker's own thing
  const accountSignal = hit.genre || hit.account || (hit.know && (hit.wh || question || en?.referent));
  if (en && accountSignal && en.privateReferent) return verdict("creative", "writing about the speaker's own thing: nothing in the world to read");
  if (hit.invent && (at.invent === undefined || at.invent <= 1) && !(en && en.interrogative)) return verdict("creative", "the verb invents");
  if (hit.invented && !accountSignal) return verdict("creative", "asks for an invented work");
  if (accountSignal && hit.invented) return verdict("account", "an account and an invented work in one ask", { also: "creative" });
  // 6. something only true now, or resources to be found
  if (hit.fresh && (question || hit.seek || hit.account || imperative)) return verdict("search", "asks for something only true now");
  if (hit.seek) return verdict("search", "the verb seeks");
  if (en && (en.whereCan || en.seeksImperative)) return verdict("search", en.whereCan ? "asks where something can be had" : "the imperative gets");
  if (en && en.barePluralGenre && hit.genre) return verdict("search", "a bare plural genre noun asks for pieces to be found");
  // 7. the model's view, then an account
  if (hit.view) return verdict("chat", "asks what the model thinks or prefers");
  if (accountSignal) return verdict("account", "asks for an account (an informative genre, an accounting verb, or what is known)");
  if (en && (en.addressee || en.secondPerson)) return verdict("chat", "asks the model's own view or state");
  // 8. what is left, by shape
  if (question && !(en?.speaker)) return verdict("account", "a question about a third thing");
  if (en) {
    if (en.bareTopic) return verdict("account", "a bare noun is a topic");
    if (en.modifiedTopic) return verdict("account", "a bare topic");
    if (en.bareNoun) return verdict("chat", "a bare noun with only an adjective (a greeting)");
    if (en.speaker && !question) return verdict("chat", "a statement about the speaker");
    if (!en.nounCount) return verdict("chat", "names nothing in the world");
    return gap("unclassified", `root ${en.root.lemma}/${en.root.upos}, ${en.nounCount} noun(s)`);
  }
  return gap("no-intent-read", `no kind of intent found in the ${lang ?? "undecided"} dictionary; ${KIND_LANGUAGES.includes(lang) ? "" : "the language is not covered; "}${toks.length} word(s)`);
}
