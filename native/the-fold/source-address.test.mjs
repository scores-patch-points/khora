import test from 'node:test';
import assert from 'node:assert/strict';
import { locateSentences } from './source-address.mjs';

test('exact original UTF-8 bytes with astral text and trimmed reader sentences', () => {
  const source = '🧪 Intro\n  Éloïse a parlé.   Péricles a répondu.\n';
  const start = source.indexOf('Éloïse');
  const r = locateSentences(source, start, [{ order: 0, text: 'Éloïse a parlé.' }, { order: 1, text: 'Péricles a répondu.' }]);
  assert.equal(r.gaps.length, 0);
  assert.equal(r.found.get(0).byteAt, Buffer.byteLength(source.slice(0, start)));
  assert.equal(r.found.get(1).byteAt, Buffer.byteLength(source.slice(0, source.indexOf('Péricles'))));
  for (const v of r.found.values()) assert.equal(Buffer.from(source).subarray(v.byteAt, v.byteEnd).toString(), source.slice(v.charAt, v.charEnd));
});
test('source extent rejects out-of-read matches even when repeated later', () => {
  const source='One. Two. One.';
  const r=locateSentences(source,0,[{order:0,text:'One.'},{order:1,text:'Two.'},{order:2,text:'One.'}],{endChar:9});
  assert.equal(r.found.size,2); assert.equal(r.gaps[0].reason,'sentence_outside_read_extent');
});
test('missing witness and duplicate order are typed gaps',()=>{
  const r=locateSentences('One. Two.',0,[{order:0,text:'One.'},{order:0,text:'Two.'},{order:1,text:'Absent'}]);
  assert.equal(r.found.size,1); assert.deepEqual(r.gaps.map(x=>x.reason),['missing_or_duplicate_sentence_order','sentence_not_at_source']);
});
test('invalid source bounds are refused',()=>{
  assert.throws(()=>locateSentences('abc',0,[],{endChar:4}),RangeError);
  assert.throws(()=>locateSentences('abc',-1,[]),RangeError);
});
