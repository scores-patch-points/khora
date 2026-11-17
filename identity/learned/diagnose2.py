# diagnose2.py — post-result: of the true pairs at SURPRISE, how many disagree only on near dates (<= 2 years)?
import json, sys, math, random, statistics
sys.argv = ['ladder.py', 'main']
src = open('ladder.py').read().split('results, pooled = [], {}')[0]
ns = {}; exec(src, ns)
tot = near_only = has_near = 0; rels = {}
for L in sorted(ns['langs']):
    test = {q: e for q, e in ns['langs'][L].items() if ns['is_human'](e)}
    if len(test) < 40: continue
    train_items = {q: e for q, e in ns['everyone'].items() if ns['is_human'](e) and q not in test}
    rng = random.Random(f'ladder-{L}')
    train = list(ns['split'](train_items, 20261126).values())
    m, c, hold, val, pairs = ns['learn'](train, rng)
    L_same = [ns['lam'](A, B, m, c, hold, val) for A, B in train]
    med, u = ns['unit'](L_same)
    for q, (A, B) in ns['split'](test, 20261125).items():
        if (med - ns['lam'](A, B, m, c, hold, val)) / u < 1: continue
        tot += 1
        dis = [P for P in set(A) & set(B) if P in m and P in c and not (A[P] & B[P])]
        def near(P):
            ya = [int(v[2:]) for v in A[P] if v.startswith('y:')]; yb = [int(v[2:]) for v in B[P] if v.startswith('y:')]
            return bool(ya and yb) and min(abs(x - y) for x in ya for y in yb) <= 2
        strong = [P for P in dis if math.log2(m[P] / (1 - c[P])) < -1]   # the disagreements that carry weight
        n_ = [P for P in strong if near(P)]
        has_near += bool(n_); near_only += bool(strong) and len(n_) == len(strong)
        for P in strong: rels[P] = rels.get(P, 0) + 1
print(f"true people at SURPRISE: {tot}; with a weighty near-date (<= 2 years) disagreement: {has_near}; whose ONLY weighty disagreements are near dates: {near_only}")
print('weighty disagreements by relation:', sorted(rels.items(), key=lambda kv: -kv[1])[:8])
