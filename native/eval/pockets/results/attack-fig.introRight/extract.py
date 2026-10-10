# extract.py -- per-pocket table of fig.introRight (and fig.introLeft, introLeftFq) cells from results/atlas/*.json + atlas-matrix.json (stdlib only)
import json, glob, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = json.load(open(os.path.join(ROOT, 'results', 'atlas-matrix.json')))
S = M['statistics']; ix = {s: i for i, s in enumerate(S)}
rows = []
for p in M['pockets']:
    if p['thin']: continue
    a = json.load(open(os.path.join(ROOT, 'results', 'atlas', p['id'] + '.json')))
    r = dict(id=p['id'], kind=p['kind'], group=p['group'], register=p['register'], language=p['language'], script=p['script'], grain=p['grain'],
             tokens=p['tokens'], units=p['units'], docs=p['docs'], mul=p['meanUnitLength'])
    for st in ['fig.introRight', 'fig.introLeft', 'fig.introLeftFq']:
        for h in ['discover', 'confirm']:
            c = a['halves'].get(h, {}).get(st)
            r[st + '.' + h] = c
    r['cells'] = p['cells']
    rows.append(r)
json.dump(dict(statistics=S, rows=rows), open(os.path.join(os.path.dirname(__file__), 'table.json'), 'w'))
print(len(rows), 'pockets (non-thin) written')
