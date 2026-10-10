# summarizeClass.py -- per-register table: atlas status counts over all defined pockets of the register, then how many of those stay P+ under the attack variants (denominator = pockets of the register that were atlas P+ AND evaluable).
import json, os, collections
M=json.load(open('../atlas-matrix.json')); I=M['statistics'].index('para.prefixCopy')
real=[p for p in M['pockets'] if p['kind']=='real' and not p['thin'] and p['cells'][I][4] not in ('zundef','nodata')]
A={f[:-5]:json.load(open('out/A/'+f)) for f in os.listdir('out/A')}
E={f[:-5]:json.load(open('out/E/'+f)) for f in os.listdir('out/E')}
def st(a,b):
    if a is None or b is None: return 'undef'
    if abs(a)>=4 and abs(b)>=4 and a*b>0: return 'P+' if a>0 else 'P-'
    if abs(a)<2 and abs(b)<2: return 'A'
    return 'M'
byreg=collections.defaultdict(list)
for p in real: byreg[p['register']].append(p)
rows=[]
for reg,ps in sorted(byreg.items(), key=lambda kv:-len(kv[1])):
    ids=[p['id'] for p in ps]; pos=[i for i in ids if i in A and A[i]['atlasStatus']=='P+']
    def cnt(var):
        ev=[i for i in pos if A[i]['variants'][var]['status']!='n/a']
        return [sum(1 for i in ev if A[i]['variants'][var]['status']=='P+'),len(ev)]
    within=[sum(1 for i in pos if E[i]['halves'] and st(E[i]['halves']['discover']['within']['prefixCopy']['z'],E[i]['halves']['confirm']['within']['prefixCopy']['z'])=='P+'),len(pos)]
    rows.append({'register':reg,'nDefined':len(ps),'atlasPplus':len(pos),'eqTok10k':cnt('eqTok10k'),'eqLen6':cnt('eqLen6'),'eqLen14':cnt('eqLen14'),'dropTop20':cnt('dropTop20'),'dedupAll':cnt('dedupAll'),'withinDocNull':within})
json.dump(rows,open('A_E_byregister.json','w'),indent=1)
print('register n  Pplus | eqTok10k | eqLen6 | eqLen14 | dropTop20 | dedupAll | within-doc')
for r in rows:
    if r['nDefined']>=4: print(f"{r['register']:13s} {r['nDefined']:3d} {r['atlasPplus']:3d} | {r['eqTok10k'][0]}/{r['eqTok10k'][1]} | {r['eqLen6'][0]}/{r['eqLen6'][1]} | {r['eqLen14'][0]}/{r['eqLen14'][1]} | {r['dropTop20'][0]}/{r['dropTop20'][1]} | {r['dedupAll'][0]}/{r['dedupAll'][1]} | {r['withinDocNull'][0]}/{r['withinDocNull'][1]}")
