// opencode-remember.mjs — the doorway's read/write of the operator's three
// standing stores, behind the Remember window in opencode × the fold:
//
//   memory  facts about the operator(s) — ~/.config/opencode/user-memory.md
//   refs    addresses the system may read on demand — user-refs.md
//   system  prompt text injected when an ask bears on it — system-prompts.json
//
// Same discipline as opencode-memory.mjs: append-only, superseded-not-edited
// (a later entry that names an earlier claim in `supersedes:` retires it —
// computed here, never by editing the old line), a typed gap never a guess,
// mechanical word overlap, no model, milliseconds, deterministic.
//
// NOTHING here is bulk-loaded into a prompt. The doorway calls noteFor(kind,
// ask) and injects only the entries the ask's own words bear on; the window
// calls readStore(kind) to show everything. The prompt sees the residue, the
// window sees the store — the same split the mouth-last law draws everywhere.
//
// The markdown stores speak opencode-memory.mjs's grammar verbatim (## tag /
// - claim / two-space meta), so the parser is shared, never re-derived. The
// system store is JSON because a prompt is multi-line and a line grammar
// cannot carry it. The surface-side mirror of these stores lives in holodeck;
// when a rule lands in one store, mirror it in the other (same as
// content-rules.md ↔ content-rules.json).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseMarkdown, query, MEMORY_STOP } from "./opencode-memory.mjs";

const configDir = () => process.env.FOLD_OPENCODE_CONFIG ?? path.join(os.homedir(), ".config", "opencode");

// One descriptor per kind. `file` is a function so an env override read at call
// time (tests, a harness door) is honored without reloading the module.
export const STORES = Object.freeze({
  memory: {
    file: () => process.env.FOLD_USER_MEMORY ?? path.join(configDir(), "user-memory.md"),
    format: "markdown",
    tag: "about:user:notes",
    open: "<fold-memory>",
    close: "</fold-memory>",
    lead: "Facts about the operator this ask bears on (read-only, folded from history):",
  },
  refs: {
    file: () => process.env.FOLD_USER_REFS ?? path.join(configDir(), "user-refs.md"),
    format: "markdown",
    tag: "about:user:access",
    open: "<fold-refs>",
    close: "</fold-refs>",
    lead: "Addresses the operator has given the system access to, that this ask bears on (read on demand — the bytes are not carried here):",
  },
  system: {
    file: () => process.env.FOLD_SYSTEM_PROMPTS ?? path.join(configDir(), "system-prompts.json"),
    format: "json",
    open: "<fold-system>",
    close: "</fold-system>",
    lead: "Standing instructions the operator attached to asks like this one:",
  },
});

export const KINDS = Object.freeze(Object.keys(STORES));

export const isKind = (kind) => Object.prototype.hasOwnProperty.call(STORES, kind);

const words = (text) => String(text ?? "").toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? [];

// A retired claim is one a LATER entry named in `supersedes:`. The old line is
// never edited; retirement is a read-time projection, so the store stays
// append-only under any number of concurrent writers.
function retired(entries) {
  const named = [];
  for (const entry of entries) {
    if (!entry.supersedes) continue;
    for (const claim of String(entry.supersedes).split(",").map((s) => s.trim()).filter(Boolean)) named.push(claim);
  }
  return named;
}

const isRetired = (entry, named) =>
  entry.status === "superseded" || named.some((claim) => entry.claim === claim || entry.claim.startsWith(claim));

// The whole store, read back to the window: every current entry, retired ones
// projected out, never edited. A missing store is an empty read, not an error —
// the window shows an empty list and the door injects nothing.
export function readStore(kind) {
  const store = STORES[kind];
  if (!store) return { gap: "unknown-kind", kind, entries: [] };
  const at = store.file();
  let raw;
  try {
    raw = fs.readFileSync(at, "utf8");
  } catch {
    return { kind, at, entries: [], total: 0, gap: "no-store" };
  }
  if (store.format === "markdown") {
    const all = parseMarkdown(raw);
    const named = retired(all);
    const entries = all
      .filter((entry) => !isRetired(entry, named))
      .map((entry) => ({
        claim: entry.claim,
        tag: entry.tag,
        status: entry.status ?? "current",
        ...(entry.falsifying ? { falsifying: entry.falsifying } : {}),
        ...(entry.provenance ? { provenance: entry.provenance } : {}),
        ...(entry.supersedes ? { supersedes: entry.supersedes } : {}),
      }));
    return { kind, at, entries, total: all.length };
  }
  const doc = parseJson(raw);
  const items = Array.isArray(doc.items) ? doc.items : [];
  const named = new Set(items.flatMap((item) => (item && item.supersedes ? [String(item.supersedes)] : [])));
  const entries = items
    .filter((item) => item && !named.has(String(item.id ?? item.name ?? "")))
    .map((item) => ({
      id: item.id,
      name: item.name ?? item.id,
      when: item.when ?? "",
      text: String(item.text ?? ""),
      ...(item.added ? { added: item.added } : {}),
      ...(item.supersedes ? { supersedes: item.supersedes } : {}),
    }));
  return { kind, at, entries, total: items.length };
}

