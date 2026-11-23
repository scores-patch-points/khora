// EXPLORATORY: which events between two people are RELATIONSHIPS (what a wiki page would say) and which are just things they did ("saw", "interrupted")?
// A relationship-forming event is one with CONSEQUENCES for the pair: after it, the pair's life together differs from what it would be at a random point
// in their own history. For every event (a verb with two different named people among its kāraka participants) at sentence s:
//   impact = log((c_after + 1) / (c_before + 1)),  c = sentences in the K following / preceding s in which BOTH are mentioned
//   z      = (impact - mean) / sd of the same impact at 80 random positions in that pair's own span (so a pair that simply co-occurs more
//            and more is not credited to the verb)
// A verb's score is its mean z over its events (at least 8 events, at least 4 different pairs). No word list: the verbs that rise are read off the book.
// usage: node relationship-impact.mjs <parse.json> [K=150]
import fs from "node:fs";
const K = new URL("../../native/", import.meta.url).href;
const { karakaRows, KARAKAS } = await import(K + "adapters/text/karaka-total.mjs");
const { referentsInOrder } = await import(K + "adapters/text/referents-in-order.mjs");
const { priorsFor } = await import(K + "the-fold/read-core.mjs");
const { classifyWord } = await import(K + "adapters/text/wordclass.js");
const parse = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), W = Number(process.argv[3] ?? 150), pr = priorsFor("eng");
const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
const cast = referentsInOrder(parse, { commonNoun }), R = new Map(cast.referents.map((b) => [b.ref, b]));
const isP = (r) => R.get(r)?.kind === "name" && R.get(r).mentions >= 30, nm = (r) => R.get(r).forms[0][0], N = Math.max(...parse.map((p) => p.order)) + 1;
const text = (o) => { const t = (parse.find((p) => p.order === o)?.rows ?? []).map((r) => r.form).join(" "); return t.length > 170 ? `${t.slice(0, 169)}…` : t; };
// sentences in which each name is mentioned
const ments = new Map(); for (const [k, ref] of Object.entries(cast.mentionOf)) if (isP(ref)) { const o = Number(k.split(".")[0]); let s = ments.get(ref); if (!s) ments.set(ref, (s = new Set())); s.add(o); }
const arr = new Map([...ments].map(([r, s]) => [r, [...s].sort((a, b) => a - b)]));
const co = new Map(); const pairCo = (a, b) => { const k = a < b ? `${a}|${b}` : `${b}|${a}`; let v = co.get(k); if (!v) { const sb = ments.get(b), A = arr.get(a) ?? []; co.set(k, (v = A.filter((o) => sb?.has(o)))); } return v; };
const lower = (xs, v) => { let lo = 0, hi = xs.length; while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] < v) lo = m + 1; else hi = m; } return lo; };
const count = (xs, a, b) => lower(xs, b) - lower(xs, a);   // in [a, b)
const impact = (xs, s) => Math.log((count(xs, s + 1, s + 1 + W) + 1) / (count(xs, s - W, s) + 1));
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
// the events
const events = [];
for (const p of parse) {
  const rows = karakaRows(p.rows, { stem: "eng" }), kids = new Map(); for (const r of rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
  for (const v of rows) {
    if (v.upos !== "VERB" || p.order < W || p.order > N - W) continue;
    const refs = [...new Set((kids.get(v.id) ?? []).filter((c) => KARAKAS.includes(c.karaka)).map((c) => cast.mentionOf[`${p.order}.${c.id}`]).filter((r) => r && isP(r)))];
    for (let i = 0; i < refs.length; i++) for (let j = i + 1; j < refs.length; j++) events.push({ a: refs[i], b: refs[j], verb: String(v.lemma ?? v.form).toLowerCase(), at: p.order });
  }
}
const nullOf = new Map(), nullFor = (a, b) => { const k = a < b ? `${a}|${b}` : `${b}|${a}`; let n = nullOf.get(k); if (!n) { const xs = pairCo(a, b); if (xs.length < 6) { nullOf.set(k, (n = null)); return n; } const lo = xs[0], hi = xs[xs.length - 1], v = []; for (let i = 0; i < 80; i++) { const s = Math.floor(lo + rnd() * (hi - lo)); if (s >= W && s <= N - W) v.push(impact(xs, s)); } const m = v.reduce((x, y) => x + y, 0) / (v.length || 1), sd = Math.max(0.3, Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / (v.length || 1))); nullOf.set(k, (n = v.length >= 20 ? { m, sd } : null)); } return n; };
for (const e of events) { const xs = pairCo(e.a, e.b), n = nullFor(e.a, e.b); e.z = n ? (impact(xs, e.at) - n.m) / n.sd : null; }
const scored = events.filter((e) => e.z !== null);
const by = new Map(); for (const e of scored) { let g = by.get(e.verb); if (!g) by.set(e.verb, (g = { verb: e.verb, z: [], pairs: new Set() })); g.z.push(e.z); g.pairs.add(e.a < e.b ? `${e.a}|${e.b}` : `${e.b}|${e.a}`); }
const verbs = [...by.values()].filter((g) => g.z.length >= 8 && g.pairs.size >= 4).map((g) => ({ ...g, mean: g.z.reduce((a, b) => a + b, 0) / g.z.length })).sort((a, b) => b.mean - a.mean);
console.log(`names (>= 30 mentions) ${[...ments.keys()].length}; events between two of them ${events.length}; with a usable null ${scored.length}; verbs with >= 8 events over >= 4 pairs: ${verbs.length}`);
const show = (g) => `${g.verb} ${g.mean.toFixed(2)} (n ${g.z.length}, ${g.pairs.size} pairs)`;
console.log("\nHIGHEST consequence:  " + verbs.slice(0, 22).map(show).join("  |  "));
console.log("\nLOWEST consequence:   " + verbs.slice(-12).map(show).join("  |  "));
console.log("\nthe commonest verbs (for reference): " + [...verbs].sort((a, b) => b.z.length - a.z.length).slice(0, 12).map(show).join("  |  "));
// one pair's relationship events, in order: what a wiki paragraph would be built from
const pick = (l) => [...R.values()].find((b) => b.kind === "name" && b.forms[0][0] === l)?.ref;
for (const [x, y] of [["Prince Andrew", "Natásha"], ["Pierre", "Hélène"]]) {
  const a = pick(x), b = pick(y); if (!a || !b) continue; const k = (u, v) => (u < v ? `${u}|${v}` : `${v}|${u}`);
  const es = scored.filter((e) => k(e.a, e.b) === k(a, b)).sort((p, q) => q.z - p.z).slice(0, 5).sort((p, q) => p.at - q.at);
  console.log(`\n${x} and ${y}: ${scored.filter((e) => k(e.a, e.b) === k(a, b)).length} events; the five with the most consequence, in order:`); for (const e of es) console.log(`  [${e.at}] ${e.verb} z=${e.z.toFixed(1)}: ${text(e.at)}`);
}
