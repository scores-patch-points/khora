// EXPLORATORY: the dependency order of facts through kind induction. Facts a kind shares come first (what any member does); an individual's
// identity is what is left of it once its kind is taken away (apoha: relative to a ground, keyed by kind).
//   1. induce kinds over the names with >= MINM mentions (khora kernel/entity-kind-induction.js: stable basins in the interaction field,
//      held against a random-subset null) from their role:verb channels
//   2. re-identification across context (as identity-reid.mjs, partners family), three ways: all names as candidates (baseline); only the
//      same kind as candidates; the partner vector with its kind's mean removed (the residual)
// usage: node kind-order.mjs <parse.json> [block=150] [minFramesPerHalf=12] [minMentions=25]
import fs from "node:fs";
const K = new URL("../../native/", import.meta.url).href;
const { karakaRows, KARAKAS } = await import(K + "adapters/text/karaka-total.mjs");
const { referentsInOrder } = await import(K + "adapters/text/referents-in-order.mjs");
const { induceEntityKindCandidates } = await import(K + "kernel/entity-kind-induction.js");
const { priorsFor } = await import(K + "the-fold/read-core.mjs");
const { classifyWord } = await import(K + "adapters/text/wordclass.js");
const parse = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), BLOCK = Number(process.argv[3] ?? 150), MINF = Number(process.argv[4] ?? 12), MINM = Number(process.argv[5] ?? 25), pr = priorsFor("eng");
const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
const cast = referentsInOrder(parse, { commonNoun });
const R = new Map(cast.referents.map((b) => [b.ref, b])), isName = (r) => R.get(r)?.kind === "name";
const nm = (r) => { const b = R.get(r); return b ? b.forms[0][0] + " (" + b.mentions + ")" : r; };
// features: channels with evidence (for the induction), partners per half (for re-identification)
const chan = new Map(), part = { A: new Map(), B: new Map() }, nFr = { A: new Map(), B: new Map() };
const addChan = (r, sig, role, verb, order) => { let m = chan.get(r); if (!m) chan.set(r, (m = new Map())); let c = m.get(sig); if (!c) m.set(sig, (c = { featureKey: role, featureValue: verb, evidenceIds: new Set(), firstAt: order, lastAt: order })); c.evidenceIds.add(order); c.lastAt = order; };
const addPart = (h, a, b) => { let m = part[h].get(a); if (!m) part[h].set(a, (m = new Map())); m.set(b, (m.get(b) ?? 0) + 1); };
for (const p of parse) {
  const h = Math.floor(p.order / BLOCK) % 2 === 0 ? "A" : "B", rows = karakaRows(p.rows, { stem: "eng" }), kids = new Map();
  for (const r of rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
  for (const v of rows) {
    if (v.upos !== "VERB") continue; const verb = String(v.lemma ?? v.form).toLowerCase();
    const parts = (kids.get(v.id) ?? []).filter((c) => KARAKAS.includes(c.karaka)).map((c) => ({ role: c.karaka, ref: cast.mentionOf[`${p.order}.${c.id}`] ?? null })).filter((x) => x.ref);
    for (const a of parts) {
      if (!isName(a.ref)) continue;
      addChan(a.ref, `${a.role}:${verb}`, a.role, verb, p.order); nFr[h].set(a.ref, (nFr[h].get(a.ref) ?? 0) + 1);
      for (const b of parts) if (b !== a && b.ref !== a.ref && (isName(b.ref) || (R.get(b.ref)?.mentions ?? 0) > 3)) addPart(h, a.ref, b.ref);
    }
  }
}
// 1. kinds
const pop = new Map([...R.values()].filter((b) => b.kind === "name" && b.mentions >= MINM && chan.has(b.ref)).map((b) => [b.ref, chan.get(b.ref)]));
const ind = induceEntityKindCandidates(pop, { population: "book:names" });
const kinds = ind.candidates.map((c, i) => ({ id: "k" + (i + 1), members: [...c.memberRefs], stable: !!c.field?.stable, standards: (c.distinguishingParameters ?? []).map((x) => x.signature ?? String(x)) }));
const kindOf = new Map(); for (const k of kinds) for (const m of k.members) if (!kindOf.has(m)) kindOf.set(m, k);
console.log(`population ${pop.size} names; kinds found ${kinds.length} (${kinds.filter((k) => k.stable).length} stable); covering ${kindOf.size} names`);
for (const k of kinds.slice(0, 8)) console.log(`  ${k.id} ${k.stable ? "stable" : "weak  "} ${String(k.members.length).padStart(3)} members, e.g. ${k.members.slice(0, 5).map((m) => nm(m).split(" (")[0]).join(", ")} | what the kind shares: ${k.standards.slice(0, 5).join(", ")}`);
// the order of facts for a few names: kind-level first, then what the individual adds
for (const who of ["Prince Andrew", "Natásha", "Sónya", "Napoleon", "Kutúzov"]) {
  const b = [...R.values()].find((x) => x.kind === "name" && x.forms[0][0] === who); if (!b || !kindOf.has(b.ref)) { console.log(`- ${who}: no kind`); continue; }
  const k = kindOf.get(b.ref), mine = chan.get(b.ref), std = new Set(k.standards);
  const level0 = [...mine.keys()].filter((s) => std.has(s)).slice(0, 4), tot = [...mine.values()].reduce((a, c) => a + c.evidenceIds.size, 0);
  const kc = new Map(); let kt = 0; for (const m of k.members) for (const [s, c] of chan.get(m) ?? []) { kc.set(s, (kc.get(s) ?? 0) + c.evidenceIds.size); kt += c.evidenceIds.size; }
  const level1 = [...mine].filter(([, c]) => c.evidenceIds.size >= 4).map(([s, c]) => [s, (c.evidenceIds.size / tot) / (((kc.get(s) ?? 0) + 1) / (kt + 1))]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s, l]) => `${s} (x${l.toFixed(1)})`);
  console.log(`- ${who}: kind ${k.id} (${k.members.length}); kind-level facts it has: ${level0.join(", ") || "none"}; what it adds beyond its kind: ${level1.join(", ")}`);
}
// 2. re-identification: baseline, same-kind candidates, residual
const eligible = [...R.keys()].filter((r) => isName(r) && (nFr.A.get(r) ?? 0) >= MINF && (nFr.B.get(r) ?? 0) >= MINF), N = eligible.length;
const df = new Map(); for (const h of ["A", "B"]) for (const r of eligible) for (const k of part[h].get(r)?.keys() ?? []) df.set(k, (df.get(k) ?? new Set()).add(r));
const w = (k) => Math.log(1 + N / ((df.get(k)?.size ?? 0) + 1));
const raw = (h, r) => { const v = new Map(); for (const [k, c] of part[h].get(r) ?? []) v.set(k, Math.log(1 + c) * w(k)); return v; };
const mean = (rs, h) => { const m = new Map(); for (const r of rs) for (const [k, x] of raw(h, r)) m.set(k, (m.get(k) ?? 0) + x / rs.length); return m; };
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (const [k, x] of a) { na += x * x; const y = b.get(k); if (y) d += x * y; } for (const y of b.values()) nb += y * y; return na && nb ? d / Math.sqrt(na * nb) : 0; };
const kindMean = new Map(); for (const k of kinds) { const rs = k.members.filter((m) => eligible.includes(m)); if (rs.length >= 2) kindMean.set(k.id, { A: mean(rs, "A"), B: mean(rs, "B") }); }
const resid = (h, r) => { const v = raw(h, r), k = kindOf.get(r), km = k && kindMean.get(k.id); if (!km) return v; const o = new Map(v); for (const [x, y] of km[h]) o.set(x, (o.get(x) ?? 0) - y); return o; };
function run(candidatesOf, vecOf) { let mrr = 0, top1 = 0, n = 0; for (const r of eligible) { const cands = candidatesOf(r); if (cands.length < 2) continue; const q = vecOf("A", r), sc = cands.map((s) => [s, cos(q, vecOf("B", s))]).sort((a, b) => b[1] - a[1]); const rank = sc.findIndex((x) => x[0] === r) + 1; mrr += 1 / rank; if (rank === 1) top1++; n++; } return { n, mrr: mrr / n, top1: top1 / n }; }
const withKind = eligible.filter((r) => kindOf.has(r) && kindMean.has(kindOf.get(r).id));
const sub = (f) => { const keep = new Set(withKind); return (r) => f(r).filter((s) => keep.has(s) || s === r); };
console.log(`\nre-identification by partners, ${N} names (${withKind.length} have a kind):`);
const fmt = (x) => `MRR ${x.mrr.toFixed(3)}  top-1 ${x.top1.toFixed(3)}  (n ${x.n})`;
console.log("  baseline, all names as candidates                    ", fmt(run(() => eligible, raw)));
console.log("  names with a kind, all names as candidates            ", fmt(run((r) => (kindOf.has(r) && withKind.includes(r) ? eligible : []), raw)));
console.log("  names with a kind, only the SAME KIND as candidates   ", fmt(run((r) => (withKind.includes(r) ? eligible.filter((s) => kindOf.get(s)?.id === kindOf.get(r).id) : []), raw)));
console.log("  names with a kind, residual after the kind's mean     ", fmt(run((r) => (withKind.includes(r) ? eligible : []), resid)));
