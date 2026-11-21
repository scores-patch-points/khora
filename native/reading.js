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

import { assertPharos, recordRead } from "./the-fold/pharos-gate.mjs";
import { readToWeft, canonicalReaderOptions, canonicalDeclension, noteMissingRuling, assertPrimed } from "./the-fold/read-process.mjs";
import { readCanonical } from "./the-fold/read-door-canonical.mjs";
import { priorsFor, consultAliases, readDocument as readCore } from "./the-fold/read-core.mjs";
import { languageContextFor } from "./the-fold/language-context.js";
import { stemOf, iso1Of } from "./the-fold/language-grammar.js";
import { karakaOf as karakaOfRow } from "./adapters/text/karaka-map.mjs";
import { karakaOf as karakaOfRow } from "./adapters/text/karaka-map.mjs";
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

// THE UNIVERSAL PARSE for a language (opt-in: `rows: true`). English reads through grammar-en (the language-neutral ud-parser with its English prior), any other
// language through grammar-ud's loadGrammar (a UD parser per language, from the prior door); both are lazy, so a read that does not ask for rows loads neither. A
// language with no parser is a typed gap, never English applied to it. The hook is what read-core.mjs::readWith hands each sentence to: one parse, beside the one cut.
const parsers = new Map();
export async function rowsOfFor(stem) {
  if (parsers.has(stem)) return parsers.get(stem);
  let p;
  try {
    // a pronunciation in brackets ("Mount Rainier ( ray-NEER)") breaks every parser and is no part of the sentence: it is cut out BEFORE the parse, here, with the parser, so the
    // reader's rows are those of the cleaned sentence and no layer above re-cleans (read-atoms.js::cleanText is the one cut; the entry's rows are keyed by it, see weft-atoms.js)
    const { cleanText } = await import("./organs/read-atoms.js");
    // Languages with a grammar codec (eng) or a UD parser (san, grc, zh) get the slice.
    // For eng: the slice uses the English smell model + English markers.
    // For san/zh/grc: the slice uses the per-language smell model + markers, but
    // particles are usually separate words (not fused), so the slice is a no-op
    // unless a glued form is found. The giver is declared either way.
    const hasSlice = ["eng", "san"].includes(stem);
    // Load the clitic-slice proponent if the language has a smell model and markers (the slice is a revisable pressure: unnameable wholes pass through unchanged).
  let sliceSentence = (t) => t;
  if (["eng", "san"].includes(stem)) {
    try {
      const { loadModel, smell } = await import("./adapters/text/emergent-smell.mjs");
      const markers = new Set(JSON.parse(await (await fetch(new URL(`./adapters/text/data/clitic-markers-${stem}.json`, import.meta.url))).text()));
      const model = loadModel(stem);
      const { proposeCut } = await import("./adapters/text/clitic-slice.mjs");
      const smellFn = (form) => { try { return smell({ model, form }); } catch { return null; } };
      sliceSentence = (t) => t.split(/(\s+)/).map((tok) => {
        if (!tok.trim()) return tok;
        const pc = proposeCut({ form: tok, smell: smellFn, markers });
        if (!pc) return tok;
        return pc.host + " " + pc.marker;
      }).join("");
    } catch (e) { /* model-missing or marker-missing: slice is a no-op */ }
  }
  if (stem === "eng") { const GE = await import("./adapters/text/grammar-en.js");
    p = { rowsOf: (t) => GE.rowsOf(cleanText(sliceSentence(t)).text), by: GE.READER ?? "grammar-en", claimsOf: (t, rows) => GE.claimsOf(t, rows) }; }
  // the language's codec, committed or vendored on this machine (grammar-ud.js reads both); a pointed-at codec not yet vendored names its source
  else { const code = iso1Of(stem) ?? stem, { loadGrammar, codecStatus } = await import("./adapters/text/grammar-ud.js"), g = await loadGrammar(code, {}); p = g ? { rowsOf: (t) => g.rowsOf(cleanText(sliceSentence(t)).text), by: `grammar-ud:${code}`, claimsOf: (t, rows) => g.claimsOf(t, rows) } : { gap: codecStatus(stem).why ?? `no UD parser is filed for ${stem}` }; }  } catch (e) { p = { gap: `parser for ${stem} did not load: ${String(e?.message ?? e).slice(0, 80)}` }; }
  // a held parser is kept for the process; a gap is not, so a codec vendored after the first ask is read by the next one
  // Wire kārakas into the parse rows: every row gets a `karaka` field (one of the 9 or null).
  // This makes the kāraka available to the reader and the equivalence judge without a separate pass.
  if (p.rowsOf && !p.gap) {
    const origRowsOf = p.rowsOf;
    p.rowsOf = (t) => {
      const rows = origRowsOf(t);
      if (!Array.isArray(rows)) return rows;
      return rows.map((row) => ({ ...row, karaka: karakaOfRow(row) }));
    };
  }
  // Wire kārakas into the parse rows: every row gets a `karaka` field (one of the 9 or null).
  if (p.rowsOf && !p.gap) {
    const origRowsOf = p.rowsOf;
    p.rowsOf = (t) => {
      const rows = origRowsOf(t);
      if (!Array.isArray(rows)) return rows;
      return rows.map((row) => ({ ...row, karaka: karakaOfRow(row) }));
    };
  }
  if (!p.gap) parsers.set(stem, p);
  return p;
}

