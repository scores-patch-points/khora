// ingest.mjs — passages -> pharos `text` entries (the asker) -> khora's own readTexts/readFull -> `text-reading` entries.
// The real codec: khora's cli/paraphrase-read.mjs readTexts and cli/pharos-door.mjs, unchanged, from the khora checkout at main.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');   // the khora checkout root (identity/curious -> ..)
const PHAROS_LIB = process.env.PHAROS_LIB ?? path.resolve(HERE, '..', '..', '..', 'pharos', 'lib', 'pharos.mjs');
process.env.KHORA_PRIORS_DIR = path.join(process.env.HOME, 'Documents', 'janus', 'priors');
process.env.PHAROS_FORMAT = 'phb';                    // the binary store (pharos S1), on real data
const LOG = path.join(HERE, 'log');
fs.mkdirSync(LOG, { recursive: true });
const pointer = path.join(HERE, 'pharos.json');
fs.writeFileSync(pointer, JSON.stringify({ v: 1, kind: 'pharos-pointer', lib: PHAROS_LIB, sha256: crypto.createHash('sha256').update(fs.readFileSync(PHAROS_LIB)).digest('hex') }, null, 2) + '\n');

const imp = (p) => import(pathToFileURL(path.join(KH, p)).href);
const { openDoor } = await imp('cli/pharos-door.mjs');
const { readTexts } = await imp('cli/paraphrase-read.mjs');
const { TEXT_KIND, textAddr } = await imp('native/organs/text-reading.mjs');
const { readFull } = await imp('native/reading-full.js');

const asker = await openDoor({ pointer, log: 'curious', dir: LOG, writer: 'curious-asker' });
const khora = await openDoor({ pointer, log: 'curious', dir: LOG, writer: 'khora' });
if (!asker.on || !khora.on) { console.error('door off:', asker.why, khora.why); process.exit(1); }

const pools = JSON.parse(fs.readFileSync(path.join(HERE, 'passages.json'), 'utf8'));
asker.declare(TEXT_KIND, 'INS·Ground', 'one passage of text put to the reader: the text and its language (the asker\'s entry; khora reads it)');
let woven = 0, have = new Set((asker.fold({ kind: TEXT_KIND }) ?? []).map((e) => e.addr));
for (const [genre, ps] of Object.entries(pools)) for (const p of ps) {
  const addr = textAddr(p.text); if (have.has(addr)) continue;
  if (asker.weave({ cell: 'INS·Ground', kind: TEXT_KIND, addr, body: { text: p.text, language: 'eng' } })) { woven++; have.add(addr); }
}
console.log(`text entries woven this run: ${woven}; in the log: ${have.size}`, asker.counts, flush);
function flush() {}

const progress = path.join(HERE, 'ingest-progress.log'); let n = 0; const t0 = Date.now();
const timed = async (t, o) => { const s = Date.now(); const R = await readFull(t, o); fs.appendFileSync(progress, `${++n} ${Date.now() - s}ms ${t.length}ch ${((Date.now() - t0) / 1000).toFixed(0)}s\n`); return R; };
const r = await readTexts({ door: khora, readFull: timed });
console.log(JSON.stringify({ texts: r.texts, read: r.read, woven: r.woven, failed: r.failed.length, skipped: r.skipped.length, why: r.why }));
if (r.failed.length) console.log(JSON.stringify(r.failed.slice(0, 5)));
process.exit(r.failed.length || r.skipped.length ? 2 : 0);
