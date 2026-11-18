// name-gender.js — the gender of a being from the words of its own mentions, ASKED OF A GIVER and held as an OVERCOMEABLE prior (identity/novels PREREG-ROUND20 NOTE-1).
// A giver is a table with its provenance (./name-gender/<lang>.json: NameGender@1: words -> [masc, fem] counts, its source and licence named inside). The rule: a being's gender is known when, summed over the words of its mention spans the giver holds,
// one gender has strictly more than the other and the total is at least 2 (the declared minimum of two observations used by the name table). The result is a Map ref -> "m" | "f" for pronouns.js `priorGender`: the rung's own clause-local evidence overrides it.
// Further givers (a Wikidata given-name giver through the hyperlexicon door, cached) answer the same shape: { words } or { ask }. Pure. Status: EXPERIMENTAL.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); let cached = null;
export function loadNameGender(file = path.join(HERE, "name-gender", "eng.json")) { try { const j = JSON.parse(fs.readFileSync(file, "utf8")); if (file.endsWith(path.join("name-gender", "eng.json"))) cached = j; return j; } catch { return null; } }
export const MIN_EVIDENCE = 2;
export function priorGenderFromNames({ text, cast, table }) {
  const out = new Map(); if (!table?.words) return out; const T = String(text ?? "");
  for (const b of cast ?? []) { let m = 0, f = 0; for (const [s, e] of b.mentionSpans ?? []) for (const w of T.slice(s, e).toLowerCase().match(/[\p{L}\p{N}’'-]+/gu) ?? []) { const c = table.words[w]; if (c) { m += c[0]; f += c[1]; } } if (m + f >= MIN_EVIDENCE && m !== f) out.set(b.ref, m > f ? "m" : "f"); }
  return out;
}
