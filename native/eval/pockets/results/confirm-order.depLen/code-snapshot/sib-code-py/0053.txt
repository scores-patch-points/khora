# show-confirm.py — presentation only
import json,sys
d=json.load(open(sys.argv[1]))
print('K1',d['K1_sham'],'K6',d['K6_determinism'],'pairs',d['pairs'],'valid',d['runValid'])
def row(tag,c):
    if c.get('verdict')=='VOID' and 'auc' not in c: print(tag,'VOID (no live strata)'); return
    cal=c.get('caliper',{})
    print(f"{tag}\n   {c['verdict']} pairs {c['pairs']} AUC {c['auc']} {c['ci']} permq95 {c['permQ95']} | TPR {c['tpr']} TNR {c['tnr']} | nonNull n/u {c['nonNullNames']}/{c['nonNullUnlabelled']} | vsBurst {c['diffToBurst']}")
    print(f"   controlsPooled {c['controlsPooled']} inBand {c['controlsInBand']} ctrlProbe {c.get('controlProbeAuc')} caliper {cal.get('pairs')} auc {cal.get('auc')} {cal.get('ci')} gate {cal.get('gate')}")
    print(f"   consistency {c['consistency']} strataAtLeast058 {c['strataAtLeast058']} perBlock {[ (b[0][-10:],b[1],b[2]) for b in c['perBlock']]}")
    print('   strata',{st:(x.get('auc'),x.get('n'),x.get('voidCell'),x.get('tpr'),x.get('tnr')) for st,x in c['cells'].items()})
for tag,c in d['candidates'].items(): row(tag,c)
print('\nLIMITS')
for tag,c in d['limits'].items():
    if 'auc' in c: print(f"  {tag}: AUC {c['auc']} {c['ci']} pairs {c['pairs']} ctrlInBand {c['controlsInBand']} strata {{ {', '.join(st+':'+str(x.get('auc')) for st,x in c['cells'].items())} }}")
    else: print(' ',tag,c.get('verdict'))
print('\nPROBES')
for k,v in d['probes'].items(): print(' ',k,'record',v['record'],'\n     ctrl',v['controlVector'])
print('\nFINAL',json.dumps(d['finalRules'],indent=1))
