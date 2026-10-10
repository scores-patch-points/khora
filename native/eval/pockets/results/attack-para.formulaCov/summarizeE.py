# summarizeE.py -- head/tail decomposition of formulaCov (out/E/*.json): which 4-grams carry the coverage?
import json, os, sys, glob, collections
H = os.path.dirname(os.path.abspath(__file__)); M = json.load(open(os.path.join(H, '..', 'atlas-matrix.json'))); S = M['statistics']; si = S.index('para.formulaCov')
meta = {p['id']: p for p in M['pockets'] if p['kind'] == 'real'}
E = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(os.path.join(H, 'out', 'E', '*.json'))}
def cls(c, nd=20):
    if c is None: return 'na'
    if c['z'] is not None: return 'P' if c['z'] >= 4 else ('A' if abs(c['z']) < 2 else 'M')
    if c['v'] is not None and c['v'] > c['nullMean'] and c['p'] <= 1/(nd+1)+1e-9: return 'Pu'
    return 'Z' if (c['v'] == 0 and c['nullMean'] == 0) else 'A'
def pk(res, key):
    d, c = res['halves']['discover'], res['halves']['confirm']
    if d is None or c is None: return 'na'
    a, b = cls(d[key]), cls(c[key])
    if a in ('P', 'Pu') and b in ('P', 'Pu'): return 'P+'
    if a in ('Z', 'A') and b in ('Z', 'A'): return 'ABSENT'
    return 'AMBIG'
keys = ['all', 'head100', 'tail1_100', 'tail2_100']
out = {'n': len(E)}
for subset, sel in (('atlasPresent242', lambda i: meta[i]['cells'][si][4] == 'P+'), ('all391', lambda i: True)):
    ids = [i for i in E if sel(i)]; o = {'n': len(ids)}
    for k in keys:
        o[k] = dict(collections.Counter(pk(E[i], k) for i in ids))
    # share of v carried by each class (median over pockets, mean of halves)
    def med(xs): xs = sorted(xs); n = len(xs); return None if not n else (xs[n//2] if n % 2 else (xs[n//2-1]+xs[n//2])/2)
    sh = {}
    for k in keys[1:]:
        r = []
        for i in ids:
            d, c = E[i]['halves']['discover'], E[i]['halves']['confirm']
            if d is None or c is None: continue
            va = (d['all']['v']+c['all']['v'])/2; vk = (d[k]['v']+c[k]['v'])/2; ea = (d['all']['v']-d['all']['nullMean']+c['all']['v']-c['all']['nullMean'])/2; ek = (d[k]['v']-d[k]['nullMean']+c[k]['v']-c[k]['nullMean'])/2
            if va > 0: r.append((vk/va, ek/ea if ea > 0 else None, meta[i]['group'], meta[i]['register']))
        sh[k] = {'medianShareOfV': med([x[0] for x in r]), 'medianShareOfExcess': med([x[1] for x in r if x[1] is not None]), 'n': len(r)}
        for g in ('cd', 'bk', 'fm', 'ml', 'oc', 'ud'): sh[k]['group_'+g] = med([x[0] for x in r if x[2] == g])
        for g in ('code', 'novel', 'legal', 'scripture', 'treatise', 'chat', 'treebank', 'notation', 'poetry'): sh[k]['reg_'+g] = med([x[0] for x in r if x[3] == g])
    o['shareOfV'] = sh
    # pockets where tail1 absent while all is present
    o['tail1AbsentWhileAllPresent'] = [(i, meta[i]['register']) for i in ids if pk(E[i], 'all') == 'P+' and pk(E[i], 'tail1_100') == 'ABSENT'][:80]
    o['tail2AbsentWhileAllPresent_n'] = sum(1 for i in ids if pk(E[i], 'all') == 'P+' and pk(E[i], 'tail2_100') == 'ABSENT')
    o['headOnlyPresentTailAbsent_n'] = sum(1 for i in ids if pk(E[i], 'head100') == 'P+' and pk(E[i], 'tail1_100') in ('ABSENT',))
    out[subset] = o
json.dump(out, open(os.path.join(H, 'out', 'E_summary.json'), 'w'), indent=1)
print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk not in ('tail1AbsentWhileAllPresent',)} if isinstance(v, dict) else v for k, v in out.items()}, indent=1)[:5500])
