# prep-streams.py — CURIOUS-PREREG.md (sha256 fd53b0d7…). Facts (slot, value) per person, per source. No identity truth involved.
import json
OMNI = '../omni/ent'
LANGS = {'japanese': 'Q5287', 'arabic': 'Q13955', 'russian': 'Q7737', 'french': 'Q150', 'hindi': 'Q1568', 'swedish': 'Q9027', 'latin': 'Q397', 'persian': 'Q9168', 'tamil': 'Q5885'}
def norm(s):
    if s.get('snaktype') != 'value' or 'datavalue' not in s: return None
    t, v = s['datavalue']['type'], s['datavalue']['value']
    if t == 'wikibase-entityid': return v['id']
    if t == 'string': return v
    if t == 'monolingualtext': return v['text']
    if t == 'quantity': return 'q:' + str(float(v['amount']))
    if t == 'time':
        if v['precision'] < 9: return None
        tm = v['time']; return 'y:' + tm[:tm.index('-', 1)]
    return None
out = {}
for name, q in LANGS.items():
    persons = []
    for qid, e in sorted(json.load(open(f'{OMNI}/{q}.json')).items()):
        if 'Q5' not in [c['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for c in e.get('claims', {}).get('P31', [])]: continue
        facts = []
        for P in sorted(e.get('claims', {})):
            for c in e['claims'][P]:
                if c.get('rank') == 'deprecated': continue
                v = norm(c['mainsnak'])
                if v is not None: facts.append([P, v])
        if facts: persons.append(facts)
    out[name] = persons
    print(name, len(persons), 'people', sum(len(p) for p in persons), 'facts')
json.dump(out, open('streams.json', 'w'), ensure_ascii=False)
