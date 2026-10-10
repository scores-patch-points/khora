#!/usr/bin/env python3
"""summariseD.py -- summarise attack D: D-twins/*.json (twins of the real halves) and D2.json (new planted worlds) -> D-summary.json (printed)."""
import json, os, glob, math
from collections import Counter, defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
T = {os.path.basename(f)[:-5]: json.load(open(f)) for f in sorted(glob.glob(os.path.join(HERE, 'D-twins', '*.json')))}
KINDS = ['bag', 'pos', 'edge', 'mk1', 'mk1sym']
def corr(a, b):
    n = len(a); ma = sum(a) / n; mb = sum(b) / n; sa = sum((x - ma) ** 2 for x in a); sb = sum((x - mb) ** 2 for x in b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(sa * sb) if sa > 0 and sb > 0 else float('nan')
def rk(xs):
    idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
    while i < len(idx):
        j = i
        while j + 1 < len(idx) and xs[idx[j + 1]] == xs[idx[i]]: j += 1
        for k in range(i, j + 1): r[idx[k]] = (i + j) / 2
        i = j + 1
    return r
def spear(a, b): return corr(rk(a), rk(b))
def summarise(sel, label):
    out = {'label': label, 'nPockets': len(sel), 'kinds': {}}
    for k in KINDS:
        xs = []  # (real v, twin v, twin z, real z-sign) per pocket-half
        for r in sel:
            for w in ('discover', 'confirm'):
                t = r['twin'][w][k]
                if t is None or r['real'][w] is None: continue
                nm, sd = r['null'][w]['mean'], r['null'][w]['sd']
                xs.append((r['real'][w], t, (t - nm) / sd if sd and sd > 0 else None, r['id'], w))
        big = [x for x in xs if abs(x[0]) >= 0.01]
        rv = [x[0] for x in xs]; tv = [x[1] for x in xs]
        sse = sum((a - b) ** 2 for a, b, *_ in xs); mr = sum(rv) / len(rv); sst = sum((a - mr) ** 2 for a in rv)
        # pocket-level: twin PRESENT (|z|>=4 both halves same sign) with the real sign
        npres = nsame = nopp = 0
        for r in sel:
            zs = []
            for w in ('discover', 'confirm'):
                t = r['twin'][w][k]; nm, sd = r['null'][w]['mean'], r['null'][w]['sd']
                zs.append((t - nm) / sd if t is not None and sd and sd > 0 else None)
            if None in zs: continue
            if abs(zs[0]) >= 4 and abs(zs[1]) >= 4 and zs[0] * zs[1] > 0:
                npres += 1
                if (zs[0] > 0) == (r['status'] == 'P+'): nsame += 1
                else: nopp += 1
        out['kinds'][k] = {'nHalves': len(xs), 'pearson': corr(rv, tv), 'spearman': spear(rv, tv), 'reproductionR2': 1 - sse / sst, 'signAgreeBig': sum(1 for x in big if (x[0] > 0) == (x[1] > 0)) / len(big) if big else None, 'nBig': len(big),
                           'medianAbsErr': sorted(abs(a - b) for a, b, *_ in xs)[len(xs) // 2], 'medianAbsReal': sorted(abs(a) for a in rv)[len(rv) // 2], 'twinPresentPockets': npres, 'twinPresentSameSignAsReal': nsame, 'twinPresentOppositeSign': nopp}
    return out
real = [r for r in T.values() if r['status'] in ('P+', 'P-')]
S = {'present': summarise(real, 'atlas PRESENT pockets'), 'all': summarise([r for r in T.values()], 'all real pockets with a defined cell')}
S['presentPos'] = summarise([r for r in real if r['status'] == 'P+'], 'atlas P+ pockets'); S['presentNeg'] = summarise([r for r in real if r['status'] == 'P-'], 'atlas P- pockets')
# by language class and register group, PRESENT
def langclass(r): return 'code' if r['group'] == 'cd' else ('en' if r['language'] in ('en', 'eng', 'eng-tr', 'eng-aal', 'eng-ling', 'eng-var') else 'other')
for cls in ('en', 'other', 'code'):
    sel = [r for r in real if langclass(r) == cls]
    if len(sel) >= 8: S['present_' + cls] = summarise(sel, 'PRESENT, class ' + cls)
json.dump(S, open(os.path.join(HERE, 'D-summary.json'), 'w'), indent=1)
for key, s in S.items():
    print('==', s['label'], 'n', s['nPockets'])
    for k, v in s['kinds'].items(): print('  %-5s pearson %+.3f spearman %+.3f R2repro %+.3f signAgree(|v|>=.01) %.3f (n %d) medAbsErr %.4f medAbsReal %.4f | twin PRESENT pockets %d (same sign as real %d, opposite %d)' % (k, v['pearson'], v['spearman'], v['reproductionR2'], v['signAgreeBig'] or float('nan'), v['nBig'], v['medianAbsErr'], v['medianAbsReal'], v['twinPresentPockets'], v['twinPresentSameSignAsReal'], v['twinPresentOppositeSign']))
