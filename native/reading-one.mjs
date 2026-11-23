// reading-one.mjs — THE SINGLE API: read a document, then write it to the pharos.
//
// One input (text or file path), one output (the WeftEntry@4, written to pharos).
// Everything the reader does happens here; everything the keeper needs reads from pharos.
// No second door, no second normalisation, no piping between systems.
//
// Modalities:
//   text (string)     → text reader (NL: slice applied, parse via rowsOfFor; Classical Chinese: Ground tributary)
//   file path (string) → detect modality from extension, route to the right adapter
import { assertPharos, recordRead } from "./the-fold/pharos-gate.mjs";
import { readToWeft, canonicalReaderOptions, canonicalDeclension, noteMissingRuling, assertPrimed } from "./the-fold/read-process.mjs";
import { priorsFor, consultAliases } from "./the-fold/read-core.mjs";
import { stemOf, iso1Of } from "./the-fold/language-grammar.js";
import { languageContextFor } from "./the-fold/language-context.js";
import { lexiconFor } from "./reading.js";
import { rowsOfFor } from "./reading.js";
import { detectVariety, computeDistribution } from "./adapters/text/variety-detector.mjs";
import { treeOf } from "./adapters/text/dependency-tree.mjs";
import { textMereology } from "./adapters/text/text-mereology.mjs";
import { consultNonPersonal } from "./adapters/text/non-personal.js";
import fs from "node:fs";
import path from "node:path";

