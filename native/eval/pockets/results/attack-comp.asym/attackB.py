#!/usr/bin/env python3
"""attackB.py -- ATTACK B (cheaper rival) on comp.asym, from the atlas matrix only (read only).
Pattern y = comp.asym per real non-thin pocket (mean of the two half values v; also mean signed z).  For each of the other 80 atlas statistics s: x_s = the same kind of pocket-level value.
Rank-transform (Spearman); partial Spearman of y on x_s controlling log10 tokens and mean unit length (OLS on ranks, residual correlation); R2 of y~x_s alone; incremental R2 over the controls.
Greedy forward selection (<= 4 rivals) of the best R2 on ranks.  Sign pattern: AUC of x_s for P+ vs P- among PRESENT pockets, and sign concordance of rival status with asym status.
Rival rule (task): a rival explaining >= 0.7 of the variance of the pattern makes the law a restatement.  Outputs B.json.  Standard library only."""
import json, os, math, itertools
HERE = os.path.dirname(os.path.abspath(__file__))
m = json.load(open(os.path.join(HERE, '..', 'atlas-matrix.json')))
S = m['statistics']; I = S.index('comp.asym')
P = [p for p in m['pockets'] if p['kind'] == 'real' and not p['thin']]

def val(p, j, kind):
    c = p['cells'][j]
    if c is None: return None
    a, b = (c[0], c[2]) if kind == 'v' else (c[1], c[3])
    if a is None or b is None: return None
    return (a + b) / 2

def ranks(xs):
    idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
    while i < len(idx):
        j = i
        while j + 1 < len(idx) and xs[idx[j + 1]] == xs[idx[i]]: j += 1
        for k in range(i, j + 1): r[idx[k]] = (i + j) / 2 + 1
        i = j + 1
    return r

def corr(a, b):
    n = len(a); ma = sum(a) / n; mb = sum(b) / n
    sa = sum((x - ma) ** 2 for x in a); sb = sum((x - mb) ** 2 for x in b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(sa * sb) if sa > 0 and sb > 0 else float('nan')

def solve(A, b):  # Gaussian elimination, small systems
    n = len(b); M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[piv][c]) < 1e-12: return None
        M[c], M[piv] = M[piv], M[c]
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1): M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] for i in range(n)]

def ols_resid(y, Xs):  # y, list of columns; with intercept; returns residuals and R2
    n = len(y); cols = [[1.0] * n] + Xs; k = len(cols)
    A = [[sum(cols[i][t] * cols[j][t] for t in range(n)) for j in range(k)] for i in range(k)]
    b = [sum(cols[i][t] * y[t] for t in range(n)) for i in range(k)]
    beta = solve(A, b)
    if beta is None: return None, float('nan')
    res = [y[t] - sum(beta[i] * cols[i][t] for i in range(k)) for t in range(n)]
    my = sum(y) / n; sst = sum((v - my) ** 2 for v in y); sse = sum(r * r for r in res)
    return res, 1 - sse / sst if sst > 0 else float('nan')

def analyse(kind):
    y_all = [val(p, I, kind) for p in P]
    lt = [math.log10(p['tokens']) for p in P]; ml = [p['meanUnitLength'] for p in P]
    out = []
    for j, s in enumerate(S):
        if j == I: continue
        x_all = [val(p, j, kind) for p in P]
        ix = [t for t in range(len(P)) if y_all[t] is not None and x_all[t] is not None]
        if len(ix) < 60: out.append({'stat': s, 'n': len(ix), 'note': 'too few defined pockets'}); continue
        ry = ranks([y_all[t] for t in ix]); rx = ranks([x_all[t] for t in ix]); rl = ranks([lt[t] for t in ix]); rm = ranks([ml[t] for t in ix])
        rho = corr(ry, rx)
        ey, R2c = ols_resid(ry, [rl, rm]); ex, _ = ols_resid(rx, [rl, rm])
        pr = corr(ey, ex)
        _, R2full = ols_resid(ry, [rx, rl, rm])
        out.append({'stat': s, 'n': len(ix), 'rho': rho, 'partialRho': pr, 'partialR2': pr * pr, 'R2alone': rho * rho, 'R2controls': R2c, 'R2withControls': R2full, 'incrementalR2': R2full - R2c})
    out = [o for o in out if 'rho' in o]
    out.sort(key=lambda o: -abs(o['partialRho']))
    return out

