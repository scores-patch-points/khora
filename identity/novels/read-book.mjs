// read-book.mjs <id8> — NOVELS-PREREG.md + PREREG-AMEND-1.md. One book through khora's ONE reader (native/the-fold/read-process.mjs::readToWeft):
// the whole document, in order, primed from janus/priors; then written as an EOT sidecar (EOTSource@1 pinned by sha256 + UTF-8 BYTE addressing,
// EOTObservation@1 per cast mention and per addressed edge) next to the raw weft. Questions and answers are not involved.
// env: KHORA_DIR (the worktree with origin/main), KHORA_PRIORS_DIR, optional MAXCH (read only the first N characters, for timing probes).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');
process.env.KHORA_PRIORS_DIR ||= path.join(process.env.HOME, 'Documents', 'janus', 'priors');
const id8 = process.argv[2]; const m = JSON.parse(fs.readFileSync(path.join(HERE, 'books-manifest.json'), 'utf8')).find((x) => x.ok && x.document_id.startsWith(id8));
if (!m) { console.error('no usable book'); process.exit(1); }
const file = path.join(HERE, m.file); const buf = fs.readFileSync(file); let text = buf.toString('utf8'); if (process.env.MAXCH) text = text.slice(0, +process.env.MAXCH);
const { readToWeft } = await import(pathToFileURL(path.join(KH, 'native/the-fold/read-process.mjs')).href);
const t0 = Date.now(); const w = readToWeft(text, { address: `book:${id8}`, language: 'eng' }); const secs = (Date.now() - t0) / 1000;
// char offset (UTF-16 index into `text`) -> UTF-8 byte offset
const B = (() => { const cache = new Map(); return (i) => { if (i <= 0) return 0; let k = 0, b = 0; for (const [ci, v] of cache) { } return Buffer.byteLength(text.slice(0, i), 'utf8'); }; })();
const out = path.join(HERE, 'weft'); fs.mkdirSync(out, { recursive: true });
const sha = crypto.createHash('sha256').update(buf).digest('hex');
const lines = [{ schema: 'EOTSource@1', path: m.file, sha256: sha, bytes: buf.length, newlines: (text.match(/\n/g) || []).length, addressing: 'utf8-byte [start,end)', reader: 'native/the-fold/read-process.mjs::readToWeft', language: w.language, primed: w.vocabulary?.grammarPrior === true }];
let n = 0;
for (const c of w.cast ?? []) (c.mentionSpans ?? []).forEach((sp, k) => lines.push({ schema: 'EOTObservation@1', id: `${id8}:m${n++}`, at: [B(sp[0]), B(sp[1])], role: 'mention', end1: c.ref, label: 'mention', end2: c.surface, ground: 'reader:cast' }));
for (const e of w.edges ?? []) for (const sp of e.spans ?? []) lines.push({ schema: 'EOTObservation@1', id: `${id8}:e${n++}`, at: [B(sp.start), B(sp.end)], role: 'edge', end1: e.end1, label: e.label, end2: e.end2, end1Face: e.end1Face, end2Face: e.end2Face, clause: e.clause, standing: e.assertion?.standing, ground: 'reader:edges' });
fs.writeFileSync(path.join(out, `${id8}.eot.jsonl`), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
fs.writeFileSync(path.join(out, `${id8}.weft.json`), JSON.stringify({ ...w, _secs: secs, _chars: text.length }));
console.log(JSON.stringify({ book: id8, chars: text.length, secs, cast: (w.cast ?? []).length, edges: (w.edges ?? []).length, sentences: (w.sentences ?? []).length, error: w.error ?? null, gaps: (w.gaps ?? []).length, lines: lines.length }));
