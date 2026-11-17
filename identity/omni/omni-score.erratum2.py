import json, glob, os
import math
def binom_tail_ge(k, n, p):  # P(X >= k)
    return sum(math.comb(n, i) * p**i * (1-p)**(n-i) for i in range(k, n+1))
def binom_cdf(k, n, p):      # P(X <= k)
    return sum(math.comb(n, i) * p**i * (1-p)**(n-i) for i in range(0, k+1))
def cp_lower(k, n, a=0.05):  # one-sided 95% Clopper-Pearson lower bound
    if k == 0: return 0.0
    lo, hi = 0.0, 1.0
    for _ in range(60):
        m = (lo+hi)/2
        if binom_tail_ge(k, n, m) < a: lo = m
        else: hi = m
    return hi
def cp_upper(k, n, a=0.05):  # one-sided 95% Clopper-Pearson upper bound
    if k == n: return 1.0
    lo, hi = 0.0, 1.0
    for _ in range(60):
        m = (lo+hi)/2
        if binom_cdf(k, n, m) > a: lo = m
        else: hi = m
    return lo
def multi_birth(E):
    """items with two or more TRUTHY birth dates (preferred if any, else normal rank) in 1700-1900 (ERRATUM-2)"""
    n = 0
    for e in E.values():
        cs = [c for c in e.get('claims', {}).get('P569', []) if c.get('rank') != 'deprecated']
        best = [c for c in cs if c.get('rank') == 'preferred'] or cs
        ys = []
        for c in best:
            t = c['mainsnak'].get('datavalue', {}).get('value', {}).get('time')
            if t:
                y = int(t[:t.index('-', 1)])
                if 1700 <= y <= 1900: ys.append(y)
        n += len(ys) >= 2
    return n
