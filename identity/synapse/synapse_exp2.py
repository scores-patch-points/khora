"""PREREG-SYNAPSE-2 runner. Needs kinds/*.json from kinds.mjs. Pure python. Reuses synapse_exp.py (same seeds)."""
import json, glob, os, random, math
from collections import defaultdict, deque
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import synapse_exp as S
HERE = S.HERE
def bfs(adj, src):
    d = {src: 0}; q = deque([src])
    while q:
        u = q.popleft()
        for v in adj.get(u, ()):
            if v not in d: d[v] = d[u] + 1; q.append(v)
    return d
def complete_cost(adj, cue):
    x = set(cue); seen = []; reads = 0
    for _ in range(20):
        h = defaultdict(float)
        for i in x:
            reads += len(adj.get(i, {}))
            for j, v in adj.get(i, {}).items():
                if j not in x: h[j] += v
        for i in list(x):
            if i in cue: continue
            h[i] = sum(adj[i].get(j, 0) for j in x if j != i)
        vals = [v for v in h.values() if v > 0]
        if not vals: nx = set(cue)
        else:
            m = S.med(vals); u = S.unit(vals); nx = set(cue) | {j for j, v in h.items() if v > m + u}
        if nx == x: return x, reads
        if nx in seen: return nx, reads
        seen.append(x); x = nx
    return x, reads
def sim(P, a, b):
    A, B = P.get(a), P.get(b)
    if not A or not B: return None
    return len(A & B) / len(A | B)
def binding(P, A, universe):
    T = [x for x in A if P.get(x)]
    if len(T) < 3: return None
    rest = [y for y in universe if y not in A and P.get(y)]
    if not rest: return None
    ins = [sim(P, T[i], T[j]) for i in range(len(T)) for j in range(i + 1, len(T))]
    bd = [sim(P, x, y) for x in T for y in rest]
    return sum(ins) / len(ins) - sum(bd) / len(bd)
def admitted(P, A, universe, rng):
    T = [x for x in A if P.get(x)]
    b = binding(P, A, universe)
    if b is None: return None
    pool = [y for y in universe if P.get(y)]
    if len(pool) < len(T) + 1: return None
    ex = 0
    for _ in range(200):
        s = set(rng.sample(pool, len(T)))
        bs = binding(P, s, universe)
        if bs is not None and bs >= b: ex += 1
    return (ex + 1) / 201 <= 0.05

