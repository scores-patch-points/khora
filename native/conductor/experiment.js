// conductor/experiment.js — the first useful experiment: a resumable
// investigation over a small public document with supporting, contradictory
// and broken citations.
//
// The document makes a factual claim. Three citations are attached:
//   source-a  — supporting (its bytes carry the evidence needle)
//   source-b  — contradictory (its bytes carry a conflicting needle)
//   source-c  — broken (the permanent address does not resolve)
//
// The conductor is given this corpus as its session workspace. It reads the
// sources through khora (byte addressing + recurrence), derives through janus
// (supporting / contradiction / broken), constructs the next transition
// (read → materialize), executes it for real (writes the addressed artifact),
// and retains the FoldTrace@1 durably. A correction midway changes the next
// actual action; an interrupt and resume reconcile receipt without duplicate
// effects.

import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const EXPERIMENT_SCHEMA = "ConductorExperiment@1";
export const EXPERIMENT_VERSION = 1;

export const DOCUMENT = {
  title: "The Keeper's Office — a note on its founding year",
  claim: "The Office of the Keeper was created in 1907.",
  text: [
    "The Office of the Keeper was created in 1907.",
    "This note relies on three sources:",
    "  [a] the Marden Act text — supports the 1907 founding (source-a.txt)",
    "  [b] the Board's register — places the founding in 1912 (source-b.txt)",
    "  [c] the Voss memoir — quoted but never retrieved (source-c.txt, broken)",
  ].join("\n"),
  needles: ["1907", "1912", "Office of the Keeper", "Eleanor Voss"],
};

export const SOURCES = Object.freeze({
  "source-a.txt": "The 1907 Marden Act established the Office of the Keeper and named its clerk, Eleanor Voss.",
  "source-b.txt": "The Board's register records that the Office of the Keeper was created in 1912.",
  // source-c.txt is deliberately NOT written — its address is broken.
});

/** Which sources the fixture actually materializes (source-c is absent). */
export const PRESENT_SOURCES = Object.freeze(Object.keys(SOURCES));

/**
 * materializeExperiment(dir) — write the document + the present sources into
 * `dir` as real files, so the conductor's tool registry reads real bytes.
 * source-c is never written: that is the broken citation.
 */
export function materializeExperiment(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "document.txt"), DOCUMENT.text, "utf8");
  for (const [name, text] of Object.entries(SOURCES)) writeFileSync(join(dir, name), text, "utf8");
  return {
    schema: EXPERIMENT_SCHEMA,
    version: EXPERIMENT_VERSION,
    dir,
    document: join(dir, "document.txt"),
    present: Object.keys(SOURCES),
    broken: ["source-c.txt"],
  };
}

/** Seed a conductor session workspace with the experiment corpus. */
export function seedSessionWorkspace(workspace) {
  const out = materializeExperiment(workspace);
  return out;
}

export const EXPERIMENT = {
  schema: EXPERIMENT_SCHEMA,
  version: EXPERIMENT_VERSION,
  document: DOCUMENT,
  sources: SOURCES,
  present: PRESENT_SOURCES,
  broken: ["source-c.txt"],
  materialize: materializeExperiment,
  seed: seedSessionWorkspace,
  describe: "a small public document with supporting, contradictory and broken citations — the first useful experiment",
};