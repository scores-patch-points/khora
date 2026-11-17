# books.py — BOOKS-PREREG.md (sha256 386fef27…). Rules and identity learned from edition records alone (Open Library), leave-subject-out.
# usage: python3 -I books.py
import json, glob, re, math, random, statistics, unicodedata, sys
SUBJECTS = ['fiction', 'poetry', 'history', 'science', 'philosophy', 'religion', 'children', 'biography', 'mathematics', 'art']
RELS = ['title_tok', 'author', 'language', 'translated_from', 'publisher', 'year', 'pages', 'format', 'class', 'subject', 'series']

def nfkc(s): return unicodedata.normalize('NFKC', str(s)).lower()
def norm_pub(p): return re.sub(r'\s+', ' ', re.sub(r'[^\w\s]', ' ', nfkc(p))).strip()
def keys(xs): return {x['key'].split('/')[-1] for x in (xs or []) if isinstance(x, dict) and x.get('key')}
def rec(e):
    r = {}
    r['title_tok'] = set(re.findall(r'[^\W_]{2,}', nfkc(e.get('title') or '')))
    r['author'] = keys(e.get('authors'))
    r['language'] = keys(e.get('languages')); r['translated_from'] = keys(e.get('translated_from'))
    r['publisher'] = {norm_pub(p) for p in (e.get('publishers') or []) if isinstance(p, str) and norm_pub(p)}
    m = re.search(r'\b(1[0-9]{3}|20[0-9]{2})\b', str(e.get('publish_date') or '')); r['year'] = {int(m.group(1))} if m else set()
    r['pages'] = {str(e['number_of_pages'])} if isinstance(e.get('number_of_pages'), int) else set()
    r['format'] = {nfkc(e['physical_format'])} if isinstance(e.get('physical_format'), str) else set()
    r['class'] = {'lc:' + nfkc(x) for x in (e.get('lc_classifications') or []) if isinstance(x, str)} | {'dd:' + nfkc(x) for x in (e.get('dewey_decimal_class') or []) if isinstance(x, str)}
    r['subject'] = {nfkc(x) for x in (e.get('subjects') or []) if isinstance(x, str)}
    r['series'] = {nfkc(x) for x in (e.get('series') or []) if isinstance(x, str)}
    return {k: v for k, v in r.items() if v}
DATA = {s: [{'key': w['work'], 'ed': [rec(e) for e in w['editions']]} for w in json.load(open(f'raw/{s}.json'))['works']] for s in SUBJECTS}

def unit(xs):
    med = statistics.median(xs); mad = statistics.median(abs(x - med) for x in xs); return med, 1.4826 * mad
def gap(a, b): return min(abs(x - y) for x in a for y in b)
def learn(train, rng, scramble=False):
    works = [list(w['ed']) for w in train]
    if scramble:
        pool = [e for w in works for e in w]; rng.shuffle(pool); i = 0; new = []
        for w in works: new.append(pool[i:i + len(w)]); i += len(w)
        works = new
    selfp = [tuple(rng.sample(w, 2)) for w in works if len(w) >= 2]
    stra = []
    while len(stra) < len(selfp):
        i, j = rng.sample(range(len(works)), 2); stra.append((rng.choice(works[i]), rng.choice(works[j])))
    both, disj, sb, so, hold, val = {}, {}, {}, {}, {}, {}
    for a, b in selfp:
        for r in set(a) & set(b): both[r] = both.get(r, 0) + 1; disj[r] = disj.get(r, 0) + (not (a[r] & b[r]))
    for a, b in stra:
        for r in set(a) & set(b): sb[r] = sb.get(r, 0) + 1; so[r] = so.get(r, 0) + bool(a[r] & b[r])
    for w in works:
        u = {}
        for e in w:
            for r, vs in e.items(): u.setdefault(r, set()).update(vs)
        for r, vs in u.items():
            hold[r] = hold.get(r, 0) + 1
            for v in vs: val[(r, v)] = val.get((r, v), 0) + 1
    m = {r: (disj.get(r, 0) + 1) / (n + 2) for r, n in both.items()}; c = {r: (so.get(r, 0) + 1) / (n + 2) for r, n in sb.items()}
    gs, gt = [], []
    for a, b in selfp:
        if 'year' in a and 'year' in b: gs.append(gap(a['year'], b['year']))
    for a, b in stra:
        if 'year' in a and 'year' in b: gt.append(gap(a['year'], b['year']))
    G = (max(gs + gt) + 1) if gs and gt else 0
    def term(g):
        g = min(g, G); cs = sum(1 for x in gs if min(x, G) == g); ct = sum(1 for x in gt if min(x, G) == g)
        return math.log2(((cs + 1) / (len(gs) + G + 1)) / ((ct + 1) / (len(gt) + G + 1)))
    return dict(selfp=selfp, stra=stra, m=m, c=c, hold=hold, val=val, gapterm=term if G else None, gs=gs, gt=gt, works=works)

