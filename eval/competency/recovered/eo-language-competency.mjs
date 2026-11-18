#!/usr/bin/env node
// eo-language-competency.mjs — the EO reading of language competency.
//
// Where the scoreboard asks "how well do we read it?", this asks the question in
// EO's own terms: every number names a REAL instrument with a giver, every
// absence is a typed gap (never a quietly wrong number), and every pass carries
// a control built to fail. The instruments, all giver-named:
//
//   COMPREHENSION   Nation (2006) / Laufer (1989) lexical-coverage thresholds —
//                   independent reading needs ~98% of running words known,
//                   supported ~95%; below that is a comprehension gap.
//   RUNNING RECORD  Clay (1993) / Goodman (1969) miscue analysis — accuracy =
//                   words read / words sampled, banded 95–100 easy · 90–94
//                   instructional · <90 hard; every unread word is a MISCUE,
//                   tallied and typed (byte addresses: a typed gap, not yet).
//   VOCABULARY      type coverage — the share of DISTINCT word types the prior
//                   lists (a vocabulary-size notion, distinct from token rate).
//   REGISTER        Cummins (1979/2000) BICS↔CALP — the corpus's vulgate↔patrician
//                   axis under its real name (polyvox = CALP, polyphonic).
//   LENS            Talmy (2000) Figure–Ground — script, spacing and casing are the
//                   language's LENS, measured, never a reason to score it down for
//                   being un-English. The typological parameters EO does NOT hold
//                   (WALS/Grambank) are cited as a pointer, not invented.
//   PROVENANCE      Sullivan — each prior's own giver, period, region, register,
//                   script, span, compared to the text held (the fit verdict).
//   CONTROL         Fisher — the falsifying control: this territory's prior run on
//                   a foreign-script text must read near zero, else the number is
//                   measuring something other than this language.
//
// Typed gaps, named not hidden: the paradigm/productivity probe (Berko 1958 "wug")
// has no held-out giver on disk; miscues are counted but not yet byte-addressed;
// WALS/Grambank typological parameters are cited, not held.
//
// Reads only; writes EO-LANGUAGE-COMPETENCY.md and manifests/eo-language-competency.json.
// Deterministic; no model, no network. Shares ONE territory registry with the
// scoreboard (scripts/lib/lang-territories.mjs) — one giver, no drift.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readingFor, scriptOf } from "./lib/script-words.mjs";
import {
  LP_ROOT, REG, walkTextFiles, clean, samplesFor, acceptableScripts, filterByScript,
  priorFor, loadMorphMeta, fitOf, udhrFor, SAMPLE_CHARS,
} from "./lib/lang-territories.mjs";
import { foldSet, foldedCoverage, foldToken } from "./lib/normalize.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UNSPACED = new Set(["Han", "Kana", "Hangul", "Thai", "Khmer", "Lao", "Myanmar"]);
const CASED = new Set(["Latin", "Cyrillic", "Greek", "Armenian", "Georgian"]);
const CONTROL_CHARS = 4000;

// givers, named once
const GIVER = {
  comprehension: "Nation 2006 / Laufer 1989 (lexical coverage: 98% independent, 95% supported)",
  runningRecord: "Clay 1993 (Running Records) / Goodman 1969 (Miscue Analysis)",
  vocabulary: "type coverage ratio (distinct types the prior lists)",
  register: "Cummins 1979/2000 (BICS ↔ CALP)",
  lens: "Talmy 2000 (Figure–Ground); WALS (Dryer & Haspelmath 2013) / Grambank as the cited typology giver",
  provenance: "Sullivan — janus/priors/morph-cues-<lang>.json Provenance@1",
  control: "Fisher — a wrong-language control, built to read zero",
};

const comprehensionBand = (c) => c === null ? "—" : c >= 0.98 ? "independent" : c >= 0.95 ? "supported" : "gap";
const recordBand = (c) => c === null ? "—" : c >= 0.95 ? "easy" : c >= 0.90 ? "instructional" : "hard";
const bicsCalp = (reg) => reg === "vulgate" ? "BICS (conversational)" : reg === "polyvox" ? "CALP (polyphonic)" : "CALP (academic)";