def greedy(kind, kmax=4):
    y_all = [val(p, I, kind) for p in P]
    lt = [math.log10(p['tokens']) for p in P]; ml = [p['meanUnitLength'] for p in P]
    X = {s: [val(p, j, kind) for p in P] for j, s in enumerate(S) if j != I}
    chosen = []; steps = []
    for step in range(kmax):
        best = None
        for s, x_all in X.items():
            if s in chosen: continue
            ix = [t for t in range(len(P)) if y_all[t] is not None and x_all[t] is not None and all(X[c][t] is not None for c in chosen)]
            if len(ix) < 150: continue
            cols = [ranks([X[c][t] for t in ix]) for c in chosen] + [ranks([x_all[t] for t in ix]), ranks([lt[t] for t in ix]), ranks([ml[t] for t in ix])]
            _, R2 = ols_resid(ranks([y_all[t] for t in ix]), cols)
            if R2 == R2 and (best is None or R2 > best[1]): best = (s, R2, len(ix))
        chosen.append(best[0]); steps.append({'add': best[0], 'R2withControls': best[1], 'n': best[2]})
    ix = [t for t in range(len(P)) if y_all[t] is not None]
    _, R2c = ols_resid(ranks([y_all[t] for t in ix]), [ranks([lt[t] for t in ix]), ranks([ml[t] for t in ix])])
    return {'R2controlsOnly': R2c, 'steps': steps}

def auc(pos, neg):  # P(x_pos > x_neg) + 0.5 ties
    allv = sorted([(v, 1) for v in pos] + [(v, 0) for v in neg]); r = ranks([v for v, _ in allv])
    sp = sum(r[i] for i, (_, g) in enumerate(allv) if g == 1)
    return (sp - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))

def signpattern():
    rows = []
    sgn = {p['id']: p['cells'][I][4] for p in P}
    for j, s in enumerate(S):
        if j == I: continue
        pos = [val(p, j, 'v') for p in P if sgn[p['id']] == 'P+']; neg = [val(p, j, 'v') for p in P if sgn[p['id']] == 'P-']
        pos = [v for v in pos if v is not None]; neg = [v for v in neg if v is not None]
        if len(pos) < 20 or len(neg) < 20: continue
        a = auc(pos, neg)
        # concordance: among pockets where asym is P+/P- and the rival is P+/P-, share with the same sign (and the sign-flipped share)
        same = flip = 0
        for p in P:
            a_ = sgn[p['id']]; b_ = p['cells'][j][4] if p['cells'][j] else None
            if a_ in ('P+', 'P-') and b_ in ('P+', 'P-'):
                if a_ == b_: same += 1
                else: flip += 1
        conc = max(same, flip) / (same + flip) if same + flip else None
        rows.append({'stat': s, 'nPos': len(pos), 'nNeg': len(neg), 'auc': a, 'absAucMinusHalf': abs(a - 0.5), 'bothPresent': same + flip, 'sameSign': same, 'oppositeSign': flip, 'concordance': conc})
    rows.sort(key=lambda r: -r['absAucMinusHalf'])
    return rows

if __name__ == '__main__':
    R = {'n': len(P), 'yDefined': sum(1 for p in P if val(p, I, 'v') is not None), 'rule': 'a rival with partial R2 (partial Spearman squared, controls log10 tokens and mean unit length) >= 0.7 makes comp.asym a restatement'}
    R['v'] = analyse('v'); R['z'] = analyse('z')
    R['greedyV'] = greedy('v'); R['greedyZ'] = greedy('z')
    R['signPattern'] = signpattern()
    json.dump(R, open(os.path.join(HERE, 'B.json'), 'w'), indent=1)
    print('n', R['n'], 'y defined', R['yDefined'])
    for kind in ('v', 'z'):
        print('--- top rivals by |partial rho| on', kind)
        for o in R[kind][:10]: print('%-22s n=%3d rho=%+.3f partial=%+.3f partialR2=%.3f R2withControls=%.3f' % (o['stat'], o['n'], o['rho'], o['partialRho'], o['partialR2'], o['R2withControls']))
    print('greedy v', R['greedyV']); print('greedy z', R['greedyZ'])
    print('--- sign pattern (AUC of rival v, P+ vs P-)')
    for o in R['signPattern'][:10]: print('%-22s auc=%.3f nPos=%d nNeg=%d bothPresent=%d same=%d opp=%d' % (o['stat'], o['auc'], o['nPos'], o['nNeg'], o['bothPresent'], o['sameSign'], o['oppositeSign']))
