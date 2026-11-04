// IDENT-0 step 1: read every spent-exam article once with the real pipeline (native/reading.js::readDocument), castIdentity off and on.
// Not scored. Output: eval/ident0/reads/<exam>__<doc>__<off|on>.json (the whole WeftEntry). Resumable.
//   KHORA_PRIORS_DIR=... node eval/ident0/read-all.mjs <exam root> <mode off|on> [shard i/n]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2], mode = process.argv[3]; const [si, sn] = (process.argv[4] ?? '0/1').split('/').map(Number);
const { readDocument } = await import(path.join(here, '../../native/reading.js'));
const jobs = [];
for (const ex of ['spent-castgold-v1', 'spent-castgold-v2', 'spent-castgold-v3']) {
  const inv = JSON.parse(fs.readFileSync(path.join(root, ex, 'inventory.json'), 'utf8'));
  for (const doc of Object.keys(inv.docs)) jobs.push({ ex, doc, file: path.join(root, ex, 'text', doc + '.txt') });
}
jobs.forEach((j, i) => {});
let k = 0;
for (const j of jobs) {
  if ((k++ % sn) !== si) continue;
  const out = path.join(here, 'reads', `${j.ex}__${j.doc}__${mode}.json`);
  if (fs.existsSync(out)) continue;
  const text = fs.readFileSync(j.file, 'utf8');
  const e = await readDocument(text, { language: 'en', minCharacters: 0, lexicon: false, castIdentity: mode === 'on' });
  fs.writeFileSync(out, JSON.stringify(e));
  console.log('read', j.ex, j.doc, mode, e.ms, 'ms');
}
