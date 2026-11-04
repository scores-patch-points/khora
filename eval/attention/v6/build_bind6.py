# build_bind6.py — PARA-GOLD-BIND v6: held-out scoring set for the attention binder, round 7. Hand-labelled by the parent session (not blind), from six
# Wikipedia articles used in no earlier set. Writes PARA-GOLD-BIND-V6.json (full labels) and PARA-GOLD-BIND-V6.binder.json (the scorer's schema).
import json, re, hashlib, glob, os
T_ = {os.path.basename(f)[:-4]: open(f, encoding='utf-8').read() for f in glob.glob('text/*.txt')}
def span(doc, start):
    t = T_[doc]; assert t.count(start) == 1, (doc, start, t.count(start)); i = t.index(start)
    j = re.compile(r'[.!?]["”’)]*(?=\s|$)').search(t, i + 12).end()
    return {'doc': doc, 'start': len(t[:i].encode()), 'end': len(t[:j].encode()), 'text': t[i:j]}
def opens(doc, start):   # the previous non-blank line is a heading
    t = T_[doc]; i = t.index(start); before = [l for l in t[:i].split('\n') if l.strip()]
    return bool(before) and before[-1].startswith('==')
EI, SL, HD, TB, CO, MR = 'wiki-Eiffel_Tower', 'wiki-Statue_of_Liberty', 'wiki-Hoover_Dam', 'wiki-Tower_Bridge', 'wiki-Concorde', 'wiki-Mary_Rose'
TOPIC = {EI: 'Eiffel Tower', SL: 'Statue of Liberty', HD: 'Hoover Dam', TB: 'Tower Bridge', CO: 'Concorde', MR: 'Mary Rose'}
ACCEPT = {EI: ['Eiffel Tower', 'The Eiffel Tower', 'Tour Eiffel'], SL: ['Statue of Liberty', 'The Statue of Liberty', 'Liberty Enlightening the World', 'Lady Liberty'], HD: ['Hoover Dam', 'The Hoover Dam'],
          TB: ['Tower Bridge', 'The Tower Bridge'], CO: ['Concorde'], MR: ['Mary Rose', 'The Mary Rose']}
# cast names that must NOT count as the topic by meaning (parent's by-meaning recount only; not in the binder file)
REJECT = {EI: ['Tokyo Tower', 'Tour Saint-Jacques', 'Blackpool Tower', 'Eiffel Tower Brown', "Société d'Exploitation de la Tour Eiffel"],
          SL: ['Statue of Liberty National Monument', 'Statue of Liberty Museum', 'Liberty Island', 'Statue of Freedom'],
          HD: ['Hoover Dam Bypass', 'Imperial Dam', 'Parker Dam', 'Francis Dam', 'Grand Coulee Dam'],
          TB: ['London Bridge', 'Tower Bridge Exhibition', 'Tower Subway', 'Tower Bridge Approach', 'Tower Bridge Road'],
          CO: ['Concorde Spirit Tours', 'Tu-144', 'Boeing 2707'],
          MR: ['Mary Rose Trust', 'Mary Rose Committee', 'Mary Rose Museum', 'Peter Pomegranate']}
