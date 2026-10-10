# attackB.py -- ATTACK B: cheaper rival. Across real non-thin pockets, partial Spearman of the pattern of fig.introRight on every other statistic of the 81-statistic battery,
# controlling log tokens and mean unit length; variance explained = partial rho^2 (and R^2 of the rank regression with controls). stdlib only; deterministic.
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(os.path.join(HERE, 'battery.json'))); S = B['statistics']; P = B['pockets']
TARGET = 'fig.introRight'

def rank(xs):
    idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
    while i < len(idx):
        j = i
        while j + 1 < len(idx) and xs[idx[j + 1]] == xs[idx[i]]: j += 1
        for k in range(i, j + 1): r[idx[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def solve(A, b):
    n = len(A); M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c])); M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c and M[c][c] != 0:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1): M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] if M[i][i] else 0.0 for i in range(n)]
def resid(y, Xc):   # OLS residuals of y on [1, Xc...]
    n = len(y); cols = [[1.0] * n] + Xc; k = len(cols)
    A = [[sum(cols[a][i] * cols[b][i] for i in range(n)) for b in range(k)] for a in range(k)]; bb = [sum(cols[a][i] * y[i] for i in range(n)) for a in range(k)]
    beta = solve(A, bb); return [y[i] - sum(beta[a] * cols[a][i] for a in range(k)) for i in range(n)]
def pearson(a, b):
    n = len(a); ma = sum(a) / n; mb = sum(b) / n; sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    return sum((a[i] - ma) * (b[i] - mb) for i in range(n)) / (sa * sb) if sa > 0 and sb > 0 else float('nan')
def prow(c, form):
    vD, nD, zD, vC, nC, zC = c
    if form == 'v':
        return None if vD is None or vC is None else (vD + vC) / 2
    if form == 'd':
        return None if None in (vD, nD, vC, nC) else ((vD - nD) + (vC - nC)) / 2
    if form == 'z':
        return None if zD is None or zC is None else (zD + zC) / 2
def collect(subset, pform, rform):
    ids = [i for i in P if P[i]['kind'] == 'real' and subset(P[i])]
    y = {}; X = {}
    for i in ids:
        yy = prow(P[i]['cells'][TARGET], pform)
        if yy is None: continue
        y[i] = yy
    out = {}
    for s in S:
        if s == TARGET: continue
        col = {i: prow(P[i]['cells'][s], rform) for i in y}
        out[s] = col
    return ids, y, out
def partial(y, col, ids):
    use = [i for i in ids if i in y and col.get(i) is not None]
    if len(use) < 12: return None, len(use)
    ry = rank([y[i] for i in use]); rx = rank([col[i] for i in use])
    c1 = rank([math.log(P[i]['tokens']) for i in use]); c2 = rank([P[i]['mul'] for i in use])
    return pearson(resid(ry, [c1, c2]), resid(rx, [c1, c2])), len(use)
def analyse(name, subset, pform):
    res = {}
    for rform in ('d', 'v', 'z'):
        ids, y, cols = collect(subset, pform, rform); rows = []
        for s, col in cols.items():
            r, n = partial(y, col, ids)
            if r is not None and not math.isnan(r): rows.append((s, r, n))
        rows.sort(key=lambda t: -abs(t[1])); res[rform] = rows
        res[rform + '_n'] = len(y)
    return res
sets = {
  'all-real': lambda p: True,
  'code+diagram': lambda p: p['register'] in ('code', 'diagram'),
  'word-grain': lambda p: p['grain'] == 'word',
}
out = {}
for pform in ('d', 'z'):
    for nm, sub in sets.items():
        out[f'pattern={pform}|{nm}'] = analyse(nm, sub, pform)
json.dump(out, open(os.path.join(HERE, 'B_rival.json'), 'w'), indent=1)
for k, r in out.items():
    print('==', k, 'n(pattern)=', r['d_n'])
    for rform in ('d', 'v', 'z'):
        top = r[rform][:6]
        print('  rival form', rform, ' | '.join(f"{s} {rho:+.2f}(n{n})" for s, rho, n in top))
