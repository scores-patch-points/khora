# attackC.py -- ATTACK C (multiplicity, shared property, selection). stdlib only; random.Random with fixed seeds (deterministic).
import json, math, os, random, statistics
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
T = json.load(open(os.path.join(HERE, 'table.json')))['rows']
LT = json.load(open(os.path.join(ROOT, 'results', 'law-table.json')))
def status(r, s='fig.introRight'):
    a = r[s + '.discover']; b = r[s + '.confirm']
    if not a or not b or a['v'] is None or b['v'] is None: return 'nodata'
    if a['z'] is None or b['z'] is None: return 'zundef'
    za, zb = a['z'], b['z']
    if abs(za) >= 4 and abs(zb) >= 4 and za * zb > 0: return 'P+' if za > 0 else 'P-'
    if abs(za) < 2 and abs(zb) < 2: return 'A'
    return 'M'
real = [r for r in T if r['kind'] == 'real' and status(r) not in ('nodata', 'zundef')]
ind = [1 if status(r).startswith('P') else 0 for r in real]
print('defined real pockets N =', len(real), ' PRESENT =', sum(ind), ' (+', sum(1 for r in real if status(r) == 'P+'), ' -', sum(1 for r in real if status(r) == 'P-'), ')')
def cats(rows, key):
    m = {}; c = []
    for r in rows: c.append(m.setdefault(str(r[key]), len(m)))
    return c, len(m)
def eta2(y, c, k):
    n = len(y); my = sum(y) / n; sst = sum((v - my) ** 2 for v in y)
    if sst <= 0: return 0.0
    s = [0.0] * k; q = [0] * k
    for v, g in zip(y, c): s[g] += v; q[g] += 1
    return sum(q[g] * (s[g] / q[g] - my) ** 2 for g in range(k) if q[g]) / sst
def perm_p(y, c, k, draws, seed, strata=None):
    rnd = random.Random(seed); obs = eta2(y, c, k); ge = 0
    if strata is None:
        yp = y[:]
        for _ in range(draws):
            rnd.shuffle(yp)
            if eta2(yp, c, k) >= obs - 1e-12: ge += 1
    else:   # permute the indicator within strata (e.g. within group)
        groups = {}
        for i, s in enumerate(strata): groups.setdefault(s, []).append(i)
        for _ in range(draws):
            yp = y[:]
            for idx in groups.values():
                vals = [y[i] for i in idx]; rnd.shuffle(vals)
                for i, v in zip(idx, vals): yp[i] = v
            if eta2(yp, c, k) >= obs - 1e-12: ge += 1
    return obs, (1 + ge) / (1 + draws)
out = {}
y = [float(v) for v in ind]
# (1) reproduce the atlas shared-property rows (2000 draws)
reg, kr = cats(real, 'register'); grp, kg = cats(real, 'group'); scr, ks = cats(real, 'script')
rows = {}
for nm, (c, k) in dict(register=(reg, kr), group=(grp, kg), script=(scr, ks)).items():
    e, p = perm_p(y, c, k, 2000, 11); rows[nm] = dict(eta2=e, p=p, levels=k)
out['reproduce'] = rows; print('(1) reproduce', {k: (round(v['eta2'], 4), v['p']) for k, v in rows.items()})
# expected eta2 under the null (mean of permutations) for context
rnd = random.Random(5); yp = y[:]; ex = []
for _ in range(500): rnd.shuffle(yp); ex.append(eta2(yp, reg, kr))
out['nullEta2Register'] = dict(mean=statistics.mean(ex), sd=statistics.pstdev(ex)); print('   null eta2(register) mean %.3f sd %.3f' % (out['nullEta2Register']['mean'], out['nullEta2Register']['sd']))
# (2) leave-one-pocket-out over the PRESENT pockets (600 draws each): register eta2 and p
loo = []
for i, r in enumerate(real):
    if not ind[i]: continue
    sub = [j for j in range(len(real)) if j != i]; ys = [y[j] for j in sub]; rr = [real[j] for j in sub]; c, k = cats(rr, 'register')
    e, p = perm_p(ys, c, k, 600, 100 + i); loo.append(dict(dropped=r['id'], eta2=e, p=p))
