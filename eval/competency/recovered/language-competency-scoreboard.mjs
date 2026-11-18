#!/usr/bin/env node
// language-competency-scoreboard.mjs — the corpus's standing measure of how well
// the fold can actually READ, PLACE and HOLD each language it keeps.
//
// Three defining axes on every territory (the user's compass, 2026-10-10):
//   GEOGRAPHY  — where the language is/was written
//   PERIOD     — when (a period, never "just Greek": classical vs Koine; wenyan vs
//                baihua; biblical vs Modern Hebrew; Qur'anic vs later Arabic)
//   REGISTER   — the cultural stratum, a spectrum the corpus itself is split along:
//                VULGATE   the common tongue (chat, oral history, children, creoles)
//                PATRICIAN the cultivated tongue (canon, liturgy, law, scholarship)
//                POLYVOX   the many-voiced tongue (one text in N languages; a
//                          parallel canon; a polyglot archive)
//
// Per territory it measures three competencies, each from a real instrument:
//   HOLD    docs + bytes held (fs walk of the territory's declared roots)
//   READ    token coverage of the territory's OWN prior (janus/priors/pos-<code>.json)
//           against a held sample, via the SAME organ the pipeline uses
//           (scripts/lib/script-words.mjs). No prior ⇒ null (a typed gap, not a guess).
//   DETECT  the fold's language detector (the-fold/fold-chat-langid.js::identify):
//             · NAMED rows    — is the period-correct code returned? (period-defined
//                               rows accept ONLY their own period code, so a classical
//                               Greek read as Modern Greek scores 0 — that collapse
//                               is the whole point of the period axis)
//             · ABSTAIN rows  — a language the reader has no prior for must come back
//                               `unknown`; the score is the abstention rate (honesty,
//                               not naming). A confident wrong name is a 0.
//             · COLLECTION rows — a many-voiced corpus has no single target; the score
//                               is the ROUTING rate (share of voices named confidently).
//   Composite (NAMED rows only) = 0.40·read + 0.35·detect + 0.25·min(1, bytes/2 MB).
//
// Reads only; writes LANGUAGE-COMPETENCY.md and manifests/language-competency.json.
// Deterministic; no model, no network. Falsifying control: a territory whose named prior
// file is missing must read null; an ABSTAIN row must never score on a confident name.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readingFor, scriptOf } from "./lib/script-words.mjs";

import {
  LP_ROOT, HOLD_TARGET, SAMPLE_CHARS, WEIGHTS, REGISTER_ORDER, REG,
  walkTextFiles, clean, samplesFor, acceptableScripts, filterByScript,
  priorFor, loadMorphMeta, fitOf, udhrFor,
} from "./lib/lang-territories.mjs";

