// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══  eval/barker/run.mjs  (Barker, the driver)
// Written BEFORE the first run of this file. BARKER.md (docs/BARKER.md, handle table and section 9)
// is authoritative; where this file states an operational choice BARKER.md leaves open, the choice is
// registered HERE, once, before any run, and is stamped into every run report.
//
// WHAT THIS FILE IS. The driver BARKER.md names and never had: it runs the four Barker instruments in
// the registered order and writes cards, never prose verdicts. It computes no statistic of its own and
// re-implements no measurement; it only sequences, captures and reports.
//
//   --freeze            checks that every SESOI row in the EO battery is signed (BARKER.md 4.7a / 6.0a);
//                       if any row is still unsigned (signedBy "" by construction) it REFUSES and
//                       writes no lock. The freeze is the ordering fact BARKER.md 6 requires: a lock
//                       may only exist after the defender signed the SESOI, BEFORE the one-shot TEST read.
//   (default)          a DEV run: manifest -> smoke gates -> induce -> transfer -> eo-claims -> self.
//   --smoke            the default and the only mode run so far: reduced draws via each instrument's own
//                       --smoke/--quick/--scale smoke, stamped as such (a smoke run is labelled, never a report).
//   --full             the registered numbers (long: hours). Refused for the TEST split.
//   --stages a,b,c     run a subset of {manifest,smoke,induce,transfer,eo,self}.
//   --split dev        the only split this driver will drive. TEST is refused here and by each instrument;
//                       the confirmatory read is a separate, one-shot act after --freeze.
//
// RULES THAT BIND IT. No TEST split is ever opened (asserted, and passed dev-only by construction). No
// model, no network. Failures are printed first. A stage that exits non-zero is recorded as failed and the
// run continues (the later stages are independent instruments); the report's headline lists them.
//
// WHAT THE DRIVER DOES NOT DO. It does not sign a SESOI (that is the claim's defender, a person). It does
// not aggregate a verdict across instruments (there is no aggregate EO or Barker score). It does not edit
// any sibling file.
// ═══ END PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OSS = process.env.BARKER_ROOT || "/private/tmp/claude-501/barker";
const DEFAULT_OUT = process.env.BARKER_OUT_DIR || path.join(OSS, "out");

const FLAGS = new Set(["freeze", "smoke", "full", "help", "list-stages", "dry-run", "self-reference", "assemble"]);
const OPTS = { split: "dev", out: DEFAULT_OUT, stages: null, workers: 4, levels: null };
// The BARKER.md 9 run-order mode names, mapped onto this driver's stages (the order is always the registered one).
const MODES = {
  check: ["manifest", "smoke"], power: ["induce"], controls: ["induce"], comparative: ["induce"], critical: ["induce", "eo"],
  transfer: ["transfer"], eo: ["eo"], self: ["self"], prospective: ["self"], all: STAGE_CANON(),
};
function STAGE_CANON() { return ["manifest", "smoke", "induce", "transfer", "eo", "self"]; }

function parseArgs(argv) {
  const flags = new Set(); const modes = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--split") OPTS.split = argv[++i];
    else if (a === "--out") OPTS.out = argv[++i];
    else if (a === "--stages") OPTS.stages = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--levels") OPTS.levels = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--workers") OPTS.workers = Number(argv[++i]);
    else if (a.startsWith("--") && MODES[a.slice(2)]) modes.push(...MODES[a.slice(2)]);
    else if (a.startsWith("--")) flags.add(a.slice(2));
    else throw new Error(`run.mjs: unknown argument ${a}`);
  }
  OPTS.full = flags.has("full");
  OPTS.selfReference = flags.has("self-reference");
  if (modes.length && !OPTS.stages) OPTS.stages = [...new Set(modes)];
  return flags;
}

const nowIso = () => new Date().toISOString();
const stamp = () => nowIso().replace(/[:.]/g, "-");