C = [
 ('w01', 'attended', EI, 'It is named after the engineer Gustave Eiffel', 'It', 'Eiffel Tower', 'pronoun; Champ de Mars and Paris stand in the previous sentence'),
 ('w02', 'attended', EI, 'It was the first structure in the world to surpass', 'It', 'Eiffel Tower', 'pronoun; the Washington Monument is a competing candidate in the previous sentence'),
 ('w03', 'attended', EI, 'The Eiffel Tower is the most visited monument with an entrance fee', 'The Eiffel Tower', 'Eiffel Tower', "a capitalised target that is the topic's own name; previous sentence uses 'The tower'"),
 ('w04', 'attended', EI, 'The tower has been used for making radio transmissions', 'The tower', 'Eiffel Tower', 'definite description, a word of the name; opens a section'),
 ('w05', 'attended', SL, 'It was lit briefly on December 31, 1943', 'It', 'Statue of Liberty', 'pronoun; visitors and wartime blackouts are competing candidates in the previous sentence'),
 ('w06', 'attended', SL, 'It is knocked over in the science-fiction film Independence Day', 'It', 'Statue of Liberty', 'pronoun; the 1968 film Planet of the Apes is a competing candidate in the previous sentence'),
 ('w07', 'attended', SL, "The statue's completion was marked by New York's first ticker-tape", 'The statue', 'Statue of Liberty', 'possessive description, a word of the name; the pedestal and Bedloe\'s Island stand in the previous sentence'),
 ('w08', 'attended', SL, 'The Statue of Liberty has also been closed due to government', 'The Statue of Liberty', 'Statue of Liberty', "a capitalised target that is the topic's own name; Ellis Island is a competing candidate in the previous sentence"),
 ('w09', 'attended', HD, 'It was listed on the National Register of Historic Places in 1981', 'It', 'Hoover Dam', 'pronoun; the National Historic Civil Engineering Landmark designation is a competing candidate'),
 ('w10', 'attended', HD, "The dam's generators provide power", 'The dam', 'Hoover Dam', 'possessive description, a word of the name; Lake Mead and Boulder City are competing candidates'),
 ('w11', 'attended', HD, 'The dam is protected against over-topping by two spillways', 'The dam', 'Hoover Dam', 'definite description, a word of the name; opens a section'),
 ('w12', 'attended', TB, 'It crosses the River Thames close to the Tower of London', 'It', 'Tower Bridge', 'pronoun; Horace Jones, John Wolfe Barry and Henry Marc Brunel stand in the previous sentence'),
 ('w13', 'attended', TB, 'It is sometimes confused with London Bridge', 'It', 'Tower Bridge', 'pronoun; London (the landmark city) is a competing candidate in the previous sentence'),
 ('w14', 'attended', TB, 'The bridge was opened by Edward, Prince of Wales', 'The bridge', 'Tower Bridge', 'definite description, a word of the name; the population east of London Bridge and shipping stand in the previous sentence'),
 ('w15', 'attended', TB, 'The structure was originally designed by Horace Jones', 'The structure', 'Tower Bridge', 'definite description, different head noun; opens a section'),
 ('w16', 'attended', CO, 'It is powered by four Rolls-Royce/Snecma Olympus 593', 'It', 'Concorde', 'pronoun; the aircraft design, fuselage, wing and nose stand in the previous sentence'),
 ('w17', 'attended', CO, 'It has an unusual tailless configuration', 'It', 'Concorde', 'pronoun; the Olympus engines and the Avro Vulcan are competing candidates in the previous sentence'),
 ('w18', 'attended', CO, 'The airliner had transatlantic range', 'The airliner', 'Concorde', 'definite description, different head noun; the pronoun \'it\' of the previous sentence is the same referent'),
 ('w19', 'attended', CO, 'The aircraft was usually referred to by the British', 'The aircraft', 'Concorde', 'definite description, different head noun; the final landings and the event are competing candidates'),
 ('w20', 'attended', MR, 'The ship is an early example of this method of construction', 'The ship', 'Mary Rose', 'definite description, different head noun; the hull is a competing candidate in the previous sentence'),
 ('w21', 'attended', MR, 'The ship carried several skilled craftsmen', 'The ship', 'Mary Rose', "definite description, different head noun; the master carpenter's chest is a competing candidate"),
 ('w22', 'attended', MR, 'The ship went through several changes in her armament', 'The ship', 'Mary Rose', 'definite description, different head noun; the inventory and fighting tops stand in the previous sentence'),
 ('u01', 'trap-new-entity', EI, 'It was removed due to structural considerations', 'It', 'the restaurant near the top (not the tower)', 'refers to the restaurant of the previous sentence'),
 ('u02', 'trap-new-entity', SL, 'It was originally to be crowned with a pileus', 'It', "Thomas Crawford's Statue of Freedom (not the Statue of Liberty)", 'refers to Crawford\'s statue of the previous sentence; its name contains "Statue"'),
 ('u03', 'trap-new-entity', HD, 'It also permitted the compact to go into effect', 'It', 'the Boulder Canyon Project Act (not the dam)', 'refers to the act of the previous sentence'),
 ('u04', 'trap-new-entity', HD, 'It contained 650,000 cubic yards', 'It', 'the upper cofferdam (not the dam)', 'refers to the cofferdam of the previous sentence; the dam itself is also named there'),
 ('u05', 'trap-new-entity', TB, 'It was connected to a fireplace in a guardroom', 'It', 'the chimney painted to look like a lamppost (not the bridge)', 'refers to the chimney of the previous sentence'),
 ('u06', 'trap-new-entity', TB, 'It uses films, photos, and interactive displays', 'It', 'the Tower Bridge attraction (not the bridge)', 'refers to the attraction of the previous sentence; its name contains "Tower Bridge"'),
 ('u07', 'trap-new-entity', CO, 'It would have higher thrust engines with noise reducing features', 'It', 'the Concorde "B" model (not the original Concorde)', 'refers to the proposed B model of the previous sentence; its name contains "Concorde"'),
 ('u08', 'trap-new-entity', MR, 'It also reports that there were 700 men on board', 'It', 'the Carew biography (not the ship)', 'refers to the biography (a document) of the previous sentence'),
 ('u09', 'trap-expletive', TB, 'It was reported that "few [pageants]', 'It', 'none (expletive, extraposed clause)', 'expletive it; the topic is named inside the clause'),
 ('u10', 'trap-expletive', CO, 'It was later revealed that the original STAC report', 'It', 'none (expletive, extraposed clause)', 'expletive it'),
 ('u11', 'trap-expletive', CO, 'It has been pointed out that other, lower-flying, airliners', 'It', 'none (expletive, extraposed clause)', 'expletive it; Concorde and its exhaust stand in the previous sentence'),
 ('u12', 'trap-expletive', MR, 'It was also decided that the ship would be recovered', 'It', 'none (expletive, extraposed clause)', 'expletive it; the previous sentence has a real pronoun it for the hull'),
 ('u13', 'trap-definite-other', SL, 'The monument was expanded to also include Ellis Island in 1965', 'The monument', 'the Statue of Liberty National Monument (not the statue)', 'the national monument designation, a larger unit than the statue; the previous sentence names both'),
 ('u14', 'trap-definite-other', HD, 'The four-lane Hoover Dam Bypass opened on October 19, 2010', 'The four-lane Hoover Dam Bypass', 'the Hoover Dam Bypass (not the dam)', 'a neighbouring road project whose name contains the topic\'s own name'),
 ('u15', 'trap-definite-other', TB, 'The replica differs from the original in having no lifting mechanism', 'The replica', 'the partial replica in Suzhou (not Tower Bridge)', 'a later copy of the topic; the original is named in the previous sentence'),
 ('u16', 'trap-definite-other', CO, 'The aircraft had poor control at low speeds because of a simpler wing design', 'The aircraft', 'the Tupolev Tu-144 (not Concorde)', 'the rival aircraft of the Comparable aircraft section; the head noun fits the topic'),
 ('u17', 'trap-definite-other', MR, 'The Breton flagship Cordelière put up a fight', 'The Breton flagship', 'the Cordelière (not the Mary Rose)', 'another ship; the previous sentence names the Mary Rose among the great ships'),
 ('u18', 'trap-definite-other', MR, 'The Mary Rose Trust, a limited charitable trust', 'The Mary Rose Trust', 'the Mary Rose Trust (the institution, not the ship)', 'a named institution whose name contains the topic\'s own name'),
]
NAMED = {'u02': ['Statue of Freedom'], 'u03': ['Boulder Canyon Project Act', 'The Boulder Canyon Project Act'], 'u06': ['Tower Bridge attraction', 'The Tower Bridge attraction'], 'u07': ['Concorde "B"'],
         'u08': ['Carew biography', 'The Carew biography'], 'u13': ['Statue of Liberty National Monument'], 'u14': ['Hoover Dam Bypass', 'The Hoover Dam Bypass'], 'u16': ['Tu-144', 'Tupolev Tu-144'],
         'u17': ['Cordelière', 'The Breton flagship Cordelière'], 'u18': ['Mary Rose Trust', 'The Mary Rose Trust']}
