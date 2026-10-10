# attackC.py -- ATTACK C (multiplicity and shared property).  Standard library only; random.Random(seed) so every number is reproducible.
#  C1  cells tested, planted-iid reference, expected false PRESENT cells (law-table.falsePresent) for the whole battery and for prefixCopy alone; the empirical exchangeable-twin calibration (out/C/cal.json)
#  C2  SHARED PROPERTY: eta2(presence ~ register|group|script) replicated; permutation of pocket labels (2000 draws); label permutation WITHIN group strata and WITHIN language strata (register adds nothing beyond
#      the stratum?); leave-one-pocket-out (385 refits), leave-one-register-out (every level), leave-one-group-out; the same eta2 for ALL 81 statistics (is register special to this law?)
#  C3  CONSTANT: eta2 of v, of the excess v - nullMean, and of log(v/nullMean) on register / group / script among P+ pockets (2000 draws each), plus omega2 (adjusted)
import json, math, os, random, collections
M = json.load(open('../atlas-matrix.json')); ST = M['statistics']; I = ST.index('para.prefixCopy')
real = [p for p in M['pockets'] if p['kind']=='real' and not p['thin']]
dfn = [p for p in real if p['cells'][I][4] not in ('zundef','nodata')]
LT = json.load(open('../law-table.json'))
out = {}
# ---------------------------------------------------------------- C1
fp = LT['falsePresent']; p = fp['binomialReference']['p']
n_def_all = fp['nDefinedRealCells']
out['C1'] = {'statistics': len(ST), 'realNonThinPockets': len(real), 'definedRealCellsAllStats': n_def_all, 'observedPresentRealCellsAllStats': fp['observedPresentRealCells'],
  'pFalsePresentPerCell': p, 'expectedFalsePresentAllStats': n_def_all*p, 'sdAllStats': fp['binomialReference']['sd'],
  'prefixCopy': {'definedCells': len(dfn), 'expectedFalsePresent': len(dfn)*p, 'P(at least 1 false)': 1-(1-p)**len(dfn), 'observedPresent': sum(1 for q in dfn if q['cells'][I][4] in ('P+','P-')),
                 'P(>=3 false negative cells)': None}, 'plantedIidHalfCells': fp['plantedIid']['halfCells'], 'plantedIidDefined': fp['plantedIid']['definedCells'], 'plantedIidAbsZge4': fp['plantedIid']['absZge4']}
pn = p/2; N = len(dfn)
pge3 = 1 - sum(math.comb(N, k)*pn**k*(1-pn)**(N-k) for k in range(3))
out['C1']['prefixCopy']['P(>=3 false negative-sign PRESENT cells)'] = pge3
out['C1']['prefixCopy']['pFalsePresentUpper_ruleOfThree_rate4'] = fp['plantedIid']['ruleOfThreeUpper']
if os.path.exists('out/C/cal.json'):
    cal = json.load(open('out/C/cal.json')); R = len(next(iter(cal.values())))
    n = 0; ge4 = 0; ge2 = 0; both4 = 0; bothpairs = 0; zs = []; defn = 0; pm = collections.Counter(); both_z4_pocket = collections.Counter()
    for pid, reps in cal.items():
        for zr in reps:
            a, b = zr; bothpairs += 1
            for z in zr:
                n += 1
                if z is None: continue
                defn += 1; zs.append(z); ge4 += abs(z) >= 4; ge2 += abs(z) >= 2
            if a is not None and b is not None and abs(a) >= 4 and abs(b) >= 4 and a*b > 0: both4 += 1; both_z4_pocket[pid] += 1
    sd = math.sqrt(sum((z-sum(zs)/len(zs))**2 for z in zs)/(len(zs)-1))
    out['C1']['exchangeableTwins'] = {'reps': R, 'halfCells': n, 'definedHalfCells': defn, 'absZge4': ge4, 'rate4': ge4/defn, 'absZge2': ge2, 'rate2': ge2/defn, 'sdZ': sd, 'pairs': bothpairs, 'falsePresentPairs': both4, 'falsePresentPairRate': both4/bothpairs,
        'perPocketFalsePresentCounts': dict(both_z4_pocket), 't9ReferenceRate4': 0.0030, 't9ReferenceRate2': 0.0766}
# ---------------------------------------------------------------- helpers
def eta2(y, lab):
    n = len(y); my = sum(y)/n; sst = sum((v-my)**2 for v in y)
    if sst == 0: return 0.0
    s = collections.defaultdict(float); c = collections.Counter()
    for v, l in zip(y, lab): s[l] += v; c[l] += 1
    ssb = sum(s[l]**2/c[l] for l in c) - n*my*my
    return ssb/sst
def omega2(y, lab):
    n = len(y); my = sum(y)/n; sst = sum((v-my)**2 for v in y); k = len(set(lab))
    e = eta2(y, lab); ssb = e*sst; ssw = sst-ssb
    msw = ssw/(n-k) if n > k else float('nan')
    return (ssb-(k-1)*msw)/(sst+msw)