// ── the stage table: the registered order, each instrument invoked through its own CLI (no re-implementation) ──
function stageTable() {
  const smoke = OPTS.full ? {} : { smoke: true };
  const out = OPTS.out;
  const levels = OPTS.levels ?? (OPTS.full ? ["S", "R", "W"] : ["S"]);
  return {
    manifest: { tool: "profiles.mjs", argv: ["manifest"], note: "the system manifest (one row per system, hashes, gaps)" },
    smoke: { tool: "profiles-smoke.mjs", argv: ["all"], note: "the profile gates G0..G7, plants, K-facts, twins, coverage (reads cached profiles)" },
    induce: { tool: "induce.mjs", argv: ["--split", "dev", "--levels", levels.join(","), "--workers", String(OPTS.workers), "--out", path.join(out, "induce"), ...(smoke.smoke ? ["--smoke"] : [])], note: `Level-S power + copula calibration, card power trios, controls, real; levels ${levels.join("/")}` },
    transfer: { tool: "transfer.mjs", argv: ["--task", "all", "--out", path.join(out, "transfer"), ...(smoke.smoke ? ["--quick"] : [])], note: "L1/L2/L3/L4 transfer, gain rule 5.0 per lineage" },
    eo: { tool: "eo-claims.mjs", argv: ["--split", "dev", "--out", path.join(out, "eo"), ...(smoke.smoke ? ["--quick"] : [])], note: "the EO falsification battery EO-1..EO-12 on DEV" },
    self: OPTS.selfReference
      ? { inline: "selfReference", note: "the mirror S1..S9 via the REFERENCE inducer (self.mjs stand-in); the registered organs/barker.js path is blocked by a unit mismatch and is reported" }
      : { tool: "self.mjs", argv: ["--profiles-dir", process.env.BARKER_NL_PROFILES || path.join(OSS, "induce-profiles"), "--scale", OPTS.full ? "doc" : "smoke"], note: "the mirror: the map put to its own tests S1..S9 (NL-only profile set: a mixed nl+code directory shares no feature and builds no matrix)" },
  };
}
const STAGE_ORDER = ["manifest", "smoke", "induce", "transfer", "eo", "self"];

