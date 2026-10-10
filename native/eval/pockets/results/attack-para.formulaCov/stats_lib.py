# stats_lib.py -- pure-stdlib helpers: ranks, Spearman, partial Spearman, OLS on ranks, permutation eta-squared.
import math, random
def rank(xs):
    idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0]*len(xs); i = 0
    while i < len(idx):
        j = i
        while j+1 < len(idx) and xs[idx[j+1]] == xs[idx[i]]: j += 1
        for k in range(i, j+1): r[idx[k]] = (i+j)/2.0+1
        i = j+1
    return r
def mean(xs): return sum(xs)/len(xs)
def pearson(a, b):
    ma, mb = mean(a), mean(b); sa = math.sqrt(sum((x-ma)**2 for x in a)); sb = math.sqrt(sum((y-mb)**2 for y in b))
    if sa == 0 or sb == 0: return float('nan')
    return sum((x-ma)*(y-mb) for x, y in zip(a, b))/(sa*sb)
def spearman(a, b): return pearson(rank(a), rank(b))
def solve(A, b):  # Gaussian elimination with partial pivoting (small systems)
    n = len(A); M = [row[:]+[b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c])); M[c], M[p] = M[p], M[c]
        if abs(M[c][c]) < 1e-12: raise ValueError('singular')
        for r in range(c+1, n):
            fct = M[r][c]/M[c][c]
            for k in range(c, n+1): M[r][k] -= fct*M[c][k]
    x = [0.0]*n
    for i in range(n-1, -1, -1): x[i] = (M[i][n]-sum(M[i][k]*x[k] for k in range(i+1, n)))/M[i][i]
    return x
def ols_fit(X, y):  # X: list of rows (with intercept col included); returns beta
    k = len(X[0]); A = [[sum(r[i]*r[j] for r in X) for j in range(k)] for i in range(k)]; b = [sum(r[i]*yy for r, yy in zip(X, y)) for i in range(k)]
    return solve(A, b)
def residualize(y, covs):  # covs: list of columns
    X = [[1.0]+[c[i] for c in covs] for i in range(len(y))]; beta = ols_fit(X, y)
    return [y[i]-sum(beta[j]*X[i][j] for j in range(len(beta))) for i in range(len(y))]
def partial_spearman(a, b, covs):
    ra, rb = rank(a), rank(b); rc = [rank(c) for c in covs]
    return pearson(residualize(ra, rc), residualize(rb, rc))
def r2_rank(y, xs):  # R^2 of rank(y) on ranks of xs columns
    ry = rank(y); X = [[1.0]+[rank(c)[i] for c in xs] for i in range(len(y))]; beta = ols_fit(X, ry)
    pred = [sum(beta[j]*X[i][j] for j in range(len(beta))) for i in range(len(y))]; my = mean(ry)
    sst = sum((v-my)**2 for v in ry); sse = sum((ry[i]-pred[i])**2 for i in range(len(y))); return 1-sse/sst
def eta2(vals, labels):
    n = len(vals); m = mean(vals); g = {}
    for v, l in zip(vals, labels): g.setdefault(l, []).append(v)
    ssb = sum(len(x)*(mean(x)-m)**2 for x in g.values()); sst = sum((v-m)**2 for v in vals); return ssb/sst if sst > 0 else float('nan'), len(g)
def perm_eta2(vals, labels, draws=2000, seed=1):
    rnd = random.Random(seed); obs, k = eta2(vals, labels); lab = list(labels); ge = 0
    for _ in range(draws):
        rnd.shuffle(lab)
        if eta2(vals, lab)[0] >= obs: ge += 1
    return obs, (1+ge)/(1+draws), k
def r2_ranked(ry, rcols):  # R^2 of already-ranked y on already-ranked columns
    X = [[1.0]+[c[i] for c in rcols] for i in range(len(ry))]; beta = ols_fit(X, ry)
    pred = [sum(beta[j]*X[i][j] for j in range(len(beta))) for i in range(len(ry))]; my = mean(ry)
    sst = sum((v-my)**2 for v in ry); sse = sum((ry[i]-pred[i])**2 for i in range(len(ry))); return 1-sse/sst
