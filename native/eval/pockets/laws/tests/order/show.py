import json,sys
r=json.load(open(sys.argv[1]))
ids=[i for i in r if 'halves' in r[i]]
stats=[s for s in r[ids[0]]['halves']['discover'] if s!='tokens']
print('%-10s'%'', ' '.join('%-15s'%i[:15] for i in ids))
print('%-10s'%'tokens/hf', ' '.join('%-15s'%(str(r[i]['halves']['discover']['tokens'])) for i in ids))
print('%-10s'%'meanLen', ' '.join('%-15s'%(str(r[i]['meanUnitLen'])) for i in ids))
print('%-10s'%'cpu', ' '.join('%-15s'%(str(r[i]['cpuSec']['discover'])+'/'+str(r[i]['cpuSec']['confirm'])) for i in ids))
for s in stats:
    print('%-10s'%s,' '.join('%-15s'%('%+.3f z%s/%s'%(r[i]['halves']['discover'][s]['v'] if r[i]['halves']['discover'][s]['v'] is not None else float('nan'),r[i]['halves']['discover'][s]['z'],r[i]['halves']['confirm'][s]['z'])) for i in ids))