// The self stage's labelled fallback: run the mirror with self.mjs's own reference inducer, never the registered organ.
async function runSelfReference(report) {
  const t0 = Date.now();
  const dir = process.env.BARKER_NL_PROFILES || path.join(OSS, "induce-profiles");
  try {
    const P = await import("./profiles.mjs");
    const S = await import("./self.mjs");
    const profiles = P.loadProfiles(dir).filter((p) => String(p.id).startsWith("nl:"));
    const r = await S.runSelf({ profiles, scale: OPTS.full ? "doc" : "smoke", induce: undefined, archs: null });
    const file = path.join(OPTS.out, "self-reference.json");
    fs.writeFileSync(file, JSON.stringify({ schema: "BarkerSelfReference@1", inducer: "referenceInducer (self.mjs stand-in; NOT the registered organs/barker.js menu)", profiles: profiles.length, trust: r.trust, survives: r.survives, weakened: r.weakened, refuted: r.refuted, underpowered: r.underpowered, notes: r.notes, cards: r.cards, frame: r.frame }, null, 1));
    report.stages.push({ stage: "self", tool: "self.mjs(reference)", exit: 0, seconds: (Date.now() - t0) / 1000, note: "reference inducer, labelled", stdout: `wrote ${file}`, stderr: "" });
    process.stderr.write(`[run] self (reference): trust ${r.trust} in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  } catch (e) {
    report.stages.push({ stage: "self", tool: "self.mjs(reference)", exit: 1, seconds: (Date.now() - t0) / 1000, stdout: "", stderr: String(e?.stack ?? e).split("\n").slice(0, 6).join(" | ") });
    process.stderr.write(`[run] self (reference): FAILED ${e.message}\n`);
  }
}

// ── freeze: refuse unless every SESOI row a person must sign carries a signature ────────────────────────────────
async function doFreeze() {
  const rows = [];
  try {
    const eo = await import("./eo-claims.mjs");
    for (const [id, s] of Object.entries(eo.SESOI)) if (!s || !String(s.signedBy ?? "").trim()) rows.push({ battery: "EO", id, unit: s?.unit ?? null, value: s?.value ?? s?.sesoi ?? null, signedBy: "" });
  } catch (e) { rows.push({ battery: "EO", id: "(module unreadable)", error: String(e.message) }); }
  const lock = path.join(HERE, "PREREG.lock.json");
  if (rows.length) {
    console.error(`run.mjs --freeze REFUSED: ${rows.length} SESOI row(s) unsigned. A lock may not exist before the defender signs every row (BARKER.md 4.7a, 6.0a).`);
    console.error(JSON.stringify({ refused: true, unsigned: rows }, null, 1));
    return 1;
  }
  const body = { schema: "BarkerPreRegLock@1", frozenAt: nowIso(), split: "test", note: "SESOI signed; the TEST read is one-shot and confirmatory", hashes: {} };
  for (const t of ["profiles", "induce", "transfer", "eo-claims", "self"]) {
    try { body.hashes[t] = (await import(`./${t}.mjs`)).headerDigest?.() ?? null; } catch { body.hashes[t] = null; }
  }
  fs.writeFileSync(lock, JSON.stringify(body, null, 1));
  console.log(`run.mjs --freeze: wrote ${lock}`);
  return 0;
}

// ── one stage: spawn the instrument, capture stdout/stderr, never throw ──────────────────────────────────────────
function runStage(name, spec, report) {
  const env = { ...process.env, BARKER_OUT_DIR: OPTS.out, BARKER_ROOT: OSS };
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [spec.tool, ...spec.argv], { cwd: HERE, env, encoding: "utf8", maxBuffer: 1 << 30 });
  const seconds = (Date.now() - t0) / 1000;
  const entry = { stage: name, tool: spec.tool, argv: spec.argv, exit: r.status, signal: r.signal, seconds, note: spec.note, stdout: (r.stdout ?? "").slice(-4000), stderr: (r.stderr ?? "").slice(-4000) };
  if (r.error) entry.error = String(r.error.message);
  process.stderr.write(`[run] ${name}: exit ${r.status ?? "null"}${r.signal ? ` signal ${r.signal}` : ""} in ${seconds.toFixed(1)}s\n`);
  report.stages.push(entry);
  return entry;
}

function summarise(report) {
  const failed = report.stages.filter((s) => s.exit !== 0);
  const outFiles = [];
  const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.json$/.test(e.name) && fs.statSync(p).mtimeMs > report.startedAtMs) outFiles.push(p); } };
  try { walk(OPTS.out); } catch { /* descriptive only */ }
  return {
    schema: "BarkerRun@1", ranAt: report.ranAt, mode: OPTS.full ? "FULL (registered numbers)" : "SMOKE (reduced draws; a smoke run is labelled, never a report)",
    split: OPTS.split, out: OPTS.out, stages: report.stages.map(({ stage, exit, signal, seconds }) => ({ stage, exit, signal, seconds: Number(seconds.toFixed(1)) })),
    failures: failed.map((s) => ({ stage: s.stage, exit: s.exit, stderr: s.stderr.split("\n").filter(Boolean).slice(-3) })),
    wrote: outFiles.map((p) => path.relative(OSS, p)),
    note: "there is no aggregate Barker or EO score; each instrument's card stands alone. Failures first.",
  };
}

// ── assemble: read the latest per-stage artifacts and write one report, failures first (no re-run, no new statistic) ──
function readJsonIf(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function assemble() {
  const out = OPTS.out, cards = [], failures = [];
  const push = (id, phase, verdict, detail) => cards.push({ id, phase, verdict, detail });
  const manifest = readJsonIf(path.join(out, "manifest.json"));
  if (manifest) push("R0-manifest", "R0", "OK", { systems: manifest.systems?.length ?? null, gaps: manifest.gaps?.length ?? null });
  const smoke = readJsonIf(path.join(out, "profiles-smoke.json"));
  if (smoke) for (const [g, v] of Object.entries(smoke)) cards.push({ id: `R1-${g}`, phase: "R1", verdict: v.verdict ?? (v.pass === false ? "FAIL" : "n/a"), detail: { summary: v.summary ?? null } });
  const induce = readJsonIf(path.join(out, "induce", "induce-dev.json")) ?? readJsonIf(path.join(out, "induce-dev.json"));
  if (induce) {
    cards.push({ id: "R4-levelS", phase: "R4", verdict: (induce.levelS?.groups?.ALL?.organ?.kinds?.length ?? 0) ? "KINDS" : "NO_KIND", detail: { layout: induce.layout, groups: Object.fromEntries(Object.entries(induce.levelS?.groups ?? {}).map(([g, r]) => [g, r.gap ? `gap:${r.gap.reason ?? r.gap}` : `kinds:${(r.organ?.kinds ?? []).length}`])) } });
    cards.push({ id: "R2-power-grid", phase: "R2", verdict: (induce.power?.levelS?.grid?.mde ? "ADMISSIBLE" : "INADMISSIBLE"), detail: { cells: induce.power?.levelS?.grid?.cells ?? null, copulaRejected: Object.fromEntries(Object.entries(induce.power?.levelS?.copula ?? {}).map(([g, v]) => [g, v?.rejected ?? v?.reason ?? null])) } });
    for (const [id, v] of Object.entries(induce.archTable ?? {})) push(`R5-${id}`, "R5", v.result?.status ?? v.status ?? (typeof v.result === "string" ? v.result : "?"), { name: v.name });
  }
  const tcards = ["transfer-L1-strict", "transfer-L2", "transfer-L3", "transfer-L4"].map((n) => readJsonIf(path.join(out, "transfer", `${n}.json`))).filter(Boolean);
  for (const c of tcards) { const vs = (c.sources ?? []).map((s) => s.verdict).filter(Boolean); push(`R6-${c.task}`, "R6", vs.length ? [...new Set(vs)].join("/") : (c.notRun ? `NOT_RUN(${c.notRun.length} gates)` : "?"), { n: c.system?.n }); }
  for (const f of fs.existsSync(path.join(out, "eo")) ? fs.readdirSync(path.join(out, "eo")).filter((x) => /^eo-claims-dev-EO-\d+\.json$/.test(x)) : []) {
    const c = readJsonIf(path.join(out, "eo", f)); if (c) push(`R5-${c.id}`, "R5", c.verdict, { outcome: c.outcome, bearing: c.bearing, reasons: c.verdictReasons ?? c.reasons });
  }
  const selfRef = readJsonIf(path.join(out, "self-reference.json"));
  if (selfRef) { push("R7-self", "R7", `trust:${selfRef.trust}`, { inducer: selfRef.inducer, cards: (selfRef.cards ?? []).map((c) => `${c.id}:${c.status ?? c.pass}`) }); }
  for (const c of cards) if (/^(FAIL|INSTRUMENT_FAILED|REFUTED|UNDERPOWERED|INADMISSIBLE|NO_KIND)/.test(String(c.verdict))) failures.push(c);
  const report = { schema: "BarkerReport@1", assembledAt: nowIso(), split: OPTS.split, out, failuresFirst: failures, cards, note: "no aggregate Barker or EO score; each card stands alone. This is an assembly of the latest per-stage artifacts; it computed no statistic." };
  const file = path.join(out, `barker-report-${stamp()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, (k, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v), 1));
  console.log(JSON.stringify({ file, cards: cards.length, failures: failures.length, verdicts: cards.reduce((a, c) => (a[c.verdict] = (a[c.verdict] ?? 0) + 1, a), {}) }, null, 1));
  return 0;
}

async function main(argv = process.argv.slice(2)) {
  const flags = parseArgs(argv);
  if (flags.has("help")) { console.log("usage: run.mjs [--freeze] [--smoke|--full] [--stages a,b,c] [--levels S,R,W] [--out DIR] [--split dev] [--workers N] [--self-reference] | run.mjs --all | --check | --power | --transfer | --eo | --self | run.mjs --assemble"); return 0; }
  if (flags.has("list-stages")) { console.log(STAGE_ORDER.join("\n")); return 0; }
  if (OPTS.split !== "dev") { console.error(`run.mjs: split "${OPTS.split}" refused: this driver drives the DEV (exploratory) split only. The confirmatory read is one-shot after --freeze.`); return 3; }
  if (flags.has("freeze")) return doFreeze();
  if (flags.has("assemble")) return assemble();

  const table = stageTable();
  const stages = OPTS.stages ?? STAGE_ORDER;
  const unknown = stages.filter((s) => !table[s]);
  if (unknown.length) { console.error(`run.mjs: unknown stage(s) ${unknown.join(", ")}; known: ${STAGE_ORDER.join(", ")}`); return 2; }

  fs.mkdirSync(OPTS.out, { recursive: true });
  const report = { ranAt: nowIso(), startedAtMs: Date.now(), stages: [] };
  console.log(`run.mjs: mode ${OPTS.full ? "FULL" : "SMOKE"} | split ${OPTS.split} | stages ${stages.join(" -> ")} | out ${OPTS.out}`);
  if (flags.has("dry-run")) { for (const s of stages) console.log(`${s}: ${table[s].inline ? `<inline ${table[s].inline}>` : `${table[s].tool} ${table[s].argv.join(" ")}`}`); return 0; }

  for (const name of stages) { const spec = table[name]; if (spec.inline === "selfReference") await runSelfReference(report); else runStage(name, spec, report); }

  const summary = summarise(report);
  const file = path.join(OPTS.out, `run-${stamp()}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...summary, detail: report }, (k, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v), 1));
  const latest = path.join(OPTS.out, "run-latest.json"); try { fs.writeFileSync(latest, JSON.stringify({ ...summary, detail: report }, (k, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v), 1)); } catch { /* best effort */ }
  console.log(JSON.stringify({ ...summary, file }, null, 1));
  return summary.failures.length ? 1 : 0;
}

main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
