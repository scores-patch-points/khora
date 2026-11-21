// reading-one.mjs — THE SINGLE API: read a document, then write it to the pharos.
//
// One input (text or file path), one output (the WeftEntry@4, written to pharos).
// Everything the reader does happens here; everything the keeper needs reads from pharos.
// No second door, no second normalisation, no piping between systems.
//
// Modalities:
//   text (string)     → the text reader (slice applied, parse via rowsOfFor)
//   file path (string) → detect modality from extension, route to the right adapter,
//                        produce EOT marks, write to pharos
import { assertPharos, recordRead } from "./the-fold/pharos-gate.mjs";
import { readToWeft, canonicalReaderOptions, canonicalDeclension, noteMissingRuling, assertPrimed } from "./the-fold/read-process.mjs";
import { priorsFor, consultAliases } from "./the-fold/read-core.mjs";
import { stemOf, iso1Of } from "./the-fold/language-grammar.js";
import { languageContextFor } from "./the-fold/language-context.js";
import { lexiconFor } from "./reading.js";
import { rowsOfFor } from "./reading.js";
import fs from "node:fs";
import path from "node:path";

const isDefault = (lexicon) => lexicon === "hyperlexicon" || lexicon === "local";

// Detect modality from a file path
const EXT_MOD = {
  ".txt": "text", ".md": "text", ".conllu": "text",
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image", ".bmp": "image", ".webp": "image",
  ".mp4": "video", ".mov": "video", ".avi": "video", ".mkv": "video", ".webm": "video",
  ".mp3": "audio", ".wav": "audio", ".ogg": "audio", ".flac": "audio", ".aac": "audio",
  ".mid": "midi", ".midi": "midi",
  ".js": "code", ".mjs": "code", ".py": "code", ".ts": "code", ".java": "code", ".c": "code", ".cpp": "code", ".h": "code",
  ".abc": "notation", ".smi": "notation", ".smiles": "notation",
};

export async function read(input, opts = {}) {
  assertPharos();
  // Detect if input is a file path or text
  const isFile = typeof input === "string" && (input.includes("/") || input.includes("\\") || /\.[a-z0-9]{2,5}$/i.test(input));
  const isBuffer = Buffer.isBuffer(input);

  if (!isFile && !isBuffer) {
    // TEXT: the existing text reader (with slice)
    const text = String(input ?? "");
    const language = opts.language ?? null;
    const stem = (language ? stemOf(language) : null) ?? languageContextFor(text, {}).language ?? "eng";
    const lex = isDefault(opts.lexicon ?? "hyperlexicon") ? lexiconFor(stem) : opts.lexicon || null;
    const unknown = !!language && !stemOf(language);
    let parser = null;
    if (opts.rows && !opts.rowsOf) {
      if (!unknown) parser = await rowsOfFor(stem);
      else {
        const { codecStatus } = await import("./adapters/text/grammar-ud.js");
        const st = codecStatus(language);
        parser = st.held ? await rowsOfFor(st.code) : { gap: `no parser: ${language} has no stem filed` };
      }
    }
    const pr = priorsFor(stem);
    const { consultAliases } = await import("./the-fold/read-core.mjs");
    const { consultNonPersonal } = await import("./adapters/text/non-personal.js");
    const c = await consultAliases(text, lex, { priors: pr });
    const np = lex ? await consultNonPersonal(text, lex, { timePrior: null, language: stem }) : null;
    const readerOptions = np?.nonPersonalOf ? { nonPersonalOf: np.nonPersonalOf, ...(opts.readerOptions ?? {}) } : opts.readerOptions;
    const w = readToWeft(text, {
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
    if (!w.aliasReport?.nonPersonal) noteMissingRuling(w, opts.readerOptions ?? {});
    if (parser?.gap) (w.gaps ??= []).push({ gap: "no_parser", stem, detail: parser.gap });
    if (parser?.by && w.parse) w.parseBy = parser.by;
    if (!lex) w.aliasReport = { giver: null, rows: [], gap: (opts.lexicon === false) ? "the caller read without the hyperlexicon" : `no hyperlexicon is filed for ${stem}` };
    return recordRead(w, text, { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
  }

  // FILE PATH: detect modality and route to the right adapter
  const filePath = isBuffer ? null : input;
  const ext = filePath ? path.extname(filePath).toLowerCase() : null;
  const modality = opts.modality ?? (ext ? (EXT_MOD[ext] ?? null) : null);

  if (!modality) {
    // Unknown modality: typed gap, never a silent default
    const w = { schema: "EORead@1", error: `unreadable modality: no adapter for ${ext ?? "buffer"}`, gaps: [{ reason: "modality_unknown", ext }], ms: 0 };
    return w;
  }

  if (modality === "text") {
    const text = fs.readFileSync(filePath, "utf8");
    return read(text, { ...opts, language: opts.language ?? null });
  }

  if (modality === "code") {
    const { readCode } = await import("./the-fold/material-doorway.js");
    const text = fs.readFileSync(filePath, "utf8");
    const family = "code";
    const result = readMaterial(text, { family, ...opts });
    return recordRead(result, text, { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
  }

  if (modality === "notation") {
    const { readMaterial } = await import("./the-fold/material-doorway.js");
    const text = fs.readFileSync(filePath, "utf8");
    const family = "notation";
    const result = readMaterial(text, { family, ...opts });
    return recordRead(result, text, { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
  }

  // Image / video / audio / midi: produce material, write to pharos as a typed gap for now
  // (the reader's EOT marks for non-text are a separate concern; the adapter runs, the result is recorded)
  const result = { schema: "EORead@1", modality, file: filePath, gaps: [{ reason: "modality_not_yet_wired", detail: `${modality} read is not yet wired into the unified door; the adapter exists at native/adapters/${modality}/material.js` }], ms: 0 };
  return recordRead(result, String(filePath ?? "buffer"), { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
}