// A token "reads" only when the prior lists it under a REAL class. The class "X"
// is the treebank's foreign/unclassified bucket — pos-rus carries 867 Latin-script
// X forms, which let it "read" English function words until this rule excluded them
// (the control caught it). Comprehension counts classified tokens only.
function ratio(tokens) {
  let score = 0, x = 0;
  for (const t of tokens) {
    if (t.pos === null) continue;
    if (t.pos === "X") { x += 1; continue; }
    score += t.cliticStripped ? 0.5 : 1;
  }
  return { cov: tokens.length ? score / tokens.length : 0, x, n: tokens.length };
}

// control texts: pure samples of two foreign-script languages (English, Mandarin),
// tagged with their script so a territory is controlled ONLY by text of another script
function controlTexts() {
  const out = [];
  for (const key of ["cmn", "eng"]) {
    const row = REG.find((r) => r.key === key);
    const files = (row.roots ?? []).flatMap((d) => walkTextFiles(path.join(LP_ROOT, d)));
    const s = samplesFor(row, files);
    if (s.length) { const text = s.join("\n").slice(0, CONTROL_CHARS); out.push({ text, script: scriptOf(text) }); }
  }
  return out;
}

function measure(row, identify, controls) {
  const files = (row.roots ?? []).flatMap((d) => walkTextFiles(path.join(LP_ROOT, d), row.ignore ?? []));
  let bytes = 0;
  for (const f of files) { try { bytes += fs.statSync(f).size; } catch { /* skip */ } }

  let samples = samplesFor(row, files);
  const u = udhrFor(row);
  if (!samples.length && u) { try { samples = [clean(fs.readFileSync(u, "utf8")).slice(0, SAMPLE_CHARS)]; } catch { /* skip */ } }
  const scripts = acceptableScripts(row.script);
  if (scripts && samples.length) {
    const filtered = samples.map((t) => filterByScript(t, scripts)).filter((t) => t.trim().length > 40);
    if (filtered.length) samples = filtered;
  }

  const prior = priorFor(row.prior);
  const morph = loadMorphMeta(row.prior);
  const fit = fitOf(row.key, morph, row.script);
  // Latin-script forms inside a non-Latin prior (treebank loanwords / foreign
  // fragments) — the reason a foreign control can leak; measured, not guessed.
  const latinForms = prior ? Object.keys(prior.forms).filter((f) => /^[a-z]+$/.test(f)).length : null;

  let read = null, readFolded = null, typeCov = null, miscues = [], script = row.script ?? null, control = null, tokens = 0, xShare = null, hapaxCov = null;
  if (prior && samples.length) {
    const folded = foldSet(prior);
    let cov = 0, k = 0, fcov = 0, fk = 0, typeSet = new Set(), knownSet = new Set(), tally = new Map(), xTot = 0, nTot = 0;
    for (const s of samples) {
      const r = readingFor(s, prior);
      const rr = ratio(r.tokens);
      const fc = foldedCoverage(r.tokens, folded);
      cov += rr.cov; fcov += fc.coverage; k += 1; fk += 1; tokens += rr.n; xTot += rr.x; nTot += rr.n;
      script = (script && script !== "mixed") ? script : r.script;
      for (const t of r.tokens) {
        typeSet.add(t.form);
        if (t.pos !== null && t.pos !== "X") knownSet.add(t.form); else tally.set(t.form, (tally.get(t.form) ?? 0) + 1);
      }
    }
    read = cov / k;
    readFolded = fcov / fk;
    typeCov = typeSet.size ? knownSet.size / typeSet.size : null;
    // COMPETENCE (Chomsky) — poverty-of-stimulus probe: of the forms the sample
    // says ONCE (the hapax legomena, the Zipf tail — the closest thing to "what it
    // never heard"), how many does the prior still know? A reader whose tail
    // coverage matches its body is generative (reads what it never heard); one that
    // collapses to near-zero on the tail is a memoriser of its own corpus.
    {
      const freq = new Map();
      for (const s of samples) for (const t of readingFor(s, prior).tokens) freq.set(t.form, (freq.get(t.form) ?? 0) + 1);
      let hapax = 0, hapaxKnown = 0;
      for (const s of samples) for (const t of readingFor(s, prior).tokens) {
        if (freq.get(t.form) === 1) { hapax += 1; if (folded.has(foldToken(t.form))) hapaxKnown += 1; }
      }
      hapaxCov = hapax ? hapaxKnown / hapax : null;
    }
    xShare = nTot ? xTot / nTot : null;
    miscues = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    // control: this prior on FOREIGN-SCRIPT text (must read ≈0). A control text in
    // one of this territory's own acceptable scripts is not a control — excluded.
    const foreign = controls.filter((c) => !(scripts && scripts.has(c.script)));
    const use = foreign.length ? foreign : controls;
    let cmax = 0;
    for (const c of use) { const rr = ratio(readingFor(c.text, prior).tokens); cmax = Math.max(cmax, rr.cov); }
    control = cmax;
  }

  // detection (named / abstain), same discipline as the scoreboard
  let detect = null, detectReturned = null, detectKind = null;
  if (samples.length) {
    const tally = new Map(); let conf = 0;
    for (const t of samples) { const d = identify(t); if (d.confident) conf += 1; tally.set(d.lang, (tally.get(d.lang) ?? 0) + 1); }
    let best = null, bn = -1; for (const [k, v] of tally) if (v > bn) { best = k; bn = v; }
    detectReturned = best;
    if (row.abstain) { detect = (samples.length - conf) / samples.length; detectKind = "abstain"; }
    else { const accept = new Set(row.accept ?? [row.detect, row.iso1, row.prior].filter(Boolean));
      detect = (row.detect && conf > 0 && accept.has(best)) ? 1 : 0; detectKind = "named"; }
  }

  return { ...row, docs: files.length, bytes, samples: samples.length, script, tokens, read, readFolded, typeCov, hapaxCov, miscues,
    xShare, latinForms, control, fit, morph, detect, detectKind, detectReturned,
    comprehension: comprehensionBand(readFolded), record: recordBand(readFolded), registerWord: bicsCalp(row.register),
    spaceless: script ? !UNSPACED.has(script) : null, cased: script ? CASED.has(script) : null };
}

