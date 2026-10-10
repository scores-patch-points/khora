#!/usr/bin/env node
// eo-teachings/stack-digest.mjs — the whole code stack, read by eoreader7.
//
// The reader turned on its own repository. computeSelf() (self.mjs) already
// descends eoreader7/native + the-fold and reports every organ handle, its
// cell, and whether its teaching is verified to a giver's bytes. To that,
// this adds the governance layer (archon-holocracy: worktree-archon
// missions, circles, the append-only ledger) and the goals (the seed). The
// result is the honest, current map of the system that Pythia hands every
// archon before it speaks about this project — so a critique of "the setup
// of the system and its goals" is grounded in the real stack, not in a
// guess about it.
//
//   node stack-digest.mjs          print the digest
//   node stack-digest.mjs --json   the raw facts it was built from
import fs from "node:fs";
import path from "node:path";
import { computeSelf } from "./self.mjs";

const ROOT = "/Users/mlacy/Documents/3.0";
const HOLOCRACY = path.join(ROOT, "archon-holocracy");

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}
function lineCount(p) {
  try { return fs.readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).length; } catch { return 0; }
}

export function stackDigest({ readDate = null } = {}) {
  const self = computeSelf({ readDate });
  const archons = readJson(path.join(HOLOCRACY, "archons.json"), {}).entries ?? {};
  const circles = readJson(path.join(HOLOCRACY, "circles.json"), {}).circles ?? [];
  const orphaned = readJson(path.join(HOLOCRACY, "circles.json"), {}).orphaned ?? [];
  const ledgerN = lineCount(path.join(HOLOCRACY, "ledger.jsonl"));
  const disputesN = lineCount(path.join(HOLOCRACY, "disputes.jsonl"));

  const lines = [];
  lines.push("# THE CODE STACK, READ BY EOREADER7'S OWN SELF-MODEL");
  lines.push("");
  lines.push("WHAT THIS IS — a recursive reader that perceives by difference from a ground it rebuilds, and the governance around that reader.");
  lines.push("  eoreader7         the reading kernel: native/kernel (kinds, relations, corroboration) + native/organs (the handled organs below)");
  lines.push("  the-fold          the surface that renders the reading for a human");
  lines.push("  eo-teachings      the ethos corpus: verified teachings (sources/ + manifest/) behind every organ handle");
  lines.push("  archon-holocracy  the governance registry: Ostrom's eight commons principles scored over every worktree-archon");
  lines.push("");
  lines.push("THE GOALS (the seed, and the composition law):");
  lines.push("  perceive only by difference from a ground you rebuild;");
  lines.push("  testify only from a ground you kept;");
  lines.push("  stay alive by never letting the ground close.");
  lines.push("  A speaker's every output is testimony. The two deaths: confabulation (speaking without witness) and sclerosis (the ground closing to the shape of the asker).");
  lines.push("  ETHOS BEFORE LOGOS: what cannot pass the ground gate is never graded — gradeLogos is structurally unreachable on a refused claim (composition.mjs).");
  lines.push("  Pathos never gates and never grades; it discloses whose stake the claim is. A null is the same computation re-run on perturbed input; an ungrounded result is typed, never blocked, never rendered like a grounded one.");
  lines.push("");
  lines.push(`THE SELF-PORTRAIT (computeSelf): ${self.handles} handled organs · ${self.verified} verified to givers' bytes · ${self.unwitnessed} unwitnessed (paraphrase only) · ${self.emptyCells.length} of 27 address-space cells empty.`);
  lines.push("");
  lines.push("THE ORGANS (handle — organ file — witness):");
  for (const r of self.registry) lines.push(`  ${r.handle} — ${r.file} — ${r.teaching.status === "verified" ? "verified" : "unwitnessed"}`);
  lines.push("");
  lines.push("THE GOVERNANCE — worktree-archons (id — mission — rhetoric):");
  for (const [id, a] of Object.entries(archons)) lines.push(`  ${id} — ${a.mission} (${a.rhetoric})`);
  lines.push("");
  lines.push("THE CIRCLES (name — purpose):");
  for (const c of circles) lines.push(`  ${c.name} — ${c.purpose}`);
  if (orphaned.length) lines.push(`  ORPHANED: ${orphaned.map((o) => o.id).join(", ")}`);
  lines.push("");
  lines.push(`THE GOVERNANCE LEDGER: ${ledgerN} witnessed events · ${disputesN} dispute/arbitration records — append-only, never rewritten.`);
  lines.push("");
  return lines.join("\n");
}

const isMain = (() => { try { return import.meta.url === `file://${path.resolve(process.argv[1] ?? "")}`; } catch { return false; } })();
if (isMain) {
  const digest = stackDigest({ readDate: new Date().toISOString().slice(0, 10) });
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ schema: "EOStackDigest@1", chars: digest.length, body: digest }, null, 2));
  } else {
    console.log(digest);
  }
}