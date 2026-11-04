// IDENT-0: derive pairs mechanically from the three spent inventories. No reader output is read here. No labelling.
//   node eval/ident0/pairs.mjs <exam root> > eval/ident0/pairs.json
import fs from 'node:fs'; import path from 'node:path';
const root = process.argv[2];
const norm = (s) => s.normalize('NFC').toLowerCase();
// words of a form: runs of letters/digits; drop a token that is lowercase in the original and <= 3 letters (of, the, de, and) and any 1-character token
const words = (f) => (f.normalize('NFC').match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 1 && !(w === w.toLowerCase() && /\p{L}/u.test(w) && w.length <= 3)).map((w) => w.toLowerCase());
const shareWord = (a, b) => { const B = new Set(words(b)); return words(a).some((w) => B.has(w)); };
const contains = (a, b) => { const x = norm(a), y = norm(b); return x !== y && (x.includes(y) || y.includes(x)); };
const out = { schema: 'IdentPairs@1', pos: [], neg: [], dropped: { ambiguousForm: [], dupForm: 0 } };
for (const [ei, ex] of ['spent-castgold-v1', 'spent-castgold-v2', 'spent-castgold-v3'].entries()) {
  const inv = JSON.parse(fs.readFileSync(path.join(root, ex, 'inventory.json'), 'utf8'));
  for (const [doc, d] of Object.entries(inv.docs)) {
    const ents = Object.entries(d.entities).map(([k, forms]) => [k, [...new Set(forms)]]);
    // a form string listed under two entities of the article is ambiguous: dropped from every pair
    const owner = new Map(); for (const [k, fs_] of ents) for (const f of fs_) { const n = norm(f); owner.set(n, (owner.get(n) ?? new Set()).add(k)); }
    const amb = new Set([...owner].filter(([, s]) => s.size > 1).map(([n]) => n)); for (const n of amb) out.dropped.ambiguousForm.push(`${ex}/${doc}:${n}`);
    const seenForm = new Map(); // case-insensitive duplicates inside an entity
    for (const [k, forms] of ents) {
      const uniq = []; for (const f of forms) { const n = norm(f); if (amb.has(n)) continue; if (uniq.some((u) => norm(u) === n)) { out.dropped.dupForm++; continue; } uniq.push(f); }
      for (let i = 0; i < uniq.length; i++) for (let j = i + 1; j < uniq.length; j++) out.pos.push({ ex, doc, entity: k, a: uniq[i], b: uniq[j] });
    }
    for (let x = 0; x < ents.length; x++) for (let y = x + 1; y < ents.length; y++)
      for (const fa of ents[x][1]) for (const fb of ents[y][1]) {
        if (amb.has(norm(fa)) || amb.has(norm(fb))) continue;
        const why = contains(fa, fb) ? 'contains' : shareWord(fa, fb) ? 'shares-word' : null;
        if (why) out.neg.push({ ex, doc, entityA: ents[x][0], entityB: ents[y][0], a: fa, b: fb, why });
      }
  }
}
const tally = (arr, f) => arr.reduce((m, p) => (m[f(p)] = (m[f(p)] ?? 0) + 1, m), {});
out.counts = { pos: out.pos.length, neg: out.neg.length, negEntityPairs: new Set(out.neg.map((p) => `${p.ex}/${p.doc}/${p.entityA}/${p.entityB}`)).size,
  posByExam: tally(out.pos, (p) => p.ex), negByExam: tally(out.neg, (p) => p.ex), negByWhy: tally(out.neg, (p) => p.why), articles: new Set([...out.pos, ...out.neg].map((p) => `${p.ex}/${p.doc}`)).size };
console.log(JSON.stringify(out, null, 1));
