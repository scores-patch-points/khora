# pp-attach.py gold.conllu system.conllu — PREREG-ROUND26 diagnostic from the gold: for every word that has a `case` ADP child and is itself obl or nmod, the class of its head (verbal VERB/AUX/ADJ vs nominal NOUN/PROPN/PRON/NUM) and exact head, ours vs gold. Same tokenization (the diagram condition).
import sys
def read(p):
    out=[]
    for b in open(p,encoding="utf8").read().split("\n\n"):
        rows=[l.split("\t") for l in b.split("\n") if l and not l.startswith("#")]; rows=[r for r in rows if r[0].isdigit()]
        if rows: out.append(rows)
    return out
g=read(sys.argv[1]); s=read(sys.argv[2]); assert len(g)==len(s)
VERB={"VERB","AUX","ADJ"}; NOM={"NOUN","PROPN","PRON","NUM"}
def cls(rows,i):
    h=int(rows[i][6]);
    if h==0: return "root"
    u=rows[h-1][3]; return "verbal" if u in VERB else "nominal" if u in NOM else "other"
n=0;cc=0;ce=0;byg={"verbal":[0,0],"nominal":[0,0]}
for G,S in zip(g,s):
    if len(G)!=len(S): continue
    kids={}
    for r in G: kids.setdefault(int(r[6]),[]).append(r)
    for i,r in enumerate(G):
        if r[7].split(":")[0] not in ("obl","nmod"): continue
        if not any(k[7]=="case" and k[3]=="ADP" for k in kids.get(int(r[0]),[])): continue
        gc=cls(G,i)
        if gc not in byg: continue
        n+=1; sc=cls(S,i); ok=gc==sc; cc+=ok; ce+=(G[i][6]==S[i][6]); byg[gc][0]+=1; byg[gc][1]+=ok
print(f"prepositional phrases (case ADP under an obl/nmod): {n}; head class right {cc/n:.3f}; exact head right {ce/n:.3f}")
for k,(a,b) in byg.items(): print(f"  gold head {k}: {a} phrases, ours puts the head in the right class {b/a:.3f}")
