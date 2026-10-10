# attackB.py -- ATTACK B (cheaper rival).  Pocket pattern of para.prefixCopy = z_bar (mean of the two half-z), v_bar, and the presence indicator, over the real non-thin pockets with the cell defined.
# For each of the other 80 battery statistics: Spearman rho with prefixCopy and PARTIAL Spearman controlling log10(tokens) and mean unit length (rank-transformed variables, OLS residuals).
# Rivals computed here with the atlas null (50 draws, out/E global): firstTokCopy (1-token opening), posParTail (offsets 2..7), prefixNoDup.  Pure standard library.
import json, math, os, collections
M = json.load(open('../atlas-matrix.json')); ST = M['statistics']; I = ST.index('para.prefixCopy')
real = [p for p in M['pockets'] if p['kind']=='real' and not p['thin']]
def rank(xs):
    idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0]*len(xs); i = 0
    while i < len(idx):
        j = i
        while j+1 < len(idx) and xs[idx[j+1]] == xs[idx[i]]: j += 1
        for k in range(i, j+1): r[idx[k]] = (i+j)/2 + 1
        i = j+1
    return r
def pearson(a, b):
    n = len(a); ma = sum(a)/n; mb = sum(b)/n
    sa = math.sqrt(sum((x-ma)**2 for x in a)); sb = math.sqrt(sum((y-mb)**2 for y in b))
    return sum((x-ma)*(y-mb) for x, y in zip(a, b))/(sa*sb) if sa > 0 and sb > 0 else float('nan')
def solve(A, b):
    n = len(A); M_ = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M_[r][c])); M_[c], M_[p] = M_[p], M_[c]
        for r in range(n):
            if r != c:
                f = M_[r][c]/M_[c][c]
                for k in range(c, n+1): M_[r][k] -= f*M_[c][k]
    return [M_[i][n]/M_[i][i] for i in range(n)]
def resid(y, X):  # OLS with intercept
    n = len(y); cols = [[1.0]*n] + X; k = len(cols)
    A = [[sum(cols[i][t]*cols[j][t] for t in range(n)) for j in range(k)] for i in range(k)]
    b = [sum(cols[i][t]*y[t] for t in range(n)) for i in range(k)]
    beta = solve(A, b)
    return [y[t]-sum(beta[i]*cols[i][t] for i in range(k)) for t in range(n)]
def partial_spearman(x, y, ctrl):
    rx, ry = rank(x), rank(y); rc = [rank(c) for c in ctrl]
    return pearson(resid(rx, rc), resid(ry, rc))
def zbar(c): return (c[1]+c[3])/2 if c[1] is not None and c[3] is not None else None
def vbar(c): return (c[0]+c[2])/2 if c[0] is not None and c[2] is not None else None
pres = lambda c: 1.0 if c[4]=='P+' else (-1.0 if c[4]=='P-' else 0.0)
# battery stats table
rows = [p for p in real if zbar(p['cells'][I]) is not None]
ctlT = lambda S_: [math.log10(p['tokens']) for p in S_]; ctlU = lambda S_: [p['meanUnitLength'] for p in S_]
out = {'nPrefix': len(rows), 'rivals': []}
for j, name in enumerate(ST):
    if j == I: continue
    sel = [p for p in rows if zbar(p['cells'][j]) is not None]
    if len(sel) < 150: continue
    row = {'stat': name, 'n': len(sel)}
    for tag, fn in (('z', zbar), ('v', vbar), ('pres', None)):
        if fn is None:
            x = [pres(p['cells'][I]) for p in sel]; y = [pres(p['cells'][j]) for p in sel]
        else:
            x = [fn(p['cells'][I]) for p in sel]; y = [fn(p['cells'][j]) for p in sel]
        ctrl = [ctlT(sel), ctlU(sel)]
        row[tag] = {'rho': pearson(rank(x), rank(y)), 'partial': partial_spearman(x, y, ctrl)}
    out['rivals'].append(row)
out['rivals'].sort(key=lambda r: -abs(r['z']['partial']))
# rivals computed by attackE (atlas null, 50 draws): z_bar from the two halves
E = {f[:-5]: json.load(open('out/E/'+f)) for f in os.listdir('out/E')}
meta = {p['id']: p for p in real}
def ez(r, key, null='global'):
    a = r['halves']['discover'][null][key]['z']; b = r['halves']['confirm'][null][key]['z']
    return (a+b)/2 if a is not None and b is not None else None
def ev(r, key, null='global'):
    a = r['halves']['discover'][null][key]['v']; b = r['halves']['confirm'][null][key]['v']
    return (a+b)/2 if a is not None and b is not None else None
new = []
for key in ('firstTokCopy', 'prefixNoDup', 'posPar', 'posParTail'):
    sel = [i for i, r in E.items() if ez(r, 'prefixCopy') is not None and ez(r, key) is not None]
    x = [ez(E[i], 'prefixCopy') for i in sel]; y = [ez(E[i], key) for i in sel]
    xv = [ev(E[i], 'prefixCopy') for i in sel]; yv = [ev(E[i], key) for i in sel]
    ctrl = [[math.log10(meta[i]['tokens']) for i in sel], [meta[i]['meanUnitLength'] for i in sel]]
    row = {'stat': key, 'n': len(sel), 'z': {'rho': pearson(rank(x), rank(y)), 'partial': partial_spearman(x, y, ctrl)}, 'v': {'rho': pearson(rank(xv), rank(yv)), 'partial': partial_spearman(xv, yv, ctrl)}}
    # variants controlling each half-sample's presence too: rho of status
    new.append(row)
out['computedRivals_50draws'] = new
# the same for the within-document null: does the within-doc z of prefixCopy agree with the within-doc z of the rivals?
nw = []
for key in ('firstTokCopy', 'posPar', 'posParTail'):
    sel = [i for i, r in E.items() if ez(r, 'prefixCopy', 'within') is not None and ez(r, key, 'within') is not None]
    x = [ez(E[i], 'prefixCopy', 'within') for i in sel]; y = [ez(E[i], key, 'within') for i in sel]
    ctrl = [[math.log10(meta[i]['tokens']) for i in sel], [meta[i]['meanUnitLength'] for i in sel]]
    nw.append({'stat': key, 'n': len(sel), 'rho': pearson(rank(x), rank(y)), 'partial': partial_spearman(x, y, ctrl)})
out['computedRivals_withinNull'] = nw
json.dump(out, open('B_rival.json', 'w'), indent=1)
print('top rivals by |partial rho| of z_bar (controls: log tokens, mean unit length)')
for r in out['rivals'][:14]: print(f"  {r['stat']:22s} n={r['n']} z: rho={r['z']['rho']:.3f} partial={r['z']['partial']:.3f} | v: rho={r['v']['rho']:.3f} partial={r['v']['partial']:.3f} | pres: rho={r['pres']['rho']:.3f} partial={r['pres']['partial']:.3f}")
print('computed rivals (50 draws, atlas null)')
for r in new: print(' ', r['stat'], r['n'], 'z', {k: round(v, 3) for k, v in r['z'].items()}, 'v', {k: round(v, 3) for k, v in r['v'].items()})
print('within-doc null rivals'); 
for r in nw: print(' ', r)
