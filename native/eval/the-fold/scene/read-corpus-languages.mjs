// scene/read-corpus-languages.mjs — KEEP READING, IN EVERY LANGUAGE WE ARE COMPETENT IN.  (2026-10-14)
//
//   node eval/the-fold/scene/read-corpus-languages.mjs [--per-language 12] [--window 20000] [--seed 20261014] [--dry]
//
// "Competent" is the project's own board, not a count of grammar stems: NATIVE-COMPETENCY.md's fourteen territories
// (grc lat san deu rus eng spa ita por fas arb tur nld fra), each measured by its own reader. This driver reads the
// corpus's text IN those languages (English is read by read-corpus-batch.mjs through the canonical reader) and
// appends one `WeftEntry@3` per window to the same append-only weft.
//
// WHICH TEXT IS IN WHICH LANGUAGE is the corpus's own organisation (a language directory is a provenance
// declaration; the fold's sentence detector is not trusted for this — measured on 243 corpus files it called Latin,
// Spanish and Greek texts `ca`/`mt`/`epo`).
//
// WHICH READER, per language, is chosen by SIGNAL on a probe window, recorded in the ledger — never by taste:
//   · native — reader-lat / reader-san / reader-deu (case read from each language's own morphology), where one is live
//   · door   — read-door.mjs::readDoor, declared language (a grammar stem exists for every board language)
// For a language with both, the one that binds MORE relations on the same probe wins (ties → the door, the canonical
// reader). The seven native readers that the board names for rus / spa / ita / por / fas / arb / tur / nld / fra are
// not on disk (reader-params, reader-rus, reader-spa — see the handoff); those languages are read by the door, which
// is lexical-instrument grade for a case-marked language, and the ledger says so.
//
// A WINDOW is `--window` characters (the board's own 20,000-char unit) of the body, frontmatter stripped; every
// relation's `at` is rewritten to a FILE byte offset (window start + the reader's own offset), so each witness
// `<file>#<byte>` points at the file's own bytes and is distinct. No window is cherry-picked: (file, window) pairs are
// shuffled by a seeded PRNG and taken up to the cap; a language with less text than the cap is read whole.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDoor } from "../../../the-fold/read-door.mjs";
import { eotToPass } from "../../../the-fold/eot-weft.mjs";
import { parseWeftJsonl } from "../../../the-fold/eot-weft.mjs";
import { splitFrontmatter } from "./read-corpus-batch.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const PER = Number(opt("--per-language", 12));
const WINDOW = Number(opt("--window", 20000));
const SEED = Number(opt("--seed", 20261014));
const CORPUS = path.resolve(opt("--corpus", "/Users/mlacy/Documents/3.0/Zenodotus"));
const WEFT = path.resolve(HERE, opt("--weft", "corpus.eot.jsonl"));
const LEDGER = path.join(HERE, "read-batch-ledger.jsonl");
const DRY = args.includes("--dry");
const MIN_WINDOW = 400;

// the corpus's own language directories → board code
export const LANGS = {
  lat: { name: "Latin", native: "lat", dirs: ["11-multi-language/latin-originals"] },
  san: { name: "Sanskrit", native: "san", dirs: ["11-multi-language/sanskrit-originals", "24-global-literature/sa"] },
  deu: { name: "German", native: "deu", dirs: ["11-multi-language/german-originals", "11-multi-language/gutenberg-non-en/de"] },
  grc: { name: "Ancient Greek", native: null, dirs: ["11-multi-language/greek-originals"] },
  spa: { name: "Spanish", native: null, dirs: ["24-global-literature/es"] },
  por: { name: "Portuguese", native: null, dirs: ["24-global-literature/pt"] },
  fra: { name: "French", native: null, dirs: ["11-multi-language/french-originals", "11-multi-language/gutenberg-non-en/fr", "11-multi-language/wikipedia-lang/fr", "11-multi-language/war-and-peace/fr"] },
  ita: { name: "Italian", native: null, dirs: ["11-multi-language/italian-originals"] },
  rus: { name: "Russian", native: null, dirs: ["11-multi-language/war-and-peace/ru"] },
  tur: { name: "Turkish", native: null, dirs: ["11-multi-language/wikipedia-lang/tr"] },
  fas: { name: "Persian", native: null, dirs: ["11-multi-language/persian-originals", "11-multi-language/wikipedia-lang/fa", "24-global-literature/fa"] },
  arb: { name: "Arabic", native: null, dirs: ["11-multi-language/arabic-originals", "24-global-literature/ar"] },
  nld: { name: "Dutch", native: null, dirs: [] },
};

