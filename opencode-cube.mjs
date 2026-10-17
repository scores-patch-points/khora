// opencode-cube.mjs — the cube event: the 27-address tool registry, measured.
//
// The cube's door seam, mirroring onSwarm's shape and discipline:
//
//   MAP MODE (no cell, no tool — and the GET /v1/hooks/opencode/cube route):
//   what the registry carries, whether each package is present in the locked
//   venv, which domains are provisioned, and each tool's last recorded
//   agreement. Model-free, spawns nothing beyond the one bounded probe.
//
//   CALL MODE (cell/tool named, behind FOLD_CUBE=1): one whitelisted tool row
//   runs through the sidecar, under its family's admission rule (measure.js
//   familyAdmission — the LICENSED pair, the prequential firewall, the named
//   giver, the declared bounds), and lands IN SHADOW: the reading, its
//   producer, the agreement of a witness against its JS sibling, all recorded,
//   nothing gated. A disagreement is a finding that may trigger REC (a
//   changed licence or frame), NEVER a retry.
//
//   The record: every call appends a Provenance@2 exec event through the one
//   appender (opencode-eot.mjs::append — penelope's id derivation, byte for
//   byte), marks the task medium (markNote, the pair every mark uses), and
//   keeps a cube-ledger.jsonl row the tab reads back. Ids are minted in JS;
//   python only ever returns values, anchors and producers.
//
//   PORTED DECISIONS: a tool with no executable entry answers
//   `not_yet_executable` naming itself (coverage is registered for all 27
//   cells; execution is wired one witness at a time). A call with no locked
//   venv falls back to the JS organ WHERE ONE EXISTS, disclosed — never a
//   silent substitution, never a fabricated python reading.
import fs from "node:fs";
import path from "node:path";
import * as eot from "./opencode-eot.mjs";
import { mark as markNote } from "./opencode-worknotes.mjs";
import { OPERATOR_CHAIN } from "./native/kernel/cube.js";
import { coverageOf, loadCubeTools, normalizeCell, whitelistFor } from "./native/organs/cube-tools.mjs";
import { CUBE_CALL_TIMEOUT_MS, CUBE_MAX_BYTES, callTool, huntSidecar, probeRegistry } from "./native/organs/cube-sidecar.mjs";
import { familyAdmission } from "./native/organs/measure.js";
import * as nul from "./native/legacy-ported/nul/index.js";

/** Witness agreement floor, declared once: below it the finding reads `disagreed`
 *  and the ledger carries rec:true — shadow only, it gates nothing here. */
export const REC_AGREEMENT_FLOOR = 0.5;

/** Relative eigenvalue tolerance for the DMD witness's agreement — declared,
 *  never silently tuned. A pair counts as matched within 1e-3 of |1+|λ|+|μ||. */
export const EIGEN_AGREEMENT_TOL = 1e-3;

/** The four families' domains, derived (never restated): OPERATOR_CHAIN is
 *  domain-major in threes (cube.js: DOMAINS.flatMap(...)), so the op's index
 *  IS its domain. */
const DOMAIN_NAMES = ["existence", "structure", "interpretation"];
const domainOf = (op) => DOMAIN_NAMES[Math.floor(OPERATOR_CHAIN.indexOf(op) / 3)] ?? null;

// ── the ledger: every call, append-only, the tab's read-back ────────────────
const ledgerFile = (stateDir) => path.join(stateDir, "cube-ledger.jsonl");

