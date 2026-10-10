# attackC3.py -- who is NOT PRESENT? shared property of the pockets where the atlas status is not PRESENT (z undefined / ambiguous) vs the 242 PRESENT ones; plus class medians of code vs prose in A variants.
import json, math, os, sys, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stats_lib import *
H = os.path.dirname(os.path.abspath(__file__)); M = json.load(open(os.path.join(H, '..', 'atlas-matrix.json'))); S = M['statistics']; si = S.index('para.formulaCov')
R = [p for p in M['pockets'] if p['kind'] == 'real']
lab = ['P' if p['cells'][si][4] == 'P+' else 'N' for p in R]
out = {'nPresent': lab.count('P'), 'nNotPresent': lab.count('N'), 'statusCounts': dict(collections.Counter(p['cells'][si][4] for p in R))}
def med(xs): xs = sorted(xs); n = len(xs); return xs[n//2] if n % 2 else (xs[n//2-1]+xs[n//2])/2
for key, f in (('tokens', lambda p: p['tokens']), ('logTokens', lambda p: math.log(p['tokens'])), ('meanUnitLength', lambda p: p['meanUnitLength']), ('docs', lambda p: p['docs'])):
    vals = [f(p) for p in R]; obs, pv, k = perm_eta2(vals, lab, 2000, seed=5)
    out['status_vs_'+key] = {'medianPresent': med([v for v, l in zip(vals, lab) if l == 'P']), 'medianNot': med([v for v, l in zip(vals, lab) if l == 'N']), 'eta2': obs, 'p': pv, 'spearman_with_present': spearman(vals, [1.0 if l == 'P' else 0.0 for l in lab])}
# share of non-PRESENT by group and register
for attr in ('group', 'register'):
    d = collections.defaultdict(lambda: [0, 0])
    for p, l in zip(R, lab): d[p[attr]][0 if l == 'P' else 1] += 1
    out['byGroup' if attr == 'group' else 'byRegister'] = {k: {'present': v[0], 'notPresent': v[1], 'sharePresent': v[0]/(v[0]+v[1])} for k, v in sorted(d.items(), key=lambda kv: -(kv[1][0]+kv[1][1]))}
# Cramer's V of status vs group with permutation
def cramer(labels, status):
    tab = collections.defaultdict(lambda: collections.Counter())
    for a, b in zip(labels, status): tab[a][b] += 1
    n = len(labels); rows = list(tab); cols = ['P', 'N']; chi = 0.0
    for r in rows:
        for c in cols:
            e = sum(tab[r].values())*sum(tab[x][c] for x in rows)/n
            if e > 0: chi += (tab[r][c]-e)**2/e
    return math.sqrt(chi/(n*(min(len(rows), 2)-1)))
import random
rnd = random.Random(9)
for attr in ('group', 'register'):
    L = [p[attr] for p in R]; obs = cramer(L, lab); st = list(lab); ge = 0
    for _ in range(2000):
        rnd.shuffle(st)
        if cramer(L, st) >= obs: ge += 1
    out['cramerV_status_'+attr] = {'V': obs, 'p': (1+ge)/2001}
# leave-one-pocket-out of the PRESENT fraction (trivial) and of the 85% rule: fraction PRESENT among pockets with tokens >= t
for t in (20000, 30000, 40000, 60000, 100000, 150000):
    sel = [(l) for p, l in zip(R, lab) if p['tokens'] >= t]; out[f'sharePresent_tokens>={t}'] = {'n': len(sel), 'share': sel.count('P')/len(sel)}
json.dump(out, open(os.path.join(H, 'out', 'C3_notPresent.json'), 'w'), indent=1); print(json.dumps(out, indent=0)[:3800])
