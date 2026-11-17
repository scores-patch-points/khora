"""PREREG-SYNAPSE-1 runner. Pure python, no LLM. Usage: python3 -I synapse_exp.py"""
import json, glob, os, random, math, bisect, statistics as st, sys
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
WEFT = os.path.join(HERE, '..', 'novels', 'weft')
W_WIN, R_ROUNDS, RHO, BLOCK, MAXBLK, NSHUF = 3, 4, 0.5, 20, 30, 10

def med(a): return st.median(a) if a else 0.0
def unit(a):
    if not a: return 0.0
    m = med(a); return 1.4826 * med([abs(x - m) for x in a])
def key(i, j): return (i, j) if i < j else (j, i)

def load(f):
    d = json.load(open(f)); offs = [s['offset'] for s in d['sentences']]; T = len(offs)
    pres = [set() for _ in range(T)]
    for ci, c in enumerate(d['cast']):
        for p in c['mentionsAt']:
            t = bisect.bisect_right(offs, p) - 1
            if 0 <= t < T: pres[t].add(ci)
    return T, pres, len(d['cast'])

def window(pres, t): 
    s = set()
    for u in range(max(0, t - W_WIN + 1), t + 1): s |= pres[u]
    return s

def run_trails(pres, T0, T1_train):
    """returns Wbook, per-round dicts n_ij,n_i,N,peak (rounds over [0,Ttr))"""
    # pass 1: Wbook from re-encounter gaps
    last = {}; gaps = []
    for t in range(T1_train):
        w = sorted(window(pres, t))
        for a in range(len(w)):
            for b in range(a + 1, len(w)):
                k = (w[a], w[b])
                if k in last and t - last[k] > W_WIN: gaps.append(t - last[k])
                last[k] = t
    if not gaps: return None
    Wb = med(gaps); rho = 1 - 1 / Wb
    L = T1_train // R_ROUNDS
    rounds = []
    tau = {}; lt = {}
    for r in range(R_ROUNDS):
        lo, hi = r * L, (r + 1) * L if r < R_ROUNDS - 1 else T1_train
        nij = defaultdict(int); ni = defaultdict(int); peak = defaultdict(float)
        for t in range(lo, hi):
            w = sorted(window(pres, t))
            for a in w: ni[a] += 1
            for x in range(len(w)):
                for y in range(x + 1, len(w)):
                    k = (w[x], w[y]); nij[k] += 1
                    v = tau.get(k, 0.0) * (rho ** (t - lt[k])) + 1 if k in tau else 1.0
                    tau[k] = v; lt[k] = t
                    if v > peak[k]: peak[k] = v
        rounds.append((nij, ni, hi - lo, peak))
    return Wb, rounds

def build(rounds):
    """tag/capture/demote. returns dict variant-> {pair: weight}, info"""
    s = defaultdict(float); ntag = defaultdict(int); wt = {}; wt_nd = defaultdict(float); raw = defaultdict(float)
    gaps = []; cand_last = 0
    for r, (nij, ni, N, peak) in enumerate(rounds):
        cred = {k: nij[k] - ni[k[0]] * ni[k[1]] / N for k in nij}
        for k, c in cred.items(): raw[k] += c
        for k in set(s) | set(cred): s[k] = RHO * s[k] + cred.get(k, 0.0)
        cand = list(cred); cand_last = len(cand)
        uc = unit([cred[k] for k in cand]); pk = [peak[k] for k in cand]; up = unit(pk); mp = med(pk)
        tagged = set()
        if len(cand) < 3 or uc == 0 or up == 0: gaps.append((r, 'round_gap'))
        else:
            for k in cand:
                if s[k] > uc and peak[k] > mp + up: tagged.add(k); ntag[k] += 1
        for k in list(wt): wt[k] *= RHO
        for k in tagged:
            if ntag[k] >= 2: wt[k] = wt.get(k, 0.0) * (1.0) + max(cred[k], 0.0) if k in wt else max(cred[k], 0.0)
            wt_nd[k] += max(cred[k], 0.0)
        if len(wt) >= 3:
            ws = list(wt.values()); lo = med(ws) - unit(ws)
            for k in [k for k, v in wt.items() if v < lo]: del wt[k]
        elif wt: gaps.append((r, 'demote_gap'))
    nd = {k: v for k, v in wt_nd.items() if ntag[k] >= 2 and v > 0}
    return {'real': {k: v for k, v in wt.items() if v > 0}, 'nodemote': nd, 'raw': {k: v for k, v in raw.items() if v > 0}}, {'gaps': gaps, 'cand_last': cand_last}

