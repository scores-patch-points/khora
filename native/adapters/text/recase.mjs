// recase.mjs — restore the capitals a message was typed without, from two givers with provenance, before the English parse (mechanic 3: names without capitals).
//
// The English tagger learned from capitalised text, so "pierre loves natasha" is read with no proper nouns (EXPLORATORY, eval/chat-register/invariance.mjs). This is a
// PRIOR, not a verdict: it only writes a capital where a giver says the word wears one, it never touches a word the writer already cased, and the rows say what it did
// (row.recased = { typed, by }) so a later read can overturn it.
// THE MAN IN THE BOX (native/docs/THE-MAN-IN-THE-BOX.md): how would a person with a notebook and a shelf read a name typed in lowercase? He looks in his NOTEBOOK first, then on his SHELF,
// and where neither knows the word he does not invent a capital: it is read as typed.
//   notebook        a word the writer, or the thread (passed in as `known`), already capitalised somewhere that is not the start of a sentence is that name wherever it recurs lowercase:
//                   the text's own evidence, for any name and any language written with capitals, listed nowhere.
//   (the two shelves below apply only to text typed WITHOUT capitals: any capital but "I" in the message and they stay silent)
//   shelf, casing   priors-shipped/truecase-eng.json (native/scripts/build-truecase-eng.mjs, UD English-EWT train, CC BY-SA): the casing most of a word's non-initial occurrences wear,
//                   counted, never typed ("france" -> "France", "i" -> "I", "monday" -> "Monday").
//   shelf, names    identity/givers/wikidata-given-names-en.json (Wikidata, CC0, fetched 2026-11-18, TRUNCATED by the query service: a name it lacks is simply not recased):
//                   a lowercase word that is a given name and that the treebank calls a proper noun clearly more often than not (NAME_SHARE, 0.8), or never saw. Where the shelf is split ("mark", "bill", "will") the word is left lowercase for the parser to read in its sentence.
// A VALVE, named as one (Brydon audit): a given name must have MIN_GIVEN_NAME_LETTERS letters. The man would know "hi" is a greeting from his shelf of how people write; this machine has no such
// shelf for chat yet (mechanic 4, register normalisation, induces it), so until then a two-letter token is not read as a name. Remove it when that shelf exists.
// A word in the treebank's function-word list is never a name. A sentence-initial word is recased only when a giver names it (the first word's casing is positional, not evidence),
// so "lol" stays "lol". Without the treebank prior nothing is recased and the typed gap says why: no capital is ever guessed.
//   recaseEnglish(text) -> { text, changes: [{ start, end, typed, cased, by }], gaps: [] }      (offsets are into the INPUT text; case changes never move a character)
//   (a lowercase word inside a noun phrase, behind a determiner, is its head: the notebook never copies a capital onto it)
//   markRecased(rows, changes) -> rows with row.recased = { typed, by } on the rows the changes produced
// Status: EXPERIMENTAL (exploratory measurement only; see eval/chat-register/RESULTS-READER.md).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { tokenize } from "./english-parser.js";
import { priorJson } from "../../the-fold/prior-source.mjs";
import { classifyWord } from "./wordclass.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// a given name must be at least this many letters: a two-letter token in chat is a greeting or an abbreviation ("hi", "ty", "np", "ya"), and two-letter given names are rare; a declared dial, chosen on EWT dev and confirmed on EWT test (eval/chat-register/recase-check.mjs)
export const MIN_GIVEN_NAME_LETTERS = Number(process.env.KHORA_RECASE_MIN_NAME ?? 3);
// a given name the treebank never met is NOT recased unless asked (unattested: true). Measured on real chat (eval/chat-register/recase-chat.mjs) the giver's labels collide with other languages' words
// (Hindi in Roman letters: "hai", "kaha", "raha"), SMS spellings and technical words ("samba", "daemon", "ram"): an English giver cannot tell them from names without knowing the language, which is mechanic 5.
export const UNATTESTED_GIVEN_NAMES = process.env.KHORA_RECASE_UNATTESTED === "1";
export const GIVEN_NAMES_FILE = path.join(HERE, "..", "..", "..", "identity", "givers", "wikidata-given-names-en.json");
let given; // undefined = not read yet; null = absent (a typed gap)
export function givenNames(file = GIVEN_NAMES_FILE) {
  if (given !== undefined && file === GIVEN_NAMES_FILE) return given;
  let set = null;
  try { const g = JSON.parse(fs.readFileSync(file, "utf8")); set = new Set([...g.male, ...g.female, ...g.unisex].filter((s) => !s.includes(" ")).map((s) => s.toLowerCase())); } catch { /* absent: the gap is reported by the caller */ }
  if (file === GIVEN_NAMES_FILE) given = set; return set;
}
const closedCache = new WeakMap();
const closedSet = (table) => { if (!closedCache.has(table)) closedCache.set(table, new Set(table.closed ?? [])); return closedCache.get(table); };
const commonCache = new WeakMap();
const commonSet = (table) => { if (!commonCache.has(table)) commonCache.set(table, new Set([...(table.common ?? []), ...(table.closed ?? [])])); return commonCache.get(table); };
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase();

