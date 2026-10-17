// organs/cube-sidecar.mjs — the cube's python sidecar host.
//
// py-engine.js's pattern generalised: that file calls bare `python3` with
// stdlib only, a 15 s timeout and a 4 MB cap, and returns null on any failure.
// The cube's tool rows (cube-tools.json) are not stdlib and not fast to start —
// a cold import of scipy or spaCy would blow any short per-call budget — so
// this host keeps ONE long-lived worker (cube-sidecar-worker.py) speaking JSON
// lines, and holds these rules:
//
//   · THE LOCKED VENV, not system python3. The interpreter is hunted, never
//     guessed: FOLD_CUBE_PYTHON, then the checkout's uv venv
//     (cube-tools/py312/.venv), then the provisioned one
//     (~/.local/share/fold-door/venv, fold-door.sh's FOLD_CUBE=1 step).
//     A missing interpreter is a typed gap (`sidecar-absent`), never a silent
//     downgrade — python stays optional and hunted.
//   · THE WHITELIST IS THE REGISTRY. The worker enforces it (cell + package
//     + env from cube-tools.json); this host never sends anything else.
//   · REPLIES CARRY THEIR PRODUCER. Every reply's `producer` rides into the
//     ledger and the record; attribution is never re-derived here.
//   · WRITES ONLY IN SCRATCH, NO NETWORK, NO SPAWN — enforced by the worker's
//     own audit hook, mirrored here by a scratch TMPDIR/HOME it can be seen in.
//   · BOUNDS: per-call timeout and reply cap, declared once (below), the
//     worker killed on timeout — a hung import must not hold the door.
//
// The senses use the same host (perceiveOrgan); the door uses callTool.
// Fallbacks to JS organs are the CALLER's disclosure to make — this module
// only ever says `sidecar-absent` and why.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CUBE_TOOLS_PATH } from "./cube-tools.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The worker script, shipshape beside this host. */
export const CUBE_WORKER = path.join(HERE, "cube-sidecar-worker.py");

/** Reply cap, py-engine.js's own 4 MB — one declared bound for the sidecar. */
export const CUBE_MAX_BYTES = 4 * 1024 * 1024;

/** Per-call budget. Long enough for a real first import, short enough to die. */
export const CUBE_CALL_TIMEOUT_MS = Number(process.env.FOLD_CUBE_CALL_TIMEOUT_MS ?? 30_000);

const PROBE_TIMEOUT_MS = Number(process.env.FOLD_CUBE_PROBE_TIMEOUT_MS ?? 20_000);

/** The registry the worker enforces; env override for tests, one home otherwise. */
export const cubeRegistryFile = (env = process.env) => env.FOLD_CUBE_REGISTRY ?? CUBE_TOOLS_PATH;

const venvCandidates = (root, home) => [
  path.join(root, "..", "..", "cube-tools", "py312", ".venv", "bin", "python"),
  path.join(home, ".local", "share", "fold-door", "venv", "bin", "python"),
];

/**
 * THE HUNT: which interpreter, if any. Absence is a typed gap naming the way
 * back (`why`), never an install and never a guess.
 */
export function huntSidecar({ env = process.env, root = HERE, home = os.homedir() } = {}) {
  if (env.FOLD_CUBE_PYTHON) {
    return fs.existsSync(env.FOLD_CUBE_PYTHON)
      ? { found: true, python: env.FOLD_CUBE_PYTHON, why: "FOLD_CUBE_PYTHON" }
      : { found: false, python: null, why: `FOLD_CUBE_PYTHON names ${env.FOLD_CUBE_PYTHON}, which does not exist` };
  }
  for (const candidate of venvCandidates(root, home)) {
    if (fs.existsSync(candidate)) return { found: true, python: candidate, why: "locked venv" };
  }
  return {
    found: false,
    python: null,
    why: "no locked venv — uv sync --project cube-tools/py312 (or ./fold-door.sh with FOLD_CUBE=1); python stays optional, a typed gap until then",
  };
}

const workerEnv = ({ scratch, registryFile }) => ({
  PATH: process.env.PATH ?? "",
  HOME: scratch,
  TMPDIR: scratch,
  FOLD_CUBE_SCRATCH: scratch,
  FOLD_CUBE_REGISTRY: registryFile,
  PYTHONDONTWRITEBYTECODE: "1",
  PYTHONNOUSERSITE: "1",
  LANG: process.env.LANG ?? "en_US.UTF-8",
});

const lastJsonLine = (text) => {
  const lines = String(text ?? "").split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      /* keep walking back */
    }
  }
  return null;
};

/**
 * ONE-SHOT: one request, one reply, process exits — the synchronous, bounded
 * probe (the senses hunt) and the test seam. Same whitelist, same gates.
 */
export function sidecarOneshot(req, { env = process.env, root = HERE, home = os.homedir(), timeoutMs = PROBE_TIMEOUT_MS, registryFile = null } = {}) {
  const hunt = huntSidecar({ env, root, home });
  if (!hunt.found) return { ok: false, gap: "sidecar-absent", why: hunt.why };
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fold-cube-"));
  let r;
  try {
    r = spawnSync(hunt.python, [CUBE_WORKER, "--oneshot"], {
      input: JSON.stringify(req) + "\n",
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: CUBE_MAX_BYTES,
      env: workerEnv({ scratch, registryFile: registryFile ?? cubeRegistryFile(env) }),
    });
  } finally {
    try { fs.rmSync(scratch, { recursive: true, force: true }); } catch { /* scratch is best-effort */ }
  }
  if (r.error || r.status !== 0) {
    const why = r.error ? String(r.error.message ?? r.error) : `worker exited ${r.status}: ${String(r.stderr ?? "").slice(0, 300)}`;
    return { ok: false, gap: r.error?.code === "ETIMEDOUT" ? "call_timeout" : "sidecar-failed", why };
  }
  const doc = lastJsonLine(r.stdout);
  return doc ?? { ok: false, gap: "sidecar-failed", why: `the worker printed no JSON: ${String(r.stdout ?? "").slice(0, 200)}` };
}

