// scene/read-foundation.mjs — THE FOUNDATION: the oral histories and stories of the global south, read first.  (2026-10-14)
//
//   node eval/the-fold/scene/read-foundation.mjs [--dry]
//
// The order of the weft is the order of the mind's learning (append-only; seq is the cursor). The weft opens with the
// UDHR. What follows is not the liberal arts — Plato and Heidegger cannot be made sense of until one understands how
// the world is actually lived — but what people say about their own lives, and the stories they tell their children,
// in the places the canon does not come from. The liberal arts are a LATER layer and are not read here.
//
// WHAT IS IN, and why — every inclusion carries its basis, every exclusion its reason, in foundation-manifest.json:
//   · oral-history  — 21-anti-colonial/dloc-oral-histories: interviews held by the Digital Library of the Caribbean
//                     (title says oral history / interview; a tutorial that sits in the folder is excluded)
//   · story         — 18-childrens-books/african-storybook + global-digital-library: stories published by the
//                     African Storybook Project / Global Digital Library, in the languages they were translated into
//   · testimony     — 21-anti-colonial/saho-archive: South African History Online — memoirs, tributes, speeches and
//                     documents of the struggle (archival testimony; tagged so the layer can be filtered)
//   · oral-history-us — 20-first-person-voices/slave-narratives-wpa: the WPA interviews with formerly enslaved people
//                     (United States, 1936-38), transcribed oral histories; read AFTER the global-south layers, in
//                     paragraph-aligned windows of at most 60,000 characters
// WHAT IS HELD BACK, named: the pointer-cache archives (SA TRC, DC-Cam, Guatemala CEH …) are index pages or raw PDFs,
// not their testimony — they need a fetch (a download; the user's call) or an extraction; US/European first-person
// collections and literature are the next layers, not this one.
//
// READERS: English prose → the canonical process (read-process.mjs::readToWeft). A story in another language → the
// door with the declared language where a grammar stem exists; a language with no stem is a TYPED GAP, never a
// guessed read. Addresses are exact file bytes (see read-corpus-batch.mjs::addressEntry, read-corpus-languages.mjs).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readToWeft } from "../../../the-fold/read-process.mjs";
import { parseWeftJsonl } from "../../../the-fold/eot-weft.mjs";
import { leanOf } from "../../../the-fold/weft-lean.mjs";
import { openStore, keyOf } from "../../../the-fold/weft-store.mjs";
import { availableStems } from "../../../the-fold/language-grammar.js";
import { splitFrontmatter, englishVerdict, addressEntry } from "./read-corpus-batch.mjs";
import { readByDoor } from "./read-corpus-languages.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORPUS = "/Users/mlacy/Documents/3.0/Zenodotus";
const WEFT = path.join(HERE, "corpus.eot.jsonl");
const LEDGER = path.join(HERE, "read-batch-ledger.jsonl");
const MANIFEST = path.join(HERE, "foundation-manifest.json");
const STORE = path.join(HERE, "foundation-weft");   // transformation records, binary segments (weft-store.mjs)
const TRC_CACHE = path.join(CORPUS, ".pointer-cache", "sa-trc");
const DRY = process.argv.includes("--dry");
const only = (() => { const i = process.argv.indexOf("--layers"); return i >= 0 ? process.argv[i + 1].split(",") : null; })();
const STEMS = new Set(availableStems());
// directory language codes used by the two story collections → the door's grammar stems
const STEM_OF = { en: "eng", ar: "arb", de: "deu", es: "spa", "es-ni": "spa", hi: "hin", ja: "jpn", ko: "kor", pl: "pol", ru: "rus", vi: "vie", fr: "fra", "pt-br": "por", "sw-ke": "swh", am: "amh", ti: "tna", "lo-laoo": "lao" };

function* walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else if (/\.(txt|md)$/i.test(e.name) && !/(README|ATTRIBUTION)\.md$/i.test(e.name)) yield p;
  }
}
const titleOf = (text) => /^title:\s*"?([^\n"]+)/m.exec(text.slice(0, 3000))?.[1] ?? path.basename("");

