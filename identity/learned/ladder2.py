# ladder2.py — LADDER2-PREREG.md (sha256 27478ddf…). The ladder with F1 (dates by closeness), F2 (disagreement only
# under a rule), F3 (population surprise). usage: python3 -I ladder2.py [ALL|F1|F2|F3]
import json, sys, math, random, statistics
VARIANT = sys.argv[1] if len(sys.argv) > 1 else 'ALL'
F1, F2, F3 = VARIANT in ('ALL', 'F1'), VARIANT in ('ALL', 'F2'), VARIANT in ('ALL', 'F3')
sys.argv = ['ladder.py', 'main']
ns = {}; exec(open('ladder.py').read().split('results, pooled = [], {}')[0], ns)   # the v1 learning code, unchanged
langs, everyone, is_human, split, learn, unit = ns['langs'], ns['everyone'], ns['is_human'], ns['split'], ns['learn'], ns['unit']
PROPS = json.load(open('../omni/property-constraints.json'))
TIME = {P for P, e in PROPS.items() if e.get('datatype') == 'time'}

# --- step-2 classification (LEARN-PREREG), on a given set of people ----------------------------------------------
def norm2(s):
    if s.get('snaktype') != 'value' or 'datavalue' not in s: return None, None
    t, v = s['datavalue']['type'], s['datavalue']['value']
    if t == 'wikibase-entityid': return v['id'], None
    if t == 'string': return v, None
    if t == 'monolingualtext': return v['text'], None
    if t == 'quantity': return 'q:' + str(float(v['amount'])), None
    if t == 'time':
        if v['precision'] < 9: return None, None
        try: y = int(v['time'][:v['time'].index('-', 1)])
        except Exception: return None, None
        return 'y:' + str(y), y
    return None, None
def rule_weights(people, rng):
    by = {}
    for e in people.values():
        for P, cs in e.get('claims', {}).items():
            vals = {}
            for c in cs:
                if c.get('rank') == 'deprecated': continue
                v, y = norm2(c['mainsnak'])
                if v is None: continue
                cur = vals.setdefault(v, {'year': y, 'pref': False, 'refs': set()})
                cur['pref'] |= c.get('rank') == 'preferred'; cur['refs'] |= {r.get('hash') for r in c.get('references', []) if r.get('hash')}
            if vals: by.setdefault(P, []).append(vals)
    w = {}
    for P, members in by.items():
        ys = [v['year'] for m in members for v in m.values() if v['year'] is not None]
        gap = statistics.median(abs(rng.choice(ys) - rng.choice(ys)) for _ in range(2000)) if len(ys) > 1 and P in TIME else None
        s = d = p = 0
        for m in members:
            if len(m) == 1: s += 1; continue
            vs = list(m.values()); yy = [v['year'] for v in vs if v['year'] is not None]
            a = sum(v['pref'] for v in vs) == 1
            b = gap is not None and len(yy) == len(vs) and max(yy) - min(yy) <= gap
            rr = [v['refs'] for v in vs]
            c = all(rr) and all(not (rr[i] & rr[j]) for i in range(len(vs)) for j in range(i + 1, len(vs)))
            if a or b or c: d += 1
            else: p += 1
        n = s + d + p; S = (s + d) / n
        w[P] = (d + S) / (d + p + 1)
    return w

# --- F1: gap model for time relations ----------------------------------------------------------------------------
yr = lambda vs: [int(v[2:]) for v in vs if v.startswith('y:')]
def gapof(X, Y):
    a, b = yr(X), yr(Y)
    return min(abs(x - y) for x in a for y in b) if a and b else None
