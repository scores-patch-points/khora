# make-passages.py — passages for the curious loop. Seeded, no judgement: paragraph-aligned runs of 90-170 words of real text.
import json, random, re
rng = random.Random('curious-passages-20261128')
chosen = json.load(open('zen/chosen.json'))
START = re.compile(r'\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n', re.I)
END = re.compile(r'\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG', re.I)
LICENSE = None
def clean(txt):
    m = START.search(txt)
    if m:
        txt = txt[m.end():]; e = END.search(txt)
        if e: txt = txt[:e.start()]
    return txt
def wordy(p):  # real prose: mostly letters, spaces and punctuation
    letters = sum(c.isalpha() or c in " ,.;:'\"-()?!" for c in p)
    return letters / max(1, len(p)) > 0.93 and len(re.findall(r'[A-Za-z]{3,}', p)) >= 0.7 * len(p.split())
def passages(txt, n):
    paras = [re.sub(r'\s+', ' ', p).strip() for p in re.split(r'\n\s*\n', txt)]
    paras = [p for p in paras if p]
    out, i = [], 0
    starts = list(range(len(paras))); rng.shuffle(starts); used = set()
    for s in starts:
        if len(out) >= n: break
        if any(abs(s - u) < 6 for u in used): continue
        words, j, buf = 0, s, []
        while j < len(paras) and words < 90:
            buf.append(paras[j]); words += len(paras[j].split()); j += 1
        text = ' '.join(buf)
        if 90 <= words <= 170 and wordy(text): out.append(text); used.add(s)
    return out
pools = {}
for g, docs in chosen.items():
    P = []
    for d in docs:
        raw = open(d['file'], 'rb').read().decode('utf8', 'replace')
        if g == 'literature' and LICENSE is None:
            lic = re.search(r'(This eBook is for the use of anyone anywhere[^\n]*(?:\n[^\n]+){0,3})', raw)
            if lic: LICENSE = re.sub(r'\s+', ' ', lic.group(1)).strip()
        P += [{'text': t, 'doc': d['path']} for t in passages(clean(raw), 7 if g != 'firstperson' else 7)]
    pools[g] = P; print(g, len(P), 'passages', sum(len(p['text'].split()) for p in P) // max(1, len(P)), 'words each')
# controls: NOISE = pseudo-words from random syllables (no vocabulary to learn); CONSTANT = one fixed passage, read again and again
syl = ['ba', 'ko', 'ri', 'tu', 'me', 'zan', 'lo', 'fi', 'qua', 'dre', 'vo', 'shi', 'plo', 'gra', 'nem', 'xi']
def word(): return ''.join(rng.choice(syl) for _ in range(rng.randint(2, 4)))
pools['noise'] = [{'text': ' '.join(word() for _ in range(rng.randint(90, 130))) + '.', 'doc': 'generated:syllables'} for _ in range(42)]
const = LICENSE or 'The Council shall consider the budget and the reports of the committee, and shall publish its findings in due course.'
pools['constant'] = [{'text': const, 'doc': 'fixed'}]
print('constant passage:', const[:90], '...'); print('noise sample:', pools['noise'][0]['text'][:80])
json.dump(pools, open('passages.json', 'w'), ensure_ascii=False)
