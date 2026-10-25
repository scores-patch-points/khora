// adapters/text/wiktionary-pack.js — THE HYPERLEXICON'S LOCAL GIVER under Node: the English Wiktionary slim pack (2026-10-24).
//
// The pack is the 2026-10-01 English Wiktionary dump shrunk to every language's forms (CC BY-SA 4.0), read by Zenodotus's own
// reader (scripts/wiktionary/lookup.mjs, `Dictionary.resolve(form, { learn: false })`). This adapter only finds the two files and
// shapes the answer the lexicon organ (organs/lexicon.js) expects. Nothing reaches the network, nothing is learned or written
// (learned/changed/delta all go to /dev/null).
//
//   WIKTIONARY_PACK     the pack file (default: the newest ~/.cache/live_priors/wiktionary/wiktionary-slim-<date>[-v<n>].pack)
//   WIKTIONARY_READER   the reader module (default: <workspace root>/Zenodotus/scripts/wiktionary/lookup.mjs)
//
//   wiktionaryAsk()     → ask(forms, lang) for makeLexicon, or null with .gap when either file is absent (a typed gap)
//   localLexicon(lang)  → makeLexicon({ ask }) over the pack, with .gap when there is none

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeLexicon } from "../../organs/lexicon.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACK_DIR = path.join(os.homedir(), ".cache", "live_priors", "wiktionary");
const PACK_NAME = /^wiktionary-slim-(\d{4}-\d{2}-\d{2})(?:-v(\d+))?\.pack$/;

export function packPath() {
  if (process.env.WIKTIONARY_PACK) return process.env.WIKTIONARY_PACK;
  let names = [];
  try { names = fs.readdirSync(PACK_DIR); } catch { return null; }
  const best = names.map((f) => f.match(PACK_NAME)).filter(Boolean)
    .sort((a, b) => a[1].localeCompare(b[1]) || Number(a[2] || 1) - Number(b[2] || 1)).pop();
  return best ? path.join(PACK_DIR, best[0]) : null;
}

export function readerPath() {
  if (process.env.WIKTIONARY_READER) return process.env.WIKTIONARY_READER;
  // native/adapters/text → the repository → the workspace root, beside it Zenodotus
  const p = path.join(HERE, "..", "..", "..", "..", "Zenodotus", "scripts", "wiktionary", "lookup.mjs");
  return fs.existsSync(p) ? p : null;
}

let dict = null; // null: not tried · false: absent · Dictionary
let gap = null;
async function dictionary() {
  if (dict !== null) return dict || null;
  const pack = packPath(), reader = readerPath();
  if (!pack || !fs.existsSync(pack)) { dict = false; gap = "no Wiktionary pack on this machine"; return null; }
  if (!reader || !fs.existsSync(reader)) { dict = false; gap = "the pack reader (Zenodotus scripts/wiktionary/lookup.mjs) is not beside this repository"; return null; }
  try {
    const { Dictionary } = await import(pathToFileURL(reader).href);
    dict = new Dictionary({ pack, learned: "/dev/null", changed: "/dev/null", delta: "/dev/null" });
  } catch (e) { dict = false; gap = `the pack reader failed to load: ${String(e?.message ?? e).slice(0, 80)}`; return null; }
  return dict;
}

const giverOf = (pack) => ({ name: "English Wiktionary", edition: "en", snapshot: (pack.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null, pack: path.basename(pack), licence: "CC BY-SA 4.0", via: "local pack, read by Zenodotus scripts/wiktionary/lookup.mjs" });
const senseOf = (s) => ({ of: s.of ?? null, tags: s.tags ?? [], gloss: Array.isArray(s.g) && s.g.length ? s.g[s.g.length - 1] : null });

/** ask(forms, lang) → { giver, results } | { gap }: the lexicon organ's giver over the local pack. */
export async function wiktionaryAsk(forms, lang = "en") {
  const d = await dictionary();
  if (!d) return { gap };
  const results = {};
  for (const f of forms) {
    let r = null; try { r = d.resolve(f, { learn: false }); } catch { r = null; }
    const own = r && r.found ? (r.entries || []).filter((e) => e.c === lang) : [];
    results[f] = own.length ? own.map((e) => ({ w: e.w, pos: e.p ?? null, senses: (e.s || []).map(senseOf) })) : null;
  }
  return { giver: giverOf(packPath()), results };
}

export const lexiconGap = () => gap;

/** The hyperlexicon for one language, over the local pack. */
export function localLexicon(lang = "en") {
  return makeLexicon({ ask: wiktionaryAsk, lang });
}
