// adapters/notation/genetic.js — the GENETIC-CODE notation family (DNA / RNA / protein
// residues, FASTA and GenBank containers, codon tables) as a MEDIUM ADAPTER.
//
// WHAT THIS IS. The system under test for eval/notation-competence/genetic.mjs. It is NOT the
// gold: the gold is NCBI's RefSeq annotation + Biopython (see the instrument header). The kernel
// stays medium-blind; everything that knows what a codon, a stop or a FASTA header is lives here.
//
// ZERO MODEL. No LLM, no network, no learned weights at run time. Every number the reader uses
// comes from (a) a RECEIVED prior file with a named giver (priors/notation-genetic-*.json) or
// (b) a count the reader makes on the PREFIX it has already read. Nothing is tuned here.
//
// LOVELACE'S LAW applied: the reader recovers what the text ORDERS (a FASTA header orders a
// record; a stop codon orders the end of a reading frame; a feature-table line orders a span),
// never what a gene "means".
//
// WHAT THE PRIORS DO (priors REFUSE or NOMINATE, never admit):
//   notation-genetic-codon-tables.json  giver: NCBI Genetic Codes (gc.prt v4.6), cross-checked
//        against Biopython's CodonTable by the builder. NOMINATES an amino acid per codon per
//        table and REFUSES a stop codon inside a frame. TRAIN counts say which tables the
//        reader has ever seen attested; an unattested table is a typed gap, not a candidate.
//   notation-genetic-alphabet.json      giver: IUPAC-IUB nucleotide + amino-acid codes (Biopython
//        Bio.Data.IUPACData); letter profiles per notation from TRAIN sequences. REFUSES letters
//        outside a notation's alphabet; NOMINATES the notation whose profile the prefix fits. The
//        `nulls` block (giver: UD treebank TRAIN splits for the natural-language letter background;
//        a TRAIN-derived composition tolerance) gives the listener a letter background to lose to and
//        a goodness-of-fit refusal, so a space-free letter text is not named a notation for free.
//   notation-genetic-orf.json           TRAIN-derived constants (bridge length B, ORF gates,
//        start nominees) and GC-binned codon-usage tables; every derivation grid is in the file.
//
// CAUSAL. `read` / `inferCode` / `createListener` are single left-to-right passes: what is said at
// residue p is a function of residues <= p. Each being carries `at`, the residue count the reader
// had consumed when it was emitted; the instrument checks prefix-stability (read(prefix) agrees with
// read(full) for every being with at <= |prefix|).
//
// CASING is one witness (GenBank writes residues in lower case, FASTA in upper); residues are
// folded to upper case, and U is read as T, before any rule applies. The container grammar
// (FASTA, INSDC feature table) is the medium grammar and lives here, named: INSDC Feature Table
// Definition + the FASTA convention.
//
// TYPED GAPS (never silent): not_genetic, background_fits_better, profile_misfit:<notation>, dna_rna_undecided, undecided, table_undecided,
// prior_missing:alphabet.nulls (the listener then falls back to rank-only and says so), table_not_attested_in_train, codon_aa_underdetermined, spliced_cds_unreadable,
// join_across_origin_unread, open_region_at_end, non_protein_genes_not_read,
// core_stop_sense_tables_unmeasured, prior_missing:<name>.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FAMILY = "genetic";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PRIORS_DIR = path.resolve(HERE, "../../priors");
export const PRIOR_FILES = Object.freeze({
  codon: "notation-genetic-codon-tables.json",
  alphabet: "notation-genetic-alphabet.json",
  orf: "notation-genetic-orf.json",
});