// ── measure one territory ─────────────────────────────────────────────────────
async function measure(row, identify) {
  const rootsAbs = (row.roots ?? []).map((r) => path.join(LP_ROOT, r));
  const files = rootsAbs.flatMap((d) => walkTextFiles(d, row.ignore ?? []));
  let bytes = 0;
  for (const f of files) { try { bytes += fs.statSync(f).size; } catch { /* skip */ } }

  let samples = samplesFor(row, files);
  const u = udhrFor(row);
  let sampleSource = "held";
  if (!samples.length && u) { try { samples = [clean(fs.readFileSync(u, "utf8")).slice(0, SAMPLE_CHARS)]; sampleSource = "UDHR"; } catch { /* skip */ } }
  // read the territory in its OWN script (drops a bilingual gloss or transliteration)
  const scripts = acceptableScripts(row.script);
  if (scripts && samples.length) {
    const filtered = samples.map((t) => filterByScript(t, scripts)).filter((t) => t.trim().length > 40);
    if (filtered.length) samples = filtered;
  }

  // READ — token coverage of the territory's own prior on the sample
  const prior = priorFor(row.prior);
  let read = null, readGiver = null, script = row.script ?? null, readTokens = 0, readMatched = 0;
  if (prior && samples.length) {
    let cov = 0, hit = 0, tot = 0, k = 0;
    for (const s of samples) {
      const r = readingFor(s, prior);
      cov += r.coverage; hit += r.matched; tot += r.total; k += 1;
      if (!script || script === "mixed") script = r.script;
    }
    read = cov / k; readGiver = prior.provenance?.giver ?? "POSPrior@1";
    readTokens = tot; readMatched = Math.round(hit);
  }

  // DETECT
  let detect = null, detectReturned = null, detectN = 0, detectConfident = 0, detectKind = null;
  if (samples.length) {
    const tally = new Map(); let conf = 0;
    for (const t of samples) { const d = identify(t); detectN += 1; if (d.confident) conf += 1; tally.set(d.lang, (tally.get(d.lang) ?? 0) + 1); }
    detectConfident = conf;
    let best = null, bn = -1;
    for (const [k, v] of tally) if (v > bn) { best = k; bn = v; }
    detectReturned = best;
    if (row.kind === "collection") { detect = detectN ? conf / detectN : null; detectKind = "route"; detectReturned = `${tally.size} lang${tally.size === 1 ? "" : "s"}`; }
    else if (row.abstain) { detect = detectN ? (detectN - conf) / detectN : null; detectKind = "abstain"; }
    else {
      const accept = new Set(row.accept ?? [row.detect, row.iso1, row.prior].filter(Boolean));
      detect = (row.detect && conf > 0 && accept.has(best)) ? 1 : 0;
      detectKind = "named";
    }
  }

  const hold = Math.min(1, bytes / HOLD_TARGET);
  let composite = null;
  if (row.kind !== "collection" && !row.abstain) {
    const axes = [read, detect, hold].filter((x) => x !== null);
    if (axes.length >= 2) {
      const w = (read !== null ? WEIGHTS.read : 0) + (detect !== null ? WEIGHTS.detect : 0) + WEIGHTS.hold;
      composite = ((read ?? 0) * WEIGHTS.read + (detect ?? 0) * WEIGHTS.detect + hold * WEIGHTS.hold) / w;
    }
  }

  const morph = loadMorphMeta(row.prior);
  const fit = fitOf(row.key, morph, row.script);

  return { ...row, docs: files.length, bytes, script, sampleSource,
    read: read === null ? null : Math.round(read * 1000) / 1000,
    readPct: read === null ? null : Math.round(read * 100),
    readGiver, readTokens, readMatched,
    priorGiver: prior?.provenance?.giver ?? null, priorMorph: morph, fit,
    detect: detect === null ? null : Math.round(detect * 1000) / 1000, detectKind, detectReturned, detectN, detectConfident,
    hold: Math.round(hold * 1000) / 1000,
    composite: composite === null ? null : Math.round(composite * 1000) / 1000, axesPresent: [read, detect, hold].filter((x) => x !== null).length };
}

// ── run ───────────────────────────────────────────────────────────────────────
const { identify } = await import(path.join(LP_ROOT, "..", "the-fold", "fold-chat-langid.js"));

const rows = [];
for (const row of REG) rows.push(await measure(row, identify));

const named = (r) => r.kind !== "collection" && r.detectKind === "named";
rows.sort((a, b) =>
  (b.composite ?? -1) - (a.composite ?? -1) ||
  (REGISTER_ORDER[a.register] - REGISTER_ORDER[b.register]) ||
  a.name.localeCompare(b.name));

const byRegister = {}, byEra = {};
const bump = (bag, key, r) => {
  bag[key] ??= { n: 0, readSum: 0, readN: 0, detSum: 0, detN: 0, bytes: 0, docs: 0, abstainSum: 0, abstainN: 0, routeSum: 0, routeN: 0 };
  const b = bag[key]; b.n += 1; b.bytes += r.bytes; b.docs += r.docs;
  if (r.read !== null) { b.readSum += r.read; b.readN += 1; }
  if (named(r)) { b.detSum += r.detect; b.detN += 1; }
  if (r.detectKind === "abstain" && r.detect !== null) { b.abstainSum += r.detect; b.abstainN += 1; }
  if (r.detectKind === "route" && r.detect !== null) { b.routeSum += r.detect; b.routeN += 1; }
};
for (const r of rows) { bump(byRegister, r.register, r); bump(byEra, r.era, r); }

