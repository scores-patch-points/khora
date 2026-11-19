# fetch-places.py — the giver for PREREG-ROUND27: Wikidata birthplaces and their containment chains.
# Step A: people (human, with a birthplace, with many sitelinks = widely known) and their birthplace.
# Step B: for every birthplace, the located-in chain (P131*) up to the country, each ancestor with its instance-of classes and its country.
# Wikidata SPARQL endpoint, generic client name; results saved raw with the query text and a time stamp.
import json, sys, time, urllib.request, urllib.parse, hashlib, datetime
EP = "https://query.wikidata.org/sparql"; UA = "khora-research-client/0.1 (research; contact via repository)"
def q(sparql, tries=6):
    time.sleep(62)   # the endpoint asked for one request a minute (HTTP 429): stay under it
    for t in range(tries):
        try:
            req = urllib.request.Request(EP + "?" + urllib.parse.urlencode({"query": sparql, "format": "json"}), headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            return json.load(urllib.request.urlopen(req, timeout=120))["results"]["bindings"]
        except Exception as e:
            print("retry", t, str(e)[:100], file=sys.stderr); time.sleep(70)
    raise SystemExit("failed")
out = {"fetched": datetime.datetime.now(datetime.timezone.utc).isoformat(), "endpoint": EP, "queries": {}}
A = """SELECT ?p ?pLabel ?place ?placeLabel WHERE { ?p wdt:P106 wd:Q82955; wdt:P19 ?place. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 900"""
rows = q(A); out["queries"]["A"] = A; print("people", len(rows), file=sys.stderr)
people = {}
for r in rows:
    people[r["p"]["value"].split("/")[-1]] = {"name": r["pLabel"]["value"], "place": r["place"]["value"].split("/")[-1], "placeLabel": r["placeLabel"]["value"], "sitelinks": None}
places = sorted({v["place"] for v in people.values()}); print("places", len(places), file=sys.stderr)
chain = {}
CLS = "Q35657 Q10864048 Q34876 Q3336843 Q107390 Q5852411 Q1221156 Q150093 Q48352 Q1799794 Q15304003 Q6256 Q3624078 Q7275 Q112099 Q1520223".split()   # the classes place-grain.js reads as first-level division or country (QIDs), so only those ancestors come back
B = """SELECT ?place ?anc ?ancLabel ?cls WHERE { VALUES ?place { %s } VALUES ?cls { %s } ?place wdt:P131* ?anc . ?anc wdt:P31 ?cls . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }"""
for i in range(0, len(places), 40):
    batch = places[i:i + 40]; s = B % (" ".join("wd:" + x for x in batch), " ".join("wd:" + c for c in CLS))
    for r in q(s):
        pl = r["place"]["value"].split("/")[-1]; anc = r["anc"]["value"].split("/")[-1]
        d = chain.setdefault(pl, {}).setdefault(anc, {"label": r["ancLabel"]["value"], "classes": []})
        if "cls" in r: d["classes"].append("|" + r["cls"]["value"].split("/")[-1])
    print("batch", i, "of", len(places), file=sys.stderr); open("identity/place-grain/data/wikidata-places.partial.json", "w").write(json.dumps({"people": people, "chain": chain}))
country = {}
out.update({"people": people, "chain": chain, "country": country})
s = json.dumps(out); open("identity/place-grain/data/wikidata-places.json", "w").write(s)
print("wrote", len(s), "bytes sha256", hashlib.sha256(s.encode()).hexdigest(), "people", len(people), "places", len(places), "with chain", len(chain), "with country", len(country))
