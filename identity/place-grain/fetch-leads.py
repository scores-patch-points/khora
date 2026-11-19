# fetch-leads.py — the TEXT for PREREG-ROUND29: the English Wikipedia lead paragraph of each person in the round 28 giver data.
# Step 1: the enwiki title of each person (Wikidata sitelinks, wbgetentities, 50 ids a call). Step 2: the lead extract (plain text, intro only), 20 titles a call. About one request a second; generic client name.
import json, sys, time, urllib.request, urllib.parse, hashlib, datetime
UA = "khora-research-client/0.1 (research; contact via repository)"
def get(url, tries=5):
    for t in range(tries):
        try:
            time.sleep(1.2); return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60))
        except Exception as e:
            print("retry", t, str(e)[:100], file=sys.stderr); time.sleep(20 * (t + 1))
    raise SystemExit("failed")
people = json.load(open("identity/place-grain/data/wikidata-nest.partial.json"))["people"]; ids = sorted(people); titles = {}
for i in range(0, len(ids), 50):
    j = get("https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({"action": "wbgetentities", "ids": "|".join(ids[i:i + 50]), "props": "sitelinks", "sitefilter": "enwiki", "format": "json"}))
    for q, e in j.get("entities", {}).items():
        s = e.get("sitelinks", {}).get("enwiki")
        if s: titles[q] = s["title"]
    print("titles", i, len(titles), file=sys.stderr)
byTitle = {t: q for q, t in titles.items()}; leads = {}; tl = sorted(byTitle)
for i in range(0, len(tl), 20):
    j = get("https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "prop": "extracts", "exintro": 1, "explaintext": 1, "exlimit": 20, "titles": "|".join(tl[i:i + 20]), "redirects": 1, "format": "json"}))
    norm = {n["from"]: n["to"] for n in j["query"].get("normalized", [])}; red = {r["from"]: r["to"] for r in j["query"].get("redirects", [])}
    for p in j["query"]["pages"].values():
        if "extract" in p: leads[p["title"]] = p["extract"]
    for t in tl[i:i + 20]:
        e = red.get(norm.get(t, t), norm.get(t, t))
        if e in leads and byTitle[t] not in leads: leads[byTitle[t]] = leads[e]
    print("leads", i, len(leads), file=sys.stderr)
out = {"fetched": datetime.datetime.now(datetime.timezone.utc).isoformat(), "source": "en.wikipedia.org action=query prop=extracts exintro explaintext; titles from wikidata.org wbgetentities sitelinks", "titles": titles, "leads": {q: leads[q] for q in titles if q in leads}}
s = json.dumps(out); open("identity/place-grain/data/wikipedia-leads.json", "w").write(s); print("wrote", len(s), "bytes sha256", hashlib.sha256(s.encode()).hexdigest(), "people with a lead", len(out["leads"]), "of", len(ids))
