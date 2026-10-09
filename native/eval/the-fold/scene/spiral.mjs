// spiral.mjs — THE SPIRAL. The REC recursion, stated as a law and measured.
//
// THE REC RULE: the paradigm composed at REC·Pattern is admitted as NEW
// MATERIAL into the paradigm's own ground at REC·Ground. The record feeds the
// record: T(x) = tell∘admit(x). The mouth phrases only residue — it cannot
// invent — so the only new material a round can turn toward is ITSELF.
//
// THE CONVERGENCE LAW IS DMD (Bateson; kernel/activation.js dmdWindow): a
// round's round makes a difference that makes a difference — or it carries NO
// information, and the spiral rests at exactly that round. dmdWindow's own
// comment says it was never about the tail slice: "any nested family ordered
// by inclusion." Re-reading one's own telling is such a family: round n+1's
// material contains round n's residue.
//
// TWO SIGNS, ONE NUMBER: round where the observer stops moving.
//   upward  — the ground gained a lift: it holds more than before (altitude).
//   inward  — the observer agrees fully with its own report (KL -> 0).
// They are the same fixed point, read from the ground and from the observer.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { readGreek } = await import(`file://${process.cwd()}/reader.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { g } = await import(`file://${process.cwd()}/translate.mjs`);

const CURSOR = Number(process.argv[2] || 150000);
const TOP_K = 10;                        // the telling's breadth (nodes held up to the rim)
const MAX_ROUNDS = 10;
const EPS = 1e-4;                        // bits below which an admission is no information

const r = await readGreek({ chars: CURSOR, out: `eot-odyssey-${CURSOR}.json` });
const { clauses, subjectRefOf, idOf, nameOfId } = r;
const face = (x) => { if (!x) return null; return String(x.head ?? x.surface ?? x.text ?? ""); };
const talk = (id) => (id ? nameOfId(id) : null);

// ---- the observer: admission over the read (the SAME organ reader.mjs runs,
// rebuilt here so the holo is re-admittable — reading is deterministic). ----
const holo = createHolograph({ gamma: 0.9 });
for (const c of clauses) {
  const p = { V: g(c.verb ?? "·") };
  const s = subjectRefOf(c); if (s && talk(s)) p.S = talk(s);
  const o = idOf(face(c.object)); if (o && talk(o)) p.O = talk(o); else if (c.object) { const go = g(face(c.object)); if (go && !go.startsWith("?")) p.O = go; }
  admit(holo, p);
}
console.log(`THE SPIRAL — the observer re-admitting its own telling (cursor ${CURSOR}, ${clauses.length} clauses):\n`);

// The telling of a holo: its TOP BEINGS by standing mass — the paradigm the
// ground would mouth. Each told being is one S-proposition re-admitted into
// its own ground; the admission's bayes IS the information it still carries.
function tell(h) {
  const sMap = h.slots.get("S") ?? new Map();
  const vMap = h.slots.get("V") ?? new Map();
  const oMap = h.slots.get("O") ?? new Map();
  const mode = (m) => { const a = [...m].filter(([v]) => v !== "(absent)").sort((x, y) => y[1] - x[1])[0]; return a ? a[0] : null; };
  const beings = [...sMap].filter(([v]) => v !== "(absent)").sort((a, b) => b[1] - a[1]).slice(0, TOP_K);
  return [
    ...beings.map(([node]) => ({ slot: "S", mode: node })),
    { slot: "V", mode: mode(vMap) },
    { slot: "O", mode: mode(oMap) },
  ].filter((x) => x.mode && x.mode !== "(absent)");
}

// A telling's signature: the set of (slot, mode) pairs — "the emphasis".
const sig = (t) => t.map((x) => `${x.slot}\u0000${x.mode}`).sort().join("\n");