out['leaveOnePocketOut'] = loo
print('(2) LOO-pocket: eta2 range %.3f-%.3f; max p %.4f; n with p>=0.05: %d' % (min(l['eta2'] for l in loo), max(l['eta2'] for l in loo), max(l['p'] for l in loo), sum(1 for l in loo if l['p'] >= 0.05)))
# (3) leave-one-register-out for every register with >= 1 PRESENT pocket, and drop code+diagram together
def drop_regs(regs, draws=1000, seed=7):
    sub = [j for j in range(len(real)) if real[j]['register'] not in regs]; ys = [y[j] for j in sub]; rr = [real[j] for j in sub]; c, k = cats(rr, 'register')
    if sum(ys) < 2: return dict(n=len(sub), present=int(sum(ys)), eta2=None, p=None)
    e, p = perm_p(ys, c, k, draws, seed); return dict(n=len(sub), present=int(sum(ys)), eta2=e, p=p)
lor = {}
for rg in sorted({r['register'] for i, r in enumerate(real) if ind[i]}): lor[rg] = drop_regs({rg})
lor['code+diagram'] = drop_regs({'code', 'diagram'}); lor['code+diagram+markup+notation+config'] = drop_regs({'code', 'diagram', 'markup', 'notation', 'config'})
out['leaveOneRegisterOut'] = lor
print('(3) leave-register-out (eta2, p, present left):')
for k, v in lor.items(): print('    -%-38s n=%3d present=%2d eta2=%s p=%s' % (k, v['n'], v['present'], None if v['eta2'] is None else round(v['eta2'], 3), v['p']))
# (4) register beyond group: permute the indicator within group
e, p = perm_p(y, reg, kr, 2000, 21, strata=grp); out['registerWithinGroup'] = dict(eta2=e, p=p); print('(4) register eta2 under within-GROUP permutation: eta2 %.3f p %.4f' % (e, p))
# within the cd group only
cd = [j for j, r in enumerate(real) if r['group'] == 'cd']; yc = [y[j] for j in cd]; c, k = cats([real[j] for j in cd], 'register'); e, p = perm_p(yc, c, k, 2000, 22)
out['registerWithinCdOnly'] = dict(n=len(cd), present=int(sum(yc)), eta2=e, p=p); print('    cd group only (n=%d, present=%d): eta2 %.3f p %.4f' % (len(cd), sum(yc), e, p))
# outside cd: any shared property left?
nc = [j for j, r in enumerate(real) if r['group'] != 'cd']; yn = [y[j] for j in nc]; c, k = cats([real[j] for j in nc], 'register'); e, p = perm_p(yn, c, k, 2000, 23)
out['registerOutsideCd'] = dict(n=len(nc), present=int(sum(yn)), eta2=e, p=p); print('    outside cd (n=%d, present=%d): eta2 %.3f p %.4f' % (len(nc), sum(yn), e, p))
# (5) sign split among PRESENT: register eta2 + LOO + what sign does 'code' carry
pr = [r for i, r in enumerate(real) if ind[i]]; ys = [1.0 if status(r) == 'P+' else 0.0 for r in pr]; c, k = cats(pr, 'register'); e, p = perm_p(ys, c, k, 2000, 31)
out['signSplit'] = dict(n=len(pr), pos=int(sum(ys)), eta2=e, p=p, levels=k); print('(5) sign split register eta2 %.3f p %.4f (levels %d)' % (e, p, k))
sl = []
for i in range(len(pr)):
    sub = [j for j in range(len(pr)) if j != i]; c2, k2 = cats([pr[j] for j in sub], 'register'); e2, p2 = perm_p([ys[j] for j in sub], c2, k2, 600, 300 + i); sl.append(dict(dropped=pr[i]['id'], eta2=e2, p=p2))
out['signSplitLOO'] = sl; print('    sign-split LOO: eta2 %.3f-%.3f, max p %.4f, #p>=0.05 %d' % (min(l['eta2'] for l in sl), max(l['eta2'] for l in sl), max(l['p'] for l in sl), sum(1 for l in sl if l['p'] >= 0.05)))
codes = [r for r in pr if r['register'] == 'code']; print('    PRESENT code pockets: +%d -%d (%s)' % (sum(1 for r in codes if status(r) == 'P+'), sum(1 for r in codes if status(r) == 'P-'), ','.join(r['id'] + status(r)[1] for r in codes if status(r) == 'P-')))
# (6) selection: heterogeneity rank. Statistic = IQR(v among PRESENT)/median|v|; replicate for the 33 eligible from the law table and test a sign-free version IQR(|v|)/median|v|
B = json.load(open(os.path.join(HERE, 'battery.json'))); P = B['pockets']
def qt(xs, q):
    xs = sorted(xs); h = (len(xs) - 1) * q; lo = int(math.floor(h)); hi = min(lo + 1, len(xs) - 1); return xs[lo] + (xs[hi] - xs[lo]) * (h - lo)
