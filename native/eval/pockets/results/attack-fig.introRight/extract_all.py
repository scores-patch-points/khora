# extract_all.py -- all 81 statistics x all non-thin atlas pockets: v, nullMean, z in both halves (from results/atlas/*.json). stdlib only.
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = json.load(open(os.path.join(ROOT, 'results', 'atlas-matrix.json')))
S = M['statistics']
out = {'statistics': S, 'pockets': {}}
for p in M['pockets']:
    if p['thin']: continue
    a = json.load(open(os.path.join(ROOT, 'results', 'atlas', p['id'] + '.json')))
    cells = {}
    for s in S:
        row = []
        for h in ('discover', 'confirm'):
            c = a['halves'].get(h, {}).get(s)
            row += [None, None, None] if not c else [c['v'], c['nullMean'], c['z']]
        cells[s] = row
    out['pockets'][p['id']] = dict(kind=p['kind'], group=p['group'], register=p['register'], language=p['language'], script=p['script'], grain=p['grain'], tokens=p['tokens'], units=p['units'], docs=p['docs'], mul=p['meanUnitLength'], cells=cells)
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'battery.json'), 'w'))
print(len(out['pockets']), 'pockets x', len(S), 'statistics')