let prevSig = null, prevMass = new Map();
const rounds = [];
for (let round = 1; round <= MAX_ROUNDS; round++) {
  const t = tell(holo);
  const s = sig(t);
  // the admission: admit the telling's OWN propositions back into the ground
  const p = {};
  const probe = { injected: [] };
  for (const line of t) probe.injected.push(line.slot);
  let roundBayes = 0, roundSurprise = 0;
  for (const { slot, mode } of t) {
    const rr = admit(holo, { [slot]: mode });
    roundBayes += rr.bayes; roundSurprise += rr.surprisal;
  }
  const changed = prevSig !== null && s !== prevSig;
  rounds.push({ round, telling: t, bayes: roundBayes, surprise: roundSurprise, changed });
  prevSig = s;

  console.log(`  round ${round}: told ${t.length} propositions · the adversary admitted ${roundBayes.toFixed(5)} bits · ${changed ? "THE TELLING CHANGED" : "the telling held"}`);
  if (roundBayes < EPS && !changed) {
    console.log(`\n  CONVERGED at round ${round}: one more round's residue carries ${roundBayes.toFixed(6)} bits —< DMD: a difference that makes no difference is no information >—`);
    console.log(`  the spiral rests: the observer agrees with its own report, and the same fixed point reads as LIFT-UP (the ground holds all it needs) and as SELF-AGREEMENT (KL → 0).`);
    break;
  }
  if (round >= MAX_ROUNDS && (!changed || roundBayes >= EPS)) {
    console.log(`\n  NO convergence by round ${MAX_ROUNDS} (bayes ${roundBayes.toFixed(5)} bits/round, telling still ${changed ? "moving" : "held"}). The spiral has not closed — reported honestly.`);
  }
}

// ---- the DMD-bound: the shallowest round at which one more admission changes
// no conclusion — measured on the holo's own distribution (a difference that
// makes a difference, in rounds as the depth axis, exactly dmdWindow's rule). ----
const finalT = tell(holo);
console.log("\n· " + "·".repeat(34));
console.log(`\nTHE DMD ROUND — the shallowest round at which re-reading changes nothing:`);
for (const rnd of rounds) console.log(`   round ${rnd.round}: admission ${rnd.bayes.toFixed(5)} bits · telling ${rnd.changed ? "moved" : "held"}`);
const settled = rounds.find((x) => x.bayes < EPS && !x.changed);
console.log(`\n→ the spiral's fixed point is at the DMD round: ${settled ? `round ${settled.round}. The difference made no further difference there.` : "none within the rounds tried (measured reach exceeded) — never forced."}`);
// the limit and the contraction ratio: the fixed point is the FLOOR (the
// intrinsic rent of asserting a belief already held), and the ratio of each
// delta to the previous is the spiral's pitch.
const ds = rounds.map((x) => x.bayes);
const diffs = ds.slice(1).map((d, i) => ds[i] - d);
const ratio = diffs.filter((_, i) => i > 0 && diffs[i - 1] > 0).map((d, i) => d / diffs[i - 1]);
const floor = ds.length ? ds[ds.length - 1] : null;
const pitch = ratio.length ? ratio.slice(-4).reduce((a, b) => a + b, 0) / ratio.slice(-4).length : null;
console.log(`the floor (the assertion-rent of holding the telling true): ${floor?.toFixed(4)} bits`);
console.log(`the spiral's pitch (delta ratio round-over-round): ${pitch !== null ? pitch.toFixed(4) : "n/a"}${pitch < 1 ? " — CONTRACTIVE: the observer moves less each re-presentation of its own telling" : pitch === null ? "" : " — not contracting"}`);
console.log(`so the spiral does not close onto zero; it coils toward a LIMIT CYCLE: the telling repeats at constant rent,` + (pitch < 1 ? ` and the observer approaches, but never attains, full self-agreement.` : ` and self-agreement is not approached.`));

// ---- REC box: what the recursion explicitly admitted, and the altitude sign ----
const firstT = rounds[0]?.telling ?? [];
const lastT = rounds[rounds.length - 1]?.telling ?? [];
const gained = firstT.length && lastT.length
  ? lastT.filter((l) => !firstT.some((f) => f.slot === l.slot && f.mode === l.mode)).map((l) => `${l.slot}:${l.mode}`)
  : [];
console.log(`\nREC RULE (the record feeds the record): T(x) = tell∘admit(x), iterated ${rounds.length}×.`);
console.log(`altitude: the ground ${gained.length ? `widened to hold ${gained.length} new proposition(s) — the lift (upward).` : "held exactly what it already knew — the inward fixed point."}`);
console.log(`\nboth signs of ${gained.length ? "the lift" : "the spiral"} are one number read twice: golden, no diff -> no info -> the observer is at peace with its own reading.`);

// record rounds into the EOT
const eotR = JSON.parse(fs.readFileSync(`eot-odyssey-${CURSOR}.json`, "utf8"));
eotR.spiral = { rounds: rounds.map((rr) => ({ round: rr.round, told: rr.telling.map((x) => `${x.slot}=${x.mode}`), bayes: +rr.bayes.toFixed(6), changed: rr.changed })), dmdRound: settled?.round ?? null, eps: EPS };
fs.writeFileSync(`eot-odyssey-${CURSOR}.json`, JSON.stringify(eotR, null, 2));
console.log("\nspiral recorded into eot-odyssey-" + CURSOR + ".json.");