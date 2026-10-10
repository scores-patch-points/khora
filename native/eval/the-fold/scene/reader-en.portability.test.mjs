// Run against the patched experimental reader with real native Khora organs.
// This is not a test of the canonical readToWeft pipeline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readEnglish } from './reader-en.mjs';

test('reader loads without a private machine path and retains source character offsets',async()=>{
 const raw='  Preface 🧪\n\n  Pierre was speaking.    Natasha was listening.\n';
 const r=await readEnglish({text:raw});
 assert.ok(r.sents.length>0,'at least one sentence');
 for(const s of r.sents)assert.equal(raw.slice(s.offset,s.offset+s.text.length),s.text);
 assert.equal(r.eot.language,'eng');
});
test('surprise vector retains chronological clause order, not sorted quantiles',async()=>{
 const raw='Pierre was speaking. Natasha was listening. Pierre went home. Natasha had watched Pierre.';
 const r=await readEnglish({text:raw});
 assert.deepEqual(r.eot.sceneSignal,r.clauses.map(c=>c.learning));
});
test('a text with no admitted referents does not create an empty-match loop',async()=>{
 const r=await readEnglish({text:'zqx zzq xxq.'});
 assert.equal(r.eot.medium,'text');
});
