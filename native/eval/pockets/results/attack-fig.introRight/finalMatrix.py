# finalMatrix.py -- per-pocket survival matrix over the 31 PRESENT pockets (A tok/size/length, C2 doc-level, E mechanism) and the iid / planted calibration summary. stdlib only.
import json, os, statistics, math
HERE = os.path.dirname(os.path.abspath(__file__))
ld = lambda n: json.load(open(os.path.join(HERE, n)))
T = {r['id']: r for r in ld('table.json')['rows']}
tok = ld('A_tok.json'); size = ld('A_size.json'); a2 = ld('A2.json'); c2 = ld('C2.json'); E = ld('E.json')
ids = open(os.path.join(HERE, 'present31.txt')).read().strip().split(',')
sg = lambda x: 1 if x > 0 else -1
def surv_tok(i, t):
    b = tok[i]['atlasD']; v = tok[i]['variants'][t]
    if v['d'] is None: return False
    return v['status'] in ('P+', 'P-') and sg(1 if v['status'] == 'P+' else -1) == sg(b) and 0.5 <= v['d'] / b <= 2
def size_ratio(i):
    r = size[i]; Bs = sorted(int(b) for b in r['B'])
    if not Bs: return None, None
    B = Bs[-1] if Bs[-1] <= 64000 else 64000
    B = max([b for b in Bs if b <= 64000] or [Bs[0]]); reps = r['B'][str(B)]
    ds = [x['d'] for x in reps if x['d'] is not None]; return B, (statistics.mean(ds) / r['atlasD']) if ds else None
rows = {}
for i in ids:
    reg = T[i]['register']; cls = 'code' if reg == 'code' else 'diagram' if reg == 'diagram' else 'other-cd' if reg in ('markup', 'notation') else 'natural'
    B, sr = size_ratio(i); b = tok[i]['atlasD']
    f12 = a2[i]['F12']['d']; fc = [x['d'] for x in a2[i]['FC']['reps'] if x['d'] is not None]; f12b = [x['d'] for x in a2[i]['F12B'] if x['d'] is not None]; th = [x['d'] for x in a2[i]['TH'] if x['d'] is not None]
    r = dict(cls=cls, reg=reg, atlasD=b, T1=surv_tok(i, 'T1'), T2=surv_tok(i, 'T2'), T3=surv_tok(i, 'T3'), T4=surv_tok(i, 'T4'), sizeB=B, sizeRatio=sr, F12=(f12 / b if f12 is not None else None), FCratio=(statistics.mean(fc) / b if fc else None),
             F12Bratio=(statistics.mean(f12b) / b if f12b else None), THratio=(statistics.mean(th) / b if th else None), docT=c2[i]['t'], docSame=c2[i]['sameSign'], docHolds=c2[i]['holds'], ratio2=E[i]['d2']['d'] / E[i]['d1']['d'], fsPresent=False)
    z = (E[i]['fs']['zD'], E[i]['fs']['zC']); r['fsPresent'] = z[0] is not None and z[1] is not None and abs(z[0]) >= 4 and abs(z[1]) >= 4 and z[0] * z[1] > 0
    r['robust'] = bool(r['T1'] and r['T2'] and r['T3'] and (sr is None or sr >= 0.5) and r['docHolds'] and (r['FCratio'] is None or r['FCratio'] >= 0.5))
    rows[i] = r
json.dump(rows, open(os.path.join(HERE, 'final_matrix.json'), 'w'), indent=1)
print('%-24s %-8s %7s T1 T2 T3 T4 | size(B)ratio | F12 FC | TH | doc t same hold | ratio2 fsP | ROBUST' % ('pocket', 'class', 'd'))
for i, r in rows.items():
    fm = lambda x: ' NA ' if x is None else '%4.2f' % x
    print('%-24s %-8s %+.3f  %s  %s  %s  %s | %2dk %s | %s %s | %s | %5.1f %2d %s | %5.2f %s | %s' % (i, r['cls'], r['atlasD'], 'Y' if r['T1'] else '-', 'Y' if r['T2'] else '-', 'Y' if r['T3'] else '-', 'Y' if r['T4'] else '-', (r['sizeB'] or 0) // 1000, fm(r['sizeRatio']), fm(r['F12']), fm(r['FCratio']), fm(r['THratio']), r['docT'], r['docSame'], 'Y' if r['docHolds'] else '-', r['ratio2'], 'Y' if r['fsPresent'] else '-', 'ROBUST' if r['robust'] else 'fails'))
for cls in ('code', 'diagram', 'other-cd', 'natural'):
    sub = [r for r in rows.values() if r['cls'] == cls]; print('%-9s n=%2d robust=%2d | T1 %d T2 %d T3 %d T4 %d | sizeOK %d/%d | FCok %d/%d | docHolds %d | fsPresent %d | ratio2 median %.2f' % (cls, len(sub), sum(r['robust'] for r in sub), sum(r['T1'] for r in sub), sum(r['T2'] for r in sub), sum(r['T3'] for r in sub), sum(r['T4'] for r in sub),
        sum(1 for r in sub if r['sizeRatio'] is not None and r['sizeRatio'] >= .5), sum(1 for r in sub if r['sizeRatio'] is not None), sum(1 for r in sub if r['FCratio'] is not None and r['FCratio'] >= .5), sum(1 for r in sub if r['FCratio'] is not None), sum(r['docHolds'] for r in sub), sum(r['fsPresent'] for r in sub), statistics.median([r['ratio2'] for r in sub])))
print('ROBUST overall: %d of 31' % sum(r['robust'] for r in rows.values()))
# iid calibration at code-like size
iid = ld('D_iid.json'); ds = [x['v1']['d'] for x in iid]; zs = [z for x in iid for z in (x['v1']['zD'], x['v1']['zC']) if z is not None]
print('\niid worlds (20 reps, 300k tokens, mean unit length 4.5): PRESENT %d of 20; |z|>=2 in %d of %d half-cells; |z|>=4 in %d; sd of z %.2f; d mean %+.3f sd %.3f (real code PRESENT+ d range %.2f..%.2f)' % (sum(1 for x in iid if x['v1']['status'] in ('P+', 'P-')), sum(1 for z in zs if abs(z) >= 2), len(zs), sum(1 for z in zs if abs(z) >= 4), statistics.pstdev(zs), statistics.mean(ds), statistics.pstdev(ds), min(r['atlasD'] for r in rows.values() if r['cls'] == 'code' and r['atlasD'] > 0), max(r['atlasD'] for r in rows.values() if r['cls'] == 'code')))
json.dump(dict(iid=dict(n=len(iid), present=sum(1 for x in iid if x['v1']['status'] in ('P+', 'P-')), halfCellsAbsZge2=sum(1 for z in zs if abs(z) >= 2), halfCells=len(zs), absZge4=sum(1 for z in zs if abs(z) >= 4), sdZ=statistics.pstdev(zs), dMean=statistics.mean(ds), dSd=statistics.pstdev(ds))), open(os.path.join(HERE, 'iid_calibration.json'), 'w'), indent=1)
