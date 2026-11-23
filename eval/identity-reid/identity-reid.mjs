// EXPLORATORY: which parts of the kāraka graph carry IDENTITY? A referent's identity is meaningful iff it RE-IDENTIFIES it: features read from
// one stretch of the text pick out the same referent in a different stretch, and not someone else. Blocks of BLOCK sentences alternate
// A / B (so both halves span the whole arc); for every eligible name, its A vector is matched against every name's B vector (cosine);
// MRR / top-1 / top-5 of its own B. Chance MRR for N candidates is (ln N + 0.577) / N. Feature families:
//   verbs      role:verb              what it does and undergoes (the book's own verbs)
//   partners   with:partner           who it shares an event with (any role, any verb)
//   edges      role:verb:partner      who it does what with
//   v+p        verbs + partners
//   stable     the families above, kept only where significant in A (G2 >= 3.84 against the other names): "differences that make a difference"
// usage: node identity-reid.mjs <parse.json> [block=150] [minFramesPerHalf=12]
import fs from "node:fs";
const K = new URL("../../native/", import.meta.url).href;
const { karakaRows, KARAKAS } = await import(K + "adapters/text/karaka-total.mjs");
const { referentsInOrder } = await import(K + "adapters/text/referents-in-order.mjs");
const { priorsFor } = await import(K + "the-fold/read-core.mjs");
const { classifyWord } = await import(K + "adapters/text/wordclass.js");
const parse = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), BLOCK = Number(process.argv[3] ?? 150), MINF = Number(process.argv[4] ?? 12), pr = priorsFor("eng");
const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
const cast = referentsInOrder(parse, { commonNoun });
const kindOf = new Map(cast.referents.map((b) => [b.ref, b])), isName = (r) => kindOf.get(r)?.kind === "name";
// features per referent per half
const feats = { A: new Map(), B: new Map() }, nFrames = { A: new Map(), B: new Map() };
const bump = (h, ref, fam, key) => { let m = feats[h].get(ref); if (!m) feats[h].set(ref, (m = new Map())); const k = `${fam}|${key}`; m.set(k, (m.get(k) ?? 0) + 1); };
for (const p of parse) {
  const h = Math.floor(p.order / BLOCK) % 2 === 0 ? "A" : "B";
  const rows = karakaRows(p.rows, { stem: "eng" }), kids = new Map(); for (const r of rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
  for (const v of rows) {
    if (v.upos !== "VERB") continue;
    const verb = String(v.lemma ?? v.form).toLowerCase();
    const parts = (kids.get(v.id) ?? []).filter((c) => KARAKAS.includes(c.karaka)).map((c) => ({ role: c.karaka, ref: cast.mentionOf[`${p.order}.${c.id}`] ?? null })).filter((x) => x.ref);
    for (const a of parts) {
      if (!isName(a.ref)) continue;
      nFrames[h].set(a.ref, (nFrames[h].get(a.ref) ?? 0) + 1);
      bump(h, a.ref, "verbs", `${a.role}:${verb}`);
      for (const b of parts) if (b !== a && b.ref !== a.ref && (isName(b.ref) || (kindOf.get(b.ref)?.mentions ?? 0) > 3)) { bump(h, a.ref, "partners", b.ref); bump(h, a.ref, "edges", `${a.role}:${verb}:${b.ref}`); }
    }
  }
}
const eligible = [...kindOf.keys()].filter((r) => isName(r) && (nFrames.A.get(r) ?? 0) >= MINF && (nFrames.B.get(r) ?? 0) >= MINF);
const N = eligible.length, chance = (Math.log(N) + 0.5772) / N;
const idf = (fams) => { const df = new Map(); for (const h of ["A", "B"]) for (const r of eligible) for (const k of feats[h].get(r)?.keys() ?? []) if (fams.includes(k.split("|")[0])) df.set(k, (df.get(k) ?? new Set()).add(r)); return (k) => Math.log(1 + N / ((df.get(k)?.size ?? 0) + 1)); };
const vec = (h, r, fams, w, keep) => { const v = new Map(); for (const [k, c] of feats[h].get(r) ?? []) if (fams.includes(k.split("|")[0]) && (!keep || keep.has(k))) v.set(k, Math.log(1 + c) * w(k)); return v; };
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (const [k, x] of a) { na += x * x; const y = b.get(k); if (y) d += x * y; } for (const y of b.values()) nb += y * y; return na && nb ? d / Math.sqrt(na * nb) : 0; };
// features significant in A against the other eligible names (Dunning G2 on the 2x2: this name's use vs the rest), over-represented, G2 >= 3.84
const stableKeep = (r, fams) => {
  const own = feats.A.get(r) ?? new Map(), keep = new Set(); const totOwn = [...own.values()].reduce((a, b) => a + b, 0) || 1; let totAll = 0; const all = new Map();
  for (const q of eligible) for (const [k, c] of feats.A.get(q) ?? []) if (fams.includes(k.split("|")[0])) { all.set(k, (all.get(k) ?? 0) + c); totAll += c; }
  const ll = (o, e) => (o > 0 ? o * Math.log(o / e) : 0);
  for (const [k, c] of own) { if (!fams.includes(k.split("|")[0])) continue; const rest = (all.get(k) ?? c) - c, nRest = Math.max(1, totAll - totOwn), e1 = (totOwn * (c + rest)) / (totOwn + nRest), e2 = (nRest * (c + rest)) / (totOwn + nRest); const g2 = 2 * (ll(c, e1) + ll(rest, e2) + ll(totOwn - c, totOwn - e1) + ll(nRest - rest, nRest - e2)); if (c > e1 && g2 >= 3.84) keep.add(k); }
  return keep;
};
function evaluate(fams, stable = false) {
  const w = idf(fams); let mrr = 0, top1 = 0, top5 = 0, n = 0;
  for (const r of eligible) {
    const keep = stable ? stableKeep(r, fams) : null; if (stable && keep.size === 0) { n++; mrr += 1 / N; continue; }
    const q = vec("A", r, fams, w, keep);
    const sc = eligible.map((s) => [s, cos(q, vec("B", s, fams, w, keep))]).sort((a, b) => b[1] - a[1]);
    const rank = sc.findIndex((x) => x[0] === r) + 1; mrr += 1 / rank; if (rank === 1) top1++; if (rank <= 5) top5++; n++;
  }
  return { mrr: mrr / n, top1: top1 / n, top5: top5 / n };
}
console.log(`names eligible (>= ${MINF} frames in each half, blocks of ${BLOCK}): ${N} | chance: MRR ${chance.toFixed(3)}, top-1 ${(1 / N).toFixed(3)}, top-5 ${(Math.min(5, N) / N).toFixed(3)}`);
for (const [label, fams, st] of [["verbs only", ["verbs"], false], ["partners only (who it is with)", ["partners"], false], ["edges (role:verb:partner)", ["edges"], false], ["verbs + partners", ["verbs", "partners"], false], ["verbs + partners, stable only (G2>=3.84 in A)", ["verbs", "partners"], true], ["partners, stable only", ["partners"], true]]) {
  const e = evaluate(fams, st); console.log(`${label.padEnd(48)} MRR ${e.mrr.toFixed(3)}  top-1 ${e.top1.toFixed(3)}  top-5 ${e.top5.toFixed(3)}`);
}
