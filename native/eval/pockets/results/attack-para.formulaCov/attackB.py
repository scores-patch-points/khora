# attackB.py -- CHEAPER RIVAL: which statistic of the atlas battery reproduces the cross-pocket pattern of para.formulaCov?
# Pattern = per-pocket v (mean of the two halves) and per-pocket excess (v - nullMean, mean of halves) over the 391 real non-thin pockets.
# Rival = every other statistic's per-pocket v (resp. excess). Partial Spearman controlling rank(log tokens) and rank(mean unit length); R2 of rank-OLS; forward selection; leave-one-group-out CV.
import json, math, os, sys, itertools
sys.path.insert(0, os.path.dirname(__file__))
from stats_lib import *
H = os.path.dirname(os.path.abspath(__file__)); AT = os.path.join(H, '..', 'atlas')
M = json.load(open(os.path.join(H, '..', 'atlas-matrix.json'))); S = M['statistics']; TARGET = 'para.formulaCov'
R = [p for p in M['pockets'] if p['kind'] == 'real']
vals = {}  # id -> stat -> (vbar, ebar)
for p in R:
    a = json.load(open(os.path.join(AT, p['id'] + '.json'))); d = {}
    for s in S:
        cs = [a['halves'][h].get(s) for h in ('discover', 'confirm')]
        if any(c is None or c['v'] is None for c in cs): continue
        v = sum(c['v'] for c in cs)/2
        e = None if any(c['nullMean'] is None for c in cs) else sum(c['v']-c['nullMean'] for c in cs)/2
        d[s] = (v, e)
    vals[p['id']] = d
def table(kind, restrict=None):
    k = 0 if kind == 'v' else 1
    ids = [p['id'] for p in R if TARGET in vals[p['id']] and vals[p['id']][TARGET][k] is not None and (restrict is None or p['id'] in restrict)]
    return ids, k
def scan(kind, restrict=None, label=''):
    ids, k = table(kind, restrict); pm = {p['id']: p for p in R}
    y = [vals[i][TARGET][k] for i in ids]; lt = [math.log(pm[i]['tokens']) for i in ids]; ul = [pm[i]['meanUnitLength'] for i in ids]
    out = []
    for s in S:
        if s == TARGET: continue
        idx = [j for j, i in enumerate(ids) if s in vals[i] and vals[i][s][k] is not None]
        if len(idx) < 0.75*len(ids): continue
        x = [vals[ids[j]][s][k] for j in idx]; yy = [y[j] for j in idx]; cv = [[lt[j] for j in idx], [ul[j] for j in idx]]
        if len(set(x)) < 5: continue
        try: r = spearman(yy, x); pr = partial_spearman(yy, x, cv); rr = r2_rank(yy, [x, cv[0], cv[1]])
        except Exception: continue
        out.append({'stat': s, 'n': len(idx), 'rho': r, 'partial': pr, 'partialR2': pr*pr, 'R2withCovariates': rr})
    out.sort(key=lambda d: -abs(d['partial']))
    base = {'n': len(ids), 'R2_size_length_only': r2_rank(y, [lt, ul]), 'rho_logTokens': spearman(y, lt), 'rho_unitLength': spearman(y, ul)}
    return {'label': label, 'kind': kind, 'base': base, 'top': out[:12], 'nRivalsOver07': sum(1 for d in out if d['partialR2'] >= 0.7), 'nRivalsScanned': len(out)}, ids, y, lt, ul
def forward(kind, restrict=None, steps=3):
    res, ids, y, lt, ul = scan(kind, restrict); k = 0 if kind == 'v' else 1; pm = {p['id']: p for p in R}
    cand = [d['stat'] for d in res['top']] + []
    allc = [s for s in S if s != TARGET and all(s in vals[i] and vals[i][s][k] is not None for i in ids)]
    chosen = []; hist = []; ry0 = rank(y); rlt = rank(lt); rul = rank(ul); RK = {s2: rank([vals[i][s2][k] for i in ids]) for s2 in allc}
    for _ in range(steps):
        best = None
        for s in allc:
            if s in chosen: continue
            try: r2 = r2_ranked(ry0, [RK[c] for c in chosen+[s]] + [rlt, rul])
            except Exception: continue
            if best is None or r2 > best[0]: best = (r2, s)
        chosen.append(best[1]); hist.append({'added': best[1], 'R2': best[0]})
    # leave-one-group-out CV: fit rank-OLS on other groups, predict held-out group, report pooled R2 on ranks of held-out predictions
    groups = [pm[i]['group'] for i in ids]; ry = rank(y); cvres = {}
    for g in sorted(set(groups)):
        tr = [j for j in range(len(ids)) if groups[j] != g]; te = [j for j in range(len(ids)) if groups[j] == g]
        cols = [[vals[i][c][k] for i in ids] for c in chosen] + [lt, ul]; rc = [rank(c) for c in cols]
        X = [[1.0]+[rc[a][j] for a in range(len(cols))] for j in tr]; beta = ols_fit(X, [ry[j] for j in tr])
        pred = [sum(beta[a]*([1.0]+[rc[b][j] for b in range(len(cols))])[a] for a in range(len(beta))) for j in te]
        cvres[g] = {'n': len(te), 'spearman_pred_vs_obs': spearman(pred, [ry[j] for j in te]) if len(te) > 3 else None}
    return {'chosen': chosen, 'history': hist, 'leaveGroupOut': cvres}
out = {}
for kind in ('v', 'excess'):
    kk = 'v' if kind == 'v' else 'e'
    res, ids, y, lt, ul = scan(kind, None, 'all 391 real pockets')
    out[f'all_{kind}'] = res
    out[f'forward_{kind}'] = forward(kind)
# restricted to the pockets the atlas calls PRESENT with defined z (the law's own population)
si = S.index(TARGET); present = {p['id'] for p in R if p['cells'][si][4] == 'P+'}
for kind in ('v', 'excess'):
    res, ids, y, lt, ul = scan(kind, present, f'the 242 PRESENT pockets')
    out[f'present_{kind}'] = res
json.dump(out, open(os.path.join(H, 'out', 'B_rival.json'), 'w'), indent=1)
for key, r in out.items():
    if 'top' in r:
        print(key, r['base'], 'rivals>=0.7:', r['nRivalsOver07'], 'of', r['nRivalsScanned'])
        for d in r['top'][:6]: print('   %-20s n=%d rho=%.3f partial=%.3f R2=%.3f R2cov=%.3f' % (d['stat'], d['n'], d['rho'], d['partial'], d['partialR2'], d['R2withCovariates']))
    else: print(key, json.dumps(r)[:700])
