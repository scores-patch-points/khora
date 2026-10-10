#!/usr/bin/env python3
"""summariseA.py -- summarise attack A (A/*.json: size and tokenisation variants) and A2 (A2/*.json: definition variants) -> A-summary.json (printed too)."""
import json, os, glob, math
from collections import Counter, defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
def load(d): return {os.path.basename(f)[:-5]: json.load(open(f)) for f in sorted(glob.glob(os.path.join(HERE, d, '*.json')))}
A = load('A'); A2 = load('A2')
def sgn(x): return 0 if x is None else (1 if x > 0 else -1 if x < 0 else 0)
def binom_p_two(k, n):  # exact two-sided binomial p, p0 = 0.5
    if n == 0: return None
    pm = [math.comb(n, i) / 2 ** n for i in range(n + 1)]; obs = pm[k]
    return min(1.0, sum(p for p in pm if p <= obs + 1e-15))
def spearman(a, b):
    def rk(xs):
        idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
        while i < len(idx):
            j = i
            while j + 1 < len(idx) and xs[idx[j + 1]] == xs[idx[i]]: j += 1
            for k in range(i, j + 1): r[idx[k]] = (i + j) / 2
            i = j + 1
        return r
    ra, rb = rk(a), rk(b); n = len(a); ma = sum(ra) / n; mb = sum(rb) / n
    sa = sum((x - ma) ** 2 for x in ra); sb = sum((x - mb) ** 2 for x in rb)
    return sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / math.sqrt(sa * sb) if sa > 0 and sb > 0 else None
CLAIM_POS = ['academic', 'chat', 'code', 'essay', 'encyclopedia', 'reportage']; CLAIM_NEG = ['drama', 'scripture', 'children', 'treatise', 'novel', 'book']
def summarise(D, vnames, matched_only=False):
    S = {}
    for vn in vnames:
        row = {}
        for cls in ('P+', 'P-'):
            pk = [r for r in D.values() if r['atlasStatus'] == cls and r['variants'][vn]['discover'] and r['variants'][vn]['confirm']
                  and (not matched_only or (r['variants'][vn]['discover'].get('matched') and r['variants'][vn]['confirm'].get('matched')))]
            nall = sum(1 for r in D.values() if r['atlasStatus'] == cls)
            st = Counter(r['variants'][vn]['status'] for r in pk)
            want = 1 if cls == 'P+' else -1
            both = sum(1 for r in pk if sgn(r['variants'][vn]['discover']['v']) == want and sgn(r['variants'][vn]['confirm']['v']) == want)
            halves_ok = sum((sgn(r['variants'][vn][h]['v']) == want) for r in pk for h in ('discover', 'confirm')); nh = 2 * len(pk)
            row[cls] = {'nAtlas': nall, 'nEvaluated': len(pk), 'status': dict(st), 'retained': st[cls], 'flippedPresent': st['P-' if cls == 'P+' else 'P+'], 'bothHalvesSameSignAsAtlas': both,
                        'halfSignAgree': halves_ok, 'halvesN': nh, 'halfSignBinomP': binom_p_two(halves_ok, nh)}
        S[vn] = row
    return S
out = {'nPocketsA': len(A), 'nPocketsA2': len(A2)}
# replicate-pooled variants: mean v over the 3 replicates per half, then status from replicate-1 only is misleading -> report per replicate and pooled sign
for base in ('eqTok10k', 'eqLen10k'):
    reps = [f'{base}#{k}' for k in range(3)]
    out[base] = summarise(A, reps, matched_only=(base == 'eqLen10k'))
    # pooled: sign of the replicate-mean v in each half
    pooled = {}
    for cls in ('P+', 'P-'):
        want = 1 if cls == 'P+' else -1; ok = n = 0; bothok = 0
        for r in A.values():
            if r['atlasStatus'] != cls: continue
            hv = {}
            for h in ('discover', 'confirm'):
                vs = [r['variants'][rp][h]['v'] for rp in reps if r['variants'][rp][h] and r['variants'][rp][h]['v'] is not None and (base != 'eqLen10k' or r['variants'][rp][h].get('matched'))]
                hv[h] = sum(vs) / len(vs) if vs else None
            if hv['discover'] is None or hv['confirm'] is None: continue
            n += 1; a = sgn(hv['discover']) == want; b = sgn(hv['confirm']) == want; ok += a + b; bothok += (a and b)
        pooled[cls] = {'pockets': n, 'bothHalvesSameSign': bothok, 'halfSignAgree': ok, 'halvesN': 2 * n, 'binomP': binom_p_two(ok, 2 * n)}
    out[base + '_pooledSign'] = pooled