def perm_p(y, lab, B, rng, stat=eta2, strata=None):
    obs = stat(y, lab); lab2 = list(lab); ge = 0
    idx_by = None
    if strata is not None:
        idx_by = collections.defaultdict(list)
        for i, s in enumerate(strata): idx_by[s].append(i)
    for b in range(B):
        if idx_by is None: rng.shuffle(lab2)
        else:
            for s, ix in idx_by.items():
                vals = [lab[i] for i in ix]; rng.shuffle(vals)
                for i, v in zip(ix, vals): lab2[i] = v
        if stat(y, lab2) >= obs: ge += 1
    return obs, (ge+1)/(B+1)
def eta2_within(y, lab, strata):
    """incremental eta2 of lab beyond strata: (SSE_strata - SSE_(strata x lab)) / SSE_strata  (lab nested in strata)"""
    n = len(y)
    def sse(keys):
        s = collections.defaultdict(float); c = collections.Counter(); q = collections.defaultdict(float)
        for v, k in zip(y, keys): s[k] += v; c[k] += 1; q[k] += v*v
        return sum(q[k]-s[k]**2/c[k] for k in c)
    e0 = sse(strata); e1 = sse(list(zip(strata, lab)))
    return (e0-e1)/e0 if e0 > 0 else 0.0
# ---------------------------------------------------------------- C2 shared property
rng = random.Random(20261007)
pres = [1.0 if q['cells'][I][4] in ('P+','P-') else 0.0 for q in dfn]
reg = [q['register'] for q in dfn]; grp = [q['group'] for q in dfn]; scr = [q['script'] for q in dfn]; lang = [q['language'] for q in dfn]
C2 = {'n': len(dfn), 'nPresent': int(sum(pres))}
for nm, lab in (('register', reg), ('group', grp), ('script', scr)):
    o, pv = perm_p(pres, lab, 2000, rng); C2[nm] = {'eta2': o, 'omega2': omega2(pres, lab), 'p2000': pv, 'levels': len(set(lab))}
# stratified permutation: register labels permuted within group / within language
o = eta2_within(pres, reg, grp); ge = 0; lab2 = list(reg); idx = collections.defaultdict(list)
for i, g in enumerate(grp): idx[g].append(i)
for b in range(2000):
    for g, ix in idx.items():
        vals = [reg[i] for i in ix]; rng.shuffle(vals)
        for i, v in zip(ix, vals): lab2[i] = v
    ge += eta2_within(pres, lab2, grp) >= o
C2['registerBeyondGroup'] = {'incrementalEta2': o, 'p_permuteWithinGroup2000': (ge+1)/2001, 'groupEta2': eta2(pres, grp)}
o = eta2_within(pres, reg, lang); ge = 0; lab2 = list(reg); idx = collections.defaultdict(list)
for i, g in enumerate(lang): idx[g].append(i)
for b in range(2000):
    for g, ix in idx.items():
        vals = [reg[i] for i in ix]; rng.shuffle(vals)
        for i, v in zip(ix, vals): lab2[i] = v
    ge += eta2_within(pres, lab2, lang) >= o
C2['registerBeyondLanguage'] = {'incrementalEta2': o, 'p_permuteWithinLanguage2000': (ge+1)/2001, 'languageLevels': len(set(lang))}
# leave-one-pocket-out
loo = []
for i in range(len(dfn)):
    y = pres[:i]+pres[i+1:]; l = reg[:i]+reg[i+1:]; loo.append((eta2(y, l), dfn[i]['id']))
loo.sort(); C2['leaveOnePocketOut'] = {'min': loo[0], 'max': loo[-1], 'full': C2['register']['eta2']}
# leave-one-register-out / leave-one-group-out with permutation p (500 draws)
lor = {}
for r_ in sorted(set(reg)):
    keep = [i for i in range(len(dfn)) if reg[i] != r_]
    if len(set(reg[i] for i in keep)) < 3: continue
    o, pv = perm_p([pres[i] for i in keep], [reg[i] for i in keep], 500, rng); lor[r_] = {'nDropped': len(dfn)-len(keep), 'eta2': o, 'p500': pv}
C2['leaveOneRegisterOut'] = lor
log = {}
for g_ in sorted(set(grp)):
    keep = [i for i in range(len(dfn)) if grp[i] != g_]
    o, pv = perm_p([pres[i] for i in keep], [reg[i] for i in keep], 500, rng); log[g_] = {'nDropped': len(dfn)-len(keep), 'eta2': o, 'p500': pv}
