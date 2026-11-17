# fetch-books.py — BOOKS-PREREG.md (sha256 386fef27…). Polite, sequential, resumable.
import json, os, time, random, urllib.request, urllib.parse
UA = {"User-Agent": "identity-falsification-test/0.1 (research)"}
SUBJECTS = ['fiction', 'poetry', 'history', 'science', 'philosophy', 'religion', 'children', 'biography', 'mathematics', 'art']
KEEP = ['key', 'title', 'subtitle', 'full_title', 'publish_date', 'publishers', 'languages', 'number_of_pages', 'authors', 'physical_format',
        'lc_classifications', 'dewey_decimal_class', 'classifications', 'subjects', 'series', 'translated_from', 'works']
def get(url, tries=5):
    for t in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r: return json.load(r)
        except Exception as e:
            time.sleep(10 * (t + 1))
    raise SystemExit('failed: ' + url)
os.makedirs('raw', exist_ok=True)
seen = set()
for s in SUBJECTS:
    f = f'raw/{s}.json'
    if os.path.exists(f):
        seen |= {w['work'] for w in json.load(open(f))['works']}; continue
    off = random.Random(f'20261127-{s}').randrange(0, 1500)
    q = urllib.parse.urlencode({'q': f'subject:{s}', 'fields': 'key,title,edition_count', 'limit': 300, 'offset': off})
    docs = get(f'https://openlibrary.org/search.json?{q}')['docs']; time.sleep(1.2)
    pick = [d for d in docs if 3 <= d.get('edition_count', 0) <= 40 and d['key'] not in seen][:60]
    works = []
    for d in pick:
        seen.add(d['key'])
        es = get(f"https://openlibrary.org{d['key']}/editions.json?limit=40").get('entries', []); time.sleep(1.2)
        works.append({'work': d['key'], 'title': d.get('title'), 'edition_count': d.get('edition_count'),
                      'editions': [{k: e.get(k) for k in KEEP if e.get(k) is not None} for e in es]})
    json.dump({'subject': s, 'offset': off, 'searched': len(docs), 'works': works}, open(f, 'w'), ensure_ascii=False)
    print(s, 'offset', off, 'searched', len(docs), 'works', len(works), 'editions', sum(len(w['editions']) for w in works), flush=True)
