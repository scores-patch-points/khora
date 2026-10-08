// native/eval/weft/build-weft.mjs — read the ethos corpus into THE WEFT: the append-only log of reading passes.
//
//   node native/eval/weft/build-weft.mjs [--root DIR] [--out FILE] [--chars N] [--limit N] [--exclude a,b]
//
// The weft (THE-SPINE.md) is the log the holograph is projected from; each PASS is a SidecarRead@2-shaped
// reading (addressable: per-mention byte anchors, per-relation byteOffset, per-end standing). This driver walks
// the corpus, reads each document with the production reader (read-door, ear by detector→signal), and APPENDS
// one WeftEntry@1 line per document. It is RESUMABLE: an address already in the out file is skipped, so a killed
// run continues where it stopped (the log is append-only; nothing is rewritten).
//
// Disclosed defaults: --chars 20000 (a pass reads a bounded prefix; a full file read is a different, later run),
// earSelection "auto" (detector → abstention → ear-by-signal), entityBound OFF (the shipped reader).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDoor } from "../../the-fold/read-door.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = "/Users/mlacy/Documents/3.0/ethos";
const CAT = /^(\d\d|derived|legacy|scripts)/;

function argv() {
  const o = { root: DEFAULT_ROOT, out: path.join(HERE, "weft.jsonl"), chars: 20000, limit: Infinity, exclude: new Set(), entityBound: false };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--root") o.root = a[++i];
    else if (a[i] === "--out") o.out = a[++i];
    else if (a[i] === "--chars") o.chars = Number(a[++i]);
    else if (a[i] === "--limit") o.limit = Number(a[++i]);
    else if (a[i] === "--exclude") o.exclude = new Set(a[++i].split(","));
    else if (a[i] === "--entity-bound") o.entityBound = true;
  }
  return o;
}
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(txt|md)$/.test(e.name)) out.push(p);
  }
  return out;
}
function readExisting(out) {
  if (!fs.existsSync(out)) return new Set();
  const seen = new Set();
  for (const l of fs.readFileSync(out, "utf8").split("\n")) { if (!l) continue; try { const r = JSON.parse(l); if (r?.address) seen.add(r.address); } catch {} }
  return seen;
}

const o = argv();
fs.mkdirSync(path.dirname(o.out), { recursive: true });
const done = readExisting(o.out);
const files = walk(o.root)
  .map((f) => ({ f, rel: path.relative(o.root, f) }))
  .filter(({ rel }) => { const c = rel.split(path.sep)[0]; return !o.exclude.has(c) && CAT.test(c); })
  .sort((a, b) => a.rel.localeCompare(b.rel));
const todo = files.filter(({ rel }) => !done.has(rel)).slice(0, o.limit);

process.stderr.write(`weft: ${files.length} files, ${done.size} already read, ${todo.length} to read -> ${o.out}\n`);
const t0 = Date.now();
let n = 0, errors = 0, chars = 0;
const fd = fs.openSync(o.out, "a");
for (const { f, rel } of todo) {
  let text = ""; try { text = fs.readFileSync(f, "utf8"); } catch { text = ""; }
  if (text.trim().length < 200) continue;
  const category = rel.split(path.sep)[0];
  const s0 = Date.now();
  let body;
  try { body = await readDoor({ text: text.slice(0, o.chars), name: rel, earSelection: "auto", entityBound: o.entityBound }); }
  catch (err) { body = { error: String(err?.message ?? err) }; }
  const entry = {
    schema: "WeftEntry@1", seq: done.size + n, address: rel, category,
    bytes: Buffer.byteLength(text), readCharacters: body.readCharacters ?? Math.min(o.chars, text.length),
    language: body.language ?? null, languageSource: body.languageSource ?? null, detector: body.detector ?? null, earSelection: body.earSelection ?? null,
    cast: (body.referents ?? []).map((r) => ({ ref: r.ref ?? null, surface: r.surfaces?.[0] ?? null, allSurfaces: r.allSurfaces ?? [], mentionsAt: r.mentionsAt ?? [] })).filter((r) => r.surface),
    relations: (body.relations ?? []).map((r) => ({ relation: r.relation, scope: r.scope ?? null, participants: (r.participants ?? []).map((p) => ({ ref: p.ref ?? null, surface: p.surface ?? null, standing: p.standing ?? null, resolution: p.resolution ?? null })) })),
    gaps: body.gaps ?? [], ms: body.ms ?? (Date.now() - s0), error: body.error ?? null,
  };
  fs.writeSync(fd, JSON.stringify(entry) + "\n");
  n += 1; chars += entry.readCharacters; if (entry.error) errors += 1;
  if (n % 25 === 0) { const el = (Date.now() - t0) / 1000; process.stderr.write(`  ${n}/${todo.length}  ${el.toFixed(0)}s  ${(n / el).toFixed(2)}/s  err ${errors}  cast ${entry.cast.length} rel ${entry.relations.length} lang ${entry.language ?? "-"}  ${rel}\n`); }
}
fs.closeSync(fd);
const el = (Date.now() - t0) / 1000;
process.stderr.write(`done: read ${n} docs in ${el.toFixed(0)}s (${(n / el).toFixed(2)}/s), ${(chars / 1e6).toFixed(1)}M chars, ${errors} errors -> ${o.out}\n`);
process.stdout.write(JSON.stringify({ read: n, seconds: +el.toFixed(1), perSec: +(n / el).toFixed(2), errors, chars, out: o.out }) + "\n");