// the part of speech the English POS prior counted most for a word (null when it never met the word, or knows it only as an attested class with no count)
let defaultPos; // undefined = not read yet; null = no POS prior
const posFromPrior = (w) => { if (defaultPos === undefined) defaultPos = priorJson("pos-eng.json") ?? null; if (!defaultPos) return null; const c = classifyWord(w, { posPrior: defaultPos }); const top = c?.found ? c.candidates?.[0] : null; return top && top.count > 0 ? top.upos : null; };
export function recaseEnglish(text, { table = priorJson("truecase-eng.json"), names = givenNames(), known = null, unattested = UNATTESTED_GIVEN_NAMES, posOf = posFromPrior } = {}) {
  const T = String(text ?? ""), gaps = [], changes = [], candidates = [];
  if (!table) { gaps.push({ gap: "no_truecase_prior", detail: "native/priors-shipped/truecase-eng.json is absent: build it with native/scripts/build-truecase-eng.mjs; nothing was recased" }); return { text: T, changes, candidates, gaps }; }
  if (!names) gaps.push({ gap: "no_given_name_giver", detail: "identity/givers/wikidata-given-names-en.json is absent: only the treebank's own casing was applied" });
  // where the shelf is split ("mark", "bill"), the sentence decides, not the shelf: the word is left lowercase for the parser to read in its sentence
  const closed = closedSet(table), ordinary = commonSet(table), notebook = new Map(), nameShare = table.dials?.NAME_SHARE ?? 0.8; let lead = true;
  const toks = tokenize(T);
  { let l = true; for (const t of toks) { const f = t.form; if (![...f].some(isLetter)) { if (f === "." || f === "?" || f === "!" || f === "…") l = true; continue; } const first = [...f][0]; if (!l && isLetter(first) && f !== f.toLowerCase() && f !== "I" && f !== f.toUpperCase() && !ordinary.has(f.toLowerCase())) notebook.set(f.toLowerCase(), f); l = false; } }
  // THE SHELVES ARE FOR TEXT TYPED WITHOUT CAPITALS. A writer who capitalises ("The Magic Flute is an opera ... by Wolfgang Amadeus Mozart") has told us where the capitals go, so a lowercase word in that text
  // is lowercase on purpose: the casing shelf and the given-name shelf stay silent (found by a peer: formal prose had "opera" recased to "Opera" and parsed as a proper noun). Any capital that is not the
  // pronoun "I" counts, including a sentence's first letter (a phone capitalises that one itself, but then the name beside it is the writer's own to capitalise). The NOTEBOOK is the text's own evidence
  // and always applies.
  const habit = toks.some((t) => { const f = t.form, first = [...f][0]; return isLetter(first) && f !== f.toLowerCase() && f !== "I"; });
  for (const k of known ?? []) if ([...String(k)].some(isLetter) && k !== String(k).toLowerCase() && !ordinary.has(String(k).toLowerCase()) && !notebook.has(String(k).toLowerCase())) notebook.set(String(k).toLowerCase(), String(k));
  // A NAME TYPED WITHOUT A CAPITAL IS NOT INSIDE A NOUN PHRASE: "You are Captain Salt, a weathered pirate captain." must not make the second captain a name (found by a peer: the persona lost its
  // appositive). Walking back from the word over words that can be modifiers (an adjective, a noun, a numeral, a word the prior does not know), a DETERMINER before it means the word is a phrase's head
  // ("a weathered pirate captain", "the old king"); a verb, a preposition, a conjunction, a pronoun, an interjection or any punctuation ends the phrase first ("loves natasha", "dear natasha", "to natasha").
  const inNounPhrase = (i) => { for (let k = i - 1; k >= 0 && k >= i - 4; k--) { const g = toks[k].form; if (![...g].some(isLetter)) return false; const pos = posOf(g.toLowerCase()); if (pos === "DET") return true; if (pos && pos !== "ADJ" && pos !== "NOUN" && pos !== "NUM" && pos !== "PROPN") return false; } return false; };
  for (let ti = 0; ti < toks.length; ti++) {
    const t = toks[ti], f = t.form; if (![...f].some(isLetter)) { if (f === "." || f === "?" || f === "!" || f === "…") lead = true; continue; }
    const initial = lead; lead = false;
    if (f !== f.toLowerCase()) continue;                         // the writer cased it: respected
    const first = [...f][0]; if (!isLetter(first)) continue;     // a clitic ("n't") is no word
    if (f.length === 1 && f !== "i") continue;                  // a lone letter is an abbreviation, not a name
    let cased = null, by = null;
    // the NOTEBOOK copies a capital from one occurrence of a word to another, so a capitalised common noun ("Captain Salt") would capitalise the same noun elsewhere; the shelves are counted from a treebank of
    // names and need no such guard (measured: applying it to them cost 4-5 points of held-out recall for no false recase it prevented)
    const heard = inNounPhrase(ti) ? undefined : notebook.get(f), shelf = table.forms?.[f];
    if (heard) { cased = heard; by = "notebook"; }
    else if (habit) continue;                                    // the writer capitalises: what is lowercase is lowercase on purpose
    else if (shelf) { cased = shelf[0]; by = "treebank-casing"; }
    else if (names?.has(f) && f.length >= MIN_GIVEN_NAME_LETTERS && !closed.has(f)) {
      const att = table.attested?.[f];                           // [times the treebank calls it anything but a proper noun, times it calls it one]
      const title = first.toUpperCase() + f.slice(first.length);
      if (att ? att[1] / (att[0] + att[1]) >= nameShare : unattested) { cased = title; by = "given-name"; }
      // a name only the giver knows is NOMINATED, not recased: the parse is left as typed (so another language's word, an SMS spelling or a technical word is not turned into a proper noun),
      // and the row carries the nomination with its basis for an independent check to confirm (the nominator may be wrong and is never its own only witness)
      else if (!att) candidates.push({ start: t.start, end: t.end, typed: f, cased: title, by: "given-name-giver", attested: false });
    }
    if (!cased || cased === f) continue;
    changes.push({ start: t.start, end: t.end, typed: f, cased, by, initial });
  }
  // which occurrence of the cased form a change is, among the tokens as they stand after recasing (markRecased finds the row by it)
  { const finalForm = new Map(changes.map((c) => [c.start, c.cased])); for (const c of changes) c.nth = toks.filter((u) => u.start < c.start && (finalForm.get(u.start) ?? u.form) === c.cased).length; }
  let out = T; for (const c of [...changes].reverse()) out = out.slice(0, c.start) + c.cased + out.slice(c.end);
  return { text: out, changes, candidates, gaps };
}

/** attach what recasing did to the rows it produced, in order: the row's form is the cased word, row.recased says what was typed and which giver;
 *  a nominated name keeps its typed form and carries row.nameCandidate = { cased, by, attested: false } */
export function markRecased(rows, changes, candidates = []) {
  if ((!changes?.length && !candidates?.length) || !Array.isArray(rows)) return rows;
  const out = rows.map((r) => ({ ...r })); let from = 0;
  // the n-th row wearing the cased form is the changed one (an earlier row may wear the same form because the writer capitalised it: "Captain Salt, a pirate captain")
  for (const c of changes ?? []) { let seen = 0; const i = out.findIndex((r) => r.form === c.cased && seen++ === (c.nth ?? 0)); if (i >= 0) out[i].recased = { typed: c.typed, by: c.by }; }
  from = 0; for (const c of candidates ?? []) { const i = out.findIndex((r, j) => j >= from && r.form === c.typed && !r.recased); if (i >= 0) { out[i].nameCandidate = { cased: c.cased, by: c.by, attested: false }; from = i + 1; } }
  return out;
}
