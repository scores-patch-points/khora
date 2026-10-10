# attackB2.py -- partial Spearman of depLen v with its own cheap components (adj = same-bin adjacency excess, ge2 = non-adjacent spacing), controlling rank log tokens and rank mean unit length.  stdlib python.
import json, os, math, sys
sys.argv = ['x']; HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'attackB.py')).read().split("res = {'protocolSha'")[0]   # reuse the helper functions (rank, ols_resid, pearson, partial_spearman) without re-running attack B
exec(src)
B2 = {r['id']: r for r in json.load(open(os.path.join(HERE, 'B2.json')))['rows']}
T = {p['id']: p for p in P}
def mean2(a, b): return None if a is None or b is None else 0.5 * (a + b)
rows = []
for pid, r in B2.items():
    p = T.get(pid)
    if p is None or r['status'] == 'nodata': continue
    v = mean2(r['vD'], r['vC']); adj = mean2(r['adjD'], r['adjC']); ge2 = mean2(r['ge2D'], r['ge2C'])
    if None in (v, adj, ge2): continue
    rows.append((p, v, adj, ge2))
n = len(rows); print('pockets', n)
cs = [[math.log10(r[0]['tokens']) for r in rows], [r[0]['meanUnitLength'] for r in rows]]
y = [r[1] for r in rows]; adj = [r[2] for r in rows]; ge2 = [r[3] for r in rows]
res = {'n': n}
for name, x in (('adj (distance-1 same-bin excess)', adj), ('ge2 (non-adjacent spacing)', ge2)):
    rho = partial_spearman(y, x, cs); res[name] = {'partialSpearman': rho, 'r2': rho * rho, 'rawSpearman': pearson(rank(y), rank(x))}
    print('%-36s raw %+.3f partial %+.3f r2 %.3f' % (name, res[name]['rawSpearman'], rho, rho * rho))
# R2 of v-ranks on both components + controls
ry = rank(y); X = [rank(adj), rank(ge2)] + [rank(c) for c in cs]
def r2(yv, cols):
    rs = ols_resid(yv, cols); m = sum(yv) / len(yv); return 1 - sum(e * e for e in rs) / sum((t - m) ** 2 for t in yv)
res['r2_adj+ge2+controls'] = r2(ry, X); res['r2_adjOnly+controls'] = r2(ry, [rank(adj)] + [rank(c) for c in cs]); res['r2_ge2Only+controls'] = r2(ry, [rank(ge2)] + [rank(c) for c in cs])
print({k: round(v, 3) for k, v in res.items() if k.startswith('r2')})
# sign of v among PRESENT pockets vs sign of adj
pres = [r for r in rows if r[0]['cells'][DEP][4] in ('P+', 'P-')]
agree = sum(1 for r in pres if (r[1] > 0) == (r[2] > 0)); res['presentSignAgreeWithAdj'] = [agree, len(pres)]
agree2 = sum(1 for r in pres if (r[1] > 0) == (r[3] > 0)); res['presentSignAgreeWithGe2'] = [agree2, len(pres)]
print('PRESENT pockets: sign(v)==sign(adj) in %d/%d ; sign(v)==sign(ge2) in %d/%d' % (agree, len(pres), agree2, len(pres)))
pos = [r[2] for r in pres if r[0]['cells'][DEP][4] == 'P+']; neg = [r[2] for r in pres if r[0]['cells'][DEP][4] == 'P-']
res['aucAdjSignSplit'] = auc(pos, neg); print('AUC of adj for P+ vs P-: %.3f' % res['aucAdjSignSplit'])
pos = [r[3] for r in pres if r[0]['cells'][DEP][4] == 'P+']; neg = [r[3] for r in pres if r[0]['cells'][DEP][4] == 'P-']
res['aucGe2SignSplit'] = auc(pos, neg); print('AUC of ge2 for P+ vs P-: %.3f' % res['aucGe2SignSplit'])
json.dump(res, open(os.path.join(HERE, 'attackB2.json'), 'w'), indent=1)

# ---- sign-split pattern (P+ vs P-, the 140 PRESENT pockets): partial rank correlation of the sign with each candidate rival, controlling rank log tokens and rank mean unit length; r2 = rho^2
pres_rows = [r for r in rows if r[0]['cells'][DEP][4] in ('P+', 'P-')]
sg = [1.0 if r[0]['cells'][DEP][4] == 'P+' else -1.0 for r in pres_rows]
cs2 = [[math.log10(r[0]['tokens']) for r in pres_rows], [r[0]['meanUnitLength'] for r in pres_rows]]
sign_res = {'n': len(pres_rows), 'candidates': []}
def add(name, xs):
    rho = partial_spearman(sg, xs, cs2); a = auc([x for x, s in zip(xs, sg) if s > 0], [x for x, s in zip(xs, sg) if s < 0])
    sign_res['candidates'].append({'stat': name, 'partialRho': rho, 'r2': rho * rho, 'auc': a, 'rawRankBiserial': 2 * a - 1})
add('OWN adj (same-bin pairs at distance 1, excess)', [r[2] for r in pres_rows])
add('OWN ge2 (non-adjacent spacing; ~ depLen itself)', [r[3] for r in pres_rows])
for si, s in enumerate(S):
    if si == DEP: continue
    xs = [pv(r[0], si) for r in pres_rows]
    if any(x is None or not math.isfinite(x) for x in xs) or len(set(xs)) < 5: continue
    add(s, xs)
sign_res['candidates'].sort(key=lambda d: -d['r2'])
res['signSplit'] = sign_res
print('\nSIGN-SPLIT (P+ vs P-, n=%d): best candidates by partial r2 (controls: rank log tokens, rank mean unit length)' % len(pres_rows))
for d in sign_res['candidates'][:10]: print('  %-52s partial rho %+.3f r2 %.3f AUC %.3f' % (d['stat'], d['partialRho'], d['r2'], d['auc']))
print('  atlas statistics with r2 >= 0.7 for the sign split:', [d['stat'] for d in sign_res['candidates'] if d['r2'] >= 0.7 and not d['stat'].startswith('OWN')])
json.dump(res, open(os.path.join(HERE, 'attackB2.json'), 'w'), indent=1)
