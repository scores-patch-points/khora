# judge-files.py <set sentences.json> <gold.json> <system.json> <out dir> — the judges' inputs: precision files without gold, recall files with both
import json, sys, os
S={s['sid']:s for s in json.load(open(sys.argv[1]))}; gold=json.load(open(sys.argv[2])); sysd={s['sid']:s for s in json.load(open(sys.argv[3]))['sentences']}; out=sys.argv[4]
def gname(title, x):
    for e in gold['entities'].get(title, []):
        if e['id']==x: return e['name']
    return x
def greal(title, a):
    args=[gname(title,x) if isinstance(x,str) and x.startswith('E') and x[1:].isdigit() else str(x) for x in a.get('args',[])]
    return f"{'NOT ' if a.get('neg') else ''}{a['pred']}({', '.join(args)})"+(" [hedged]" if a.get('hedged') else "")+(" [approx]" if a.get('approx') else "")
items=[]
for g in gold['sentences']:
    s=S[g['sid']]; sy=sysd[g['sid']]
    items.append({"sid":g['sid'],"lang":s['lang'],"title":s['title'],"context":" ".join(s['previous'][-3:]),"sentence":s['sentence'],
                  "system_atoms":[{"i":i,"atom":a['text']} for i,a in enumerate(sy.get('atoms',[]))],"gold_atoms":[{"j":j,"atom":greal(s['title'],a)} for j,a in enumerate(g['atoms'])]})
os.makedirs(out, exist_ok=True)
for k in range(4):
    part=items[k*25:(k+1)*25]
    json.dump([{x:v for x,v in it.items() if x!='gold_atoms'} for it in part],open(f'{out}/judge-P{k}.json','w'),ensure_ascii=False,indent=1)
    json.dump(part,open(f'{out}/judge-R{k}.json','w'),ensure_ascii=False,indent=1)
print(sum(len(i['system_atoms']) for i in items), "system atoms,", sum(len(i['gold_atoms']) for i in items), "gold atoms")