function readLedger(stateDir, limit = 400) {
  if (!stateDir) return [];
  try {
    return fs.readFileSync(ledgerFile(stateDir), "utf8").split("\n").filter(Boolean).slice(-limit).flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function appendLedger(stateDir, row) {
  if (!stateDir) return;
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.appendFileSync(ledgerFile(stateDir), JSON.stringify(row) + "\n");
  } catch {
    /* the ledger never blocks a call */
  }
}

/** Each package's LAST recorded agreement — the tab's "last agreement" column. */
export function lastAgreementByPackage(stateDir) {
  const by = new Map();
  for (const row of readLedger(stateDir)) {
    if (row.tool && row.agreement !== null && row.agreement !== undefined) by.set(row.tool, row.agreement);
  }
  return by;
}

// ── map mode ────────────────────────────────────────────────────────────────
/**
 * The cube as a map: registry coverage × venv presence × the ledger's last
 * agreements. The probe is the sidecar's own (find_spec in the locked venv,
 * bounded); with no venv it is a typed gap, and the map says so rather than
 * pretending every package is absent.
 */
export function cubeMap({ stateDir = null } = {}) {
  const probe = probeRegistry();
  const present = probe.ok === true ? probe.packages : null;
  const doc = coverageOf({ present, lastAgreement: lastAgreementByPackage(stateDir) });
  const hunt = huntSidecar();
  const groups = {};
  for (const [name, index] of DOMAIN_NAMES.map((n, i) => [n, i])) groups[name] = { have: 0, need: 0, missing: [] };
  const seen = new Set();
  for (const cell of doc.cells) {
    const domain = domainOf(cell.op);
    if (!domain) continue;
    for (const tool of cell.tools) {
      if (tool.source !== "pypi") continue;
      const key = `${domain}|${tool.package}`;
      if (seen.has(key)) continue;
      seen.add(key);
      groups[domain].need += 1;
      if (tool.present === true) groups[domain].have += 1;
      else if (tool.present === false) groups[domain].missing.push(tool.package);
    }
  }
  const rows = readLedger(stateDir);
  return {
    ...doc,
    sidecar: {
      found: hunt.found,
      python: hunt.python,
      why: hunt.why,
      probe: probe.ok === true ? { python: probe.python } : { gap: probe.gap ?? "probe_failed", why: probe.why ?? null },
    },
    groups,
    ledger: { calls: rows.length, shadow: rows.filter((r) => r.shadow === true).length, last: rows.slice(-5) },
  };
}

// ── call mode ───────────────────────────────────────────────────────────────
/** body.text as a numeric series, mechanically — JSON array or comma/space
 *  separated. Anything not all-finite is refused, never dropped. */
export function seriesFrom(text) {
  const s = String(text ?? "").trim();
  if (!s) return { gap: "no_material" };
  let doc;
  try {
    doc = JSON.parse(s);
  } catch {
    doc = s.split(/[\s,;]+/).filter(Boolean);
  }
  if (!Array.isArray(doc) || !doc.length) return { gap: "bad_material", why: "not a series (a JSON array or numbers)" };
  const values = doc.map(Number);
  const bad = values.filter((v) => !Number.isFinite(v)).length;
  if (bad) return { gap: "not_numeric", why: `${bad} of ${values.length} entries are not numbers — nothing was dropped, the material is not a series` };
  return { series: values };
}

const hankel = (series, w) => {
  const m = series.length - w + 1;
  return Array.from({ length: w }, (_, i) => series.slice(i, i + m));
};

/** Greedy nearest-match agreement over two eigenvalue multisets. */
export function eigenAgreement(pyValues, jsValues) {
  const py = (pyValues ?? []).map((v) => ({ re: Number(v?.re), im: Number(v?.im) })).filter((v) => Number.isFinite(v.re) && Number.isFinite(v.im));
  const js = (jsValues ?? []).map((v) => ({ re: Number(v?.re), im: Number(v?.im) })).filter((v) => Number.isFinite(v.re) && Number.isFinite(v.im));
  if (!py.length || !js.length) return { pairs: 0, matched: 0, agreement: null };
  const used = new Set();
  let matched = 0;
  for (const p of py) {
    let best = -1;
    let bestD = Infinity;
    js.forEach((q, i) => {
      if (used.has(i)) return;
      const d = Math.hypot(p.re - q.re, p.im - q.im) / (1 + Math.hypot(p.re, p.im) + Math.hypot(q.re, q.im));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0 && bestD <= EIGEN_AGREEMENT_TOL) {
      used.add(best);
      matched += 1;
    }
  }
  return { pairs: Math.max(py.length, js.length), matched, agreement: matched / Math.max(py.length, js.length) };
}

/**
 * The pydmd witness (DEF·Pattern): PyDMD against the kernel's own dmd.js on the
 * same declared series. Both engines read the SAME Hankel embedding (built here
 * once, from the declared window), return discrete eigenvalues; the agreement
 * is the finding, recorded in shadow. Sidecar absent → the JS reading alone,
 * disclosed as fallback; JS absent → the python reading alone. No score is
 * claimed, so the prequential firewall is satisfied by the replication
 * declaration, never by an after-the-fact framing.
 */
async function pydmdWitness({ body, task, agent, cell, row, spread }) {
  const series = seriesFrom(body.text);
  if (!series.series) return { ok: false, gap: series.gap, why: series.why ?? "the call carried no series in text" };
  const n = series.series.length;
  const declared = Number.isInteger(body.frame) && body.frame >= 2 && body.frame < n;
  const window = declared ? body.frame : Math.max(2, Math.floor(n / 2));
  const windowBasis = declared ? "declared (body.frame)" : "series length / 2 (mechanical default, disclosed)";
  // A declared model order makes the two engines comparable (both truncated to
  // the same rank); without one, dmd.js derives "numerical" and PyDMD runs
  // full-rank — the disagreement then includes rank choice, disclosed.
  const declaredRank = Number.isInteger(body.rank) && body.rank >= 1 ? body.rank : null;
  const H = hankel(series.series, window);
  const X = H.map((r) => r.slice(0, -1));
  const Xp = H.map((r) => r.slice(1));
  const bounds = { timeoutMs: CUBE_CALL_TIMEOUT_MS, maxBytes: CUBE_MAX_BYTES };

  let js = null;
  let jsWhy = null;
  try {
    const { dmd } = await import("./native/kernel/dmd.js");
    const out = dmd(X, Xp, { rank: declaredRank ?? "numerical" });
    js = { eigenvalues: out.eigenvalues.map((e) => ({ re: e.re, im: e.im })), rank: out.rank, producer: `js:dmd.js@${declaredRank ?? "numerical"}` };
  } catch (e) {
    jsWhy = String(e?.message ?? e).slice(0, 200);
  }

  const py = await callTool({
    cell,
    package: row.package,
    env: row.env,
    module: "pydmd",
    attr: "DMD",
    construct_args: [],
    construct_kwargs: declaredRank ? { svd_rank: declaredRank } : {},
    method: "fit",
    coerce: "numpy",
    args: [X],
    // `eigs` is PyDMD's discrete-eigenvalue property (the locked 2025.8.1 names
    // it eigs; the newer `eigenvalues` alias does not exist there) — the same
    // discrete spectrum dmd.js returns.
    extract: "eigs",
  });

  const pyValues = py.ok === true ? py.value : null;
  const agreement = pyValues && js ? eigenAgreement(pyValues, js.eigenvalues) : { pairs: 0, matched: 0, agreement: null };
  const fallback = py.ok === true ? { used: false } : { used: js !== null, why: `${py.gap}: ${String(py.why ?? "").slice(0, 200)}` };
  const rec = agreement.agreement !== null && agreement.agreement < REC_AGREEMENT_FLOOR ? { rec: true, why: "witness disagreement — a changed licence or frame (REC), never a retry" } : null;
  const producer = py.ok === true ? py.producer : js?.producer ?? null;
  const standing = agreement.agreement === null ? (fallback.used ? "fallback (js-alone, disclosed)" : "partial") : agreement.agreement >= REC_AGREEMENT_FLOOR ? "agreed" : "disagreed";
  return {
    ok: true,
    py: py.ok === true ? { values: pyValues, offUse: py.off_use ?? null } : { gap: py.gap, why: py.why ?? null },
    js: js ? { values: js.eigenvalues, rank: js.rank } : { gap: jsWhy ?? "dmd.js produced no reading" },
    agreement: agreement.agreement,
    matched: agreement.matched,
    pairs: agreement.pairs,
    rec,
    fallback,
    producer,
    standing,
    evaluates: {
      window,
      windowBasis,
      rank: declaredRank,
      seriesLength: n,
      prequential: { scored: "before", basis: `${spread} — no prediction score is claimed; agreement with dmd.js only` },
      producer,
      bounds,
    },
  };
}

/** The executor map: one entry per tool that can actually run. The registry
 *  carries all 27 cells; this map is the wiring, one witness at a time. */
const CUBE_EXECUTORS = new Map([
  ["pydmd", { target: "dmd.js", run: pydmdWitness }],
]);

const normPkg = (name) => String(name ?? "").replace(/[-_.]+/g, "-").toLowerCase();

/**
 * cube(body) — the door's cube event. Map when nothing is named; a call
 * otherwise, behind FOLD_CUBE=1, admitted by family, run in shadow, recorded.
 */
export async function cube({ body = {}, task = null, agent = "cube", stateDir = null } = {}) {
  const { cells, gaps } = loadCubeTools();
  if (!cells.size) return { ok: false, gap: "registry_unreadable", gaps };
  const namesTarget = Boolean(body.cell || body.tool);
  if (!namesTarget || body.action === "map") return { ok: true, mode: "map", ...cubeMap({ stateDir }) };

  // THE GATE: execution is opt-in, the FOLD_REC_EXEC pattern. The map still
  // answers with the door closed, so the tab and the model can always see why.
  if (process.env.FOLD_CUBE !== "1") {
    return { ok: false, gap: "cube_disabled", why: "cube calls are opt-in: start the door with FOLD_CUBE=1 (the map still answers without it)" };
  }

  // Resolve the target by name — never the nearest cell.
  let cell = body.cell ? normalizeCell(body.cell) : null;
  if (body.cell && !cell) return { ok: false, gap: "unknown_cell", why: `"${body.cell}" is not one of the 27 addresses (OP·Grain)` };
  let row = null;
  if (!cell && body.tool) {
    const hits = [...cells.values()].filter((e) => e.tools.some((t) => t.package === body.tool || normPkg(t.package) === normPkg(body.tool)));
    if (hits.length !== 1) {
      return {
        ok: false,
        gap: hits.length ? "cell_ambiguous" : "unknown_tool",
        why: hits.length ? `"${body.tool}" is carried by ${hits.map((e) => e.cell).join(", ")} — name the cell` : `"${body.tool}" is not carried by any cell`,
        available: hits.map((e) => e.cell),
      };
    }
    cell = hits[0].cell;
  }
  if (!body.tool) {
    // A cell named with no tool: exactly one row → that row; more → refuse by
    // name (never the first, never the nearest).
    const entry = cells.get(cell);
    if (!entry) return { ok: false, gap: "unknown_cell", why: `"${body.cell}" is not one of the 27 addresses` };
    if (entry.tools.length === 1) row = entry.tools[0];
    else return { ok: false, gap: "tool_ambiguous", why: `${cell} carries ${entry.tools.map((t) => t.package).join(", ")} — name the tool`, available: entry.tools.map((t) => t.package) };
  } else {
    const resolved = whitelistFor(cells, { cell, package: body.tool, env: body.env ?? null });
    if (resolved.ok !== true) return { ok: false, ...resolved };
    row = resolved.row;
  }

  const exec = CUBE_EXECUTORS.get(normPkg(row.package));
  if (!exec) {
    return {
      ok: false,
      gap: "not_yet_executable",
      cell,
      tool: row.package,
      family: row.family,
      role: row.role,
      why: `"${row.package}" is registered in ${cell} but not yet wired to execute from the door — coverage is registered for all 27 cells (GET /v1/hooks/opencode/cube); the witness slots first`,
    };
  }

  // ADMISSION — the family's own price, before anything runs.
  const bounds = { timeoutMs: CUBE_CALL_TIMEOUT_MS, maxBytes: CUBE_MAX_BYTES };
  const isWitness = row.role === "witness";
  const admission = familyAdmission({
    family: row.family,
    claimed: body.family ?? null,
    role: row.role,
    cell,
    tool: row.package,
    nul,
    pair: body.pair ?? null,
    giver: body.giver ?? null,
    prequential: body.prequential ?? null,
    witness: isWitness,
    witnessAgainst: isWitness ? exec.target : null,
    bounds,
  });
  if (admission.refused) return { ok: false, gap: admission.refused.type, cell, tool: row.package, why: admission.refused.detail };

  const spread = `synthetic replication — the series' own eigenvalues are the declared truth, the shuffled null rides in assay/`;
  const result = await exec.run({ body, task, agent, cell, row, spread });
  if (result.ok !== true) return { ok: false, gap: result.gap, cell, tool: row.package, why: result.why ?? null };

  // THE RECORD, in shadow: one exec event through the one appender, one mark
  // on the medium (the next turn's note carries it), one ledger row.
  const agreementTxt = result.agreement === null ? "no agreement computable" : `agreement ${result.agreement.toFixed(2)} (${result.matched}/${result.pairs} eigenvalue(s) matched)`;
  const finding = `cube(${row.role}) ${cell} ${row.package} [shadow]: ${agreementTxt}; ${result.standing}; producer ${result.producer ?? "unknown"}${result.fallback.used ? `; fallback: ${result.fallback.why}` : ""}${result.rec ? `; REC: ${result.rec.why}` : ""}`;
  try {
    eot.append({
      task,
      agent: "cube",
      stage: "exec",
      detail: {
        op: "CUBE",
        cell,
        tool: row.package,
        role: row.role,
        family: row.family,
        env: row.env,
        seed: body.seed ?? null,
        shadow: true,
        producer: result.producer ?? null,
        bounds,
        window: result.evaluates.window,
        windowBasis: result.evaluates.windowBasis,
        rank: result.evaluates.rank,
        agreement: result.agreement,
        matched: result.matched,
        pairs: result.pairs,
        py: result.py.gap ? `gap:${result.py.gap}` : "read",
        js: result.js.gap ? `gap` : "read",
        fallback: result.fallback,
        rec: result.rec,
        admission: admission.basis ?? null,
      },
    });
  } catch {
    /* the log never blocks a call */
  }
  try {
    eot.recordMark({ task, agent: "cube", kind: "fact", text: finding });
  } catch {
    /* the log never blocks */
  }
  try {
    markNote({ task, agent: "cube", kind: "fact", text: finding });
  } catch {
    /* the medium never blocks */
  }
  appendLedger(stateDir, {
    schema: "CubeCall@1",
    at: new Date().toISOString(),
    task,
    agent,
    cell,
    tool: row.package,
    role: row.role,
    family: row.family,
    env: row.env,
    seed: body.seed ?? null,
    shadow: true,
    producer: result.producer ?? null,
    bounds,
    window: result.evaluates.window,
    windowBasis: result.evaluates.windowBasis,
    rank: result.evaluates.rank,
    agreement: result.agreement,
    matched: result.matched,
    pairs: result.pairs,
    py: result.py.gap ? { gap: result.py.gap, why: result.py.why } : "read",
    js: result.js.gap ? { gap: result.js.gap } : "read",
    fallback: result.fallback,
    rec: result.rec,
    admission: admission.basis ?? null,
  });

  return {
    ok: true,
    mode: "call",
    cell,
    tool: { package: row.package, role: row.role, family: row.family, env: row.env },
    shadow: true,
    standing: result.standing,
    agreement: result.agreement,
    matched: result.matched,
    pairs: result.pairs,
    producer: result.producer ?? null,
    rec: result.rec,
    fallback: result.fallback,
    // The readings themselves ride back (the witness's finding) — the assay
    // compares them to the declared truth; the ledger keeps only the verdict.
    values: { js: result.js.values ?? null, py: result.py.values ?? null },
    reading: finding,
    gaps: result.py.gap ? [{ organ: "pydmd", gap: result.py.gap, why: result.py.why }] : [],
  };
}