def gap_model(train, pairs):
    same, stra = {}, {}
    for (A, B), dst in [(t, same) for t in train] + [(p, stra) for p in pairs]:
        for P in set(A) & set(B):
            if P not in TIME: continue
            g = gapof(A[P], B[P])
            if g is not None: dst.setdefault(P, []).append(g)
    model = {}
    for P in set(same) & set(stra):
        G = max(same[P] + stra[P]) + 1
        cs, ct = {}, {}
        for g in same[P]: cs[g] = cs.get(g, 0) + 1
        for g in stra[P]: ct[g] = ct.get(g, 0) + 1
        ns_, nt = len(same[P]), len(stra[P])
        def term(g, cs=cs, ct=ct, ns_=ns_, nt=nt, G=G):
            g = min(g, G)
            return math.log2(((cs.get(g, 0) + 1) / (ns_ + G + 1)) / ((ct.get(g, 0) + 1) / (nt + G + 1)))
        model[P] = term
    return model

def make_lam(m, c, hold, val, w, gm):
    def lam(x, y):
        s = 0.0
        for P in set(x) & set(y):
            if F1 and P in gm:
                g = gapof(x[P], y[P])
                if g is not None: s += gm[P](g); continue
            if P not in m or P not in c: continue
            sh = x[P] & y[P]
            if sh:
                pv = min((val.get((P, v), 0) + 1) / (hold.get(P, 0) + 2) for v in sh)
                s += math.log2((1 - m[P]) / pv)
            else:
                s += (w.get(P, 1.0) if F2 else 1.0) * math.log2(m[P] / (1 - c[P]))
        return s
    return lam

# --- F3: population surprise -------------------------------------------------------------------------------------
def dist(people):
    D, H = {}, {}
    for e in people.values():
        for P, cs in e.get('claims', {}).items():
            vs = {norm2(c['mainsnak'])[0] for c in cs if c.get('rank') != 'deprecated'} - {None}
            if not vs: continue
            H[P] = H.get(P, 0) + 1
            for v in vs: D.setdefault(P, {})[v] = D.setdefault(P, {}).get(v, 0) + 1
    return D, H
def js(p, q):
    sp, sq = sum(p.values()), sum(q.values()); out = 0.0
    for k in set(p) | set(q):
        a, b = p.get(k, 0) / sp, q.get(k, 0) / sq; mm = (a + b) / 2
        if a: out += 0.5 * a * math.log2(a / mm)
        if b: out += 0.5 * b * math.log2(b / mm)
    return out
def wmedian(pairs):
    pairs = sorted(pairs); tot = sum(w for _, w in pairs); acc = 0
    for v, w in pairs:
        acc += w
        if acc >= tot / 2: return v
usable = [L for L in sorted(langs) if sum(is_human(e) for e in langs[L].values()) >= 40]
pop = {}
if F3:
    for L in usable:
        mine = {q: e for q, e in langs[L].items() if is_human(e)}
        rest = {q: e for q, e in everyone.items() if is_human(e) and q not in mine}
        Dm, Hm = dist(mine); Dr, _ = dist(rest)
        pop[L] = wmedian([(js(Dm[P], Dr[P]), Hm[P]) for P in Dm if P in Dr])
    medp, up = unit(list(pop.values()))
    popz = {L: (s - medp) / up for L, s in pop.items()}
else:
    popz = {L: 0.0 for L in usable}

