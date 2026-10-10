# summarizeF.py -- the 149 non-PRESENT real pockets with 200 within-unit draws per half
import json, os, glob, collections
H = os.path.dirname(os.path.abspath(__file__)); M = json.load(open(os.path.join(H, '..', 'atlas-matrix.json'))); S = M['statistics']; si = S.index('para.formulaCov')
meta = {p['id']: p for p in M['pockets'] if p['kind'] == 'real'}
F = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(os.path.join(H, 'out', 'F', '*.json'))}
def cls(c):
    if c.get('nullMean') is None or c['v'] is None: return 'na'
    if c['v'] == 0 and c['nullMean'] == 0: return 'ZERO'
    if c['ge'] == 0: return 'above-all'          # v above every one of 200 null draws: exact one-sided p <= 1/201
    if c['p'] <= 0.05: return 'p<=0.05'
    return 'not-above'
cnt = collections.Counter(); rows = []
for pid, r in F.items():
    a, b = cls(r['halves']['discover']), cls(r['halves']['confirm'])
    key = ('above-all' if a == 'above-all' and b == 'above-all' else ('ZERO,ZERO' if a == 'ZERO' and b == 'ZERO' else ('present-ish(p<=.05 both)' if a in ('above-all', 'p<=0.05') and b in ('above-all', 'p<=0.05') else 'other')))
    cnt[key] += 1
    if key in ('ZERO,ZERO', 'other'): rows.append({'id': pid, 'register': meta[pid]['register'], 'tokens': meta[pid]['tokens'], 'halves': [a, b], 'v': [r['halves']['discover']['v'], r['halves']['confirm']['v']]})
out = {'n': len(F), 'counts': dict(cnt), 'notAboveOrZero': rows}
# 1/201 floor: at p = 1/201 per half the chance of both halves under null is 2.5e-5; expected false 'above-all both' among n pockets
out['expectedFalseAboveAllBothHalves_underNull'] = len(F) * (1/201)**2
json.dump(out, open(os.path.join(H, 'out', 'F_summary.json'), 'w'), indent=1); print(json.dumps(out, indent=0)[:3500])
