// Adapter: a lintGfp result -> pharos entries, so pharos `compare` can ask "same verdict, same identity universe?"
// Each holon's verdict is an event; what it stood on is the identity partition in force at that holon AND below it
// (a roll-up reads its descendants), each stored once as a content-addressed source (addr = src:<sha256>).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
const REPO = process.argv[3];
const P = await import(pathToFileURL(path.join(REPO, 'lib/pharos.mjs')));
const KH = process.argv[2];
const { contains } = await import(pathToFileURL(path.join(KH, 'native/kernel/gfp-claim.js')));
const { systems } = await import('./identity-demo.mjs');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function toPharos(name, lint) {
  const h = P.open('lint', { dir: fs.mkdtempSync(path.join(os.tmpdir(), `lint-${name}-`)), writer: name });
  for (const [k, cell] of [['source', 'INS·Figure'], ['judgement', 'EVA·Figure']]) P.weave(h, { cell: 'DEF·Figure', kind: 'kind', addr: `kind:${k}`, body: { name: k, cell } });
  const src = (hol) => { const body = P.canonical({ at: hol.at, identity: hol.identity }); return P.weave(h, { cell: 'INS·Figure', kind: 'source', addr: 'src:' + sha(body), body: { at: hol.at, identity: hol.identity } }).id; };
  for (const hol of lint.holons) {
    const reads = lint.holons.filter((x) => contains(hol.at, x.at)).map(src);
    P.weave(h, { cell: 'EVA·Figure', kind: 'judgement', addr: `holon:${hol.at}`, body: { own: hol.own, below: hol.below, errors: hol.errors }, of: reads });
  }
  for (const f of lint.findings) P.weave(h, { cell: 'EVA·Figure', kind: 'judgement', addr: `finding:${f.kind}@${f.at}`, body: { severity: f.severity }, of: [src(lint.holons.find((x) => x.at === f.at))] });
  return h;
}
const A = toPharos('A', systems.A), B = toPharos('B', systems.B);
const r = P.compare(A, B);
console.log('relation:', r.relation, JSON.stringify(r.pasts), ' horizon:', JSON.stringify(r.horizon));
console.log('summary :', JSON.stringify(r.summary), ' inSync:', r.inSync);
for (const i of r.items) console.log(`  ${i.addr.padEnd(34)} ${i.verdict.padEnd(10)}${i.groundsDiffer !== undefined ? ' groundsDiffer=' + i.groundsDiffer : ''}`);
