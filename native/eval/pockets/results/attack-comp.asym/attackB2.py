#!/usr/bin/env python3
"""attackB2.py -- ATTACK B part 2: cheap rivals that are NOT in the atlas battery (computed by attackB2.mjs on the same halves): asymVar variants and position-law statistics.
For each: Spearman and partial Spearman (controls log10 tokens, mean unit length) with the atlas comp.asym pocket value (mean of the half v), R2 alone, and R2 of the best battery+new combination.  Output B2.json."""
import json, os, math
from attackB import *
raw = json.load(open(os.path.join(HERE, 'B2raw.json')))
names = ['asym', 'plug', 'deep2', 'deep3', 'k10', 'k40', 'meanbin', 'distinct', 'topadj', 'edgeGrad', 'posSlope']
def pv(id_, n):
    r = raw.get(id_)
    if not r: return None
    a, b = r['discover'][n], r['confirm'][n]
    return None if a is None or b is None else (a + b) / 2
ids = [p['id'] for p in P]
y = [val(p, I, 'v') for p in P]
lt = [math.log10(p['tokens']) for p in P]; ml = [p['meanUnitLength'] for p in P]
out = {'reproduction': None, 'rivals': []}
# reproduction: my 'asym' equals the atlas value?
mx = max(abs(pv(i, 'asym') - yy) for i, yy in zip(ids, y) if yy is not None and pv(i, 'asym') is not None)
out['reproduction'] = {'maxAbsDiffVsAtlasMeanV': mx}
for n in names[1:]:
    x = [pv(i, n) for i in ids]
    ix = [t for t in range(len(P)) if y[t] is not None and x[t] is not None]
    ry = ranks([y[t] for t in ix]); rx = ranks([x[t] for t in ix]); rl = ranks([lt[t] for t in ix]); rm = ranks([ml[t] for t in ix])
    ey, R2c = ols_resid(ry, [rl, rm]); ex, _ = ols_resid(rx, [rl, rm]); pr = corr(ey, ex)
    # sign agreement over pockets where both are defined and the atlas asym is PRESENT
    sgn = {p['id']: p['cells'][I][4] for p in P}
    ag = dis = 0
    for t in ix:
        if sgn[ids[t]] in ('P+', 'P-'):
            if (x[t] > 0) == (y[t] > 0): ag += 1
            else: dis += 1
    out['rivals'].append({'stat': n, 'n': len(ix), 'rho': corr(ry, rx), 'partialRho': pr, 'partialR2': pr * pr, 'signAgreeOnPresent': ag, 'signDisagreeOnPresent': dis})
    print('%-9s n=%d rho=%+.3f partialRho=%+.3f partialR2=%.3f  sign agree/disagree on PRESENT pockets %d/%d' % (n, len(ix), corr(ry, rx), pr, pr * pr, ag, dis))
json.dump(out, open(os.path.join(HERE, 'B2.json'), 'w'), indent=1)
