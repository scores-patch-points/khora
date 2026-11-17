// ingest-book.mjs <document_id prefix> — NOVELS-PREREG.md (sha256 033991b6…). One book: cut text -> segments -> pharos `text` entries (the asker)
// -> khora's own readTexts/readFull -> `text-reading` entries (khora's codec, unchanged) + `text-claims` entries (the claims readFull returns,
// woven by the same door and citing the reading). Reads the book in full; the questions and answers are not involved.
// env: KHORA_DIR (default: two levels up), PHAROS_LIB (default: a sibling pharos checkout), KHORA_PRIORS_DIR (default ~/Documents/janus/priors).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');
const PHAROS_LIB = process.env.PHAROS_LIB ?? path.resolve(HERE, '..', '..', '..', 'pharos', 'lib', 'pharos.mjs');
process.env.KHORA_PRIORS_DIR ||= path.join(process.env.HOME, 'Documents', 'janus', 'priors');
process.env.PHAROS_FORMAT = 'phb';
const id8 = process.argv[2]; if (!id8) { console.error('usage: node ingest-book.mjs <document_id prefix>'); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'books-manifest.json'), 'utf8')).find((m) => m.ok && m.document_id.startsWith(id8));
if (!manifest) { console.error('no usable book with that id'); process.exit(1); }
const cut = fs.readFileSync(path.join(HERE, manifest.file), 'utf8');

// ---- segments: paragraphs, long ones split at sentence ends into runs of at most MAXW words; offsets are into the cut text ----
const MAXW = 180, segs = [];
const para = /[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g;
for (let m; (m = para.exec(cut));) {
  const base = m.index, p = m[0];
  if (!p.trim()) continue;
  const words = p.split(/\s+/).filter(Boolean).length;
  if (words <= MAXW) { segs.push({ start: base, end: base + p.length }); continue; }
  const ends = [...p.matchAll(/[.!?]["”’')\]]*\s+/g)].map((e) => e.index + e[0].length);
  let from = 0, lastGood = 0;
  for (const e of [...ends, p.length]) {
    if (p.slice(from, e).split(/\s+/).filter(Boolean).length > MAXW && lastGood > from) { segs.push({ start: base + from, end: base + lastGood }); from = lastGood; }
    lastGood = e;
  }
  if (from < p.length) segs.push({ start: base + from, end: base + p.length });
}
const sha16 = (x) => crypto.createHash('sha256').update(String(x), 'utf8').digest('hex').slice(0, 16);
const segments = segs.map((s, i) => ({ i, ...s, text: cut.slice(s.start, s.end) })).filter((s) => s.text.trim().length >= 3);
const LOG = path.join(HERE, 'logs', id8); fs.mkdirSync(LOG, { recursive: true });
fs.writeFileSync(path.join(HERE, 'logs', `${id8}.segments.json`), JSON.stringify(segments.map(({ i, start, end, text }) => ({ i, start, end, addr: `text:${sha16(text)}`, words: text.split(/\s+/).filter(Boolean).length }))));
const pointer = path.join(LOG, 'pharos.json');
fs.writeFileSync(pointer, JSON.stringify({ v: 1, kind: 'pharos-pointer', lib: PHAROS_LIB, sha256: crypto.createHash('sha256').update(fs.readFileSync(PHAROS_LIB)).digest('hex') }, null, 2) + '\n');

const imp = (p) => import(pathToFileURL(path.join(KH, p)).href);
const { openDoor } = await imp('cli/pharos-door.mjs');
const { readTexts } = await imp('cli/paraphrase-read.mjs');
const { TEXT_KIND, READING_KIND, textAddr } = await imp('native/organs/text-reading.mjs');
const { readFull } = await imp('native/reading-full.js');
const asker = await openDoor({ pointer, log: id8, dir: LOG, writer: 'novel-asker' });
const khora = await openDoor({ pointer, log: id8, dir: LOG, writer: 'khora' });
if (!asker.on || !khora.on) { console.error('door off:', asker.why, khora.why); process.exit(1); }

asker.declare(TEXT_KIND, 'INS·Ground', "one passage of a book put to the reader: the text and its language (the asker's entry; khora reads it)");
const have = new Set((asker.fold({ kind: TEXT_KIND }) ?? []).map((e) => e.addr)); let woven = 0;
for (const s of segments) { const addr = textAddr(s.text); if (!have.has(addr) && asker.weave({ cell: 'INS·Ground', kind: TEXT_KIND, addr, body: { text: s.text, language: 'eng' } })) { have.add(addr); woven++; } }
console.log(`${id8}: ${segments.length} segments, ${manifest.cut_words} words; text entries woven this run ${woven}`, flush);
function flush() {}

const claimsOf = new Map(), progress = path.join(HERE, 'logs', `${id8}.progress`); let n = 0; const t0 = Date.now();
const wrapped = async (t, o) => { const R = await readFull(t, o); claimsOf.set(textAddr(t), R.claims ?? []); n++; if (n % 25 === 0) fs.writeFileSync(progress, `${n}/${have.size} ${((Date.now() - t0) / 1000).toFixed(0)}s`); return R; };
const r = await readTexts({ door: khora, readFull: wrapped });
console.log(JSON.stringify({ book: id8, texts: r.texts, read: r.read, woven: r.woven, failed: r.failed.length, skipped: r.skipped.length, secs: Math.round((Date.now() - t0) / 1000) }));

// the claims, as a second entry kind citing the reading (khora's text-reading codec carries rows only)
khora.declare('text-claims', 'INS·Figure', 'the claims khora readFull returned for one text (EOTClaim@1 as given: relation, arguments with referent identity), citing the text-reading they came with');
const readings = new Map((khora.fold({ kind: READING_KIND }) ?? []).map((e) => [e.addr, e])), haveC = new Set((khora.fold({ kind: 'text-claims' }) ?? []).map((e) => e.addr));
let c = 0;
for (const [addr, claims] of claimsOf) {
  const rd = readings.get(addr.replace(/^text:/, 'reading:')); if (!rd || haveC.has(addr.replace(/^text:/, 'claims:'))) continue;
  if (khora.weave({ cell: 'INS·Figure', kind: 'text-claims', addr: addr.replace(/^text:/, 'claims:'), body: { claims }, of: [rd.id] })) c++;
}
console.log(JSON.stringify({ book: id8, claimsEntries: c, door: khora.counts }));
process.exit(r.failed.length || r.skipped.length ? 2 : 0);
