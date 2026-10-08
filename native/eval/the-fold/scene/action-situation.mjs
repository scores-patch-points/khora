// action-situation.mjs — scenes as OSTROM ACTION SITUATIONS, bounded by BAYES surprise:
//   the change to the expectation of the HOLOGRAPH (admit().bayes = KL delta over the
//   Ostrom slots {actor, action, outcome}), NOT word-appearance surprisal. The Iliad
//   seeds the holograph (the carried ground); the Odyssey is walked causally; a scene's
//   opener = the first clause's delta, its closure = the max-delta (where belief was
//   revised most), its type = the DMD of the scene's bayes stream. No model.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit, ABSENT } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { dmd } = await import(`${KHOR}/native/kernel/dmd.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));

const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const ALL = confirmedVerbSet(posPrior);
const CHARS = Number(process.argv[2] || 100000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const iliadT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, 50000);

const readClauses = (t) => { const out = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) out.push(c); return out; };
const iliadClauses = readClauses(iliadT);
const clauses = readClauses(odyT);
// POSITION = the seat (the grammatical case-role), the GROUND of the action situation.
// A subject in the Nom seat is agent; in Acc patient; a lone article/substantive in its phrase.
const seat = (x) => (x ? (x.case ?? (x.head ? "Nom" : "?")) : "(pro-drop)");
const factsOf = (c) => ({
  position: `${seat(c.subject)}:${seat(c.object)}`,   // the seat-SET the clause binds (agent→patient)
  actor: face(c.subject) || "(pro-drop)",
  action: String(c.verb ?? "·"),
  outcome: c.object ? face(c.object) : "∅",
});

// THE CARRIED GROUND: the holograph, seeded by the Iliad (its actor/action/outcome structure).
const holo = createHolograph({ alpha: 1, gamma: 1 });
for (const c of iliadClauses) admit(holo, factsOf(c));
// walk the Odyssey causally; B = the BAYES delta per clause (the change to expectation)
const B = clauses.map((c) => admit(holo, factsOf(c)).bayes);
console.log(`EOT: ${clauses.length} Odyssey clauses · holograph seeded with ${iliadClauses.length} Iliad clauses\n`);

// scenes: a boundary is a BLINK (Murch: the DMD of surprise) OR A SEAT-SET TURNOVER —
// a position the situation has not yet used (Ostrom: the ground = who is eligible to act).
const length = (c) => String(c.verb ?? "").length + face(c.subject).length + face(c.object).length;
const lens = clauses.map(length);
const blinks = new Set();
let seenSeats = new Set();
for (let i = 0; i < clauses.length; i++) {
  const st = `${seat(clauses[i].subject)}:${seat(clauses[i].object)}`;
  const w = lens.slice(Math.max(0, i - 3), i);
  const m = w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
  const lenBlink = lens[i] <= m * 0.65 && lens[i] >= 1;
  const seatTurn = i > 0 && seenSeats.size > 0 && !seenSeats.has(st) && seat(clauses[i].subject) !== "?";
  if (lenBlink || seatTurn) { blinks.add(i); seenSeats = new Set(); }   // a new situation opens
  seenSeats.add(st);
}
const scenes = []; let cur = [];
for (let i = 0; i < clauses.length; i++) { if (blinks.has(i) && cur.length) { scenes.push(cur); cur = []; } cur.push(clauses[i]); }
if (cur.length) scenes.push(cur);

function timeClass(S) {
  if (S.length < 3) return { label: "(too short)" };
  const X = S.slice(0, -1).map((v) => [v]), Xp = S.slice(1).map((v) => [v]);
  try { const r = dmd(X, Xp, { rank: 1 }); const lam = r.eigenvalues?.[0];
    if (!lam || !Number.isFinite(lam.magnitude)) return { label: "indeterminate" };
    const mag = lam.magnitude, freq = Math.abs(lam.frequency ?? 0);
    return { label: freq > 1e-6 ? "RECURRING (cycling)" : mag > 1 ? "ONCE — still building" : "ONCE — finite (settled)", mag: +mag.toFixed(3), freq: +freq.toFixed(3) };
  } catch { return { label: "indeterminate" }; }
}

let gi = 0, shown = 0;
for (const sc of scenes) {
  if (shown >= 4) break;
  const n = sc.length; if (n < 2) { gi += n; continue; }
  const slice = B.slice(gi, gi + n);
  const tc = timeClass(slice);
  let bmax = -Infinity, bi = 0;
  for (let k = 0; k < slice.length; k++) { const v = slice[k]; if (Number.isFinite(v) && v > bmax) { bmax = v; bi = k; } }
  const close = gi + bi;
  const c0 = sc[0], c1 = clauses[close];
  const actors = [...new Set(sc.map((c) => face(c.subject)).filter(Boolean))].slice(0, 5);
  const actions = [...new Set(sc.map((c) => String(c.verb)).filter(Boolean))].slice(0, 6);
  const outcomes = [...new Set(sc.map((c) => face(c.object)).filter(Boolean))].slice(0, 5);
  shown++; gi += n;
  console.log(`── ACTION SITUATION ${shown} ── (${n} clauses)  time-class: ${tc.label}  (mag ${tc.mag ?? "—"})`);
  console.log(`  OPENER  (Δholograph ${Number.isFinite(slice[0]) ? slice[0].toFixed(2) : "—"}b)  ${(face(c0.subject) || "(pro-drop)")} ${c0.verb} ${face(c0.object)}`);
  console.log(`  CLOSURE (Δholograph ${bmax.toFixed(2)}b · belief most revised)  ${(face(c1.subject) || "(pro-drop)")} ${c1.verb} ${face(c1.object)}`);
  console.log(`  ACTORS  : ${actors.join(", ") || "(pro-drop)"}`);
  console.log(`  ACTIONS : ${actions.join(", ")}`);
  console.log(`  OUTCOMES: ${outcomes.join(", ") || "—"}\n`);
}