for vn in ('band8-16', 'chunk12', 'drop1pct', 'dropHapax', 'alt'): out[vn] = summarise(A, [vn])[vn]
out['A2'] = summarise(A2, ['plug', 'deep2', 'deep3', 'k10', 'k40'])
# spearman of pocket-level v (mean over halves) between atlas and variant
def pv(r, vn):
    a, b = r['variants'][vn]['discover'], r['variants'][vn]['confirm']
    return None if not a or not b or a['v'] is None or b['v'] is None else (a['v'] + b['v']) / 2
rs = {}
for vn in list(next(iter(A.values()))['variants']):
    xs = [(((r['atlas']['discover']['v'] + r['atlas']['confirm']['v']) / 2), pv(r, vn)) for r in A.values()]; xs = [(a, b) for a, b in xs if b is not None]
    rs[vn] = {'n': len(xs), 'spearmanWithAtlasV': spearman([a for a, _ in xs], [b for _, b in xs]) if len(xs) > 5 else None}
for vn in ('plug', 'deep2', 'deep3', 'k10', 'k40'):
    xs = [(((r['atlas']['discover']['v'] + r['atlas']['confirm']['v']) / 2) if 'atlas' in r else None, None) for r in A2.values()]
rs2 = {}
for vn in ('plug', 'deep2', 'deep3', 'k10', 'k40'):
    xs = []
    for id_, r in A2.items():
        a = A[id_]['atlas'] if id_ in A else None
        x = pv(r, vn)
        if a and x is not None: xs.append(((a['discover']['v'] + a['confirm']['v']) / 2, x))
    rs2[vn] = {'n': len(xs), 'spearmanWithAtlasV': spearman([a for a, _ in xs], [b for _, b in xs]) if len(xs) > 5 else None}
out['spearmanWithAtlasV'] = rs; out['spearmanWithAtlasV_A2'] = rs2
# register-scoped sign under each variant: majority sign by register among evaluated pockets (v mean sign), claim registers
def regsign(D, vn):
    byr = defaultdict(lambda: [0, 0])
    for r in D.values():
        x = pv(r, vn)
        if x is None: continue
        byr[r['register']][0 if x > 0 else 1] += 1
    return {k: v for k, v in byr.items()}
reg = {'atlas': None, 'variants': {}}
at = defaultdict(lambda: [0, 0])
for r in A.values(): at[r['register']][0 if r['atlasStatus'] == 'P+' else 1] += 1
reg['atlasPresent'] = {k: v for k, v in at.items() if k in CLAIM_POS + CLAIM_NEG}
for vn in ['eqTok10k#0', 'eqLen10k#0', 'band8-16', 'chunk12', 'drop1pct', 'dropHapax', 'alt']:
    rr = regsign(A, vn); reg['variants'][vn] = {k: v for k, v in rr.items() if k in CLAIM_POS + CLAIM_NEG}
for vn in ('plug', 'deep2', 'deep3', 'k10', 'k40'):
    rr = regsign(A2, vn); reg['variants'][vn] = {k: v for k, v in rr.items() if k in CLAIM_POS + CLAIM_NEG}
out['registerSigns(pos,neg counts of PRESENT-in-atlas pockets by sign of variant mean v)'] = reg
json.dump(out, open(os.path.join(HERE, 'A-summary.json'), 'w'), indent=1)
def show(title, S):
    print('==', title)
    for vn, row in S.items():
        for cls in ('P+', 'P-'):
            c = row[cls]; print('  %-12s atlas %s: n %3d/%3d  status %s  bothHalvesSign %d  halfSign %d/%d p=%.3g' % (vn, cls, c['nEvaluated'], c['nAtlas'], dict(c['status']), c['bothHalvesSameSignAsAtlas'], c['halfSignAgree'], c['halvesN'], c['halfSignBinomP'] if c['halfSignBinomP'] is not None else float('nan')))
for b in ('eqTok10k', 'eqLen10k'): show(b, out[b]); print('  pooled replicate-mean sign:', json.dumps(out[b + '_pooledSign']))
for vn in ('band8-16', 'chunk12', 'drop1pct', 'dropHapax', 'alt'): show(vn, {vn: out[vn]})
show('A2 definition variants (full halves)', out['A2'])
print('spearman with atlas v', json.dumps({k: (round(v['spearmanWithAtlasV'], 3) if v['spearmanWithAtlasV'] is not None else None, v['n']) for k, v in rs.items()}))
print('spearman A2', json.dumps(rs2))
