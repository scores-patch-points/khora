// name-gate.js : can a word-like lexeme of source code NAME a being?  A causal REFUSE / NOMINATE gate.
//
// WHAT THIS IS. The reader side of the C2 rung (eval/coding-competence/c2-names.mjs holds the pre-registration).
// It extends the existing refusal logic of adapters/text/code-structure.js (a CodeKeywordPrior@1 hard keyword can never
// name a being; the unseen is admitted, never refused: S83's asymmetric polarity) with two received, per-language
// TRAIN-derived priors:
//   * settled non-names : words seen >= SETTLED_MIN_OCC times across >= SETTLED_MIN_REPOS TRAIN repositories and NEVER
//                         as the name of a definition of any kind (giver: tree-sitter parses of TRAIN repositories)
//   * a context table   : P(definition | lexeme context) over the CLOSED CLASS of the language (keywords + settled
//                         non-names keep their text; every other word is ID), with backoff (giver: same TRAIN parses)
// Lovelace's law: the gate does what it is ordered to perform. It reads what the text ORDERS (the lexemes before the
// word, plus a declared commit delay of H lexemes after it) and nothing else. Casing is not consulted at all (a name
// is never granted identity by its letters; READING-POLICY rule 4).
//
// CAUSAL (READING-SPEC S3). judge(stream, i) reads stream[i-2 .. i+H] and no other lexeme; H is 0 (strictly causal, S0)
// or 1 (one-lexeme commit delay, S1). `checkCausality` verifies it by truncating the future and by corrupting it.
//
// PRIORS REFUSE OR NOMINATE, NEVER ADMIT. The table only nominates; the 'admit' verdict is a nomination that survived the
// refusal tiers. An absent prior changes nothing but what that prior alone would have decided (disclosed in
// `disclosure`), it never silently passes. No model is called here.
//
// Files: priors/code-kw-<code>.json (CodeKeywordPrior@1), priors/code-ctx-<code>.json (CodeContextPrior@1, built by
// eval/coding-competence/build-c2-priors.mjs from the manifest TRAIN split only), priors/code-name-train-<code>.json or
// priors/code-name-<code>.json (CodeNamePrior@1 of TRAIN-declared names).

import fs from "node:fs";
import { loadCodeKeywordPrior, keywordSetOf } from "../text/code-structure.js";

// Declared constants (c2-names.mjs header; priors record the ones they were built with and the loader checks them).
export const PARAMS = Object.freeze({ N_MIN_CTX: 20, THETA_ADMIT: 0.5, SETTLED_MIN_OCC: 100, SETTLED_MIN_REPOS: 2, NAME_FLOOR: 2 });

// Backoff chains: first level with >= N_MIN_CTX TRAIN occurrences decides.
export const LEVELS = Object.freeze({
  S0: Object.freeze(["p2p1", "p1"]),
  S1: Object.freeze(["p2p1n1", "p1n1", "p1"]),
});

export const LANG_CODE = Object.freeze({
  python: "py", py: "py", javascript: "js", js: "js", c: "c", go: "go", ruby: "ruby", rb: "ruby", java: "java",
});

const PRIORS_DIR = new URL("../../priors/", import.meta.url);
const SEP = "\u001f";

/** A lexeme is word-like when it begins with a Unicode letter, '_' or '$'. Strings/comments are decided by the caller
 *  (gold class in the instrument; the lexer in a live reader), this tests shape only. */
export function isWordLike(text) { return /^[\p{L}_$]/u.test(text); }