def normalise(E):
    S = defaultdict(float)
    for (i, j), w in E.items(): S[i] += w; S[j] += w
    adj = defaultdict(dict)
    for (i, j), w in E.items():
        v = w / math.sqrt(S[i] * S[j]); adj[i][j] = v; adj[j][i] = v
    return adj

def complete(adj, cue, stats=None):
    x = set(cue); seen = []
    for _ in range(20):
        h = defaultdict(float)
        for i in x:
            for j, v in adj.get(i, {}).items():
                if j not in x: h[j] += v
        # field over nodes not in x, but the clamped cue stays; nodes already active must keep support
        for i in list(x):
            if i in cue: continue
            h[i] = sum(adj[i].get(j, 0) for j in x if j != i)
        vals = [v for v in h.values() if v > 0]
        if not vals: nx = set(cue)
        else:
            m = med(vals); u = unit(vals)
            thr = m + u
            if u == 0 and stats is not None: stats['flat'] = stats.get('flat', 0) + 1
            nx = set(cue) | {j for j, v in h.items() if v > thr}
        if nx == x: return x
        if nx in seen:
            if stats is not None: stats['cycle'] = stats.get('cycle', 0) + 1
            return nx
        seen.append(x); x = nx
    if stats is not None: stats['cycle'] = stats.get('cycle', 0) + 1
    return x

def rewire(E, rng):
    edges = list(E); ws = [E[e] for e in edges]; rng.shuffle(ws)
    es = set(edges); lst = list(edges); n = len(lst)
    for _ in range(10 * n):
        a, b = rng.randrange(n), rng.randrange(n)
        (p, q), (r_, s_) = lst[a], lst[b]
        if rng.random() < 0.5: r_, s_ = s_, r_
        if len({p, q, r_, s_}) < 4: continue
        n1, n2 = key(p, r_), key(q, s_)
        if n1 in es or n2 in es: continue
        es.discard(lst[a]); es.discard(lst[b]); es.add(n1); es.add(n2); lst[a], lst[b] = n1, n2
    return {e: w for e, w in zip(lst, ws)}

def f1(c, tgt):
    if not c or not tgt: return 0.0
    tp = len(c & tgt)
    if tp == 0: return 0.0
    p, r = tp / len(c), tp / len(tgt); return 2 * p * r / (p + r)
def jac(a, b): return len(a & b) / len(a | b) if (a | b) else 1.0
def gini(v):
    v = sorted(v); n = len(v)
    if n == 0 or sum(v) == 0: return 0.0
    return sum((2 * i - n + 1) * x for i, x in enumerate(v)) / (n * sum(v))

def basins(adj, E, rng, cap=300):
    edges = list(E); rng.shuffle(edges); edges = edges[:cap]
    comps = []
    for (i, j) in edges:
        c = complete(adj, {i, j})
        if len(c) >= 3: comps.append((c, (i, j)))
    cl = []
    for c, e in comps:
        for g in cl:
            if jac(g['A'], c) >= 0.8: g['edges'].append(e); break
        else: cl.append({'A': c, 'edges': [e]})
    return cl, comps

def sign_p(diffs):
    d = [x for x in diffs if x != 0]; n = len(d)
    if n == 0: return 1.0, 0, 0
    k = sum(1 for x in d if x > 0); m = min(k, n - k)
    p = min(1.0, 2 * sum(math.comb(n, i) for i in range(m + 1)) / 2 ** n)
    return p, k, n - k

