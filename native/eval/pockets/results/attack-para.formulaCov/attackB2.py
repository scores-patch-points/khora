# attackB2.py -- (i) rivals for the z-pattern; (ii) after removing the best rivals + size + length, is any class structure left in v? (the 242 PRESENT pockets)
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stats_lib import *
H = os.path.dirname(os.path.abspath(__file__)); M = json.load(open(os.path.join(H, '..', 'atlas-matrix.json'))); S = M['statistics']; TARGET = 'para.formulaCov'; si = S.index(TARGET)
P = [p for p in M['pockets'] if p['kind'] == 'real' and p['cells'][si][4] == 'P+']
n = len(P); lt = [math.log(p['tokens']) for p in P]; ul = [p['meanUnitLength'] for p in P]
def col(stat, which):  # which: 'v' mean of halves; 'z' min of halves
    j = S.index(stat); out = []
    for p in P:
        c = p['cells'][j]
        if which == 'v': out.append(None if c[0] is None or c[2] is None else (c[0]+c[2])/2)
        else: out.append(None if c[1] is None or c[3] is None else (min(c[1], c[3]) if c[1] > 0 and c[3] > 0 else (max(c[1], c[3]) if c[1] < 0 and c[3] < 0 else 0.0)))
    return out
out = {}
# (i) z pattern: signed log10 of min z
y = col(TARGET, 'z'); sl = lambda z: (None if z is None else math.copysign(math.log10(1+abs(z)), z))
yz = [sl(z) for z in y]; res = []
for s in S:
    if s == TARGET: continue
    x = [sl(z) for z in col(s, 'z')]; idx = [i for i in range(n) if x[i] is not None and yz[i] is not None]
    if len(idx) < 150 or len(set(x[i] for i in idx)) < 5: continue
    yy = [yz[i] for i in idx]; xx = [x[i] for i in idx]; cv = [[lt[i] for i in idx], [ul[i] for i in idx]]
    try: res.append((abs(partial_spearman(yy, xx, cv)), s, spearman(yy, xx), partial_spearman(yy, xx, cv), len(idx)))
    except Exception: pass
res.sort(reverse=True); out['zPattern'] = {'n': n, 'rho_logTokens': spearman(yz, lt), 'rho_unitLength': spearman(yz, ul), 'top': [{'stat': s, 'n': k, 'rho': r, 'partial': pr, 'partialR2': pr*pr} for _, s, r, pr, k in res[:8]], 'nOver07': sum(1 for a, *_ in res if a*a >= 0.7)}
# (ii) residual class structure
yv = col(TARGET, 'v'); rk = lambda xs: rank(xs)
for label, rivals in (('voidRescue', ['phys.voidRescue']), ('sameR', ['comp.sameR']), ('voidRescue+sameR+tmplReuse', ['phys.voidRescue', 'comp.sameR', 'para.tmplReuse'])):
    cols = [col(r, 'v') for r in rivals]; idx = [i for i in range(n) if all(c[i] is not None for c in cols) and yv[i] is not None]
    yy = rank([yv[i] for i in idx]); cv = [rank([c[i] for i in idx]) for c in cols] + [rank([lt[i] for i in idx]), rank([ul[i] for i in idx])]
    resid = residualize(yy, cv); d = {'n': len(idx), 'R2': 1-sum(r*r for r in resid)/sum((v-mean(yy))**2 for v in yy)}
    for attr in ('group', 'register'):
        lab = [P[i][attr] for i in idx]; obs, p, k = perm_eta2(resid, lab, 2000, seed=3); d['residual_eta2_'+attr] = {'eta2': obs, 'p': p, 'levels': k}
        o2, p2, k2 = perm_eta2(yy, lab, 2000, seed=3); d['eta2_rankV_'+attr] = {'eta2': o2, 'p': p2}
    out['residual_'+label] = d
json.dump(out, open(os.path.join(H, 'out', 'B2.json'), 'w'), indent=1); print(json.dumps(out, indent=1)[:4500])
