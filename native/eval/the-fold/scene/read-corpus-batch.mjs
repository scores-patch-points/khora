// scene/read-corpus-batch.mjs — KEEP READING: a seeded, stratified batch of the corpus through THE reader.  (2026-10-14)
//
//   node eval/the-fold/scene/read-corpus-batch.mjs [--per-category 2] [--seed 20261014] [--max-bytes 60000]
//        [--corpus <Zenodotus dir>] [--weft corpus.eot.jsonl] [--dry]
//
// WHY THIS AND NOT read-udhr-batch.mjs: that driver imports reader-params/reader-rus/reader-spa, which are on no
// disk and in no history. This one goes through the canonical reading process (the-fold/read-process.mjs:
// `readToWeft` — "one way to read a source into the weft; no second reader, no second normalisation") and appends
// one `WeftEntry@4` per document to the SAME append-only weft. The weft is never rewritten; a rerun resumes
// (an address already in the weft is skipped).
//
// WHAT IT DECIDES, AND WHAT IT DOES NOT: nothing is hand-picked. Categories are the corpus's own numbered
// directories; within a category the files are sorted, shuffled by a seeded PRNG and taken in order until
// `--per-category` of them pass the gates. The gates are the reader's own constraints, stated:
//   · English — the reader is primed with pos-eng/morphology-eng (READ_PROCESS.primed); a document is read only
//     if a MAJORITY of its confident sentences are identified `en` by the fold's own detector (the door's
//     `sentenceLanguages`). Another language is a typed skip, never a wrong read.
//   · prose — 09-source-code is excluded (the reader reads sentences); 11-multi-language and the UDHR directory
//     fall to the English gate or are already in the weft.
//   · size — at most --max-bytes (the door's own 60,000-character ceiling).
// A document's provenance frontmatter (`---` … `---`) is NOT read as content; it is stripped and the byte offset
// added back so every address still points at the file's own bytes.
//
// ADDRESSES: the reader's refs are source-local (`material#A-B`, character offsets of the body). Left as is, every
// document would share the witness `material#0-220`. They are rewritten to `<file>#<byteOffset>` (the weft's own
// address form, so the hyperlexicon's witnesses are byte-addressed and distinct); the original is kept as `localRefs`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readToWeft } from "../../../the-fold/read-process.mjs";
import { sentenceLanguages } from "../../../the-fold/read-door.mjs";
import { parseWeftJsonl } from "../../../the-fold/eot-weft.mjs";
import { emptyWeft } from "../../../the-fold/weft.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const PER = Number(opt("--per-category", 2));
const SEED = Number(opt("--seed", 20261014));
const MAX_BYTES = Number(opt("--max-bytes", 60000));
const CORPUS = path.resolve(opt("--corpus", "/Users/mlacy/Documents/3.0/Zenodotus"));
const WEFT = path.resolve(HERE, opt("--weft", "corpus.eot.jsonl"));
const LEDGER = path.join(HERE, "read-batch-ledger.jsonl");
const DRY = args.includes("--dry");
const EXCLUDE_CATEGORY = new Set(["09-source-code"]);
const MIN_CHARS = 200;                     // read-process's own floor (a shorter source is a typed skip there)

const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function* walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(txt|md)$/i.test(e.name) && !/\.eot\.json$/.test(e.name)) yield p;
  }
}

/** `---`…`---` provenance frontmatter → { body, prefixChars }. Nothing else is stripped. */
export function splitFrontmatter(text) {
  const m = /^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/.exec(text);
  return m ? { body: text.slice(m[0].length), prefixChars: m[0].length } : { body: text, prefixChars: 0 };
}

/** Is the body English by the fold's own detector: a majority of ALL its sentences are confidently `en`. An abstaining
 *  or other-language sentence counts against it — a one-line English header must not carry a Chakma file. */
export function englishVerdict(body) {
  const rows = sentenceLanguages(body.slice(0, 20000));
  const en = rows.filter((r) => r.confident && /^en/.test(r.language)).length;
  return { sentences: rows.length, en, english: rows.length > 0 && en > rows.length / 2 };
}

/** Rewrite one entry's source-local refs to file byte addresses. `localRefs` keeps the reader's own.
 *  A reader ref names a CHUNK (`material#A-B`, character offsets of the body); a span's `start` is relative to that
 *  chunk. The witness a hyperlexicon row stands on is the SPAN's own bytes — chunk start + span.start — not the chunk's
 *  head (measured: on verse-per-line sources a chunk is thousands of bytes and the sentence sat deep inside it). */