const report = {
  schema: "LanguageCompetencyScoreboard@1",
  generatedAt: new Date().toISOString(),
  method: { instrument: "scripts/language-competency-scoreboard.mjs", reader: "scripts/lib/script-words.mjs",
    detector: "the-fold/fold-chat-langid.js::identify", priorsHome: "janus/priors",
    axes: ["read (prior token coverage)", "detect (named / abstain / route)", "hold (corpus bytes)"],
    weights: WEIGHTS, holdTargetBytes: HOLD_TARGET },
  territories: rows,
  aggregates: { byRegister, byEra },
};
fs.writeFileSync(path.join(LP_ROOT, "manifests", "language-competency.json"), JSON.stringify(report, null, 1));

// ── the markdown register ─────────────────────────────────────────────────────
const pct = (x) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)}%`);
const num = (x) => (x === null || x === undefined ? "—" : x.toFixed(3));
const kb = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)}M` : b >= 1e3 ? `${Math.round(b / 1e3)}k` : `${b}`);
const detCell = (r) => r.detect === null ? "—"
  : r.detectKind === "abstain" ? `abstain ${pct(r.detect)}`
  : r.detectKind === "route" ? `route ${pct(r.detect)}`
  : `${pct(r.detect)}${r.detect === 0 && r.detectReturned ? ` (→${r.detectReturned})` : ""}`;
const detCellFull = (r) => r.detect === null ? "—"
  : r.detectKind === "abstain" ? `abstain ${pct(r.detect)}${r.detect < 1 ? ` (leaks →${r.detectReturned ?? "—"})` : ""}`
  : r.detectKind === "route" ? `route ${pct(r.detect)} (${r.detectReturned ?? "—"})`
  : `${pct(r.detect)}${r.detect === 0 && r.detectReturned ? ` (→${r.detectReturned})` : ""}`;
const REG_HEAD = { vulgate: "VULGATE — the common tongue", patrician: "PATRICIAN — the cultivated tongue", polyvox: "POLYVOX — the many-voiced tongue" };

function table(rs, full = false) {
  const head = "| Territory | Period | Geography | Script | Reg | Docs | Held | Read | Detect | Composite |\n|---|---|---|---|---|---|---|---|---|---|";
  const lines = rs.map((r) =>
    `| ${r.name} | ${r.period} | ${r.geography} | ${r.script ?? "—"} | ${r.register} | ${r.docs} | ${kb(r.bytes)} | ` +
    `${r.readPct === null ? "—" : r.readPct + "%"} | ${(full ? detCellFull : detCell)(r)} | ${num(r.composite)} |`);
  return [head, ...lines].join("\n");
}

const L = [];
L.push("# Language Competency — the scoreboard");
L.push("");
L.push(`*Generated ${new Date().toISOString().slice(0, 10)} by \`node scripts/language-competency-scoreboard.mjs\`. Measured, never asserted; re-run to reproduce.*`);
L.push("");
L.push("Every territory is defined on three axes — **geography**, **period**, **cultural register** —");
L.push("because \"Greek\" is not one language here: classical and Koine split on period *and* register;");
L.push("wenyan and baihua are two Chinese tongues; biblical and Modern Hebrew differ in date;");
L.push("and the corpus itself is stratified **vulgate** (the common tongue) ↔ **patrician** (the");
L.push("cultivated tongue) ↔ **polyvox** (the many-voiced tongue).");
L.push("");
L.push("## Method");
L.push("");
L.push("- **HOLD** — documents and bytes kept in this territory (fs walk of its declared roots).");
L.push("- **READ** — token coverage of the territory's *own* prior (`janus/priors/pos-<code>.json`) on a held");
L.push("  sample, via the same organ the pipeline reads with (`scripts/lib/script-words.mjs`). No prior ⇒ *—* (a typed gap).");
L.push("- **DETECT** — `the-fold/fold-chat-langid.js::identify()`, scored by territory kind:");
L.push("  - **named** rows: is the *period-correct* code returned? Period-defined rows (classical Greek, wenyan,");
L.push("    biblical Hebrew…) accept only their own period code, so a classical Greek read as Modern Greek scores **0** —");
L.push("    the collapse is the point of the period axis.");
L.push("  - **abstain** rows (no prior): a language the reader cannot place must come back `unknown`; the score is the");
L.push("    abstention rate. A confident wrong name is a 0 — the no-prior failure the UDHR falsification found.");
L.push("  - **route** rows (collections): a many-voiced corpus has no single target; the score is the share of voices");
L.push("    named confidently (can we route each voice at all?).");
L.push("- **Composite** (single-language rows only) — `0.40·read + 0.35·detect + 0.25·min(1, bytes/2 MB)`; null axes dropped; ≥2 required.");
L.push("");
L.push("Three lenses read the result (the language handles of this house): **Chomsky** — separate the universal reader from the per-variety parameter, and never report an in-distribution number as if it were general; **Sullivan** — read each prior's OWN stored provenance (giver, period, region, register, script) and compare it to the text held; **Talmy** — word order and script are a lens, never the claim, so a language is never scored down for being un-English.");
L.push("");
L.push("The falsifying control: a territory whose named prior file is missing must read *—*; an **abstain** row must never");
L.push("score on a confident name; re-running must reproduce the table byte-for-byte (deterministic, no model, no network).");
L.push("");

