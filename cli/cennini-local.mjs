#!/usr/bin/env node
// cli/cennini-local.mjs — J1 LOCAL: did anything leave the machine, and did only a registered small model answer? (2026-10-13)
//
// The Fold's coding door reports who actually served each draw in its own response: `served: { asked, by, mouths:
// [{ asked, servedBy, tier, host, reason, draws }] }`. This reads that record and nothing else. It is a JUDGE over
// recorded runs, not a probe of the network: it can only say what the door itself disclosed, and says so.
//
//   no-egress         every mouth that served a draw has host "local" (an off-device mouth is the only way a draw
//                     leaves the machine through the door, and it is opt-in)
//   small-model-only  every model that served a draw is in the registered set (the proxy's /v1/models list, the
//                     embedding model excluded as it never writes a draw)
//
// THE CONTROL BUILT TO FAIL (the facets' own controls): a served record whose mouth is remote, and one served by a
// model outside the set, must both be flagged by the same judge. KNOWN_BAD holds them; the exam's evidence row says
// whether they were rejected at the same n.
//
// WHAT THIS DOES NOT SEE. Traffic the door does not mention (a hook, a tool, a browser, the Claude Code session
// driving it). `stays-local` in J7 judges the loop's own observer; this judges the door's served record. Neither is a
// packet capture, and the row says "door-disclosed".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** a registered mouth is a small local generative model; the embedding model never serves a draw */
export const registeredFrom = (modelList) =>
  new Set((modelList?.data ?? modelList ?? []).map((m) => String(m.id ?? m).replace(/^fold:/, "")).filter((id) => !/embed/i.test(id)));

/**
 * judgeServed(served, { registered }) -> { ok, local, small, hosts, models, violations:[{kind, ...}] }
 * `served` is the door's own record (or null: nothing to judge is a typed gap, never a pass).
 */
export function judgeServed(served, { registered } = {}) {
  if (!served || !Array.isArray(served.mouths)) return { ok: false, gap: "no-served-record", local: null, small: null, hosts: [], models: [], violations: [] };
  const hosts = [...new Set(served.mouths.map((m) => String(m.host ?? "unknown")))].sort();
  const models = [...new Set(served.mouths.map((m) => String(m.servedBy ?? m.asked ?? "unknown")))].sort();
  const violations = [];
  for (const m of served.mouths) {
    if (String(m.host) !== "local") violations.push({ kind: "egress", host: String(m.host ?? "unknown"), model: String(m.servedBy ?? "unknown") });
    if (registered && !registered.has(String(m.servedBy))) violations.push({ kind: "unregistered-model", model: String(m.servedBy ?? "unknown") });
  }
  return {
    ok: true, hosts, models, violations,
    local: !violations.some((v) => v.kind === "egress"),
    small: registered ? !violations.some((v) => v.kind === "unregistered-model") : null,
  };
}

/** the planted violations the same judge must flag (the facets' controls) */
export const KNOWN_BAD = Object.freeze({
  egress: { asked: "frontier", by: ["claude-opus-5-5"], mouths: [{ asked: "frontier", servedBy: "claude-opus-5-5", tier: "full", host: "remote", draws: 1 }] },
  larger: { asked: "big", by: ["llama3:70b"], mouths: [{ asked: "big", servedBy: "llama3:70b", tier: "full", host: "local", draws: 1 }] },
});

/**
 * evidenceFrom(records, { registered }) -> { n, noEgress, smallOnly, controls, rows }
 * `records` carry the door's `served`; a record without one is counted as `unjudged`, never as clean.
 */
export function evidenceFrom(records, { registered } = {}) {
  const live = records.filter((r) => r.live !== false);
  const judged = live.map((r) => judgeServed(r.served ?? r.door?.served ?? null, { registered }));
  const ok = judged.filter((j) => j.ok);
  const bad = {
    egress: judgeServed(KNOWN_BAD.egress, { registered }),
    larger: judgeServed(KNOWN_BAD.larger, { registered }),
  };
  return {
    n: live.length, judged: ok.length, unjudged: judged.length - ok.length,
    egressViolations: ok.filter((j) => j.local === false).length,
    modelViolations: ok.filter((j) => j.small === false).length,
    models: [...new Set(ok.flatMap((j) => j.models))].sort(),
    hosts: [...new Set(ok.flatMap((j) => j.hosts))].sort(),
    controls: { egressFlagged: bad.egress.local === false, largerFlagged: registered ? bad.larger.small === false : null },
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const runs = arg("--runs"), models = arg("--models");
  if (!runs) { console.error("usage: node cli/cennini-local.mjs --runs RUNS.json [--models /v1/models.json]"); process.exit(2); }
  const j = JSON.parse(fs.readFileSync(runs, "utf8"));
  const records = Array.isArray(j) ? j : j.records ?? [];
  const registered = models ? registeredFrom(JSON.parse(fs.readFileSync(models, "utf8"))) : null;
  console.log(JSON.stringify(evidenceFrom(records, { registered }), null, 1));
}
