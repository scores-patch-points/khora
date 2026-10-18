// opencode-memory.mjs — the doorway's read of the USER-MEMORY surface.
//
// Facts ABOUT THE OPERATOR(S), not about content. The surface-side pure model
// is holodeck/holodeck-memory.js and its store holodeck/user-memory.json; the
// opencode-side store is ~/.config/opencode/user-memory.md. They are the SAME
// protocol, mirrored by hand — exactly like content-rules.md ↔
// content-rules.json — so this file parses the same markdown WITHOUT importing
// the surface's module (khora never depends on a surface, and the doorway is
// mechanical: no model, no guess, milliseconds, deterministic).
//
// The grain differs from content-rules in one way only: a claim is tagged
// `about:user:*` (or `about:world:*`). Everything else is the same discipline:
//
//   append-only     an entry is never edited; it is superseded and kept below
//   superseded      the old fact stays, marked, with the claim that replaced it
//   typed gap       an unknown tag is a gap, never a silently wrong read
//   falsifying      every entry names what would prove it wrong
//   provenance      every entry names the addresses that earned it
//
// Grammar (mechanical, so the doorway parses the file without shared code):
//
//   ## <tag>        starts a tag section
//   - <claim>       an entry (status defaults to "current")
//     status: current | superseded
//     supersedes: <claim this replaces>
//     falsifying: <what would prove this wrong>
//     provenance: <address>, <address>
//
// Blank lines and any line outside the grammar are ignored.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The stopword fold. A stopword never names a memory, so it is not counted.
// Mirrored word-for-word with holodeck/holodeck-memory.js's MEMORY_STOP; edit
// both together or the doorway and the surface will disagree on what a match is.
export const MEMORY_STOP = new Set([
  "the", "and", "for", "are", "was", "were", "been", "being", "with", "this",
  "that", "these", "those", "from", "into", "onto", "about", "which", "whose",
  "does", "have", "has", "had", "having", "what", "when", "where", "who", "whom",
  "why", "how", "not", "nor", "its", "our", "your", "their", "there", "here",
  "then", "than", "will", "would", "could", "should", "can", "may", "might",
  "must", "shall", "they", "them", "you", "but", "also", "only", "very", "just",
  "some", "any", "each", "both", "other", "such",
]);

// The opencode-side store. Override with FOLD_USER_MEMORY (the surface-side
// store, holodeck/user-memory.json, is parsed by the surface, not here).
export const USER_MEMORY = () => process.env.FOLD_USER_MEMORY ?? path.join(os.homedir(), ".config", "opencode", "user-memory.md");

const words = (text) => String(text ?? "").toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? [];

// Parse the markdown store into entries. Same grammar as
// holodeck-memory.js parseMarkdown; an entry needs a claim and a tag, anything
// else is ignored (a preamble, prose, a malformed line).
export function parseMarkdown(md) {
  const entries = [];
  let tag = null;
  let cur = null;
  const push = () => {
    if (cur && cur.claim && cur.tag) entries.push(cur);
    cur = null;
  };
  for (const raw of String(md ?? "").split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.startsWith("## ")) { push(); tag = line.slice(3).trim(); continue; }
    if (line.startsWith("- ")) { push(); cur = { claim: line.slice(2).trim(), tag: tag ?? "" }; continue; }
    if (cur && /^\s{2}[a-z]+:/.test(line)) {
      const m = line.trim().match(/^([a-z]+):\s*(.*)$/);
      if (m) {
        const key = m[1], value = m[2].trim();
        if (key === "provenance") cur.provenance = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
        else cur[key] = value;
      }
      continue;
    }
    // blank or preamble: ignore
  }
  push();
  return entries;
}

const current = (entries) => entries.filter((e) => e.status !== "superseded");

// Mechanical recall: the terms an ask shares with a claim, never a semantic
// guess. A claim whose words appear in the ask rides; everything else stays
// out. Mirrored with holodeck-memory.js query().
export function query(entries, ask, { limit = 5, minTerms = 1 } = {}) {
  const terms = new Set(words(ask).filter((w) => !MEMORY_STOP.has(w)));
  const scored = current(entries).map((e) => {
    const hay = `${e.claim} ${e.tag}`;
    const hits = new Set(words(hay).filter((w) => terms.has(w)));
    return { entry: e, score: hits.size };
  }).filter((s) => s.score >= minTerms)
    .sort((a, b) => b.score - a.score || (a.entry.when ?? "").localeCompare(b.entry.when ?? ""));
  return scored.slice(0, limit).map((s) => s.entry);
}

// The note the doorway injects when the ask bears on the operator's facts: a
// read-only list of the claims that matched, tagged for the model. No match, a
// missing store, or an empty store is a TYPED gap — the caller injects nothing
// and opencode runs exactly as upstream.
export function memoryNote(ask, { file } = {}) {
  const at = file ?? USER_MEMORY();
  let md;
  try { md = fs.readFileSync(at, "utf8"); } catch { return { gap: "no-store", at }; }
  const entries = parseMarkdown(md);
  const hits = query(entries, ask);
  if (!hits.length) return { gap: "no-match", entries: current(entries).length };
  const lines = hits.map((e) => `- ${e.claim}`);
  return {
    note: [
      "<fold-memory>",
      "Facts about the operator this ask bears on (read-only, folded from history):",
      ...lines,
      "</fold-memory>",
    ].join("\n"),
    claims: hits.map((e) => e.claim),
    count: hits.length,
  };
}
