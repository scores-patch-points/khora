# learn-rules.py — LEARN-PREREG.md (sha256 63aa534d…). Rules learned from people's records; stated rules used only to score.
# usage: python3 -I learn-rules.py
import json, glob, random, statistics, math

ENT = sorted(glob.glob('../omni/ent/*.json'))
PROPS = json.load(open('../omni/property-constraints.json'))
rng = random.Random(20261117)

def norm(snak):
    if snak.get('snaktype') != 'value' or 'datavalue' not in snak: return None, None
    t, v = snak['datavalue']['type'], snak['datavalue']['value']
    if t == 'wikibase-entityid': return v['id'], None
    if t == 'string': return v, None
    if t == 'monolingualtext': return v['text'], None
    if t == 'quantity': return 'q:' + str(float(v['amount'])), None
    if t == 'time':
        if v['precision'] < 9: return None, None
        y = int(v['time'][:v['time'].index('-', 1)])
        return 'y:' + str(y), y
    return None, None

# people, each once
people = {}
for f in ENT:
    for q, e in json.load(open(f)).items():
        if q in people: continue
        if 'Q5' not in [c['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for c in e.get('claims', {}).get('P31', [])]: continue
        people[q] = e

def member_values(e, P):
    vals = {}
    for c in e.get('claims', {}).get(P, []):
        if c.get('rank') == 'deprecated': continue
        v, y = norm(c['mainsnak'])
        if v is None: continue
        refs = frozenset(r.get('hash') for r in c.get('references', []) if r.get('hash'))
        cur = vals.setdefault(v, {'year': y, 'preferred': False, 'refs': set()})
        cur['preferred'] |= c.get('rank') == 'preferred'
        cur['refs'] |= refs
    return vals

by_prop = {}
for q, e in people.items():
    for P in e.get('claims', {}):
        mv = member_values(e, P)
        if mv: by_prop.setdefault(P, []).append(mv)

def median_random_gap(members):
    ys = [v['year'] for m in members for v in m.values() if v['year'] is not None]
    if len(ys) < 2: return None
    return statistics.median(abs(rng.choice(ys) - rng.choice(ys)) for _ in range(2000))

def classify(P, members, gap):
    single = dispute = plural = 0; why = {'a_preferred': 0, 'b_close_years': 0, 'c_own_sources': 0}
    for m in members:
        if len(m) == 1: single += 1; continue
        vs = list(m.values())
        a = sum(1 for v in vs if v['preferred']) == 1
        ys = [v['year'] for v in vs if v['year'] is not None]
        b = gap is not None and len(ys) == len(vs) and (max(ys) - min(ys)) <= gap
        allrefs = [v['refs'] for v in vs]
        c = all(allrefs) and all(not (allrefs[i] & allrefs[j]) for i in range(len(vs)) for j in range(i + 1, len(vs)))
        if a or b or c:
            dispute += 1
            why['a_preferred'] += a; why['b_close_years'] += b; why['c_own_sources'] += c
        else: plural += 1
    n = single + dispute + plural
    return dict(n=n, single=single, dispute=dispute, plural=plural, S=(single + dispute) / n, epsilon=dispute / n,
                single_share=single / n, why=why)

def beta_ci(a, b):  # 95% equal-tailed interval of Beta(a, b) by simulation (seeded)
    xs = sorted(rng.betavariate(a, b) for _ in range(4000)); return xs[100], xs[3899]

def stated(P):
    ts = {c['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for c in PROPS.get(P, {}).get('claims', {}).get('P2302', [])}
    if not ts or ts == {None}: return None
    return 1 if ts & {'Q19474404', 'Q52060874'} else 0

def auc(scores, labels):
    pos = [s for s, l in zip(scores, labels) if l == 1]; neg = [s for s, l in zip(scores, labels) if l == 0]
    if not pos or not neg: return None
    wins = sum((p > n) + 0.5 * (p == n) for p in pos for n in neg)
    return wins / (len(pos) * len(neg))

register = {}
for P, members in by_prop.items():
    if len(members) < 30: continue
    gap = median_random_gap(members) if PROPS.get(P, {}).get('datatype') == 'time' else None
    r = classify(P, members, gap)
    lo, hi = beta_ci(r['single'] + r['dispute'] + 1, r['plural'] + 1)
    register[P] = dict(r, label=PROPS.get(P, {}).get('labels', {}).get('en', {}).get('value'), datatype=PROPS.get(P, {}).get('datatype'),
                       S_ci=[round(lo, 4), round(hi, 4)], median_random_year_gap=gap, stated=stated(P))

def evaluate(reg, ident):
    rows = [(P, r) for P, r in reg.items() if r['stated'] is not None and ((r['datatype'] == 'external-id') == ident)]
    labels = [r['stated'] for _, r in rows]
    return rows, labels, auc([r['S'] for _, r in rows], labels), auc([r['single_share'] for _, r in rows], labels)

out = {'people': len(people), 'eligible_properties': len(register)}
for ident in (False, True):
    rows, labels, aS, a1 = evaluate(register, ident)
    key = 'external_ids' if ident else 'non_identifiers'
    out[key] = dict(properties=len(rows), stated_one_valued=sum(labels), stated_plural=len(labels) - sum(labels), AUC_S=aS, AUC_single_share=a1)
    if not ident:
        # K1: label shuffle
        sh = []
        for _ in range(1000):
            L = labels[:]; rng.shuffle(L); sh.append(auc([r['S'] for _, r in rows], L))
        sh.sort(); out[key]['K1_shuffled_AUC_95th'] = sh[949]
        # L3: dispute share among multi members, one-valued vs plural, bootstrap over members
        one = [(r['dispute'], r['dispute'] + r['plural']) for _, r in rows if r['stated'] == 1]
        pl = [(r['dispute'], r['dispute'] + r['plural']) for _, r in rows if r['stated'] == 0]
        def expand(pairs): return [1] * sum(d for d, _ in pairs) + [0] * sum(m - d for d, m in pairs)
        A, B = expand(one), expand(pl)
        diffs = []
        for _ in range(1000):
            a = [rng.choice(A) for _ in A]; b = [rng.choice(B) for _ in B]
            diffs.append(sum(a) / len(a) - sum(b) / len(b))
        diffs.sort()
        out[key]['L3'] = dict(dispute_share_one_valued=sum(A) / len(A) if A else None, multi_members_one_valued=len(A),
                              dispute_share_plural=sum(B) / len(B) if B else None, multi_members_plural=len(B),
                              diff=(sum(A) / len(A) - sum(B) / len(B)) if A and B else None, ci95=[diffs[25], diffs[974]])
        out[key]['properties_detail'] = sorted([dict(P=P, label=r['label'], stated=r['stated'], n=r['n'], S=round(r['S'], 3), S_ci=r['S_ci'], single_share=round(r['single_share'], 3),
                                                     epsilon=round(r['epsilon'], 4), dispute=r['dispute'], plural=r['plural'], why=r['why']) for P, r in rows], key=lambda x: -x['S'])
# K2: deal values at random across members of each property (keep counts); recompute
rand_reg = {}
for P, members in by_prop.items():
    if len(members) < 30: continue
    pool = [v for m in members for v in m.items()]; rng.shuffle(pool)
    dealt, i = [], 0
    for m in members:
        d = {}
        for _ in range(len(m)):
            k, v = pool[i]; i += 1
            d[k + '#' + str(i)] = v  # keep the count, even when the same value is dealt twice
        dealt.append(d)
    gap = median_random_gap(members) if PROPS.get(P, {}).get('datatype') == 'time' else None
    rand_reg[P] = dict(classify(P, dealt, gap), stated=stated(P), datatype=PROPS.get(P, {}).get('datatype'))
rows, labels, aS, _ = evaluate(rand_reg, False)
out['K2_dealt_at_random'] = dict(AUC_S=aS, close_year_disputes=sum(r['why']['b_close_years'] for _, r in rows),
                                 close_year_disputes_observed=sum(r['why']['b_close_years'] for P, r in register.items() if r['datatype'] != 'external-id' and r['stated'] is not None))
nonid = out['non_identifiers']
out['verdict'] = dict(L1=nonid['AUC_S'] is not None and nonid['AUC_S'] >= 0.80, L2=nonid['AUC_S'] > nonid['AUC_single_share'],
                      L3=nonid['L3']['diff'] is not None and nonid['L3']['diff'] >= 0.20 and nonid['L3']['ci95'][0] > 0,
                      K1=nonid['AUC_S'] > nonid['K1_shuffled_AUC_95th'],
                      K2_close_years_fell=out['K2_dealt_at_random']['close_year_disputes'] < out['K2_dealt_at_random']['close_year_disputes_observed'])
json.dump(register, open('learned-register.json', 'w'), indent=1, ensure_ascii=False)
json.dump(out, open('learn-results.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in out.items() if k != 'non_identifiers'} | {'non_identifiers': {k: v for k, v in nonid.items() if k != 'properties_detail'}}, indent=1, ensure_ascii=False))
