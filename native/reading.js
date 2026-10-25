// reading.js — THE READING PIPELINE'S FRONT DOOR under Node (2026-10-24; the hyperlexicon asked through its door since 2026-10-25).
//
// One call reads a document the canonical way and asks the hyperlexicon first. The read itself is synchronous
// (the-fold/read-core.mjs::readWith, through read-process.mjs::readToWeft); a lookup is not, so this door asks the hyperlexicon about
// the dotted forms the priors and the text cannot settle, then reads with the aliases it kept. The hyperlexicon is janus's ledger,
// asked through its door (janus native/organs/hyperlexicon/door.mjs, on loopback): its givers' claims sit there as candidates beside
// the concordance of every use; no giver's pack is read directly. Where no door answers, the entry says so (a typed gap), and the cut
// still has the priors' read-ahead dotted words (janus priors/dotted-<stem>.json, whose giver is the same hyperlexicon).
//
//   readDocument(text, { language, lexicon, address, category, quality }) → Promise<WeftEntry@4>
//   readForDoor(text, { name, language, category, maxCharacters, lexicon }) → Promise<EORead@1> (POST /v1/read's body)
//   lexiconFor(language) → the hyperlexicon for a language, through its door (cached)
//
// `lexicon`: "hyperlexicon" (the default; "local" is the same) · false (read without asking; the aliases are then the text's own and
// the prior's) · or a lexicon organ a caller built (organs/lexicon.js::makeHyperlexicon over its own door, or makeLexicon over a giver).
// HL_DOOR names the door (default http://127.0.0.1:11450).

import { readToWeft } from "./the-fold/read-process.mjs";
import { readCanonical } from "./the-fold/read-door-canonical.mjs";
import { priorsFor, consultAliases, readDocument as readCore } from "./the-fold/read-core.mjs";
import { languageContextFor } from "./the-fold/language-context.js";
import { stemOf, iso1Of } from "./the-fold/language-grammar.js";
import { makeHyperlexicon } from "./organs/lexicon.js";

export { readToWeft } from "./the-fold/read-process.mjs";
export { readCanonical } from "./the-fold/read-door-canonical.mjs";
export { readWith, makeReader, relationsFor, priorsFor, buildPriors, abbreviationsFor, consultAliases } from "./the-fold/read-core.mjs";

const DOOR = () => (process.env.HL_DOOR || "http://127.0.0.1:11450").replace(/\/$/, "");
const doorAsk = async (body) => {
  const r = await fetch(`${DOOR()}/v1/batch`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  return r.ok ? r.json() : { gap: `the hyperlexicon's door (${DOOR()}) answered ${r.status}` };
};
const lexicons = new Map();
export function lexiconFor(language) {
  const code = iso1Of(language);
  if (!code) return null;
  if (!lexicons.has(code)) lexicons.set(code, makeHyperlexicon({ ask: doorAsk, lang: code, door: DOOR() }));
  return lexicons.get(code);
}
const isDefault = (lexicon) => lexicon === "hyperlexicon" || lexicon === "local";

async function aliasesFor(text, { language, lexicon }) {
  const stem = (language ? stemOf(language) : null) ?? languageContextFor(String(text ?? ""), {}).language ?? "eng";
  const lex = isDefault(lexicon) ? lexiconFor(stem) : lexicon || null;
  if (!lex) return { stem, aliases: [], report: { giver: null, rows: [], gap: lexicon === false ? "the caller read without the hyperlexicon" : `no hyperlexicon is filed for ${stem}` } };
  const c = await consultAliases(text, lex, { priors: priorsFor(stem) });
  return { stem, aliases: c.aliases, report: { giver: c.giver, rows: c.rows, gap: c.gap, ...(c.settled ? { settled: c.settled } : {}) } };
}

/** THE MASTER PIPELINE under Node: read-core.mjs::readDocument asking the hyperlexicon through its door (lexicon: "hyperlexicon", the
 *  default), or a caller's own lexicon organ, or false to read without one. */
export async function readDocument(text, { language = null, lexicon = "hyperlexicon", ...opts } = {}) {
  const stem = (language ? stemOf(language) : null) ?? languageContextFor(String(text ?? ""), {}).language ?? "eng";
  const lex = isDefault(lexicon) ? lexiconFor(stem) : lexicon || null;
  const w = await readCore(text, { ...opts, language, lexicon: lex });
  if (!lex) w.aliasReport = { giver: null, rows: [], gap: lexicon === false ? "the caller read without the hyperlexicon" : `no hyperlexicon is filed for ${stem}` };
  return w;
}

/** POST /v1/read's body, the hyperlexicon asked first. Throws the door's typed refusals (a malformed tag, a bad maxCharacters). */
export async function readForDoor(text, { language = null, lexicon = "hyperlexicon", ...opts } = {}) {
  const { aliases, report } = await aliasesFor(text, { language, lexicon });
  return readCanonical(text, { ...opts, language, aliases, aliasReport: report });
}
