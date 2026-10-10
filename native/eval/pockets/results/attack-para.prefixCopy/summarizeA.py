# summarizeA.py -- aggregate out/A/*.json into A_summary.json and print a table.
import json, os, math, statistics as S, collections, sys
D = 'out/A'
rows = [json.load(open(os.path.join(D, f))) for f in sorted(os.listdir(D))]
VAR = ['full','eqTok10k','eqTok20k','eqLen6','eqLen10','eqLen14','eqLen22','drop1pct','dropHapax','dropTop20','alt','dedupAdj','dedupAll']
SIZE = ['eqTok10k','eqTok20k','eqLen6','eqLen10','eqLen14','eqLen22']
def zs(c): return None if c is None else c['z']
def exp_status(r, name):
    """expected status if the effect (z per sqrt(#pairs)) were unchanged and only the number of pairs changed"""
    v = r['variants'][name]; f = r['variants']['full']
    if v['discover'] is None or v['confirm'] is None or f['discover'] is None or f['confirm'] is None: return None
    e = []
    for w in ('discover','confirm'):
        zf = f[w]['z']; 
        if zf is None: return None
        e.append(zf * math.sqrt(v[w]['np'] / max(1, f[w]['np'])))
    if min(e) >= 4: return 'P+'
    if max(e) <= -4: return 'P-'
    if max(abs(x) for x in e) < 2: return 'A'
    return 'M'
def excess(c): return None if c is None or c['v'] is None or c['nullMean'] is None else c['v'] - c['nullMean']
out = {}
for sign in ('P+','P-'):
    base = [r for r in rows if r['atlasStatus'] == sign]
    out[sign] = {'nBase': len(base), 'variants': {}}
    for name in VAR:
        ev = [r for r in base if r['variants'][name]['status'] not in ('n/a',)]
        cnt = collections.Counter(r['variants'][name]['status'] for r in ev)
        samesign = 0; 
        ratio = []
        for r in ev:
            v = r['variants'][name]; f = r['variants']['full']
            zd, zc = zs(v['discover']), zs(v['confirm'])
            if zd is not None and zc is not None and zd * (1 if sign=='P+' else -1) > 0 and zc * (1 if sign=='P+' else -1) > 0: samesign += 1
            for w in ('discover','confirm'):
                ev_, ef = excess(v[w]), excess(f[w])
                if ev_ is not None and ef is not None and ef * (1 if sign=='P+' else -1) > 0: ratio.append(ev_ / ef)
        ent = {'nEval': len(ev), 'status': dict(cnt), 'sameSignBothHalves': samesign, 'medianExcessRatio': (S.median(ratio) if ratio else None), 'nExcessRatio': len(ratio)}
        if name in SIZE:
            ex = collections.Counter(exp_status(r, name) for r in ev)
            ent['expectedStatusIfEffectUnchanged'] = dict(ex)
        out[sign]['variants'][name] = ent
# by group / grain for key variants, P+ base only
def tab(key):
    t = {}
    for name in VAR[1:]:
        t[name] = {}
        for lv in sorted(set(r[key] for r in rows if r['atlasStatus']=='P+')):
            ev = [r for r in rows if r['atlasStatus']=='P+' and r[key]==lv and r['variants'][name]['status']!='n/a']
            if ev: t[name][lv] = {'n': len(ev), 'P+': sum(1 for r in ev if r['variants'][name]['status']=='P+')}
    return t
out['byGroup'] = tab('group'); out['byGrain'] = tab('grain')
json.dump(out, open('A_summary.json','w'), indent=1)
for sign in ('P+','P-'):
    print('BASE', sign, out[sign]['nBase'])
    for name in VAR:
        e = out[sign]['variants'][name]
        print(f"  {name:10s} n={e['nEval']:3d} {json.dumps(e['status'])} sameSign={e['sameSignBothHalves']} medExcessRatio={None if e['medianExcessRatio'] is None else round(e['medianExcessRatio'],2)} exp={e.get('expectedStatusIfEffectUnchanged')}")