KIND = {'attended': ('attended', None), 'trap-new-entity': ('elsewhere', 'new-entity'), 'trap-definite-other': ('elsewhere', 'definite-other'), 'trap-expletive': ('out_of_scope', 'expletive')}
cases, binder = [], []
for cid, kind, doc, start, anaphor, ref, note in C:
    s = span(doc, start); op = opens(doc, start)
    cases.append({'id': cid, 'kind': kind, **s, 'anaphor': anaphor, 'attended_topic': TOPIC[doc], 'referent': ref, 'opens_section': op, 'note': note, 'by_meaning_reject': REJECT[doc] if kind == 'attended' else None})
    k, tk = KIND[kind]; d = {'id': cid, 'doc': doc, 'start': s['start'], 'end': s['end'], 'text': s['text'], 'surface': anaphor, 'kind': k, 'accept': ACCEPT[doc] if k == 'attended' else NAMED.get(cid, [])}
    if tk: d['trapKind'] = tk
    binder.append(d)
man = []
for f in sorted(glob.glob('text/*.txt')):
    i = os.path.basename(f)[:-4]; raw = f'src/{i.replace("wiki-", "", 1)}.json'
    raw = [p for p in glob.glob('src/*.json') if re.sub(r'[^A-Za-z0-9_-]+', '_', json.load(open(p))['query']['pages'][0]['title'].replace(' ', '_')) == i.replace('wiki-', '', 1)][0]
    d = json.load(open(raw))['query']['pages'][0]
    man.append({'id': i, 'title': d['title'], 'revid': d['revisions'][0]['revid'], 'revision_timestamp': d['revisions'][0]['timestamp'], 'source': 'English Wikipedia (CC BY-SA 4.0)',
                'raw_sha256': hashlib.sha256(open(raw, 'rb').read()).hexdigest(), 'text_sha256': hashlib.sha256(T_[i].encode()).hexdigest(), 'text_bytes': len(T_[i].encode())})
json.dump({'schema': 'ParaGoldBind@6', 'created': '2026-11-04', 'purpose': 'held-out scoring set for the attention binder with the layer-3 repair on (round 7); hand-labelled by the parent session, not blind', 'sources': man, 'cases': cases},
          open('PARA-GOLD-BIND-V6.json', 'w'), indent=1, ensure_ascii=False)
json.dump({'cases': binder}, open('PARA-GOLD-BIND-V6.binder.json', 'w'), indent=1, ensure_ascii=False)
bad = sum(1 for c in cases if T_[c['doc']].encode()[c['start']:c['end']].decode('utf-8') != c['text'])
from collections import Counter
print('cases', len(cases), dict(Counter(c['kind'] for c in cases)), 'opens a section:', sum(c['opens_section'] for c in cases), 'address mismatches', bad)
for c in cases: print(c['id'], c['kind'][:10].ljust(10), ('S' if c['opens_section'] else ' '), c['anaphor'][:22].ljust(22), '|', c['text'][:60])