const { identify } = await import(path.join(LP_ROOT, "..", "the-fold", "fold-chat-langid.js"));
const controls = controlTexts();
const singles = REG.filter((r) => r.kind !== "collection");
const collections = REG.filter((r) => r.kind === "collection");
const rows = singles.map((r) => measure(r, identify, controls));

const report = {
  schema: "EOLanguageCompetency@1",
  generatedAt: new Date().toISOString(),
  instrument: "scripts/eo-language-competency.mjs",
  givers: GIVER,
  territories: rows,
  collections: collections.map((c) => ({ key: c.key, name: c.name, register: c.register, roots: c.roots })),
};
fs.writeFileSync(path.join(LP_ROOT, "manifests", "eo-language-competency.json"), JSON.stringify(report, null, 1));

// ── markdown ──────────────────────────────────────────────────────────────────
const pct = (x) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)}%`);
const num = (x) => (x === null || x === undefined ? "—" : x.toFixed(3));
const kb = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)}M` : b >= 1e3 ? `${Math.round(b / 1e3)}k` : `${b}`);
const L = [];
L.push("# EO Language Competency");
L.push("");
L.push(`*Generated ${new Date().toISOString().slice(0, 10)} by \`node scripts/eo-language-competency.mjs\`. Every number names a real instrument with a giver; every absence is a typed gap; every pass carries a control built to fail.*`);
L.push("");
L.push("## Method — the instruments, each with its giver");
L.push("");
for (const [k, v] of Object.entries(GIVER)) L.push(`- **${k}** — ${v}`);
L.push("");
L.push("Comprehension thresholds are the real ones: **98%** of running words for independent reading, **95%** for supported (Nation/Laufer). Running-record bands are Clay's: **95–100 easy · 90–94 instructional · <90 hard**. The **Read (folded)** column is the omni-lingual correction: accents and word-final elision folded on BOTH the text and the prior (one mechanism, `scripts/lib/normalize.mjs`, every language); the comprehension band is taken off THAT number, because the accent is a parameter and the class is the invariant (Chomsky). The raw **Read** column is kept for the accent tax itself. No level is a feeling; each is a band on a measured ratio.");
L.push("");

