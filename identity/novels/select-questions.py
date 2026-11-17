# select-questions.py <id8>... — Q1-Q5 of NOVELS-PREREG.md, mechanically. Evaluation books are refused unless FREEZE.md exists.
import csv, json, random, re, string, sys, os
dev = {"4a92bf27", "e72d83e5"}
def norm(s):
    s = s.lower(); s = "".join(c for c in s if c not in set(string.punctuation)); s = re.sub(r"\b(a|an|the)\b", " ", s); return " ".join(s.split())
man = {m["document_id"][:8]: m for m in json.load(open("books-manifest.json")) if m["ok"]}
for id8 in sys.argv[1:]:
    if id8 not in dev and not os.path.exists("FREEZE.md"): sys.exit(f"{id8} is an evaluation book: FREEZE.md must exist first")
    did = man[id8]["document_id"]; text = norm(open(man[id8]["file"], encoding="utf8").read()); padded = " " + text + " "
    rows = [r for r in csv.DictReader(open("nqa-qaps.csv", encoding="utf8")) if r["document_id"] == did]
    seen = set(); keep = []; stats = {"all": len(rows)}
    for r in rows:
        q = r["question"].strip(); ql = q.lower(); w = ql.split()
        ok1 = (w and w[0] in ("who", "whom", "whose", "what", "which", "where")) or ql.startswith(("how many", "how much"))
        if not ok1: continue
        a = [r["answer1"].strip(), r["answer2"].strip()]
        if not any(len(x.split()) <= 4 for x in a): continue
        if not any(norm(x) and (" " + norm(x) + " ") in padded for x in a): continue
        if ql in seen: continue
        seen.add(ql); keep.append({"q": q, "answers": a})
    stats.update(after_filters=len(keep)); random.Random("nqa-questions-" + did).shuffle(keep); keep = keep[:30]; stats["kept"] = len(keep)
    json.dump(keep, open(f"questions-{id8}.json", "w"), indent=1); print(id8, stats)