PROPS = json.load(open('property-constraints.json'))
def rule_type(P):
    ts = {c['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for c in PROPS.get(P, {}).get('claims', {}).get('P2302', [])}
    return 'single-value' if 'Q19474404' in ts else 'single-best-value' if 'Q52060874' in ts else None
lang = {q: e.get('labels', {}).get('en', {}).get('value', q) for q, e in json.load(open('langs.json'))['entities'].items()}
rows = []
for f in sorted(glob.glob('ent/*.json')):
    L = os.path.basename(f)[:-5]
    E = json.load(open(f))
    ENTS = E
    st = [c for e in E.values() for cs in e.get('claims', {}).values() for c in cs if c.get('rank') != 'deprecated']
    ref = sum(1 for c in st if c.get('references')) / max(1, len(st))
    r = {m: json.load(open(f'runs/{L}-{m}.json')) for m in ('none', 'norules', 'flip')}
    rows.append(dict(L=L, name=lang.get(L, L), items=r['none']['items'], ref=ref,
        true=r['none']['rates']['trueContradicted'], tc=r['none']['true']['contradicted'], power=r['none']['rates']['distinctContradicted'],
        norules=r['norules']['rates']['distinctContradicted'], flip=r['flip']['rates']['trueContradicted'], proofs=r['none']['trueContradicted'],
        itemsList=sorted(E.keys()), multiBirth=multi_birth(E), contradictedItems=sorted({p['item'] for p in r['none']['trueContradicted']})))
    # classify each contradicted true pair: a rule misfire (single-best-value with a preferred-rank statement: alternatives allowed) or the record disagreeing with itself
    for p in rows[-1]['proofs']:
        it = E[p['item']]; kinds = []
        for q in p['proof']:
            P = q['rel']
            pref = any(c.get('rank') == 'preferred' for c in it.get('claims', {}).get(P, []))
            kinds.append('rank-permitted' if (q.get('base') is None and rule_type(P) == 'single-best-value' and pref) else 'record-disagreement')
        p['class'] = 'rank-permitted' if kinds and all(k == 'rank-permitted' for k in kinds) else 'record-disagreement'
use = [x for x in rows if x['items'] >= 40]
thin = [x for x in rows if x['items'] < 40]
def ranks(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r = [0] * len(v)
    i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2
        i = j + 1
    return r
def spearman(a, b):
    ra, rb = ranks(a), ranks(b); n = len(a); ma, mb = sum(ra) / n, sum(rb) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb)); va = sum((x - ma) ** 2 for x in ra); vb = sum((y - mb) ** 2 for y in rb)
    return cov / (va * vb) ** 0.5
for x in use: x['n'] = x['items']; x['lo'] = cp_lower(x['tc'], x['n']); x['hi'] = cp_upper(x['tc'], x['n'])
O1_fail = [x for x in use if x['lo'] > 0.05]                     # ERRATUM-1: falsified only if the lower bound exceeds 5%
O1_cannot = [x for x in use if x['hi'] > 0.05 and x['lo'] <= 0.05]  # cannot show <= 5% at this n
# pooled over UNIQUE people: a person in several language samples counts once (first language in sorted id order)
seen = {}
for x in sorted(use, key=lambda x: x['L']):
    for q in x['itemsList']:
        if q not in seen: seen[q] = q in x['contradictedItems']
overlap = sum(len(x['itemsList']) for x in use) - len(seen)
pk, pn = sum(seen.values()), len(seen)
pooled = dict(k=pk, n=pn, rate=pk/pn, lo=cp_lower(pk, pn), hi=cp_upper(pk, pn))
classes = {}
for x in use:
    for p in x['proofs']: classes[p['class']] = classes.get(p['class'], 0) + 1
O2_share = sum(1 for x in use if x['power'] >= 0.20) / len(use)
rho = spearman([x['ref'] for x in use], [x['power'] for x in use])
P_norules = all(x['norules'] < 0.05 for x in use)
P_flip = sum(1 for x in use if x['flip'] > 0.05) / len(use)
print("unit = distinct item (ERRATUM-2); items = distinct items; multi-P569 = items with >= 2 truthy birth dates in 1700-1900")
print(f"{'language':16} {'items':>5} {'refd':>5} {'multi-P569':>10} {'true-contra':>12} {'power':>6} {'norules':>7} {'flip':>6}")
for x in sorted(use, key=lambda x: -x['power']):
    flag = ' <-- O1 FALSIFIED' if x['lo'] > 0.05 else (' (cannot show <=5% at this n)' if x['hi'] > 0.05 else '')
    print(f"{x['name'][:16]:16} {x['items']:5} {x['ref']:5.2f} {x['multiBirth']:10} {x['tc']:4} ({x['true']:5.3f}, 95% [{x['lo']:.3f},{x['hi']:.3f}]) {x['power']:6.3f} {x['norules']:7.3f} {x['flip']:6.3f}{flag}")
print('too thin (< 40 distinct items):', [(x['name'], x['items']) for x in thin])
print(f"\nO1 per language (falsified only if the 95% lower bound > 5%): {'no language falsified' if not O1_fail else 'FALSIFIED in ' + ', '.join(x['name'] for x in O1_fail)}; {len(O1_cannot)} languages cannot show <= 5% at their n")
print(f"O1 pooled over {pn} unique people ({overlap} repeat appearances dropped): {pk} contradicted = {pooled['rate']:.4f}, 95% [{pooled['lo']:.4f}, {pooled['hi']:.4f}] -> {'HOLDS (upper bound <= 5%)' if pooled['hi'] <= 0.05 else 'FALSIFIED (lower bound > 5%)' if pooled['lo'] > 0.05 else 'INCONCLUSIVE'}")
print(f"contradicted true pairs by class: {classes}")
print(f"O2 power >= 20% in >= 80% of languages: {O2_share:.0%} -> {'HOLDS' if O2_share >= 0.8 else 'FALSIFIED'}")
print(f"O3 Spearman(referenced share, power) = {rho:.2f} over {len(use)} languages")
print(f"power check: M-norules < 5% everywhere: {P_norules}; M-flip > 5% in {P_flip:.0%} of languages (need >= 50%): {P_flip >= 0.5}")
json.dump(dict(rows=[{k: v for k, v in x.items() if k not in ('itemsList',)} for x in rows], O1_fail=[x['name'] for x in O1_fail], O1_cannot=[x['name'] for x in O1_cannot], pooled=pooled, overlap=overlap, classes=classes, O2_share=O2_share, spearman=rho, power=dict(norules=P_norules, flip=P_flip)), open('omni-results.json', 'w'), indent=1)
for x in O1_fail:
    print(f"\n{x['name']}: true pairs contradicted ({x['tc']}):")
    for p in x['proofs'][:6]: print('  ', p['label'], p['by'], p['class'], [(q['rel'], q['base'], q['a'] if not isinstance(q['a'], dict) else q['a'].get('y'), q['b'] if not isinstance(q['b'], dict) else q['b'].get('y')) for q in p['proof']][:2])
