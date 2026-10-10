# table.py -- extract the comp.asym column (and a compact per-pocket attribute row) from results/atlas-matrix.json (read only). Writes table.json.
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
m = json.load(open(os.path.join(HERE, '..', 'atlas-matrix.json')))
st = m['statistics']; i = st.index('comp.asym')
rows = []
for p in m['pockets']:
    c = p['cells'][i] if p.get('cells') else None
    rows.append({k: p.get(k) for k in ['id','kind','group','register','language','script','grain','tokens','units','docs','meanUnitLength','thin']} |
                ({'vD': c[0], 'zD': c[1], 'vC': c[2], 'zC': c[3], 'status': c[4]} if c else {'status': 'nocells'}))
json.dump({'stat': 'comp.asym', 'index': i, 'rows': rows}, open(os.path.join(HERE, 'table.json'), 'w'), indent=0)
real = [r for r in rows if r['kind'] == 'real' and not r['thin']]
from collections import Counter
print(len(real), Counter(r['status'] for r in real))
