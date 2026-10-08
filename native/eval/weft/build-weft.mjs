// native/eval/weft/build-weft.mjs — read the ethos corpus into THE WEFT with the REAL reader.
//
//   node native/eval/weft/build-weft.mjs [--out FILE] [--root DIR] [--shard i/N] [--limit N] [--exclude a,b]
//
// THE READER IS THE REAL ONE — `the-fold/reader-bundle.js::engineRelationsFor` (the reading proxy-runner,
// swarm-server and cli/reason invoke; the reading the app uses), PRIMED from `native/priors` (Sullivan:
// pos-eng + morphology-eng → `vocabulary.grammarPrior === true`). NOT the 6.1 legacy host, NOT chunked:
// one document, WHOLE, in order (THE-READING-PIPELINE.md).
//
// khora reads; janus folds (it consumes the weft — `weftAttestations` / `weftReferents@2`). One-way.
// RESUMABLE (append-only, keyed by `address`) + a live progress file for the watcher. Every file yields one line.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readToWeft } from "../../the-fold/read-process.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = "/Users/mlacy/Documents/3.0/Zenodotus";
const CAT = /^(\d\d|derived|legacy|scripts)/;

function argv() {
  const o = { root: DEFAULT_ROOT, out: path.join(HERE, "weft.jsonl"), shard: null, limit: Infinity, exclude: new Set() };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--root") o.root = a[++i];
    else if (a[i] === "--out") o.out = a[++i];
    else if (a[i] === "--shard") { const [x, n] = a[++i].split("/"); o.shard = { i: Number(x), n: Number(n) }; }
    else if (a[i] === "--limit") o.limit = Number(a[++i]);
    else if (a[i] === "--exclude") o.exclude = new Set(a[++i].split(","));
  }
  o.progress = o.out + ".progress.json";
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
const keyOf = (address) => address;
function readExisting(out) {
  const seen = new Set();
  if (!fs.existsSync(out)) return seen;
  for (const l of fs.readFileSync(out, "utf8").split("\n")) { if (!l) continue; try { const r = JSON.parse(l); if (r?.address) seen.add(keyOf(r.address)); } catch {} }
  return seen;
}

const o = argv();
fs.mkdirSync(path.dirname(o.out), { recursive: true });
const done = readExisting(o.out);
let files = walk(o.root)
  .map((f) => ({ f, rel: path.relative(o.root, f) }))
  .filter(({ rel }) => { const c = rel.split(path.sep)[0]; return !o.exclude.has(c) && CAT.test(c); })
  .sort((a, b) => a.rel.localeCompare(b.rel));
if (o.shard) files = files.filter((_, i) => i % o.shard.n === o.shard.i);
const todo = files.filter(({ rel }) => !done.has(rel)).slice(0, o.limit);

const t0 = Date.now();
let n = 0, errors = 0, edges = 0, chars = 0, figures = 0;
const fd = fs.openSync(o.out, "a");
const writeProgress = (current, finished) => {
  const el = (Date.now() - t0) / 1000;
  fs.writeFileSync(o.progress, JSON.stringify({
    schema: "WeftProgress@1", out: path.basename(o.out), reader: "engineRelationsFor (real)", shard: o.shard ? `${o.shard.i}/${o.shard.n}` : null,
    total: files.length, done: done.size + n, remaining: Math.max(0, files.length - (done.size + n)),
    readThisRun: n, errors, edges, chars, figureCuts: figures, perSec: el > 0 ? +(n / el).toFixed(2) : 0, elapsedSec: +el.toFixed(1),
    current, updated: new Date().toISOString(), finished: !!finished, pid: process.pid,
  }, null, 1));
};
process.stderr.write(`weft(REAL): ${files.length} files, ${done.size} done, ${todo.length} to read -> ${o.out}\n`);
writeProgress(null, Math.max(0, files.length - done.size) <= 0);

for (const { f, rel } of todo) {
  let text = ""; try { text = fs.readFileSync(f, "utf8"); } catch { text = ""; }
  const category = rel.split(path.sep)[0];
  const entry = readToWeft(text, { address: rel, category });   // THE reading process
  edges += (entry.edges ?? []).length;
  figures += entry.surprise?.figures ?? 0;               // SEG+EVA: the canonical cycle's surprise gate (read, never implied)
  entry.seq = done.size + n;
  fs.writeSync(fd, JSON.stringify(entry) + "\n");
  n += 1; chars += entry.readCharacters || 0; if (entry.error) errors += 1;
  writeProgress(entry.address, n === todo.length);        // every document — the page moves at once
  if (n % 5 === 0) {
    const el = (Date.now() - t0) / 1000;
    process.stderr.write(`  ${n}/${todo.length}  ${el.toFixed(0)}s  ${(n / el).toFixed(2)}/s  err ${errors}  edges ${edges}  figures ${figures}  ${entry.address}\n`);
  }
}
fs.closeSync(fd);
writeProgress(null, true);
const el = (Date.now() - t0) / 1000;
process.stderr.write(`done: ${n} this run in ${el.toFixed(0)}s (${(n / el).toFixed(2)}/s), edges ${edges}, figures ${figures}, errors ${errors}, remaining ${Math.max(0, files.length - (done.size + n))} -> ${o.out}\n`);
process.stdout.write(JSON.stringify({ read: n, remaining: Math.max(0, files.length - (done.size + n)), seconds: +el.toFixed(1), edges, figures, errors, out: o.out }) + "\n");
