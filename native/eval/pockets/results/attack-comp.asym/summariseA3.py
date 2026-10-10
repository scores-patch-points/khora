#!/usr/bin/env python3
"""summariseA3.py -- summarise A3.json (per-type decomposition of comp.asym) -> A3-summary.json."""
import json, os, statistics as st
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
A3 = json.load(open(os.path.join(HERE, 'A3.json')))
def sg(x): return 0 if x is None else (1 if x > 0 else -1 if x < 0 else 0)
out = {'n': len(A3)}
def pk(r, key):
    a, b = r['halves']['discover'][key], r['halves']['confirm'][key]
    return None if a is None or b is None else (a + b) / 2
rows = []
for r in A3:
    want = 1 if r['status'] == 'P+' else -1
    sh = [r['halves'][w]['shareOwnSign'] for w in ('discover', 'confirm')]; nq = [r['halves'][w]['n'] for w in ('discover', 'confirm')]
    g1, g2 = pk(r, 'g1_10'), pk(r, 'g11_20')
    rows.append({'id': r['id'], 'status': r['status'], 'register': r['register'], 'shareOwnSign': None if None in sh else sum(sh) / 2, 'nTypes': min(nq), 'g1_10': g1, 'g11_20': g2, 'want': want,
                 'bothSame': g1 is not None and g2 is not None and sg(g1) == want and sg(g2) == want, 'opposite': g1 is not None and g2 is not None and sg(g1) == -sg(g2) and sg(g1) != 0})
def block(sel, label):
    sh = [r['shareOwnSign'] for r in sel if r['shareOwnSign'] is not None]
    d = {'label': label, 'n': len(sel), 'medianShareOfTypesWithPocketSign': st.median(sh) if sh else None, 'meanShare': sum(sh) / len(sh) if sh else None,
         'shareAtLeast75pct': sum(1 for x in sh if x >= 0.75) / len(sh) if sh else None, 'shareBelow60pct': sum(1 for x in sh if x < 0.6) / len(sh) if sh else None,
         'ranks1_10_and_11_20_both_carry_sign': sum(1 for r in sel if r['bothSame']), 'ranks1_10_vs_11_20_opposite_signs': sum(1 for r in sel if r['opposite']), 'ranks1_10_sign_matches_pocket': sum(1 for r in sel if r['g1_10'] is not None and sg(r['g1_10']) == r['want']),
         'ranks11_20_sign_matches_pocket': sum(1 for r in sel if r['g11_20'] is not None and sg(r['g11_20']) == r['want'])}
    return d
out['all'] = block(rows, 'all PRESENT'); out['P+'] = block([r for r in rows if r['status'] == 'P+'], 'P+'); out['P-'] = block([r for r in rows if r['status'] == 'P-'], 'P-')
for g in ('chat', 'code', 'academic', 'drama', 'scripture', 'treatise', 'novel', 'children'): out['reg_' + g] = block([r for r in rows if r['register'] == g], g)
json.dump(out, open(os.path.join(HERE, 'A3-summary.json'), 'w'), indent=1)
for k, v in out.items():
    if k != 'n': print('%-14s n=%3d medianShareOwnSign %.2f  >=75%%: %.2f  <60%%: %.2f | ranks1-10 sign ok %d, ranks11-20 sign ok %d, both %d, opposite %d' % (k, v['n'], v['medianShareOfTypesWithPocketSign'] or float('nan'), v['shareAtLeast75pct'] or float('nan'), v['shareBelow60pct'] or float('nan'), v['ranks1_10_sign_matches_pocket'], v['ranks11_20_sign_matches_pocket'], v['ranks1_10_and_11_20_both_carry_sign'], v['ranks1_10_vs_11_20_opposite_signs']))