def book(f, seed):
    rng = random.Random(seed); name = os.path.basename(f)[:8]
    T, pres, nc = S.load(f); Ttr = (2 * T) // 3
    out = {'book': name}
    tr = S.run_trails(pres, 0, Ttr)
    if tr is None: out['gap'] = 'no_gaps'; return out
    G, info = S.build(tr[1]); E = G['real']
    if len(E) < 3: out['gap'] = 'fewer_than_3_synapses'; return out
    adj = S.normalise(E); nodes = set(adj)
    kd = json.load(open(os.path.join(HERE, 'kinds', name + '.json')))
    P = {int(i): set(s) for i, s in kd['profiles'].items()}
    nulls = [S.rewire(E, rng) for _ in range(S.NSHUF)]
    # G_dir: same-sentence co-presence in train
    gd = defaultdict(set)
    for t in range(Ttr):
        w = sorted(pres[t])
        for a in range(len(w)):
            for b in range(a + 1, len(w)): gd[w[a]].add(w[b]); gd[w[b]].add(w[a])
    def plus(edges):
        g = defaultdict(set)
        for k, v in gd.items(): g[k] = set(v)
        for (a, b) in edges: g[a].add(b); g[b].add(a)
        return g
    g_syn = plus(E); g_nulls = [plus(n) for n in nulls]
    blocks = [(a, a + S.BLOCK) for a in range(Ttr, T - S.BLOCK + 1, S.BLOCK)]; rng.shuffle(blocks)
    pairs = set()
    for (a, b) in blocks[:S.MAXBLK]:
        mem = sorted(set().union(*[pres[t] for t in range(a, b)]) & nodes)
        for x in range(len(mem)):
            for y in range(x + 1, len(mem)): pairs.add((mem[x], mem[y]))
    pairs = sorted(pairs)
    out['n_pairs'] = len(pairs)
    if len(pairs) < 10: out['gap'] = 'fewer_than_10_pairs'; return out
    INF = 10 ** 6; cache = {}
    def dist(g, key, a, b):
        k = (key, a)
        if k not in cache: cache[k] = bfs(g, a)
        return cache[k].get(b, INF)
    def shortened(pair_list):
        sh = 0; shn = 0.0
        for (a, b) in pair_list:
            d0 = dist(gd, 'base', a, b)
            if dist(g_syn, 'syn', a, b) < d0: sh += 1
            shn += sum(1 for i, gn in enumerate(g_nulls) if dist(gn, ('n', i), a, b) < d0) / len(g_nulls)
        return sh / len(pair_list), shn / len(pair_list)
    out['E1_real'], out['E1_null'] = shortened(pairs)
    nonedge = [p for p in pairs if p not in E]
    out['n_nonedge'] = len(nonedge)
    if len(nonedge) >= 10: out['E1b_real'], out['E1b_null'] = shortened(nonedge)
    # completion cost / efficiency
    freqcues = []
    for (a, b) in blocks[:S.MAXBLK]:
        mem = set().union(*[pres[t] for t in range(a, b)]) & nodes
        cp = []
        for t in range(a, b):
            w = sorted(S.window(pres, t) & nodes); cp += [(w[x], w[y]) for x in range(len(w)) for y in range(x + 1, len(w))]
        cp = sorted(set(cp))
        if cp:
            cue = set(rng.choice(cp)); tg = mem - cue
            if len(tg) >= 2: freqcues.append((cue, tg))
    if len(freqcues) >= 3:
        rawadj = S.normalise(G['raw']); nadj = [S.normalise(n) for n in nulls]
        def eff(a_list):
            f = r = 0.0
            for cue, tg in freqcues:
                tot_f = tot_r = 0
                for ad in a_list:
                    if not (cue <= set(ad)): continue
                    c, rd = complete_cost(ad, cue); f += S.f1(c - cue, tg); r += rd
            return 1000 * f / r if r else None
        out['E2_real'] = eff([adj]); out['E2_raw'] = eff([rawadj]); out['E2_null'] = eff(nadj)
        out['cost_real'] = None
    # kinds: admission of basins
    universe = [n for n in nodes]
    def adm_share(a, E_, seed2):
        cl, _ = S.basins(a, E_, random.Random(seed2))
        r2 = random.Random(seed2 + 1); res = [admitted(P, g['A'], universe, r2) for g in cl]
        gaps = sum(1 for x in res if x is None); tested = [x for x in res if x is not None]
        return (sum(tested) / len(tested) if tested else None), len(cl), gaps
    out['K1_real'], out['basins'], out['basin_gaps'] = adm_share(adj, E, seed)
    ns = [adm_share(S.normalise(n), n, seed + 10 + i) for i, n in enumerate(nulls[:3])]
    nv = [x[0] for x in ns if x[0] is not None]; out['K1_null'] = sum(nv) / len(nv) if nv else None
    # kernel kinds homophily
    kind_of = {}
    for k in kd['kinds']:
        for m in k['memberRefs']: kind_of[int(m[1:])] = k['kindKey']
    both = [e for e in E if e[0] in kind_of and e[1] in kind_of]
    out['n_kind_edges'] = len(both)
    if len(both) >= 3:
        out['K2_real'] = sum(1 for a, b in both if kind_of[a] == kind_of[b]) / len(both)
        nh = []
        for n in nulls:
            bb = [e for e in n if e[0] in kind_of and e[1] in kind_of]
            if bb: nh.append(sum(1 for a, b in bb if kind_of[a] == kind_of[b]) / len(bb))
        out['K2_null'] = sum(nh) / len(nh) if nh else None
    # edge labels and d_base of intra vs bridge (profile-affinity kinds are not per-edge; use kernel kinds + untested)
    lab = {'intra': 0, 'bridge': 0, 'untested': 0}
    di = []; db = []
    for (a, b) in E:
        if a in kind_of and b in kind_of:
            same = kind_of[a] == kind_of[b]; lab['intra' if same else 'bridge'] += 1
            d0 = bfs(gd, a).get(b, INF); (di if same else db).append(min(d0, 50))
        else: lab['untested'] += 1
    out['edge_labels'] = lab; out['dbase_intra'] = sum(di) / len(di) if di else None; out['dbase_bridge'] = sum(db) / len(db) if db else None
    # share of synapse edges that are already adjacent in G_dir (no shortcut possible)
    out['edge_already_adjacent'] = sum(1 for (a, b) in E if b in gd.get(a, ())) / len(E)
    return out

if __name__ == '__main__':
    files = sorted(glob.glob(os.path.join(S.WEFT, '*.weft.json'))); res = []
    for n, f in enumerate(files):
        r = book(f, 1000 + n); res.append(r); print(json.dumps(r, default=str)[:420], flush=True)
    json.dump(res, open(os.path.join(HERE, 'results2.json'), 'w'), indent=1, default=str)
    ok = [r for r in res if 'gap' not in r]
    def cmp(a, b, label):
        d = [r[a] - r[b] for r in ok if r.get(a) is not None and r.get(b) is not None]
        p, up, dn = S.sign_p(d); print(f'{label}: books={len(d)} up={up} down={dn} mean_diff={sum(d)/max(1,len(d)):.4f} p={p:.4f}')
    print('\nusable books', len(ok), 'of', len(res), 'excluded', [(r['book'], r['gap']) for r in res if 'gap' in r])
    cmp('E1_real', 'E1_null', 'E1 share shortened real-null'); cmp('E1b_real', 'E1b_null', 'E1b non-edge pairs real-null')
    cmp('E2_real', 'E2_raw', 'E2 F1/1000 reads real-raw'); cmp('E2_real', 'E2_null', 'E2 (extra) real-null')
    cmp('K1_real', 'K1_null', 'K1 basin admitted share real-null'); cmp('K2_real', 'K2_null', 'K2 homophily real-null')
    for k in ('E1_real', 'E1_null', 'E1b_real', 'E1b_null', 'E2_real', 'E2_raw', 'E2_null', 'K1_real', 'K1_null', 'K2_real', 'K2_null', 'edge_already_adjacent', 'dbase_intra', 'dbase_bridge', 'n_kind_edges', 'basin_gaps', 'basins'):
        v = [r[k] for r in ok if r.get(k) is not None]; print(f'  mean {k} = {sum(v)/max(1,len(v)):.4f} (n={len(v)})')
    lab = defaultdict(int)
    for r in ok:
        for k, v in r['edge_labels'].items(): lab[k] += v
    print('edge labels (kernel kinds):', dict(lab))