// ── priors ───────────────────────────────────────────────────────────────────────────────
/** loadPriors({dir}) -> { codon, alphabet, orf, gaps, ok }. A missing file is a typed gap, never a throw. */
export function loadPriors({ dir = PRIORS_DIR } = {}) {
  const out = { codon: null, alphabet: null, orf: null, gaps: [], dir };
  for (const [k, f] of Object.entries(PRIOR_FILES)) {
    try { out[k] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
    catch { out.gaps.push({ reason: `prior_missing:${k}`, file: f }); }
  }
  out.ok = out.gaps.length === 0;
  return out;
}

// codon index: NCBI order (base1,base2,base3 each T,C,A,G) -> 0..63, the order of gc.prt's strings
const BASES = "TCAG";
const BASE_CODE = new Int8Array(256).fill(4);
for (let i = 0; i < 4; i++) { BASE_CODE[BASES.charCodeAt(i)] = i; BASE_CODE[BASES.toLowerCase().charCodeAt(i)] = i; }
BASE_CODE["U".charCodeAt(0)] = 0; BASE_CODE["u".charCodeAt(0)] = 0;
export const CODONS = Array.from({ length: 64 }, (_, i) => BASES[(i >> 4) & 3] + BASES[(i >> 2) & 3] + BASES[i & 3]);
const CODON_IDX = new Map(CODONS.map((c, i) => [c, i]));
const COMP_CODE = [2, 3, 0, 1]; // T<->A, C<->G in TCAG codes
const RC_IDX = new Uint8Array(64);
for (let i = 0; i < 64; i++) RC_IDX[i] = (COMP_CODE[i & 3] << 4) | (COMP_CODE[(i >> 2) & 3] << 2) | COMP_CODE[(i >> 4) & 3];
export const codonIndex = (c) => CODON_IDX.get(c) ?? -1;
const IDX = { TAA: CODON_IDX.get("TAA"), TAG: CODON_IDX.get("TAG"), TGA: CODON_IDX.get("TGA"), AGA: CODON_IDX.get("AGA"), AGG: CODON_IDX.get("AGG") };

const COMP = { A: "T", C: "G", G: "C", T: "A", N: "N", R: "Y", Y: "R", S: "S", W: "W", K: "M", M: "K", B: "V", D: "H", H: "D", V: "B" };
export function revcomp(s) {
  let o = "";
  for (let i = s.length - 1; i >= 0; i--) o += COMP[s[i]] ?? "N";
  return o;
}
/** U is read as T (RNA folds onto the DNA alphabet); case is folded. Returns {seq, hadU, hadT}. */
export function foldResidues(raw) {
  const up = String(raw).toUpperCase();
  const hadU = up.includes("U"), hadT = up.includes("T");
  return { seq: hadU && !hadT ? up.replace(/U/g, "T") : up, hadU, hadT };
}

// ── compiled priors (cached by identity) ──────────────────────────────────────────────
const _compiled = new WeakMap();
export function compilePriors(priors) {
  if (!priors) return null;
  if (_compiled.has(priors)) return _compiled.get(priors);
  const c = { ok: true, gaps: [...(priors.gaps ?? [])], tables: {}, classes: {}, attested: new Set(), params: null, usage: null, alphabet: null, defaults: { tga: "stop", agr: "sense" } };
  const ct = priors.codon;
  if (ct?.tables) {
    for (const [id, t] of Object.entries(ct.tables)) {
      const aa = t.ncbieaa.split("");
      const stopsIdx = aa.map((a, i) => (a === "*" ? i : -1)).filter((i) => i >= 0);
      const starts = new Uint8Array(64);
      (t.sncbieaa ?? "").split("").forEach((a, i) => { if (a === "M") starts[i] = 1; });
      const tga = stopsIdx.includes(IDX.TGA) ? "stop" : "sense";
      const a1 = stopsIdx.includes(IDX.AGA), a2 = stopsIdx.includes(IDX.AGG);
      const agr = a1 && a2 ? "stop" : (!a1 && !a2 ? "sense" : "mixed");
      const core = stopsIdx.includes(IDX.TAA) && stopsIdx.includes(IDX.TAG);
      c.tables[id] = { id: Number(id), aa, stops: new Set(stopsIdx), starts, tga, agr, core, names: t.names ?? [] };
      const key = `TGA:${tga}|AGR:${agr}`;
      (c.classes[key] ??= []).push(id);
    }
    for (const [id, t] of Object.entries(ct.train?.tables ?? {})) if ((t.genomes ?? 0) > 0) c.attested.add(id);
    if (ct.train?.defaults) c.defaults = ct.train.defaults;
  } else c.gaps.push({ reason: "prior_missing:codon" });
  c.params = priors.orf?.params ?? null;
  if (!c.params) c.gaps.push({ reason: "prior_missing:orf.params" });
  if (priors.orf?.usage) {
    const u = priors.orf.usage;
    c.usage = { edges: u.gcBinEdges, bins: u.bins.map((b) => ({ inFreq: freq64(b.inFrame), bgFreq: freq64(b.shadow), n: b.nIn })) };
    c.usage.bins.forEach((b) => { b.lr = new Float64Array(64); for (let i = 0; i < 64; i++) b.lr[i] = Math.log(b.inFreq[i]) - Math.log(b.bgFreq[i]); });
  }
  if (priors.alphabet?.profiles) {
    const A = priors.alphabet;
    c.alphabet = { profiles: {}, nuc: new Set(Object.keys(A.iupacNucleotide ?? {})), aa: new Set(Object.keys(A.iupacAmino ?? {})), nulls: null };
    for (const [k, prof] of Object.entries(A.profiles)) {
      const tot = Object.values(prof.counts).reduce((a, b) => a + b, 0);
      const eps = A.smoothing ?? 1e-4;
      const lp = new Float64Array(128).fill(Math.log(eps / (tot + 1)));
      for (const [ch, n] of Object.entries(prof.counts)) lp[ch.charCodeAt(0)] = Math.log((n + eps) / (tot + 1));
      c.alphabet.profiles[k] = lp;
    }
    c.alphabet.nulls = compileNulls(A);
    if (!c.alphabet.nulls) c.gaps.push({ reason: "prior_missing:alphabet.nulls" });
  } else c.gaps.push({ reason: "prior_missing:alphabet.profiles" });
  c.ok = c.gaps.length === 0;
  _compiled.set(priors, c);
  return c;
}
/**
 * The NULLS of the notation listener (added after the independent review of the genetic card, finding F2). A listener that only ranks
 * dna / rna / protein names the best of three for ANY letter text. The nulls give it something to lose to, and the fit tests give it
 * a reason to REFUSE, both resting on LETTERS (never on delimiters):
 *   * background  the letter profile of natural-language prose (UD treebank TRAIN splits; giver and stems in the prior),
 *   * flat        the 26-letter uniform (maximum entropy: "no notation, no composition"), received from nothing,
 *   * fit         per notation: protein = a goodness-of-fit refusal on composition (KL of the prefix's letter composition from the
 *                 TRAIN protein profile, tolerance delta derived on TRAIN windows + a chi-square sampling allowance),
 *                 dna / rna = a support refusal (any letter outside the IUPAC-IUB nucleotide alphabet refuses; composition is free
 *                 because genome GC runs 0.15..0.75).
 * Returns null when the prior carries no `nulls` block (the listener then falls back to the rank-only behaviour and says so).
 */
function compileNulls(A) {
  const nl = A.nulls;
  if (!nl?.background?.counts || !nl.fit) return null;
  const bg = new Float64Array(128).fill(-30);
  const tot = Object.values(nl.background.counts).reduce((a, b) => a + b, 0);
  for (let i = 0; i < 26; i++) bg[65 + i] = Math.log(((nl.background.counts[String.fromCharCode(65 + i)] ?? 0) + 1) / (tot + 26));
  const fit = { alphaFit: nl.fit.alphaFit, eps: nl.fit.eps, byNotation: {} };
  const nucAllowed = new Set([...Object.keys(A.iupacNucleotide ?? {}), "U"]);
  for (const [k, f] of Object.entries(nl.fit.byNotation ?? {})) {
    if (f.mode === "support") fit.byNotation[k] = { mode: "support", rho: f.rho, allowed: nucAllowed };
    else if (f.mode === "composition") {
      const prof = A.profiles?.[k]?.counts ?? {};
      let t = 0; for (let i = 0; i < 26; i++) t += prof[String.fromCharCode(65 + i)] ?? 0;
      const q = new Float64Array(26);
      for (let i = 0; i < 26; i++) q[i] = (((prof[String.fromCharCode(65 + i)] ?? 0) / Math.max(1, t)) + fit.eps) / (1 + 26 * fit.eps);
      fit.byNotation[k] = { mode: "composition", q, delta: f.delta, df: f.df };
    }
  }
  return { bg, flat: Math.log(1 / 26), fit };
}
/** upper-tail chi-square quantile for df degrees of freedom: Wilson-Hilferty with the normal quantile of Abramowitz & Stegun 26.2.23. */
export function chi2Upper(df, alpha) {
  // z for the upper tail: Acklam-free rational approximation (Abramowitz & Stegun 26.2.23), exact enough for alpha in [1e-6, 0.5]
  const t = Math.sqrt(-2 * Math.log(alpha));
  const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  const a = 2 / (9 * df);
  return df * Math.pow(1 - a + z * Math.sqrt(a), 3);
}
function freq64(counts) {
  const f = new Float64Array(64); let tot = 0;
  for (let i = 0; i < 64; i++) { const v = (counts?.[CODONS[i]] ?? 0) + 1; f[i] = v; tot += v; }
  for (let i = 0; i < 64; i++) f[i] /= tot;
  return f;
}

// ── letters ──────────────────────────────────────────────────────────────────────────
const NUC_CORE = new Set("ACGTU");
const NUC_AMB = new Set("RYSWKMBDHVN");
const AA20 = new Set("ACDEFGHIKLMNPQRSTVWY");
const AA_EXTRA = new Set("BZXJUO");
/** class of one residue letter: base | ambiguity | amino | stop | gap | other (casing folded). */
export function letterClass(ch) {
  const u = ch.toUpperCase();
  if (NUC_CORE.has(u)) return "base"; // note: A C G T are also amino letters; the RUN decides which notation
  if (NUC_AMB.has(u)) return "ambiguity";
  if (AA20.has(u)) return "amino";
  if (AA_EXTRA.has(u)) return "amino-rare";
  if (u === "*") return "stop";
  if (u === "-" || u === ".") return "gap";
  return "other";
}
/** the notation a residue RUN is written in, by alphabet membership alone (REFUSES outside letters). */
export function alphabetOfRun(run) {
  const u = String(run).toUpperCase();
  let nuc = true, aa = true, hasT = false, hasU = false;
  for (let i = 0; i < u.length; i++) {
    const ch = u[i];
    if (ch === "T") hasT = true; else if (ch === "U") hasU = true;
    if (!(NUC_CORE.has(ch) || NUC_AMB.has(ch) || ch === "-" || ch === ".")) nuc = false;
    if (!(AA20.has(ch) || AA_EXTRA.has(ch) || ch === "*" || ch === "-" || ch === ".")) aa = false;
    if (!nuc && !aa) return "other";
  }
  if (nuc) { if (hasT && hasU) return "mixed"; return hasU ? "rna" : hasT ? "dna" : "nucleotide"; }
  return aa ? "protein" : "other";
}

// ── container grammar + EAR ────────────────────────────────────────────────────────────
const RE_LOCUS = /^LOCUS\s+(\S+)\s+(\d+)\s+(bp|aa)\s+(?:(\S+)\s+)?(?:(linear|circular)\s+)?(\S+)?\s*(\S+)?\s*$/;
const RE_GB_KEY = /^(LOCUS|DEFINITION|ACCESSION|VERSION|DBLINK|KEYWORDS|SOURCE|REFERENCE|COMMENT|FEATURES|ORIGIN|CONTIG|BASE COUNT|PRIMARY|DBSOURCE|PROJECT)\b/;
const RE_ORIGIN = /^\s*(\d+)((?:\s+[A-Za-z]{1,10})+)\s*$/;
const RE_FEATURE = /^ {5}(\S+)\s+(\S.*)$/;
const RE_QUAL = /^ {21}\/([\w-]+)(?:=(.*))?$/;
const RE_SEQLINE = /^[A-Za-z*.\-]+\s*$/;

/**
 * ear(text) -> tokens. One pass over lines; every token has {kind, class, start, end} in CHARACTER
 * offsets of `text`; residue runs carry no copy of the letters (read text.slice(start,end)).
 *   kind: header | locus | keyword | feature | qualifier | coordinate | residues | end-of-record | text
 *   class: fasta-header, genbank-locus, genbank-keyword, feature-key, qualifier, position-label,
 *          dna | rna | nucleotide | protein | mixed | other (residue runs, by alphabet), prose
 */
export function ear(text, { limitLines = null } = {}) {
  const tokens = [];
  let mode = "none"; // none | fasta | gb-head | gb-features | gb-origin
  let off = 0, lineNo = 0, lastFeat = null, lastQual = null;
  const n = text.length;
  while (off < n) {
    let nl = text.indexOf("\n", off);
    if (nl < 0) nl = n;
    let lineEnd = nl; if (lineEnd > off && text.charCodeAt(lineEnd - 1) === 13) lineEnd--;
    const line = text.slice(off, lineEnd);
    const lineStart = off;
    off = nl + 1; lineNo++;
    if (limitLines != null && lineNo > limitLines) break;
    if (!line.trim()) continue;
    if (line.charCodeAt(0) === 62 /* > */) {
      mode = "fasta";
      const sp = line.search(/\s/);
      const id = sp < 0 ? line.slice(1) : line.slice(1, sp);
      tokens.push({ kind: "header", class: "fasta-header", start: lineStart, end: lineEnd, line: lineNo, id, desc: sp < 0 ? "" : line.slice(sp + 1).trim() });
      continue;
    }
    if (line.startsWith("LOCUS")) {
      const m = RE_LOCUS.exec(line);
      mode = "gb-head";
      tokens.push({ kind: "locus", class: "genbank-locus", start: lineStart, end: lineEnd, line: lineNo, id: m ? m[1] : null, length: m ? Number(m[2]) : null, unit: m ? m[3] : null, topology: m ? (m[5] ?? null) : null });
      continue;
    }
    if (line.startsWith("//")) { tokens.push({ kind: "end-of-record", class: "genbank-keyword", start: lineStart, end: lineEnd, line: lineNo }); mode = "none"; continue; }
    if (mode !== "gb-features" && mode !== "gb-origin" || line.charCodeAt(0) !== 32) {
      const km = RE_GB_KEY.exec(line);
      if (km && (mode.startsWith("gb") || km[1] === "LOCUS")) {
        if (km[1] === "FEATURES") mode = "gb-features"; else if (km[1] === "ORIGIN") mode = "gb-origin"; else mode = "gb-head";
        tokens.push({ kind: "keyword", class: "genbank-keyword", start: lineStart, end: lineEnd, line: lineNo, key: km[1] });
        continue;
      }
    }
    if (mode === "gb-features") {
      const q = RE_QUAL.exec(line);
      if (q) {
        let v = q[2] ?? null;
        lastQual = { kind: "qualifier", class: "qualifier", start: lineStart, end: lineEnd, line: lineNo, name: q[1], value: v };
        tokens.push(lastQual); continue;
      }
      const f = RE_FEATURE.exec(line);
      if (f && line.charCodeAt(5) !== 32) {
        lastFeat = { kind: "feature", class: "feature-key", start: lineStart, end: lineEnd, line: lineNo, key: f[1], location: f[2].trim() };
        lastQual = null; tokens.push(lastFeat); continue;
      }
      if (line.startsWith(" ".repeat(21))) { // continuation of a location or a qualifier value
        const cont = line.trim();
        if (lastQual) { lastQual.value = (lastQual.value ?? "") + (lastQual.name === "translation" ? "" : " ") + cont; lastQual.end = lineEnd; }
        else if (lastFeat) { lastFeat.location += cont; lastFeat.end = lineEnd; }
        continue;
      }
    }
    if (mode === "gb-origin" || mode === "none") {
      const m = RE_ORIGIN.exec(line);
      if (m) {
        const groups = m[2].trim().split(/\s+/);
        const okShape = groups.slice(0, -1).every((g) => g.length === 10);
        if (okShape || mode === "gb-origin") {
          const numStart = lineStart + line.indexOf(m[1]);
          tokens.push({ kind: "coordinate", class: "position-label", start: numStart, end: numStart + m[1].length, line: lineNo, value: Number(m[1]) });
          let cursor = numStart + m[1].length;
          for (const g of groups) {
            const gs = text.indexOf(g, cursor); cursor = gs + g.length;
            tokens.push({ kind: "residues", class: alphabetOfRun(g), start: gs, end: gs + g.length, line: lineNo, container: "genbank-origin" });
          }
          if (mode === "none") mode = "gb-origin";
          continue;
        }
      }
    }
    if ((mode === "fasta" || mode === "none") && RE_SEQLINE.test(line)) {
      const t = line.trimEnd();
      tokens.push({ kind: "residues", class: alphabetOfRun(t), start: lineStart, end: lineStart + t.length, line: lineNo, container: mode === "fasta" ? "fasta" : "bare" });
      continue;
    }
    tokens.push({ kind: "text", class: "prose", start: lineStart, end: lineEnd, line: lineNo });
  }
  return tokens;
}

/** The concatenated residues of each record in `text` (FASTA / GenBank / bare), in order. */
export function extractRecords(text) {
  const toks = ear(text);
  const recs = [];
  let cur = null;
  const open = (id, kind) => { cur = { id, kind, parts: [] }; recs.push(cur); };
  for (const t of toks) {
    if (t.kind === "header") open(t.id, "fasta");
    else if (t.kind === "locus") open(t.id, "genbank");
    else if (t.kind === "residues") { if (!cur) open(null, "bare"); cur.parts.push(text.slice(t.start, t.end)); }
  }
  return recs.map((r) => ({ id: r.id, kind: r.kind, residues: r.parts.join("") }));
}

// ── GenBank feature table: the DECLARED beings ───────────────────────────────────────────
/** parseLocation("complement(join(1..5,8..10))") -> {ok, parts:[{start,end,strand}], partial} (0-based half-open). */
export function parseLocation(loc) {
  let i = 0; const s = String(loc).replace(/\s+/g, "");
  let partial = false, ok = true, remote = false;
  function parse(strand) {
    const m = /^(complement|join|order|bond|gap)\(/.exec(s.slice(i));
    if (m) {
      i += m[0].length;
      const parts = [];
      let st = strand;
      if (m[1] === "complement") { st = -strand; const inner = parse(st); if (s[i] === ")") i++; else ok = false; return inner; }
      if (m[1] !== "join") ok = false; // order/bond/gap: not a contiguous coding span; typed unread
      for (;;) {
        parts.push(...parse(st));
        if (s[i] === ",") { i++; continue; }
        if (s[i] === ")") { i++; break; }
        ok = false; break;
      }
      return parts;
    }
    const r = /^(?:[A-Za-z_][\w.]*:)?([<>]?)(\d+)(?:\.\.([<>]?)(\d+)|\^(\d+))?/.exec(s.slice(i));
    if (!r) { ok = false; i = s.length; return []; }
    if (/^[A-Za-z_][\w.]*:/.test(s.slice(i))) remote = true;
    i += r[0].length;
    if (r[1] || r[3]) partial = true;
    const a = Number(r[2]), b = r[4] != null ? Number(r[4]) : a;
    return [{ start: a - 1, end: b, strand }];
  }
  const parts = parse(1);
  if (i !== s.length) ok = false;
  return { ok: ok && !remote, parts, partial, remote };
}
/** parseFeatures(genbankText) -> [{key, location, parsed, qualifiers}] for CDS (and all) features. */
export function parseFeatures(text, { keys = null } = {}) {
  const toks = ear(text);
  const feats = []; let cur = null;
  for (const t of toks) {
    if (t.kind === "feature") { cur = { key: t.key, location: t.location, qualifiers: {}, line: t.line }; feats.push(cur); }
    else if (t.kind === "qualifier" && cur) {
      let v = t.value; if (v && v.startsWith("\"")) v = v.replace(/^"/, "").replace(/"$/, "");
      (cur.qualifiers[t.name] ??= []).push(v);
    } else if (t.kind === "keyword" && t.key !== "FEATURES") cur = null;
  }
  const sel = keys ? feats.filter((f) => keys.includes(f.key)) : feats;
  for (const f of sel) f.parsed = parseLocation(f.location);
  return sel;
}

// ── notation identification (R0): a causal LISTENER ───────────────────────────────────────
/**
 * createListener({priors, params}) -> { feed(line), verdict(), state }.  Lines are fed one at a time; the
 * verdict after line i is a function of lines <= i (it is computed from running letter counts only).
 * Verdict: {system, gap}. system is one of "dna" | "rna" | "protein" | "genbank" | null. The typed refusals are
 *   not_genetic              >= notGeneticShare of the lines are not residue lines (whitespace / punctuation / digits in the line),
 *   undecided                too few letters, or nothing wins,
 *   dna_rna_undecided        dna and rna differ only by T/U and neither letter has been seen,
 *   background_fits_better   a LETTER null (natural-language background, 26-letter flat) explains the letters as well as any notation does,
 *   profile_misfit:<k>       the letters do not fit notation k (protein: composition; dna/rna: a letter outside the IUPAC alphabet).
 * The last two rest on letters, so a delimiter-free letter text (a word list, ciphertext, acronyms, random A-Z) is refused too.
 * params.nulls === false switches the nulls and the fit tests off: the pre-review RANK-ONLY listener, kept as the instrument's
 * ablation control (it names the best of three for any letter text).
 */
export function createListener({ priors, params = null } = {}) {
  const C = compilePriors(priors);
  const P = { minLetters: 20, alpha: 0.01, notGeneticShare: 0.5, nulls: true, ...(C?.params?.identify ?? {}), ...(params ?? {}) };
  const T = Math.log(1 / P.alpha);
  const NU = P.nulls !== false ? (C?.alphabet?.nulls ?? null) : null;
  const st = { lines: 0, letters: 0, residueLines: 0, proseLines: 0, genbank: false, ll: { dna: 0, rna: 0, protein: 0 }, llNull: { background: 0, flat: 0 }, cnt: new Float64Array(26), stars: 0, hasT: false, hasU: false, first: null, nullsActive: !!NU };
  const prof = C?.alphabet?.profiles;
  function feed(line) {
    const l = String(line).replace(/\r$/, "");
    if (!l.trim()) return verdict();
    st.lines++;
    if (RE_LOCUS.test(l) && l.startsWith("LOCUS")) { st.genbank = true; return verdict(); }
    if (l.charCodeAt(0) === 62) return verdict(); // a FASTA header orders a record; it is not residue evidence
    if (st.genbank && (RE_GB_KEY.test(l) || /^ {2,}\S/.test(l))) {
      const mo = RE_ORIGIN.exec(l);
      if (!mo) return verdict();
    }
    let run = null;
    const mo = RE_ORIGIN.exec(l);
    if (mo) { const groups = mo[2].trim().split(/\s+/); if (groups.slice(0, -1).every((g) => g.length === 10)) run = groups.join(""); }
    if (run == null && RE_SEQLINE.test(l)) run = l.trim();
    if (run == null) { st.proseLines++; return verdict(); }
    st.residueLines++;
    const u = run.toUpperCase();
    for (let i = 0; i < u.length; i++) {
      const code = u.charCodeAt(i);
      if (code > 127) { st.ll.dna += -20; st.ll.rna += -20; st.ll.protein += -20; continue; }
      if (prof) { st.ll.dna += prof.dna[code]; st.ll.rna += prof.rna[code]; st.ll.protein += prof.protein[code]; }
      if (NU) { st.llNull.background += NU.bg[code]; st.llNull.flat += NU.flat; }
      if (code >= 65 && code <= 90) st.cnt[code - 65]++; else if (code === 42) st.stars++;
      if (u[i] === "T") st.hasT = true; else if (u[i] === "U") st.hasU = true;
    }
    st.letters += u.length;
    return verdict();
  }
  /** does the prefix's letter content fit notation k? -> {ok, stat, limit} (null when the prior has no test for k). */
  function fits(k) {
    const f = NU?.fit?.byNotation?.[k];
    if (!f) return null;
    let N = 0; for (let i = 0; i < 26; i++) N += st.cnt[i];
    if (f.mode === "support") {
      let out = k === "protein" ? 0 : st.stars;
      for (let i = 0; i < 26; i++) if (st.cnt[i] && !f.allowed.has(String.fromCharCode(65 + i))) out += st.cnt[i];
      const share = out / Math.max(1, N + (k === "protein" ? 0 : st.stars));
      return { ok: share <= f.rho, stat: share, limit: f.rho, mode: "support" };
    }
    if (!N) return { ok: true, stat: 0, limit: 0, mode: "composition" };
    let kl = 0;
    for (let i = 0; i < 26; i++) if (st.cnt[i]) { const ph = st.cnt[i] / N; kl += ph * Math.log(ph / f.q[i]); }
    const limit = f.delta + chi2Upper(f.df, NU.fit.alphaFit) / (2 * N);
    return { ok: kl <= limit, stat: kl, limit, mode: "composition" };
  }
  function verdict() {
    if (st.genbank) return { system: "genbank", gap: null };
    const nonblank = st.residueLines + st.proseLines;
    if (!nonblank) return { system: null, gap: "undecided" };
    if (st.proseLines / nonblank >= P.notGeneticShare) return { system: null, gap: "not_genetic" };
    if (st.letters < P.minLetters) return { system: null, gap: "undecided" };
    const ranked = Object.entries(st.ll).sort((a, b) => b[1] - a[1]);
    const [best, second] = ranked;
    if (NU) {
      // the letters must beat BOTH nulls by ln(1/alpha): a notation is named against "no notation", not against its two siblings only
      const nullBest = Math.max(st.llNull.background, st.llNull.flat);
      if (!(best[1] - nullBest >= T)) return { system: null, gap: "background_fits_better" };
      // and must FIT: a refusal that depends on the letters
      const f = fits(best[0]);
      if (f && !f.ok) return { system: null, gap: `profile_misfit:${best[0]}` };
    }
    if (best[1] - second[1] >= T) return { system: best[0], gap: null };
    // dna and rna differ only by T/U; with neither letter present the notation is genuinely undecided
    if ((best[0] === "dna" && second[0] === "rna") || (best[0] === "rna" && second[0] === "dna")) return { system: null, gap: "dna_rna_undecided" };
    return { system: null, gap: "undecided" };
  }
  return { feed, verdict, fits, state: st };
}
/** identify(text) -> per-line verdict timeline [{line, system, gap}] (causal: line i sees lines <= i). */
export function identify(text, { priors, maxLines = null, params = null } = {}) {
  const L = createListener({ priors, params });
  const out = []; let i = 0;
  for (const line of String(text).split("\n")) {
    if (maxLines != null && i >= maxLines) break;
    if (!line.trim()) continue;
    i++;
    const v = L.feed(line);
    out.push({ line: i, system: v.system, gap: v.gap });
  }
  return out;
}

// ── the genetic code as received ────────────────────────────────────────────────────────
/** the candidate tables for a code state: attested tables whose stop class is consistent with the state. */
export function candidateTables(state, C) {
  const key = `${state.tga}|${state.agr}`;
  const cache = (C._candCache ??= new Map());
  if (cache.has(key)) return cache.get(key);
  const out = [];
  for (const [id, t] of Object.entries(C.tables)) {
    if (!C.attested.has(id)) continue;
    if (state.tga !== "unknown" && t.tga !== state.tga) continue;
    if (state.agr !== "unknown" && t.agr !== state.agr) continue;
    out.push(t);
  }
  cache.set(key, out);
  return out;
}
/**
 * classifyCodonEx(idx, state, C) -> {cls: "stop" | "sense" | "unknown", provisional}. The prior REFUSES a stop inside a frame
 * and NOMINATES sense. Where the evidence has not settled a disputed codon (TGA; AGA/AGG) the class is the TRAIN default's
 * nomination, flagged provisional (a typed gap that is counted, never hidden); only an unreadable codon (N) is "unknown".
 */
export function classifyCodonEx(idx, state, C) {
  if (idx < 0) return { cls: "unknown", provisional: false };
  if (idx === IDX.TAA || idx === IDX.TAG) return { cls: "stop", provisional: false }; // core stops (see core_stop_sense_tables_unmeasured)
  const cls = stopFlagsFor(state, C)[idx] ? "stop" : "sense";
  const provisional = (idx === IDX.TGA && state.tga === "unknown") || ((idx === IDX.AGA || idx === IDX.AGG) && state.agr === "unknown");
  return { cls, provisional };
}
export function classifyCodon(idx, state, C) { return classifyCodonEx(idx, state, C).cls; }
/**
 * aaFor(idx, state, C) -> {aa, set, committed}. `set` are the amino acids the candidate tables nominate
 * (stop = "*"); committed iff they agree. Otherwise typed gap codon_aa_underdetermined.
 */
export function aaFor(idx, state, C) {
  if (idx < 0) return { aa: null, set: [], committed: false };
  const cands = candidateTables(state, C);
  if (!cands.length) return { aa: null, set: [], committed: false };
  const set = [...new Set(cands.map((t) => t.aa[idx]))].sort();
  return { aa: set.length === 1 ? set[0] : null, set, committed: set.length === 1 };
}
/** initiator rule (NCBI practice): a start codon of the table is read as Met at position 1, whatever it spells. */
export function isStartNominee(idx, C, nominees) { return idx >= 0 && nominees.has(idx); }

export function stopFlagsFor(state, C) {
  const ck = `${state.tga}|${state.agr}`;
  const cache = (C._flagCache ??= new Map());
  if (cache.has(ck)) return cache.get(ck);
  const f = new Uint8Array(64);
  f[IDX.TAA] = 1; f[IDX.TAG] = 1;
  const tga = state.tga === "unknown" ? C.defaults.tga : state.tga;
  const agr = state.agr === "unknown" ? C.defaults.agr : state.agr;
  if (tga === "stop") f[IDX.TGA] = 1;
  if (agr === "stop") { f[IDX.AGA] = 1; f[IDX.AGG] = 1; }
  cache.set(ck, f);
  return f;
}

// ── the evidence for the code variant (a statistic on the prefix, never a lookup) ─────────────
function logLik(n, N, r1, r0) { return n * Math.log(r1 / r0) + (N - n) * Math.log((1 - r1) / (1 - r0)); }
/** decide the stop status of a disputed codon class from counts {n, N} and the genome's own rho0, rho1. */
export function decideStatus({ n, N }, { rho0, rho1 }, P) {
  if (N < P.nMin) return { status: "unknown", why: "too_few_occurrences", L: 0 };
  if (!(rho1 - rho0 >= P.minSeparation)) return { status: "unknown", why: "no_separation", L: 0 };
  const L = logLik(n, N, rho1, rho0);
  const T = Math.log(1 / P.alpha);
  return { status: L > T ? "sense" : L < -T ? "stop" : "unknown", why: null, L };
}

/**
 * The prior REFUSES an incoherent state: (TGA, AGR) must be explainable by at least one ATTESTED table. The evidence for
 * an AGR stop is the weaker of the two (rare codons, wide variance), so when the pair is refused it is the AGR claim that
 * goes back to "unknown" (e.g. TGA stop together with AGR stop exists in no attested table; TRAIN: Thermus).
 */
function coherent(tga, agr, C) {
  if (!C?.tables || !Object.keys(C.tables).length || tga === "unknown" || agr === "unknown") return agr;
  return candidateTables({ tga, agr }, C).length ? agr : "unknown";
}

// ── the single-pass scan: code state + ORF beings, both strands ───────────────────────────────
const DEFAULT_PARAMS = Object.freeze({ B: 30, nMin: 8, alpha: 0.01, minSeparation: 0.1, Lmin: 100, Lconf: 250, kappa: 500, startNominees: ["ATG", "GTG", "TTG"] });

/**
 * scanGenome(seq, {priors, params, fixedState, noUsage, naive}) -> {beings, timeline, evidence, gaps, n}
 *   seq        uppercase ACGT(N) residues of ONE record (U already folded to T)
 *   fixedState {tga, agr} fixes the code (builder / baselines); otherwise the state is INFERRED from the prefix
 *   noUsage    true: the length gate alone (ablation); false: usage evidence for short ORFs
 *   naive      true: the plain ORF baseline (standard stops, ATG only, length gate only)
 *   stopOverride  [codons] a CONTROL hook: these codons (only) end a frame; the code is then fixed, nothing is inferred
 * Positions are residue coordinates, 0-based half-open, plus strand; a being's span includes its stop codon.
 *
 * THE EVIDENCE FOR THE CODE ("coding continuation"). Every codon of each of the six frames gets the TRAIN GC-binned
 * usage log-odds (in-frame vs shadow-frame; a received prior). A window of B codons is coding-like iff its summed
 * log-odds is > 0. At codon k of a frame, B codons later (so the reader has 3B residues of lookahead *inside its own
 * past*: the statistic is attached to the prefix that has been read), the codon is scored if the window on its GENE
 * side (the 5' side of that strand) is coding-like, and it BRIDGES iff the window on its other side is coding-like too.
 * A core stop (TAA/TAG) is the null: a stop that follows a coding window rarely precedes another. rho0 is that rate.
 * rho1 is the same rate over ordinary codons. A disputed codon (TGA; AGA/AGG) whose bridging rate sits at rho1 is
 * SENSE, at rho0 is STOP; counts that cannot tell (log-likelihood ratio below ln(1/alpha), too few, no separation)
 * leave the status UNKNOWN, a typed gap, and the reader falls back on the TRAIN majority stop class.
 */
export function scanGenome(seq, { priors, params = null, fixedState = null, noUsage = false, naive = false, stopOverride = null } = {}) {
  const C = compilePriors(priors) ?? { tables: {}, attested: new Set(), defaults: { tga: "stop", agr: "sense" }, params: null, usage: null, classes: {} };
  const P = { ...DEFAULT_PARAMS, ...(C.params ?? {}), ...(params ?? {}) };
  const n = seq.length;
  const nominees = new Uint8Array(64);
  const nomList = naive ? ["ATG"] : P.startNominees;
  for (const c of nomList) { const i = CODON_IDX.get(c); if (i != null) nominees[i] = 1; }
  let state = fixedState ? { tga: fixedState.tga, agr: fixedState.agr } : { tga: "unknown", agr: "unknown" };
  let stops = naive ? stopFlagsFor({ tga: "stop", agr: "sense" }, C) : stopFlagsFor(state, C);
  if (stopOverride) { stops = new Uint8Array(64); for (const c of stopOverride) { const i = CODON_IDX.get(c); if (i != null) stops[i] = 1; } fixedState ??= { tga: "stop", agr: "sense" }; state = { ...fixedState }; }
  const timeline = [{ at: 0, tga: state.tga, agr: state.agr }];
  const B = P.B;
  const U = C.usage; const kappa = P.kappa;
  const gaps = new Map();
  const gap = (r, k = 1) => gaps.set(r, (gaps.get(r) ?? 0) + k);
  // evidence accumulators
  const ev = { tga: { n: 0, N: 0 }, agr: { n: 0, N: 0 }, N0: 0, n0: 0, N1: 0, n1: 0 };
  const evOn = !fixedState && !naive && !!U;
  if (!fixedState && !naive && !U) gap("table_undecided:usage_prior_missing");
  const fr = evOn ? [0, 1].map(() => [0, 1, 2].map((f) => { const m = Math.max(0, Math.floor((n - f) / 3)); return { ci: new Int8Array(m).fill(-1), cum: new Float64Array(m + 1) }; })) : null;
  const orfF = [{ firstStart: -1 }, { firstStart: -1 }, { firstStart: -1 }];
  const orfR = [{ leftStop: -1, lastStart: -1 }, { leftStop: -1, lastStart: -1 }, { leftStop: -1, lastStart: -1 }];
  const beings = [];
  // usage model for short-ORF nomination (prefix-learned over the TRAIN GC-binned prior)
  const obsIn = new Float64Array(64), obsBg = new Float64Array(64); let nIn = 0, nBg = 0;
  const lrCache = new Map(); let lrDirty = true;
  let gcN = 0, atN = 0;
  const binOf = () => { const gc = gcN / Math.max(1, gcN + atN); let b = 0; if (U) while (b < U.edges.length && gc >= U.edges[b]) b++; return b; };
  function lrFor(bin) {
    if (lrDirty) { lrCache.clear(); lrDirty = false; }
    if (lrCache.has(bin)) return lrCache.get(bin);
    const b = U.bins[bin]; const lr = new Float64Array(64);
    for (let i = 0; i < 64; i++) {
      const pin = (obsIn[i] + kappa * b.inFreq[i]) / (nIn + kappa);
      const pbg = (obsBg[i] + kappa * b.bgFreq[i]) / (nBg + kappa);
      lr[i] = Math.log(pin) - Math.log(pbg);
    }
    lrCache.set(bin, lr); return lr;
  }
  const codeAt = (p, rc) => { const a = BASE_CODE[seq.charCodeAt(p)], b = BASE_CODE[seq.charCodeAt(p + 1)], c = BASE_CODE[seq.charCodeAt(p + 2)]; if ((a | b | c) > 3) return -1; const i = (a << 4) | (b << 2) | c; return rc ? RC_IDX[i] : i; };

  function candidate(strand, spanStart, spanEnd, lenCodons, at, startPos, stopPos) {
    // gate: length; then usage evidence for short ORFs (the prior NOMINATES, the reader's own counts decide)
    if (lenCodons < P.Lmin) return;
    let how = "long", llr = null;
    const frameStart = strand === "+" ? startPos : stopPos + 3; // first codon in plus order
    if (lenCodons < P.Lconf) {
      if (naive || noUsage || !U) { how = "length"; }
      else {
        const lr = lrFor(binOf()); let s = 0, cnt = 0;
        for (let p = frameStart; p + 3 <= (strand === "+" ? stopPos : startPos + 3); p += 3) { const ci = codeAt(p, strand === "-"); if (ci >= 0) { s += lr[ci]; cnt++; } }
        llr = cnt ? s / cnt : -Infinity;
        if (!(llr > 0)) return; // refused: usage does not nominate it
        how = "usage";
      }
    } else if (!naive && !noUsage && U) {
      // confident: update the usage model with this ORF (in-frame codons) and its shadow frames
      const endCod = strand === "+" ? stopPos : startPos + 3;
      for (let p = frameStart; p + 3 <= endCod; p += 3) {
        const ci = codeAt(p, strand === "-"); if (ci >= 0) { obsIn[ci]++; nIn++; }
        for (const sh of [1, 2]) { if (p + sh + 3 <= n) { const cj = codeAt(p + sh, strand === "-"); if (cj >= 0) { obsBg[cj]++; nBg++; } } }
      }
      lrDirty = true;
    }
    beings.push({ id: `orf:${strand}:${spanStart}-${spanEnd}`, kind: "orf", strand, span: [spanStart, spanEnd], start: startPos, stop: stopPos, codons: lenCodons, at, how, llr, provisional: !fixedState && !naive && (state.tga === "unknown" || state.agr === "unknown") });
  }

  function updateState(at) {
    const rho0 = (ev.n0 + 0.5) / (ev.N0 + 1), rho1 = (ev.n1 + 0.5) / (ev.N1 + 1);
    // IDENTITY DOES NOT DECAY (READING-SPEC rule 2): a settled status is revoked only by the OPPOSITE verdict (log-likelihood ratio past
    // -ln(1/alpha) the other way), never by drifting back to "unsettled"; v1 recomputed the status at every look and flapped (10-70 changes per genome)
    const dT = decideStatus(ev.tga, { rho0, rho1 }, P).status, dA = decideStatus(ev.agr, { rho0, rho1 }, P).status;
    const t = dT === "unknown" ? state.tga : dT;
    const a = coherent(t, dA === "unknown" ? state.agr : dA, C);
    if (t !== state.tga || a !== state.agr) {
      state = { tga: t, agr: a };
      stops = stopFlagsFor(state, C);
      timeline.push({ at, tga: t, agr: a });
    }
  }
  // score the codon B codons back in this frame (needs B codons on each side of it)
  function evaluate(fa, k, rev, at) {
    const ke = k - B;
    if (ke < B) return;
    const cat = fa.ci[ke];
    if (cat < 0) return;
    const up = fa.cum[ke] - fa.cum[ke - B], dn = fa.cum[k + 1] - fa.cum[ke + 1];
    const gene = rev ? dn : up, other = rev ? up : dn;
    if (!(gene > 0)) return;
    const br = other > 0 ? 1 : 0;
    if (cat === IDX.TAA || cat === IDX.TAG) { ev.N0++; ev.n0 += br; }
    else if (cat === IDX.TGA) { ev.tga.N++; ev.tga.n += br; updateState(at); }
    else if (cat === IDX.AGA || cat === IDX.AGG) { ev.agr.N++; ev.agr.n += br; updateState(at); }
    else { ev.N1++; ev.n1 += br; }
  }

  for (let p = 0; p + 3 <= n; p++) {
    const b0 = BASE_CODE[seq.charCodeAt(p)];
    if (b0 === 1 || b0 === 3) gcN++; else if (b0 === 0 || b0 === 2) atN++;
    const idx = codeAt(p, false);
    const f = p % 3, k = (p - f) / 3;
    if (evOn) {
      const lrS = U.bins[binOf()].lr;
      const A0 = fr[0][f], A1 = fr[1][f];
      if (idx < 0) { A0.cum[k + 1] = A0.cum[k]; A1.cum[k + 1] = A1.cum[k]; }
      else {
        const ridx = RC_IDX[idx];
        A0.ci[k] = idx; A0.cum[k + 1] = A0.cum[k] + lrS[idx];
        A1.ci[k] = ridx; A1.cum[k + 1] = A1.cum[k] + lrS[ridx];
        evaluate(A0, k, false, p + 3); evaluate(A1, k, true, p + 3);
      }
    }
    if (idx < 0) continue;
    const ridx = RC_IDX[idx];
    // ── forward frame f ──
    {
      const oo = orfF[f];
      if (stops[idx]) {
        if (oo.firstStart >= 0) { const len = (p - oo.firstStart) / 3; candidate("+", oo.firstStart, p + 3, len, p + 3, oo.firstStart, p); }
        oo.firstStart = -1;
      } else if (oo.firstStart < 0 && nominees[idx]) oo.firstStart = p;
    }
    // ── reverse frame f (the triplet read as its reverse complement) ──
    {
      const oo = orfR[f];
      if (stops[ridx]) {
        if (oo.leftStop >= 0 && oo.lastStart >= 0) { const len = (oo.lastStart - oo.leftStop) / 3; candidate("-", oo.leftStop, oo.lastStart + 3, len, p + 3, oo.lastStart, oo.leftStop); }
        oo.leftStop = p; oo.lastStart = -1;
      } else if (oo.leftStop >= 0 && nominees[ridx]) oo.lastStart = p;
    }
  }
  for (let f = 0; f < 3; f++) {
    if (orfF[f].firstStart >= 0) gap("open_region_at_end");
    if (orfR[f].leftStop >= 0) gap("open_region_at_end");
  }
  const rho0 = (ev.n0 + 0.5) / (ev.N0 + 1), rho1 = (ev.n1 + 0.5) / (ev.N1 + 1);
  const tgaD = decideStatus(ev.tga, { rho0, rho1 }, P), agrD = decideStatus(ev.agr, { rho0, rho1 }, P);
  const agrFinal = coherent(tgaD.status, agrD.status, C);
  const evidence = { ...ev, rho0, rho1, tga: { ...ev.tga, ...tgaD }, agr: { ...ev.agr, ...agrD, refusedByPrior: agrFinal !== agrD.status }, B };
  beings.sort((a, b) => a.at - b.at || a.span[0] - b.span[0]);
  return { beings, timeline, evidence, finalState: state, gaps: [...gaps].map(([reason, count]) => ({ reason, count })), n, params: P };
}

/** the code state in force when the reader had consumed `pos` residues (timeline is causal). */
export function stateAt(timeline, pos) {
  let s = timeline[0];
  for (const t of timeline) { if (t.at <= pos) s = t; else break; }
  return { tga: s.tga, agr: s.agr };
}

// ── translation: the RELATIONS the genetic code orders ───────────────────────────────────────
/**
 * translateSpan(seq, start, end, strand, state, priors) -> [{pos, codon, class, aa, committed, set}] in READING order.
 * (start,end) is the plus-strand half-open span of the codons; a minus-strand span is read from its right end.
 */
export function translateSpan(seq, start, end, strand, state, priors) {
  const C = compilePriors(priors);
  const out = [];
  const L = end - start;
  const nco = Math.floor(L / 3);
  for (let k = 0; k < nco; k++) {
    const p = strand === "-" ? end - 3 - 3 * k : start + 3 * k;
    const a = BASE_CODE[seq.charCodeAt(p)], b = BASE_CODE[seq.charCodeAt(p + 1)], c = BASE_CODE[seq.charCodeAt(p + 2)];
    let idx = -1;
    if ((a | b | c) <= 3) { idx = (a << 4) | (b << 2) | c; if (strand === "-") idx = RC_IDX[idx]; }
    const cx = classifyCodonEx(idx, state, C);
    const r = aaFor(idx, state, C);
    out.push({ pos: p, codon: idx >= 0 ? CODONS[idx] : "NNN", class: cx.cls, provisional: cx.provisional, aa: r.aa, committed: r.committed, set: r.set });
  }
  return out;
}

/**
 * read(text, {priors, params, codons, ...}) -> { beings, relations, code, gaps }.
 * beings   [{id, kind:"orf", span:[start,end], strand, at, ...}]  (single left-to-right pass)
 * relations [{end1, label, end2}]: being --encodes--> protein (committed residues; X where the code
 *          leaves the residue underdetermined), and with {codons:true} each codon --translates_to--> aa.
 */
export function read(text, { priors, params = null, codons = false, record = 0, fixedState = null, noUsage = false, naive = false, stopOverride = null } = {}) {
  const recs = extractRecords(text);
  const gaps = [];
  if (!recs.length) return { beings: [], relations: [], code: null, gaps: [{ reason: "not_genetic", count: 1 }] };
  const rec = recs[record] ?? recs[0];
  const { seq, hadU, hadT } = foldResidues(rec.residues);
  const nucleic = alphabetOfRun(seq.slice(0, 5000)) === "dna" || alphabetOfRun(seq.slice(0, 5000)) === "nucleotide";
  if (!nucleic) return { beings: [], relations: [], code: null, gaps: [{ reason: "not_nucleotide", count: 1 }], rna: hadU && !hadT };
  const scan = scanGenome(seq, { priors, params, fixedState, noUsage, naive, stopOverride });
  const C = compilePriors(priors);
  const relations = [];
  const nomIdx = new Set((scan.params.startNominees ?? []).map((c) => CODON_IDX.get(c)));
  let nUnder = 0;
  for (const b of scan.beings) {
    const st = stateAt(scan.timeline, b.at);
    const tr = translateSpan(seq, b.span[0], b.span[1], b.strand, st, priors);
    b.state = st;
    let prot = "";
    tr.forEach((t, k) => {
      let aa = t.committed ? t.aa : "X";
      if (k === 0 && nomIdx.has(CODON_IDX.get(t.codon))) aa = "M"; // initiator rule
      if (k === tr.length - 1) aa = "*"; // the being ENDED at this codon: it is the stop the reader read, whatever the code state said about it
      if (!t.committed) nUnder++;
      prot += aa;
      if (codons) relations.push({ end1: `${b.id}#${k}`, label: "translates_to", end2: aa === "X" ? null : aa, codon: t.codon, class: t.class, set: t.set });
    });
    relations.push({ end1: b.id, label: "encodes", end2: `protein:${prot.replace(/\*$/, "")}` });
  }
  if (nUnder) gaps.push({ reason: "codon_aa_underdetermined", count: nUnder });
  if (C?.tables) {
    const unattested = Object.keys(C.tables).filter((id) => !C.attested.has(id)).length;
    if (unattested) gaps.push({ reason: "table_not_attested_in_train", count: unattested, detail: "the standard names these tables; the reader never nominates them" });
    const coreSense = Object.values(C.tables).filter((t) => !t.core).length;
    if (coreSense) gaps.push({ reason: "core_stop_sense_tables_unmeasured", count: coreSense, detail: "TAA/TAG are sense in these tables; the reader treats them as stops" });
  }
  gaps.push(...scan.gaps);
  return { beings: scan.beings, relations, code: { timeline: scan.timeline, final: scan.finalState, evidence: scan.evidence }, gaps, rna: hadU && !hadT, n: seq.length };
}

/** inferCode(text) -> the code state after reading the whole of `text` (the instrument slices prefixes). */
export function inferCode(text, opts = {}) {
  const recs = extractRecords(text);
  if (!recs.length) return { state: { tga: "unknown", agr: "unknown" }, gap: "not_genetic" };
  const { seq } = foldResidues(recs[0].residues);
  const s = scanGenome(seq, { ...opts, noUsage: true });
  return { state: s.finalState, evidence: s.evidence, timeline: s.timeline, gap: s.finalState.tga === "unknown" ? "table_undecided" : null };
}

// ── hearing the frame of an unannotated window (R1 codon boundaries) ────────────────────────────
/**
 * hearFrame(window, {priors, usage}) -> { strand, offset, scores, refused, gap }.
 * The six hypotheses are (strand, offset) with offset in 0..2 the plus-direction position of the first
 * codon boundary. Core stops (TAA, TAG) in frame REFUSE a hypothesis; among the rest the GC-binned codon-usage
 * log-odds from the TRAIN prior NOMINATES the best. mode "stopfree" is the ablation (no usage: uniform over survivors).
 */
export function hearFrame(win, { priors, mode = "usage" } = {}) {
  const C = compilePriors(priors);
  const seq = foldResidues(win).seq;
  const n = seq.length;
  let gc = 0, at = 0;
  for (let i = 0; i < n; i++) { const b = BASE_CODE[seq.charCodeAt(i)]; if (b === 1 || b === 3) gc++; else if (b === 0 || b === 2) at++; }
  const rate = gc / Math.max(1, gc + at);
  let bin = 0; if (C?.usage) while (bin < C.usage.edges.length && rate >= C.usage.edges[bin]) bin++;
  const lr = C?.usage?.bins?.[bin]?.lr ?? null;
  const scores = [], refused = [];
  for (const strand of ["+", "-"]) {
    for (let o = 0; o < 3; o++) {
      let s = 0, bad = false, cnt = 0;
      for (let p = o; p + 3 <= n; p += 3) {
        const a = BASE_CODE[seq.charCodeAt(p)], b = BASE_CODE[seq.charCodeAt(p + 1)], c = BASE_CODE[seq.charCodeAt(p + 2)];
        if ((a | b | c) > 3) continue;
        let i = (a << 4) | (b << 2) | c; if (strand === "-") i = RC_IDX[i];
        if (i === IDX.TAA || i === IDX.TAG) { bad = true; break; }
        if (lr) s += lr[i];
        cnt++;
      }
      refused.push(bad); scores.push(bad ? -Infinity : (mode === "usage" && lr ? s : 0));
    }
  }
  const alive = scores.map((s, i) => (refused[i] ? -1 : i)).filter((i) => i >= 0);
  if (!alive.length) return { strand: null, offset: null, scores, refused, gap: "all_frames_refused", alive: 0 };
  let best = alive[0];
  for (const i of alive) if (scores[i] > scores[best]) best = i;
  const tied = alive.filter((i) => scores[i] === scores[best]);
  const strand = best < 3 ? "+" : "-", offset = best % 3;
  return { strand, offset, scores, refused, gap: null, alive: alive.length, tied: tied.length, hypotheses: alive.map((i) => ({ strand: i < 3 ? "+" : "-", offset: i % 3 })) };
}

export const _internals = { BASE_CODE, RC_IDX, IDX, CODON_IDX, DEFAULT_PARAMS, compileNulls, chi2Upper };
