// the-fold/material-doorway.js — the read doorway that CONSUMES the notation and code priors.
//
// WHAT THIS IS. A single entry, `readMaterial(text, { family })`, that routes material to the adapter suite
// that owns its medium and returns what that suite extracted, which received priors it read, and every gap it
// could not close. It is the wiring the notation/code priors were waiting for: the adapters exist
// (native/adapters/notation/*, native/adapters/code/*) and their priors sit in `janus/priors`, but no read path
// called them — "unwired is failing". This module is that read path.
//
// THE THREE FAMILIES.
//   notation -> native/adapters/notation/{chem_smiles,chess_pgn,closed_codes,genetic,ipa,music_abc,taxonomy,uml_bpmn}.js
//   code     -> native/adapters/code/{identify,lex,edges,declared,language,mechanical}.js
//   prose    -> the-fold/prose-prior.js (a measured prose floor; a real prose corpus, or a typed gap)
//
// PURITY. Priors are loaded through an INJECTED read: `readPrior(file) -> { file, ok, prior?, error? }`. The
// default reader resolves `janus/priors` relative to the workspace root. A missing prior is a TYPED GAP on the
// returned object — never a default, never a guess, never a throw. The module writes nothing.
//
// LOVELACE'S LAW. The adapters are the authorities on their media; this doorway only carries the material to
// them and carries their verdicts back. Where an adapter cannot be driven from the received priors as-is, the
// wall is DISCLOSED in a typed gap naming the exact reason — the adapter's own logic is never patched here.
//
// OWNERSHIP. This module CONSUMES notation and code priors; it does not own them. It does not touch
// reader-bundle.js, language-context.js, greek.mjs, or janus/priors.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as chem_smiles from "../adapters/notation/chem_smiles.js";
import * as chess_pgn from "../adapters/notation/chess_pgn.js";
import * as closed_codes from "../adapters/notation/closed_codes.js";
import * as genetic from "../adapters/notation/genetic.js";
import * as ipa from "../adapters/notation/ipa.js";
import * as music_abc from "../adapters/notation/music_abc.js";
import * as taxonomy from "../adapters/notation/taxonomy.js";
import * as uml_bpmn from "../adapters/notation/uml_bpmn.js";

import * as code_identify from "../adapters/code/identify.js";
import * as code_lex from "../adapters/code/lex.js";
import * as code_edges from "../adapters/code/edges.js";
import * as code_declared from "../adapters/code/declared.js";
import * as code_language from "../adapters/code/language.js";
import * as code_mechanical from "../adapters/code/mechanical.js";

import { proseFloor, bitsPerWord, looksLikeCode } from "./prose-prior.js";

export const MATERIAL_SCHEMA = "MaterialDoorwayRead@1";
export const MATERIAL_FAMILIES = Object.freeze(["notation", "code", "prose"]);

/** THIS module lives at khora/native/the-fold/; the workspace root is three levels up. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const WORKSPACE_ROOT = path.resolve(HERE, "..", "..", "..");
export const PRIOR_DIR = path.join(WORKSPACE_ROOT, "janus", "priors");

// ════════════════════════════════════════════════════════════════════════════
// the injected prior read
// ════════════════════════════════════════════════════════════════════════════
/**
 * diskPriorReader({dir}) -> readPrior(file) -> { file, ok, prior?, error? }.
 * Resolves relative to the workspace root by default (janus/priors). Never throws: a missing or malformed
 * file is returned as ok:false, which every caller turns into a typed gap.
 */
export function diskPriorReader({ dir = PRIOR_DIR } = {}) {
  const read = (file) => {
    try {
      return { file, ok: true, prior: JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) };
    } catch (e) {
      return { file, ok: false, error: String(e?.code ?? e?.message ?? e) };
    }
  };
  read._disk = true;
  read._dir = dir;
  return read;
}

const missingGap = (r, key) => ({ reason: "prior_missing", key, file: r?.file ?? null, error: r?.error ?? "unreadable" });

// ════════════════════════════════════════════════════════════════════════════
// output shape helpers — the top-level outputs, disclosed, not implied
// ════════════════════════════════════════════════════════════════════════════
function summarize(value) {
  if (Array.isArray(value)) return { kind: "array", count: value.length, sample: value.slice(0, 8) };
  if (value && typeof value === "object") return { kind: "object", count: Object.keys(value).length, keys: Object.keys(value).slice(0, 24) };
  return { kind: typeof value, value };
}