C2['leaveOneGroupOut'] = log
top3 = [i for i in range(len(dfn)) if reg[i] not in ('code', 'scripture', 'legal')]
o, pv = perm_p([pres[i] for i in top3], [reg[i] for i in top3], 1000, rng); C2['dropCodeScriptureLegal'] = {'n': len(top3), 'nPresent': int(sum(pres[i] for i in top3)), 'eta2': o, 'p1000': pv}
# the same shared-property eta2 for ALL statistics
allst = []
rng2 = random.Random(7)
for j, name in enumerate(ST):
    sel = [q for q in real if q['cells'][j][4] not in ('zundef','nodata')]
    if len(sel) < 100: continue
    y = [1.0 if q['cells'][j][4] in ('P+','P-') else 0.0 for q in sel]
    if sum(y) < 5 or sum(y) > len(y)-5: continue
    l = [q['register'] for q in sel]; o, pv = perm_p(y, l, 300, rng2)
    allst.append({'stat': name, 'n': len(sel), 'nPresent': int(sum(y)), 'eta2Register': o, 'p300': pv})
allst.sort(key=lambda r: -r['eta2Register'])
C2['allStatisticsRegisterEta2'] = {'nStats': len(allst), 'median': sorted(r['eta2Register'] for r in allst)[len(allst)//2], 'rankOfPrefixCopy': [r['stat'] for r in allst].index('para.prefixCopy')+1,
    'nWithP<0.01': sum(1 for r in allst if r['p300'] < 0.01), 'nEta2AtLeast0.31': sum(1 for r in allst if r['eta2Register'] >= 0.3098), 'top10': allst[:10]}
out['C2'] = C2
# ---------------------------------------------------------------- C3 constant
A = {}
for pid in [q['id'] for q in real if q['cells'][I][4] == 'P+']:
    a = json.load(open(f'../atlas/{pid}.json'))['halves']
    d = a['discover']['para.prefixCopy']; c = a['confirm']['para.prefixCopy']
    if None in (d['v'], c['v'], d['nullMean'], c['nullMean']): continue
    A[pid] = {'v': (d['v']+c['v'])/2, 'nm': (d['nullMean']+c['nullMean'])/2}
pp = [q for q in real if q['id'] in A]
vv = [A[q['id']]['v'] for q in pp]; ex = [A[q['id']]['v']-A[q['id']]['nm'] for q in pp]
lr = [math.log(A[q['id']]['v']/A[q['id']]['nm']) if A[q['id']]['nm'] > 0 and A[q['id']]['v'] > 0 else None for q in pp]
ok = [i for i, x in enumerate(lr) if x is not None]
C3 = {'n': len(pp)}
for nm, y, ix in (('v', vv, list(range(len(pp)))), ('excess', ex, list(range(len(pp)))), ('logRatio', lr, ok)):
    row = {}
    for an, key in (('register', 'register'), ('group', 'group'), ('script', 'script')):
        lab = [pp[i][key] for i in ix]; yy = [y[i] for i in ix]; o, pv = perm_p(yy, lab, 2000, rng); row[an] = {'eta2': o, 'omega2': omega2(yy, lab), 'p2000': pv, 'levels': len(set(lab)), 'n': len(ix)}
    srt = sorted(y[i] for i in ix); row['median'] = srt[len(srt)//2]; row['iqrOverMedian'] = (srt[3*len(srt)//4]-srt[len(srt)//4])/abs(srt[len(srt)//2])
    C3[nm] = row
# eta2 of the null mean alone (the chance collision rate of unit openers): how much of the "constant" is the baseline?
nmv = [A[q['id']]['nm'] for q in pp]
C3['nullMean'] = {an: {'eta2': perm_p(nmv, [q[an] for q in pp], 2000, rng)[0]} for an in ('register', 'group', 'script')}
C3['spearman_v_vs_nullMean'] = None
def rank(xs):
    idx = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0]*len(xs); i = 0
    while i < len(idx):
        j = i
        while j+1 < len(idx) and xs[idx[j+1]] == xs[idx[i]]: j += 1
        for k in range(i, j+1): r[idx[k]] = (i+j)/2+1
        i = j+1
    return r
def pearson(a, b):
    n = len(a); ma = sum(a)/n; mb = sum(b)/n
    return sum((x-ma)*(y-mb) for x, y in zip(a, b))/math.sqrt(sum((x-ma)**2 for x in a)*sum((y-mb)**2 for y in b))
C3['spearman_v_vs_nullMean'] = pearson(rank(vv), rank(nmv))
out['C3'] = C3
json.dump(out, open('C_multiplicity.json', 'w'), indent=1)
print(json.dumps({k: out['C1'][k] for k in out['C1'] if k != 'exchangeableTwins'}, indent=0)[:1500])
print('twins', json.dumps(out['C1'].get('exchangeableTwins'), indent=0)[:900])
print('C2', json.dumps({k: C2[k] for k in C2 if k not in ('leaveOneRegisterOut','allStatisticsRegisterEta2')}, indent=0)[:2500])
print('LORO', {k: (v['nDropped'], round(v['eta2'], 3), v['p500']) for k, v in C2['leaveOneRegisterOut'].items()})
print('allstats', {k: v for k, v in C2['allStatisticsRegisterEta2'].items() if k != 'top10'})
print('C3', json.dumps(C3, indent=0)[:2500])