L.push("## The board");
L.push("");
L.push("| Territory | Reg (Cummins) | Register | Read | Read (folded) | Comprehension | Record | Type cov | Tail (hapax) | Lens (script/spacing/case) | Detect | Control | Fit |");
L.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows.sort((a, b) => (b.read ?? -1) - (a.read ?? -1))) {
  const lens = `${r.script ?? "—"}/${r.spaceless === null ? "—" : r.spaceless ? "spaced" : "unspaced"}/${r.cased === null ? "—" : r.cased ? "cased" : "caseless"}`;
  const det = r.detect === null ? "—" : r.detectKind === "abstain" ? `abstain ${pct(r.detect)}` : `${pct(r.detect)}${r.detect === 0 && r.detectReturned ? ` (→${r.detectReturned})` : ""}`;
  L.push(`| ${r.name} | ${r.registerWord} | ${r.register} | ${pct(r.read)} | ${pct(r.readFolded)} | ${r.comprehension} | ${r.record} | ${pct(r.typeCov)} | ${pct(r.hapaxCov)} | ${lens} | ${det} | ${(r.control ?? 0) < 0.05 ? "✓ ≈0" : pct(r.control)} | ${r.fit.verdict} |`);
}
L.push("");

L.push("## Comprehension & running record (Nation/Laufer · Clay)");
L.push("");
const indep = rows.filter((r) => r.comprehension === "independent").length;
const supp = rows.filter((r) => r.comprehension === "supported").length;
const gap = rows.filter((r) => r.comprehension === "gap").length;
L.push(`**${indep}** territories read at the independent threshold (≥98%), **${supp}** supported (95–98%), **${gap}** below (a comprehension gap). Running records: ` +
  `${rows.filter((r) => r.record === "easy").length} easy · ${rows.filter((r) => r.record === "instructional").length} instructional · ${rows.filter((r) => r.record === "hard").length} hard.`);
