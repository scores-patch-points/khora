# basins-by-period.py — PREREG-ROUND18.md. Pronoun basins from use, by period. python3 -I basins-by-period.py
import re,os,glob,json,math,random,hashlib,collections,datetime
Z=os.path.expanduser('~/Documents/khora-cast/Zenodotus')
DECL=[('henry-iv-part-1.txt',1597),('doctor-faustus-1604-quarto.txt',1604),('pg59129_Leviathan',1651),('pg521_The-Life-and-Adventures-of-Robinson-Crusoe',1719),('pg829_Gulliver-s-Travels',1726),('pg147_Common-Sense',1776),('pg1404_The-Federalist-Papers',1787),
 ('pg161_Sense-and-Sensibility',1811),('pg1342_Pride_and_Prejudice',1813),('pg158_Emma',1815),('pg84_Frankenstein',1818),('pg768_Wuthering-Heights',1847),('pg2701_Moby_Dick',1851),('pg2397_Leaves_of_Grass',1855),('pg98_A_Tale_of_Two_Cities',1859),('pg62168_The_Origin_of_Species',1859),
 ('pg1400_Great-Expectations',1861),('pg514_Little-Women',1868),('pg11_Alice_s_Adventures_in_Wonderland',1865),('pg12_Through_the_Looking_Glass',1871),('pg145_Middlemarch',1871),('pg1661_The_Adventures_of_Tom_Sawyer',1876),('pg120_Treasure-Island',1883),('pg174_The_Picture_of_Dorian_Gray',1890),
 ('pg768_The_Adventures_of_Sherlock_Holmes',1892),('pg236_The-Jungle-Book',1894),('pg35_The-Time-Machine',1895),('pg345_Dracula',1897),('pg36_The-War-of-the-Worlds',1898),('pg219_Heart-of-Darkness',1899),('pg55_The-Wonderful-Wizard-of-Oz',1900),('pg215_The-Call-of-the-Wild',1903),('pg45_Anne-of-Green-Gables',1908),('pg4300_Ulysses',1922)]
files=glob.glob(Z+'/01-literature-books/*/*.txt')+glob.glob(Z+'/15-western-canon/*/*.txt')
def find(key):
    c=[f for f in files if os.path.basename(f).startswith(key) or os.path.basename(f)==key]
    c=[f for f in c if 'ch1' not in f and 'modern' not in f and 'french' not in f and 'german' not in f]
    return sorted(c)[0] if c else None
texts=[]
for key,yr in DECL:
    f=find(key)
    if not f: print('MISSING',key); continue
    raw=open(f,encoding='utf8',errors='ignore').read(); m=re.search(r'\*\*\* ?START[^\n]*\n',raw); e=re.search(r'\*\*\* ?END',raw)
    body=raw[m.end():e.start() if e else None] if m else raw
    texts.append({'file':os.path.basename(f),'year':yr,'text':body,'sha':hashlib.sha256(raw.encode()).hexdigest()})
texts.sort(key=lambda t:(t['year'],t['file'])); n=len(texts); cuts=[round(i*n/4) for i in range(5)]
slices=[texts[cuts[i]:cuts[i+1]] for i in range(4)]
GROUPS={'thou':'thou thee thy thine thyself'.split(),'you':'ye you your yours yourself yourselves'.split(),'he':'he him his himself'.split(),'she':'she her hers herself'.split(),'it':'it its itself'.split(),'they':'they them their theirs themselves'.split(),'I':'i me my mine we us our ours'.split()}
FORM2G={f:g for g,fs in GROUPS.items() for f in fs}; PARA=set(FORM2G)
def tok(t): return re.findall(r"[a-z']+|[.!?;]",t.lower())
def analyse(sl):
    words=[];
    for t in sl: words+=tok(t['text'])+['|']
    N=sum(1 for w in words if w not in ('|','.','!','?',';'))
    uni=collections.Counter(w for w in words if w not in PARA and w not in ('|','.','!','?',';')); occ=collections.Counter(w for w in words if w in PARA)
    ctx=collections.defaultdict(collections.Counter); stop={'|','.','!','?',';'}
    for i,w in enumerate(words):
        if w in PARA and occ[w]>=20:
            for d in (-2,-1,1,2):
                j=i+d
                if j<0 or j>=len(words): continue
                # do not cross a sentence boundary
                lo,hi=sorted((i,j)); 
                if any(x in stop for x in words[lo+1:hi]) : continue
                c=words[j]
                if c in PARA or c in stop: continue
                ctx[w][c]+=1
    elig=[f for f in PARA if occ[f]>=20]; tot=sum(sum(v.values()) for v in ctx.values()); U=sum(uni.values())
    vec={}
    for f in elig:
        cf=sum(ctx[f].values()); v={}
        for c,k in ctx[f].items():
            pmi=math.log((k*U)/(cf*uni[c])) if uni[c] and cf else 0
            if pmi>0: v[c]=pmi
        vec[f]=v
    def cos(a,b):
        d=sum(x*b.get(k,0) for k,x in a.items()); na=math.sqrt(sum(x*x for x in a.values())); nb=math.sqrt(sum(x*x for x in b.values())); return d/(na*nb) if na and nb else 0
    nn={}
    for f in elig:
        best=None;bs=-2
        for g in elig:
            if g==f: continue
            s=cos(vec[f],vec[g])
            if s>bs: bs=s;best=g
        nn[f]=(best,bs)
    return {'words':N,'occ':{f:occ[f] for f in sorted(PARA) if occ[f]},'eligible':sorted(elig),'nn':nn}
