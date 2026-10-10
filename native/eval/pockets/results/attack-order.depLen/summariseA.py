# summariseA.py -- aggregate attack A (A/*.json) -> A-summary.json and a printed table (stdlib python).
import json, os, glob, math, sys
ADIR = sys.argv[1] if len(sys.argv) > 1 else 'A'
from collections import defaultdict, Counter
HERE = os.path.dirname(os.path.abspath(__file__))
R = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(HERE, ADIR, '*.json')))]
VARS = ['eqTok', 'eqLenMean', 'band', 'chunk12', 'drop1pct', 'dropHapax', 'alt']
def rank(xs):
    idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
    while i < len(idx):
        j = i
        while j + 1 < len(idx) and xs[idx[j + 1]] == xs[idx[i]]: j += 1
        for k in range(i, j + 1): r[idx[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def pearson(a, b):
    n = len(a)
    if n < 3: return None
    ma = sum(a) / n; mb = sum(b) / n; sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa > 0 and sb > 0 else None
def med(a):
    a = sorted(a); n = len(a)
    return None if not n else (a[n // 2] if n % 2 else 0.5 * (a[n // 2 - 1] + a[n // 2]))
def vmean(c): return 0.5 * (c['discover']['v'] + c['confirm']['v'])
def sgn(x): return 1 if x > 0 else -1
out = {'nPockets': len(R), 'variants': {}}
pres = [r for r in R if r['atlasStatus'] in ('P+', 'P-')]
out['nPresent'] = len(pres)
print('pockets run: %d (PRESENT in atlas: %d: P+ %d, P- %d)' % (len(R), len(pres), sum(1 for r in pres if r['atlasStatus'] == 'P+'), sum(1 for r in pres if r['atlasStatus'] == 'P-')))
hdr = '%-10s %-4s %4s %5s %7s %6s %5s %8s %8s'
print(hdr % ('variant', 'cls', 'n', 'n/a', 'sameP', 'sg>=2', 'sign', 'flipped', 'medRatio'))
for V in VARS:
    out['variants'][V] = {}
    for cls in ('P+', 'P-'):
        rs = [r for r in pres if r['atlasStatus'] == cls]
        avail = [r for r in rs if r['variants'][V]['status'] != 'n/a' and r['variants'][V]['status'] != 'undef']
        sign = 1 if cls == 'P+' else -1
        sameP = sum(1 for r in avail if r['variants'][V]['status'] == cls)
        sg2 = sum(1 for r in avail if all(sgn(r['variants'][V][w]['v']) == sign and r['variants'][V][w]['z'] is not None and sign * r['variants'][V][w]['z'] >= 2 for w in ('discover', 'confirm')))
        sgn_ = sum(1 for r in avail if all(sgn(r['variants'][V][w]['v']) == sign for w in ('discover', 'confirm')))
        flip = sum(1 for r in avail if all(sgn(r['variants'][V][w]['v']) == -sign for w in ('discover', 'confirm')))
        oppP = sum(1 for r in avail if r['variants'][V]['status'] == ('P-' if cls == 'P+' else 'P+'))
        ratios = [vmean(r['variants'][V]) / (0.5 * (r['atlas']['discover']['v'] + r['atlas']['confirm']['v'])) for r in avail]
        d = {'n': len(rs), 'available': len(avail), 'na': len(rs) - len(avail), 'samePresent': sameP, 'signedZge2': sg2, 'signOnly': sgn_, 'flippedBothHalves': flip, 'oppositePresent': oppP, 'medianVratio': med(ratios)}
        out['variants'][V][cls] = d
        print(hdr % (V, cls, len(avail), len(rs) - len(avail), '%d' % sameP, '%d' % sg2, '%d' % sgn_, '%d(P%s)' % (flip, oppP), '%.2f' % med(ratios) if ratios else 'NA'))
    av = [r for r in pres if r['variants'][V]['status'] not in ('n/a', 'undef')]
    if len(av) > 5:
        a = [vmean(r['variants'][V]) for r in av]; b = [0.5 * (r['atlas']['discover']['v'] + r['atlas']['confirm']['v']) for r in av]
        rho = pearson(rank(a), rank(b)); out['variants'][V]['spearmanWithAtlasV'] = rho; out['variants'][V]['nSpearman'] = len(av)
        print('   Spearman(variant v, atlas v) over %d PRESENT pockets = %.3f' % (len(av), rho))
# eqLenMean matched subset
mt = [r for r in pres if r['variants']['eqLenMean']['status'] != 'n/a' and r['variants']['eqLenMean']['discover'] and r['variants']['eqLenMean']['confirm']
      and all(abs(r['variants']['eqLenMean'][w]['meanLen3'] - 12) / 12 <= 0.10 and r['variants']['eqLenMean'][w]['tokens'] >= 18000 for w in ('discover', 'confirm'))]
out['eqLenMeanMatched'] = {'n': len(mt)}
for cls in ('P+', 'P-'):
    rs = [r for r in mt if r['atlasStatus'] == cls]; sign = 1 if cls == 'P+' else -1
    d = {'n': len(rs), 'samePresent': sum(1 for r in rs if r['variants']['eqLenMean']['status'] == cls),
         'signOnly': sum(1 for r in rs if all(sgn(r['variants']['eqLenMean'][w]['v']) == sign for w in ('discover', 'confirm'))),
         'signedZge2': sum(1 for r in rs if all(sign * r['variants']['eqLenMean'][w]['z'] >= 2 for w in ('discover', 'confirm')))}
    out['eqLenMeanMatched'][cls] = d
print('eqLenMean matched (achieved mean within 10% of 12 and >=18000 tokens, both halves):', out['eqLenMeanMatched'])
# per register in the claim: sign retention under each variant (PRESENT pockets only)
REG = defaultdict(lambda: defaultdict(list))
for r in pres: REG[r['register']]['all'].append(r)
out['byRegister'] = {}
print('\nregister (atlas P+/P-)   n | sign-retained both halves under: ' + ' '.join(VARS))
for reg, d in sorted(REG.items(), key=lambda kv: -len(kv[1]['all'])):
    rs = d['all']; row = {}
    for V in VARS:
        av = [r for r in rs if r['variants'][V]['status'] not in ('n/a', 'undef')]
        ok = sum(1 for r in av if all(sgn(r['variants'][V][w]['v']) == (1 if r['atlasStatus'] == 'P+' else -1) for w in ('discover', 'confirm')))
        row[V] = '%d/%d' % (ok, len(av))
    out['byRegister'][reg] = {'P+': sum(1 for r in rs if r['atlasStatus'] == 'P+'), 'P-': sum(1 for r in rs if r['atlasStatus'] == 'P-'), **row}
    if len(rs) >= 3: print('%-14s %2d/%-2d %3d | ' % (reg, out['byRegister'][reg]['P+'], out['byRegister'][reg]['P-'], len(rs)) + ' '.join('%7s' % row[V] for V in VARS))
# the whole-atlas view (only if all 391 were run): status distribution of each variant by atlas-status class and by sign of the claimed scopes
if len(R) > 200:
    print('\nALL REAL POCKETS (%d): status counts per variant (n/a excluded)' % len(R))
    out['allStatus'] = {}
    for V in ['atlas'] + VARS:
        c = Counter()
        for r in R:
            st = r['atlasStatus'] if V == 'atlas' else r['variants'][V]['status']
            if st in ('n/a', 'undef', 'nodata'): continue
            c[st] += 1
        out['allStatus'][V] = dict(c); print('  %-10s %s' % (V, dict(c)))
json.dump(out, open(os.path.join(HERE, ADIR + '-summary.json'), 'w'), indent=1)