def book(f, seed):
    rng = random.Random(seed)
    T, pres, nc = load(f); Ttr = (2 * T) // 3
    out = {'book': os.path.basename(f)[:8], 'T': T, 'cast': nc}
    tr = run_trails(pres, 0, Ttr)
    if tr is None: out['gap'] = 'no_reencounter_gaps'; return out
    Wb, rounds = tr; out['Wbook'] = Wb
    G, info = build(rounds); out['typed_gaps'] = info['gaps']
    E = G['real']; out['n_syn'] = len(E); out['n_cand_r4'] = info['cand_last']; out['syn_frac'] = len(E) / max(1, info['cand_last'])
    out['n_nodrop'] = len(G['nodemote']); out['n_raw'] = len(G['raw'])
    if len(E) < 3: out['gap'] = 'fewer_than_3_synapses'; return out
    adj = normalise(E); nodes = set(adj)
    wdeg = defaultdict(float)
    for (i, j), w in E.items(): wdeg[i] += w; wdeg[j] += w
    out['gini'] = gini(list(wdeg.values())); out['nodes'] = len(nodes)
    nulls = [rewire(E, rng) for _ in range(NSHUF)]; nadj = [normalise(x) for x in nulls]
    # block scoring
    freq = defaultdict(int)
    for t in range(Ttr):
        for c in pres[t]: freq[c] += 1
    blocks = [(a, a + BLOCK) for a in range(Ttr, T - BLOCK + 1, BLOCK)]
    rng.shuffle(blocks); cues = []; mem_in = []; mem_all = []
    for (a, b) in blocks:
        mem = set().union(*[pres[t] for t in range(a, b)])
        mem_all.append(len(mem)); mem_in.append(len(mem & nodes))
        cp = []
        for t in range(a, b):
            w = sorted(window(pres, t) & nodes)
            cp += [(w[x], w[y]) for x in range(len(w)) for y in range(x + 1, len(w))]
        cp = sorted(set(cp))
        if not cp: continue
        cue = set(rng.choice(cp)); tg = (mem & nodes) - cue
        if len(tg) >= 2: cues.append((cue, tg))
        if len(cues) >= MAXBLK: break
    out['n_cues'] = len(cues); out['member_in_graph'] = sum(mem_in) / max(1, sum(mem_all))
    if len(cues) < 3: out['gap'] = 'fewer_than_3_cues'; return out
    stats = {}
    adjs = {'real': adj, 'nodemote': normalise(G['nodemote']) if G['nodemote'] else {}, 'raw': normalise(G['raw'])}
    F = {k: [] for k in ['real', 'null', 'freq', 'raw']}; STAB = {k: {'real': [], 'null': []} for k in (0.1, 0.2, 0.4)}; empt = 0
    for cue, tg in cues:
        c0 = complete(adj, cue, stats); m = len(c0 - cue)
        if m == 0: empt += 1
        F['real'].append(f1(c0 - cue, tg))
        F['null'].append(sum(f1(complete(na, cue) - cue, tg) for na in nadj) / NSHUF)
        top = sorted((n for n in nodes if n not in cue), key=lambda n: (-freq[n], n))[:m]
        F['freq'].append(f1(set(top), tg))
        ra = adjs['raw']; F['raw'].append(f1(complete(ra, cue) - cue, tg) if cue <= set(ra) else 0.0)
        for kfrac in STAB:
            for tag, Eg, a0 in (('real', E, adj), ('null', nulls[0], nadj[0])):
                cc = complete(a0, cue)
                if len(cc - cue) == 0: continue
                js = []
                for _ in range(10):
                    el = list(Eg); rng.shuffle(el); keep = {e: Eg[e] for e in el[int(len(el) * kfrac):]}
                    js.append(jac(complete(normalise(keep), cue), cc))
                STAB[kfrac][tag].append(sum(js) / len(js))
    for k in F: out['F_' + k] = sum(F[k]) / len(F[k])
    out['empty_completions'] = empt / len(cues); out['gaps_dyn'] = stats
    for kfrac in STAB:
        for tag in ('real', 'null'): out[f'stab{int(kfrac*100)}_{tag}'] = (sum(STAB[kfrac][tag]) / len(STAB[kfrac][tag])) if STAB[kfrac][tag] else None
    # basins
    allblocks = [(a, a + BLOCK) for a in range(0, T - BLOCK + 1, BLOCK)]
    bm = [set().union(*[pres[t] for t in range(a, b)]) for a, b in allblocks]
    def spur(cl):
        if not cl: return None
        s = sum(1 for g in cl if max(len(g['A'] & m_) / len(g['A']) for m_ in bm) < 0.5); return s / len(cl)
    def binv(cl, comps):
        vals = []
        for g in cl:
            ins = [c for c, e in comps if e[0] in g['A'] and e[1] in g['A']]
            if ins: vals.append(sum(1 for c in ins if jac(c, g['A']) >= 0.8) / len(ins))
        return sum(vals) / len(vals) if vals else None
    cl, comps = basins(adj, E, rng)
    ncl, ncomps = [], []
    for na, nE in zip(nadj[:3], nulls[:3]):
        a, b = basins(na, nE, rng); ncl.append(a); ncomps.append(b)
    out['basins_real'] = len(cl); out['basins_null'] = sum(len(x) for x in ncl) / 3
    out['giant_real'] = max([len(g['A']) for g in cl], default=0) / len(nodes)
    out['giant_null'] = sum(max([len(g['A']) for g in x], default=0) for x in ncl) / 3 / len(nodes)
    out['spur_real'] = spur(cl)
    sn = [spur(x) for x in ncl if x]; out['spur_null'] = sum(sn) / len(sn) if sn else None
    out['invar_real'] = binv(cl, comps)
    iv = [binv(a, b) for a, b in zip(ncl, ncomps) if a]; iv = [v for v in iv if v is not None]; out['invar_null'] = sum(iv) / len(iv) if iv else None
    # forgetting: held-out edge precision
    cop = set()
    for t in range(Ttr, T):
        w = sorted(window(pres, t))
        for x in range(len(w)):
            for y in range(x + 1, len(w)): cop.add((w[x], w[y]))
    for k, nm in (('real', 'prec_demote'), ('nodemote', 'prec_nodemote'), ('raw', 'prec_raw')):
        Eg = G[k]; out[nm] = sum(1 for e in Eg if e in cop) / len(Eg) if Eg else None
    return out