const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bytes = (s) => Buffer.byteLength(s, "utf8");

function* walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(txt|md)$/i.test(e.name) && !/README\.md$/i.test(e.name)) yield p;
  }
}

// ── the readers, each → { relations, cast, counts, gaps } with FILE-byte `at` ───────────────────────────────────────
const NATIVE = {};
async function nativeReader(code) {
  if (NATIVE[code]) return NATIVE[code];
  const file = { lat: "reader-lat.mjs", san: "reader-san.mjs", deu: "reader-deu.mjs" }[code];
  const fn = { lat: "readLatin", san: "readSanSanskrit", deu: "readGerman" }[code];
  const m = await import(path.join(HERE, file));
  return (NATIVE[code] = m[fn]);
}

async function readNative(code, win, ctx) {
  const run = await nativeReader(code);
  const { eot } = await run({ text: win });
  const pass = eotToPass(eot, { address: ctx.file });
  // eotToPass takes `span[0]` (a CHARACTER offset inside this window) as `at`; make it a FILE byte offset
  const edges = (eot.edges ?? []).filter((e) => e.subject && e.object && e.action);
  const relations = pass.relations.map((r, i) => {
    const charOff = Array.isArray(edges[i]?.span) ? edges[i].span[0] : null;
    const at = charOff == null ? null : ctx.startByte + bytes(win.slice(0, charOff));
    return { ...r, at, scope: { byteOffset: at } };
  });
  return { relations, cast: pass.cast, counts: eot.counts ?? null, gaps: [], language: code };
}

export async function readByDoor(code, win, ctx) {
  const r = await readDoor({ text: win, name: path.basename(ctx.file), language: LANG_TO_DOOR[code] ?? code, maxCharacters: Math.max(win.length, 1) });
  const ref = (x) => (x ? `${ctx.file}::${x}` : null);
  const relations = (r.relations ?? []).map((rel) => {
    // the door's `scope.byteOffset` is a CHARACTER offset into the window (measured: 80/80 hits as chars vs 25/80 as bytes on
    // Arabic, Greek and Russian) — convert it, or every multibyte script's witness lands in the wrong bytes
    const at = Number.isFinite(rel.scope?.byteOffset) ? ctx.startByte + bytes(win.slice(0, rel.scope.byteOffset)) : null;
    return {
      relation: rel.relation, at, clause: rel.scope?.offset ?? null, scope: { byteOffset: at },
      participants: (rel.participants ?? []).map((p) => ({ ref: ref(p.ref), surface: p.surface, standing: p.standing })),
    };
  });
  const cast = (r.referents ?? []).map((x) => ({ ref: ref(x.ref), surface: x.surfaces?.[0] ?? null, allSurfaces: x.allSurfaces ?? [], mentionsAt: (x.mentionsAt ?? []).map((m) => ctx.startByte + bytes(win.slice(0, m))) }));
  return { relations, cast, counts: { relations: relations.length, referents: cast.length }, gaps: r.gaps ?? [], language: r.language ?? code };
}
const LANG_TO_DOOR = {};                    // board codes are the door's stems already (checked: all 14 are in availableStems)

