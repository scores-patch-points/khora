# ladder.py — IDENTITY-LADDER-PREREG.md (sha256 cc27d700…). Identity on a ladder of relative deviations.
# usage: python3 -I ladder.py [variant: main|M0|M2|M3]
import json, glob, os, sys, math, statistics, random

VARIANT = sys.argv[1] if len(sys.argv) > 1 else 'main'
OMNI = '../omni'
LANG_FILES = sorted(glob.glob(f'{OMNI}/ent/*.json'))

def mulberry32(a):
    state = [a & 0xFFFFFFFF]
    def imul(x, y): return ((x & 0xFFFFFFFF) * (y & 0xFFFFFFFF)) & 0xFFFFFFFF
    def nxt():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = imul(state[0] ^ (state[0] >> 15), 1 | state[0])
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt

def norm(snak):  # the same null-ness as real-rules.mjs valueOf, so the split consumes the same random numbers
    if snak.get('snaktype') != 'value' or 'datavalue' not in snak: return None
    t, v = snak['datavalue']['type'], snak['datavalue']['value']
    if t == 'wikibase-entityid': return v['id']
    if t == 'string': return v
    if t == 'monolingualtext': return v['text']
    if t == 'quantity': return 'q:' + str(float(v['amount']))
    if t == 'time':
        tm = v['time']
        if v['precision'] < 9: return None
        try: int(tm[1:tm.index('-', 1)])
        except Exception: return None
        return 'y:' + tm[:tm.index('-', 1)]
    return None

