# diagnose.py — post-result look at the ladder (LADDER-RESULTS.md): per-relation terms for flagged true pairs.
import json, sys, math, random, statistics
sys.argv = ['ladder.py', 'main']
src = open('ladder.py').read().split('results, pooled = [], {}')[0]   # everything up to the run loop: same learning code
ns = {}; exec(src, ns)
labels = json.load(open('../omni/property-constraints.json'))
plab = lambda P: labels.get(P, {}).get('labels', {}).get('en', {}).get('value', P)
def terms(x, y, m, c, hold, val):
    out = []
    for P in sorted(set(x) & set(y)):
        if P not in m or P not in c: continue
        sh = x[P] & y[P]
        if sh:
            p = min((val.get((P, v), 0) + 1) / (hold.get(P, 0) + 2) for v in sh)
            out.append((P, 'agree', round(math.log2((1 - m[P]) / p), 2), sorted(sh)[:2]))
        else:
            out.append((P, 'DISAGREE', round(math.log2(m[P] / (1 - c[P])), 2), [sorted(x[P])[:2], sorted(y[P])[:2]]))
    return out
def setup(L):
    test = {q: e for q, e in ns['langs'][L].items() if ns['is_human'](e)}
    train_items = {q: e for q, e in ns['everyone'].items() if ns['is_human'](e) and q not in test}
    rng = random.Random(f'ladder-{L}')
    train = list(ns['split'](train_items, 20261126).values())
    m, c, hold, val, pairs = ns['learn'](train, rng)
    return test, ns['split'](test, 20261125), m, c, hold, val
startled = [('Q11059', 'Q15662203'), ('Q13955', 'Q105620613'), ('Q1860', 'Q1001731'), ('Q7850', 'Q1033183')]
for L, q in startled:
    test, recs, m, c, hold, val = setup(L)
    A, B = recs[q]
    t = terms(A, B, m, c, hold, val)
    print(f"\n=== {test[q]['labels']['en']['value']} ({q}), {ns['lname'][L]} sample: Lambda = {sum(x[2] for x in t):.2f} bits")
    for P, kind, bits, vals in t:
        if kind == 'DISAGREE' or bits > 3: print(f"   {kind:8} {bits:7.2f}  {plab(P)} ({P}): {vals}")
# Swedish: which relations make true pairs disagree, against what other languages expect
L = 'Q9027'; test, recs, m, c, hold, val = setup(L)
agg = {}
for q, (A, B) in recs.items():
    for P, kind, bits, vals in terms(A, B, m, c, hold, val):
        if kind == 'DISAGREE': a = agg.setdefault(P, [0, 0.0]); a[0] += 1; a[1] += bits
print('\n=== Swedish: relations on which a person\'s two halves disagree (count of people, total bits, learned m_r from other languages)')
for P, (n, b) in sorted(agg.items(), key=lambda kv: kv[1][1])[:10]:
    print(f"   {n:3} people  {b:8.1f} bits  m={m[P]:.3f}  {plab(P)} ({P})")
