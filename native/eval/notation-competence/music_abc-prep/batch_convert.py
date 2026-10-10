#!/usr/bin/env python3
"""Convert every manifest piece to derived ABC (or record why not). Writes derived/<id>.abc and derived/index.json."""
import sys, os, json, time, traceback
sys.path.insert(0, "/private/tmp/claude-501/notation/music_abc/scripts")
import musicxml_to_abc as C
ROOT = "/private/tmp/claude-501/notation/music_abc"
def read_xml_to_tmp(path):
    return path
def one(x):
    fn = x["id"].replace(":", "__")
    try:
        # music21 reads .mxl and .xml directly
        t, lines_, info = C.convert(f"{ROOT}/{x['file']}", x["id"])
        open(f"{ROOT}/derived/{fn}.abc", "w", encoding="utf-8").write(t)
        os.makedirs(f"{ROOT}/derived/lines", exist_ok=True)
        for k, lt in enumerate(lines_):
            open(f"{ROOT}/derived/lines/{fn}.{k}.abc", "w", encoding="utf-8").write(lt)
        return x["id"], dict(ok=True, **info)
    except C.Unsupported as e:
        return x["id"], dict(ok=False, reason=str(e))
    except Exception as e:
        return x["id"], dict(ok=False, reason="error:" + type(e).__name__ + ":" + str(e)[:120])
if __name__ == "__main__":
    from multiprocessing import Pool
    man = [m for m in json.load(open(f"{ROOT}/manifest.core.json")) if m["format"].startswith("musicxml")]
    os.makedirs(f"{ROOT}/derived", exist_ok=True)
    res = {}
    with Pool(7, maxtasksperchild=8) as pool:
        for i, (mid, r) in enumerate(pool.imap_unordered(one, man)):
            res[mid] = r
            if i % 50 == 0: print(i, file=sys.stderr)
    json.dump(res, open(f"{ROOT}/derived/index.json", "w"), indent=0)
    import collections
    c = collections.Counter((m["source"], res[m["id"]].get("reason", "ok")) for m in man)
    for k, v in sorted(c.items()): print(k, v)
