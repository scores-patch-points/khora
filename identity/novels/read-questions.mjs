// read-questions.mjs <id8> — each selected question read by the same reader (readToWeft, one call per question). Evaluation books need FREEZE.md.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const id8 = process.argv[2];
if (!['4a92bf27', 'e72d83e5'].includes(id8) && !fs.existsSync(path.join(HERE, 'FREEZE.md'))) { console.error('FREEZE.md required'); process.exit(1); }
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');
process.env.KHORA_PRIORS_DIR ||= path.join(process.env.HOME, 'Documents', 'janus', 'priors');
const { readWith } = await import(pathToFileURL(path.join(KH, 'native/the-fold/read-core.mjs')).href);
const qs = JSON.parse(fs.readFileSync(path.join(HERE, `questions-${id8}.json`), 'utf8'));
const out = qs.map((x, i) => { const w = readWith(x.q, { address: `q:${id8}:${i}`, language: 'eng', minCharacters: 1 }); return { ...x, clauses: w.clauses, cast: w.cast, edges: w.edges, sentences: w.sentences, error: w.error ?? null }; });
fs.writeFileSync(path.join(HERE, `questions-${id8}.read.json`), JSON.stringify(out));
console.log(id8, out.length, 'questions read;', out.filter((o) => o.error).length, 'errors');
