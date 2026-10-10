# summarizeG.py -- second-token increment: P(2-token opening | same first token) vs unit-order null, over the 299 atlas-P+ pockets.
import json, collections, statistics as S
G=json.load(open('out/G/all.json')); M=json.load(open('../atlas-matrix.json')); I=M['statistics'].index('para.prefixCopy')
meta={p['id']:p for p in M['pockets']}
def st(a,b):
    if a is None or b is None: return 'undef'
    if abs(a)>=4 and abs(b)>=4 and a*b>0: return 'P+' if a>0 else 'P-'
    if abs(a)<2 and abs(b)<2: return 'A'
    return 'M'
out={'global':collections.Counter(),'within':collections.Counter()}; byreg=collections.defaultdict(collections.Counter)
for id,g in G.items():
    if meta[id]['cells'][I][4]!='P+': continue
    sg=st(g['discover']['gz'],g['confirm']['gz']); sw=st(g['discover']['wz'],g['confirm']['wz'])
    out['global'][sg]+=1; out['within'][sw]+=1; byreg[meta[id]['group']][sg]+=1
print({k:dict(v) for k,v in out.items()}); print({k:dict(v) for k,v in byreg.items()})
# share of first-token copies that continue to a 2-token copy, vs null
sh=[];nm=[]
for id,g in G.items():
    if meta[id]['cells'][I][4]!='P+': continue
    for w in ('discover','confirm'):
        x=g[w]
        if x['gv'] is not None and x['gnm'] is not None: sh.append(x['gv']); nm.append(x['gnm'])
print('median P(second|first) observed', S.median(sh), 'null', S.median(nm), 'n half-cells', len(sh))
json.dump({'global':dict(out['global']),'within':dict(out['within']),'medianObserved':S.median(sh),'medianNull':S.median(nm),'byGroupGlobal':{k:dict(v) for k,v in byreg.items()}},open('G_summary.json','w'),indent=1)