const IDENT_FULL = /^[\p{L}_$][\p{L}\p{N}_$]*[?!]?$/u;
const STRING_LIKE = /^[A-Za-z]{0,3}(?:"""|'''|"|'|`)/;
const NUMBER_LIKE = /^[0-9]/;

/** The abstraction the context table is keyed on: a closed-class word keeps its text; any other identifier is ID;
 *  strings STR; numbers NUM; everything else (punctuation, operators) keeps its text. */
export function lexClass(text, closed) {
  if (text === undefined) return null;
  if (closed && closed.has(text)) return text;
  if (IDENT_FULL.test(text)) return "ID";
  if (STRING_LIKE.test(text) || text.includes("\n")) return "STR";
  if (NUMBER_LIKE.test(text)) return "NUM";
  return text.length > 24 ? "LONG" : text;
}

/** The context keys of unit i at every level shape. H bounds how far right the key may look. */
export function contextKeys(stream, i, closed, H) {
  const c = (j) => (j < 0 ? "^" : j >= stream.length ? "$" : lexClass(stream[j], closed));
  const p1 = c(i - 1), p2 = c(i - 2);
  const keys = { p1, p2p1: p2 + SEP + p1 };
  if (H >= 1) { const n1 = c(i + 1); keys.p1n1 = p1 + SEP + n1; keys.p2p1n1 = p2 + SEP + p1 + SEP + n1; }
  return keys;
}

// ── priors ────────────────────────────────────────────────────────────────────────────────────────────────────────
function readJson(rel) {
  try { return JSON.parse(fs.readFileSync(new URL(rel, PRIORS_DIR), "utf8")); } catch { return null; }
}

/** The received hard-keyword set for a language code. py/js go through the existing loader of code-structure.js
 *  (the existing refusal logic); the others are the same schema built by scripts/build-code-keyword-prior.mjs. */
export function loadKeywordSet(code) {
  if (code === "py" || code === "js") {
    const prior = loadCodeKeywordPrior(code === "py" ? "python" : "javascript");
    return { prior, set: keywordSetOf(prior), file: `code-kw-${code}.json` };
  }
  const prior = readJson(`code-kw-${code}.json`);
  const ok = prior?.schema === "CodeKeywordPrior@1";
  return { prior: ok ? prior : null, set: ok ? keywordSetOf(prior) : null, file: `code-kw-${code}.json` };
}

/** loadNameGatePriors(code) -> { code, kw:{set,prior,file}|null-set, ctxPrior|null, settled:Set, closed:Set, tables:{level:Map},
 *  nameDecl:Map|null, disclosure:[...] }  A missing prior is a disclosed absence: the gate then refuses/nominates less. */
export function loadNameGatePriors(languageOrCode) {
  const code = LANG_CODE[String(languageOrCode ?? "").toLowerCase()];
  const disclosure = [];
  if (!code) return { code: null, kw: { set: null, prior: null, file: null }, ctxPrior: null, settled: new Set(), closed: new Set(), tables: {}, nameDecl: null, disclosure: [{ gap: "language-unknown", language: languageOrCode }] };
  const kw = loadKeywordSet(code);
  if (!kw.set) disclosure.push({ gap: "no-keyword-prior", file: kw.file });
  const ctxPrior = readJson(`code-ctx-${code}.json`);
  if (ctxPrior?.schema !== "CodeContextPrior@1") disclosure.push({ gap: "no-context-prior", file: `code-ctx-${code}.json` });
  const ok = ctxPrior?.schema === "CodeContextPrior@1";
  const settled = new Set(ok ? ctxPrior.closedClass?.settled ?? [] : []);
  const closedList = ok ? [...(ctxPrior.closedClass?.keywords ?? []), ...(ctxPrior.closedClass?.settled ?? [])] : [...(kw.set ?? [])];
  const closed = new Set(closedList);
  const tables = {};
  if (ok) {
    for (const [lvl, rows] of Object.entries(ctxPrior.tables ?? {})) tables[lvl] = new Map(Object.entries(rows));
    const p = ctxPrior.params ?? {};
    for (const k of ["N_MIN_CTX", "SETTLED_MIN_OCC", "SETTLED_MIN_REPOS"]) if (p[k] !== PARAMS[k]) disclosure.push({ gap: "param-mismatch", param: k, prior: p[k], declared: PARAMS[k] });
    if (kw.set && ctxPrior.closedClass?.keywords) {
      const a = [...kw.set].sort().join(","), b = [...ctxPrior.closedClass.keywords].sort().join(",");
      if (a !== b) disclosure.push({ gap: "closed-class-keywords-differ-from-keyword-prior" });
    }
  }
  let nameDecl = null;
  const nameFile = ok ? ctxPrior.provenance?.namePriorFile : null;
  const namePrior = nameFile ? readJson(nameFile) : null;
  if (namePrior?.schema === "CodeNamePrior@1") {
    nameDecl = new Map(Object.entries(namePrior.names ?? {}).map(([n, v]) => [n, v.repos]));
  } else disclosure.push({ gap: "no-name-prior", file: nameFile ?? null });
  return { code, kw, ctxPrior: ok ? ctxPrior : null, settled, closed, tables, nameDecl, disclosure };
}

// ── the gate ──────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * createNameGate(priors, opts) -> { judge(stream, i), H, opts }
 *   priors  from loadNameGatePriors, or a hand-built {kw:{set}, settled:Set, closed:Set, tables, nameDecl} (tests, controls)
 *   opts.H            0 | 1                 commit delay in lexemes (default 1)
 *   opts.tiers        {keyword:true, settled:true}  which refusal tiers are on
 *   opts.nominateNames  false              admit by TRAIN name attestation when the context does not settle (S1N ablation)
 *   opts.useContext   true                 false = name prior only (nameOnly arm)
 * judge -> { verdict: "refuse"|"admit"|"unsettled", basis: string }
 */
export function createNameGate(priors, opts = {}) {
  const H = opts.H ?? 1;
  const tiers = { keyword: true, settled: true, ...(opts.tiers ?? {}) };
  const useContext = opts.useContext !== false;
  const nominateNames = Boolean(opts.nominateNames);
  const kw = priors.kw?.set ?? null;
  const settled = priors.settled ?? new Set();
  const closed = priors.closed ?? new Set();
  const tables = priors.tables ?? {};
  const nameDecl = priors.nameDecl ?? null;
  const chain = LEVELS[H >= 1 ? "S1" : "S0"];
  const attested = (w) => nameDecl != null && (nameDecl.get(w) ?? 0) >= PARAMS.NAME_FLOOR;

  function judge(stream, i) {
    const w = stream[i];
    if (tiers.keyword && kw && kw.has(w)) return { verdict: "refuse", basis: "keyword" };
    if (tiers.settled && settled.has(w)) return { verdict: "refuse", basis: "settled" };
    let basis = "no-support";
    if (useContext && Object.keys(tables).length) {
      const keys = contextKeys(stream, i, closed, H);
      for (const lvl of chain) {
        const row = tables[lvl]?.get(keys[lvl]);
        if (!row || row[1] < PARAMS.N_MIN_CTX) continue;
        if (row[0] / row[1] >= PARAMS.THETA_ADMIT) return { verdict: "admit", basis: `ctx:${lvl}` };
        basis = `ctx-below:${lvl}`;
        break;
      }
    } else if (useContext) basis = "no-context-prior";
    if ((nominateNames || !useContext) && attested(w)) return { verdict: "admit", basis: "name-attested" };
    return { verdict: "unsettled", basis };
  }
  return { judge, H, opts: { H, tiers, useContext, nominateNames } };
}

/**
 * checkCausality(gate, stream, indices, rng) -> { checked, mismatches:[...] }
 * For each index i: (1) the verdict on the truncated stream [0, i+H] equals the verdict on the whole stream;
 * (2) the verdict is unchanged when every lexeme beyond i+H is replaced by garbage. Either failing is lookahead.
 */
export function checkCausality(gate, stream, indices) {
  const mismatches = [];
  for (const i of indices) {
    const full = gate.judge(stream, i);
    const cut = stream.slice(0, i + gate.H + 1);
    const a = gate.judge(cut, i);
    const garbled = stream.map((t, j) => (j > i + gate.H ? `zz${j % 7}` : t));
    const b = gate.judge(garbled, i);
    if (a.verdict !== full.verdict || a.basis !== full.basis || b.verdict !== full.verdict || b.basis !== full.basis) {
      mismatches.push({ i, full, truncated: a, garbled: b });
      if (mismatches.length >= 5) break;
    }
  }
  return { checked: indices.length, mismatches };
}
