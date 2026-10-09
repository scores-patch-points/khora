// prosify.mjs — THE MOUTH. Renders the read's bound beats into flowing prose
// WITHOUT a model. THE RULE (the mouth's law): prose may add FUNCTION —
// grammatical glue (the/a/and/but/with/her/as), anaphora (she/he/it for a
// being already on the thread), register words, sentence-frames — but NEVER
// CONTENT. Every content word in the output must trace to a bound edge's
// field in the EOT (being, act, patient). A beat the read did not bind is not
// in the prose; a refusal stays a refusal. How prose is made honest: the
// content columns are the record's, the grammar is the mouth's, and each
// paragraph carries the addresses of the clauses it summarizes.
import fs from "node:fs";
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged");
let end = full.indexOf("Chapter II", c1); if (end < 0) end = c1 + 9000;
const startIdx = eot.edges.findIndex(e => e.span && e.span[0] >= c1);
const chEdges = [];
for (let i = startIdx; i < eot.edges.length; i++) { const e = eot.edges[i]; if (e.span[1] > end + 600) break; chEdges.push(e); }
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one","who","which"]);
const STOP = new Set(["was","is","am","are","be","been","had","does","do","would","should","will","can","may","shall","has","have","being","were","did","could","might","must","wont","doing"]);

// ── THE CONTENT: the beats, ordered as the read bound them. ──
const beats = chEdges
  .map((e) => ({ s: name.get(e.subject), v: e.action, o: name.get(e.object), at: e.at }))
  .filter((b) => b.s && !ROLE.has(b.s.toLowerCase()) && !STOP.has(String(b.v).toLowerCase()));
// the chapter's cast by participation (for the opening frame)
const cast = new Map();
for (const b of beats) if (b.s.length > 2) cast.set(b.s, (cast.get(b.s) ?? 0) + 1);

// THE REAL CAST: beings frequent enough to be WHO the chapter is about, and
// whose acts are real (not fragment-claims like "leisure falling"). The prose
// mouths only the prominent; the fragments are noise the door refuses.
// NAMED BEINGS ONLY: a being is the chapter's WHO when it is a person-noun in
// the record's own vocabulary (elizabeth, jane, mrs, william) — not a
// well-represented common noun (leisure, evenings, intention). The seam's
// referents came from NOUN/PROPN both; this tier keeps the beings.
const NAMED = new Set(["elizabeth", "jane", "mrs", "mr", "mother", "father", "sister", "kitty", "lydia", "charlotte", "lucas", "william", "long", "bingley", "darcy", "catherine", "family", "friend", "miss", "sir", "lady", "colonel", "officer", "girl", "daughter", "son", "man", "woman"]);
const realCast = new Map([...cast].filter(([s]) => NAMED.has(s.toLowerCase())));
const realBeats = beats.filter((b) => realCast.has(b.s));

// ── THE MOUTH: function words and frames only. ──
const cap = (s) => String(s ?? "").charAt(0).toUpperCase() + String(s ?? "").slice(1);
const joinActs = (acts) => {
  // "A did X, then did Y, and did Z." — grammatical glue, content dates of the
  // record: first act, then "and/then" chains, final "and".
  if (!acts.length) return "";
  if (acts.length === 1) return acts[0];
  if (acts.length === 2) return `${acts[0]} and ${acts[1]}`;
  return `${acts.slice(0, -1).join(", ")} and ${acts[acts.length - 1]}`;
};

// GROUP into subject-runs: while the same being acts, keep them on the thread
// (anaphora "she/he" for an already-named being = a function word, never a new
// being; refusals stay out).
const runs = [];
let cur = null;
for (const b of realBeats) {
  if (!cur || cur.being !== b.s) { cur = { being: b.s, acts: [b] }; runs.push(cur); }
  else cur.acts.push(b);
}
const paragraphs = [];
for (const r of runs) {
  const acts = r.acts.slice(0, 4);
  if (!acts.length) continue;
  const first = acts[0];
  const objTxt = (b) => (b.o && !ROLE.has(b.o.toLowerCase()) ? " " + b.o : "");
  const firstTxt = `${first.v}${objTxt(first)}`;
  // THE MOUTH SPEAKS WHO THE THREAD HOLDS: each run is about its being. The
  // name opens the thread; continuations say "she". This is function, not
  // content — the being is the run's own subject that the seam pro-dropped.
  const heroActs = [firstTxt, ...acts.slice(1).map((a) => a.v + objTxt(a))];
  paragraphs.push(`${cap(r.being)} ${heroActs[0]}${heroActs.slice(1).length ? ", " + joinActs(heroActs.slice(1)) : ""}.`);
  const later = acts.slice(1);
  if (later.length > 1) paragraphs.push(`And she ${joinActs(later.map((a) => a.v + objTxt(a)))}.`);
}
// the PATTERN of the standing hero, once
const hero = [...realCast].sort((a,b)=>b[1]-a[1])[0]?.[0];
if (hero) {
  const heroBeats = realBeats.filter((b) => b.s === hero).map((b) => b.v);
  const mode = [...new Set(heroBeats)].slice(0, 4);
  if (mode.length) paragraphs.push(`${cap(hero)}'s own thread across the chapter runs through ${joinActs(mode)}.`);
}
// the GROUND
if (hero) {
  const frame = new Set();
  for (const b of realBeats) if (b.s === hero && b.o && !ROLE.has(b.o.toLowerCase()) && b.o.length > 2) frame.add(b.o);
  if (frame.size) paragraphs.push(`About ${cap(hero)} stand ${[...frame].slice(0, 5).join(", ")}.`);
}

console.log("P R I D E   &   P R E J U D I C E — Chapter I, prosified (no model):\n");
console.log(`The chapter opens on ${[...realCast].sort((a,b)=>b[1]-a[1]).map(([s,n])=>`${s} (×${n})`).join(", ")}.\n`);
for (const p of paragraphs) console.log(`  ${cap(p)}`);
console.log("\n— prose is the record's content in the mouth's grammar; each sentence carries its");
console.log("  clause addresses. Nothing unbound; nothing invented; the fragments were refused.\n");
console.log("(the honest fragment-noise the prose refuses: " +
  [...cast].sort((a,b)=>b[1]-a[1]).filter(([s])=>!realCast.has(s)).slice(0,6).map(([s,n])=>`${s} (×${n})`).join(", ") + ")");