function parseJson(raw) {
  try {
    return JSON.parse(raw) ?? {};
  } catch {
    return {};
  }
}

// The on-demand read the doorway injects: only the entries this ask's words
// bear on. No match, a missing store, or an empty store is a TYPED gap — the
// caller injects nothing and opencode runs exactly as upstream.
export function noteFor(kind, ask, { limit = 5, minTerms = 1 } = {}) {
  const store = STORES[kind];
  if (!store) return { gap: "unknown-kind", kind };
  const read = readStore(kind);
  const entries = read.entries ?? [];
  if (!entries.length) return { gap: read.gap ?? "empty", kind, at: read.at };
  const hits =
    store.format === "markdown"
      ? query(entries, ask, { limit, minTerms })
      : queryJson(entries, ask, { limit, minTerms });
  if (!hits.length) return { gap: "no-match", kind, entries: entries.length };
  const lines = hits.map((hit) =>
    store.format === "markdown"
      ? `- ${hit.claim}`
      : `- ${hit.name}${hit.when ? ` (when: ${hit.when})` : ""}: ${hit.text}`,
  );
  return {
    kind,
    note: [store.open, store.lead, ...lines, store.close].join("\n"),
    count: hits.length,
    entries: entries.length,
  };
}

function queryJson(entries, ask, { limit = 5, minTerms = 1 } = {}) {
  const terms = new Set(words(ask).filter((word) => !MEMORY_STOP.has(word)));
  const scored = entries
    .map((entry) => {
      const hay = `${entry.name ?? ""} ${entry.id ?? ""} ${entry.when ?? ""} ${entry.text ?? ""}`;
      const hits = new Set(words(hay).filter((word) => terms.has(word)));
      return { entry, score: hits.size };
    })
    .filter((row) => row.score >= minTerms)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((row) => row.entry);
}

// The append the window writes with: one new entry, the old store untouched.
// A markdown entry lands under its tag section (created if absent); a system
// entry is one more item. supersedes: names an earlier claim to retire.
export function appendEntry(kind, input = {}) {
  const store = STORES[kind];
  if (!store) return { gap: "unknown-kind", kind };
  const at = store.file();
  return store.format === "markdown" ? appendMarkdown(store, at, input) : appendJson(store, at, input);
}

function appendMarkdown(store, at, input) {
  const claim = String(input.claim ?? "").trim();
  if (!claim) return { gap: "no-claim" };
  const tag = String(input.tag ?? store.tag).trim() || store.tag;
  const meta = [["status", "current"]];
  for (const key of ["falsifying", "provenance", "supersedes"]) {
    const value = String(input[key] ?? "").trim();
    if (value) meta.push([key, value]);
  }
  const block = [`- ${claim}`, ...meta.map(([key, value]) => `  ${key}: ${value}`)].join("\n");
  let text = "";
  try {
    text = fs.readFileSync(at, "utf8");
  } catch {
    /* a fresh store */
  }
  const out = text.split("\n");
  const header = `## ${tag}`;
  const start = out.findIndex((line) => line.trim() === header);
  if (start === -1) {
    if (out.length > 1 || out[0] !== "") out.push("");
    out.push(header, "", block);
  } else {
    let end = out.length;
    for (let i = start + 1; i < out.length; i++) {
      if (out[i].startsWith("## ")) {
        end = i;
        break;
      }
    }
    while (end > start + 1 && out[end - 1].trim() === "") end--;
    out.splice(end, 0, "", block);
  }
  try {
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, out.join("\n"));
  } catch (error) {
    return { gap: "write-failed", why: error.message, at };
  }
  return { ok: true, kind: "memory", at, claim, tag };
}

function appendJson(store, at, input) {
  const text = String(input.text ?? "").trim();
  if (!text) return { gap: "no-text" };
  let doc = { items: [] };
  try {
    doc = parseJson(fs.readFileSync(at, "utf8"));
  } catch {
    /* a fresh store */
  }
  if (!Array.isArray(doc.items)) doc.items = [];
  const id = String(input.id ?? "").trim() || `sp-${Date.now().toString(36)}`;
  const name = String(input.name ?? "").trim() || id;
  doc.items.push({
    id,
    name,
    when: String(input.when ?? "").trim(),
    text,
    added: new Date().toISOString(),
    ...(String(input.supersedes ?? "").trim() ? { supersedes: String(input.supersedes).trim() } : {}),
  });
  try {
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, JSON.stringify(doc, null, 2) + "\n");
  } catch (error) {
    return { gap: "write-failed", why: error.message, at };
  }
  return { ok: true, kind: "system", at, id, name };
}
