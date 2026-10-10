import json,sys
f=sys.argv[1]; names=sys.argv[2:] 
d=json.load(open(f))
for n,g in d['groups'].items():
    if names and not any(n.startswith(x) for x in names): continue
    if 'skipped' in g: print(n,'skipped'); continue
    a=g['auc']; c=g['ci']; q=g['flipQ95']
    print(f"{n:18s} pairs {int(g['pairs']):4d} days {g['days']:2d} | IMP {a['IMP']:.3f} [{c['IMP'][0]:.2f},{c['IMP'][1]:.2f}] q95 {q['IMP']:.3f} FULL {a['FULL']:.3f} | RIV {a['RIV']:.3f} RIV+IMP {a['RIVIMP']:.3f} inc {g['increment']['point']:+.3f} [{g['increment']['ci'][0]:+.3f},{g['increment']['ci'][1]:+.3f}]"+(f" fitnullq95 {g['incrementFitNull']['q95']:+.3f}" if 'incrementFitNull' in g else '')+f" | POS {a['POS']:.3f} | IMPshuf {a['IMPS']:.3f}")
    print(f"{'':18s} scal S_ENTRY {a['S_ENTRY']:.3f} S_OWN {a['S_OWN']:.3f} S_ALL {a['S_ALL']:.3f} S_SPAN {a['S_SPAN']:.3f} | R_LOCAL {a['R_LOCAL']:.3f} BURST {a['R_BURST']:.3f} RECENCY {a['R_RECENCY']:.3f} LEN {a['R_MSGLEN']:.3f} IDX {a['R_IDX']:.3f} FREQ {a['R_FREQ']:.3f} POSMSG {a['R_POSMSG']:.3f} | K5 {g['K5_posNonNull']} neg {g['negNonNull']} shufpos {g['shuffledPosNonNull']} ext {g['posMedianExtent']}/{g['negMedianExtent']}")
    if g.get('wAuc'): print(f"{'':18s} natural-weighted: IMP {g['wAuc']['IMP']} S_ENTRY {g['wAuc']['S_ENTRY']} RIV {g['wAuc']['RIV']} RIVIMP {g['wAuc']['RIVIMP']} POS {g['wAuc']['POS']}")
