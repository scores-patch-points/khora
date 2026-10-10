# finalize.py -- collect the headline numbers of the attack on para.formulaCov from out/*.json into out/attack-summary.json
import json, os, glob, collections, math
H = os.path.dirname(os.path.abspath(__file__)); J = lambda n: json.load(open(os.path.join(H, 'out', n)))
M = json.load(open(os.path.join(H, '..', 'atlas-matrix.json'))); S = M['statistics']; si = S.index('para.formulaCov')
meta = {p['id']: p for p in M['pockets'] if p['kind'] == 'real'}
A = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(os.path.join(H, 'out', 'A', '*.json'))}
def med(xs): xs = sorted(xs); n = len(xs); return None if not n else (xs[n//2] if n % 2 else (xs[n//2-1]+xs[n//2])/2)
PROSE = {'novel', 'treatise', 'memoir', 'essay', 'history', 'children', 'reportage', 'biography'}
out = {}
# --- A: code / prose factor (median of mean-of-halves v and of excess among atlas-PRESENT pockets) in each design
def vals(name):
    rows = []
    for pid, a in A.items():
        if meta[pid]['cells'][si][4] != 'P+': continue
        if name == 'atlas': c = meta[pid]['cells'][si]; ex = None; v = (c[0]+c[2])/2
        else:
            var = a['variants'].get(name)
            if not var or 'skipped' in var: continue
            v = (var['discover']['v']+var['confirm']['v'])/2; ex = (var['discover']['v']-(var['discover']['nullMean'] or 0)+var['confirm']['v']-(var['confirm']['nullMean'] or 0))/2
        rows.append((meta[pid]['register'], v, ex))
    return rows
fac = {}
for name in ('atlas', 'size60', 'size60_L8', 'size60_L16', 'size60_L32', 'size30', 'size30_L16', 'full_dedupe'):
    r = vals(name); code = [x[1] for x in r if x[0] == 'code']; pr = [x[1] for x in r if x[0] in PROSE]
    d = {'nCode': len(code), 'nProse': len(pr), 'medianCode': med(code), 'medianProse': med(pr), 'factorV': med(code)/med(pr) if code and pr and med(pr) else None}
    if name != 'atlas':
        ce = [x[2] for x in r if x[0] == 'code']; pe = [x[2] for x in r if x[0] in PROSE]; d['factorExcess'] = med(ce)/med(pe) if ce and pe and med(pe) else None
    fac[name] = d
out['A_codeOverProse'] = fac
# list of ABSENT / AMBIG pockets per design (all real)
def cls(c):
    if c['v'] is None or c['nullMean'] is None: return 'na'
    if c['z'] is not None: return 'P' if c['z'] >= 4 else ('A' if abs(c['z']) < 2 else 'M')
    return 'Pu' if (c['p'] is not None and c['p'] <= 1/31+1e-9) else ('A' if c['v'] <= c['nullMean'] else 'M')
lst = {}
for name in ('size30', 'size60', 'size60_L16'):
    bad = []
    for pid, a in A.items():
        var = a['variants'].get(name)
        if not var or 'skipped' in var: continue
        cd, cc = cls(var['discover']), cls(var['confirm'])
        if not (cd in ('P', 'Pu') and cc in ('P', 'Pu')): bad.append({'id': pid, 'register': meta[pid]['register'], 'tokens': meta[pid]['tokens'], 'class': ('ABSENT' if cd == 'A' and cc == 'A' else 'AMBIG'), 'v': [var['discover']['v'], var['confirm']['v']]})
    lst[name] = {'n': len(bad), 'items': bad}
out['A_notPresentListed'] = lst
# --- D
D = J('D.json'); byw = collections.defaultdict(list)
for r in D: byw[r['world']].append(r)
iid = [w for w in byw if w.startswith('iid')]; order = [w for w in byw if not w.startswith('iid')]
hc = [z for w in iid for r in byw[w] for z in r['z10'] if z is not None]
out['D'] = {'iidWorlds': len(iid), 'iidReps': sum(len(byw[w]) for w in iid), 'iidDefinedHalfCells': len(hc), 'iidHalfCellsAbsZge4': sum(1 for z in hc if abs(z) >= 4), 'iidPresentPlus_reps': sum(1 for w in iid for r in byw[w] if r['status10'] == 'P+'),
  'iidUndefinedReps': sum(1 for w in iid for r in byw[w] if r['status10'] == 'UNDEF'), 'iidVrange': [min((r['discover']['v']+r['confirm']['v'])/2 for w in iid for r in byw[w]), max((r['discover']['v']+r['confirm']['v'])/2 for w in iid for r in byw[w])],
  'iid_v_by_world': {w: sorted(round((r['discover']['v']+r['confirm']['v'])/2, 4) for r in byw[w]) for w in iid},
  'orderWorlds_status10': {w: [r['status10'] for r in byw[w]] for w in order}, 'orderWorlds_minZ10': {w: min(min(z for z in r['z10'] if z is not None) for r in byw[w]) for w in order}}
# --- timing
out['timeFamilies'] = J('time_families.json')
for n, k in (('B_rival.json', 'B'), ('B2.json', 'B2'), ('C1_constant.json', 'C1'), ('C2_multiplicity.json', 'C2'), ('C3_notPresent.json', 'C3'), ('E_summary.json', 'E'), ('A_summary.json', 'A')): out[k+'_file'] = n
json.dump(out, open(os.path.join(H, 'out', 'attack-summary.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in out.items() if not k.endswith('_file')}, indent=0)[:6500])
