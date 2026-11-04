import fs from "node:fs";
import { readDocument } from "../../native/reading.js";
import { createActivation } from "../../native/kernel/activation.js";
import { findThirdPersonSingular, sameClause } from "../../native/adapters/text/pronouns.js";
const B2="/private/tmp/claude-501/-Users-mlacy-Documents-claude-code/32866c18-a0cd-406b-951b-044c2008e7c1/scratchpad/bindgold2/";
const cases = JSON.parse(fs.readFileSync(B2+"PARA-GOLD-BIND-V2.binder.json","utf8")).cases;
const raw = JSON.parse(fs.readFileSync("../../eval/attention/V2-RAW.json","utf8")).rows;
const norm = (s) => String(s).toLowerCase().replace(/\s+/g," ").trim();
const wsuf = (l,s) => l===s || l.endsWith(" "+s);
const matches = (surfs, acc) => surfs.map(norm).some(s => acc.map(norm).some(a => wsuf(a,s)||wsuf(s,a)));
const prefixish = (surfs, acc) => surfs.map(norm).some(s => acc.map(norm).some(a => a.startsWith(s+" ")||a.startsWith(s+"/")||s.startsWith(a+" ")));
const out = [];
for (const doc of [...new Set(cases.map(c=>c.doc))]) {
  const buf = fs.readFileSync(B2+"text/"+doc+".txt"); const text = buf.toString("utf8");
  const e = await readDocument(text,{language:"en",minCharacters:0});
  const all=[]; for (const c of e.cast) for (const [a,b] of c.mentionSpans??[]) all.push({ref:c.ref,start:a,end:b});
  const kept = all.filter(m=>!all.some(o=>o.ref!==m.ref&&o.start<m.end&&m.start<o.end&&o.end-o.start>m.end-m.start));
  const names = new Map(e.cast.map(c=>[c.ref,c.allSurfaces]));
  // person evidence, as the binder's text_evidence ruling
  const person=new Set(); const inS=(s)=>kept.filter(m=>m.start>=s.offset&&m.end<=s.offset+s.text.length).sort((a,b)=>a.start-b.start);
  for (const s of e.sentences){const ms=inS(s);const n=new Set(ms.map(m=>m.ref));if(n.size!==1)continue;const [o]=n;for(const h of findThirdPersonSingular(s.text,"en"))if(ms.some(m=>sameClause(s.text,m.start-s.offset,h.index)))person.add(o);}
  for (const c of cases.filter(c=>c.doc===doc)) {
    const r = raw.find(x=>x.id===c.id);
    const tokChar = buf.subarray(0,c.tokenStart??c.start).toString("utf8").length;
    const sIdx = e.sentences.findIndex(s=>s.offset<=tokChar && tokChar<s.offset+s.text.length);
    const goldRefs = c.accept.filter(a=>a!=="none").length ? e.cast.filter(x=>matches(x.allSurfaces,c.accept)).map(x=>x.ref) : [];
    const goldTrunc = goldRefs.length ? [] : (c.accept.filter(a=>a!=="none").length ? e.cast.filter(x=>prefixish(x.allSurfaces,c.accept)).map(x=>x.ref) : []);
    // replay presence over sentences before sIdx (no self-feed; approximation)
    const act = createActivation({window:12});
    for (let i=0;i<sIdx;i++){const ms=inS(e.sentences[i]).filter(m=>!person.has(m.ref));const fired=ms.map(m=>m.ref);if(ms.length)for(let k=1;k<2;k++)fired.push(ms[0].ref);act.observe(fired);}
    const prior = (ref) => kept.filter(m=>m.ref===ref&&m.end<=tokChar).length;
    const lastDist = (ref) => { const ss=e.sentences.map((s,i)=>[i,inS(s).some(m=>m.ref===ref)]).filter(([i,h])=>h&&i<sIdx).map(([i])=>i); return ss.length? sIdx-ss[ss.length-1] : null; };
    const g = (goldRefs.length?goldRefs:goldTrunc);
    const best = g.map(ref=>({ref,name:names.get(ref)[0],prior:prior(ref),isPerson:person.has(ref),act:+act.activationOf(ref).toFixed(2),lastDist:lastDist(ref)})).sort((a,b)=>b.prior-a.prior)[0] ?? null;
    // top candidate by replayed presence
    const cands=[...new Set(kept.map(m=>m.ref))].filter(x=>!person.has(x)).map(x=>[x,act.activationOf(x)]).sort((a,b)=>b[1]-a[1]);
    out.push({id:c.id,kind:c.kind,trapKind:c.trapKind,surface:c.surface,verdict:r.verdict,reason:r.reason,boundTo:r.bound,activation:r.activation,margin:r.margin,
      goldInCast: goldRefs.length>0, goldTruncatedInCast: goldRefs.length===0&&goldTrunc.length>0, gold:best, topReplay:cands[0]?{name:names.get(cands[0][0])[0],act:+cands[0][1].toFixed(2)}:null, sentIdx:sIdx});
  }
}
fs.writeFileSync("/private/tmp/claude-501/-Users-mlacy-Documents-claude-code/1a3e3e6c-b060-4226-9529-431672683fb5/scratchpad/diag4.json",JSON.stringify(out,null,1));
console.log("wrote",out.length);
