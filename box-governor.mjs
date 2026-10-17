// box-governor.mjs — the local stack's memory supervisor, ported from eodb/src/memory.js.
//
// FOLD ONLY TRANSFORMATIONS (the principle this file serves). State is never stored; it is derived
// (folded) from an append-only log of transformations, and only the transformations are kept. Every
// organ here already obeys it: the EOT log (opencode-eot.mjs) is the fold of its events, the work tree
// is the fold of the edits, `read()` is served from the DERIVED binary index (opencode-eot-index.mjs).
// The box should obey it too: a resident model is a LEASE (a decaying claim), not a fixture; an idle
// session is a log that can be re-folded, not a heap that must stay; a big dict re-serialized on every
// write (prompts.json) should be an append-only log with a folded projecton. Keep the transformations;
// re-derive the state. The governor is how the box stays honest about what it is holding.
//
// A Node process cannot cap the machine's memory, so — like eodb — this enforces the budget two ways:
//   1. STRUCTURAL CAPS (the real guarantee) belong to the caller: a residency TTL on models, an LRU of
//      open sessions, one inference fleet. Those bound the footprint regardless of what this samples.
//   2. ADAPTIVE SHEEDING (best-effort) is here: sample the box on an interval and run registered
//      evictors BEFORE the cliff, not after. When the platform gives no reading, it is inert and the
//      structural caps carry the budget alone.
//
// Pure apart from the injected `sample` and each evictor's own IO. Fails open: an evictor that throws
// is logged and skipped; the governor never blocks the box it is trying to save.

import os from "node:os";
import { execFileSync } from "node:child_process";

export const MB = 1024 * 1024;

/** The line the box is judged against: a fraction of RAM. Overridable. */
export const defaultBudget = () => Math.round(os.totalmem() * 0.8);

/**
 * systemSample() → { bytes, swapUsed, swapTotal, source }. `bytes` is RAM in use; swap is read from the
 * platform when it can be (macOS `vm.swapusage`), so a box that is paging hard reads as over budget even
 * when free RAM looks fine — swap thrash is the failure this exists to catch.
 */
export function systemSample() {
  const total = os.totalmem();
  const bytes = total - os.freemem();
  let swapUsed = 0, swapTotal = 0;
  try {
    const out = execFileSync("sysctl", ["-n", "vm.swapusage"], { encoding: "utf8" });
    const m = /used = ([\d.]+)M\D+total = ([\d.]+)M/.exec(out);
    if (m) { swapUsed = Number(m[1]) * MB; swapTotal = Number(m[2]) * MB; }
  } catch { /* not darwin, or sysctl absent — free RAM alone carries it */ }
  return { bytes, swapUsed, swapTotal, source: "os" };
}

/**
 * createGovernor({ budgetBytes, softFraction, criticalFraction, intervalMs, sample, warn })
 *   registerEvictor(name, fn, { priority, level })  fn(level) → truthy if it freed something
 *   check()  → { bytes, level, ran }                one sample + (if over) the evictors, in priority order
 *   start()/stop()                                  the interval; unref'd, so it never holds the process open
 * A 'soft' evictor runs at soft and above; a 'critical' one only once critical is crossed (for shedding
 * that hurts — dropping a live cache — not cheap wins like unloading an idle model).
 */
export function createGovernor({
  budgetBytes = defaultBudget(),
  softFraction = 0.80,
  criticalFraction = 0.92,
  intervalMs = 15_000,
  sample = systemSample,
  warn = console.warn,
} = {}) {
  const evictors = [];
  let timer = null, running = false, last = null;

  const registerEvictor = (name, fn, { priority = 0, level = "soft" } = {}) => {
    const entry = { name, fn, priority, level };
    evictors.push(entry);
    return () => { const i = evictors.indexOf(entry); if (i >= 0) evictors.splice(i, 1); };
  };

  const levelOf = (bytes) => {
    if (!budgetBytes) return null;
    const frac = bytes / budgetBytes;
    return frac >= criticalFraction ? "critical" : frac >= softFraction ? "soft" : null;
  };

  const check = async () => {
    if (running) return null;
    running = true;
    try {
      const s = await sample();
      last = s;
      const level = levelOf(s.bytes);
      if (!level) return { ...s, level: null, ran: [] };
      const wanted = level === "critical" ? ["soft", "critical"] : ["soft"];
      const ran = [];
      for (const e of evictors.filter((x) => wanted.includes(x.level)).sort((a, b) => b.priority - a.priority)) {
        try { if (await e.fn(level)) ran.push(e.name); } catch (err) { warn(`[governor] evictor failed: ${e.name}`, err); }
      }
      warn(`[governor] ${level} at ${(s.bytes / MB).toFixed(0)}MB / ${(budgetBytes / MB).toFixed(0)}MB — ran ${ran.join(", ") || "nothing"}`);
      return { ...s, level, ran };
    } finally {
      running = false;
    }
  };

  const start = () => { if (timer) return; timer = setInterval(() => { void check(); }, intervalMs); timer.unref?.(); };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  const stats = () => ({ last, budgetBytes, softBytes: budgetBytes * softFraction, criticalBytes: budgetBytes * criticalFraction, evictors: evictors.map((e) => `${e.name}:${e.level}`) });

  return { registerEvictor, check, start, stop, stats };
}

/**
 * modelsEvictor({ host }) — the fold's small mouths are LEASES, not fixtures: unload every resident model
 * (ollama `keep_alive: 0`). A model kept warm with nothing drawing is memory spent for nothing; it loads
 * again in seconds when the residue actually needs it. Returns true if it asked any model to leave.
 */
export function modelsEvictor({ host = process.env.ER7_OLLAMA_HOSTS?.split("=")[1] ?? "http://127.0.0.1:11435", fetchImpl = fetch } = {}) {
  return async () => {
    let ps;
    try { ps = await (await fetchImpl(`${host}/api/ps`)).json(); } catch { return false; }
    let freed = false;
    for (const m of ps?.models ?? []) {
      try { await fetchImpl(`${host}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: m.name, keep_alive: 0 }) }); freed = true; } catch { /* best-effort */ }
    }
    return freed;
  };
}
