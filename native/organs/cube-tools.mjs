// organs/cube-tools.mjs — THE CUBE'S TOOL REGISTRY, loaded as typed pointers.
//
// cube-tools.json (khora/cube-tools/) is the one home: 27 cells, each with its
// organ(s), its move, the null states it owes, and the python movers/nulls/
// witnesses that read for it. sync.py generates the two uv projects from it;
// this loader is how the door and the app read it without a second table.
//
// The vocabulary is IMPORTED, never restated: the operators and grains come
// from native/kernel/cube.js (OPERATOR_CHAIN, GRAINS) — the same tables the
// fold's own cube uses. A registry that cannot fill the 27 addresses is a
// named gap, not a shorter cube.
//
// Two rules are enforced at load, not documented for later:
//   · a cell with no null_owed cannot register its tools (`no_null_owed`) —
//     a tool with nothing it could ever refuse is a wish, not an instrument;
//   · the address grammar is fixed (OP·Grain); an unknown key is reported,
//     never coerced into the nearest cell.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GRAINS, OPERATOR_CHAIN } from "../kernel/cube.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** khora/cube-tools/cube-tools.json — the one home of the 27-cell registry. */
export const CUBE_TOOLS_PATH = path.join(HERE, "..", "..", "cube-tools", "cube-tools.json");

/** The 27 addresses in cube order (domain × mode × grain, cube.js's own chain). */
export const cubeAddresses = () => OPERATOR_CHAIN.flatMap((op) => GRAINS.map((grain) => `${op}·${grain}`));

/**
 * Canonicalise an address a caller typed by hand: "NUL·Ground", "NUL.Ground",
 * "nul/ground" (case-insensitive op) all resolve to "NUL·Ground"; anything
 * that is not one of the 27 is null — refused by name, never coerced.
 */
export function normalizeCell(input) {
  const m = /^\s*([A-Za-z]{3})\s*[·./\s-]\s*([A-Za-z]+)\s*$/.exec(String(input ?? ""));
  if (!m) return null;
  const op = m[1].toUpperCase();
  const grain = GRAINS.find((g) => g.toLowerCase() === m[2].toLowerCase()) ?? null;
  if (!grain || !OPERATOR_CHAIN.includes(op)) return null;
  return `${op}·${grain}`;
}

const REQUIRED_TOOL_KEYS = ["package", "source", "role", "family", "env", "use"];

/**
 * Load the registry. `cells` is a Map keyed by address in the file's order;
 * `gaps` names everything the file failed to carry (missing cells, incomplete
 * rows) — the loader never invents a cell to keep the count at 27.
 */
export function loadCubeTools({ file = CUBE_TOOLS_PATH } = {}) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return { ok: false, file, cells: new Map(), gaps: [{ type: "registry_unreadable", what: file, detail: String(e?.message ?? e).slice(0, 300) }] };
  }
  const gaps = [];
  const want = cubeAddresses();
  const got = Object.keys(raw);
  for (const missing of want.filter((a) => !got.includes(a))) gaps.push({ type: "cell_missing", what: missing, detail: "the registry does not carry this cell" });
  for (const extra of got.filter((a) => !want.includes(a))) gaps.push({ type: "cell_unknown", what: extra, detail: "not one of the 27 addresses (OP·Grain, cube.js's chain)" });
  const cells = new Map();
  for (const address of want) {
    const entry = raw[address];
    if (!entry) continue;
    const missing = ["organs", "move", "null_owed", "tools"].filter((k) => !entry[k] || !(Array.isArray(entry[k]) ? entry[k].length : String(entry[k]).trim()));
    if (missing.length) {
      gaps.push({ type: "cell_incomplete", what: address, missing, detail: `the cell carries no ${missing.join(", ")}` });
      continue;
    }
    const tools = [];
    for (const tool of entry.tools) {
      // env may be null for stdlib/in-house rows (sync.py enforces that); the
      // key itself must be present, but a null env is a value, not an absence.
      const lacking = REQUIRED_TOOL_KEYS.filter((k) => tool[k] === undefined || tool[k] === "" || (k !== "env" && tool[k] === null));
      if (lacking.length) {
        gaps.push({ type: "tool_incomplete", what: `${address}/${tool.package ?? "?"}`, missing: lacking, detail: "a tool row must carry package, source, role, family, env and use" });
        continue;
      }
      tools.push({
        package: String(tool.package),
        source: String(tool.source),
        role: String(tool.role),
        family: String(tool.family),
        env: tool.env === null ? null : String(tool.env),
        use: String(tool.use),
        note: tool.note ? String(tool.note) : null,
        marker: tool.marker ? String(tool.marker) : null,
        ci: tool.ci === true,
      });
    }
    cells.set(address, {
      cell: address,
      op: address.split("·")[0],
      grain: address.split("·")[1],
      organs: entry.organs.map(String),
      move: String(entry.move),
      null_owed: entry.null_owed.map(String),
      caveat: entry.caveat ? String(entry.caveat) : null,
      // A cell that owes no null can hold no instruments: registrable false, by name.
      registrable: entry.null_owed.length > 0,
      tools,
    });
  }
  return { ok: gaps.every((g) => g.type !== "registry_unreadable"), file, cells, gaps };
}

