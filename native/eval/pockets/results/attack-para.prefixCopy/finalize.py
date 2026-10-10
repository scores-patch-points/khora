# finalize.py -- collect the headline numbers of the attack from the per-attack JSON files into attack-summary.json (no new computation).
import json
L=lambda f: json.load(open(f))
A=L('A_summary.json'); E=L('E_summary.json'); B=L('B_rival.json'); C=L('C_multiplicity.json'); D=L('D_summary.json'); G=L('G_summary.json'); Q=L('Eq_summary.json'); U=L('A_eqLen_union.json'); chk=L('check-atlas.json')
top=lambda n: [(r['stat'],round(r['z']['partial'],3),round(r['v']['partial'],3),round(r['pres']['partial'],3)) for r in B['rivals'][:n]]
out={
 'harnessCheck':{'pocketsChecked':len(chk['res']),'worstAbsDiffVsAtlas':chk['worstAbsDiff']},
 'A':{'P+':{k:{'nEval':v['nEval'],'status':v['status'],'sameSignBothHalves':v['sameSignBothHalves'],'medianExcessRatio':v['medianExcessRatio']} for k,v in A['P+']['variants'].items()},
      'P-':{k:{'nEval':v['nEval'],'status':v['status']} for k,v in A['P-']['variants'].items()},'eqLenUnion':U,'equalSizeRegister':Q},
 'B':{'top':top(8),'computed':B['computedRivals_50draws'],'withinNull':B['computedRivals_withinNull'],'secondToken':G},
 'C':{'C1':C['C1'],'C2':{k:C['C2'][k] for k in C['C2'] if k not in ('leaveOneRegisterOut',)},'C3':C['C3']},
 'D':D,
 'E':{k:E[k] for k in ('P+','P-','all','newNegWithin')},
}
json.dump(out,open('attack-summary.json','w'),indent=1)
print(json.dumps(out['B']['top'])); print(out['harnessCheck'])
