# diagnostic only (no probe, no AUC): which data/ud treebank is each ud-eval stem, and how much sentence text of ud-eval dev/test appears in data/ud train/dev/test.
import os, sys, json, glob, unicodedata
UDE="/private/tmp/claude-501/ud-eval"; UDD="/Users/mlacy/Documents/data/ud"
MAP={"afr":"af_afribooms","arb":"ar_padt","bul":"bg_btb","cat":"ca_ancora","ces":"cs_pdt","cmn":"zh_gsd","cym":"cy_ccg","dan":"da_ddt","deu":"de_gsd","eng":"en_ewt","est":"et_edt","fas":"fa_seraji","fin":"fi_tdt","fra":"fr_gsd","gle":"ga_idt","glg":"gl_treegal","hin":"hi_hdtb","hrv":"hr_set","ita":"it_isdt","lav":"lv_lvtb","lit":"lt_alksnis","lzh":"lzh_kyoto","nld":"nl_alpino","nob":"no_bokmaal","pol":"pl_pdb","por":"pt_bosque","ron":"ro_rrt","rus":"ru_syntagrus","slk":"sk_snk","slv":"sl_ssj","spa":"es_gsd","srp":"sr_set","swe":"sv_talbanken","ukr":"uk_iu","urd":"ur_udtb","mlt":"mt_mudt","uig":"ug_udt","tur":"tr_imst"}
def sents(path):
    out=[]; cur=[]
    for line in open(path,encoding="utf8"):
        line=line.rstrip("\n")
        if not line:
            if cur: out.append(" ".join(cur)); cur=[]
            continue
        if line[0]=="#": continue
        f=line.split("\t")
        if len(f)<10 or not f[0].isdigit(): continue
        if f[3]=="PUNCT": continue
        cur.append(unicodedata.normalize("NFC",f[1]).lower())
    if cur: out.append(" ".join(cur))
    return out
res={}
for stem,tb in MAP.items():
    ev=set(); 
    for sp in ("dev","test"):
        p=f"{UDE}/{stem}/{sp}.conllu"
        if os.path.exists(p): ev|=set(sents(p))
    row={}
    for f in sorted(glob.glob(f"{UDD}/{tb}/*.conllu")):
        b=os.path.basename(f)
        if "output" in b: continue
        ss=sents(f); inter=sum(1 for s in ss if s in ev)
        row[b]=[len(ss),inter]
    res[stem]=row
    print(stem,tb,{k.split("-ud-")[-1]:v for k,v in row.items()},flush=True)
json.dump(res,open("data/overlap-ud-eval-vs-data-ud.json","w"),indent=1)
