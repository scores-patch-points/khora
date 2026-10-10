// eval/law/provisional/attack-relatedness-sister-dyads/build.mjs — DATA PREPARATION ONLY: builds matched-pair row sets of the confirmer's window A (and window B) in several configurations and caches them.
// No probe is fitted and no AUC is computed (the only check is that cached BASE rows equal the confirmer's cached rows). Usage (env required):
//   NAME_COMPANY_PAIRBLOCK=1 node build.mjs <cfg,cfg,...> [stem,stem,...]
// cfgs: noprop (coarse matching, but neither candidate may have a gold-PROPN token among its two left neighbours: removes name-internal company; gold used only to select evaluation rows), local (count +-1, chars +-1, index exact<=3 else +-3, sentence length +-4, negative within 12 sentences of the positive), base (confirmer's coarse matching, UD words; must reproduce the confirmer's cache), strict (count +-1, chars exact, index exact<=3 else +-1, sentence length +-2), ultra (count exact, chars exact,
// index exact, sentence length +-1), surf (surface tokens, coarse), surfstrict (surface tokens, strict), causal (burn-in 30%, coarse; rows carry global, mid-tie and causal bins), B (window B, coarse).
import fs from "node:fs";
import path from "node:path";
import { TB, META, METAB, DATA, rs, rngFor, seedFor, STEMS, freshDoc, docOf, dedupRaw, sha256, pairsOf } from "./lib.mjs";
import { coarsePicks, strictPicks, packRows, balance } from "./feat.mjs";
import { loadFresh } from "../confirm-relatedness-sister-dyads/fresh.mjs";
const STRICT = { dc: 1, dl: 0, di: 1, dsl: 2 }, ULTRA = { dc: 0, dl: 0, di: 0, dsl: 1 }, LOCAL = { dc: 1, dl: 1, di: 3, dsl: 4, ds: 12 };
const cfgs = (process.argv[2] ?? "base").split(","), stems = process.argv[3] ? process.argv[3].split(",") : STEMS;
for (const c of cfgs) fs.mkdirSync(path.join(DATA, c), { recursive: true });
const save = (cfg, stem, picks, doc, extra) => {
  const rows = packRows(doc, picks.picks); fs.writeFileSync(path.join(DATA, cfg, `${stem}.json`), JSON.stringify({ stem, cfg, pairs: picks.pairs, dropped: picks.dropped, balance: balance(rows), ...extra, rows }));
  return `${cfg}:${picks.pairs}${picks.dropped != null ? `(-${picks.dropped})` : ""}`;
};
for (const stem of stems) {
  const t0 = Date.now(), out = [], m = META[stem], d = dedupRaw(stem), sl = d.slice(m.windowStart, m.windowEnd);
  if (cfgs.includes("base")) {
    const fd = freshDoc(stem, TB[stem], false, m.attempt ?? 0), r = rngFor(seedFor("conf-rel-sister", stem, "pairs"));
    coarsePicks(fd.doc, "LATER", r); const pk = coarsePicks(fd.doc, "FIRST", r), rows = packRows(fd.doc, pk.picks), ref = loadFresh(stem, "FIRST");
    let same = ref && ref.rows.length === rows.length; if (same) for (let k = 0; k < rows.length; k++) { const a = rows[k], b = ref.rows[k]; if (a[0] !== b.y || a[1] !== b.block || a[7] !== b.f.L1.indexOf(1) || a[8] !== b.f.L2.indexOf(1) || a[9] !== b.f.R1.indexOf(1) || a[10] !== b.f.R2.indexOf(1) || a[13] !== b.f.CHAR.indexOf(1)) { same = false; break; } }
    const streamOk = (() => { const mine = docOf(stem, sl); return fd.doc.stream.length === mine.stream.length && fd.doc.stream.every((s, k) => s.join(" ") === mine.stream[k].join(" ")); })();
    out.push(save("base", stem, pk, fd.doc, { equalsConfirmerCache: !!same, rawWindowEqualsFreshDoc: streamOk }) + (same ? "=cache" : "!=CACHE") + (streamOk ? " win=ok" : " win=MISMATCH"));
    if (cfgs.includes("strict") || cfgs.includes("ultra")) {
      if (cfgs.includes("strict")) out.push(save("strict", stem, strictPicks(fd.doc, "FIRST", rs("pairs", "strict", stem), STRICT), fd.doc, { params: STRICT }));
      if (cfgs.includes("ultra")) out.push(save("ultra", stem, strictPicks(fd.doc, "FIRST", rs("pairs", "ultra", stem), ULTRA), fd.doc, { params: ULTRA }));
    }
  } else {
    const fd = (cfgs.includes("strict") || cfgs.includes("ultra")) ? freshDoc(stem, TB[stem], false, m.attempt ?? 0) : null;
    if (cfgs.includes("strict")) out.push(save("strict", stem, strictPicks(fd.doc, "FIRST", rs("pairs", "strict", stem), STRICT), fd.doc, { params: STRICT }));
    if (cfgs.includes("ultra")) out.push(save("ultra", stem, strictPicks(fd.doc, "FIRST", rs("pairs", "ultra", stem), ULTRA), fd.doc, { params: ULTRA }));
  }
  if (cfgs.includes("local")) { const fd = freshDoc(stem, TB[stem], false, m.attempt ?? 0); out.push(save("local", stem, strictPicks(fd.doc, "FIRST", rs("pairs", "local", stem), LOCAL), fd.doc, { params: LOCAL })); }
  if (cfgs.includes("surf") || cfgs.includes("surfstrict")) {
    const doc = docOf(stem, sl, { surface: true });
    if (cfgs.includes("surf")) out.push(save("surf", stem, coarsePicks(doc, "FIRST", rs("pairs", "surf", stem)), doc, {}));
    if (cfgs.includes("surfstrict")) out.push(save("surfstrict", stem, strictPicks(doc, "FIRST", rs("pairs", "surfstrict", stem), STRICT), doc, { params: STRICT }));
  }
  if (cfgs.includes("noprop")) {
    const doc = docOf(stem, sl, { noPropnLeft: true }), all = docOf(stem, sl), seen = new Map(); let nP = 0, nIn = 0;
    all.stream.forEach((sent, s) => sent.forEach((w, i) => { const k = seen.get(w) ?? 0; seen.set(w, k + 1); if (k === 0 && all.cls(s, i) === "P") { nP++; if ((i > 0 && all.cls(s, i - 1) === "P") || (i > 1 && all.cls(s, i - 2) === "P")) nIn++; } }));
    out.push(save("noprop", stem, coarsePicks(doc, "FIRST", rs("pairs", "noprop", stem)), doc, { firstPropn: nP, firstPropnWithPropnLeft: nIn, shareNameInternal: nP ? +(nIn / nP).toFixed(4) : null }));
  }
  if (cfgs.includes("causal")) { const doc = docOf(stem, sl, { burn: 0.3 }); out.push(save("causal", stem, coarsePicks(doc, "FIRST", rs("pairs", "causal", stem)), doc, { burnSentence: doc.burnSentence })); }
  if (cfgs.includes("B") && METAB[stem]) {
    const b = d.slice(METAB[stem].range[0], METAB[stem].range[1]), doc = docOf(stem, b), r = rngFor(seedFor("conf-rel-sister", "B", stem, "pairsB")), pk = coarsePicks(doc, "FIRST", r);
    out.push(save("B", stem, pk, doc, { claimedPairs: METAB[stem].pairs }) + (pk.pairs === METAB[stem].pairs ? "=claimed" : `!=claimed(${METAB[stem].pairs})`));
  }
  console.error(`${stem} ${((Date.now() - t0) / 1000).toFixed(1)}s ${out.join(" ")}`);
}
