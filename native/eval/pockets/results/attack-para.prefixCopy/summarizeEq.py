# summarizeEq.py -- the register-dependence of PRESENCE at EQUAL SIZE: for all defined pockets, status of prefixCopy on 10,000-token subsamples per half (segment subsample, atlas null), eta2 of P+ ~ register with permutation p;
# and the mean z at equal size for the claim's weak registers vs its strong registers.  Standard library only.
import json, os, random, collections, math, statistics as S
M=json.load(open('../atlas-matrix.json')); I=M['statistics'].index('para.prefixCopy'); meta={p['id']:p for p in M['pockets']}
R={}
for d in ('out/A','out/A_np'):
    for f in os.listdir(d): R[f[:-5]]=json.load(open(os.path.join(d,f)))
def zbar(v):
    a,b=v['discover'],v['confirm']
    return None if a is None or b is None or a['z'] is None or b['z'] is None else (a['z']+b['z'])/2
rows=[]
for id,r in R.items():
    v=r['variants']['eqTok10k']
    if v['status']=='n/a': continue
    rows.append({'id':id,'register':meta[id]['register'],'group':meta[id]['group'],'status':v['status'],'zbar':zbar(v),'full':r['variants']['full']['status'],'tokens':meta[id]['tokens'],'mul':meta[id]['meanUnitLength']})
print('pockets evaluable at 10k tokens/half:',len(rows),collections.Counter(x['status'] for x in rows))
def eta2(y,lab):
    n=len(y); my=sum(y)/n; sst=sum((v-my)**2 for v in y); s=collections.defaultdict(float); c=collections.Counter()
    for v,l in zip(y,lab): s[l]+=v; c[l]+=1
    return (sum(s[l]**2/c[l] for l in c)-n*my*my)/sst
rng=random.Random(11)
def perm(y,lab,B=2000):
    o=eta2(y,lab); l=list(lab); ge=0
    for b in range(B):
        rng.shuffle(l); ge+=eta2(y,l)>=o
    return o,(ge+1)/(B+1)
y=[1.0 if x['status']=='P+' else 0.0 for x in rows]; lab=[x['register'] for x in rows]
o,p=perm(y,lab); print('eta2 presence@10k ~ register',round(o,3),'p',p,'levels',len(set(lab)))
# the same on the same pockets with the full-size atlas status
y0=[1.0 if x['full']=='P+' else 0.0 for x in rows]; o0,p0=perm(y0,lab); print('eta2 presence@full on the same pockets',round(o0,3),'p',p0)
zz=[x['zbar'] for x in rows if x['zbar'] is not None]; lz=[x['register'] for x in rows if x['zbar'] is not None]
o1,p1=perm(zz,lz); print('eta2 zbar@10k ~ register',round(o1,3),'p',p1)
weak={'children','notation','poetry','history','nomenclature'}; strong={'code','scripture','legal','academic','chat','dialect','novel','treebank','book'}
for nm,sel in (('weak',weak),('strong',strong)):
    s=[x for x in rows if x['register'] in sel]; print(nm,len(s),'P+@10k',sum(1 for x in s if x['status']=='P+'),'median zbar',round(S.median([x['zbar'] for x in s if x['zbar'] is not None]),2))
# permutation test of the weak-vs-strong difference in presence@10k
sub=[x for x in rows if x['register'] in weak|strong]; yy=[1.0 if x['status']=='P+' else 0.0 for x in sub]; ww=[x['register'] in weak for x in sub]
d0=S.mean([a for a,b in zip(yy,ww) if not b])-S.mean([a for a,b in zip(yy,ww) if b]); ge=0; w2=list(ww)
for b in range(2000):
    rng.shuffle(w2); d=S.mean([a for a,b_ in zip(yy,w2) if not b_])-S.mean([a for a,b_ in zip(yy,w2) if b_]); ge+=d>=d0
print('strong-weak presence difference at 10k',round(d0,3),'perm p',(ge+1)/2001)
# size within register: for the weak registers, tokens vs the strong registers
print('median tokens per pocket weak/strong',S.median([x['tokens'] for x in rows if x['register'] in weak]),S.median([x['tokens'] for x in rows if x['register'] in strong]))
byreg=collections.defaultdict(collections.Counter)
for x in rows: byreg[x['register']][x['status']]+=1
print({k:dict(v) for k,v in sorted(byreg.items(), key=lambda kv:-sum(kv[1].values())) if sum(v.values())>=6})
json.dump({'nEval':len(rows),'status':dict(collections.Counter(x['status'] for x in rows)),'eta2Presence10k':o,'p':p,'eta2PresenceFullSameSet':o0,'pFull':p0,'eta2z10k':o1,'pz':p1,'strongMinusWeak':d0,'pStrongWeak':(ge+1)/2001},open('Eq_summary.json','w'),indent=1)
