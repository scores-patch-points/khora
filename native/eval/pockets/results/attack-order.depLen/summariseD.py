# summariseD.py -- aggregate the planted TWINS (D-twins/*.json): does a world generated from lag statistics alone (no long-range structure) reproduce the real depLen v of each pocket half?  -> D-summary.json
import json, glob, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
R = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(HERE, 'D-twins', '*.json')))]
R = [r for r in R if r['status'] != 'nodata']
KINDS = ['bag', 'pos', 'mk1', 'mk2', 'mk1pos']
def rank(xs):
    idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
    while i < len(idx):
        j = i
        while j + 1 < len(idx) and xs[idx[j + 1]] == xs[idx[i]]: j += 1
        for k in range(i, j + 1): r[idx[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def pearson(a, b):
    n = len(a); ma = sum(a) / n; mb = sum(b) / n; sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa > 0 and sb > 0 else float('nan')
def med(a):
    a = sorted(a); n = len(a); return a[n // 2] if n % 2 else 0.5 * (a[n // 2 - 1] + a[n // 2])
def cells(rs):   # list of (v_real, {kind: v}) over both halves
    out = []
    for r in rs:
        for w in ('discover', 'confirm'):
            if r['real'][w] is None or any(r['twin'][w][k] is None for k in KINDS): continue
            out.append((r['real'][w], {k: r['twin'][w][k] for k in KINDS}, r))
    return out
def summarise(rs, label):
    cs = cells(rs); y = [c[0] for c in cs]; my = sum(y) / len(y); sst = sum((v - my) ** 2 for v in y); out = {'label': label, 'nCells': len(cs), 'kinds': {}}
    print('%s: %d half-cells (%d pockets)' % (label, len(cs), len(rs)))
    for k in KINDS:
        x = [c[1][k] for c in cs]; sse = sum((a - b) ** 2 for a, b in zip(y, x)); r = pearson(y, x); rho = pearson(rank(y), rank(x))
        big = [(a, b) for a, b in zip(y, x) if abs(a) >= 0.01]
        sgn = sum(1 for a, b in big if (a > 0) == (b > 0)) / max(1, len(big))
        d = {'pearson': r, 'r2Pearson': r * r, 'spearman': rho, 'reproductionR2': 1 - sse / sst, 'signAgree|v|>=.01': sgn, 'nBig': len(big), 'medianAbsErr': med([abs(a - b) for a, b in zip(y, x)]), 'medianAbsReal': med([abs(a) for a in y])}
        out['kinds'][k] = d
        print('   %-7s pearson %+.3f (r2 %.3f) spearman %+.3f  reproductionR2 %+.3f  sign agree (|v|>=.01, n=%d) %.3f  median|err| %.4f vs median|real| %.4f' % (k, r, r * r, rho, d['reproductionR2'], len(big), sgn, d['medianAbsErr'], d['medianAbsReal']))
    return out
res = {}
res['all'] = summarise(R, 'all real pockets with a depLen value')
pres = [r for r in R if r['status'] in ('P+', 'P-')]
res['present'] = summarise(pres, 'atlas-PRESENT pockets')
res['present+'] = summarise([r for r in pres if r['status'] == 'P+'], 'atlas PRESENT+')
res['present-'] = summarise([r for r in pres if r['status'] == 'P-'], 'atlas PRESENT-')
# best-twin choice per pocket: which twin is closest in each pocket? and sign agreement of mk1+pos
cnt = {k: 0 for k in KINDS}
for r in pres:
    for w in ('discover',):
        best = min(KINDS, key=lambda k: abs(r['twin'][w][k] - r['real'][w])); cnt[best] += 1
res['closestTwinCountPresent'] = cnt; print('closest twin (discover half) among PRESENT pockets:', cnt)
# sign agreement of the structured twins (mk1, mk2, pos, mk1pos): best-of-three (any structured twin with the right sign)
ok = 0; tot = 0
for r in pres:
    for w in ('discover', 'confirm'):
        tot += 1; sg = 1 if r['real'][w] > 0 else -1
        if any((r['twin'][w][k] > 0) == (sg > 0) and abs(r['twin'][w][k]) > 0.2 * abs(r['real'][w]) for k in ('pos', 'mk1', 'mk2', 'mk1pos')): ok += 1
res['anyStructuredTwinRightSignAndAtLeast20pctOfSize'] = [ok, tot]; print('PRESENT half-cells where some structured twin has the right sign and >= 20%% of |v|: %d/%d' % (ok, tot))
# by atlas-PRESENT register: median real vs twin v (mk1 and pos), registers with >= 4 PRESENT pockets
from collections import defaultdict
by = defaultdict(list)
for r in pres: by[r['register']].append(r)
print('register  n  median real v | median mk1 | mk2 | pos | mk1pos | bag')
res['byRegister'] = {}
for reg, rs in sorted(by.items(), key=lambda kv: -len(kv[1])):
    if len(rs) < 4: continue
    vals = {k: med([0.5 * (r['twin']['discover'][k] + r['twin']['confirm'][k]) for r in rs]) for k in KINDS}; real = med([0.5 * (r['real']['discover'] + r['real']['confirm']) for r in rs])
    res['byRegister'][reg] = {'n': len(rs), 'real': real, **vals}
    print('%-13s %2d  %+.3f | %+.3f %+.3f %+.3f %+.3f %+.3f' % (reg, len(rs), real, vals['mk1'], vals['mk2'], vals['pos'], vals['mk1pos'], vals['bag']))
json.dump(res, open(os.path.join(HERE, 'D-summary.json'), 'w'), indent=1)
