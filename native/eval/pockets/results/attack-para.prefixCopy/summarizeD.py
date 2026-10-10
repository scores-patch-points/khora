import json, collections
W=json.load(open('out/D/worlds.json'))
rows=[]
for w in W:
    g=w['global']['prefixCopy']; n=w['within']['prefixCopy']
    rows.append({'id':w['id'],'statusGlobal':g['status'],'zGlobal':g['z'],'vGlobal':g['v'],'statusWithin':n['status'],'zWithin':n['z'],'posParGlobal':w['global']['posPar']['status'],'firstTokGlobal':w['global']['firstTokCopy']['status'],'posParTailGlobal':w['global']['posParTail']['status']})
iid=[r for r in rows if r['id'].startswith('d-null') or r['id'] in ('pl-null','pl-null2')]
out={'worlds':rows,
 'iid':{'n':len(iid),'present':sum(1 for r in iid if r['statusGlobal'] in ('P+','P-')),'status':dict(collections.Counter(r['statusGlobal'] for r in iid))},
 'noMechanismPPlus':[r['id'] for r in rows if r['statusGlobal']=='P+' and r['id']!='pl-parallel'],
 'noMechanismPPlusStillWithin':[r['id'] for r in rows if r['statusGlobal']=='P+' and r['id']!='pl-parallel' and r['statusWithin']=='P+'],
 'refractoryPMinus':[r['id'] for r in rows if r['statusGlobal']=='P-']}
json.dump(out,open('D_summary.json','w'),indent=1)
print(out['iid'],out['noMechanismPPlus'],out['noMechanismPPlusStillWithin'],out['refractoryPMinus'])
for r in rows:
    if not r['id'].startswith('d-null'): print(f"{r['id']:20s} {r['statusGlobal']:3s} z {r['zGlobal'][0]:.1f}/{r['zGlobal'][1]:.1f} v {r['vGlobal'][0]:.4f} within {r['statusWithin']:3s} z {r['zWithin'][0]:.1f}/{r['zWithin'][1]:.1f}" if r['zGlobal'][0] is not None and r['zGlobal'][1] is not None else r['id'])
