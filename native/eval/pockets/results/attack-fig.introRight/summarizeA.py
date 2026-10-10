# summarizeA.py -- summarise A_tok / A_size / A_match JSON (present31 and absent controls) into A_summary.json and a text table. stdlib only.
import json, os, statistics, collections
HERE = os.path.dirname(os.path.abspath(__file__))
T = {r['id']: r for r in json.load(open(os.path.join(HERE, 'table.json')))['rows']}
def load(n):
    p = os.path.join(HERE, n); return json.load(open(p)) if os.path.exists(p) else {}
sgn = lambda x: 0 if x is None else (1 if x > 0 else -1 if x < 0 else 0)
def reg(i): return T[i]['register']
S = {}
# ---- tokenisation
tok = load('A_tok.json'); S['tok'] = {}
print('== TOKENISATION (full pocket, atlas halves, 10 draws): status/d per variant; survive = same P sign AND d within [0.5,2] x baseline')
cnt = collections.defaultdict(lambda: [0, 0, 0])
for i, r in tok.items():
    b = r['atlasD']; row = {}
    for t, v in r['variants'].items():
        ok_status = v['status'] == T[i].get('status', None) if False else None
        row[t] = dict(status=v['status'], d=v['d'], zD=v['zD'], zC=v['zC'])
    S['tok'][i] = dict(atlasD=b, variants=row)
    base_sign = 1 if b > 0 else -1
    line = []
    for t, v in row.items():
        pres = v['status'] in ('P+', 'P-') and (1 if v['status'] == 'P+' else -1) == base_sign
        ratio = v['d'] / b if (v['d'] is not None and b) else None
        surv = pres and ratio is not None and 0.5 <= ratio <= 2
        line.append('%s:%s%s r%.2f' % (t, v['status'], '*' if surv else ' ', ratio if ratio is not None else float('nan')))
        if t != 'T0':
            cnt[t][0] += 1; cnt[t][1] += 1 if pres else 0; cnt[t][2] += 1 if surv else 0
    print('%-24s %-9s d0 %+.3f | %s' % (i, reg(i), b, ' | '.join(line)))
print('survival by variant (n, kept P sign, kept P sign and d within [0.5,2]x):', {t: tuple(v) for t, v in cnt.items()})
S['tokSurvival'] = {t: dict(n=v[0], keptPresent=v[1], survives=v[2]) for t, v in cnt.items()}
# by class
for cls, regs in (('code', ('code',)), ('diagram', ('diagram',)), ('other-cd', ('markup', 'notation')), ('natural', ('history', 'treatise', 'translation', 'legal', 'book', 'lexicon', 'sms'))):
    sub = [i for i in tok if reg(i) in regs]
    if not sub: continue
    for t in ('T1', 'T2', 'T3', 'T4'):
        n = len(sub); k = 0
        for i in sub:
            b = tok[i]['atlasD']; v = tok[i]['variants'][t]; ratio = v['d'] / b if v['d'] is not None else None
            if v['status'] in ('P+', 'P-') and (1 if v['status'] == 'P+' else -1) == (1 if b > 0 else -1) and ratio and 0.5 <= ratio <= 2: k += 1
        print('   class %-9s %s: %d of %d survive' % (cls, t, k, n))
# ---- size
size = load('A_size.json'); S['size'] = {}
print('\n== SIZE (equal-token whole-document subsamples; mean over 4 reps of d, z; ratio to atlas d)')
for i, r in size.items():
    b = r['atlasD']; row = {}
    for B, reps in r['B'].items():
        ds = [x['d'] for x in reps if x['d'] is not None]; zs = [(x['zD'], x['zC']) for x in reps]
        row[B] = dict(meanD=statistics.mean(ds) if ds else None, ratio=(statistics.mean(ds) / b if ds and b else None), sameSign=sum(1 for d in ds if sgn(d) == sgn(b)), n=len(ds),
                      nP=sum(1 for x in reps if x['status'] in ('P+', 'P-') and (1 if x['status'] == 'P+' else -1) == sgn(b)), meanZ=(statistics.mean([z[0] for z in zs if z[0] is not None]) if zs else None))
    S['size'][i] = dict(atlasD=b, tokens=r['tokens'], B=row)
    print('%-24s %-9s d0 %+.3f tok %6d | %s' % (i, reg(i), b, r['tokens'], ' | '.join('%dk: r%.2f same%d/%d P%d' % (int(B) // 1000, v['ratio'], v['sameSign'], v['n'], v['nP']) for B, v in row.items())))
# ---- match
match = load('A_match.json'); S['match'] = {}
print('\n== MATCHED (equal tokens ~32k AND equal unit-length histogram; 6 reps)')
tg = match.get('_target'); print('target', tg and (tg['meanUnitLength'], tg['nominalUnits']))
nf = 0
for i, r in match.items():
    if i.startswith('_'): continue
    b = r['atlasD']
    if not r['feasible']:
        S['match'][i] = dict(atlasD=b, feasible=False, scale=r['scale']); nf += 1; print('%-24s %-9s INFEASIBLE (scale %.2f)' % (i, reg(i), r['scale'])); continue
    ds = [x['d'] for x in r['reps'] if x['d'] is not None]; ps = [x['status'] for x in r['reps']]
    S['match'][i] = dict(atlasD=b, feasible=True, meanD=statistics.mean(ds), sdD=statistics.pstdev(ds), ratio=statistics.mean(ds) / b, sameSign=sum(1 for d in ds if sgn(d) == sgn(b)), n=len(ds), statuses=ps, tokens=r['reps'][0]['tokens'], meanUL=r['reps'][0]['meanUL'])
    print('%-24s %-9s d0 %+.3f | matched d %+.3f sd %.3f ratio %.2f same %d/%d | %s' % (i, reg(i), b, S['match'][i]['meanD'], S['match'][i]['sdD'], S['match'][i]['ratio'], S['match'][i]['sameSign'], len(ds), ','.join(ps)))
json.dump(S, open(os.path.join(HERE, 'A_summary.json'), 'w'), indent=1)
