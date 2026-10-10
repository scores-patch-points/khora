# attackC2.py -- MULTIPLICITY and shared-property checks for para.formulaCov.
#  (1) cell counts and the iid false-PRESENT reference   (2) label permutation (2000 draws) of eta2(v | group/register), plain and STRATIFIED by size x unit-length terciles
#  (3) eta2 of the residual of rank(v) after removing rank(log tokens) and rank(unit length)   (4) leave-one-pocket-out and leave-one-class-out eta2
#  (5) base rate of "class-specific constant" (eta2 >= 0.5 and p < 0.01 on group or register) over the whole battery of 81 statistics.
import json, math, os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stats_lib import *
H = os.path.dirname(os.path.abspath(__file__)); AT = os.path.join(H, '..', 'atlas')
M = json.load(open(os.path.join(H, '..', 'atlas-matrix.json'))); S = M['statistics']; TARGET = 'para.formulaCov'; si = S.index(TARGET)
LT = json.load(open(os.path.join(H, '..', 'law-table.json')))
R = [p for p in M['pockets'] if p['kind'] == 'real']
out = {}
fp = LT['falsePresent']
out['cells'] = {'statistics': len(S), 'realPockets': len(R), 'cellsTested': len(S)*len(R), 'definedRealCells': LT['summary']['definedRealCells'], 'observedPresentRealCells': fp['observedPresentRealCells'],
  'iid_rate4': fp['plantedIid']['rate4'], 'pPresentFromRate4': fp['plantedIid']['pPresentFromRate4'], 'expectedFalsePresent_wholeAtlas': fp['plantedIid']['expectedFalseFromRate4'], 'binomialSd': fp['binomialReference']['sd']}
p0 = fp['plantedIid']['pPresentFromRate4']; out['cells']['expectedFalsePresent_formulaCov_391cells'] = 391*p0
# exact binomial tail for observing 242 PRESENT in 243 defined cells at p0 and at the loose per-cell rule p = 0.005 (one half |z|>=4 rate in the 20-rep calibration, squared would be 2.5e-5)
def binom_tail_log10(n, k, p): return (math.lgamma(n+1)-math.lgamma(k+1)-math.lgamma(n-k+1)+k*math.log(p)+(n-k)*math.log(1-p))/math.log(10)
out['cells']['log10_P(>=242 of 243 | p0)'] = binom_tail_log10(243, 242, p0)
out['cells']['log10_P(>=242 of 243 | p=0.013 (rate4, one half))'] = binom_tail_log10(243, 242, 0.013)
# pockets
P = []
for p in R:
    c = p['cells'][si]
    if c[4] != 'P+': continue
    a = json.load(open(os.path.join(AT, p['id']+'.json'))); cc = [a['halves'][h][TARGET] for h in ('discover', 'confirm')]
    v = (cc[0]['v']+cc[1]['v'])/2; nm = (cc[0]['nullMean']+cc[1]['nullMean'])/2
    P.append({'id': p['id'], 'group': p['group'], 'register': p['register'], 'script': p['script'], 'lt': math.log(p['tokens']), 'ul': p['meanUnitLength'], 'v': v, 'ex': v-nm})
