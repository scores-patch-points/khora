# show.py — print a compact table from a results JSON (analyse-strata.mjs or confirm output). Presentation only.
import json,sys
d=json.load(open(sys.argv[1]))
ORDER=["c1","c2","c3","c4_6","c7_15","c16p"]
print("K1",d.get("K1_sham"),"K6",d.get("K6_determinism"),"pairs",d.get("pairs"),"valid",d.get("runValid"))
for key,cells in d["cells"].items():
    pool=d["pooled"][key]
    print(f"\n== {key}  pooled c2..c16p n={pool['n']}  S_ENTRY {pool['auc']['S_ENTRY']} {pool['ci']['S_ENTRY']} permq95 {pool['perm']['S_ENTRY']['q95']} | S_OWN {pool['auc']['S_OWN']} S_ALL {pool['auc']['S_ALL']} S_SPAN {pool['auc']['S_SPAN']} EXT {pool['auc']['EXTENT']} NONNULL {pool['auc']['NONNULL']} BURST {pool['auc']['R_BURST']}")
    print("   pooled controls", pool['controls'], "inBand",pool['controlsInBand'])
    pr=d["probes"].get(key,{})
    if pr.get("record"): print("   PROBE record",pr["record"]["auc"],pr["record"]["ci"],"perStratum",pr["record"]["perStratum"],"diffToEntry",pr.get("diffToEntry"))
    if pr.get("controlVector"): print("   PROBE ctrl  ",pr["controlVector"]["auc"],pr["controlVector"]["ci"])
    print("   stratum   n  S_ENTRY [CI]            q95   S_OWN S_ALL S_SPAN  EXT  NONNULL BURST | nonNull names/unl  medExt n/u | void active")
    for st in ORDER:
        c=cells.get(st)
        if not c or "skipped" in c: print("  ",st,"skipped",c); continue
        a=c["auc"]; t=c["trace"]
        print(f"   {st:6} {c['n']:4}  {a['S_ENTRY']:.3f} [{c['ci']['S_ENTRY'][0]:.3f},{c['ci']['S_ENTRY'][1]:.3f}]  {c['perm']['S_ENTRY']['q95']:.3f}  {a['S_OWN']:.3f} {a['S_ALL']:.3f} {a['S_SPAN']:.3f} {a['EXTENT']:.3f} {a['NONNULL']:.3f} {a['R_BURST']:.3f} | {t['nonNullNames']:.2f}/{t['nonNullUnlabelled']:.2f}  {t['medianExtentNames']}/{t['medianExtentUnlabelled']} | {c['voidCell']!s:5} {c['active']}  ctrl "+" ".join(f"{k[2:]}={v:.2f}" for k,v in c['controls'].items()))
print("\nCANDIDATES"); 
for r in d["candidates"]: print(" ",r["id"],r["score"],"thr",r["threshold"],"AUC",r["discoveryAuc"],r["ci95"],"pairs",r["pairs"],"BA",r["balancedAccuracyAtThreshold"],"gates",r["gates"],"perBlock",r["consistencyPerBlock"])
print("RULES",[r["id"] for r in d["rules"]])
print("PRED",json.dumps({k:v["hold"] for k,v in d["predictions"].items()}))
print("VERDICT",json.dumps(d["verdict"]))
