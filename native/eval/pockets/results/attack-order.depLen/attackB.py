# attackB.py -- ATTACK B (cheaper rival) on order.depLen, from results/atlas-matrix.json only (stdlib python; no numpy).
# Pattern y = pocket-level v of order.depLen (mean of the two half values) over real non-thin pockets with a defined depLen cell (N = 390).  For each of the other 80 statistics s:
#   partial Spearman rho(y, v_s | rank log tokens, rank mean unit length)  (rank-transform everything with average ranks, residualise on the two covariates, Pearson of residuals).
# "Restatement" criterion of the task: rho^2 >= 0.7.  Also: within strata (word grain; non-code/notation; each group), greedy forward 1-3 predictor rank regressions, ridge on all rivals with leave-one-group-out CV,
# and the sign-split (P+ vs P-) AUC of every rival among the 140 PRESENT pockets.   python3 attackB.py  -> attackB.json
import json, os, math, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
M = json.load(open(os.path.join(ROOT, 'results', 'atlas-matrix.json')))
S = M['statistics']; DEP = S.index('order.depLen')
P = [p for p in M['pockets'] if p['kind'] == 'real' and not p['thin']]

def pv(p, i):
    c = p['cells'][i]
    if c[0] is None or c[2] is None: return None
    return 0.5 * (c[0] + c[2])
def rank(xs):
    idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
    while i < len(idx):
        j = i
        while j + 1 < len(idx) and xs[idx[j + 1]] == xs[idx[i]]: j += 1
        for k in range(i, j + 1): r[idx[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def solve(A, b):
    n = len(A); M_ = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(M_[r][c]))
        M_[c], M_[piv] = M_[piv], M_[c]
        d = M_[c][c]
        if abs(d) < 1e-14: d = 1e-14
        for k in range(c, n + 1): M_[c][k] /= d
        for r in range(n):
            if r != c:
                f = M_[r][c]
                if f:
                    for k in range(c, n + 1): M_[r][k] -= f * M_[c][k]
    return [M_[i][n] for i in range(n)]
def ols_resid(y, Xs):   # residual of y on [1] + columns Xs
    n = len(y); cols = [[1.0] * n] + Xs; k = len(cols)
    A = [[sum(cols[i][t] * cols[j][t] for t in range(n)) for j in range(k)] for i in range(k)]
    b = [sum(cols[i][t] * y[t] for t in range(n)) for i in range(k)]
    w = solve(A, b)
    return [y[t] - sum(w[i] * cols[i][t] for i in range(k)) for t in range(n)]
def pearson(a, b):
    n = len(a); ma = sum(a) / n; mb = sum(b) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa > 0 and sb > 0 else float('nan')
def partial_spearman(y, x, controls):
    ry = rank(y); rx = rank(x); rc = [rank(c) for c in controls]
    return pearson(ols_resid(ry, rc), ols_resid(rx, rc))

def table(idxs, stat_list=None):
    """rows: (pocket, y, {stat: v}) over pockets in idxs with defined depLen cell"""
    rows = []
    for p in idxs:
        y = pv(p, DEP)
        if y is None: continue
        rows.append((p, y))
    return rows

def run(pockets, label):
    rows = table(pockets); out = {'label': label, 'n': len(rows), 'rivals': []}
    y = [r[1] for r in rows]; ctr = [[math.log10(r[0]['tokens']) for r in rows], [r[0]['meanUnitLength'] for r in rows]]
    for si, s in enumerate(S):
        if si == DEP: continue
        xs = []; ys = []; cs = [[], []]
        for (p, yy) in rows:
            v = pv(p, si)
            if v is None or not math.isfinite(v): continue
            xs.append(v); ys.append(yy); cs[0].append(math.log10(p['tokens'])); cs[1].append(p['meanUnitLength'])
        if len(xs) < 30 or len(set(xs)) < 5: continue
        rho = partial_spearman(ys, xs, cs)
        raw = pearson(rank(ys), rank(xs))
        out['rivals'].append({'stat': s, 'n': len(xs), 'rawSpearman': raw, 'partialSpearman': rho, 'r2': rho * rho})
    out['rivals'].sort(key=lambda d: -d['r2'])
    return out, rows

def auc(pos, neg):
    allv = [(v, 1) for v in pos] + [(v, 0) for v in neg]; r = rank([a[0] for a in allv])
    rp = sum(r[i] for i, a in enumerate(allv) if a[1] == 1)
    return (rp - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))

