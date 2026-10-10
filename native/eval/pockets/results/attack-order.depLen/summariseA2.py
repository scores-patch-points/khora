# summariseA2.py -- aggregate the window sweep (A2/*.json): equal token count (20000) and EXACTLY equal unit length W  -> A2-summary.json
import json, glob, os
from collections import Counter, defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
R = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(HERE, 'A2', '*.json')))]
WS = ['4', '6', '8', '12', '20', '32', '64']
PLUS = ['novel', 'memoir', 'dialect', 'reportage', 'translation', 'chat', 'treebank']
MINUS = ['nomenclature', 'diagram', 'code', 'scripture']
def sg(x): return 1 if x > 0 else -1
out = {'n': len(R), 'W': {}}
print('pockets', len(R))
print('ALL real pockets: status counts per W (n/a excluded)')
for W in ['atlas'] + WS:
    c = Counter()
    for r in R:
        st = r['atlasStatus'] if W == 'atlas' else r['W'][W]['status']
        if st in ('n/a', 'nodata', 'undef'): continue
        c[st] += 1
    out['W'][W] = {'all': dict(c)}
    print('  W=%-5s %s' % (W, dict(c)))
print('\nAtlas PRESENT pockets: sign-retained (both halves) / protocol PRESENT same sign / flipped (both halves opposite), by atlas class')
for cls in ('P+', 'P-'):
    sign = 1 if cls == 'P+' else -1
    for W in WS:
        rs = [r for r in R if r['atlasStatus'] == cls and r['W'][W]['status'] != 'n/a']
        keep = sum(1 for r in rs if all(sg(r['W'][W][h]['v']) == sign for h in ('discover', 'confirm')))
        same = sum(1 for r in rs if r['W'][W]['status'] == cls)
        flip = sum(1 for r in rs if all(sg(r['W'][W][h]['v']) == -sign for h in ('discover', 'confirm')))
        out['W'][W][cls] = {'n': len(rs), 'signKept': keep, 'samePresent': same, 'flipped': flip}
        print('  atlas %s  W=%-3s n=%3d  signKept %3d  samePRESENT %3d  flippedBoth %3d' % (cls, W, len(rs), keep, same, flip))
print('\nClaimed scopes over ALL pockets of the register (n pockets in register; counts at each W of PRESENT+ / PRESENT-)')
def reg_rows(regs):
    return [r for r in R if r['register'] in regs]
for lab, regs in (('+ scope (novel, memoir, dialect, reportage, translation, chat, treebank)', PLUS), ('- scope (nomenclature, diagram, code, scripture)', MINUS), ('code only', ['code']), ('notation only', ['notation'])):
    rs = reg_rows(regs); row = {'n': len(rs)}
    line = []
    for W in ['atlas'] + WS:
        c = Counter((r['atlasStatus'] if W == 'atlas' else r['W'][W]['status']) for r in rs)
        row[W] = {k: c.get(k, 0) for k in ('P+', 'P-', 'A', 'M', 'n/a')}; line.append('W=%s:+%d/-%d' % (W, c.get('P+', 0), c.get('P-', 0)))
    out['W'].setdefault('scopes', {})[lab] = row
    print('  %-85s n=%3d  ' % (lab, len(rs)) + ' '.join(line))
# median v by W for atlas-PRESENT classes and for prose scope / code
print('\nmedian pocket-level v (mean of halves) by W')
def med(a):
    a = sorted(a); n = len(a); return None if not n else (a[n // 2] if n % 2 else 0.5 * (a[n // 2 - 1] + a[n // 2]))
for lab, sel in (('atlas P+ (91)', [r for r in R if r['atlasStatus'] == 'P+']), ('atlas P- (49)', [r for r in R if r['atlasStatus'] == 'P-']), ('code register', reg_rows(['code'])), ('+scope registers', reg_rows(PLUS)), ('scripture', reg_rows(['scripture'])), ('notation', reg_rows(['notation']))):
    row = []
    for W in ['atlas'] + WS:
        vs = [0.5 * (r['atlas']['discover']['v'] + r['atlas']['confirm']['v']) if W == 'atlas' else 0.5 * (r['W'][W]['discover']['v'] + r['W'][W]['confirm']['v']) for r in sel if W == 'atlas' or r['W'][W]['status'] != 'n/a']
        m = med(vs); row.append('%s:%+.3f' % (W, m) if m is not None else '%s:NA' % W)
    print('  %-18s ' % lab + ' '.join(row))
json.dump(out, open(os.path.join(HERE, 'A2-summary.json'), 'w'), indent=1)
