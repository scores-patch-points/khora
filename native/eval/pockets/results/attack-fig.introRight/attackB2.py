# attackB2.py -- ATTACK B (continued): (1) same-family rival not in the battery: the statistic computed on the 2nd occurrence (d2), partial Spearman with d1 controlling log tokens and mean unit length,
# over the 54 cached pockets (31 PRESENT + 23 ABSENT controls); (2) battery rivals restricted to the same 54 pockets; (3) rank-regression R^2 of d (pattern) on simple covariates (unit length, tokens,
# hapax share, ttr) within code+diagram and over all real pockets; (4) greedy forward selection of up to 3 battery rivals with a permutation null of the max R^2 (selection bias).
import json, math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__))
import importlib.util
spec = importlib.util.spec_from_file_location('attackB_lib', os.path.join(HERE, 'attackB.py'))
# reuse helper functions without re-running attackB's main body: copy the few helpers
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
def resid(y, Xc):
    n = len(y); cols = [[1.0] * n] + Xc; k = len(cols)
    A = [[sum(cols[a][i] * cols[b][i] for i in range(n)) for b in range(k)] for a in range(k)]; bb = [sum(cols[a][i] * y[i] for i in range(n)) for a in range(k)]
    beta = solve(A, bb); return [y[i] - sum(beta[a] * cols[a][i] for a in range(k)) for i in range(n)]
def pearson(a, b):
    n = len(a); ma = sum(a) / n; mb = sum(b) / n; sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    return sum((a[i] - ma) * (b[i] - mb) for i in range(n)) / (sa * sb) if sa > 0 and sb > 0 else float('nan')
def r2(y, cols):   # R^2 of OLS y ~ 1 + cols
    res = resid(y, cols); my = sum(y) / len(y); sst = sum((v - my) ** 2 for v in y); return 1 - sum(r * r for r in res) / sst
B = json.load(open(os.path.join(HERE, 'battery.json'))); P = B['pockets']; S = B['statistics']
E = {**json.load(open(os.path.join(HERE, 'E.json'))), **json.load(open(os.path.join(HERE, 'E_ctl.json')))}
out = {}
ids = [i for i in E if E[i]['d1']['d'] is not None and E[i]['d2']['d'] is not None and E[i]['d3']['d'] is not None]
ctl = lambda us: [rank([math.log(P[i]['tokens']) for i in us]), rank([P[i]['mul'] for i in us])]
d1 = [E[i]['d1']['d'] for i in ids]; d2 = [E[i]['d2']['d'] for i in ids]; d3 = [E[i]['d3']['d'] for i in ids]
c = ctl(ids)
out['d2_partial'] = pearson(resid(rank(d1), c), resid(rank(d2), c)); out['d3_partial'] = pearson(resid(rank(d1), c), resid(rank(d3), c)); out['n'] = len(ids)
print('(1) same-family rival (statistic on 2nd occurrence), n=%d pockets: partial Spearman with d1 (controls log tokens, mean UL): d2 %.3f (variance explained %.3f), d3 %.3f (%.3f); raw Spearman d2 %.3f' % (len(ids), out['d2_partial'], out['d2_partial'] ** 2, out['d3_partial'], out['d3_partial'] ** 2, pearson(rank(d1), rank(d2))))
# restricted to PRESENT 31
pres = [l for l in open(os.path.join(HERE, 'present31.txt')).read().strip().split(',') if l in ids]
c31 = ctl(pres); a = [E[i]['d1']['d'] for i in pres]; b = [E[i]['d2']['d'] for i in pres]
out['d2_partial_present31'] = pearson(resid(rank(a), c31), resid(rank(b), c31)); print('    PRESENT 31 only: partial Spearman d1~d2 %.3f (variance %.3f)' % (out['d2_partial_present31'], out['d2_partial_present31'] ** 2))
# code only (13) vs diagram+natural separately
for nm, sel in (('code', lambda i: P[i]['register'] == 'code'), ('diagram', lambda i: P[i]['register'] == 'diagram'), ('natural-grain PRESENT', lambda i: P[i]['register'] not in ('code', 'diagram', 'markup', 'notation') and i in pres)):
    us = [i for i in ids if sel(i)]
    if len(us) >= 5:
        r = pearson(rank([E[i]['d1']['d'] for i in us]), rank([E[i]['d2']['d'] for i in us])); out['d2_rho_' + nm] = r; print('    %-22s n=%2d raw Spearman d1~d2 %.3f (R2 %.3f)' % (nm, len(us), r, r * r))
