// sanity.mjs: DEBUG ONLY on scoper DISCOVERY days (touched). Cross-checks own loader/score against the confirmer's lib, and times the matcher. Reports no verdict.
import { loadDay, buildIx, feat, laterOccs, rngOf, SETS } from "./lib.mjs";
import { matchDay, pAuc } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const C = await import("../confirm-R1_first_slot_share/lib.mjs");
const keys = SETS.D.filter((k) => /ubuntu\/(2007|2010|2011)/.test(k)).slice(0, 2);
for (const key of keys) {
  const t0 = Date.now(), d = loadDay(key), e = C.loadIrcDay(key);
  const sameT = JSON.stringify(d.T) === JSON.stringify(e.T), sameNicks = [...d.nicks].sort().join() === [...e.nicks].sort().join();
  const ix = buildIx(d.T), cx = C.streamIndex(d.T), occ = laterOccs(d), r = rngOf("san", key);
  let bad = 0, n = 0; for (let j = 0; j < 400; j++) { const o = occ[Math.floor(r() * occ.length)]; const a = feat(ix, o.k, o.w).ishare, b = C.ishare(cx, o.w, o.k); n++; if (Math.abs(a - b) > 1e-12) bad++; }
  const m = matchDay(d, "S0", { max: 400 });
  console.log(key, "msgs", d.T.length, "sameT", sameT, "sameNicks", sameNicks, "scoreMismatch", bad, "/", n, "pairs", m.pairs.length, "auc", pAuc(m.pairs, "ishare"), "ctl i", pAuc(m.pairs, "i"), "ms", Date.now() - t0);
}