export function addressEntry(entry, { file, text, prefixChars }) {
  const byteAt = (charOffset) => Buffer.byteLength(text.slice(0, prefixChars + charOffset), "utf8");
  const chunkStart = (ref) => { const m = /^material#(\d+)(?:-(\d+))?$/.exec(String(ref)); return m ? Number(m[1]) : null; };
  const addr = (ref, plus = 0) => { const a = chunkStart(ref); return a == null ? ref : `${file}#${byteAt(a + plus)}`; };
  const edges = (entry.edges ?? []).map((e) => {
    const spans = (e.spans ?? []).map((s) => ({ ...s, ref: addr(s.ref, Number.isFinite(s.start) ? s.start : 0) }));
    const refs = (e.refs ?? []).map((r, i) => (i === 0 && spans[0] ? spans[0].ref : addr(r)));
    return { ...e, localRefs: e.refs ?? null, refs, spans };
  });
  // the clause TREE (read-quality.mjs::nestedClauses): its offsets are characters of the window read, so each clause, its
  // subject and its object get the same file-byte address a witness has
  const at = (c) => (Number.isFinite(c) ? `${file}#${byteAt(c)}` : null);
  const clauses = Array.isArray(entry.clauses) ? entry.clauses.map((c) => ({
    ...c,
    own: { ...c.own, at: at(c.own?.start) },
    subject: c.subject ? { ...c.subject, at: at(c.subject.start) } : null,
    object: c.object ? { ...c.object, at: at(c.object.start) } : null,
  })) : entry.clauses;
  return { ...entry, edges, clauses, address: file, prefixBytes: Buffer.byteLength(text.slice(0, prefixChars), "utf8") };
}

async function main() {
  const existing = fs.existsSync(WEFT) ? parseWeftJsonl(fs.readFileSync(WEFT, "utf8")) : emptyWeft();
  const have = new Set(existing.map((p) => p.address));
  const weftBytesBefore = fs.existsSync(WEFT) ? fs.statSync(WEFT).size : 0;
  const rnd = mulberry32(SEED);

  const cats = fs.readdirSync(CORPUS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d\d-/.test(e.name) && !EXCLUDE_CATEGORY.has(e.name))
    .map((e) => e.name).sort();

  const batch = []; const skipped = []; const scanned = {};
  for (const cat of cats) {
    const files = [...walk(path.join(CORPUS, cat))]
      .filter((f) => { try { const s = fs.statSync(f).size; return s >= MIN_CHARS && s <= MAX_BYTES; } catch { return false; } });
    const order = shuffle(files, rnd);
    let taken = 0, looked = 0;
    for (const f of order) {
      if (taken >= PER) break;
      if (have.has(f)) { skipped.push({ file: f, why: "already_in_weft" }); continue; }
      looked += 1;
      const text = fs.readFileSync(f, "utf8");
      const { body, prefixChars } = splitFrontmatter(text);
      if (body.trim().length < MIN_CHARS) { skipped.push({ file: f, why: "too_short_after_frontmatter" }); continue; }
      const v = englishVerdict(body);
      if (!v.english) { skipped.push({ file: f, why: "not_english", detail: v }); continue; }
      batch.push({ category: cat, file: f, text, body, prefixChars, verdict: v }); taken += 1;
    }
    scanned[cat] = { candidates: files.length, looked, taken };
  }

  console.log(`corpus batch — seed ${SEED} · ${PER}/category · ≤${MAX_BYTES}B · ${batch.length} documents selected from ${cats.length} categories${DRY ? " (dry)" : ""}`);
  for (const b of batch) console.log(`  ${b.category.padEnd(26)} ${path.relative(CORPUS, b.file)}  (${Buffer.byteLength(b.text)}B, ${b.verdict.en}/${b.verdict.sentences} en)`);
  if (DRY) return;

  const out = []; const t0 = Date.now();
  for (const b of batch) {
    const t = Date.now();
    const entry = readToWeft(b.body, { address: b.file, category: b.category });
    if (entry.skipped || entry.error) { skipped.push({ file: b.file, why: entry.skipped ?? "read_error", detail: entry.error }); console.log(`  SKIP ${path.basename(b.file)} — ${entry.skipped ?? entry.error}`); continue; }
    const addressed = addressEntry(entry, { file: b.file, text: b.text, prefixChars: b.prefixChars });
    // append-only: seq continues from the weft's own length; the line is the pass, as appendPass would make it
    const seq = existing.length + out.length;
    const pass = { schema: "WeftEntry@4", seq, ...addressed };
    fs.appendFileSync(WEFT, JSON.stringify(pass) + "\n");
    out.push({ seq, address: b.file, category: b.category, bytes: entry.bytes, edges: entry.edges.length, cast: entry.cast.length, ms: Date.now() - t });
    console.log(`  read ${String(out.length).padStart(2)}/${batch.length} ${b.category.padEnd(24)} ${path.basename(b.file).slice(0, 40).padEnd(40)} ${String(entry.edges.length).padStart(5)} edges · ${String(entry.cast.length).padStart(4)} cast · ${Date.now() - t}ms`);
  }

  const ledger = {
    schema: "ReadBatch@1", at: new Date().toISOString(), seed: SEED, perCategory: PER, maxBytes: MAX_BYTES,
    reader: "the-fold/read-process.mjs::readToWeft", gates: ["english-majority(sentenceLanguages)", "prose(!09-source-code)", "size", "frontmatter-stripped"],
    weftBefore: { passes: existing.length, bytes: weftBytesBefore },
    scanned, read: out, skipped,
    totals: { documents: out.length, edges: out.reduce((n, o) => n + o.edges, 0), cast: out.reduce((n, o) => n + o.cast, 0), ms: Date.now() - t0 },
  };
  fs.appendFileSync(LEDGER, JSON.stringify(ledger) + "\n");
  console.log(`done — ${out.length} documents · ${ledger.totals.edges} edges · ${ledger.totals.cast} cast · ${Math.round(ledger.totals.ms / 1000)}s · skipped ${skipped.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
