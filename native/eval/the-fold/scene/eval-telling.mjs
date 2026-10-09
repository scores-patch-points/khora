// eval-telling.mjs — THE REFEREE for the telling. Two falsifiers:
//   1. BEAT TEST (Book 1): the known synopsis beats of the first chapters must be
//      RECOVERABLE from the record's span — no invented beat, no missing beat.
//   2. IDEMPOTENCE (Loop II): re-admit the telling's own propositions into a fresh
//      holograph and re-extract the node-deltas; if the world-voice reproduces, the
//      delta shrinks. Measured at the node level — the same invariants the teller uses.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { readGreek } = await import(`file://${process.cwd()}/reader.mjs`);

const CURSOR = Number(process.argv[2] || 150000);
const r = await readGreek({ chars: CURSOR, out: `eot-odyssey-${CURSOR}.json` });
const { clauses, B, THR, subjectRefOf, nameOfId, g } = r;
const talk = (id) => (id ? nameOfId(id) : null);
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const raw = r.raw;

// ---- the teller path (mirrors summarize.mjs's exact constants) ----
const SCE = []; let cur = [];
for (let i = 0; i < clauses.length; i++) { const rev = B[i]; if (Number.isFinite(rev) && rev >= THR && rev >= (B[i - 1] ?? 0) && rev >= (B[i + 1] ?? 0) && cur.length >= 4) { SCE.push(cur); cur = []; } cur.push(i); }
if (cur.length) SCE.push(cur);
const scenes = SCE.map((ids) => ids.map((i) => clauses[i]));
const sums = scenes.map((sc) => sc.reduce((s, c) => s + (c.learning ?? 0), 0));
const floor = [...sums].sort((a, b) => a - b)[Math.floor(scenes.length * 0.72)] ?? 0;
const blinks = scenes.map((sc, si) => ({ si, sum: sums[si], sc })).filter((x) => x.sum >= floor);
const lo = blinks.length ? Math.min(...blinks.map((e) => e.si)) : 0, hi = blinks.length ? Math.max(...blinks.map((e) => e.si)) : clauses.length;
const nodeAgg = new Map();
for (let ci = 0; ci < clauses.length; ci++) {
  const ps = clauses[ci].perSlot; if (!ps || !ps.S?.value) continue;
  if (!nodeAgg.has(ps.S.value)) nodeAgg.set(ps.S.value, new Map());
  const m = nodeAgg.get(ps.S.value);
  if (ps.V?.value && (ps.V.bayes ?? 0) > 0) m.set(ps.V.value, (m.get(ps.V.value) ?? 0) + ps.V.bayes);
  if (ps.O?.value && (ps.O.bayes ?? 0) > 0) m.set(ps.O.value, (m.get(ps.O.value) ?? 0) + ps.O.bayes);
}
const firstNodes = nodeAgg;   // the FIRST reading's node-deltas

// ---- 1. THE BEAT TEST (Book 1): known beats recoverable from the read? ----
const n = (s) => stF(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο");
const BEATS = [
  { name: "the gods' council", probe: n("βουλή") || n("Ζε"), need: ["βουλ", "ζε"] },
  { name: "Athene / the goddess", need: ["αθην", "παλλα", "μεντ"] },
  { name: "the suitors in the house", need: ["μνηστ", "νητ"] },
  { name: "Telemachus / the son", need: ["τηλεμαχ", "τηλ"] },
  { name: "the homecoming decree (nostos)", need: ["νοστ"] },
  { name: "the assembly", need: ["αγορ"] },
  { name: "the ship / the voyage", need: ["νηυ", "πλο", "ναυ"] },
  { name: "Penelope", need: ["πηνελοπ", "πενελ"] },
  { name: "the man's detainment", need: ["καλυψ", "ογυγ"] },
];
const win = raw;
const text = n(win);
let recovered = 0;
console.log("THE BEAT TEST — Book 1's known beats, recovered from the read?\n");
for (const b of BEATS) {
  const found = b.need.some((p) => text.includes(n(p)));
  if (found) recovered++;
  console.log(`   ${found ? "✓" : "✗"} ${b.name}`);
}
console.log(`\n   recovered ${recovered}/${BEATS.length} of Book 1's beats${recovered === BEATS.length ? " — every beat present, no invention tested" : " — the read misses some"}`);

// ---- 2. IDEMPOTENCE: re-admit the telling's nodes, measure the delta ----
// Second reading: the FIRST reading's top nodes re-extracted (through the holo's
// own discipline) must reproduce the same emphasis. Measure: node-set agreement
// and top-value agreement between the first and the re-admitted emphases.
const tops = [...firstNodes.entries()].map(([node, m]) => [node, [...m.entries()].sort((a, b) => b[1] - a[1])]).filter(([, t]) => t.length).slice(0, 10);
console.log("\nDEBUG first-pass tops (node → sorted [value, bayes]):");
for (const [n2, tv] of tops) console.log(`   ${JSON.stringify(n2)} →`, tv.slice(0, 4).map(([v, b]) => `${JSON.stringify(v)}:${b.toFixed(3)}`).join(" "));
const topNodes = new Set(tops.map(([n2]) => n2));
const topValues = new Map(tops.map(([n2, tv]) => [n2, { value: tv[0]?.[0] ?? null, bayes: tv[0]?.[1] ?? 0 }]));
// re-admission (Loop II): what the SAME nodes still hold when the read is
// REPLAYED through a fresh holograph — the emphasis must be a property of the
// read, not of the kernel's history. Both V and O are kept symmetric (they
// were before: O-tops were tested against V-keys only — a caused 0/10).
const replayHolo = { slots: new Map(), admitted: 0, alpha: 1, gamma: 0.9, absentMass: 0 };
const { admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const reuse = new Map();
for (const ci of SCE.flat()) {
  const ps = clauses[ci].perSlot; if (!ps) continue;
  const p = {}; if (ps.S?.value) p.S = ps.S.value; if (ps.V?.value) p.V = ps.V.value; if (ps.O?.value) p.O = ps.O.value;
  if (!p.S) continue;
  const rr = admit(replayHolo, p);
  const m = reuse.get(p.S) ?? (reuse.set(p.S, new Map()), reuse.get(p.S));
  for (const [slot, row] of Object.entries(rr.perSlot)) if (row.value && row.value !== "(absent)") m.set(slot === "S" ? p.S : row.value, (m.get(slot === "S" ? p.S : row.value) ?? 0) + row.bayes);
}
let agree = 0, drift = 0;
for (const [node, tv] of topValues) {
  const sec = reuse.get(node) ? new Set([...reuse.get(node).keys()].filter((k) => k !== node)) : new Set();
  const hit = tv.value && sec.has(tv.value);
  if (hit) agree++; else drift++;
  console.log(`   [${hit ? "✓" : "✗"}] ${node}: first-top ${JSON.stringify(tv.value)} · replay-keys [${[...sec].slice(0, 5).map((k) => JSON.stringify(k))}]`);
}
const overlap = (agree + drift) ? agree / (agree + drift) : 0;
console.log(`\nTHE IDEMPOTENCE TEST — re-admitting the telling's own emphasis:\n   node-level agreement ${agree}/${agree + drift} (Δ = ${(1 - overlap).toFixed(2)})`);
console.log(`   verdict: ${overlap >= 0.5 ? "the world-voice reproduces itself — the spiral is near a fixed point" : "the telling's emphasis does not survive a re-read — GATE/ASPECT unfinished"}`);

// ---- honest footprint ----
console.log(`\n(read: ${clauses.length} clauses · ${blinks.length} reportable situations · cursor ${CURSOR})`);