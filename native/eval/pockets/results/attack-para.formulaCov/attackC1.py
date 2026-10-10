# attackC1.py -- constant-varies decomposition: is the class-specific constant a property of the LAW (excess over the within-unit null) or of the NULL (nullMean = lexicon concentration)?
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stats_lib import *
H = os.path.dirname(os.path.abspath(__file__)); AT = os.path.join(H, '..', 'atlas')
M = json.load(open(os.path.join(H, '..', 'atlas-matrix.json'))); S = M['statistics']; si = S.index('para.formulaCov')
R = [p for p in M['pockets'] if p['kind'] == 'real' and p['cells'][si][4] == 'P+']
rows = []
for p in R:
    a = json.load(open(os.path.join(AT, p['id']+'.json'))); c = [a['halves'][h]['para.formulaCov'] for h in ('discover', 'confirm')]
    v = (c[0]['v']+c[1]['v'])/2; nm = (c[0]['nullMean']+c[1]['nullMean'])/2
    rows.append({'id': p['id'], 'group': p['group'], 'register': p['register'], 'script': p['script'], 'tokens': p['tokens'], 'ul': p['meanUnitLength'], 'v': v, 'nullMean': nm, 'excess': v-nm, 'ratio': v/nm if nm > 0 else None, 'z': min(c[0]['z'], c[1]['z'])})
out = {'n': len(rows)}
def E(key, rs=rows):
    res = {}
    for attr in ('group', 'register', 'script'):
        obs, p, k = perm_eta2([r[key] for r in rs], [r[attr] for r in rs], 2000, seed=7); res[attr] = {'eta2': obs, 'p': p, 'levels': k}
    return res
for key in ('v', 'nullMean', 'excess'): out['eta2_'+key] = E(key)
rr = [r for r in rows if r['ratio'] is not None]
out['eta2_logratio'] = E('ratio', [dict(r, ratio=math.log(r['ratio'])) for r in rr]); out['n_ratio'] = len(rr)
out['eta2_logv'] = E('v', [dict(r, v=math.log(r['v'])) for r in rows if r['v'] > 0])
# how much of the v pattern is the null's? rank R2 of v on nullMean (alone, and with size+length)
v = [r['v'] for r in rows]; nm = [r['nullMean'] for r in rows]; lt = [math.log(r['tokens']) for r in rows]; ul = [r['ul'] for r in rows]
out['spearman_v_nullMean'] = spearman(v, nm); out['partial_v_nullMean_given_size_len'] = partial_spearman(v, nm, [lt, ul])
out['R2rank_v_on_nullMean'] = r2_rank(v, [nm]); out['R2rank_v_on_nullMean_size_len'] = r2_rank(v, [nm, lt, ul])
ex = [r['excess'] for r in rows]; out['spearman_excess_nullMean'] = spearman(ex, nm); out['R2rank_excess_on_nullMean_size_len'] = r2_rank(ex, [nm, lt, ul])
# class medians of v, nullMean, excess, ratio (registers with n>=5)
def med(xs): xs = sorted(xs); n = len(xs); return xs[n//2] if n % 2 else (xs[n//2-1]+xs[n//2])/2
reg = {}
for r in rows: reg.setdefault(r['register'], []).append(r)
out['byRegister'] = {k: {'n': len(x), 'medV': med([r['v'] for r in x]), 'medNull': med([r['nullMean'] for r in x]), 'medExcess': med([r['excess'] for r in x]), 'medRatio': med([r['ratio'] for r in x if r['ratio'] is not None]) if any(r['ratio'] for r in x) else None, 'medLogZ': med([math.log10(max(r['z'], 1e-9)) for r in x])} for k, x in sorted(reg.items(), key=lambda kv: -len(kv[1])) if len(x) >= 5}
# eta2 corrections: levels with n>=5 only, epsilon^2 (adjusted) for register
def eps2(vals, labels):
    n = len(vals); e, k = eta2(vals, labels); return 1-(1-e)*(n-1)/(n-k)
big = [r for r in rows if len(reg[r['register']]) >= 5]
out['register_n>=5'] = {'n': len(big), 'levels': len({r['register'] for r in big}), 'eta2_v': eta2([r['v'] for r in big], [r['register'] for r in big])[0], 'eps2_v': eps2([r['v'] for r in big], [r['register'] for r in big]), 'eta2_excess': eta2([r['excess'] for r in big], [r['register'] for r in big])[0], 'eps2_excess': eps2([r['excess'] for r in big], [r['register'] for r in big]), 'eta2_nullMean': eta2([r['nullMean'] for r in big], [r['register'] for r in big])[0]}
# singleton / small register levels in the published eta2(register)=0.67
out['register_level_sizes'] = sorted([len(x) for x in reg.values()], reverse=True)
out['eps2_all_register_v'] = eps2([r['v'] for r in rows], [r['register'] for r in rows]); out['eps2_all_group_v'] = eps2([r['v'] for r in rows], [r['group'] for r in rows])
json.dump(out, open(os.path.join(H, 'out', 'C1_constant.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != 'byRegister'}, indent=1)[:3500]); print(json.dumps(out['byRegister'], indent=0)[:2500])
