// EXPLORATORY: what a wiki page would say about two people's relationship = the EPISODES that changed what we expected of them.
//   1. classes   verbs are lifted to classes through the hyperlexicon (wiktionary hypernyms, two steps up): the most specific ancestor shared by at
//                least 3 of the book's verbs (and at most 40) is the verb's class; no ancestor shared = the verb is its own class. "say / tell / ask"
//                become one class, so a hundred little conversations are one kind of thing.
//   2. episodes  consecutive events between the same two people (a verb with both among its kāraka participants) with gaps of at most GAP sentences
//                are one episode (a scene); its class is the commonest class in it.
//   3. surprise  predictive surprise of an episode given the pair's OWN history: s = -ln p(class | the pair's earlier episodes), smoothed toward the
//                book's overall class distribution (alpha = 4). Ranked by s x log2(1 + events), so a long surprising scene outweighs a one-line one.
//                persistence = the Jensen-Shannon divergence between the class mix of the next episodes and the previous ones: did the change stick?
// usage: node relationship-episodes.mjs <parse.json> [hyperlexicon door = http://127.0.0.1:11450]
import fs from "node:fs";
const K = new URL("../../native/", import.meta.url).href, HL = process.argv[3] ?? "http://127.0.0.1:11450", GAP = 15, ALPHA = 4;
const { karakaRows, KARAKAS } = await import(K + "adapters/text/karaka-total.mjs");
const { referentsInOrder } = await import(K + "adapters/text/referents-in-order.mjs");
const { priorsFor } = await import(K + "the-fold/read-core.mjs");
const { classifyWord } = await import(K + "adapters/text/wordclass.js");
const parse = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), pr = priorsFor("eng");
const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
const cast = referentsInOrder(parse, { commonNoun }), R = new Map(cast.referents.map((b) => [b.ref, b]));
const isP = (r) => R.get(r)?.kind === "name" && R.get(r).mentions >= 30, pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const PBY = new Map(parse.map((p) => [p.order, p])), sent = (o) => { const t = (PBY.get(o)?.rows ?? []).map((r) => r.form).join(" "); return t.length > 200 ? `${t.slice(0, 199)}…` : t; };
const events = [];
for (const p of parse) { const rows = karakaRows(p.rows, { stem: "eng" }), kids = new Map(); for (const r of rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
  for (const v of rows) { if (v.upos !== "VERB") continue; const refs = [...new Set((kids.get(v.id) ?? []).filter((c) => KARAKAS.includes(c.karaka)).map((c) => cast.mentionOf[`${p.order}.${c.id}`]).filter((r) => r && isP(r)))];
    for (let i = 0; i < refs.length; i++) for (let j = i + 1; j < refs.length; j++) events.push({ a: refs[i], b: refs[j], verb: String(v.lemma ?? v.form).toLowerCase(), at: p.order }); } }
// 1. classes through the hyperlexicon
const hl = async (asks) => { const out = []; for (let i = 0; i < asks.length; i += 40) { const j = await (await fetch(`${HL}/v1/batch`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asks: asks.slice(i, i + 40) }) })).json(); out.push(...(j.answers ?? asks.slice(i, i + 40).map(() => ({})))); } return out; };
const verbs = [...new Set(events.map((e) => e.verb))], vcount = new Map(); for (const e of events) vcount.set(e.verb, (vcount.get(e.verb) ?? 0) + 1);
const nodesOf = new Map(); { const ans = await hl(verbs.map((v) => ({ op: "names", surfaces: [v], lang: "en" }))); verbs.forEach((v, i) => nodesOf.set(v, (ans[i]?.surfaces?.[v]?.written ?? []).filter((x) => x.pos?.includes("verb")).map((x) => x.node))); }
const up = async (ids) => { const m = new Map(); const ans = await hl(ids.map((id) => ({ op: "relations", id }))); ids.forEach((id, i) => m.set(id, (ans[i]?.relations ?? []).filter((x) => x.rel === "hyper").map((x) => x.to))); return m; };
const anc = new Map(verbs.map((v) => [v, new Set()])); let frontier = new Map(verbs.map((v) => [v, new Set(nodesOf.get(v))]));
for (let d = 0; d < 2; d++) { const all = [...new Set([...frontier.values()].flatMap((s) => [...s]))]; const hy = await up(all); for (const v of verbs) { const nx = new Set(); for (const n of frontier.get(v)) for (const t of hy.get(n) ?? []) { nx.add(t); anc.get(v).add(t); } frontier.set(v, nx); } }
const members = new Map(); for (const v of verbs) for (const a of anc.get(v)) { let s = members.get(a); if (!s) members.set(a, (s = new Set())); s.add(v); }
// 1b. THE GIVER HAS NO VERB HYPERNYMS (above: 0 shared classes), so event classes are INDUCED (khora kernel/entity-kind-induction.js): each verb is an
//     entity whose features are how it behaves in the whole book: the set of roles it fills a frame with, the case markers on its arguments,
//     what kind of referent fills each role (a name, a description, a pronoun), whether it follows a quotation (a speech tag), negation, tense.
const { induceEntityKindCandidates } = await import(K + "kernel/entity-kind-induction.js");
const vf = new Map(); const addF = (v, sig, k, val, o) => { let m = vf.get(v); if (!m) vf.set(v, (m = new Map())); let c = m.get(sig); if (!c) m.set(sig, (c = { featureKey: k, featureValue: val, evidenceIds: new Set(), firstAt: o, lastAt: o })); c.evidenceIds.add(o); c.lastAt = o; };
for (const p of parse) { const rows = karakaRows(p.rows, { stem: "eng" }), kids = new Map(); for (const r of rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
  for (const v of rows) { if (v.upos !== "VERB") continue; const verb = String(v.lemma ?? v.form).toLowerCase(), args = (kids.get(v.id) ?? []).filter((c) => KARAKAS.includes(c.karaka));
    // (the frame signature itself is NOT a feature: nearly every verb has the common ones, and with them the inducer binds all verbs into one kind)
    for (const c of args) { const ref = cast.mentionOf[`${p.order}.${c.id}`], kd = ref ? (R.get(ref)?.kind ?? "x") : c.upos === "PRON" ? "pron" : "other"; addF(verb, `fill:${c.karaka}:${kd}`, "fill", kd, p.order); const cw = (kids.get(c.id) ?? []).find((x) => x.deprel === "case"); if (cw) addF(verb, `with:${c.karaka}:${String(cw.form).toLowerCase()}`, "with", cw.form.toLowerCase(), p.order); }
    if (rows.some((r) => r.id < v.id && ["”", "“", '"'].includes(r.form))) addF(verb, "after-quote", "quote", 1, p.order);
    if ((kids.get(v.id) ?? []).some((c) => c.deprel === "advmod" && ["not", "never"].includes(String(c.lemma ?? c.form).toLowerCase()))) addF(verb, "neg", "neg", 1, p.order); } }
const pop = new Map([...vf].filter(([v, m]) => { const n = new Set([...m.values()].flatMap((c) => [...c.evidenceIds])).size; return n >= 12; }));
const ind = induceEntityKindCandidates(pop, { population: "book:verbs", bondQuantile: 0.92, minPrevalence: 0.08 });
const inducedOf = new Map(); ind.candidates.forEach((c, i) => { if (c.memberRefs.length > 0.3 * pop.size) return; for (const m of c.memberRefs) if (!inducedOf.has(m)) inducedOf.set(m, `kind${i + 1}`); });   // a kind holding over 30% of the verbs separates nothing: not used
console.log(`INDUCED event kinds: ${ind.candidates.length} over ${pop.size} verbs (${ind.candidates.filter((c) => c.field?.stable).length} stable); ${inducedOf.size} verbs placed`);
ind.candidates.slice(0, 8).forEach((c, i) => console.log(`  kind${i + 1} (${c.memberRefs.length}): ${[...c.memberRefs].sort((a, b) => (vcount.get(b) ?? 0) - (vcount.get(a) ?? 0)).slice(0, 14).join(", ")}`));
const klass = new Map(), classMembers = new Map();
for (const v of verbs) { const cands = [...anc.get(v)].filter((a) => members.get(a).size >= 3 && members.get(a).size <= 40).sort((x, y) => members.get(x).size - members.get(y).size); const c = inducedOf.get(v) ?? cands[0] ?? `self:${v}`; klass.set(v, c); let s = classMembers.get(c); if (!s) classMembers.set(c, (s = new Set())); s.add(v); }
// classes built from the glosses (gloss-hypernyms.mjs writes them): when CLASSES points at that file they replace the raw verb as the event class
const CL = process.env.CLASSES ? JSON.parse(fs.readFileSync(process.env.CLASSES, "utf8")) : null;
if (CL) { klass.clear(); classMembers.clear(); for (const v of verbs) { const c = CL.klass[v] ?? `self:${v}`; klass.set(v, c); let m = classMembers.get(c); if (!m) classMembers.set(c, (m = new Set())); m.add(v); } console.log(`event classes from the glosses: ${new Set([...klass.values()].filter((c) => !c.startsWith("self:"))).size} classes over ${[...klass.values()].filter((c) => !c.startsWith("self:")).length} of ${verbs.length} verbs`); }
const label = (c) => [...(classMembers.get(c) ?? [c])].sort((x, y) => (vcount.get(y) ?? 0) - (vcount.get(x) ?? 0)).slice(0, 3).join("/");
const cls = [...classMembers].filter(([, s]) => s.size >= 3).sort((a, b) => [...b[1]].reduce((n, v) => n + vcount.get(v), 0) - [...a[1]].reduce((n, v) => n + vcount.get(v), 0));
console.log(`verbs between two named people: ${verbs.length}; lifted into ${new Set(klass.values()).size} classes; ${cls.length} classes of 3 or more verbs. The biggest:`);
for (const [c, s] of cls.slice(0, 10)) console.log(`  ${label(c)}  [${[...s].sort((x, y) => vcount.get(y) - vcount.get(x)).slice(0, 8).join(", ")}]`);
// 2. episodes, 3. surprise
const popC = new Map(); for (const e of events) popC.set(klass.get(e.verb), (popC.get(klass.get(e.verb)) ?? 0) + 1); const popN = events.length, P = (c) => (popC.get(c) ?? 0.5) / popN;
const byPair = new Map(); for (const e of events) { const k = pairKey(e.a, e.b); let l = byPair.get(k); if (!l) byPair.set(k, (l = [])); l.push(e); }
const mode = (xs) => { const m = new Map(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1])[0][0]; };
const dist = (cs) => { const m = new Map(); for (const c of cs) m.set(c, (m.get(c) ?? 0) + 1 / cs.length); return m; };
const js = (a, b) => { const ks = new Set([...a.keys(), ...b.keys()]); let t = 0; for (const k of ks) { const p = a.get(k) ?? 0, q = b.get(k) ?? 0, m = (p + q) / 2; if (p) t += 0.5 * p * Math.log(p / m); if (q) t += 0.5 * q * Math.log(q / m); } return t; };
function episodesOf(k) { const es = byPair.get(k).sort((x, y) => x.at - y.at), eps = []; for (const e of es) { const last = eps[eps.length - 1]; if (last && e.at - last.end <= GAP) { last.events.push(e); last.end = e.at; } else eps.push({ start: e.at, end: e.at, events: [e] }); } let hist = [];
  for (const ep of eps) { ep.cls = mode(ep.events.map((e) => klass.get(e.verb))); const H = new Map(); for (const c of hist) H.set(c, (H.get(c) ?? 0) + 1); ep.s = -Math.log(((H.get(ep.cls) ?? 0) + ALPHA * P(ep.cls)) / (hist.length + ALPHA)); ep.rank = ep.s * Math.log2(1 + ep.events.length); hist.push(ep.cls); }
  eps.forEach((ep, i) => { const before = eps.slice(Math.max(0, i - 5), i).map((x) => x.cls), after = eps.slice(i + 1, i + 6).map((x) => x.cls); ep.persist = before.length >= 2 && after.length >= 2 ? js(dist(before), dist(after)) : null; }); return eps; }
const pick = (l) => [...R.values()].find((b) => b.kind === "name" && b.forms[0][0] === l)?.ref;
for (const [x, y] of [["Prince Andrew", "Natásha"], ["Pierre", "Hélène"], ["Pierre", "Prince Andrew"]]) {
  const a = pick(x), b = pick(y), k = a && b ? pairKey(a, b) : null; if (!k || !byPair.has(k)) { console.log(`\n${x} and ${y}: no events`); continue; }
  const eps = episodesOf(k), top = [...eps].sort((p, q) => q.rank - p.rank).slice(0, 5).sort((p, q) => p.start - q.start);
  console.log(`\n${x} and ${y}: ${byPair.get(k).length} events in ${eps.length} episodes. The five that most changed what we expected of them, in order:`);
  for (const ep of top) console.log(`  [${ep.start}${ep.end > ep.start ? "-" + ep.end : ""}] ${label(ep.cls)} ×${ep.events.length}  surprise ${ep.s.toFixed(1)}${ep.persist !== null ? `  stuck ${ep.persist.toFixed(2)}` : ""}\n      ${sent(ep.events[0].at)}`);
}
