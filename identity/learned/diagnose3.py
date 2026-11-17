# diagnose3.py — post-result: why did F2 (weights on disagreements) INCREASE false splits? Compare the ladder's unit.
import sys, random, statistics
src = open('ladder2.py').read().split('# --- F3: population surprise')[0]
res = {}
for variant in ('F1', 'F2'):   # F1 here = no weights (F1 only changes dates); F2 = weights
    sys.argv = ['ladder2.py', variant]
    ns = {}; exec(src, ns)
    for L in ('Q9027', 'Q1860', 'Q7850', 'Q9610'):
        test = {q: e for q, e in ns['langs'][L].items() if ns['is_human'](e)}
        train_items = {q: e for q, e in ns['everyone'].items() if ns['is_human'](e) and q not in test}
        rng = random.Random(f'ladder-{L}')
        train = list(ns['split'](train_items, 20261126).values())
        m, c, hold, val, pairs = ns['learn'](train, rng)
        w = ns['rule_weights'](train_items, random.Random(f'w-{L}')) if variant == 'F2' else {}
        gm = ns['gap_model'](train, pairs) if variant == 'F1' else {}
        lam = ns['make_lam'](m, c, hold, val, w, gm)
        Ls = [lam(A, B) for A, B in train]; med, u = ns['unit'](Ls)
        Lp = [lam(X, Y) for X, Y in pairs]
        res[(variant, L)] = (med, u, statistics.median(Lp))
for L in ('Q9027', 'Q1860', 'Q7850', 'Q9610'):
    (m1, u1, p1), (m2, u2, p2) = res[('F1', L)], res[('F2', L)]
    print(f"{L}: self-split median / unit   unweighted {m1:6.2f} / {u1:5.2f}   weighted {m2:6.2f} / {u2:5.2f}   | stranger median  {p1:6.2f} -> {p2:6.2f}  | separation (self-stranger)/unit  {(m1-p1)/u1:5.2f} -> {(m2-p2)/u2:5.2f}")
