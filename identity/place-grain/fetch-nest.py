# fetch-nest.py — the giver for PREREG-ROUND28: fresh people (actors) with a birthplace, and the whole located-in nest of each birthplace WITH parent edges and every ancestor's instance-of class labels. One request a minute.
import json, sys, time, urllib.request, urllib.parse, hashlib, datetime
EP = "https://query.wikidata.org/sparql"; UA = "khora-research-client/0.1 (research; contact via repository)"
def q(sparql, tries=6):
    time.sleep(62)
    for t in range(tries):
        try:
            req = urllib.request.Request(EP + "?" + urllib.parse.urlencode({"query": sparql, "format": "json"}), headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            return json.load(urllib.request.urlopen(req, timeout=120))["results"]["bindings"]
        except Exception as e:
            print("retry", t, str(e)[:100], file=sys.stderr); time.sleep(70)
    raise SystemExit("failed")
out = {"fetched": datetime.datetime.now(datetime.timezone.utc).isoformat(), "endpoint": EP, "queries": {}}
A = """SELECT ?p ?pLabel ?place ?placeLabel WHERE { ?p wdt:P106 wd:Q33999; wdt:P19 ?place. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 900"""
out["queries"]["A"] = A; rows = q(A); people = {}
for r in rows: people[r["p"]["value"].split("/")[-1]] = {"name": r["pLabel"]["value"], "place": r["place"]["value"].split("/")[-1], "placeLabel": r["placeLabel"]["value"]}
places = sorted({v["place"] for v in people.values()}); print("people", len(people), "places", len(places), file=sys.stderr)
B = """SELECT ?x ?xLabel ?parent ?cls ?clsLabel WHERE { VALUES ?place { %s } ?place wdt:P131* ?x . OPTIONAL { ?x wdt:P131 ?parent } OPTIONAL { ?x wdt:P31 ?cls } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }"""
out["queries"]["B"] = B; nodes = {}
for i in range(0, len(places), 30):
    batch = places[i:i + 30]
    for r in q(B % " ".join("wd:" + x for x in batch)):
        x = r["x"]["value"].split("/")[-1]; n = nodes.setdefault(x, {"label": r["xLabel"]["value"], "parents": [], "classes": []})
        if "parent" in r:
            pr = r["parent"]["value"].split("/")[-1]
            if pr not in n["parents"]: n["parents"].append(pr)
        if "clsLabel" in r and r["clsLabel"]["value"] not in n["classes"]: n["classes"].append(r["clsLabel"]["value"])
    print("batch", i, "of", len(places), file=sys.stderr); open("identity/place-grain/data/wikidata-nest.partial.json", "w").write(json.dumps({"people": people, "nodes": nodes}))
out.update({"people": people, "nodes": nodes}); s = json.dumps(out); open("identity/place-grain/data/wikidata-nest.json", "w").write(s)
print("wrote", len(s), "bytes sha256", hashlib.sha256(s.encode()).hexdigest(), "people", len(people), "nodes", len(nodes))
