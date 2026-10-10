# POST-HOC (not pre-registered; written after confirm-result.json existed). Python standard library only; reads confirm-result.json and results/atlas/*.json.
import json, glob, math, statistics as st, itertools
R = json.load(open('confirm-result.json')); S = {x['id']: x for x in R['siblings']}
def ranks(xs):
    ix = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0]*len(xs); i = 0
    while i < len(ix):
        j = i
        while j+1 < len(ix) and xs[ix[j+1]] == xs[ix[i]]: j += 1
        for k in range(i, j+1): r[ix[k]] = (i+j)/2+1
        i = j+1
    return r
def sp(a, b):
    ra, rb = ranks(a), ranks(b); n = len(a); ma, mb = sum(ra)/n, sum(rb)/n
    sab = sum((x-ma)*(y-mb) for x, y in zip(ra, rb)); saa = sum((x-ma)**2 for x in ra); sbb = sum((y-mb)**2 for y in rb); return sab/math.sqrt(saa*sbb)
out = {}
ud = [x for x in R['siblings'] if x['kind'] == 'treebank' and x['mwtShare'] is not None]
out['ud_mwt'] = {'n': len(ud), 'rho_vbar_vs_mwtShare': round(sp([x['vbar'] for x in ud], [x['mwtShare'] for x in ud]), 3), 'rho_vbar_vs_meanUnit': round(sp([x['vbar'] for x in ud], [x['meanUnit'] for x in ud]), 3)}
atlas = json.load(open('../atlas/cd-smiles-pubchem.json'))['halves']
za = [atlas['discover']['comp.rigidL']['z'], atlas['confirm']['comp.rigidL']['z']]; zs = [S['rl-smiles-pubchem-heldout']['discover']['z'], S['rl-smiles-pubchem-heldout']['confirm']['z']]
out['pubchem_pooled'] = {'atlas_z': za, 'sibling_z': zs, 'stouffer_atlas_two_halves': sum(za)/math.sqrt(2), 'stouffer_sibling_two_halves': sum(zs)/math.sqrt(2), 'stouffer_all_four_halves': (sum(za)+sum(zs))/2,
  'v_minus_null_all_four_halves': [atlas['discover']['comp.rigidL']['v']-atlas['discover']['comp.rigidL']['nullMean'], atlas['confirm']['comp.rigidL']['v']-atlas['confirm']['comp.rigidL']['nullMean'], S['rl-smiles-pubchem-heldout']['discover']['v']-S['rl-smiles-pubchem-heldout']['discover']['nullMean'], S['rl-smiles-pubchem-heldout']['confirm']['v']-S['rl-smiles-pubchem-heldout']['confirm']['nullMean']],
  'eligL_sibling_halves': S['rl-smiles-pubchem-heldout']['eligL'], 'tokens_sibling': S['rl-smiles-pubchem-heldout']['tokens'], 'tokens_atlas': 166163}
code = [x for x in R['siblings'] if x['pool'] == 'code']
out['code'] = {'sibling_median_vbar': round(st.median([x['vbar'] for x in code]), 4), 'atlas_code_median': 0.1838, 'by_id': {x['id']: round(x['vbar'], 4) for x in code}, 'ratio_median': round(st.median([x['ratio'] for x in code]), 3), 'n_below_pool_median': sum(1 for x in code if x['vbar'] < 0.1838)}
at = {}
for f in glob.glob('../atlas/cd-e09-*.json')+glob.glob('../atlas/cd-cc-javascript.json')+glob.glob('../atlas/cd-cc-python.json')+glob.glob('../atlas/cd-cc-typescript.json'):
    d = json.load(open(f)); at[d['meta']['id']] = round((d['halves']['discover']['comp.rigidL']['v']+d['halves']['confirm']['comp.rigidL']['v'])/2, 4)
out['code']['atlas_reference_pockets'] = at
kinds = {}
for x in R['siblings']:
    if x['prediction'] == 'PRESENT+': kinds.setdefault(x['pool'], []).append(x['vbar'])
med = {k: st.median(v) for k, v in kinds.items() if len(v) >= 2}
pm = {k: R['constant']['kinds'][k]['poolMedian'] for k in med}
conc = tot = 0; disc = []
for a, b in itertools.combinations(sorted(med), 2):
    if pm[a] == pm[b]: continue
    tot += 1; ok = (med[a] > med[b]) == (pm[a] > pm[b]); conc += ok
    if not ok: disc.append([a, b, round(med[a], 4), round(med[b], 4), pm[a], pm[b]])
out['kind_order'] = {'kinds_with_>=2_siblings': {k: [len(kinds[k]), round(med[k], 4), pm[k]] for k in med}, 'pairs': tot, 'concordant': conc, 'discordant': disc}
json.dump(out, open('posthoc.json', 'w'), indent=1); print(json.dumps(out, indent=1))