function plan() {
  const include = []; const exclude = [];
  // 1 — oral histories (DLOC)
  for (const f of walk(path.join(CORPUS, "21-anti-colonial/dloc-oral-histories"))) {
    const text = fs.readFileSync(f, "utf8"); const title = titleOf(text);
    if (/oral history|interview|entrevista|historia oral/i.test(title + " " + path.basename(f))) include.push({ layer: "oral-history", file: f, title, basis: "Digital Library of the Caribbean oral-history interview (title/filename)", lang: "en" });
    else exclude.push({ file: f, title, why: "not an oral history (title and filename name neither an oral history nor an interview)" });
  }
  // 2 — stories (African Storybook, Global Digital Library)
  for (const sub of ["18-childrens-books/global-digital-library", "18-childrens-books/african-storybook"]) {
    for (const f of walk(path.join(CORPUS, sub))) {
      const lang = path.basename(path.dirname(f)).toLowerCase();
      const size = fs.statSync(f).size;
      if (size === 0) { exclude.push({ file: f, title: path.basename(f), why: "empty file (0 bytes) in the corpus" }); continue; }
      include.push({ layer: "story", file: f, title: path.basename(f), basis: `${sub.split("/")[1]} story, ${lang}`, lang });
    }
  }
  // 3 — testimony (SAHO)
  for (const f of walk(path.join(CORPUS, "21-anti-colonial/saho-archive"))) {
    include.push({ layer: "testimony", file: f, title: titleOf(fs.readFileSync(f, "utf8")) || path.basename(f), basis: "South African History Online archive document", lang: "en" });
  }
  // 4 — American oral histories: transcribed interviews with formerly enslaved people (WPA Federal Writers' Project, 1936-38)
  for (const f of walk(path.join(CORPUS, "20-first-person-voices/slave-narratives-wpa"))) {
    include.push({ layer: "oral-history-us", file: f, title: titleOf(fs.readFileSync(f, "utf8")) || path.basename(f), basis: "WPA Federal Writers' Project slave narratives — transcribed oral-history interviews (United States, 1936-38)", lang: "en" });
  }
  // 5 — the South African TRC Human Rights Violations hearings: first-person testimony, Q&A transcripts. LOCAL cache only
  // (corpus policy LP22: copyrighted sources are read where they were fetched, never committed or served); the index builder
  // leaves closed-licence documents out of anything committed.
  if (fs.existsSync(TRC_CACHE)) {
    for (const f of fs.readdirSync(TRC_CACHE).filter((x) => x.endsWith(".txt")).sort()) {
      include.push({ layer: "testimony-trc", file: path.join(TRC_CACHE, f), title: f.replace(/^[0-9a-f]{12}--/, "").replace(/\.txt$/, ""), basis: "South African TRC Human Rights Violations hearing transcript (justice.gov.za/trc/hrvtrans), local cache", lang: "en" });
    }
  }
  return { include: only ? include.filter((i) => only.includes(i.layer)) : include, exclude };
}