def split(entities, seed, first_only=False):
    """Two records per item, dealt statement by statement as real-rules.mjs deals them; each half carries the item's P31."""
    rng = mulberry32(seed); recs = {}
    for q in sorted(entities):
        A, B = {}, {}
        claims = entities[q].get('claims', {})
        for P in sorted(claims):
            for c in claims[P]:
                if c.get('rank') == 'deprecated': continue
                v = norm(c['mainsnak'])
                if v is None: continue
                H = A if rng() < 0.5 else B
                if first_only and P in H: continue
                H.setdefault(P, set()).add(v)
        p31 = {c['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for c in claims.get('P31', [])} - {None}
        for H in (A, B):
            if p31: H['P31'] = set(p31) if not first_only else {sorted(p31)[0]}
        recs[q] = (A, B)
    return recs

def is_human(e): return 'Q5' in [c['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for c in e.get('claims', {}).get('P31', [])]

langs = {os.path.basename(f)[:-5]: json.load(open(f)) for f in LANG_FILES}
everyone = {}
for L, E in langs.items():
    for q, e in E.items(): everyone.setdefault(q, e)
omni = json.load(open(f'{OMNI}/omni-results.json'))
stated_power = {r['L']: r['power'] for r in omni['rows']}
lname = {r['L']: r['name'] for r in omni['rows']}

def learn(train_recs, rng):
    both, disj, hold, val = {}, {}, {}, {}
    for A, B in train_recs:
        for P in set(A) & set(B):
            both[P] = both.get(P, 0) + 1; disj[P] = disj.get(P, 0) + (not (A[P] & B[P]))
        for P in set(A) | set(B):
            hold[P] = hold.get(P, 0) + 1
            for v in A.get(P, set()) | B.get(P, set()): val[(P, v)] = val.get((P, v), 0) + 1
    pairs = []
    for _ in range(len(train_recs)):
        i, j = rng.sample(range(len(train_recs)), 2)
        pairs.append((train_recs[i][rng.randrange(2)], train_recs[j][rng.randrange(2)]))
    sb, so = {}, {}
    for X, Y in pairs:
        for P in set(X) & set(Y):
            sb[P] = sb.get(P, 0) + 1; so[P] = so.get(P, 0) + bool(X[P] & Y[P])
    m = {P: (disj.get(P, 0) + 1) / (b + 2) for P, b in both.items()}
    c = {P: (so.get(P, 0) + 1) / (b + 2) for P, b in sb.items()}
    return m, c, hold, val, pairs

def lam(x, y, m, c, hold, val):
    s = 0.0
    for P in set(x) & set(y):
        if P not in m or P not in c: continue
        shared = x[P] & y[P]
        if shared:
            if VARIANT == 'M0': continue
            p = min((val.get((P, v), 0) + 1) / (hold.get(P, 0) + 2) for v in shared)
            s += math.log2((1 - m[P]) / p)
        else:
            s += math.log2(m[P] / (1 - c[P]))
    return s

def unit(xs):
    med = statistics.median(xs); mad = statistics.median(abs(x - med) for x in xs)
    return med, 1.4826 * mad

results, pooled = [], {}
for L in sorted(langs):
    test_items = {q: e for q, e in langs[L].items() if is_human(e)}
    if len(test_items) < 40: continue  # the OMNI thin-language rule (distinct items), unchanged
    train_items = {q: e for q, e in everyone.items() if is_human(e) and (VARIANT == 'M2' or q not in test_items)}
    rng = random.Random(f'ladder-{L}')
    train = list(split(train_items, 20261126, first_only=(VARIANT == 'M3')).values())
    m, c, hold, val, pairs = learn(train, rng)
    L_same = [lam(A, B, m, c, hold, val) for A, B in train]
    med1, u1 = unit(L_same)
    if u1 == 0: results.append(dict(L=L, gap='unit of L_same is 0')); continue
    s1 = lambda x, y: (med1 - lam(x, y, m, c, hold, val)) / u1
    P1 = [s for s in (s1(X, Y) for X, Y in pairs) if s >= 1]
    med2, u2 = unit(P1) if len(P1) > 1 else (None, 0)
    P2 = [(s - med2) / u2 for s in P1 if u2 and (s - med2) / u2 >= 1] if u2 else []
    med3, u3 = unit(P2) if len(P2) > 1 else (None, 0)
    def level(s):
        if s < 1: return 0
        if not u2: return 1
        s2 = (s - med2) / u2
        if s2 < 1: return 1
        if not u3: return 2
        return 3 if (s2 - med3) / u3 >= 1 else 2
    recs = split(test_items, 20261125, first_only=(VARIANT == 'M3'))
    names = [(q, h) for q in sorted(recs) for h in (0, 1)]
    t_lv = {}; d_counts = [0, 0, 0, 0]; d_n = 0; startle_true = []
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            (qa, ha), (qb, hb) = names[i], names[j]
            lv = level(s1(recs[qa][ha], recs[qb][hb]))
            if qa == qb:
                t_lv[qa] = lv
                if lv >= 2: startle_true.append(dict(item=qa, label=test_items[qa].get('labels', {}).get('en', {}).get('value'), level=lv))
            else:
                d_counts[lv] += 1; d_n += 1
    for q, lv in t_lv.items(): pooled.setdefault(q, lv)
    results.append(dict(L=L, name=lname.get(L, L), people=len(t_lv), train=len(train), unit1=round(u1, 3), median_same=round(med1, 3),
                        true_surprise=sum(1 for v in t_lv.values() if v >= 1), true_startle=sum(1 for v in t_lv.values() if v >= 2), true_shock=sum(1 for v in t_lv.values() if v == 3),
                        distinct_surprise=sum(d_counts[1:]) / d_n, distinct_startle=sum(d_counts[2:]) / d_n, distinct_shock=d_counts[3] / d_n,
                        stated_power=stated_power.get(L), startle_true=startle_true))
    print(f"{L:7} {lname.get(L, L)[:14]:14} true surprise {results[-1]['true_surprise']:3}/{len(t_lv)}  distinct surprise {results[-1]['distinct_surprise']:.3f} (stated {stated_power.get(L, float('nan')):.3f})  startle {results[-1]['distinct_startle']:.3f} shock {results[-1]['distinct_shock']:.4f}", flush=True)

def cp(k, n):
    def tail_ge(k, n, p): return sum(math.exp(math.lgamma(n + 1) - math.lgamma(i + 1) - math.lgamma(n - i + 1) + i * math.log(p) + (n - i) * math.log1p(-p)) for i in range(k, n + 1))
    def cdf(k, n, p): return sum(math.exp(math.lgamma(n + 1) - math.lgamma(i + 1) - math.lgamma(n - i + 1) + i * math.log(p) + (n - i) * math.log1p(-p)) for i in range(0, k + 1))
    lo = 0.0 if k == 0 else _bis(lambda p: tail_ge(k, n, p) < 0.05)
    hi = 1.0 if k == n else _bis(lambda p: cdf(k, n, p) > 0.05)
    return lo, hi
def _bis(left):
    a, b = 1e-12, 1 - 1e-12
    for _ in range(60):
        mid = (a + b) / 2
        if left(mid): a = mid
        else: b = mid
    return (a + b) / 2
k = sum(1 for v in pooled.values() if v >= 1); n = len(pooled)
lo, hi = cp(k, n)
ok = [r for r in results if 'gap' not in r]
summary = dict(variant=VARIANT, languages=len(ok), gaps=[r for r in results if 'gap' in r],
               Q1_pooled_true_surprise=dict(k=k, n=n, rate=k / n, ci95=[lo, hi], stated_baseline=[0.0345, 0.0294, 0.0402]),
               Q2_languages_learned_ge_stated=sum(1 for r in ok if r['stated_power'] is not None and r['distinct_surprise'] >= r['stated_power']),
               Q2_median_distinct_surprise=statistics.median(r['distinct_surprise'] for r in ok),
               Q3=dict(true_startle=sum(r['true_startle'] for r in ok), true_shock=sum(r['true_shock'] for r in ok),
                       median_distinct_startle=statistics.median(r['distinct_startle'] for r in ok), median_distinct_shock=statistics.median(r['distinct_shock'] for r in ok)))
json.dump(dict(summary=summary, languages=results), open(f'ladder-{VARIANT}.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps(summary, indent=1, ensure_ascii=False))