def make_lam(L, drop=(), catyear=False):
    def lam(x, y):
        s, n = 0.0, 0
        for r in set(x) & set(y):
            if r in drop: continue
            if r == 'year' and L['gapterm'] and not catyear: s += L['gapterm'](gap(x[r], y[r])); n += 1; continue
            if r not in L['m'] or r not in L['c']: continue
            n += 1; sh = x[r] & y[r]
            if sh: s += math.log2((1 - L['m'][r]) / min((L['val'].get((r, v), 0) + 1) / (L['hold'][r] + 2) for v in sh))
            else: s += math.log2(L['m'][r] / (1 - L['c'][r]))
        lam.last_n = n; return s
    lam.last_n = 0; return lam
def ladder(L, lam):
    Ls = [lam(a, b) for a, b in L['selfp']]; med1, u1 = unit(Ls)
    st = [lam(a, b) for a, b in L['stra']]; _, ustra = unit(st)
    if u1 == 0: return None
    s1 = lambda x, y: (med1 - lam(x, y)) / u1
    P1 = [s for s in (s1(a, b) for a, b in L['stra']) if s >= 1]
    med2, u2 = unit(P1) if len(P1) > 1 else (None, 0)
    P2 = [(s - med2) / u2 for s in P1 if u2 and (s - med2) / u2 >= 1]; med3, u3 = unit(P2) if len(P2) > 1 else (None, 0)
    def level(s):
        if s < 1: return 0
        if not u2: return 1
        t = (s - med2) / u2
        if t < 1: return 1
        if not u3: return 2
        return 3 if (t - med3) / u3 >= 1 else 2
    return dict(s1=s1, level=level, u1=u1, ustra=ustra, collapsed=u1 < 0.01 * ustra)

def test_pairs(works, rng, per=20):
    true = [(*rng.sample(w['ed'], 2), w['key']) for w in works if len(w['ed']) >= 2]
    dist = []
    for i, w in enumerate(works):
        for _ in range(per):
            j = rng.choice([k for k in range(len(works)) if k != i]); dist.append((rng.choice(w['ed']), rng.choice(works[j]['ed'])))
    return true, dist

def run(variant='main', drop=(), catyear=False, per_subject=False):
    out = {}; rows = []
    for s in SUBJECTS:
        rng = random.Random(f'books-{s}-{variant}')
        train = [w for t in SUBJECTS if (t != s or variant == 'leak') for w in DATA[t]]
        L = learn(train, rng, scramble=(variant == 'scramble')); lam = make_lam(L, drop, catyear); lad = ladder(L, lam)
        if lad is None: out[s] = {'gap': 'unit of the self reference is 0'}; continue
        true, dist = test_pairs(DATA[s], random.Random(f'books-test-{s}'))
        def ev(a, b):
            v = lam(a, b); n = lam.last_n; return lad['level'](lad['s1'](a, b)), n
        T = [(*ev(a, b), a, b) for a, b, _ in true]; D = [(*ev(a, b), a, b) for a, b in dist]
        out[s] = dict(true=len(T), true_surprise=sum(1 for l, _, _, _ in T if l >= 1), true_startle=sum(1 for l, _, _, _ in T if l >= 2), distinct=len(D), distinct_surprise=sum(1 for l, _, _, _ in D if l >= 1),
                      distinct_startle=sum(1 for l, _, _, _ in D if l >= 2), collapsed=lad['collapsed'], u1=round(lad['u1'], 3), ustra=round(lad['ustra'], 3))
        rows.append((s, T, D))
    return out, rows

def cp(k, n):
    T = lambda i, p: math.exp(math.lgamma(n + 1) - math.lgamma(i + 1) - math.lgamma(n - i + 1) + i * math.log(p) + (n - i) * math.log1p(-p))
    def bis(left):
        a, b = 1e-12, 1 - 1e-12
        for _ in range(60):
            mid = (a + b) / 2
            if left(mid): a = mid
            else: b = mid
        return (a + b) / 2
    return (0.0 if k == 0 else bis(lambda p: sum(T(i, p) for i in range(k, n + 1)) < 0.05)), (1.0 if k == n else bis(lambda p: sum(T(i, p) for i in range(0, k + 1)) > 0.05))
def pooled(out):
    ok = [v for v in out.values() if 'gap' not in v]
    kt, nt = sum(v['true_surprise'] for v in ok), sum(v['true'] for v in ok); kd, nd = sum(v['distinct_surprise'] for v in ok), sum(v['distinct'] for v in ok)
    return dict(true=(kt, nt, kt / nt, cp(kt, nt)), distinct=(kd, nd, kd / nd, cp(kd, nd)))

main, rows = run('main')
P = pooled(main)
print('MAIN (leave-subject-out), levels as preregistered:')
for s, v in main.items(): print(f"  {s:12} true surprise {v['true_surprise']:2}/{v['true']}  distinct surprise {v['distinct_surprise']/v['distinct']:.3f}  startle {v['distinct_startle']/v['distinct']:.3f}  unit self {v['u1']} stranger {v['ustra']}{'  COLLAPSED UNIT' if v['collapsed'] else ''}")
print(f"POOLED true pairs at SURPRISE+: {P['true'][0]}/{P['true'][1]} = {P['true'][2]:.3f}  95% [{P['true'][3][0]:.3f}, {P['true'][3][1]:.3f}]")
print(f"POOLED distinct pairs at SURPRISE+: {P['distinct'][0]}/{P['distinct'][1]} = {P['distinct'][2]:.3f}  95% [{P['distinct'][3][0]:.3f}, {P['distinct'][3][1]:.3f}]")

