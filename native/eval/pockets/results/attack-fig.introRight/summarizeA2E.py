# summarizeA2E.py -- summary of A2 (unit-length decomposition, F12, LONG, F12B, TH, FC) and E (introduction specificity on real pockets). stdlib only.
import json, os, statistics, math
HERE = os.path.dirname(os.path.abspath(__file__))
T = {r['id']: r for r in json.load(open(os.path.join(HERE, 'table.json')))['rows']}
ld = lambda n: json.load(open(os.path.join(HERE, n))) if os.path.exists(os.path.join(HERE, n)) else {}
A2 = ld('A2.json'); A2c = ld('A2_ctl.json'); E = ld('E.json'); Ec = ld('E_ctl.json')
sgn = lambda x: 1 if x > 0 else -1
mean = lambda xs: sum(xs) / len(xs) if xs else None
S = {}
print('== A2: d (half-avg excess over the within-unit null). base | decomposition by unit length class (token share) | F12 (units<=12, full) | LONG (units>=13) | F12B (<=12 + 32k whole docs) | TH (random unit thinning to 32k, natural lengths) | FC (cap giving mean UL~4.0, 32k whole docs)')
rows = []
for i, r in A2.items():
    b = r['base']['d']; dec = ' '.join('%s(%.2f)' % ('NA' if x['d'] is None else '%+.2f' % x['d'], x['tokenShare']) for x in r['decomp'])
    f12 = r['F12']['d']; lg = r['LONG']['d'] if r['LONG'] else None; f12b = mean([x['d'] for x in r['F12B'] if x['d'] is not None]); th = mean([x['d'] for x in r['TH'] if x['d'] is not None]); fc = mean([x['d'] for x in r['FC']['reps'] if x['d'] is not None]) if r['FC']['reps'] else None
    fz = (r['F12']['zD'], r['F12']['zC'])
    S[i] = dict(base=b, decomp=[x['d'] for x in r['decomp']], share=[x['tokenShare'] for x in r['decomp']], F12=f12, F12z=fz, LONG=lg, F12B=f12b, TH=th, FC=fc, FCcap=r['FC']['cap'], FCul=r['FC']['meanUL'], FCtokens=r['FC']['tokens'])
    fmt = lambda x: 'NA' if x is None else '%+.3f' % x
    print('%-24s %-8s base %+.3f | %s | F12 %s | LONG %s | F12B %s | TH %s | FC(c%d,ul%.1f) %s' % (i, T[i]['register'][:8], b, dec, fmt(f12), fmt(lg), fmt(f12b), fmt(th), fmt(fc) if False else fmt(fc), r['FC']['cap'], r['FC']['meanUL'], '') if False else '%-24s %-8s base %+.3f | %s | F12 %s | LONG %s | F12B %s | TH %s | FC(c%d,ul%.1f) %s' % (i, T[i]['register'][:8], b, dec, fmt(f12), fmt(lg), fmt(f12b), fmt(th), r['FC']['cap'], r['FC']['meanUL'], fmt(fc)))
def rat(x, b): return None if x is None or not b else x / b
def survive(x, b, lo=0.5): return x is not None and sgn(x) == sgn(b) and abs(x) >= lo * abs(b)
print()
groups = {'code (13)': [i for i in A2 if T[i]['register'] == 'code'], 'diagram (5)': [i for i in A2 if T[i]['register'] == 'diagram'], 'notation/markup (3)': [i for i in A2 if T[i]['register'] in ('notation', 'markup')], 'natural/other (10)': [i for i in A2 if T[i]['register'] not in ('code', 'diagram', 'notation', 'markup')]}
for g, ids in groups.items():
    for key in ('F12', 'F12B', 'TH', 'FC'):
        n = sum(1 for i in ids if S[i][key] is not None); k = sum(1 for i in ids if survive(S[i][key], S[i]['base']))
        print('  %-20s %-5s: retain sign and >= 0.5 x |d| in %d of %d' % (g, key, k, n))
S['_groups'] = {g: {key: [sum(1 for i in ids if survive(S[i][key], S[i]['base'])), sum(1 for i in ids if S[i][key] is not None)] for key in ('F12', 'F12B', 'TH', 'FC')} for g, ids in groups.items()}
# controls: do the A2 designs create spurious d in ABSENT pockets?
print('\n== A2 controls (ABSENT pockets): |d| under each design (should stay ~ 0)')
for i, r in A2c.items():
    if r['F12']['d'] is None or r['base']['d'] is None: print(i, 'NA'); continue
    print('%-22s base %+.3f F12 %+.3f F12B %s TH %s FC %s' % (i, r['base']['d'], r['F12']['d'], 'NA' if not [x for x in r['F12B'] if x['d'] is not None] else '%+.3f' % mean([x['d'] for x in r['F12B'] if x['d'] is not None]), 'NA' if not [x for x in r['TH'] if x['d'] is not None] else '%+.3f' % mean([x['d'] for x in r['TH'] if x['d'] is not None]), 'NA' if not [x for x in r['FC']['reps'] if x['d'] is not None] else '%+.3f' % mean([x['d'] for x in r['FC']['reps'] if x['d'] is not None])))