el = [s for s in LT['selection']['specificCandidatesAll'] if s['eligible']]
print('(6) eligible statistics in the atlas selection:', len(el))
het = []
for s in el:
    st = s['stat']; vs = []; vabs = []
    for pid, p in P.items():
        if p['kind'] != 'real': continue
        vD, nD, zD, vC, nC, zC = p['cells'][st]
        if None in (vD, vC, zD, zC): continue
        if abs(zD) >= 4 and abs(zC) >= 4 and zD * zC > 0: vs.append((vD + vC) / 2)
    if len(vs) < 3: continue
    md = statistics.median([abs(v) for v in vs]); h = (qt(vs, .75) - qt(vs, .25)) / md; ha = (qt([abs(v) for v in vs], .75) - qt([abs(v) for v in vs], .25)) / md
    sgn = (sum(1 for v in vs if v > 0), sum(1 for v in vs if v < 0))
    het.append(dict(stat=st, het=h, hetAbs=ha, nPresent=len(vs), pos=sgn[0], neg=sgn[1], atlasHet=s['heterogeneity']))
het.sort(key=lambda d: -d['het']); [d.__setitem__('rank', i + 1) for i, d in enumerate(het)]
byabs = sorted(het, key=lambda d: -d['hetAbs']); [d.__setitem__('rankAbs', i + 1) for i, d in enumerate(byabs)]
out['heterogeneity'] = het
for d in het[:5] + [d for d in het if d['stat'] == 'fig.introRight' and d['rank'] > 5]:
    print('    %-18s het %.3f (atlas %.3f) rank %2d | sign-free het %.3f rank %2d | present %d (+%d -%d)' % (d['stat'], d['het'], d['atlasHet'], d['rank'], d['hetAbs'], d['rankAbs'], d['nPresent'], d['pos'], d['neg']))
# sign-balance: correlation of heterogeneity with min(pos,neg)/(pos+neg)
bal = [min(d['pos'], d['neg']) / (d['pos'] + d['neg']) for d in het]; hs = [d['het'] for d in het]
def rk(xs):
    o = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0] * len(xs)
    for a, i in enumerate(o): r[i] = a
    return r
def sp(a, b):
    ra, rb = rk(a), rk(b); n = len(a); ma = sum(ra) / n; mb = sum(rb) / n
    return sum((x - ma) * (y_ - mb) for x, y_ in zip(ra, rb)) / math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y_ - mb) ** 2 for y_ in rb))
out['hetVsSignBalanceRho'] = sp(bal, hs); print('    Spearman rho(heterogeneity, sign-balance) over %d eligible statistics: %.2f' % (len(het), out['hetVsSignBalanceRho']))
# (7) cell counts and false-PRESENT references
FP = LT['falsePresent']; out['cells'] = dict(definedRealCells=FP['nDefinedRealCells'], observedPresentRealCells=FP['observedPresentRealCells'], plantedIid=FP['plantedIid'], controls=FP['controls'], binomial=FP['binomialReference'])
nreal = sum(1 for r in T if r['kind'] == 'real'); print('(7) real non-thin pockets %d x 81 statistics = %d cell slots; defined real cells %d; observed PRESENT cells %d; binomial false-PRESENT reference mean %.2f sd %.2f over all cells -> for ONE statistic (N=384): %.3f' % (nreal, nreal * 81, FP['nDefinedRealCells'], FP['observedPresentRealCells'], FP['binomialReference']['mean'], FP['binomialReference']['sd'], 384 * FP['binomialReference']['p']))
ctz = []
for r in T:
    if r['kind'] == 'control':
        for h in ('discover', 'confirm'):
            c = r['fig.introRight.' + h]
            if c and c['z'] is not None: ctz.append(c['z'])
sd = statistics.pstdev(ctz); out['controlsIntroRight'] = dict(n=len(ctz), sdZ=sd, absGe2=sum(1 for z in ctz if abs(z) >= 2), absGe4=sum(1 for z in ctz if abs(z) >= 4))
print('    law-free shuffled controls, introRight z: n=%d sd=%.2f  |z|>=2: %d  |z|>=4: %d' % (len(ctz), sd, out['controlsIntroRight']['absGe2'], out['controlsIntroRight']['absGe4']))
json.dump(out, open(os.path.join(HERE, 'C_multiplicity.json'), 'w'), indent=1)
