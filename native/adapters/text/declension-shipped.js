// declension-shipped.js — the declension priors this repo ships, one file per language stem (./declension-priors/<stem>.json, a DeclensionPrior@1 mined from a treebank's own proper-noun form/lemma pairs).
//   shippedDeclensionFor(stem) -> { prior } | null
// The canonical read (read-process.mjs) passes it as `declension` (a function of the language stem): a language with a shipped prior folds the case forms of one name into one being, any other reads exactly as before.
// Status: EXPERIMENTAL (Ancient Greek only today; identity/pronouns-multilingual/grc/).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "declension-priors");
const stemKey = (stem) => String(stem ?? "").toLowerCase().replace(/[-_].*$/, "");
const cache = new Map();
export function shippedDeclensionFor(stem) {
  const k = stemKey(stem); if (!k) return null; if (cache.has(k)) return cache.get(k);
  let out = null;
  try { const p = JSON.parse(fs.readFileSync(path.join(DIR, `${k}.json`), "utf8")); if (p && Array.isArray(p.rules) && p.rules.length) out = { prior: p }; } catch { /* none shipped: the read is unchanged */ }
  cache.set(k, out); return out;
}