omni = json.load(open('../omni/omni-results.json')); stated = {r['L']: r['power'] for r in omni['rows']}; lname = {r['L']: r['name'] for r in omni['rows']}
v1 = {r['L']: r for r in json.load(open('ladder-main.json'))['languages']}
rows, pooled_in, pooled_all = [], {}, {}
for L in usable:
    test = {q: e for q, e in langs[L].items() if is_human(e)}
    train_items = {q: e for q, e in everyone.items() if is_human(e) and q not in test}
    rng = random.Random(f'ladder-{L}')
    train = list(split(train_items, 20261126).values())
    m, c, hold, val, pairs = learn(train, rng)
    w = rule_weights(train_items, random.Random(f'w-{L}')) if F2 else {}
    gm = gap_model(train, pairs) if F1 else {}
    lam = make_lam(m, c, hold, val, w, gm)
    Ls = [lam(A, B) for A, B in train]; med1, u1 = unit(Ls)
    s1 = lambda x, y: (med1 - lam(x, y)) / u1
    P1 = [s for s in (s1(X, Y) for X, Y in pairs) if s >= 1]; med2, u2 = unit(P1) if len(P1) > 1 else (None, 0)
    P2 = [(s - med2) / u2 for s in P1 if u2 and (s - med2) / u2 >= 1]; med3, u3 = unit(P2) if len(P2) > 1 else (None, 0)
    def level(s):
        if s < 1: return 0
        if not u2: return 1
        t = (s - med2) / u2
        if t < 1: return 1
        if not u3: return 2
        return 3 if (t - med3) / u3 >= 1 else 2
    recs = split(test, 20261125); names = [(q, h) for q in sorted(recs) for h in (0, 1)]
    tl, dc, dn, flagged = {}, [0, 0, 0, 0], 0, []
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            (qa, ha), (qb, hb) = names[i], names[j]
            lv = level(s1(recs[qa][ha], recs[qb][hb]))
            if qa == qb:
                tl[qa] = lv
                if lv >= 2: flagged.append(dict(item=qa, label=test[qa].get('labels', {}).get('en', {}).get('value'), level=lv))
            else: dc[lv] += 1; dn += 1
    surprised = popz.get(L, 0) >= 1
    for q, lv in tl.items():
        pooled_all.setdefault(q, lv)
        if not surprised: pooled_in.setdefault(q, lv)
    rows.append(dict(L=L, name=lname.get(L, L), population_z=round(popz.get(L, 0), 3), population_surprise=surprised,
                     true_surprise=sum(v >= 1 for v in tl.values()), people=len(tl), distinct_surprise=sum(dc[1:]) / dn,
                     distinct_startle=sum(dc[2:]) / dn, stated_power=stated.get(L), v1_power=v1.get(L, {}).get('distinct_surprise'),
                     v1_true_surprise=v1.get(L, {}).get('true_surprise'), true_startle=sum(v >= 2 for v in tl.values()), true_shock=sum(v == 3 for v in tl.values()), flagged=flagged))
    r = rows[-1]
    print(f"{L:7} {r['name'][:13]:13} pop z {r['population_z']:+.2f}{' SURPRISED' if surprised else '          '} true {r['true_surprise']:3}/{r['people']} (v1 {r['v1_true_surprise']})  power {r['distinct_surprise']:.3f} (v1 {r['v1_power']:.3f}, stated {r['stated_power']:.3f})", flush=True)

def cp(k, n):
    T = lambda i, p: math.exp(math.lgamma(n + 1) - math.lgamma(i + 1) - math.lgamma(n - i + 1) + i * math.log(p) + (n - i) * math.log1p(-p))
    def bis(left):
        a, b = 1e-12, 1 - 1e-12
        for _ in range(60):
            mid = (a + b) / 2
            if left(mid): a = mid
            else: b = mid
        return (a + b) / 2
    lo = 0.0 if k == 0 else bis(lambda p: sum(T(i, p) for i in range(k, n + 1)) < 0.05)
    hi = 1.0 if k == n else bis(lambda p: sum(T(i, p) for i in range(0, k + 1)) > 0.05)
    return [lo, hi]
def pool(P):
    k = sum(v >= 1 for v in P.values()); n = len(P)
    return dict(k=k, n=n, rate=k / n if n else None, ci95=cp(k, n) if n else None)
ins = [r for r in rows if not r['population_surprise']]
summary = dict(variant=VARIANT, surprised_populations=[r['name'] for r in rows if r['population_surprise']],
               Q1_pooled_non_surprised=pool(pooled_in), Q1_pooled_all=pool(pooled_all), v1=[0.0686, 0.0615, 0.0763], stated=[0.0345, 0.0294, 0.0402],
               Q2_median_power=statistics.median(r['distinct_surprise'] for r in ins), Q2_ge_stated=sum(r['distinct_surprise'] >= r['stated_power'] for r in ins), Q2_languages=len(ins),
               Q3=dict(true_startle=sum(r['true_startle'] for r in rows), true_shock=sum(r['true_shock'] for r in rows), listed=[f for r in rows for f in r['flagged']]))
json.dump(dict(summary=summary, languages=rows), open(f'ladder2-{VARIANT}.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps(summary, indent=1, ensure_ascii=False))