# Q3 evidence strata, Q4 translation
strata = {}
for s, T, D in rows:
    for kind, items in (('true', T), ('distinct', D)):
        for l, n, a, b in items:
            k = min(n, 3); d = strata.setdefault((kind, k), [0, 0]); d[0] += l >= 1; d[1] += 1
print('\nQ3 by number of comparable relations (surprise rate; n):')
for kind in ('true', 'distinct'): print(f"  {kind:9}", '  '.join(f"{k}{'+' if k == 3 else ''}: {strata[(kind, k)][0] / strata[(kind, k)][1]:.3f} (n={strata[(kind, k)][1]})" for k in range(4) if (kind, k) in strata))
zero_dist = strata.get(('distinct', 0), [0, 0])[1] / sum(v[1] for (kd, _), v in strata.items() if kd == 'distinct')
print(f"  distinct pairs with ZERO comparable relations: {zero_dist:.3f}  (prediction 3: >= 0.20)")
trans = {'language_disjoint': [0, 0], 'language_overlap': [0, 0], 'language_unknown': [0, 0]}
for s, T, D in rows:
    for l, n, a, b in T:
        k = 'language_unknown' if not ('language' in a and 'language' in b) else ('language_overlap' if a['language'] & b['language'] else 'language_disjoint'); trans[k][0] += l >= 1; trans[k][1] += 1
print('Q4 true pairs at SURPRISE+ by language relation:', {k: f"{v[0]}/{v[1]} = {v[0] / max(v[1], 1):.3f}" for k, v in trans.items()})

# Q5 drop one relation at a time
print('\nQ5 drop one relation: pooled true@SURPRISE+ / distinct@SURPRISE+ (baseline %.3f / %.3f)' % (P['true'][2], P['distinct'][2]))
drops = {}
for r in RELS:
    o, _ = run('main', drop={r}); Q = pooled(o); drops[r] = (Q['true'][2], Q['distinct'][2]); print(f"  without {r:16} {Q['true'][2]:.3f} / {Q['distinct'][2]:.3f}   (true {Q['true'][2] - P['true'][2]:+.3f}, distinct {Q['distinct'][2] - P['distinct'][2]:+.3f})")

# controls
print('\nControls (pooled true / distinct at SURPRISE+):')
ctl = {}
for name, kw in (('C1 truth scrambled', dict(variant='scramble')), ('C2 year categorical', dict(catyear=True)), ('C3 reference learned from the test subject (leak)', dict(variant='leak'))):
    o, _ = run(**kw); Q = pooled(o); ctl[name] = (Q['true'][2], Q['distinct'][2]); print(f"  {name:50} {Q['true'][2]:.3f} / {Q['distinct'][2]:.3f}")

# Q6 the learned register (all works)
allw = [w for s in SUBJECTS for w in DATA[s]]; L = learn(allw, random.Random('books-register'))
eds = [e for w in allw for e in w['ed']]
print('\nQ6 learned register (all works): relation | coverage of editions | works whose editions ALL agree exactly | all share a value | m_r (a work disjoint from itself) | c_r (strangers overlap)')
reg = {}
for r in RELS:
    cov = sum(1 for e in eds if r in e) / len(eds)
    ws = [[e[r] for e in w['ed'] if r in e] for w in allw]; ws = [x for x in ws if len(x) >= 2]
    same = sum(1 for x in ws if all(v == x[0] for v in x)) / max(len(ws), 1); share = sum(1 for x in ws if set.intersection(*x)) / max(len(ws), 1)
    reg[r] = dict(coverage=round(cov, 3), all_agree=round(same, 3), all_share=round(share, 3), m=round(L['m'].get(r, float('nan')), 3), c=round(L['c'].get(r, float('nan')), 3), works_with_2plus=len(ws))
    print(f"  {r:16} {cov:5.2f} | {same:5.2f} | {share:5.2f} | m {reg[r]['m']:.3f} | c {reg[r]['c']:.3f}   (n works {len(ws)})")
print('  year gap: median among one work\'s editions', statistics.median(L['gs']), '| between strangers', statistics.median(L['gt']), f"| self n={len(L['gs'])} stranger n={len(L['gt'])}")
print('  rule candidates (all editions of a work agree exactly in >= 0.9 of works):', [r for r, v in reg.items() if v['all_agree'] >= 0.9])
json.dump(dict(main=main, pooled={k: v[:3] + (list(v[3]),) for k, v in P.items()}, strata={f'{k[0]}:{k[1]}': v for k, v in strata.items()}, translation=trans, drops=drops, controls=ctl, register=reg), open('books-results.json', 'w'), indent=1)
