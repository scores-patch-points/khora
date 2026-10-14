// cli/spiral-layer.mjs — IS JANUS'S SPIRAL ON THIS STACK? A TYPED ANSWER (2026-10-14, nesting-fix J D1).
//
// cli/claude-code-spiral.mjs wires khora's reasoning to janus's organs/reasoning-spiral.js and
// organs/consequence-verdict.js. Those two files exist only on janus's unmerged branch
// (origin/codex/constitutive-spiral-20261010); janus origin/main has neither. The wiring used to
// import them unconditionally, so on the merged stack reason.mjs printed
// "janus: not recorded (Cannot find module …)" under an OK banner and the Stop script died with
// exit 1, which the doorway swallowed. Absence is now a STATE, not an error:
//
//   { state: "present" }
//   { state: "spiral-absent", module: "reasoning-spiral.js", path, reason, detail, missing: [...] }
//        reason: "module-not-found" (the file is not there)
//                "import-failed"    (it is there and does not load)
//                "export-missing"   (it loads and lacks the function the wiring calls)
//
// JANUS_ROOT is where those files are looked for: the sibling checkout `../../janus` (this repo's
// own layout), or EO_JANUS_ROOT when set — a test, or an operator with janus elsewhere, points it
// at a temp checkout. It changes WHERE the organs are read from; what a present spiral does is
// untouched.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const janusRoot = () => (process.env.EO_JANUS_ROOT ? path.resolve(process.env.EO_JANUS_ROOT) : path.join(HERE, "..", "..", "janus"));

// The modules the wiring calls, and the exports it needs from each.
export const SPIRAL_MODULES = Object.freeze([
  { module: "reasoning-spiral.js", rel: "native/organs/reasoning-spiral.js", needs: ["appendReasoning", "reasoningAt"] },
  { module: "consequence-verdict.js", rel: "native/organs/consequence-verdict.js", needs: ["consequenceVerdict"] },
]);

const loaded = new Map(); // path → module namespace (successes only: absence is re-checked each call)

/** Resolve the spiral layer. Never throws. Successful loads are cached; an absence is re-examined every call, so a
 *  proxy that was started before janus was merged notices the merge without a restart. */
export async function probeSpiral() {
  const root = janusRoot();
  const missing = [];
  const mods = {};
  for (const m of SPIRAL_MODULES) {
    const file = path.join(root, m.rel);
    if (!fs.existsSync(file)) { missing.push({ module: m.module, path: file, reason: "module-not-found", detail: `no file at ${file}` }); continue; }
    try {
      if (!loaded.has(file)) loaded.set(file, await import(pathToFileURL(file).href));
      const ns = loaded.get(file);
      const lacking = m.needs.filter((n) => typeof ns[n] !== "function");
      if (lacking.length) { missing.push({ module: m.module, path: file, reason: "export-missing", detail: `${m.module} does not export ${lacking.join(", ")}` }); continue; }
      Object.assign(mods, ns);
    } catch (e) {
      missing.push({ module: m.module, path: file, reason: "import-failed", detail: String(e?.message ?? e).split("\n")[0] });
    }
  }
  if (!missing.length) return { state: "present", root, ...mods, mods };
  return { state: "spiral-absent", root, module: missing[0].module, path: missing[0].path, reason: missing[0].reason, detail: missing[0].detail, missing };
}

/** The typed state without the function handles — what a result or a ledger line carries. */
export const layerRecord = (probe) => (probe.state === "present"
  ? { state: "present", root: probe.root }
  : { state: probe.state, module: probe.module, path: probe.path, reason: probe.reason, detail: probe.detail, missing: probe.missing.map((m) => m.module) });

/** One line a human reads. */
export const absentLine = (probe) =>
  `spiral-absent: ${probe.module} — ${probe.reason}: ${probe.detail}. No janus verdict exists for this run (its OK/ERROR above is khora's lint alone).`;
