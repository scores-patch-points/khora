// opencode-remember.test.mjs — the Remember stores' read/write contract:
// append-only, superseded-not-edited, on-demand match, typed gaps.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendEntry, readStore, noteFor, isKind, KINDS } from "./opencode-remember.mjs";

// Point all three stores at a private temp dir, restore the env after, so no
// test can touch the operator's real ~/.config/opencode stores.
function sandbox(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "remember-"));
  const keys = ["FOLD_USER_MEMORY", "FOLD_USER_REFS", "FOLD_SYSTEM_PROMPTS"];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env.FOLD_USER_MEMORY = path.join(dir, "user-memory.md");
  process.env.FOLD_USER_REFS = path.join(dir, "user-refs.md");
  process.env.FOLD_SYSTEM_PROMPTS = path.join(dir, "system-prompts.json");
  try {
    return fn(dir);
  } finally {
    for (const key of keys) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
}

test("kinds are the three named stores", () => {
  assert.deepEqual([...KINDS], ["memory", "refs", "system"]);
  assert.ok(isKind("memory") && isKind("refs") && isKind("system"));
  assert.equal(isKind("nope"), false);
});

test("memory: append a fact, read it back, and match only by need", () =>
  sandbox(() => {
    const added = appendEntry("memory", {
      claim: "khora is the canonical perceiver and ground-producer",
      tag: "about:user:repos",
      falsifying: "a repo whose role contradicts this",
    });
    assert.equal(added.ok, true);

    const store = readStore("memory");
    assert.equal(store.entries.length, 1);
    assert.equal(store.entries[0].tag, "about:user:repos");

    const hit = noteFor("memory", "which repo is the canonical perceiver?");
    assert.match(hit.note, /<fold-memory>/);
    assert.match(hit.note, /canonical perceiver/);

    const miss = noteFor("memory", "weather in Lisbon tomorrow");
    assert.equal(miss.gap, "no-match");
    assert.equal(miss.note, undefined);
  }));

test("memory: a later supersedes: retires an earlier claim without editing it", () =>
  sandbox(() => {
    const first = "khora lives in the eoreader7 repo";
    appendEntry("memory", { claim: first });
    assert.equal(readStore("memory").entries.length, 1);

    appendEntry("memory", {
      claim: "khora lives in the khora repo, not eoreader7",
      supersedes: first,
    });

    const entries = readStore("memory").entries;
    assert.equal(entries.length, 1);
    assert.match(entries[0].claim, /not eoreader7/);

    // The retired claim is gone from the read, never from the file (append-only).
    const raw = fs.readFileSync(process.env.FOLD_USER_MEMORY, "utf8");
    assert.match(raw, /khora lives in the eoreader7 repo/);
  }));

test("refs: an address the ask bears on rides by need, bytes never carried", () =>
  sandbox(() => {
    appendEntry("refs", {
      claim: "~/Documents/motorola-master-agreement.pdf — the Motorola Solutions agreement",
      tag: "about:user:access",
    });
    const hit = noteFor("refs", "summary of the motorola agreement");
    assert.match(hit.note, /<fold-refs>/);
    assert.match(hit.note, /motorola-master-agreement\.pdf/);

    const miss = noteFor("refs", "rename the worktree branch");
    assert.equal(miss.gap, "no-match");
  }));

test("system: a prompt is injected only when the ask's words bear on its when", () =>
  sandbox(() => {
    appendEntry("system", {
      name: "commit style",
      when: "commit message git",
      text: "Write conventional commit messages: type(scope): summary.",
    });
    const hit = noteFor("system", "help me write a commit message");
    assert.match(hit.note, /<fold-system>/);
    assert.match(hit.note, /conventional commit/);

    const miss = noteFor("system", "what is the boiling point of mercury");
    assert.equal(miss.gap, "no-match");
  }));

test("a missing store is a typed gap, never an error", () =>
  sandbox(() => {
    const store = readStore("refs");
    assert.equal(store.gap, "no-store");
    assert.deepEqual(store.entries, []);
    const note = noteFor("refs", "anything");
    assert.equal(note.gap, "no-store");
  }));

test("the same ask gives a byte-identical note (deterministic)", () =>
  sandbox(() => {
    appendEntry("memory", { claim: "scores-patch-points publishes", tag: "about:user:accounts" });
    appendEntry("memory", { claim: "clovenbradshaw-ctrl drafts", tag: "about:user:accounts" });
    const a = noteFor("memory", "which account publishes releases?");
    const b = noteFor("memory", "which account publishes releases?");
    assert.equal(a.note, b.note);
  }));

test("an unknown kind is a typed gap on both paths", () =>
  sandbox(() => {
    assert.equal(noteFor("bogus", "x").gap, "unknown-kind");
    assert.equal(appendEntry("bogus", { claim: "x" }).gap, "unknown-kind");
  }));