const norm = (name) => String(name ?? "").replace(/[-_.]+/g, "-").toLowerCase();

/**
 * Resolve one tool of one cell, with the door's own pre-check (the worker
 * enforces the same rule; refusing earlier just names it earlier).
 * `package` may be a full name or a unique prefix of one.
 */
export function whitelistFor(cells, { cell, package: pkg, env = null } = {}) {
  const entry = cells.get(cell);
  if (!entry) return { ok: false, gap: "unknown_cell", why: `"${cell}" is not one of the 27 addresses` };
  if (!entry.registrable) return { ok: false, gap: "no_null_owed", why: `${cell} owes no null state — its tools cannot register` };
  const exact = entry.tools.filter((t) => t.package === pkg && (env === null || t.env === env));
  const prefixed = exact.length ? [] : entry.tools.filter((t) => t.package.startsWith(String(pkg ?? "")) && (env === null || t.env === env));
  const hits = exact.length ? exact : prefixed;
  if (!hits.length) {
    return { ok: false, gap: "unknown_tool", why: `"${pkg}" is not carried by ${cell}`, available: entry.tools.map((t) => t.package) };
  }
  if (hits.length > 1) {
    return { ok: false, gap: "tool_ambiguous", why: `"${pkg}" matches ${hits.map((t) => t.package).join(", ")} — name one`, available: hits.map((t) => t.package) };
  }
  return { ok: true, row: hits[0], entry };
}

/**
 * Coverage — the map the Cube tab and the door's GET route answer: every cell,
 * its rows, whether each package is present in the locked venv (probe), and
 * each tool's last recorded agreement (ledger). `present` and `lastAgreement`
 * may be Maps, plain objects, or null (null = not probed, disclosed as such).
 */
export function coverageOf({ file = CUBE_TOOLS_PATH, present = null, lastAgreement = null } = {}) {
  const { cells, gaps, ok } = loadCubeTools({ file });
  const presentOf = (pkg) => {
    if (!present) return null;
    const v = present instanceof Map ? present.get(pkg) ?? present.get(norm(pkg)) : present[pkg] ?? present[norm(pkg)];
    return v === undefined ? null : !!v;
  };
  const agreeOf = (pkg) => {
    if (!lastAgreement) return null;
    const v = lastAgreement instanceof Map ? lastAgreement.get(pkg) : lastAgreement[pkg];
    return v === undefined ? null : v;
  };
  const list = cubeAddresses().flatMap((address) => {
    const entry = cells.get(address);
    if (!entry) return [];
    const tools = entry.tools.map((t) => ({
      package: t.package,
      source: t.source,
      role: t.role,
      family: t.family,
      env: t.env,
      use: t.use,
      note: t.note,
      ci: t.ci,
      present: presentOf(t.package),
      lastAgreement: agreeOf(t.package),
    }));
    const pypi = tools.filter((t) => t.source === "pypi");
    const have = pypi.filter((t) => t.present === true).length;
    const coverage = !entry.registrable ? "unregistrable" : present === null ? "unprobed" : pypi.length === 0 ? "no-pypi" : have === 0 ? "absent" : have === pypi.length ? "present" : "partial";
    return [{
      cell: address,
      op: entry.op,
      grain: entry.grain,
      organs: entry.organs,
      move: entry.move,
      null_owed: entry.null_owed,
      caveat: entry.caveat,
      registrable: entry.registrable,
      check: entry.tools.some((t) => t.role === "null" || t.role === "witness"),
      coverage,
      tools,
    }];
  });
  const total = list.reduce((n, c) => n + c.tools.length, 0);
  return {
    schema: "CubeMap@1",
    file,
    ok,
    cells: list,
    gaps,
    counts: { cells: list.length, tools: total, present: present === null ? null : list.flatMap((c) => c.tools).filter((t) => t.present === true).length },
  };
}

/** Every package the registry lives on, by env — what a venv must satisfy. */
export function packagesOf(cells) {
  const byEnv = new Map();
  for (const entry of cells.values()) {
    for (const t of entry.tools) {
      if (t.source !== "pypi" || !t.env) continue;
      const set = byEnv.get(t.env) ?? new Set();
      set.add(t.package);
      byEnv.set(t.env, set);
    }
  }
  return byEnv;
}
