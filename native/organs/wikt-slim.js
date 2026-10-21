// wikt-slim.js — read the SLIM English Wiktionary (every language English Wiktionary covers, one fixed snapshot) on this machine, for the
// meaning check's glossary (wikt-gloss.js) and relation definitions (relation-defs.js). The format is the slim build's (workspace
// wiktionary-watch/build-slim.mjs and lookup.mjs; on hyphae under /mnt/work/wiktionary/slim): manifest.json lists brotli chunks by their first
// and last word; each chunk is sorted JSONL rows { w, e: [slim entries] }; a slim entry is { w, c (language code), n, p (part of speech),
// s: [{ g: [glosses], tags } | { of: form-of target, tags }], t: [[code, word]] }. This reader only reads: it learns nothing and writes nothing.
//   openSlim(dir) → { entries(lang, word) → wiktextract-shaped entries [{ word, lang_code, pos, senses: [{ glosses, form_of, tags }] }] | null }
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { brotliDecompressSync } from "node:zlib";

export function openSlim(dir, { cacheChunks = 16 } = {}) {
  if (!existsSync(join(dir, "manifest.json"))) throw new Error(`no slim Wiktionary at ${dir}`);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")), cache = new Map();
  const chunkFor = (w) => { const cs = manifest.chunks; let lo = 0, hi = cs.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (w < cs[m].first) hi = m - 1; else if (w > cs[m].last) lo = m + 1; else return cs[m]; } return null; };
  const lines = (c) => {
    let ls = cache.get(c.sha256); if (ls) return ls;
    ls = brotliDecompressSync(readFileSync(join(dir, "chunks", `${c.sha256}.br`))).toString("utf8").split("\n").filter(Boolean);
    cache.set(c.sha256, ls); if (cache.size > cacheChunks) cache.delete(cache.keys().next().value);
    return ls;
  };
  const row = (w) => { const c = chunkFor(w); if (!c) return null; const ls = lines(c); let lo = 0, hi = ls.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1, r = JSON.parse(ls[m]); if (w < r.w) hi = m - 1; else if (w > r.w) lo = m + 1; else return r.e; } return null; };
  const memo = new Map();
  return {
    licence: manifest.licence,
    /** a word's entries in one language (its code: en, es, ja …), in the wiktextract shape; null when the snapshot has none */
    entries(lang, word) {
      const k = `${lang}\t${word}`; if (memo.has(k)) return memo.get(k);
      const es = (row(word) ?? []).filter((e) => e.c === lang && !e.redirect).map((e) => ({ word: e.w, lang_code: e.c, pos: e.p,
        senses: (e.s ?? []).map((s) => ({ glosses: s.g, form_of: s.of ? [{ word: s.of }] : undefined, tags: s.tags })) }));
      const out = es.length ? es : null; memo.set(k, out); return out;
    },
  };
}
