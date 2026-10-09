// gist.mjs — THE GIST ENGINE. A meaningful summary is a MACROSTRUCTURE (van Dijk
// & Kintsch): the top of the situation model, built by three macrorules, which
// are three of the cube's operators at Pattern grain:
//   DELETION       = NUL·Pattern  (clear what carries no consequence)
//   GENERALIZATION = INS·Pattern  (replace members with their superordinate KIND)
//   CONSTRUCTION   = SYN·Pattern  (collapse a sequence into one composite event)
// Salience is EXPECTANCY (Lehnert): the gist foregrounds the deviation, not the
// steady state. Every kept proposition carries its content-address (lawful).
// Usage: node gist.mjs [chapter]
import fs from "node:fs";
const CH = Number(process.argv[2] || 6);
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const roman = Array.from({ length: 40 }, (_, i) => "I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI XXII XXIII XXIV XXV XXVI XXVII XXVIII XXX".split(" ")[i] ?? null).filter(Boolean);
const marks = [];
for (let i = 0; i < roman.length; i++) { const p = full.indexOf(`\nCHAPTER ${roman[i]}.`); if (p > 0) marks.push([i + 1, p]); }
marks.sort((a, b) => a[0] - b[0]);
const idx = marks.findIndex(([n]) => n === CH);
const c1 = marks[idx][1], c2 = marks[idx + 1] ? marks[idx + 1][1] : full.length;
const ch = full.slice(c1, c2), low = ch.toLowerCase();
const sentences = ch.split(/(?<=[.!?])\s+/);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);
const STOP = new Set(["was","is","are","be","been","had","has","have","does","do","would","should","will","can","may","shall","being","were","did","could","might","must"]);

// ── EVENT BASE — the chapter's bound propositions, ordered by content-address ──
const events = eot.edges.filter(e => e.span && e.span[0] >= c1 && e.span[1] <= c2)
  .map(e => ({ at: e.span[0], s: name.get(e.subject), v: String(e.action ?? ""), o: name.get(e.object) }))
  .filter(e => e.s && !ROLE.has(e.s.toLowerCase()) && !STOP.has(e.v.toLowerCase()) && e.v.length > 2)
  .sort((a, b) => a.at - b.at);

// ── EXPECTANCY — salience = surprisal of the (agent,verb) arrangement (rarer = more surprising) ──
const pairN = new Map(), verbN = new Map();
for (const e of events) { const k = `${e.s.toLowerCase()} ${e.v.toLowerCase()}`; pairN.set(k, (pairN.get(k) ?? 0) + 1); verbN.set(e.v.toLowerCase(), (verbN.get(e.v.toLowerCase()) ?? 0) + 1); }
const N = events.length || 1;
const salience = (e) => -Math.log2((pairN.get(`${e.s.toLowerCase()} ${e.v.toLowerCase()}`) ?? 1) / N) * (1 + 1 / (verbN.get(e.v.toLowerCase()) ?? 1));

// ── MACRORULE 1 · DELETION (NUL·Pattern) — keep the salient half ──
const ranked = [...events].sort((a, b) => salience(b) - salience(a));
const FLOOR = salience(ranked[Math.floor(ranked.length / 2)] ?? {}) || 0;
const kept = events.filter(e => salience(e) >= FLOOR).sort((a, b) => a.at - b.at);

// ── MACRORULE 2 · GENERALIZATION (INS·Pattern) — members → their induced KIND ──
const CAST = ["man","wife","woman","husband","lady","gentleman","sir","miss","bennet","elizabeth","jane","darcy","bingley","sister","sisters","friend","family","daughter","girl","mother","father"];
const present = CAST.filter(b => low.includes(b));
const comp = new Map(present.map(b => [b, new Map()]));
for (const s of sentences) { const p = present.filter(b => s.toLowerCase().includes(b)); for (const a of p) for (const b of p) if (a !== b) comp.get(a).set(b, 1); }
const jac = (a, b) => { const A = new Set(comp.get(a).keys()), B = new Set(comp.get(b).keys()); const i = [...A].filter(x => B.has(x)).length, u = new Set([...A, ...B]).size; return u ? i / u : 0; };
const seen = new Set(), kinds = [];
for (const a of present) { if (seen.has(a)) continue; const c = [a]; seen.add(a); for (const b of present) if (!seen.has(b) && jac(a, b) >= 0.4) { c.push(b); seen.add(b); } kinds.push(c); }
const kindOf = (x) => { const lx = String(x ?? "").toLowerCase(); const k = kinds.find(kk => kk.includes(lx)); return k ? `{${k.join(",")}}` : x; };

// ── MACRORULE 3 · CONSTRUCTION (SYN·Pattern) — collapse contiguous same-agent runs ──
const episodes = [];
let run = null;
for (const e of kept) {
  if (!run || run.agents[run.agents.length - 1] !== e.s) { run = { at: e.at, agents: [e.s], verbs: [e.v], objs: [e.o].filter(Boolean), hi: e.at }; episodes.push(run); }
  else { run.verbs.push(e.v); if (e.o) run.objs.push(e.o); run.hi = e.at; }
}
// the composite of each episode: agent (kind-generalized) — the run of deeds
const composite = (ep) => {
  const who = kindOf(ep.agents[0]);
  const v = [...new Set(ep.verbs)];
  return `${who} ${v.slice(0, 4).join(", ")}${v.length > 4 ? "…" : ""}${ep.objs.length ? " (with " + [...new Set(ep.objs)].slice(0, 3).join(", ") + ")" : ""}`;
};

// ── STORY-GRAMMAR SKELETON (Rumelhart/Stein) — setting · initiating deviation · outcome ──
const setting = kinds.slice(0, 3).map(k => "{" + k.join(",") + "}").join(" · ");
const deviation = ranked[0];
const outcome = kept[kept.length - 1];

console.log(`THE GIST — Pride and Prejudice, Chapter ${CH}  (macrostructure; lawful, no model)\n`);
console.log(`  SETTING (the standing cast, kind-generalized — INS·Pattern):`);
console.log(`     ${setting}`);
console.log(`\n  THE APPROXIMATE EVENTS (deletion applied — the salient ${kept.length} of ${events.length}; NUL·Pattern):`);
for (const ep of episodes.slice(0, 6)) console.log(`     [${ep.at}] ${composite(ep)}`);
console.log(`\n  THE INITIATING DEVIATION (highest expectancy-surprise — Lehnert):`);
console.log(`     [${deviation?.at}] ${deviation ? kindOf(deviation.s) + " " + deviation.v + (deviation.o ? " " + kindOf(deviation.o) : "") : "—"}`);
console.log(`\n  THE OUTCOME (the last standing event):`);
console.log(`     [${outcome?.at}] ${outcome ? kindOf(outcome.s) + " " + outcome.v + (outcome.o ? " " + kindOf(outcome.o) : "") : "—"}`);
console.log(`\n  ⟹ THE GIST: in a setting of ${kinds[0]?.slice(0,2).map(kindOf).join(" and ") || "—"}, ${deviation ? kindOf(deviation.s) + " " + deviation.v : "—"};`);
console.log(`     and the chapter comes to ${outcome ? kindOf(outcome.s) + " " + outcome.v : "—"}.`);
console.log(`\n  (every event cited at its content-address; deletion/kind-generalization/construction are`);
console.log(`   NUL·Pattern / INS·Pattern / SYN·Pattern — the macrorules, applied. Nothing revealed.)`);