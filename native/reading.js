// reading.js — THE READING PIPELINE'S FRONT DOOR under Node (2026-10-24).
//
// One call reads a document the canonical way and asks the hyperlexicon first. The read itself is synchronous
// (the-fold/read-core.mjs::readWith, through read-process.mjs::readToWeft); a lookup is not, so this door asks the local giver
// about the dotted forms the priors and the text cannot settle, then reads with the aliases it kept. A page does the same with
// its own giver (reading-core.js has the pure half). Nothing reaches the network: the giver is the English Wiktionary pack on
// this machine (adapters/text/wiktionary-pack.js), and its absence is a typed gap on the entry, never a silent read.
//
//   readDocument(text, { language, lexicon, address, category, quality }) → Promise<WeftEntry@4>
//   readForDoor(text, { name, language, category, maxCharacters, lexicon }) → Promise<EORead@1> (POST /v1/read's body)
//   lexiconFor(language) → the hyperlexicon for a language over the local giver (cached), or null where none is filed
//
// `lexicon`: "local" (the default) · false (read without asking; the aliases are then the text's own and the prior's) · or a
// lexicon organ a caller built (organs/lexicon.js::makeLexicon) over its own giver.

import { readToWeft } from "./the-fold/read-process.mjs";
import { readCanonical } from "./the-fold/read-door-canonical.mjs";
import { priorsFor, consultAliases } from "./the-fold/read-core.mjs";
import { languageContextFor } from "./the-fold/language-context.js";
import { stemOf, iso1Of } from "./the-fold/language-grammar.js";
import { localLexicon, lexiconGap } from "./adapters/text/wiktionary-pack.js";

export { readToWeft } from "./the-fold/read-process.mjs";
export { readCanonical } from "./the-fold/read-door-canonical.mjs";
export { readWith, makeReader, relationsFor, priorsFor, buildPriors, abbreviationsFor, consultAliases } from "./the-fold/read-core.mjs";

const lexicons = new Map();
export function lexiconFor(language) {
  const code = iso1Of(language);
  if (!code) return null;
  if (!lexicons.has(code)) lexicons.set(code, localLexicon(code));
  return lexicons.get(code);
}

async function aliasesFor(text, { language, lexicon }) {
  const stem = (language ? stemOf(language) : null) ?? languageContextFor(String(text ?? ""), {}).language ?? "eng";
  const lex = lexicon === "local" ? lexiconFor(stem) : lexicon || null;
  if (!lex) return { stem, aliases: [], report: { giver: null, rows: [], gap: lexicon === false ? "the caller read without the hyperlexicon" : `no hyperlexicon giver is filed for ${stem}` } };
  const c = await consultAliases(text, lex, { priors: priorsFor(stem) });
  return { stem, aliases: c.aliases, report: { giver: c.giver, rows: c.rows, gap: c.gap ?? (lexicon === "local" ? lexiconGap() : null) } };
}

/** Read one document the canonical way, the hyperlexicon asked first. */
export async function readDocument(text, { language = null, lexicon = "local", ...opts } = {}) {
  const { aliases, report } = await aliasesFor(text, { language, lexicon });
  return readToWeft(text, { ...opts, language, aliases, aliasReport: report });
}

/** POST /v1/read's body, the hyperlexicon asked first. Throws the door's typed refusals (a malformed tag, a bad maxCharacters). */
export async function readForDoor(text, { language = null, lexicon = "local", ...opts } = {}) {
  const { aliases, report } = await aliasesFor(text, { language, lexicon });
  return readCanonical(text, { ...opts, language, aliases, aliasReport: report });
}
