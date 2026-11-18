// name-prior.js — a measured ruling of who is NOT a person, from the words of a being's own mentions (identity/novels PREREG-ROUND14.md).
// The table (./name-prior/eng.json, scripts/build-name-prior.mjs) counts, per word, how often GUM's gold types a mention carrying it as a person versus anything else.
// A being is non-personal iff, summed over the words of its mention spans that the table knows, not-person > person and the total >= 2. A word the table does not know rules nothing.
// Pure; English only (the table is English). Status: EXPERIMENTAL.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); let cached = null;
export function loadNamePrior(file = path.join(HERE, "name-prior", "eng.json")) { if (file === path.join(HERE, "name-prior", "eng.json") && cached) return cached; try { const p = JSON.parse(fs.readFileSync(file, "utf8")); if (file.endsWith("eng.json")) cached = p; return p; } catch { return null; } }
export const MIN_EVIDENCE = 2;
export function nonPersonalFromNames({ text, cast, prior }) {
  const out = new Set(); if (!prior?.words) return out; const T = String(text ?? "");
  for (const b of cast ?? []) { let p = 0, n = 0; for (const [s, e] of b.mentionSpans ?? []) for (const w of T.slice(s, e).toLowerCase().match(/[\p{L}\p{N}’'-]+/gu) ?? []) { const c = prior.words[w]; if (c) { p += c[0]; n += c[1]; } } if (n > p && n + p >= MIN_EVIDENCE) out.add(b.ref); }
  return out;
}