res = {'protocolSha': M['protocolSha256'], 'N': len(P)}
full, rows = run(P, 'all real non-thin pockets (controls: rank log tokens, rank mean unit length)')
res['all'] = full
print('N', full['n'], 'best 12 rivals (partial Spearman | controls):')
for d in full['rivals'][:12]: print('  %-18s n=%d raw=%+.3f partial=%+.3f r2=%.3f' % (d['stat'], d['n'], d['rawSpearman'], d['partialSpearman'], d['r2']))
res['nRival_r2_ge_0.7'] = sum(1 for d in full['rivals'] if d['r2'] >= 0.7)
res['nRival_r2_ge_0.5'] = sum(1 for d in full['rivals'] if d['r2'] >= 0.5)
res['nRival_r2_ge_0.25'] = sum(1 for d in full['rivals'] if d['r2'] >= 0.25)
print('rivals with r2>=0.7:', res['nRival_r2_ge_0.7'], ' >=0.5:', res['nRival_r2_ge_0.5'], ' >=0.25:', res['nRival_r2_ge_0.25'])

# strata
strata = {
    'wordGrain': [p for p in P if p['grain'] == 'word'],
    'proseLike(bk,ml,ud,oc word grain)': [p for p in P if p['grain'] == 'word' and p['group'] in ('bk', 'ml', 'ud', 'oc')],
    'nonProse(cd + notation + charbigram)': [p for p in P if p['grain'] != 'word'],
}
for g in sorted(set(p['group'] for p in P)): strata['group=' + g] = [p for p in P if p['group'] == g]
res['strata'] = {}
for k, ps in strata.items():
    o, _ = run(ps, k)
    res['strata'][k] = {'n': o['n'], 'top': o['rivals'][:6]}
    print('stratum %-40s n=%d top: %s' % (k, o['n'], ', '.join('%s %+.2f' % (d['stat'], d['partialSpearman']) for d in o['rivals'][:5])))

# greedy forward selection (rank regression, all pockets) up to 3 predictors, plus the cheap named rival burst.repAdj
def build_matrix(rows, names):
    X = {}
    for s in names:
        si = S.index(s); X[s] = [pv(p, si) for (p, _) in rows]
    return X
cand = [d['stat'] for d in full['rivals'] if d['n'] >= 380][:80]
Xall = build_matrix(rows, cand)
keep = [i for i in range(len(rows)) if all(Xall[s][i] is not None and math.isfinite(Xall[s][i]) for s in cand)]
print('pockets with all', len(cand), 'rivals defined:', len(keep))
yk = rank([rows[i][1] for i in keep]); ck = [rank([math.log10(rows[i][0]['tokens']) for i in keep]), rank([rows[i][0]['meanUnitLength'] for i in keep])]
RK = {s: rank([Xall[s][i] for i in keep]) for s in cand}
def r2_of(y, cols):
    if not cols: return 0.0
    res_ = ols_resid(y, cols); ss = sum((v - sum(y) / len(y)) ** 2 for v in y)
    return 1 - sum(v * v for v in res_) / ss
sel = []; trace = []
for step in range(3):
    best = None
    for s in cand:
        if s in sel: continue
        r2 = r2_of(yk, ck + [RK[t] for t in sel + [s]])
        if best is None or r2 > best[1]: best = (s, r2)
    sel.append(best[0]); trace.append({'added': best[0], 'r2WithControls': best[1]})