def perm_test(res,group,target=None,reps=10000):
    el=res['eligible']; labs={f:FORM2G[f] for f in el}; members=[f for f in el if labs[f]==group]
    if len(members)<2: return None
    def stat(lab):
        hit=0;tot=0
        for f in members:
            nb=res['nn'][f][0]; 
            if target is None: hit+= (lab[nb]==lab[f]); tot+=1
            else:
                pass
        return hit/tot if tot else 0
    obs=stat(labs); rnd=random.Random(18); vals=list(labs.values()); ge=0
    # permute labels across eligible forms; the group of f is then lab[f]
    for _ in range(reps):
        rnd.shuffle(vals); lab=dict(zip(el,vals))
        h=0;t=0
        for f in el:
            if lab[f]==group: h+= (lab[res['nn'][f][0]]==group); t+=1
        if t and h/t>=obs: ge+=1
    return {'members':members,'observed':obs,'p':(ge+1)/(reps+1)}
def neighbour_second(res,reps=10000):
    el=res['eligible']; labs={f:FORM2G[f] for f in el}; mem=[f for f in el if labs[f]=='thou']
    if len(mem)<2: return None
    def stat(lab):
        pool=[f for f in el if lab[f]==('thou')]; non=[f for f in pool if lab[res['nn'][f][0]]!='thou']
        return (sum(lab[res['nn'][f][0]]=='you' for f in non)/len(non), len(non)) if non else (None,0)
    obs=stat(labs)
    if obs[0] is None: return {'nonThouNN':0}
    rnd=random.Random(19); vals=list(labs.values()); ge=0;used=0
    for _ in range(reps):
        rnd.shuffle(vals); lab=dict(zip(el,vals)); s=stat(lab)
        if s[0] is None: continue
        used+=1; ge+= s[0]>=obs[0]
    return {'observedShareYouAmongNonThou':obs[0],'nonThouNN':obs[1],'p':(ge+1)/(used+1)}
out={'preregistered':'PREREG-ROUND18.md','run':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),'dateBasis':'declared-by-us','slices':[]}
for i,sl in enumerate(slices):
    res=analyse(sl); yrs=[t['year'] for t in sl]
    row={'slice':i+1,'years':[min(yrs),max(yrs)],'texts':[t['file'] for t in sl],'sha256':hashlib.sha256(''.join(t['sha'] for t in sl).encode()).hexdigest(),'words':res['words'],
         'thouPer10k':round(1e4*sum(res['occ'].get(f,0) for f in GROUPS['thou'])/res['words'],2),'youPer10k':round(1e4*sum(res['occ'].get(f,0) for f in GROUPS['you'])/res['words'],2),'eligible':res['eligible'],
         'nn':{f:[v[0],round(v[1],3)] for f,v in res['nn'].items()},'B1_thou':perm_test(res,'thou'),'B3_thou_neighbour_you':neighbour_second(res),'control_he':perm_test(res,'he'),'control_she':perm_test(res,'she'),'control_they':perm_test(res,'they'),'control_I':perm_test(res,'I')}
    out['slices'].append(row)
    print('slice',row['slice'],row['years'],len(sl),'texts',row['words'],'words | thou/10k',row['thouPer10k'],'you/10k',row['youPer10k'])
    print('  eligible thou-forms',[f for f in res['eligible'] if f in GROUPS['thou']])
    for k in ('B1_thou','B3_thou_neighbour_you','control_he','control_she','control_they','control_I'):
        r=row[k]; print('  ',k,json.dumps({a:(round(b,3) if isinstance(b,float) else b) for a,b in r.items() if a!='members'}) if r else 'ineligible (fewer than two eligible forms)')
json.dump(out,open('/tmp/gum-data/basins-round18.json','w'),indent=1,default=str); print('written')
