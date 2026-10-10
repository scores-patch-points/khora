# summarizeA.py -- summarise attack A (size / unit length / tokenisation) from out/A/*.json
import json, math, os, sys, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stats_lib import *
H = os.path.dirname(os.path.abspath(__file__)); M = json.load(open(os.path.join(H, '..', 'atlas-matrix.json'))); S = M['statistics']; si = S.index('para.formulaCov')
meta = {p['id']: p for p in M['pockets'] if p['kind'] == 'real'}
A = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(os.path.join(H, 'out', 'A', '*.json'))}
def cls(c, z4=4.0):  # per-half class from the 30-draw cell
    if c['v'] is None or c['nullMean'] is None: return 'na'
    above_all = c['p'] is not None and c['p'] <= 1/31 + 1e-9
    if c['z'] is not None:
        if c['z'] >= z4: return 'P'
        if abs(c['z']) < 2: return 'A'
        return 'M'
    return 'Pu' if above_all else ('A' if c['v'] <= c['nullMean'] else 'M')   # z undefined: above every null draw -> shifted; else absent-ish
def vstat(var):
    if 'skipped' in var: return None
    cd, cc = cls(var['discover']), cls(var['confirm'])
    if 'na' in (cd, cc): return 'na'
    if cd in ('P', 'Pu') and cc in ('P', 'Pu'): return 'P+strict' if cd == 'P' and cc == 'P' else 'P+shifted'
    if cd == 'A' and cc == 'A': return 'ABSENT'
    return 'AMBIG'
def z10stat(var):  # atlas-style status: z from the first 10 draws
    if 'skipped' in var: return None
    zs = [var[w]['z10'] for w in ('discover', 'confirm')]
    if any(z is None for z in zs): return 'UNDEF'
    if all(z >= 4 for z in zs): return 'P+'
    if all(abs(z) < 2 for z in zs): return 'A'
    return 'M'
out = {'nPockets': len(A)}
variants = sorted({k for a in A.values() for k in a['variants']})
for name in variants:
    rows = []
    for pid, a in A.items():
        var = a['variants'].get(name)
        if var is None or 'skipped' in var: continue
        c = meta[pid]['cells'][si]; rows.append((pid, var, c[4]))
    if not rows: continue
    o = {'applicable': len(rows)}
    for label, sel in (('allReal', lambda r: True), ('atlasPresent', lambda r: r[2] == 'P+'), ('atlasNotPresent', lambda r: r[2] != 'P+')):
        rr = [r for r in rows if sel(r)]; cnt = collections.Counter(vstat(r[1]) for r in rr); c10 = collections.Counter(z10stat(r[1]) for r in rr)
        o[label] = {'n': len(rr), 'ext30': dict(cnt), 'atlasStyle10': dict(c10), 'survive_strict_or_shifted': (cnt['P+strict']+cnt['P+shifted']), 'survive_strict': cnt['P+strict']}
    # numeric: v/nullMean ratio and excess medians over atlas-PRESENT pockets
    def med(xs): xs = sorted(xs); n = len(xs); return None if not n else (xs[n//2] if n % 2 else (xs[n//2-1]+xs[n//2])/2)
    rr = [r for r in rows if r[2] == 'P+']
    vv = [(r[1]['discover']['v']+r[1]['confirm']['v'])/2 for r in rr]; nm = [(r[1]['discover']['nullMean']+r[1]['confirm']['nullMean'])/2 for r in rr if r[1]['discover']['nullMean'] is not None and r[1]['confirm']['nullMean'] is not None]
    o['medianV_atlasPresent'] = med(vv); o['medianNull_atlasPresent'] = med(nm); o['medianMinZ30_defined'] = med([min(r[1]['discover']['z'], r[1]['confirm']['z']) for r in rr if r[1]['discover']['z'] is not None and r[1]['confirm']['z'] is not None])
    # failures listing
    o['failures'] = [(r[0], vstat(r[1])) for r in rr if vstat(r[1]) not in ('P+strict', 'P+shifted')][:60]
    out[name] = o
# class pattern under equal size and equal unit length: eta2 / medians
def classes(name):
    rows = [(pid, a['variants'][name]) for pid, a in A.items() if name in a['variants'] and 'skipped' not in a['variants'][name] and meta[pid]['cells'][si][4] == 'P+']
    rows = [(pid, (v['discover']['v']+v['confirm']['v'])/2, (v['discover']['v']-(v['discover']['nullMean'] or 0)+v['confirm']['v']-(v['confirm']['nullMean'] or 0))/2) for pid, v in rows]
    res = {'n': len(rows)}
    if len(rows) < 30: return res
    for attr in ('group', 'register'):
        for key, ix in (('v', 1), ('excess', 2)):
            obs, p, k = perm_eta2([r[ix] for r in rows], [meta[r[0]][attr] for r in rows], 2000, seed=11); res[f'eta2_{key}_{attr}'] = {'eta2': obs, 'p': p, 'levels': k}
    reg = collections.defaultdict(list)
    for r in rows: reg[meta[r[0]]['register']].append(r[1])
    res['medianV_byRegister'] = {k: {'n': len(v), 'medV': sorted(v)[len(v)//2]} for k, v in sorted(reg.items(), key=lambda kv: -len(kv[1])) if len(v) >= 5}
    # atlas v vs variant v rank agreement across pockets
    av = []; vv = []
    for pid, v, e in rows:
        c = meta[pid]['cells'][si]; av.append((c[0]+c[2])/2); vv.append(v)
    res['spearman_atlasV_vs_variantV'] = spearman(av, vv)
    return res
out['classPattern'] = {name: classes(name) for name in ('size60', 'size60_L8', 'size60_L16', 'size60_L32', 'size30', 'size30_L16')}
json.dump(out, open(os.path.join(H, 'out', 'A_summary.json'), 'w'), indent=1)
for name in variants:
    o = out.get(name)
    if not o: continue
    print(name, 'applicable', o['applicable'], '| atlasPresent n=%d strict=%d shifted=%d surviveAny=%d atlas10=%s' % (o['atlasPresent']['n'], o['atlasPresent']['survive_strict'], o['atlasPresent']['ext30'].get('P+shifted', 0), o['atlasPresent']['survive_strict_or_shifted'], dict(o['atlasPresent']['atlasStyle10'])), '| medV %.3f medNull %.4f' % (o['medianV_atlasPresent'] or 0, o['medianNull_atlasPresent'] or 0), '| failures', len(o['failures']))
for k, v in out['classPattern'].items(): print(k, json.dumps(v)[:900])
