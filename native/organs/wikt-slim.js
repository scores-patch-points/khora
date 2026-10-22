// wikt-slim.js — read the SLIM English Wiktionary (every language English Wiktionary covers, one fixed snapshot) on this machine, for the
// meaning check's glossary (wikt-gloss.js) and relation definitions (relation-defs.js). The format is the slim build's (workspace
// wiktionary-watch/build-slim.mjs and lookup.mjs; on hyphae under /mnt/work/wiktionary/slim): manifest.json lists brotli chunks by their first
// and last word; each chunk is sorted JSONL rows { w, e: [slim entries] }; a slim entry is { w, c (language code), n, p (part of speech),
// s: [{ g: [glosses], tags } | { of: form-of target, tags }], t: [[code, word]] }. This reader only reads: it learns nothing and writes nothing.
//   openSlim(dir) → { entries(lang, word) → wiktextract-shaped entries [{ word, lang_code, pos, senses: [{ glosses, form_of, tags }] }] | null }
import { readFileSync, existsSync, openSync, readSync, statSync } from "node:fs";
import { join } from "node:path";
import { brotliDecompressSync } from "node:zlib";

// openSlim(path): a slim DIRECTORY (manifest.json + chunks/<sha256>.br) or the released single PACK (Zenodotus scripts/wiktionary/pack-slim.mjs:
// "WSLMPACK", the chunks back to back, the manifest as JSON with each chunk's byte offset, then u32 index length and the u32 footer 0x57534c31)
export function openSlim(dir, { cacheChunks = 16 } = {}) {
  let manifest, blobOf;
  if (existsSync(join(dir, "manifest.json"))) {
    manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    blobOf = (c) => readFileSync(join(dir, "chunks", `${c.sha256}.br`));
  } else if (existsSync(dir) && statSync(dir).isFile()) {
    const fd = openSync(dir, "r"), size = statSync(dir).size, foot = Buffer.alloc(8);
    readSync(fd, foot, 0, 8, size - 8);
    if (foot.readUInt32LE(4) !== 0x57534c31) throw new Error(`not a wiktionary-slim pack (bad footer): ${dir}`);
    const len = foot.readUInt32LE(0), ix = Buffer.alloc(len); readSync(fd, ix, 0, len, size - 8 - len);
    manifest = JSON.parse(ix.toString("utf8"));
    blobOf = (c) => { const b = Buffer.alloc(c.bytes); readSync(fd, b, 0, c.bytes, c.off); return b; };
  } else throw new Error(`no slim Wiktionary at ${dir}`);
  const cache = new Map();
  const chunkFor = (w) => { const cs = manifest.chunks; let lo = 0, hi = cs.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (w < cs[m].first) hi = m - 1; else if (w > cs[m].last) lo = m + 1; else return cs[m]; } return null; };
  const lines = (c) => {
    let ls = cache.get(c.sha256); if (ls) return ls;
    ls = brotliDecompressSync(blobOf(c)).toString("utf8").split("\n").filter(Boolean);
    cache.set(c.sha256, ls); if (cache.size > cacheChunks) cache.delete(cache.keys().next().value);
    return ls;
  };
  const row = (w) => { const c = chunkFor(w); if (!c) return null; const ls = lines(c); let lo = 0, hi = ls.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1, r = JSON.parse(ls[m]); if (w < r.w) hi = m - 1; else if (w > r.w) lo = m + 1; else return r.e; } return null; };
  const memo = new Map();
  // the v2 build's word lists (per sense: syn, ant, hyper, hypo; per entry, from a page's sections: rel): a word is a string or [word, qualifier];
  // a pointer to a Thesaurus page is not a word
  const words = (xs) => (xs ?? []).map((x) => (Array.isArray(x) ? { word: x[0], q: x[1] ?? null } : { word: x, q: null })).filter((x) => x.word && !/^Thesaurus:/.test(x.word));
  const rels = (o) => { const r = {}; for (const k of ["syn", "ant", "hyper", "hypo"]) if (o?.[k]?.length) r[k] = words(o[k]); return r; };
  return {
    licence: manifest.licence, snapshot: manifest.snapshot ?? null, entriesTotal: manifest.entriesKept ?? manifest.entries ?? null,
    /** every chunk's rows, in order (for building indexes over the whole snapshot) */
    *rows() { for (const c of manifest.chunks) for (const l of brotliDecompressSync(blobOf(c)).toString("utf8").split("\n")) if (l) yield JSON.parse(l); },
    /** a word's entries in one language (its code: en, es, ja …), in the wiktextract shape; null when the snapshot has none */
    entries(lang, word) {
      const k = `${lang}\t${word}`; if (memo.has(k)) return memo.get(k);
      const es = (row(word) ?? []).filter((e) => e.c === lang && !e.redirect).map((e) => ({ word: e.w, lang_code: e.c, pos: e.p,
        senses: (e.s ?? []).map((s) => ({ glosses: s.g, form_of: s.of ? [{ word: s.of }] : undefined, tags: s.tags, ...rels(s) })),
        translations: (e.t ?? []).map(([code, word]) => ({ code, word })), rel: e.rel ? rels(e.rel) : null }));
      const out = es.length ? es : null; memo.set(k, out); return out;
    },
  };
}
