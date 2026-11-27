// EXPLORATORY: kin relationships as facts of the graph. A kin fact is a possessed noun ("his sister", "her mother") whose possessor is a name
// the cast already bound, and whose own referent is tied to a name by the text's own identity assertions (apposition, predicate, title:
// "Princess Mary, his sister"). Which nouns are kin comes from a GIVER, not a list: the hyperlexicon's wiktionary hypernyms (sister →
// sibling), walked up to three steps, against seed concepts (declared: relative, kinsman, sibling, parent, spouse, kin, child, offspring).
// Both ends bound = the fact names two people; one end bound = a hole (a void the text leaves open).
// usage: node kin-probe.mjs <parse.json> [hyperlexicon door = http://127.0.0.1:11450]
import fs from "node:fs";
const K = new URL("../../native/", import.meta.url).href, HL = process.argv[3] ?? "http://127.0.0.1:11450";
const { referentsInOrder } = await import(K + "adapters/text/referents-in-order.mjs");
const { priorsFor } = await import(K + "the-fold/read-core.mjs");
const { classifyWord } = await import(K + "adapters/text/wordclass.js");
const parse = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), pr = priorsFor("eng");
const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
const cast = referentsInOrder(parse, { commonNoun });
const R = new Map(cast.referents.map((b) => [b.ref, b])), label = (r) => R.get(r)?.forms[0][0] ?? r;
const hl = async (asks) => { const out = []; for (let i = 0; i < asks.length; i += 40) { const j = await (await fetch(`${HL}/v1/batch`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asks: asks.slice(i, i + 40) }) })).json(); if (!j.answers) { console.error("giver:", JSON.stringify(j).slice(0, 160)); out.push(...asks.slice(i, i + 40).map(() => ({}))); } else out.push(...j.answers); } return out; };
const nounNodes = async (words) => { const a = (await hl([{ op: "names", surfaces: words, lang: "en" }]))[0].surfaces ?? {}; return Object.fromEntries(words.map((w) => [w, (a[w]?.written ?? []).filter((x) => x.pos?.includes("noun")).map((x) => x.node)])); };
// the possessed nominals and their heads
const poss = cast.referents.filter((b) => b.kind === "nominal" && b.of && R.get(b.of)?.kind === "name");
const heads = [...new Set(poss.map((b) => b.head))];
const seedWords = ["relative", "kinsman", "sibling", "parent", "spouse", "kin", "child", "offspring"];
const seeds = new Set(Object.values(await nounNodes(seedWords)).flat()), nodes = await nounNodes(heads);
const hyper = async (ids) => { const out = new Map(); const ans = await hl(ids.map((id) => ({ op: "relations", id }))); ids.forEach((id, i) => out.set(id, (ans[i]?.relations ?? []).filter((x) => x.rel === "hyper").map((x) => x.to))); return out; };
const isKin = new Map();
let frontier = new Map(); for (const h of heads) frontier.set(h, new Set(nodes[h]));
for (const h of heads) isKin.set(h, [...frontier.get(h)].some((n) => seeds.has(n)));
for (let depth = 0; depth < 3; depth++) {
  const todo = [...new Set([...frontier.values()].flatMap((s) => [...s]))]; if (!todo.length) break;
  const up = await hyper(todo);
  for (const h of heads) { const nx = new Set(); for (const n of frontier.get(h)) for (const t of up.get(n) ?? []) nx.add(t); frontier.set(h, nx); if ([...nx].some((n) => seeds.has(n))) isKin.set(h, true); }
}
const count = new Map(); for (const b of poss) count.set(b.head, (count.get(b.head) ?? 0) + b.mentions);
const top = [...count].sort((a, b) => b[1] - a[1]).slice(0, 36);
console.log("possessed nouns by mentions (K = the hyperlexicon puts it under kin):");
console.log(top.map(([h, n]) => `${isKin.get(h) ? "K " : "  "}${h} ${n}`).join(" | "));
// the kin facts
const tie = new Map();   // nominal ref → name refs it is tied to (apposition / predicate / title)
for (const e of cast.edges) if (["apposition", "predicate", "title"].includes(e.type)) for (const [x, y] of [[e.a, e.b], [e.b, e.a]]) if (R.get(x)?.kind === "nominal" && R.get(y)?.kind === "name") { const m = tie.get(x) ?? new Map(); m.set(y, (m.get(y) ?? 0) + e.n); tie.set(x, m); }
const kin = poss.filter((b) => isKin.get(b.head));
const facts = new Map(); let bound = 0, mentions = 0;
for (const b of kin) { mentions += b.mentions; const t = [...(tie.get(b.ref) ?? [])].filter(([q]) => q !== b.of).sort((a, c) => c[1] - a[1])[0]; if (t) { bound += b.mentions; const k = `${b.of}|${b.head}|${t[0]}`; const f = facts.get(k); if (f) f.n += b.mentions; else facts.set(k, { of: b.of, head: b.head, who: t[0], n: b.mentions }); } }
console.log(`\nkin nominals: ${kin.length} (${mentions} mentions); tied to a name by the text's own assertion: ${bound} mentions (${(100 * bound / Math.max(1, mentions)).toFixed(0)}%), so both ends of the fact are bound; the rest leave the other person open.`);
console.log("kin facts with both ends bound (strongest first):");
for (const f of [...facts.values()].sort((a, b) => b.n - a.n).slice(0, 14)) console.log(`  ${label(f.who)}  is  ${label(f.of)}'s ${f.head}   (${f.n})`);

// ── COMPOSITION on the kin facts. father and mother are FUNCTIONS (one each): two names tied as the same person's father are one person (a
// must-link by functional dependency); the converse composed with itself, parent˘;parent minus identity, gives siblings (a derived fact).
const FUNCTIONAL = new Set(["father", "mother"]);
const byKey = new Map(); for (const f of facts.values()) if (FUNCTIONAL.has(f.head)) { const k = `${f.of}|${f.head}`; const m = byKey.get(k) ?? new Map(); m.set(f.who, (m.get(f.who) ?? 0) + f.n); byKey.set(k, m); }
console.log("\nfunctional dependency (one father, one mother): names tied as the same person's parent, so to be merged:");
for (const [k, m] of [...byKey].filter(([, m]) => m.size >= 2).sort((a, b) => b[1].size - a[1].size).slice(0, 8)) { const [of, head] = k.split("|"); console.log(`  ${label(of)}'s ${head}: ${[...m].sort((a, b) => b[1] - a[1]).map(([q, n]) => `${label(q)} (${n})`).join("  =  ")}`); }
console.log(`  (${[...byKey].filter(([, m]) => m.size >= 2).length} of ${byKey.size} parent slots hold more than one name)`);
const kids = new Map(); for (const f of facts.values()) if (FUNCTIONAL.has(f.head)) { const s = kids.get(f.who) ?? new Set(); s.add(f.of); kids.set(f.who, s); }
const sib = new Set(); for (const s of kids.values()) { const xs = [...s]; for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) if (xs[i] !== xs[j]) sib.add([label(xs[i]), label(xs[j])].sort().join("  ~  ")); }
console.log(`derived siblings (share a tied parent, minus identity): ${sib.size}`); for (const p of [...sib].slice(0, 12)) console.log("  " + p);
