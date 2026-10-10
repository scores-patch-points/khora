# panel-summary.py — summarises a real-test.mjs panel: per-statistic PRESENT / ABSENT counts under the atlas rules (|z|>=4 both halves same sign = PRESENT; |z|<2 both = ABSENT),
# Spearman rho of v against log(tokens) and mean unit length (G1-style, over the panel pockets), and the PREDICT table check.   python3 panel-summary.py panel.json [panel2.json ...] > out.json
import json, sys, math
R = {}
for f in sys.argv[1:]:
    R.update({k: v for k, v in json.load(open(f)).items() if 'halves' in v})
frozen = json.load(open('predict-frozen.json'))['canon']; PRED = dict(frozen)
stats = [k for k in R[next(iter(R))]['halves']['discover'] if k != 'tokens']
def rank(xs):
    o = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0.0] * len(xs); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and xs[o[j + 1]] == xs[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def spearman(a, b):
    if len(a) < 5: return None
    ra, rb = rank(a), rank(b); ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    sa = math.sqrt(sum((x - ma) ** 2 for x in ra)); sb = math.sqrt(sum((x - mb) ** 2 for x in rb))
    return None if sa == 0 or sb == 0 else sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / (sa * sb)
out = {'pockets': len(R), 'stats': {}}
for s in stats:
    pos = neg = absn = amb = und = 0; vs = []; lt = []; ml = []; names = {'pos': [], 'neg': [], 'abs': []}
    for pid, r in R.items():
        d, c = r['halves']['discover'][s], r['halves']['confirm'][s]
        if d['z'] is None or c['z'] is None or d['v'] is None or c['v'] is None: und += 1; continue
        v = (d['v'] + c['v']) / 2; vs.append(v); lt.append(math.log(r['tokens'])); ml.append(r['meanUnitLen'])
        if d['z'] >= 4 and c['z'] >= 4: pos += 1; names['pos'].append(pid)
        elif d['z'] <= -4 and c['z'] <= -4: neg += 1; names['neg'].append(pid)
        elif abs(d['z']) < 2 and abs(c['z']) < 2: absn += 1; names['abs'].append(pid)
        else: amb += 1
    n = pos + neg + absn + amb
    share = max(pos, neg) / n if n else None
    status = None
    if n:
        if share >= .85: status = 'universal' + ('+' if pos > neg else '-')
        elif share >= .60: status = 'majority' + ('+' if pos > neg else '-')
        elif pos >= 3 and neg >= 3: status = 'reversal'
        elif pos + neg >= 2 and share <= .59 and absn >= .25 * n: status = 'specific'
        elif pos + neg < 2: status = 'null-law'
        else: status = 'mixed(other)'
    out['stats'][s] = {'N': n, 'undefined': und, 'present+': pos, 'present-': neg, 'absent': absn, 'ambiguous': amb, 'status': status, 'predicted': PRED.get(s),
        'medianV': sorted(vs)[len(vs) // 2] if vs else None, 'rhoLogTokens': spearman(vs, lt), 'rhoMeanUnitLen': spearman(vs, ml), 'pos': names['pos'], 'neg': names['neg'], 'abs': names['abs']}
print(json.dumps(out, indent=1))