if __name__ == '__main__':
    files = sorted(glob.glob(os.path.join(WEFT, '*.weft.json'))); res = []
    for n, f in enumerate(files):
        r = book(f, 1000 + n); res.append(r); print(json.dumps(r, default=str)[:400], flush=True)
    json.dump(res, open(os.path.join(HERE, 'results.json'), 'w'), indent=1, default=str)
    ok = [r for r in res if 'gap' not in r]
    def cmp(a, b, label):
        d = [r[a] - r[b] for r in ok if r.get(a) is not None and r.get(b) is not None]
        p, up, dn = sign_p(d); print(f'{label}: books={len(d)} up={up} down={dn} mean_diff={sum(d)/max(1,len(d)):.4f} median_diff={med(d):.4f} p={p:.4f}')
    print('\nBooks excluded:', [(r['book'], r.get('gap')) for r in res if 'gap' in r])
    sf = [r['syn_frac'] for r in res if 'syn_frac' in r]; print('H1 median synapse fraction', med(sf), 'books with >=1 basin', sum(1 for r in ok if r.get('basins_real', 0) >= 1), 'of', len(res))
    cmp('F_real', 'F_null', 'H2a F1 real-null'); cmp('F_real', 'F_freq', 'H2b F1 real-freq'); cmp('F_real', 'F_raw', 'H2c F1 real-raw')
    for k in (10, 20, 40): 
        d = [r[f'stab{k}_real'] - r[f'stab{k}_null'] for r in ok if r.get(f'stab{k}_real') is not None and r.get(f'stab{k}_null') is not None]
        p, up, dn = sign_p(d); print(f'H3 stab k={k}%: books={len(d)} up={up} down={dn} mean_diff={sum(d)/max(1,len(d)):.4f} p={p:.4f}')
    cmp('prec_demote', 'prec_nodemote', 'H4 held-out edge precision demote-nodemote')
    cmp('spur_null', 'spur_real', 'H5 spurious fraction null-real (positive = real lower)')
    cmp('giant_null', 'giant_real', 'giant-basin fraction null-real')
    cmp('invar_real', 'invar_null', 'cue-invariance real-null')
    for k in ('F_real', 'F_null', 'F_freq', 'F_raw', 'empty_completions', 'member_in_graph', 'gini', 'syn_frac', 'n_syn', 'basins_real', 'basins_null', 'giant_real', 'giant_null', 'spur_real', 'spur_null', 'prec_demote', 'prec_nodemote', 'prec_raw'):
        v = [r[k] for r in ok if r.get(k) is not None]; print(f'  mean {k} = {sum(v)/max(1,len(v)):.4f} (n={len(v)})')
