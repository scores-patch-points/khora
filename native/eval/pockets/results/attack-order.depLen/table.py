# table.py -- per-pocket order.depLen table (cells, status, attributes) from results/atlas-matrix.json (stdlib only; reads only)
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = json.load(open(os.path.join(ROOT, 'results', 'atlas-matrix.json')))
S = M['statistics']; ix = S.index('order.depLen')
rows = []
for p in M['pockets']:
    c = p['cells'][ix]
    rows.append(dict(id=p['id'], kind=p['kind'], group=p['group'], register=p['register'], language=p['language'], script=p['script'], grain=p['grain'],
                     tokens=p['tokens'], units=p['units'], docs=p['docs'], mul=p['meanUnitLength'], thin=p['thin'],
                     vD=c[0], zD=c[1], vC=c[2], zC=c[3], status=c[4]))
json.dump(dict(statistics=S, rows=rows), open(os.path.join(os.path.dirname(__file__), 'table.json'), 'w'))
from collections import Counter
real = [r for r in rows if r['kind'] == 'real' and not r['thin']]
print(len(rows), 'rows;', len(real), 'real non-thin;', Counter(r['status'] for r in real))
print(Counter(r['kind'] for r in rows))
for r in rows:
    if r['kind'] != 'real': print(r['id'], r['kind'], r['status'], r['vD'], r['zD'], r['vC'], r['zC'])