async function main() {
  const existing = fs.existsSync(WEFT) ? parseWeftJsonl(fs.readFileSync(WEFT, "utf8")) : [];
  const have = new Set(existing.filter((p) => p.window).map((p) => `${p.address}@${p.window.startByte}`));
  const rnd = mulberry32(SEED);
  const plan = []; const gaps = []; const probes = {};

  for (const [code, L] of Object.entries(LANGS)) {
    const files = L.dirs.flatMap((d) => [...walk(path.join(CORPUS, d))]);
    if (!files.length) { gaps.push({ code, why: `no ${L.name} text in the corpus` }); continue; }
    const pairs = [];
    for (const f of files) {
      let full; try { full = fs.readFileSync(f, "utf8"); } catch { continue; }
      const { body, prefixChars } = splitFrontmatter(full);
      for (let s = 0; s < body.length; s += WINDOW) {
        const w = body.slice(s, s + WINDOW);
        if (w.trim().length < MIN_WINDOW) continue;
        pairs.push({ file: f, startChar: prefixChars + s, win: w, startByte: bytes(full.slice(0, prefixChars + s)) });
      }
    }
    const fresh = pairs.filter((p) => !have.has(`${p.file}@${p.startByte}`));
    const take = shuffle(fresh, rnd).slice(0, PER);
    plan.push({ code, L, available: pairs.length, take, files: files.length });
  }

  console.log(`language batch — seed ${SEED} · ≤${PER} windows/language · window ${WINDOW} chars${DRY ? " (dry)" : ""}`);
  for (const p of plan) console.log(`  ${p.code} ${p.L.name.padEnd(14)} ${String(p.files).padStart(3)} files · ${String(p.available).padStart(4)} windows · reading ${p.take.length}`);
  for (const g of gaps) console.log(`  ${g.code} GAP — ${g.why}`);
  if (DRY) return;

  const out = []; const t0 = Date.now();
  for (const p of plan) {
    if (!p.take.length) continue;
    // reader by signal on the first window taken (recorded; decided once per language)
    let reader = "door";
    if (p.L.native) {
      const probe = p.take[0];
      const nat = await readNative(p.code, probe.win, { file: probe.file, startByte: probe.startByte });
      const door = await readByDoor(p.code, probe.win, { file: probe.file, startByte: probe.startByte });
      probes[p.code] = { native: nat.relations.length, door: door.relations.length, file: path.basename(probe.file) };
      reader = nat.relations.length > door.relations.length ? "native" : "door";
    }
    let relN = 0, castN = 0;
    for (const w of p.take) {
      const t = Date.now();
      let r;
      try { r = reader === "native" ? await readNative(p.code, w.win, { file: w.file, startByte: w.startByte }) : await readByDoor(p.code, w.win, { file: w.file, startByte: w.startByte }); }
      catch (e) { gaps.push({ code: p.code, file: w.file, why: `read_error: ${String(e?.message ?? e).slice(0, 120)}` }); continue; }
      const seq = existing.length + out.length;
      const pass = {
        schema: "WeftEntry@3", seq, address: w.file, category: "text", language: p.code,
        reader: reader === "native" ? `scene/reader-${p.code}.mjs (native, case-aware)` : "the-fold/read-door.mjs::readDoor (declared language)",
        window: { startChar: w.startChar, chars: w.win.length, startByte: w.startByte },
        counts: r.counts, cast: r.cast, relations: r.relations, gaps: r.gaps,
      };
      fs.appendFileSync(WEFT, JSON.stringify(pass) + "\n");
      out.push({ seq, code: p.code, file: w.file, startByte: w.startByte, reader, relations: r.relations.length, cast: r.cast.length, ms: Date.now() - t });
      relN += r.relations.length; castN += r.cast.length;
    }
    console.log(`  ${p.code} ${p.L.name.padEnd(14)} ${reader.padEnd(6)} ${String(p.take.length).padStart(2)} windows · ${String(relN).padStart(5)} relations · ${String(castN).padStart(5)} cast${probes[p.code] ? `   (probe: native ${probes[p.code].native} / door ${probes[p.code].door})` : ""}`);
  }

  const ledger = {
    schema: "ReadBatch@1", at: new Date().toISOString(), kind: "languages", seed: SEED, perLanguage: PER, windowChars: WINDOW,
    competence: "NATIVE-COMPETENCY.md territories (fourteen); English by read-corpus-batch.mjs",
    probes, gaps, read: out,
    totals: { windows: out.length, relations: out.reduce((n, o) => n + o.relations, 0), cast: out.reduce((n, o) => n + o.cast, 0), ms: Date.now() - t0 },
  };
  fs.appendFileSync(LEDGER, JSON.stringify(ledger) + "\n");
  console.log(`done — ${out.length} windows · ${ledger.totals.relations} relations · ${ledger.totals.cast} cast · ${Math.round(ledger.totals.ms / 1000)}s · gaps ${gaps.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
