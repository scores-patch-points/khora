#!/usr/bin/env node
// cli/cennini-exam.mjs — THE JOURNEYMAN'S PIECE: the exam for the coding end state (2026-10-13).
//
// The end state is canon (FOLD-CONSTITUTION.md VI.6, amendment A2; recorded whole in CENNINI.md): a system of
// mechanical processing and a small local model that gives Claude Code-level coding assistance on this engine's
// own work. VI.1 says an amendment is a changed FAILING test, so this exam is red until the end state is reached,
// and it says exactly which clause and which facet is not.
//
//   node cli/cennini-exam.mjs [--end-state FILE] [--evidence FILE.jsonl] [--json]     exit 0 iff REACHED
//
// WHAT IT READS. The end state (cli/cennini-end-state.json: six clauses, each facet naming its instrument, its
// test kind and its KNOWN-BAD control) and an append-only evidence ledger (cli/cennini-evidence.jsonl: one row per
// measurement, aggregate numbers only, its source named). It runs no instrument itself and calls no model; the
// instruments write rows, the exam judges them.
//
// THE RULE, built to fail (II.10: has this check ever rejected anything?):
//   · a facet PASSES only on its LATEST row, and only if that row's known-bad control arm was REJECTED at the same
//     n. A grade the known-bad arm also passes is vacuous and never passes (`controlRejected: false`).
//   · beats-null: p <= alpha and the value beats the null in the declared direction.
//     not-worse:  the one-sided p that the pair is WORSE than the reference is > alpha, AND the control rejected.
//   · a row for a facet whose instrument does not exist is IGNORED and the facet is `gap: unwired` (VI.3:
//     unwired is failing, never early).
//   · alpha is declared once (the lineage's own 0.05), never fitted; no clause carries a threshold.
//
// VERDICTS (facet): met | failing (a row exists and does not pass) | gap (no evidence, or unwired).
//         (clause): met (all facets met) | partial (some met) | failing | gap (no facet has evidence).
// REACHED iff every clause is met.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
export const END_STATE_FILE = path.join(HERE, "cennini-end-state.json");
export const EVIDENCE_FILE = path.join(HERE, "cennini-evidence.jsonl");

export function loadEndState(file = END_STATE_FILE) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// The default ledger may not exist yet (no evidence is a gap, not an error). A ledger the caller NAMED must
// exist: a mistyped path must never read as an honest "no evidence".
export function loadEvidence(file = EVIDENCE_FILE, { required = false } = {}) {
  if (!fs.existsSync(file)) {
    if (required) throw new Error(`evidence ledger not found: ${file}`);
    return [];
  }
  return fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}

const finite = (x) => typeof x === "number" && Number.isFinite(x);

/** Does one evidence row pass its facet? Returns { pass, why }. Pure. */
export function rowPasses(row, facet, alpha) {
  if (!row) return { pass: false, why: "no evidence" };
  if (row.controlRejected !== true) return { pass: false, why: "the known-bad control was not rejected: the grade is vacuous" };
  if (!Number.isInteger(row.n) || row.n < 1) return { pass: false, why: "n is not a positive integer" };
  if (facet.kind === "holds-on-trace") {
    // a property of how a run behaves, judged on recorded LIVE runs (cli/cennini-contract.mjs counts only those)
    if (!Number.isInteger(row.violations) || row.violations < 0) return { pass: false, why: "violations is missing" };
    return row.violations === 0 ? { pass: true, why: `holds on all ${row.n} live run(s), and the judge rejected its known-bad trace` }
      : { pass: false, why: `violated on ${row.violations} of ${row.n} live run(s)` };
  }
  if (!finite(row.p) || row.p < 0 || row.p > 1) return { pass: false, why: "p is missing or out of range" };
  if (facet.kind === "not-worse") {
    return row.p > alpha ? { pass: true, why: "not shown worse, and the control was rejected at the same n" }
      : { pass: false, why: `shown worse than the reference (p ${row.p} <= alpha ${alpha})` };
  }
  if (facet.kind === "beats-null") {
    if (!finite(row.value) || !finite(row.null)) return { pass: false, why: "value or null missing" };
    if (row.p > alpha) return { pass: false, why: `does not beat its null (p ${row.p} > alpha ${alpha})` };
    const better = facet.direction === "lower" ? row.value < row.null : row.value > row.null;
    return better ? { pass: true, why: "beats its null and the control was rejected" } : { pass: false, why: "differs from its null in the wrong direction" };
  }
  return { pass: false, why: `unknown facet kind ${JSON.stringify(facet.kind)}` };
}

const latest = (rows) => rows.reduce((a, r) => (!a || String(r.at ?? "") >= String(a.at ?? "") ? r : a), null);

/** Judge the end state against an evidence ledger. Pure apart from checking that instruments exist on disk. */
export function judge(endState, evidence = [], { exists = (rel) => fs.existsSync(path.join(ROOT, rel)) } = {}) {
  const alpha = endState.alpha;
  const clauses = endState.clauses.map((c) => {
    const facets = c.facets.map((f) => {
      const wired = typeof f.instrument === "string" && exists(f.instrument);
      const rows = evidence.filter((r) => r.clause === c.id && r.facet === f.id);
      if (!wired) return { id: f.id, verdict: "gap", why: f.instrument ? `unwired: ${f.instrument} does not exist` : "unwired: no instrument yet", ignoredRows: rows.length };
      if (!rows.length) return { id: f.id, verdict: "gap", why: "no evidence yet", instrument: f.instrument };
      const row = latest(rows);
      const r = rowPasses(row, f, alpha);
      return { id: f.id, verdict: r.pass ? "met" : "failing", why: r.why, instrument: f.instrument, n: row.n, p: row.p, value: row.value, null: row.null, source: row.source };
    });
    const met = facets.filter((f) => f.verdict === "met").length;
    const failing = facets.filter((f) => f.verdict === "failing").length;
    const verdict = met === facets.length ? "met" : met > 0 ? "partial" : failing > 0 ? "failing" : "gap";
    return { id: c.id, name: c.name, article: c.article, verdict, facets };
  });
  const tally = clauses.reduce((a, c) => { a[c.verdict] = (a[c.verdict] ?? 0) + 1; return a; }, {});
  return { schema: "CenniniExam@1", name: endState.name, alpha, reached: clauses.every((c) => c.verdict === "met"), tally, clauses };
}

export function render(rep) {
  const L = [`${rep.name} — ${rep.reached ? "REACHED" : "NOT REACHED"}  (${Object.entries(rep.tally).map(([k, v]) => `${v} ${k}`).join(", ")}; alpha ${rep.alpha}, declared)`];
  for (const c of rep.clauses) {
    L.push(`  ${c.id} ${c.name.padEnd(7)} ${c.verdict.toUpperCase().padEnd(8)} (${c.article})`);
    for (const f of c.facets) L.push(`      ${f.verdict.padEnd(7)} ${f.id}: ${f.why}${f.p !== undefined ? ` [value ${f.value}, null ${f.null}, p ${f.p}, n ${f.n}]` : ""}`);
  }
  return L.join("\n");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const named = arg("--evidence");
  const rep = judge(loadEndState(arg("--end-state") ?? END_STATE_FILE), loadEvidence(named ?? EVIDENCE_FILE, { required: named !== null }));
  console.log(process.argv.includes("--json") ? JSON.stringify(rep, null, 1) : render(rep));
  process.exitCode = rep.reached ? 0 : 1;
}