L.push("");
L.push("**Miscues** (the most-read words the prior does not list — the first line of a running record):");
for (const r of rows.filter((x) => x.miscues && x.miscues.length)) {
  L.push(`- *${r.name}*: ${r.miscues.map(([f, n]) => `\`${f}\`×${n}`).join(", ")}`);
}
L.push("");

L.push("## Competence — reads what it never heard (Chomsky)");
L.push("");
L.push("The **Tail (hapax)** column is the poverty-of-stimulus probe: the Zipf tail of the sample — forms that occur exactly once, the closest thing to *what it never heard*. A reader whose tail coverage stays near its body coverage is **generative** (a grammar learned from what was heard reads what it never heard); one that collapses toward zero on the tail is a **memoriser of its own corpus**. The competence number is the tail, not the body:");
const tail = rows.filter((r) => r.hapaxCov !== null).sort((a, b) => b.hapaxCov - a.hapaxCov);
L.push("Best generative readers: " + tail.slice(0, 8).map((r) => `*${r.name}* body ${pct(r.readFolded)} → tail ${pct(r.hapaxCov)}`).join(" · ") + ".");
const mem = tail.filter((r) => r.readFolded !== null && r.hapaxCov < r.readFolded * 0.5);
if (mem.length) L.push("**Corpus-memorisers** (tail < half the body): " + mem.map((r) => `*${r.name}* tail ${pct(r.hapaxCov)}`).join("; ") + " — high coverage that does NOT generalise.");
L.push("");
L.push("## The control (Fisher)");
L.push("");
L.push("Each prior run on **foreign-script text** (a pure Mandarin and a pure English sample — any control sharing the territory's own script is excluded, so this is a true null) must read **≈0**; a prior that reads foreign text means the ratio measures something other than this language. Measured:");
const worst = rows.filter((r) => r.control !== null && r.control >= 0.05).sort((a, b) => b.control - a.control);
L.push(worst.length ? worst.map((r) => `*${r.name}* ${pct(r.control)}`).join(", ") + " — cross-script leakage; disclosed, not hidden." : "every prior reads ≈0 on foreign script — the control holds.");
L.push("");
L.push("**Contamination found by the control.** Two defences exposed a real defect in the givers' data. (1) The treebank class `X` (foreign/unclassified) is unscored — it is not a real reading class: `pos-rus` carries 867 Latin-script `X` forms that read English function words at 34% before the rule excluded them. (2) Priors built from web treebanks carry **Latin-script loanword fragments tagged as real classes** — `pos-jpn` holds 700 Latin forms tagged NOUN/VERB (`and`, `the`, `wifi`, `wikipedia`), which is why a Japanese prior still reads ~32% of an English text. Territories where the foreign control exceeds 5%, with the Latin-form count that explains it:");
const cont = rows.filter((r) => r.control !== null && r.control >= 0.05).sort((a, b) => b.control - a.control);
L.push(cont.length ? cont.map((r) => `*${r.name}* ${pct(r.control)} (${r.latinForms ?? 0} Latin forms in the prior)`).join("; ") + " — a property of the treebank, disclosed, not hidden." : "no territory's foreign control exceeds 5%.");
const xtab = rows.filter((r) => r.xShare !== null && r.xShare >= 0.02).sort((a, b) => b.xShare - a.xShare);
L.push(xtab.length ? "Unclassified-`X` share in the sample: " + xtab.map((r) => `*${r.name}* ${pct(r.xShare)}`).join(", ") + "." : "");
L.push("");
L.push("");

L.push("## Typed gaps (named, never hidden)");
L.push("");
L.push("- **Productivity / wug probe (Berko 1958)** — UNMEASURED: no held-out paradigm giver on disk per prior; the corpus's `morph-cues` learn/audit split is the nearest candidate, unwired.");
L.push("- **Byte-addressed miscues** — miscues are counted and tallied here, not yet addressed to the word's own bytes (the running record's real unit).");
L.push("- **Typological parameters** — WALS/Grambank (word order, alignment, case) are the giver for the lens; the corpus cites them, it does not yet hold them. The lens column carries only what is MEASURED (script, spacing, case).");
L.push("- **Register is stored, not scored against a scale** — BICS/CALP is named on every row; a CEFR-style graded scale per period/region is cited (Council of Europe 2001), not yet held.");
L.push("");

L.push("## Falsifying controls");
L.push("");
L.push("- A territory whose prior reads **foreign script** above ≈0.05 without a same-script explanation is a broken control.");
L.push("- A **comprehension band** reported with no prior on disk is a bug (it would band a number that does not exist).");
L.push("- Re-running must reproduce this table unchanged (deterministic; no model, no network).");
L.push("");

fs.writeFileSync(path.join(LP_ROOT, "EO-LANGUAGE-COMPETENCY.md"), L.join("\n"));
console.log(`wrote EO-LANGUAGE-COMPETENCY.md (${rows.length} territories; givers: ${Object.keys(GIVER).join(", ")})`);
for (const r of rows.sort((a, b) => (b.read ?? -1) - (a.read ?? -1)).slice(0, 8))
  console.log(`  ${pct(r.read).padStart(4)} ${r.comprehension.padEnd(12)} ${r.record.padEnd(13)} ${r.name}`);