const isDefault = (lexicon) => lexicon === "hyperlexicon" || lexicon === "local";

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
  const isFile = typeof input === "string" && !input.includes("\n") && (fs.existsSync(input) || /^(\/|~\/|[A-Za-z]:[\\/]|\.\.?\/)/.test(input) || /\.[a-z0-9]{2,5}$/i.test(input));
  const isBuffer = Buffer.isBuffer(input);

  if (!isFile && !isBuffer) {
    const text = String(input ?? "");
    // CLASSICAL CHINESE (Ground tributary): if the text contains Chinese characters, read it through the Ground tributary
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    if (hasChinese) {
      const { readClassicalChinese } = await import("./adapters/text/classical-chinese-reader.mjs");
      const tok = await (async () => { try { const zlib = await import("node:zlib"); return JSON.parse(zlib.gunzipSync(fs.readFileSync("/tmp/janus-priors/ud-tokenizer-zh.json.gz"))); } catch { return null; } })();
      const result = readClassicalChinese(text, { segmenter: tok });
      const entry = {
        schema: "WeftEntry@4", language: { stem: "zh", source: "declared" },
        sentences: result.sentences.map((s) => ({ text: s.text, order: s.order })),
        parse: result.sentences.map((s, i) => ({ order: i, offset: 0, text: s.text, rows: s.tokens.map((t, j) => ({ id: j + 1, form: t, upos: "X", feats: "_", head: null, deprel: null, karaka: s.roles[j] })) })),
        gaps: result.gaps, error: null, ms: 0, readCharacters: text.length, bytes: text.length,
        cast: [], heard: [], edges: [], clauses: null, quality: null, surprise: null, pronouns: [],
        abbreviations: null, aliasReport: null, competency: null,
      };
      try {
        const karakas = [];
        for (const s of (entry.parse ?? [])) for (const row of (s.rows ?? [])) if (row.karaka) karakas.push(row.karaka);
        if (karakas.length > 0) {
          const { computeDistribution, detectVariety } = await import("./adapters/text/variety-detector.mjs");
          const dist = computeDistribution(karakas);
          entry.variety = { detected: detectVariety(dist, "zh").variety, confidence: detectVariety(dist, "zh").confidence, declared: opts.variety ?? null };
        }
      } catch (e) { /* variety detection is optional */ }
      if (entry.parse) {
        for (const p of entry.parse) {
          if (Array.isArray(p.rows)) p.tree = treeOf(p.rows);
        }
      }
      return recordRead(entry, text, { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
    }

    // TEXT (NL): the text reader (with slice)
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
    const c = await consultAliases(text, lex, { priors: pr });
    const np = lex ? await consultNonPersonal(text, lex, { timePrior: null, language: stem }) : null;
    const readerOptions = np?.nonPersonalOf ? { nonPersonalOf: np.nonPersonalOf, ...(opts.readerOptions ?? {}) } : opts.readerOptions;
    const w = readToWeft(text, {
      address: opts.address ?? null, category: opts.category ?? null, language: language ?? null,
      quality: opts.quality ?? true, aliases: [...(opts.aliases ?? []), ...c.aliases],
      abbreviations: opts.abbreviations ?? null, priors: pr,
      aliasReport: { giver: c.giver, rows: c.rows, gap: c.gap, ...(c.settled ? { settled: c.settled } : {}), ...(np ? { nonPersonal: np.report } : {}) },
      readerOptions: { ...canonicalReaderOptions(), ...(readerOptions ?? {}) },
      declension: opts.declension ?? canonicalDeclension,
      allowDegraded: opts.allowDegraded === true,
      admitNominals: opts.admitNominals === true,
      speakers: opts.speakers === true,
      ...(parser?.rowsOf ? { rowsOf: parser.rowsOf } : {}),
    });
    if (!w.aliasReport?.nonPersonal) noteMissingRuling(w, opts.readerOptions ?? {});
    if (parser?.gap) (w.gaps ??= []).push({ gap: "no_parser", stem, detail: parser.gap });
    // VARIETY DETECTION: detect genre/variety from kāraka distribution (kind induction)
    if (w.parse && opts.variety !== false) {
      try {
        const karakas = [];
        for (const p of w.parse) for (const row of (p.rows ?? [])) if (row.karaka) karakas.push(row.karaka);
        if (karakas.length > 0) {
          const dist = computeDistribution(karakas);
          const variety = detectVariety(dist, stem);
          w.variety = { detected: variety.variety, confidence: variety.confidence, declared: opts.variety ?? null };
        }
      } catch (e) { /* variety detection is optional */ }
    }
    // THE TREE: the full dependency tree is the reading (GL-TH-15). Every parse row's
    // head/deprel folded into a nested tree, no word lost; every projection diffs against it.
    if (w.parse) {
      for (const p of w.parse) {
        if (Array.isArray(p.rows)) p.tree = treeOf(p.rows);
      }
      // THE MEREOLOGY: the whole text as one tree of addressed parts (document > paragraph > sentence > phrase > token),
      // each part addressed in the source by char and byte range, each phrase carrying its Pāṇinian relation, one
      // kāraka frame per action, and the measured coverage (rows aligned, rows in the tree, characters read).
      w.mereology = textMereology(text, w.parse, { address: opts.address ?? null });
      for (const g of w.mereology.gaps) (w.gaps ??= []).push({ gap: `mereology_${g.gap}`, detail: g.count ?? g.chars ?? null });
    }
    if (parser?.by && w.parse) w.parseBy = parser.by;
    if (!lex) w.aliasReport = { giver: null, rows: [], gap: (opts.lexicon === false) ? "the caller read without the hyperlexicon" : `no hyperlexicon is filed for ${stem}` };
    return recordRead(w, text, { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
  }

  // FILE PATH: detect modality and route to the right adapter
  const filePath = isBuffer ? null : input;
  const ext = filePath ? path.extname(filePath).toLowerCase() : null;
  const modality = opts.modality ?? (ext ? (EXT_MOD[ext] ?? null) : null);
  if (!modality) {
    const w = { schema: "EORead@1", error: `unreadable modality: no adapter for ${ext ?? "buffer"}`, gaps: [{ reason: "modality_unknown", ext }], ms: 0 };
    return recordRead(w, String(filePath ?? "buffer"), { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
  }
  if (modality === "text") {
    const text = fs.readFileSync(filePath, "utf8");
    return read(text, { ...opts, language: opts.language ?? null });
  }
  if (modality === "code" || modality === "notation") {
    const { readMaterial } = await import("./the-fold/material-doorway.js");
    const text = fs.readFileSync(filePath, "utf8");
    const family = modality === "code" ? "code" : "notation";
    const result = readMaterial(text, { family, ...opts });
    return recordRead(result, text, { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
  }
  // Image / video / audio / midi: typed gap (adapter exists, EOT marks not yet defined)
  const result = { schema: "EORead@1", modality, file: filePath, gaps: [{ reason: "modality_not_yet_wired", detail: `${modality} read is not yet wired into the unified door; the adapter exists at native/adapters/${modality}/material.js` }], ms: 0 };
  return recordRead(result, String(filePath ?? "buffer"), { door: "native/reading-one.mjs#read", allowDegraded: opts.allowDegraded === true });
}