n = len(P); out['nPresent'] = n
def terc(xs):
    s = sorted(xs); a, b = s[n//3], s[2*n//3]; return [0 if x < a else (1 if x < b else 2) for x in xs]
strata = [(a, b) for a, b in zip(terc([r['lt'] for r in P]), terc([r['ul'] for r in P]))]
rnd = random.Random(20261007)
def eta_perm(vals, labels, strat=None, draws=2000):
    obs, k = eta2(vals, labels); lab = list(labels); ge = 0
    groups = {}
    if strat is not None:
        for i, s in enumerate(strat): groups.setdefault(s, []).append(i)
    for _ in range(draws):
        if strat is None: rnd.shuffle(lab)
        else:
            for ix in groups.values():
                ls = [labels[i] for i in ix]; rnd.shuffle(ls)
                for i, l in zip(ix, ls): lab[i] = l
        if eta2(vals, lab)[0] >= obs: ge += 1
    return {'eta2': obs, 'levels': k, 'p': (1+ge)/(1+draws)}
for key in ('v', 'ex'):
    vals = [r[key] for r in P]; res = {}
    for attr in ('group', 'register'):
        labs = [r[attr] for r in P]
        res[attr] = {'plain': eta_perm(vals, labs), 'stratifiedBySizeXlength': eta_perm(vals, labs, strata)}
        # residual after size and length (rank-based)
        resid = residualize(rank(vals), [rank([r['lt'] for r in P]), rank([r['ul'] for r in P])])
        res[attr]['residual_after_size_length'] = eta_perm(resid, labs, None, 2000)
        res[attr]['stratified_residual'] = eta_perm(resid, labs, strata, 2000)
    out['perm_'+key] = res
# leave-one-pocket-out
for attr in ('group', 'register'):
    vals = [r['v'] for r in P]; labs = [r[attr] for r in P]; loo = []
    for i in range(n):
        v2 = vals[:i]+vals[i+1:]; l2 = labs[:i]+labs[i+1:]; loo.append((eta2(v2, l2)[0], P[i]['id']))
    loo.sort(); out['loo_'+attr] = {'min': loo[0], 'max': loo[-1], 'full': eta2(vals, labs)[0]}
# leave-one-class-out
for attr in ('group', 'register'):
    res = {}
    for g in sorted({r[attr] for r in P}):
        sub = [r for r in P if r[attr] != g]
        if len({r['group'] for r in sub}) < 2 and attr == 'group': continue
        res[g] = {'n': len(sub), 'eta2_group': eta2([r['v'] for r in sub], [r['group'] for r in sub])[0], 'eta2_register': eta2([r['v'] for r in sub], [r['register'] for r in sub])[0]}
    out['looClass_'+attr] = res
    out['looClass_'+attr+'_summary'] = {k: [min(x[k] for x in res.values()), max(x[k] for x in res.values())] for k in ('eta2_group', 'eta2_register')}
# base rate over the battery: eta2(v | group) and eta2(v | register) among PRESENT pockets (either sign) of every statistic with >= 60 PRESENT pockets
rnd2 = random.Random(77); rows = []
for j, s in enumerate(S):
    sel = [p for p in R if p['cells'][j][4] in ('P+', 'P-')]
    if len(sel) < 60: continue
    vals = [(p['cells'][j][0]+p['cells'][j][2])/2 for p in sel]; rec = {'stat': s, 'n': len(sel)}
    for attr in ('group', 'register'):
        labs = [p[attr] for p in sel]; obs, k = eta2(vals, labs); lab = list(labs); ge = 0
        for _ in range(300):
            rnd2.shuffle(lab)
            if eta2(vals, lab)[0] >= obs: ge += 1
        rec[attr] = {'eta2': obs, 'p': (1+ge)/301}
    rows.append(rec)
out['baseRate'] = {'statsWith>=60PRESENT': len(rows), 'groupEta2>=0.5&p<0.01': sum(1 for r in rows if r['group']['eta2'] >= 0.5 and r['group']['p'] < 0.01), 'registerEta2>=0.5&p<0.01': sum(1 for r in rows if r['register']['eta2'] >= 0.5 and r['register']['p'] < 0.01), 'eitherClassSpecific': sum(1 for r in rows if any(r[a]['eta2'] >= 0.5 and r[a]['p'] < 0.01 for a in ('group', 'register'))), 'medianGroupEta2': sorted(r['group']['eta2'] for r in rows)[len(rows)//2], 'medianRegisterEta2': sorted(r['register']['eta2'] for r in rows)[len(rows)//2], 'formulaCov': next(r for r in rows if r['stat'] == TARGET)}
json.dump(out, open(os.path.join(H, 'out', 'C2_multiplicity.json'), 'w'), indent=1)
print(json.dumps(out, indent=1)[:6000])
