# summariseA3.py -- (i) sign crossing inside pockets over window length W; (ii) does the register / group shared property of the SIGN split survive at EQUAL unit length W? (permutation, 2000 draws, seeded python rng)
import json, glob, os, random, math
from collections import Counter, defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
R = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(HERE, 'A2', '*.json')))]
WS = ['4', '6', '8', '12', '20', '32', '64']
def sg(x): return 1 if x > 0 else -1
def both(r, W, s):
    c = r['W'][W]
    return c['discover'] is not None and c['confirm'] is not None and sg(c['discover']['v']) == s and sg(c['confirm']['v']) == s
out = {}
# (i) sign crossing: + at W=8 (both halves) and - at W=64 (both halves); and by register
cross = [r for r in R if both(r, '8', 1) and both(r, '64', -1) and all(r['W'][W]['discover'] is not None and r['W'][W]['confirm'] is not None for W in WS)]
rev = [r for r in R if both(r, '8', -1) and both(r, '64', 1) and all(r['W'][W]['discover'] is not None and r['W'][W]['confirm'] is not None for W in WS)]
allp = [r for r in R if all(r['W'][W]['discover'] is not None and r['W'][W]['confirm'] is not None for W in WS)]
out['crossing'] = {'nWithBoth': len(allp), 'plusAtW8_minusAtW64': len(cross), 'minusAtW8_plusAtW64': len(rev)}
print('sign crossing over W among %d pockets with every W defined: + at W=8 and - at W=64 (both halves each): %d; reverse: %d' % (len(allp), len(cross), len(rev)))
byreg = defaultdict(lambda: [0, 0])
for r in allp:
    byreg[r['register']][1] += 1
    if r in cross: byreg[r['register']][0] += 1
print('  by register (crossing/n):', {k: '%d/%d' % tuple(v) for k, v in sorted(byreg.items(), key=lambda kv: -kv[1][1]) if v[1] >= 8})
# pocket-level monotone: v(W=4) - v(W=64) > 0 in how many pockets
mono = sum(1 for r in allp if 0.5 * (r['W']['4']['discover']['v'] + r['W']['4']['confirm']['v']) > 0.5 * (r['W']['64']['discover']['v'] + r['W']['64']['confirm']['v']))
out['v4gtv64'] = [mono, len(allp)]; print('  v(W=4) > v(W=64) (pocket-level, mean of halves) in %d/%d pockets' % (mono, len(allp)))
# crossover window: first W (ascending) at which pocket-level v turns negative, per register
def cross_w(r):
    prev = None
    for W in WS:
        c = r['W'][W]
        if c['discover'] is None or c['confirm'] is None: continue
        v = 0.5 * (c['discover']['v'] + c['confirm']['v'])
        if v < 0: return W
    return '>64'
cw = defaultdict(Counter)
for r in R: cw[r['register']][cross_w(r)] += 1
out['firstNegativeW'] = {k: dict(v) for k, v in cw.items()}
print('  first window length at which pocket-level v < 0, by register (selected):')
for reg in ['novel', 'memoir', 'treebank', 'code', 'scripture', 'notation', 'nomenclature', 'diagram', 'chat']:
    print('    %-13s %s' % (reg, dict(sorted(cw[reg].items(), key=lambda kv: (kv[0] == '>64', int(kv[0]) if kv[0] != '>64' else 99)))))
# (ii) shared property of the sign split at equal unit length
def eta2(y, lab):
    n = len(y); m = sum(y) / n; tot = sum((v - m) ** 2 for v in y)
    if tot == 0: return float('nan')
    g = defaultdict(list)
    for v, l in zip(y, lab): g[l].append(v)
    return sum(len(a) * (sum(a) / len(a) - m) ** 2 for a in g.values()) / tot
def perm_p(y, lab, B=2000, seed=11):
    rnd = random.Random(seed); o = eta2(y, lab); ex = 0; l2 = lab[:]
    for _ in range(B):
        rnd.shuffle(l2)
        if eta2(y, l2) >= o: ex += 1
    return o, (1 + ex) / (1 + B)
out['signSplitSharedProperty'] = {}
print('\nShared property of the SIGN split at equal unit length (PRESENT+ vs PRESENT- among pockets PRESENT at that W; seeded python random, 2000 permutations; atlas natural units first)')
for W in ['atlas'] + ['4', '8', '12', '20', '32']:
    ps = [r for r in R if (r['atlasStatus'] if W == 'atlas' else r['W'][W]['status']) in ('P+', 'P-')]
    y = [1.0 if (r['atlasStatus'] if W == 'atlas' else r['W'][W]['status']) == 'P+' else 0.0 for r in ps]
    npos = int(sum(y)); nneg = len(y) - npos
    if npos < 3 or nneg < 3: print('  W=%-5s +%d/-%d too few of one sign' % (W, npos, nneg)); out['signSplitSharedProperty'][W] = {'pos': npos, 'neg': nneg}; continue
    er, pr = perm_p(y, [r['register'] for r in ps]); eg, pg = perm_p(y, [r['group'] for r in ps])
    out['signSplitSharedProperty'][W] = {'pos': npos, 'neg': nneg, 'registerEta2': er, 'registerP': pr, 'groupEta2': eg, 'groupP': pg}
    print('  W=%-5s +%3d/-%3d  register eta2 %.3f p %.4f | group eta2 %.3f p %.4f' % (W, npos, nneg, er, pr, eg, pg))
json.dump(out, open(os.path.join(HERE, 'A3-summary.json'), 'w'), indent=1)
