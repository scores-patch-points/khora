# fetch-leads.py — the TEXT for PREREG-ROUND29: the first 5000 characters of the English Wikipedia article of each person in the round 28 giver data.
# Step 1: the enwiki title of each person (Wikidata sitelinks, wbgetentities, 50 ids a call). Step 2: the lead extract (plain text, intro only), 20 titles a call. About one request a second; generic client name.
import json, sys, time, urllib.request, urllib.parse, hashlib, datetime
UA = "khora-research-client/0.1 (research; contact via repository)"
def get(url, tries=8):
    for t in range(tries):
        try:
            time.sleep(2.5); return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60))
        except Exception as e:
            print("retry", t, str(e)[:100], file=sys.stderr); time.sleep(60 * (t + 1))
    raise SystemExit("failed")
titles = json.load(open("identity/place-grain/data/wikipedia-leads.json"))["titles"]; ids = sorted(json.load(open("identity/place-grain/data/wikidata-nest.json"))["people"])
byTitle = {t: q for q, t in titles.items()}; import os; PART = "identity/place-grain/data/wikipedia-early.partial.json"; leads = json.load(open(PART)) if os.path.exists(PART) else {}; tl = sorted(byTitle)
# full-text extracts come one page per request (the API allows several only for the intro): dev = the first 100 even-hash people (debugging), held-out = every odd-hash person
import hashlib as _h
par = lambda q: int(_h.sha256(q.encode()).hexdigest()[:8], 16) % 2
order = [q for q in sorted(titles) if par(q) == 0][:100] + [q for q in sorted(titles) if par(q) == 1]
for n, q in enumerate(order):
    if q in leads: continue
    j = get("https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "prop": "extracts", "explaintext": 1, "exchars": 5000, "titles": titles[q], "redirects": 1, "format": "json"}))
    for p in j["query"]["pages"].values():
        if "extract" in p: leads[q] = p["extract"]
    if n % 20 == 0: print("article", n, "of", len(order), len(leads), file=sys.stderr); open(PART, "w").write(json.dumps(leads))
out = {"fetched": datetime.datetime.now(datetime.timezone.utc).isoformat(), "source": "en.wikipedia.org action=query prop=extracts explaintext exchars=5000; titles from wikidata.org wbgetentities sitelinks", "titles": titles, "leads": {q: leads[q] for q in titles if q in leads}}
s = json.dumps(out); open("identity/place-grain/data/wikipedia-early.json", "w").write(s); print("wrote", len(s), "bytes sha256", hashlib.sha256(s.encode()).hexdigest(), "people with a lead", len(out["leads"]), "of", len(ids))
