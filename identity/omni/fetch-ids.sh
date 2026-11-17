#!/bin/bash
# per language: first 120 humans by item id with P1412 = language and P569 in 1700-1900; falls back to unordered on timeout (logged)
mkdir -p ids
for L in Q5287 Q7850 Q13955 Q7737 Q150 Q188 Q1321 Q5146 Q9168 Q256 Q1568 Q9176 Q9288 Q9129 Q809 Q652 Q1860 Q7838 Q28244 Q36730 Q11059 Q9217 Q9199 Q397 Q9610 Q5885 Q9240 Q9027 Q9056 Q9043 Q8798 Q9067 Q8641; do
  for mode in ordered unordered; do
    ORD=$([ $mode = ordered ] && echo "ORDER BY ?item" || echo "")
    Q="SELECT ?item WHERE { ?item wdt:P1412 wd:$L; wdt:P31 wd:Q5; wdt:P569 ?b. FILTER(YEAR(?b) >= 1700 && YEAR(?b) <= 1900) } $ORD LIMIT 120"
    curl -s -m 75 -G -A "identity-falsification-test/0.1 (research)" -H "Accept: application/sparql-results+json" --data-urlencode "query=$Q" https://query.wikidata.org/sparql > ids/$L.json
    if python3 -I -c "import json,sys; d=json.load(open('ids/$L.json')); sys.exit(0 if 'results' in d else 1)" 2>/dev/null; then echo "$L $mode $(python3 -I -c "import json; print(len(json.load(open('ids/$L.json'))['results']['bindings']))")"; break; else echo "$L $mode FAILED"; fi
    sleep 2
  done
  sleep 1
done