/** THE MASTER PIPELINE under Node: read-core.mjs::readDocument asking the hyperlexicon through its door (lexicon: "hyperlexicon", the
 *  default), or a caller's own lexicon organ, or false to read without one. `rows: true` adds the universal parse (entry.parse). */
export async function readDocument(text, { language = null, lexicon = "hyperlexicon", rows = false, ...opts } = {}) {
  assertPharos(); // khora works only through pharos: its rules are held there (pharos-gate.mjs)
  const stem = (language ? stemOf(language) : null) ?? languageContextFor(String(text ?? ""), {}).language ?? "eng";
  const lex = isDefault(lexicon) ? lexiconFor(stem) : lexicon || null;
  // a language declared but with no stem filed is read with the default priors (a typed gap on the entry, read-core's own); its sentences are NOT parsed by the
  // English parser on top of that: no parse is a gap, never English applied to it (Greenberg)
  const unknown = !!language && !stemOf(language);
  // a declared language with no stem filed may still have its CODEC on this machine (a UD parser, committed or vendored): its sentences decode
  // through it. Only with neither is the parse a gap.
  let parser = null;
  if (rows && !opts.rowsOf) {
    if (!unknown) parser = await rowsOfFor(stem);
    else {
      const { codecStatus } = await import("./adapters/text/grammar-ud.js");
      const st = codecStatus(language);
      parser = st.held ? await rowsOfFor(st.code) : { gap: `no parser: ${language} has no stem filed${st.why ? `; ${st.why}` : ""}` };
    }
  }
  // THE ONE DOOR (2026-11-18): this front door reads with the SAME canonical options as read-process.mjs::readToWeft (pronoun presence, name ruling, case-marked clauses, declension), so a caller who
  // enters here gets the canonical read, not a weaker one. A caller's own readerOptions win; `readerOptions: { pronounPresence: null }` turns the rung off. native/tests/one-door.test.mjs holds the two doors equal.
  const w = await readCore(text, { declension: canonicalDeclension, ...opts, language, lexicon: lex, readerOptions: { ...canonicalReaderOptions(), ...(opts.readerOptions ?? {}) }, ...(parser?.rowsOf ? { rowsOf: parser.rowsOf } : {}) });
  assertPrimed(w, { allowDegraded: opts.allowDegraded === true });
  if (!w.aliasReport?.nonPersonal) noteMissingRuling(w, opts.readerOptions ?? {});
  if (parser?.gap) (w.gaps ??= []).push({ gap: "no_parser", stem, detail: parser.gap });
  if (parser?.by && w.parse) w.parseBy = parser.by;
  if (!lex) w.aliasReport = { giver: null, rows: [], gap: lexicon === false ? "the caller read without the hyperlexicon" : `no hyperlexicon is filed for ${stem}` };
  return recordRead(w, text, { door: "native/reading.js#readDocument", allowDegraded: opts.allowDegraded === true }); // written into pharos, or refused (pharos rules WRITES-TO-PHAROS, FULL-CAPACITY)
}

/** POST /v1/read's body, the hyperlexicon asked first. Throws the door's typed refusals (a malformed tag, a bad maxCharacters). */
export async function readForDoor(text, { language = null, lexicon = "hyperlexicon", ...opts } = {}) {
  const { aliases, report } = await aliasesFor(text, { language, lexicon });
  return readCanonical(text, { ...opts, language, aliases, aliasReport: report });
}

/** ARE TWO TEXTS THE SAME, FOR A PERSPECTIVE? Sameness as a defeasible commitment (kernel/commitments.js) read by organs/same-for.js: each text read
 *  by readDocument, its acts heard onto one notes ledger, every correspondence a same-as from its giver, every unplaced part put forward as noise,
 *  each tested against the perspective with a named null. Verdict "same" | "other" | "gap"; every residual difference is SIG (○) or NUL (∅).
 *  questions: the asking perspective (strings), or none for the reader's default (every role of every act). licence(l1, l2) → "same" | "converse"
 *  | null: a caller's giver for correspondences across two relations. Loaded lazily: the adapter itself reads through this file. */
export async function sameFor(first, second, opts = {}) {
  const { sameForText } = await import("./adapters/text/same-for-text.js");
  return sameForText(first, second, opts);
}