L.push("## Scores");
L.push("");
L.push(table(rows, true));
L.push("");

for (const reg of ["vulgate", "patrician", "polyvox"]) {
  const g = rows.filter((r) => r.register === reg);
  if (!g.length) continue;
  const a = byRegister[reg];
  L.push(`## ${REG_HEAD[reg]}`);
  L.push("");
  L.push(`*${g.length} territories · mean read ${a.readN ? pct(a.readSum / a.readN) : "—"} · mean detect(named) ${a.detN ? pct(a.detSum / a.detN) : "—"}` +
    `${a.abstainN ? ` · mean abstain ${pct(a.abstainSum / a.abstainN)}` : ""}${a.routeN ? ` · mean route ${pct(a.routeSum / a.routeN)}` : ""} · held ${kb(a.bytes)} across ${a.docs} docs.*`);
  L.push("");
  L.push(table(g));
  L.push("");
}

L.push("## By period");
L.push("");
L.push("| Era | Territories | Mean read | Mean detect (named) | Held |");
L.push("|---|---|---|---|---|");
for (const era of ["ancient", "modern", "construct"]) {
  const a = byEra[era]; if (!a) continue;
  L.push(`| ${era} | ${a.n} | ${a.readN ? pct(a.readSum / a.readN) : "—"} | ${a.detN ? pct(a.detSum / a.detN) : "—"} | ${kb(a.bytes)} |`);
}
L.push("");

L.push("## Prior provenance & fit — Sullivan's layer");
L.push("");
L.push("Each prior declares its own variety. `morph-cues-<lang>.json` carries a `Provenance@1` naming the giver, `language.stage`, span, register and script; the bare `pos-<lang>.json` names only its treebank. Fit compares the variety the prior WAS BUILT FROM to the territory the corpus actually holds — an ill-set parameter is a misread, not a hard language (Chomsky).");
L.push("");
L.push("| Territory | Held period | Prior stage (the prior's own words) | Span | Prior register | Fit |");
L.push("|---|---|---|---|---|---|");
for (const r of rows.filter((x) => x.priorMorph && x.fit && x.fit.verdict !== "n/a")) {
  const m = r.priorMorph;
  L.push(`| ${r.name} | ${r.period} | ${m.stage ?? "—"} | ${m.span ? `${m.span[0]}..${m.span[1]}` : "—"} | ${(m.register ?? "—").slice(0, 44)} | ${r.fit.verdict}${r.fit.verdict === "outside" || r.fit.verdict === "partial" ? " ⚠" : ""} |`);
}
L.push("");

