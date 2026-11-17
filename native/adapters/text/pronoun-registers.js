// pronoun-registers.js — which pronoun class the canonical read binds with, per language.
//
//   registerFor(stem)                 -> { register, origin } | null     a measured PronounPrior@1 for the language (./pronoun-registers/<stem>.json, else <priors>/pronoun-<stem>.json)
//   presenceOptionsFor(stem, dials)   -> options for resolvePronounsByPresence | { gap } | for English the built-in class
//   UNSPACED_STEMS                    the scripts written without spaces between words (the finder then matches the longest register form wherever it stands)
//
// The canonical read (read-process.mjs) passes `presenceOptionsFor` as readerOptions.pronounPresence; read-core.mjs calls it with the language stem it settled on. A language with no register gets
// { gap: { gap: "pronoun_presence_no_register" } }, filed on the entry: never the English class applied silently to another language. Status: EXPERIMENTAL.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultPronounPresence } from "./pronoun-presence-chosen.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SHIPPED_DIR = path.join(HERE, "pronoun-registers");
export const UNSPACED_STEMS = Object.freeze(new Set(["cmn", "zho", "yue", "jpn", "tha", "khm", "lao", "mya"]));
const stemKey = (stem) => String(stem ?? "").toLowerCase().replace(/[-_].*$/, "");
const priorsDir = () => process.env.KHORA_PRIORS_DIR ?? path.join(os.homedir(), "Documents", "janus", "priors");
const cache = new Map();

export function registerFor(stem) {
  const k = stemKey(stem); if (!k) return null; if (cache.has(k)) return cache.get(k);
  let out = null;
  for (const [origin, file] of [["shipped", path.join(SHIPPED_DIR, `${k}.json`)], ["priors", path.join(priorsDir(), `pronoun-${k}.json`)]]) {
    try { const r = JSON.parse(fs.readFileSync(file, "utf8")); if (r && r.forms && Object.keys(r.forms).length) { out = { register: r, origin, file }; break; } } catch { /* absent or unreadable: next */ }
  }
  cache.set(k, out); return out;
}
export const clearRegisterCache = () => cache.clear();

export function presenceOptionsFor(stem, dials = defaultPronounPresence()) {
  const k = stemKey(stem);
  if (k === "eng" || k === "en") return { ...dials };
  const r = registerFor(k);
  if (!r) return { gap: { gap: "pronoun_presence_no_register", stem: k, detail: `no pronoun register for ${k || "this language"} (native/adapters/text/pronoun-registers/${k}.json or a pronoun-${k}.json prior): no pronoun was bound` } };
  return { ...dials, language: k, pronounClass: r.register, unspaced: UNSPACED_STEMS.has(k), registerOrigin: r.origin, ...(r.register.beings ? { beings: r.register.beings } : {}) };
}