# ---- E
print('\n== E: introduction specificity. ratio = d(2nd occurrence)/d(1st); fs = first-vs-second paired contrast (z both halves)')
def rho(a, b):
    def rk(xs):
        o = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
        while i < len(o):
            j = i
            while j + 1 < len(o) and xs[o[j + 1]] == xs[o[i]]: j += 1
            for k in range(i, j + 1): r[o[k]] = (i + j) / 2
            i = j + 1
        return r
    ra, rb = rk(a), rk(b); n = len(a); ma = sum(ra) / n; mb = sum(rb) / n
    return sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))
ES = {}
ids = list(E)
for i in ids:
    r = E[i]; d1 = r['d1']['d']; d2 = r['d2']['d']; d3 = r['d3']['d']; fs = r['fs']
    ES[i] = dict(d1=d1, d2=d2, d3=d3, ratio2=rat(d2, d1), ratio3=rat(d3, d1), fs=fs['d'], fsz=[fs['zD'], fs['zC']], dose=[r[k]['d'] for k in ('c2', 'c34', 'c58', 'c916', 'c17')])
    print('%-24s %-8s d1 %+.3f d2 %+.3f (r %.2f) d3 %+.3f (r %.2f) | fs %+.3f z %s/%s | dose(2,3-4,5-8,9-16,17+) %s' % (i, T[i]['register'][:8], d1, d2, rat(d2, d1), d3, rat(d3, d1), fs['d'], 'NA' if fs['zD'] is None else '%.1f' % fs['zD'], 'NA' if fs['zC'] is None else '%.1f' % fs['zC'], ' '.join('NA' if x is None else '%+.2f' % x for x in ES[i]['dose'])))
ok = [i for i in ids if ES[i]['d2'] is not None and ES[i]['d1']]
print('median ratio d2/d1 over %d PRESENT pockets: %.2f (IQR %.2f..%.2f); share with ratio in [0.7, 1.3]: %d' % (len(ok), statistics.median([ES[i]['ratio2'] for i in ok]), sorted([ES[i]['ratio2'] for i in ok])[len(ok) // 4], sorted([ES[i]['ratio2'] for i in ok])[3 * len(ok) // 4], sum(1 for i in ok if 0.7 <= ES[i]['ratio2'] <= 1.3)))
print('Spearman rho(d1, d2) over the PRESENT pockets: %.3f  (R^2 of ranks %.3f)' % (rho([ES[i]['d1'] for i in ok], [ES[i]['d2'] for i in ok]), rho([ES[i]['d1'] for i in ok], [ES[i]['d2'] for i in ok]) ** 2))
fsz = [i for i in ids if ES[i]['fsz'][0] is not None and ES[i]['fsz'][1] is not None and abs(ES[i]['fsz'][0]) >= 4 and abs(ES[i]['fsz'][1]) >= 4 and ES[i]['fsz'][0] * ES[i]['fsz'][1] > 0]
print('first-vs-second contrast PRESENT (|z|>=4 both halves, same sign) in %d of %d pockets: %s' % (len(fsz), len(ids), fsz))
# ctl
okc = [i for i in Ec if Ec[i]['d2']['d'] is not None and Ec[i]['d1']['d'] is not None]
S['E'] = ES; S['E_nOk'] = len(ok); S['E_fsPresent'] = fsz
S['E_rho12'] = rho([ES[i]['d1'] for i in ok], [ES[i]['d2'] for i in ok])
# all 54 pockets pooled rho
allp = {**{i: E[i] for i in E}, **{i: Ec[i] for i in Ec}}
pp = [i for i in allp if allp[i]['d1']['d'] is not None and allp[i]['d2']['d'] is not None]
S['E_rho12_all54'] = rho([allp[i]['d1']['d'] for i in pp], [allp[i]['d2']['d'] for i in pp]); S['E_n_all'] = len(pp)
print('Spearman rho(d1, d2) over all %d cached pockets (31 PRESENT + ABSENT controls): %.3f; Pearson r %.3f' % (len(pp), S['E_rho12_all54'], (lambda a, b: sum((x - sum(a) / len(a)) * (y - sum(b) / len(b)) for x, y in zip(a, b)) / math.sqrt(sum((x - sum(a) / len(a)) ** 2 for x in a) * sum((y - sum(b) / len(b)) ** 2 for y in b)))([allp[i]['d1']['d'] for i in pp], [allp[i]['d2']['d'] for i in pp])))
json.dump(S, open(os.path.join(HERE, 'A2E_summary.json'), 'w'), indent=1)
