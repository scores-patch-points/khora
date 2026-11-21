// reading-one.mjs — THE SINGLE API: read a document, then write it to the pharos.
//
// One input (text + options), one output (the WeftEntry@4, written to pharos).
// Everything the reader does (slice, parse, cast, referents) happens here;
// everything the keeper needs (the delta, the calibration) reads from pharos.
// No second door, no second normalisation, no piping between systems.
import { assertPharos, recordRead } from "./the-fold/pharos-gate.mjs";
import { readToWeft, canonicalReaderOptions, canonicalDeclension, noteMissingRuling, assertPrimed } from "./the-fold/read-process.mjs";
import { priorsFor, consultAliases } from "./the-fold/read-core.mjs";
import { stemOf, iso1Of } from "./the-fold/language-grammar.js";
import { languageContextFor } from "./the-fold/language-context.js";
import { lexiconFor } from "./reading.js";
const isDefault = (lexicon) => lexicon === "hyperlexicon" || lexicon === "local";
import { rowsOfFor } from "./reading.js";

export async function read(text, { language = null, lexicon = "hyperlexicon", rows = false, ...opts } = {}) {
  assertPharos();
  const str = String(text ?? "");
  const stem = (language ? stemOf(language) : null) ?? languageContextFor(str, {}).language ?? "eng";
  const lex = isDefault(lexicon) ? lexiconFor(stem) : lexicon || null;
  const unknown = !!language && !stemOf(language);
  let parser = null;
  if (rows && !opts.rowsOf) {
    if (!unknown) parser = await rowsOfFor(stem);
    else {
      const { codecStatus } = await import("./adapters/text/grammar-ud.js");
      const st = codecStatus(language);
      parser = st.held ? await rowsOfFor(st.code) : { gap: `no parser: ${language} has no stem filed` };
    }
  }
  const pr = priorsFor(stem);
  const c = await consultAliases(str, lex, { priors: pr });
  const np = lex ? await (async () => {
    const { consultNonPersonal } = await import("./adapters/text/non-personal.js");
    return await consultNonPersonal(str, lex, { timePrior: null, language: stem });
  })() : null;
  const readerOptions = np?.nonPersonalOf ? { nonPersonalOf: np.nonPersonalOf, ...(opts.readerOptions ?? {}) } : opts.readerOptions;
  const w = readToWeft(str, {
    address: opts.address ?? null,
    category: opts.category ?? null,
    language: language ?? null,
    quality: opts.quality ?? true,
    aliases: [...(opts.aliases ?? []), ...c.aliases],
    abbreviations: opts.abbreviations ?? null,
    priors: pr,
    aliasReport: { giver: c.giver, rows: c.rows, gap: c.gap, ...(c.settled ? { settled: c.settled } : {}), ...(np ? { nonPersonal: np.report } : {}) },
    readerOptions: { ...canonicalReaderOptions(), ...(readerOptions ?? {}) },
    declension: opts.declension ?? canonicalDeclension,
    allowDegraded: opts.allowDegraded === true,
    ...(parser?.rowsOf ? { rowsOf: parser.rowsOf } : {}),
  });
  assertPrimed(w, { allowDegraded: opts.allowDegraded === true });
  if (!w.aliasReport?.nonPersonal) noteMissingRuling(w, opts.readerOptions ?? {});
  if (parser?.gap) (w.gaps ??= []).push({ gap: "no_parser", stem, detail: parser.gap });
  if (parser?.by && w.parse) w.parseBy = parser.by;
  if (!lex) w.aliasReport = { giver: null, rows: [], gap: lexicon === false ? "the caller read without the hyperlexicon" : `no hyperlexicon is filed for ${stem}` };
  return recordRead(w, str, { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
}
