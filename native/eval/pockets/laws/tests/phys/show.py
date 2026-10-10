import json,sys
ids=["massAdd","massExp","attrPMI","attrDecay","voidShare","voidRescue","gravAlpha","gravBeta","gravAlphaSd","affect","affectAsym"]
def calib():
    d=json.load(open('results-calib.json'))
    for k,s in d['summary'].items(): print('%-12s'%k, s)
    tot4=sum(s['absZ4'] for s in d['summary'].values()); tot2=sum(s['absZ2'] for s in d['summary'].values()); n=sum(s['n'] for s in d['summary'].values())
    print('cells',n,'|z|>=4:',tot4,'(%.2f%%)'%(100*tot4/n),'|z|>=2:',tot2,'(%.1f%%)'%(100*tot2/n))
def tab(f, key=None):
    d=json.load(open(f))
    for i in ids: print('%-12s'%i,'  '.join('%s v=%8s z=%6s'%(k,r['cells'][i]['v'],r['cells'][i]['z']) for k,r in d.items()))
def planted():
    d=json.load(open('results-planted.json'))
    for w,h in d.items():
        for half in ['discover','confirm']:
            r=h[half]; print('%-11s %-8s'%(w,half[:4]),r['tokens'],' '.join('%s:%s'%(i[:7],r['cells'][i]['z']) for i in ids))
{'calib':calib,'planted':planted}.get(sys.argv[1], lambda: tab('results-%s.json'%sys.argv[1]))()