/** probe: which of these modules import in the locked venv (find_spec, no import). */
export const probeModules = (modules, opts = {}) =>
  sidecarOneshot({ op: "probe", modules: [...modules] }, opts);

/** probe the whole registry: which packages of cube-tools.json are installed. */
export const probeRegistry = (opts = {}) => sidecarOneshot({ op: "probe-registry" }, opts);

// ── the long-lived worker ───────────────────────────────────────────────────
let service = null;

const kill = (state) => {
  try {
    state.proc.kill("SIGKILL");
  } catch {
    /* already gone */
  }
};

function startService(python, registryFile) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fold-cube-"));
  const proc = spawn(python, [CUBE_WORKER], {
    env: workerEnv({ scratch, registryFile }),
    stdio: ["pipe", "pipe", "pipe"],
    cwd: scratch,
  });
  // A long-lived worker must not keep SHORT scripts alive: unref the child and
  // its pipes so a finished CLI/test process can exit (the exit hook below
  // stops the worker). An in-flight request is held by its own ref'd timer.
  proc.unref?.();
  proc.stdin.unref?.();
  proc.stdout.unref?.();
  proc.stderr.unref?.();
  const state = {
    python,
    proc,
    scratch,
    seq: 0,
    pending: new Map(),
    buf: "",
    stderrTail: [],
    dead: false,
    calls: 0,
  };
  const die = (why) => {
    state.dead = true;
    for (const p of state.pending.values()) {
      clearTimeout(p.timer);
      p.resolve({ ok: false, gap: "worker_died", why: `${why}: ${state.stderrTail.join("").slice(0, 300)}` });
    }
    state.pending.clear();
  };
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (chunk) => {
    state.buf += chunk;
    let i;
    while ((i = state.buf.indexOf("\n")) !== -1) {
      const line = state.buf.slice(0, i);
      state.buf = state.buf.slice(i + 1);
      let doc;
      try {
        doc = JSON.parse(line);
      } catch {
        continue;
      }
      const p = state.pending.get(doc?.id);
      if (p) {
        state.pending.delete(doc.id);
        clearTimeout(p.timer);
        p.resolve(doc);
      }
    }
  });
  proc.stderr.setEncoding("utf8");
  proc.stderr.on("data", (chunk) => {
    state.stderrTail.push(String(chunk));
    if (state.stderrTail.length > 20) state.stderrTail.shift();
  });
  proc.on("exit", (code) => die(`worker exited ${code}`));
  proc.on("error", (e) => die(`worker spawn failed: ${e.message}`));
  state.stop = () => kill(state);
  state.request = (req, { timeoutMs = CUBE_CALL_TIMEOUT_MS } = {}) => {
    if (state.dead) return Promise.resolve({ ok: false, gap: "worker_died", why: state.stderrTail.join("").slice(0, 300) || "worker is dead" });
    const id = ++state.seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        state.pending.delete(id);
        // State after a timeout is unknown: kill and let the next call start fresh.
        state.dead = true;
        kill(state);
        resolve({ ok: false, gap: "call_timeout", why: `no reply within ${timeoutMs}ms — the worker was killed; the next call starts a fresh one` });
      }, timeoutMs);
      state.pending.set(id, { resolve, timer });
      try {
        state.calls += 1;
        proc.stdin.write(JSON.stringify({ id, ...req }) + "\n");
      } catch (e) {
        state.pending.delete(id);
        clearTimeout(timer);
        resolve({ ok: false, gap: "worker_died", why: String(e?.message ?? e) });
      }
    });
  };
  return state;
}

/**
 * The service, started on first use and reused. A dead worker is replaced here
 * (fresh process, fresh scratch), so callers see `sidecar-absent` only when
 * there is no interpreter at all.
 */
export function sidecarService({ env = process.env, root = HERE, home = os.homedir(), registryFile = null } = {}) {
  const hunt = huntSidecar({ env, root, home });
  if (!hunt.found) return null;
  if (service && !service.dead) return service;
  if (service) service.stop();
  service = startService(hunt.python, registryFile ?? cubeRegistryFile(env));
  return service;
}

const serviceRequest = async (req, { env = process.env, timeoutMs = CUBE_CALL_TIMEOUT_MS } = {}) => {
  const svc = sidecarService({ env });
  if (!svc) {
    const hunt = huntSidecar({ env });
    return { ok: false, gap: "sidecar-absent", why: hunt.why };
  }
  return svc.request(req, { timeoutMs });
};

/**
 * callTool — one whitelisted tool row. The request names its cell and package
 * (the registry is the licence); the worker refuses everything else by name.
 */
export const callTool = (req, opts = {}) => serviceRequest({ op: "call", ...req }, opts);

/**
 * perceiveOrgan — one sense organ reading bytes (ocrmac, pdfplumber, pymupdf,
 * mlx_whisper). Bytes travel inline (base64); the worker writes them only in
 * its scratch dir and deletes them.
 */
export const perceiveOrgan = ({ organ, bytes, lang = "eng", suffix = null }, opts = {}) =>
  serviceRequest({ op: "perceive", organ, lang, suffix, bytes_b64: Buffer.from(bytes).toString("base64") }, opts);

/** For tests and shutdown: stop the shared worker. */
export const stopSidecar = () => {
  if (service) service.stop();
  service = null;
};

process.on("exit", () => {
  if (service && !service.dead) service.stop();
});