/** topShapes(result) -> [{ output, kind, count, sample?|keys?|value? }] over the non-empty top-level outputs. */
function topShapes(result) {
  const out = [];
  for (const [k, v] of Object.entries(result ?? {})) {
    if (v == null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out.push({ output: k, ...summarize(v) });
  }
  return out;
}

/** The top-level output with the most signal: the primary extract a check script prints. */
function primaryOf(result) {
  const ranked = (name) => ({ plies: 1000, beings: 500, relations: 100, tokens: 10, calls: 50, declared: 40 }[name] ?? 1);
  let best = null, bn = -1;
  for (const [k, v] of Object.entries(result ?? {})) {
    const n = (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : 0) * ranked(k);
    if (n > bn) { bn = n; best = k; }
  }
  return best;
}

// ════════════════════════════════════════════════════════════════════════════
// NOTATION route — the notation adapter suite
// ════════════════════════════════════════════════════════════════════════════
// Each descriptor: the received priors it needs, whether its own loader must be used, how to invoke read,
// and the signal a detector scores it by.
const NOTATION = Object.freeze({
  chem_smiles: {
    module: chem_smiles,
    files: { elements: "notation-chem_smiles-elements.json", grammar: "notation-chem_smiles-grammar.json", system: "notation-chem_smiles-system.json", nameparts: "notation-chem_smiles-nameparts.json" },
    read: (m, text, priors, o) => m.read(text, { system: o.system ?? undefined, priors }),
  },
  chess_pgn: {
    module: chess_pgn,
    files: { lexicon: "notation-chess_pgn-lexicon.json", rules: "notation-chess_pgn-rules.json", identity: "notation-chess_pgn-identity.json" },
    read: (m, text, priors, o) => m.read(text, { priors, letters: o.letters ?? "en" }),
    // chess plies are the strongest signal in the suite: weight them so detection prefers the board reader
    weight: (r) => 10 * (r?.plies?.length ?? 0),
  },
  closed_codes: {
    module: closed_codes,
    files: { morse: "notation-closed_codes-morse.json", braille: "notation-closed_codes-braille.json", nato: "notation-closed_codes-nato.json", lm: "notation-closed_codes-lm.json", null: "notation-closed_codes-null.json" },
    compile: (m, raw) => m.buildPriors(raw),
    read: (m, text, priors, o) => m.read(text, { priors }),
  },
  genetic: {
    module: genetic,
    files: { codon: "notation-genetic-codon-tables.json", alphabet: "notation-genetic-alphabet.json", orf: "notation-genetic-orf.json" },
    read: (m, text, priors) => m.read(text, { priors }),
  },
  ipa: {
    module: ipa,
    files: { chart: "notation-ipa-chart.json", binding: "notation-ipa-binding.json", segments: "notation-ipa-segments.json", identify: "notation-ipa-identify.json" },
    ownLoader: true, // ipa's read() uses a compiled prior (chart + built index); drive it through its own loadPriors
    read: (m, text, priors) => m.read(text, { priors }),
  },
  music_abc: {
    module: music_abc,
    files: { standard: "notation-music_abc-standard.json", lexicon: "notation-music_abc-lexicon.json" },
    read: (m, text, priors, o) => m.read(text, { system: o.system ?? undefined, priors }),
  },
  taxonomy: {
    module: taxonomy,
    files: { lexicon: "notation-taxonomy-lexicon.json", genera: "notation-taxonomy-genera.json", refusal: "notation-taxonomy-refusal.json", classifier: "notation-taxonomy-classifier.json", identity: "notation-taxonomy-identity.json" },
    read: (m, text, priors) => m.read(text, priors, {}),
  },
  uml_bpmn: {
    module: uml_bpmn,
    files: { bpmn: "notation-uml_bpmn-bpmn-lexicon.json", dot: "notation-uml_bpmn-dot-grammar.json", identity: "notation-uml_bpmn-identity.json" },
    read: (m, text, priors, o) => m.read(text, { priors, dialect: o.system ?? null }),
  },
});

const NOTATION_ALIAS = Object.freeze({
  chess: "chess_pgn", chess_pgn: "chess_pgn", pgn: "chess_pgn",
  chem: "chem_smiles", chem_smiles: "chem_smiles", smiles: "chem_smiles",
  closed: "closed_codes", closed_codes: "closed_codes",
  dna: "genetic", genetic: "genetic",
  phonetic: "ipa", ipa: "ipa",
  abc: "music_abc", music_abc: "music_abc", music: "music_abc",
  taxa: "taxonomy", taxonomy: "taxonomy",
  uml: "uml_bpmn", bpmn: "uml_bpmn", uml_bpmn: "uml_bpmn",
});

function normNotationKind(kind) {
  const k = String(kind ?? "").toLowerCase();
  return NOTATION_ALIAS[k] ?? (NOTATION[k] ? k : null);
}

/** Load a descriptor's received priors through the injected read. Always sets `priors.gaps` (the adapters'
 *  `missing()` helper reads `priors.gaps ?? [{kind:"all"}]`, so a hand-made prior object must carry it). */
function assemblePriors(readPrior, files) {
  const priors = {}, used = [], gaps = [];
  for (const [key, file] of Object.entries(files)) {
    const r = readPrior(file);
    if (r && r.ok) { priors[key] = r.prior; used.push(file); }
    else gaps.push(missingGap(r, key));
  }
  priors.gaps = gaps;
  return { priors, used, gaps };
}

function notationRead(kind, text, opts, readPrior, used, gaps) {
  const desc = NOTATION[kind];
  const m = desc.module;
  let priors, loaded;
  if (desc.ownLoader && readPrior._disk) {
    // ipa reads a compiled prior; its own loadPriors({dir}) is the only correct driver, and it reads janus here.
    priors = m.loadPriors({ dir: readPrior._dir ?? (opts.priorDir ?? PRIOR_DIR) });
    loaded = Object.values(desc.files);
    used.push(...loaded);
    gaps.push(...(priors.gaps ?? []).map((g) => ({ ...g, adapter: kind })));
  } else {
    const a = assemblePriors(readPrior, desc.files);
    priors = a.priors;
    used.push(...a.used);
    gaps.push(...a.gaps.map((g) => ({ ...g, adapter: kind })));
    if (desc.compile) { try { priors = desc.compile(m, priors); } catch (e) { gaps.push({ reason: "prior_compile_threw", adapter: kind, error: String(e?.message ?? e) }); } }
  }
  let result = null;
  try { result = desc.read(m, String(text), priors, opts); }
  catch (e) { gaps.push({ reason: "adapter_threw", adapter: kind, error: String(e?.message ?? e) }); }
  return { result, priors };
}

/** Detect the notation family from the material alone: run every descriptor, score by its own signal. */
function detectNotation(text, opts, readPrior) {
  const ranking = [];
  for (const kind of Object.keys(NOTATION)) {
    const used = [], gaps = [];
    let count = 0;
    try {
      const { result } = notationRead(kind, text, opts, readPrior, used, gaps);
      if (result) {
        const w = NOTATION[kind].weight;
        count = (w ? w(result) : 0) + (result.tokens?.length ?? 0) + (result.beings?.length ?? 0);
      }
    } catch { count = 0; }
    ranking.push({ kind, count });
  }
  ranking.sort((a, b) => b.count - a.count);
  const top = ranking[0], second = ranking[1];
  const best = top && top.count > 0 && (!second || top.count > second.count) ? top.kind : null;
  return { best, ranking, ambiguous: !best && !!top && top.count > 0 };
}

function readNotation(text, opts, readPrior) {
  const used = [], gaps = [], shapes = [];
  let kind = opts.kind != null ? normNotationKind(opts.kind) : opts.system != null ? normNotationKind(opts.system) : null;
  let detection = null;
  if (opts.kind != null && !kind) {
    gaps.push({ reason: "notation_kind_unknown", kind: opts.kind });
    return { language: null, priorsUsed: used, shapes, gaps };
  }
  if (!kind) {
    detection = detectNotation(text, opts, readPrior);
    kind = detection.best;
    if (!kind) {
      gaps.push(detection.ambiguous ? { reason: "notation_system_ambiguous", ranking: detection.ranking } : { reason: "notation_system_unresolved", ranking: detection.ranking });
      return { language: null, priorsUsed: used, shapes, gaps, detection };
    }
  }
  const { result, priors } = notationRead(kind, text, opts, readPrior, used, gaps);
  if (result) {
    shapes.push(...topShapes(result));
    const p = primaryOf(result);
    if (p) shapes.primary = p;
  } else if (!gaps.some((g) => g.reason === "adapter_threw")) {
    gaps.push({ reason: "adapter_no_output", adapter: kind });
  }
  return { language: kind, priorsUsed: used, shapes, gaps, result, ...(detection ? { detection } : {}) };
}

// ════════════════════════════════════════════════════════════════════════════
// CODE route — the code adapter suite
// ════════════════════════════════════════════════════════════════════════════
const CODE_ALIAS = Object.freeze({ py: "python", py3: "python", js: "javascript", mjs: "javascript", rb: "ruby", golang: "go", sh: "bash", "c++": "cpp", cs: "c_sharp" });
const normLang = (l) => { const s = String(l ?? "").toLowerCase(); return CODE_ALIAS[s] ?? s; };

function readCode(text, opts, readPrior) {
  const used = [], gaps = [], shapes = [];
  const declared = opts.language ? normLang(opts.language) : null;

  // 1. language: a declared language, else what the identify prior hears (never a silent default)
  let identified = null, resolved = declared;
  const idr = readPrior("code-identify.json");
  if (idr.ok) {
    used.push("code-identify.json");
    try { identified = code_identify.identifyText(text, { prior: idr.prior }); }
    catch (e) { gaps.push({ reason: "adapter_threw", adapter: "identify", error: String(e?.message ?? e) }); }
    if (!resolved && identified?.language) resolved = normLang(identified.language);
  } else gaps.push({ ...missingGap(idr, "identify"), adapter: "identify" });
  shapes.push({ output: "language", declared, identified: identified?.language ?? null, resolved, margin: identified?.margin ?? null });
  if (!resolved) { gaps.push({ reason: "language_unresolved", declared, identified: identified?.language ?? null }); return { language: null, priorsUsed: used, shapes, gaps }; }

  // 2. lexer: code-lex-<lang>.json -> lex.lexCode (the received CodeLexPrior@1)
  const lexFile = `code-lex-${resolved}.json`;
  const lxr = readPrior(lexFile);
  if (lxr.ok && lxr.prior?.schema === code_lex.LEX_SCHEMA) {
    used.push(lexFile);
    let toks = [];
    try { toks = code_lex.lexCode(text, lxr.prior); }
    catch (e) { gaps.push({ reason: "adapter_threw", adapter: "lex", error: String(e?.message ?? e) }); }
    const counts = {}; for (const t of toks) counts[t.class] = (counts[t.class] ?? 0) + 1;
    shapes.push({ output: "lex", count: toks.length, counts, sample: toks.slice(0, 12).map((t) => ({ text: String(text).slice(t.start, t.end), class: t.class, start: t.start, end: t.end })) });
  } else if (!lxr.ok) gaps.push({ ...missingGap(lxr, "lex"), adapter: "lex" });
  else gaps.push({ reason: "prior_schema_mismatch", key: "lex", file: lexFile, expected: code_lex.LEX_SCHEMA, got: lxr.prior?.schema ?? null });

  // 3. edges: code-kw-<lang>.json -> edges.readEdges (the received CodeKeywordPrior@1 refuses bare callees)
  const kwFile = `code-kw-${resolved}.json`;
  const kwr = readPrior(kwFile);
  if (kwr.ok && kwr.prior?.schema === "CodeKeywordPrior@1") {
    used.push(kwFile);
    if (code_edges.edgeLanguages().includes(resolved)) {
      let er = null;
      try { er = code_edges.readEdges({ text, language: resolved, keywords: new Set(kwr.prior.keywords) }); }
      catch (e) { gaps.push({ reason: "adapter_threw", adapter: "edges", error: String(e?.message ?? e) }); }
      if (er) shapes.push({ output: "edges", language: er.language, calls: er.calls, imports: er.imports, declared: er.declared, disclosure: er.disclosure });
    } else gaps.push({ reason: "edges_language_unsupported", language: resolved, supported: code_edges.edgeLanguages() });
  } else if (!kwr.ok) gaps.push({ ...missingGap(kwr, "keywords"), adapter: "edges" });
  else gaps.push({ reason: "prior_schema_mismatch", key: "keywords", file: kwFile, expected: "CodeKeywordPrior@1", got: kwr.prior?.schema ?? null });

  // 4. declared: needs a CodeDeclarationFramePrior@1 (a different schema from either received prior)
  const declFile = opts.declaredPriorFile ?? `code-declared-${resolved}.json`;
  const dr = readPrior(declFile);
  if (dr.ok && dr.prior?.schema === code_declared.DECLARED_PRIOR_SCHEMA) {
    used.push(declFile);
    try { shapes.push({ output: "declared", declarations: code_declared.readDeclared(text, dr.prior, opts.declaredOpts ?? {}) }); }
    catch (e) { gaps.push({ reason: "adapter_threw", adapter: "declared", error: String(e?.message ?? e) }); }
  } else {
    gaps.push({
      reason: "declared_prior_absent",
      adapter: "declared",
      file: declFile,
      expected: code_declared.DECLARED_PRIOR_SCHEMA,
      wall:
        "declared.readDeclared needs a CodeDeclarationFramePrior@1 (built by buildDeclaredPrior over TRAIN files with gold defs). " +
        "The received priors are of other schemas — code-kw-*.json is CodeKeywordPrior@1 and code-lex-*.json is CodeLexPrior@1 — so " +
        "declared.compilePrior reads `prior.base` (undefined on both) and THROWS TypeError. The declaration-frame reader is not " +
        "drivable from the received priors as-is; the wall is disclosed, not patched.",
    });
  }

  // 5. language / mechanical: file-name anchor shapes when a file name is given (no prior needed)
  if (opts.file) {
    try {
      const d = code_language.detectCodeLanguage(opts.file);
      if (d) shapes.push({ output: "detectCodeLanguage", ...summarize(d) });
    } catch (e) { gaps.push({ reason: "adapter_threw", adapter: "language", error: String(e?.message ?? e) }); }
  }

  return { language: resolved, priorsUsed: used, shapes, gaps };
}

// ════════════════════════════════════════════════════════════════════════════
// PROSE route — the measured prose floor
// ════════════════════════════════════════════════════════════════════════════
function readProse(text, _opts) {
  const floor = proseFloor();
  if (!floor) {
    return {
      language: "prose",
      priorsUsed: [],
      shapes: [],
      gaps: [{ reason: "prose_corpus_absent", adapter: "prose-prior", detail: "proseFloor() found no prose corpus on this machine; a floor is disclosed by null, never faked" }],
    };
  }
  const bpw = bitsPerWord(text, floor.prior);
  const code = looksLikeCode(text);
  return {
    language: "prose",
    priorsUsed: [`prose-prior:${floor.corpus ?? "corpus"}`],
    shapes: [{ output: "proseFloor", bitsPerWord: bpw, looksLikeCode: code, trainWords: floor.trainWords ?? null }],
    gaps: [],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// the doorway
// ════════════════════════════════════════════════════════════════════════════
function inferFamily(opts) {
  if (opts.kind != null && normNotationKind(opts.kind)) return "notation";
  if (opts.language != null || (opts.kind != null && normLang(opts.kind))) return "code";
  return null;
}

/**
 * readMaterial(text, { family, kind?, language?, system?, letters?, file?, readPrior?, priorDir? })
 *   family  "notation" | "code" | "prose" (else inferred from kind/language)
 * -> { schema, family, language, priorsUsed, shapes, gaps, result? }
 * The prior read is injected (default: janus/priors relative to the workspace root). A missing prior is a typed
 * gap; a family that cannot be resolved is a typed gap; nothing is guessed and nothing throws.
 */
export function readMaterial(text, opts = {}) {
  const str = String(text ?? "");
  const readPrior = opts.readPrior ?? diskPriorReader({ dir: opts.priorDir ?? PRIOR_DIR });
  const family = opts.family ?? inferFamily(opts);
  const base = { schema: MATERIAL_SCHEMA, family: family ?? null, language: null, priorsUsed: [], shapes: [], gaps: [] };
  try {
    if (family === "notation") return { ...base, ...readNotation(str, opts, readPrior) };
    if (family === "code") return { ...base, ...readCode(str, opts, readPrior) };
    if (family === "prose") return { ...base, ...readProse(str, opts) };
    return { ...base, gaps: [{ reason: family == null ? "family_unresolved" : "family_unknown", family: opts.family ?? null, known: MATERIAL_FAMILIES }] };
  } catch (e) {
    return { ...base, gaps: [{ reason: "read_threw", error: String(e?.message ?? e) }] };
  }
}

export default readMaterial;