L.push("## Chomsky — universal reader vs the parameter set");
L.push("");
L.push("Two registers of the same number. The **universal** reader is the script/arrangement machinery (does the text get heard at all); the **parameter** is the per-variety lexicon (`pos-<code>.json`). A low READ on a `fit` territory is a parameter problem (wrong variety selected); a low READ on a non-overlapping territory is a vocabulary the prior never had. And the whole board is read **in-distribution** — the detector is scored on the same language it was tuned on. The out-of-distribution control is the corpus's own UDHR falsification: against the 465 languages with *no* prior, `identify()` was confidently wrong 309 times. Confidence is calibrated only on prior-bearing ground. A grammar learned from what was heard reads what it never heard — so the board's claim is bounded to what it heard.");
L.push("");
L.push("**Wrong-parameter cases (a better variety exists or is named):**");
L.push("- *Sanskrit* — the reader in use, `pos-san`, is **Vedic** (`UD_Sanskrit-Vedic`, span −1500..−500); the held corpus is **classical**. A Classical-Sanskrit morphology prior sits unused on disk (`morph-cues-sa-ufal`, Pañcatantra, −200..300). The reader is set to the wrong parameter.");
L.push("- *Ancient Greek* — the only prior is `pos-grc` = the PROIEL treebank, **Ionic prose + Koine NT** (−450..100); the held corpus is **Homeric epic and Attic tragedy** (8th–4th c. BCE). The early end of the corpus is outside the prior's own declared span.");
L.push("- *Qur'anic Arabic* — the only prior is `pos-arb` = **Modern Standard Arabic newswire, 2001–2004**; the territory is the 7th-century Qur'an. A 1,400-year register gap.");
L.push("");
L.push("## Talmy — the lens, never the claim");
L.push("");
L.push("The prior's `region` and `register` are the LENS a language frames its claims through; the evaluator scores whether the reader holds the language's own framing, never whether it reads English-shaped. No territory is penalised for lacking capitalisation, SVO order, or Latin script — `script` and `register` ride every prior so the lens is declared, not assumed. A reading that only works when the text is English-shaped is a defect in the reader, not a low score for the language.");
L.push("");

L.push("## What the scoreboard says, honestly");
L.push("");
const noRead = rows.filter((r) => r.kind !== "collection" && r.read === null && (r.docs > 0 || r.sampleSource === "UDHR"));
if (noRead.length) L.push(`- **${noRead.length} territories have no reading prior** — the reader cannot tokenise them at all ` +
  `(a typed gap, not a guess): ` + noRead.map((r) => r.name).join(", ") + ".");
const collapse = rows.filter((r) => named(r) && r.detect === 0 && r.detectReturned);
if (collapse.length) L.push(`- **${collapse.length} territories are mis-identified** — the detector collapses them onto a neighbour of the wrong period or register: ` +
  collapse.map((r) => `*${r.name}* → \`${r.detectReturned}\``).join(", ") + ".");
const unfit = rows.filter((r) => r.fit && (r.fit.verdict === "outside" || r.fit.verdict === "partial"));
if (unfit.length) L.push(`- **${unfit.length} territories are read by a variety that does not overlap the text held** — an ill-set parameter, measured from the prior's own declared span: ` +
  unfit.map((r) => `*${r.name}* (prior: ${(r.priorMorph?.stage ?? "?").slice(0, 46)}…)`).join("; ") + ".");
const honest = rows.filter((r) => r.detectKind === "abstain" && r.detect !== null);
if (honest.length) L.push(`- **Abstention** (a no-prior language honestly left \`unknown\`): ` +
  honest.map((r) => `*${r.name}* ${pct(r.detect)}${r.detect < 1 ? ` (leaks →\`${r.detectReturned}\`)` : ""}`).join(", ") + ".");
L.push("");
L.push("## Falsifying controls");
L.push("");
L.push("- A held territory reporting READ with no `pos-<code>.json` on disk is a bug in this instrument.");
L.push("- An ABSTAIN row scoring on a confident name is a bug (it would count a lie as competence).");
L.push("- Re-running this driver must reproduce the table unchanged.");
L.push("");

fs.writeFileSync(path.join(LP_ROOT, "LANGUAGE-COMPETENCY.md"), L.join("\n"));

console.log(`wrote LANGUAGE-COMPETENCY.md and manifests/language-competency.json (${rows.length} territories)`);
for (const r of rows.slice(0, 15))
  console.log(`  ${num(r.composite).padStart(5)} ${r.register.padEnd(10)} ${r.name.padEnd(45)} read=${(r.readPct ?? "—")} detect=${detCell(r)}`);