async function main() {
  const { include, exclude } = plan();
  const baseSeq = fs.readFileSync(WEFT, "utf8").split("\n").filter(Boolean).length;      // the committed baseline (UDHR) this store follows
  const store = openStore(STORE);
  const have = store.keys();
  let seq = baseSeq + store.count();                                                      // the weft's own cursor, one per pass
  const by = {}; for (const i of include) by[i.layer] = (by[i.layer] ?? 0) + 1;
  console.log(`foundation — ${include.length} documents (${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(" · ")}); excluded ${exclude.length}; baseline ${baseSeq} passes + ${store.count()} transformation passes in ${store.segments()} segments${DRY ? " (dry)" : ""}`);
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
  fs.writeFileSync(MANIFEST, JSON.stringify({ schema: "FoundationManifest@1", at: new Date().toISOString(), order: ["UDHR (weft seq 0-31)", "oral-history", "story", "testimony", "oral-history-us", "testimony-trc"], store: "foundation-weft/ (transformation records, binary; weft-lean.mjs)", laterLayers: manifest.laterLayers ?? ["liberal arts (classics, philosophy, literature)", "first-person collections of the North"], included: include.map((i) => ({ layer: i.layer, file: i.layer === "testimony-trc" ? "pointer-cache/sa-trc/" + path.basename(i.file) : path.relative(CORPUS, i.file), title: i.title, basis: i.basis, lang: i.lang })), excluded: exclude.map((e) => ({ ...e, file: path.relative(CORPUS, e.file) })) }, null, 2) + "\n");
  if (DRY) return;

  const out = []; const gaps = []; const t0 = Date.now();
  const WIN = 60000;                          // the door's own ceiling; a longer body is read in paragraph-aligned windows
  for (const it of include) {
    const full = fs.readFileSync(it.file, "utf8");
    const { body, prefixChars } = splitFrontmatter(full);
    const stem = STEM_OF[it.lang] ?? it.lang;
    const english = it.lang === "en" || stem === "eng";
    const t = Date.now(); const buffer = [];
    const keep = (pass) => { const l = leanOf({ ...pass, seq: seq++ }); buffer.push(l); have.add(keyOf(l)); };   // only the transformations are kept
    if (english) {
      const ev = englishVerdict(body);
      if (it.layer !== "story" && !ev.english) { gaps.push({ file: it.file, why: "not_english_by_detector", detail: ev }); continue; }
      const wins = []; for (let s0 = 0; s0 < body.length;) { let e0 = Math.min(body.length, s0 + WIN); if (e0 < body.length) { const cut = body.lastIndexOf("\n\n", e0); if (cut > s0 + WIN / 2) e0 = cut + 2; } wins.push([s0, e0]); s0 = e0; }
      let nCon = 0, nWin = 0;
      for (const [w0, w1] of wins) {
        if (have.has(`${it.file}@${w0}`)) continue;
        const e = readToWeft(body.slice(w0, w1), { address: it.file, category: it.layer });
        if (e.skipped || e.error) { if (wins.length === 1) gaps.push({ file: it.file, why: e.skipped ?? e.error }); continue; }
        const p = { schema: "WeftEntry@4", ...addressEntry(e, { file: it.file, text: full, prefixChars: prefixChars + w0 }), layer: "foundation", foundation: { layer: it.layer, basis: it.basis, language: stem, windowStart: w0, windows: wins.length } };
        keep(p); nCon += e.edges.length; nWin += 1;
      }
      if (nWin) out.push({ layer: it.layer, file: it.file, reader: "readToWeft", windows: nWin, connections: nCon, ms: Date.now() - t });
    } else if (STEMS.has(stem)) {
      if (have.has(it.file)) continue;
      const startByte = Buffer.byteLength(full.slice(0, prefixChars), "utf8");
      let r;
      try { r = await readByDoor(stem, body, { file: it.file, startByte }); }
      catch (e) { gaps.push({ file: it.file, lang: it.lang, why: `door refused ${stem}: ${String(e?.message ?? e).slice(0, 110)} — typed gap, not a guessed read` }); continue; }
      keep({ schema: "WeftEntry@3", address: it.file, category: it.layer, language: stem, layer: "foundation", foundation: { layer: it.layer, basis: it.basis, language: stem }, window: { startChar: prefixChars, chars: body.length, startByte }, cast: r.cast, relations: r.relations });
      out.push({ layer: it.layer, file: it.file, reader: "door:" + stem, connections: r.relations.length, ms: Date.now() - t });
    } else { gaps.push({ file: it.file, lang: it.lang, why: `no grammar stem for ${stem} — typed gap, not a guessed read` }); continue; }
    if (buffer.length) store.append(buffer);   // one immutable segment per document: a crash loses at most the document in flight
  }
  const ledger = { schema: "ReadBatch@1", at: new Date().toISOString(), kind: "foundation", store: "foundation-weft", reader: "readToWeft (en) / readDoor declared (other)", read: out.length, gaps: gaps.length, gapSample: gaps.slice(0, 40), byLayer: Object.fromEntries(Object.keys(by).map((k) => [k, out.filter((o) => o.layer === k).length])), totals: { documents: out.length, ms: Date.now() - t0 } };
  fs.appendFileSync(LEDGER, JSON.stringify(ledger) + "\n");
  console.log(`done — ${out.length} documents read · ${gaps.length} gaps · ${Math.round(ledger.totals.ms / 1000)}s · store now ${store.count()} passes in ${store.segments()} segments`);
  for (const g of gaps.slice(0, 12)) console.log(`  gap ${path.relative(CORPUS, g.file)} — ${g.why}`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
