# summarizeE.py -- aggregate out/E/*.json into E_summary.json; table of the law under the within-document null.
import json, os, collections, statistics as S
D='out/E'
rows=[json.load(open(os.path.join(D,f))) for f in sorted(os.listdir(D))]
def st(zd,zc):
    if zd is None or zc is None: return 'undef'
    if abs(zd)>=4 and abs(zc)>=4 and zd*zc>0: return 'P+' if zd>0 else 'P-'
    if abs(zd)<2 and abs(zc)<2: return 'A'
    return 'M'
def cell(r,null,key):
    h=r['halves']; return h['discover'][null][key], h['confirm'][null][key]
out={'rows':[]}
for r in rows:
    gd,gc=cell(r,'global','prefixCopy'); wd,wc=cell(r,'within','prefixCopy')
    ex=[]
    for w in ('discover','confirm'):
        a=r['halves'][w]['global']['prefixCopy']; b=r['halves'][w]['within']['prefixCopy']
        if a['v'] is not None and a['nullMean'] is not None and b['nullMean'] is not None and a['v']-a['nullMean']!=0: ex.append((a['v']-b['nullMean'])/(a['v']-a['nullMean']))
    out['rows'].append({'id':r['id'],'group':r['group'],'register':r['register'],'grain':r['grain'],'atlas':r['atlasStatus'],'statGlobal50':st(gd['z'] if gd else None,gc['z'] if gc else None),'statWithin':st(wd['z'] if wd else None,wc['z'] if wc else None),
      'zG':[gd['z'],gc['z']],'zW':[wd['z'],wc['z']],'adjShare':ex,'docs':r['halves']['discover']['meta']['docs']+r['halves']['confirm']['meta']['docs'],'meanUnitLength':r['meanUnitLength'],'tokens':r['tokens']})
R=out['rows']
def summ(sel,label):
    n=len(sel); c=collections.Counter(x['statWithin'] for x in sel); g=collections.Counter(x['statGlobal50'] for x in sel)
    sh=[v for x in sel for v in x['adjShare']]
    return {'label':label,'n':n,'within':dict(c),'global50':dict(g),'medianAdjShare':S.median(sh) if sh else None}
out['P+']=summ([x for x in R if x['atlas']=='P+'],'atlas P+')
out['P-']=summ([x for x in R if x['atlas']=='P-'],'atlas P-')
out['all']=summ(R,'all defined')
for key in ('group','grain','register'):
    out['by_'+key]={}
    for lv in sorted(set(x[key] for x in R)):
        sel=[x for x in R if x['atlas']=='P+' and x[key]==lv]
        if sel: out['by_'+key][lv]=summ(sel,lv)
# new PRESENT-negative or newly-present cells under within-doc null
out['newNegWithin']=[x['id'] for x in R if x['statWithin']=='P-']
out['newPosFromNonP']=[x['id'] for x in R if x['atlas'] not in ('P+','P-') and x['statWithin']=='P+']
json.dump(out,open('E_summary.json','w'),indent=1)
print(json.dumps({k:out[k] for k in ('P+','P-','all')},indent=0))
print('newNegWithin',out['newNegWithin']); print('newPosFromNonP',out['newPosFromNonP'])
for key in ('group','grain'):
    print(key)
    for lv,v in out['by_'+key].items(): print('  ',lv,v['n'],v['within'],round(v['medianAdjShare'],2) if v['medianAdjShare'] is not None else None)
print('register (P+ base, n>=5)')
for lv,v in sorted(out['by_register'].items(), key=lambda kv:-kv[1]['n']):
    if v['n']>=4: print('  ',lv,v['n'],v['within'],round(v['medianAdjShare'],2) if v['medianAdjShare'] is not None else None)