# (2) battery rivals on the same 54 pockets
rows = []
for s in S:
    if s == 'fig.introRight': continue
    xs = []; ok = True
    for i in ids:
        vD, nD, zD, vC, nC, zC = P[i]['cells'][s]
        if None in (vD, vC): ok = False; break
        xs.append((vD + vC) / 2)
    if not ok or len(set(xs)) < 5: continue
    rows.append((s, pearson(resid(rank(d1), c), resid(rank(xs), c))))
rows.sort(key=lambda t: -abs(t[1])); out['battery54'] = rows[:8]
print('(2) battery rivals over the same %d pockets (partial Spearman on raw v): %s' % (len(ids), ' | '.join('%s %+.2f' % t for t in rows[:6])))
# (3) covariate R^2: rank regression of d on covariates
def cov(i, name):
    cells = P[i]['cells']
    return {'logTokens': math.log(P[i]['tokens']), 'meanUL': P[i]['mul'], 'hapaxShare': (cells['freq.hapaxShare'][0] + cells['freq.hapaxShare'][3]) / 2, 'ttr': (cells['freq.ttr'][0] + cells['freq.ttr'][3]) / 2}[name]
def dpat(i):
    c_ = P[i]['cells']['fig.introRight']; vD, nD, zD, vC, nC, zC = c_
    return None if None in (vD, nD, vC, nC) else ((vD - nD) + (vC - nC)) / 2
res = {}
for nm, sel in (('all real (384)', lambda i: P[i]['kind'] == 'real'), ('code+diagram (54)', lambda i: P[i]['kind'] == 'real' and P[i]['register'] in ('code', 'diagram'))):
    us = [i for i in P if sel(i) and dpat(i) is not None and all(P[i]['cells'][k][0] is not None for k in ('freq.hapaxShare', 'freq.ttr'))]
    y = rank([dpat(i) for i in us]); sets = {'logTokens+meanUL': ['logTokens', 'meanUL'], '+hapaxShare+ttr': ['logTokens', 'meanUL', 'hapaxShare', 'ttr']}
    for sn, names in sets.items():
        res[nm + ' ' + sn] = r2(y, [rank([cov(i, n) for i in us]) for n in names])
        print('(3) %-20s rank-regression R^2 of d on %-22s = %.3f (n=%d)' % (nm, sn, res[nm + ' ' + sn], len(us)))
out['covR2'] = res
# (4) greedy forward selection, up to 3 battery rivals (rank space), all real pockets; permutation null of the selected R^2
us = [i for i in P if P[i]['kind'] == 'real' and dpat(i) is not None]; y = rank([dpat(i) for i in us]); base = ctl(us)
cand = {}
for s in S:
    if s == 'fig.introRight': continue
    xs = []
    for i in us:
        vD, nD, zD, vC, nC, zC = P[i]['cells'][s]; xs.append(None if None in (vD, vC) else (vD + vC) / 2)
    if any(x is None for x in xs) or len(set(xs)) < 5: continue
    cand[s] = rank(xs)
def greedy(yy, k=3):
    chosen = []; cols = list(base); best = r2(yy, cols)
    for _ in range(k):
        bs, bv = None, best
        for s, col in cand.items():
            if s in chosen: continue
            v = r2(yy, cols + [col])
            if v > bv: bs, bv = s, v
        if bs is None: break
        chosen.append(bs); cols.append(cand[bs]); best = bv
    return chosen, best
ch, best = greedy(y); out['greedy'] = dict(chosen=ch, r2=best, r2controls=r2(y, base), candidates=len(cand)); print('(4) controls only R^2 %.3f; greedy 3 rivals %s R^2 %.3f (%d candidates, n=%d)' % (r2(y, base), ch, best, len(cand), len(us)))
rnd = random.Random(99); nullr = []
for _ in range(12):
    yp = y[:]; rnd.shuffle(yp); nullr.append(greedy(yp)[1])
out['greedyNull'] = dict(mean=sum(nullr) / len(nullr), max=max(nullr), draws=len(nullr)); print('    permutation null of the same greedy search (12 draws): mean R^2 %.3f max %.3f' % (out['greedyNull']['mean'], out['greedyNull']['max']))
json.dump(out, open(os.path.join(HERE, 'B2_rival.json'), 'w'), indent=1)