base = r2_of(yk, ck)
res['greedy'] = {'n': len(keep), 'controlsOnlyR2': base, 'steps': trace}
print('greedy forward (rank R2 incl. controls; controls alone %.3f):' % base, trace)

# ridge on ALL rivals + controls, rank-transformed, leave-one-group-out CV R2
groups = [rows[i][0]['group'] for i in keep]; lam = 20.0
def ridge_fit(idx, cols, y, lam):
    n = len(idx); k = len(cols)
    mu = [sum(c[i] for i in idx) / n for c in cols]; my = sum(y[i] for i in idx) / n
    A = [[sum((cols[a][i] - mu[a]) * (cols[b][i] - mu[b]) for i in idx) + (lam if a == b else 0) for b in range(k)] for a in range(k)]
    b = [sum((cols[a][i] - mu[a]) * (y[i] - my) for i in idx) for a in range(k)]
    return solve(A, b), mu, my
cols = ck + [RK[s] for s in cand]
cv = {}; pred = [0.0] * len(keep)
for g in sorted(set(groups)):
    tr = [i for i in range(len(keep)) if groups[i] != g]; te = [i for i in range(len(keep)) if groups[i] == g]
    w, mu, my = ridge_fit(tr, cols, yk, lam)
    for i in te: pred[i] = my + sum(w[a] * (cols[a][i] - mu[a]) for a in range(len(cols)))
    ssr = sum((yk[i] - pred[i]) ** 2 for i in te); sst = sum((yk[i] - sum(yk[j] for j in tr) / len(tr)) ** 2 for i in te)
    cv[g] = {'n': len(te), 'r2': 1 - ssr / sst if sst > 0 else None}
tot = 1 - sum((yk[i] - pred[i]) ** 2 for i in range(len(keep))) / sum((v - sum(yk) / len(yk)) ** 2 for v in yk)
w, mu, my = ridge_fit(list(range(len(keep))), cols, yk, lam)
fit = [my + sum(w[a] * (cols[a][i] - mu[a]) for a in range(len(cols))) for i in range(len(keep))]
insample = 1 - sum((yk[i] - fit[i]) ** 2 for i in range(len(keep))) / sum((v - sum(yk) / len(yk)) ** 2 for v in yk)
res['ridgeAllRivals'] = {'lambda': lam, 'inSampleR2': insample, 'logoCvR2pooled': tot, 'byHeldOutGroup': cv}
print('ridge on all rivals (rank scale): in-sample R2 %.3f, leave-one-group-out CV R2 %.3f' % (insample, tot), {g: (None if d['r2'] is None else round(d['r2'], 2)) for g, d in cv.items()})

# sign-split among PRESENT pockets: AUC of every rival for P+ vs P-
pres = [p for p in P if p['cells'][DEP][4] in ('P+', 'P-')]
aucs = []
for si, s in enumerate(S):
    if si == DEP: continue
    pos = [pv(p, si) for p in pres if p['cells'][DEP][4] == 'P+' and pv(p, si) is not None]
    neg = [pv(p, si) for p in pres if p['cells'][DEP][4] == 'P-' and pv(p, si) is not None]
    if len(pos) < 20 or len(neg) < 20: continue
    a = auc(pos, neg); aucs.append({'stat': s, 'nPos': len(pos), 'nNeg': len(neg), 'auc': a, 'sep': abs(a - 0.5) * 2})
aucs.sort(key=lambda d: -d['sep'])
res['signAuc'] = aucs[:15]
print('sign-split (P+ vs P-, 140 pockets) best rivals by |AUC-0.5|*2:', ', '.join('%s %.3f' % (d['stat'], d['auc']) for d in aucs[:10]))
json.dump(res, open(os.path.join(HERE, 'attackB.json'), 'w'), indent=1)
