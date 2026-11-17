import json, os, time, urllib.request, urllib.parse, glob
UA = {"User-Agent": "identity-falsification-test/0.1 (research)"}
def get(ids, props="claims|labels"):
    q = urllib.parse.urlencode({"action": "wbgetentities", "ids": "|".join(ids), "props": props, "languages": "en", "format": "json"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request("https://www.wikidata.org/w/api.php?" + q, headers=UA), timeout=120) as r:
                return json.load(r)["entities"]
        except Exception as e:
            time.sleep(15 * (attempt + 1))
    raise SystemExit(f"failed: {ids[:2]}")
os.makedirs("ent", exist_ok=True)
for f in sorted(glob.glob("ids/*.json")):
    L = os.path.basename(f)[:-5]
    if os.path.exists(f"ent/{L}.json"): print(L, "already fetched", flush=True); continue
    ids = [b["item"]["value"].rsplit("/", 1)[1] for b in json.load(open(f))["results"]["bindings"]]
    E = {}
    for i in range(0, len(ids), 50): E.update(get(ids[i:i + 50])); time.sleep(3)
    json.dump(E, open(f"ent/{L}.json", "w"))
    print(L, len(ids), "ids ->", len(E), "entities", flush=True)
props = set()
for f in glob.glob("ent/*.json"):
    for e in json.load(open(f)).values(): props.update(e.get("claims", {}).keys())
P = {}
for i, chunk in enumerate([sorted(props)[j:j + 50] for j in range(0, len(props), 50)]): P.update(get(chunk)); time.sleep(1)
json.dump(P, open("property-constraints.json", "w"))
print(len(P), "property entities")
