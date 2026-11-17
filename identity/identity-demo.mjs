// Two systems lint the SAME content claims; they differ only in which identity (same-as) claims are in scope.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const KH = process.argv[2];
const { gfpClaim } = await import(pathToFileURL(path.join(KH, 'native/kernel/gfp-claim.js')));
const { lintGfp } = await import(pathToFileURL(path.join(KH, 'native/organs/reasoning-lint.js')));

const c = (ground, rel, a, b) => gfpClaim({ ground, rel, roles: { ARG0: a, ARG1: b }, id: `${ground}:${rel}:${a}:${b}` });
const content = [
  c('/p1', 'died-in', 'Twain', '1910'), c('/p1/2', 'died-in', 'Clemens', '1911'), // would conflict IF Twain = Clemens
  c('/p2', 'died-in', 'Twain', '1910'),                                           // nothing to compare
  c('/p4', 'died-in', 'Twain', '1910'), c('/p4/1', 'died-in', 'Clemens', '1910'), // agrees either way
];
const alias = (g) => c(g, 'same-as', 'Twain', 'Clemens');
const opts = { functional: [{ rel: 'died-in', role: 'ARG1', giver: 'demo' }], identityRels: ['same-as'] };

export const systems = {
  A: lintGfp([...content, alias('/p1'), alias('/p4')], opts), // has the alias in scope at /p1 and /p4
  B: lintGfp(content, opts),                                  // same content, no alias anywhere
};
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [n, r] of Object.entries(systems)) {
    console.log(`system ${n}: ok=${r.ok} findings=${r.findings.map((f) => `${f.kind}@${f.at}`).join(',') || 'none'}`);
    console.log('  basis.declared =', JSON.stringify(r.basis.declared), ' holons:', r.holons.map((h) => `${h.at}(errors ${h.errors})`).join(' '));
  }
  console.log('basis identical?', JSON.stringify(systems.A.basis) === JSON.stringify(systems.B.basis));
}
