# fetch-zen.py — documents for the curious loop, from Zenodotus (scores-patch-points/Zenodotus), seeded selection, raw bytes saved.
import json, os, random, re, subprocess, urllib.parse
# the file list of the Zenodotus repo: gh api 'repos/scores-patch-points/Zenodotus/git/trees/HEAD?recursive=1' --jq '.tree[].path' > zen-tree.txt   (or set ZEN_TREE)
TREE = [l.strip() for l in open(os.environ.get('ZEN_TREE', 'zen-tree.txt'))]
GENRES = {
  'literature': r'^01-literature-books/(gitenberg|gutenberg)/[^/]+\.txt$',
  'government-legal': r'^06-government-legal/world-legislation/(uk|us)/[^/]+\.md$',
  'encyclopedic': r'^02-encyclopedic/(wikipedia|1911-britannica)/[^/]+\.txt$',
  'academic': r'^05-academic-papers/(ntrs-white-papers|open-access-books/[^/]+)/[^/]+\.txt$',
  'firstperson': r'^20-first-person-voices/gutenberg/[^/]+\.txt$',
}
N_DOCS = {'literature': 6, 'government-legal': 6, 'encyclopedic': 6, 'academic': 6, 'firstperson': 4}
rng = random.Random('curious-zen-20261128'); chosen = {}
os.makedirs('zen', exist_ok=True)
for g, pat in GENRES.items():
    cands = sorted(p for p in TREE if re.match(pat, p)); rng.shuffle(cands); got = []
    for p in cands:
        if len(got) >= N_DOCS[g]: break
        out = f"zen/{g}-{len(got)}.txt"
        r = subprocess.run(['gh', 'api', f"repos/scores-patch-points/Zenodotus/contents/{urllib.parse.quote(p)}", '-H', 'Accept: application/vnd.github.raw'], capture_output=True)
        if r.returncode != 0 or len(r.stdout) < 4000: continue          # unreadable or too small to carry passages
        open(out, 'wb').write(r.stdout); got.append({'path': p, 'file': out, 'bytes': len(r.stdout)})
    chosen[g] = got; print(g, len(got), 'docs', sum(d['bytes'] for d in got) // 1024, 'KB', [d['path'].split('/')[-1][:40] for d in got][:3])
json.dump(chosen, open('zen/chosen.json', 'w'), indent=1)
