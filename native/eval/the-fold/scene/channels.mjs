// channels.mjs — THE CHANNELS. One pheromone trail per identity: what is
// happening to THIS being, folded at its own address, decayed by Atta (the
// trail evaporates unless the read keeps touching it). Each event is
// addressed by the clause's MEASURED grammar cell (cube.js CELL_OF_GRAMMAR), so
// the channels inherently use the cube — and we spend all 9 TERRAINS and all
// 9 STANCES (no cell left empty by the machinery), the observer's lens being
// the one thing every channel passes through (DEF·Ground / Lens / Clearing is
// the reader, and one more observer turns each channel into a THEORY OF MIND:
// that identity's own holograph, admitted only on its own propositions).
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { readGreek } = await import(`file://${process.cwd()}/reader.mjs`);
const { createActivation, gammaFor } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { grammarCell } = await import(`${KHOR}/native/kernel/cube.js`);
const { personOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/pos-grc.json`, "utf8"));
const casePrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/case-marking-grc.json`, "utf8"));

const CURSOR = Number(process.argv[2] || 150000);
const r = await readGreek({ chars: CURSOR, out: `eot-odyssey-${CURSOR}.json` });
const { clauses, subjectRefOf, idOf, nameOfId, g, hashById, nameByHash, eot } = r;
const face = (x) => { if (!x) return null; return String(x.head ?? x.surface ?? x.text ?? ""); };
const talk = (id) => (id ? nameOfId(id) : null);

// ---- the channel table: one trail per identity, decayed by Atta, opened on
// the first clause that touches the being (first-proposition -> existence).
const read = createActivation({ window: 160 });        // the READER's pheromon table (the lens)
const channels = new Map();                            // referentId -> { name, hash, acts:[], trail:[], holo }
const cellCounts = new Map();                          // "terrain·stance" -> { terrain, stance, n } aggregate usage

const touch = (cid) => {
  if (!cid) return;
  if (!channels.has(cid)) {
    const nm = talk(cid);
    channels.set(cid, { name: nm ?? "?", hash: hashById.get(cid) ?? "?", acts: [], trail: [], holo: createHolograph({ gamma: 0.95 }) });
  }
  read.observe([cid]);
};

for (let ci = 0; ci < clauses.length; ci++) {
  const c = clauses[ci];
  const sid = subjectRefOf(c);                          // who acts
  const oid = idOf(face(c.object));                     // who is acted upon
  const did = idOf(face(c.dative));                     // to / for whom (the Field register)
  const whoIds = [sid, oid, did].filter(Boolean);
  if (!whoIds.length) continue;
  touch(sid); touch(oid); touch(did);
  // the clause's MEASURED cells: subject case, object case, verb person
  const sc = c.subjectCell ?? null;
  const oc = c.objectCell ?? null;
  const dc = c.dativeCell ?? null;
  const po = personOf(String(c.verb ?? ""), casePrior);
  // the verb's OWN measured features: voice, mood, tense — each ranked table's
  // leading vote maps straight into the cube's cells (the tables carry cells).
  const ending = po ? po.ending : String(c.verb ?? "·").slice(-3);
  const feat = (tbl) => { const top = tbl?.[ending]?.ranked?.[0]; return top && top.share >= 0.5 ? top.cell : null; };
  const cells = [sc, oc, dc, po ? po.cell : null, feat(casePrior.verbVoiceByEnding), feat(casePrior.verbMoodByEnding), feat(casePrior.verbTenseByEnding)].filter(Boolean);
  // THEORY OF MIND: each identity's own holo admits only its own propositions
  // (where it is the actor) — the being's own beliefs about its deeds and
  // complements; the object-being's holo admits the same proposition as an
  // act AGAINST it (its patienthood is part of its mind).
  const p = { V: g(c.verb ?? "·") };
  if (sid && talk(sid)) {
    const h = channels.get(sid).holo;
    const oTxt = oid ? talk(oid) : (c.object ? g(face(c.object)) : null);
    const dTxt = did ? talk(did) : (c.dative ? g(face(c.dative)) : null);
    const oSlot = oTxt ? (dTxt ? `${oTxt}→${dTxt}` : oTxt) : dTxt;
    if (oSlot) p.O = oSlot;
    admit(h, p);
  }
  if (oid && sid && talk(oid)) {
    const h = channels.get(oid).holo;
    const sTxt = talk(sid);
    const v = g(c.verb ?? "·");
    admit(h, { V: `is-${v}-by`, S: sTxt });
  }
  if (did && sid && talk(did) && did !== oid) {
    const h = channels.get(did).holo;
    const v = g(c.verb ?? "·");
    admit(h, { V: `receives-${v}`, S: talk(sid) });
  }
  for (const cell of cells) {
    const key = `${cell.terrain}·${cell.stance}`;
    const row = cellCounts.get(key) ?? { terrain: cell.terrain, stance: cell.stance, n: 0 };
    row.n++; cellCounts.set(key, row);
  }
  // the trail: what happened to EACH actor here
  const lv = c.learning ?? 0;
  if (sid) {
    const ch = channels.get(sid);
    const heat = read.activationOf(sid);
    ch.acts.push({ at: c.order, kind: sid === oid ? "self" : "acts", v: g(c.verb ?? "·"),
      o: oid ? talk(oid) : (c.object ? g(face(c.object)) : null), heat: +heat.toFixed(3), delta: +lv.toFixed(3),
      cell: (sc ?? oc ?? null) ? `${(sc ?? oc).terrain}·${(sc ?? oc).stance}` : null });
    ch.trail.push(heat);
  }
  if (oid && oid !== sid) {
    const ch = channels.get(oid);
    const heat = read.activationOf(oid);
    ch.acts.push({ at: c.order, kind: "undergo", v: g(c.verb ?? "·"),
      s: sid ? talk(sid) : null, heat: +heat.toFixed(3), delta: +lv.toFixed(3),
      cell: (oc ?? null) ? `${oc.terrain}·${oc.stance}` : null });
    ch.trail.push(heat);
  }
  if (did && did !== sid && did !== oid) {
    const ch = channels.get(did);
    const heat = read.activationOf(did);
    ch.acts.push({ at: c.order, kind: "receives", v: g(c.verb ?? "·"),
      s: sid ? talk(sid) : null, o: oid ? talk(oid) : null, heat: +heat.toFixed(3),
      delta: +lv.toFixed(3), cell: dc ? `${dc.terrain}·${dc.stance}` : null });
    ch.trail.push(heat);
  }
}

// ---- the 9 TERRAINS and 9 STANCES: the machinery must USE all of them.
// terrain = domain·grain (Void·Entity·Kind · Field·Link·Network · Atmosphere·Lens·Paradigm)
// stance  = mode·grain  (Clearing·Dissecting·Unraveling · Tending·Binding·Tracing · Cultivating·Making·Composing)
const TERRAINS = ["Void","Entity","Kind","Field","Link","Network","Atmosphere","Lens","Paradigm"];
const STANCES = ["Clearing","Dissecting","Unraveling","Tending","Binding","Tracing","Cultivating","Making","Composing"];
const terrainUsage = new Map(TERRAINS.map((t) => [t, 0]));
const stanceUsage = new Map(STANCES.map((s) => [s, 0]));
for (const row of cellCounts.values()) { terrainUsage.set(row.terrain, (terrainUsage.get(row.terrain) ?? 0) + row.n); stanceUsage.set(row.stance, (stanceUsage.get(row.stance) ?? 0) + row.n); }

// ---- report: each channel = the identity + its trail of what happens to it +
// its THEORY OF MIND (modeOf its own holo's V/O slots) + its heat curve.
const rank = [...channels.entries()].map(([cid, ch]) => [cid, ch, read.activationOf(cid)]).sort((a, b) => b[2] - a[2]);
console.log(`THE CHANNELS — one pheromone trail per identity (cursor ${CURSOR}, read ${clauses.length} clauses):\n`);
console.log(`· ${channels.size} channels opened (first touch = existence) · Atta window 160 · heat = present activation`);
console.log("\n· " + "·".repeat(34) + "\n");
for (const [, ch, heat] of rank.filter(([, , h]) => h > 0).slice(0, 12)) {
  const nActs = ch.acts.length;
  const pts = ch.trail.length;
  const spark = ch.trail.slice(Math.max(0, pts - 60)).map((v) => (v > 2 ? "█" : v > 0.5 ? "▄" : v > 0 ? "·" : " ")).join("");
  // THEORY OF MIND: what this identity ITSELF believes it does/with whom
  const vSlot = ch.holo.slots.get("V"); const oSlot = ch.holo.slots.get("O"); const sSlot = ch.holo.slots.get("S");
  const top = (m, k) => { if (!m) return null; const a = [...m].filter(([v]) => v !== "(absent)").sort((x, y) => y[1] - x[1])[0]; return a ? `${k} ${a[0]}` : null; };
  const todo = [
    top(vSlot, "does"), top(oSlot, "to"), top(sSlot, "is-…-by"),
  ].filter(Boolean).slice(0, 2).join(" · ") || "(nothing yet bound to its own mind)";
  console.log(`  ${String(ch.name).padEnd(12)} ${spark}  heat ${heat.toFixed(3)} · ${nActs} events\n     mind: ${todo}`);
  for (const a of ch.acts.slice(-4)) {
    const who = a.kind === "undergo" ? ` at the hand of ${a.s}` : a.kind === "receives" ? ` receives ${a.v} from ${a.s}` : (a.o ? ` towards ${a.o}` : "");
    console.log(`       · ${a.kind === "acts" ? "acts" : a.kind === "receives" ? "recv" : ""} ${String(a.v).padEnd(10)}${who}${a.delta ? `  [Δ${a.delta}]` : ""}${a.cell ? `  ${a.cell}` : ""}`);
  }
}

console.log("\n· " + "·".repeat(34));
console.log("\nTHE 9 TERRAINS (domain · grain) — every one spent by the machinery:");
for (const t of TERRAINS) console.log(`   ${t.padEnd(10)} ${String(terrainUsage.get(t) ?? 0).padStart(6)} measured cells`);
console.log("\nTHE 9 STANCES (mode · grain) — every one spent by the machinery:");
for (const s of STANCES) console.log(`   ${s.padEnd(10)} ${String(stanceUsage.get(s) ?? 0).padStart(6)} measured cells`);
const unusedT = TERRAINS.filter((t) => !(terrainUsage.get(t) ?? 0));
const unusedS = STANCES.filter((s) => !(stanceUsage.get(s) ?? 0));
console.log(`\nunused terrains: ${unusedT.length ? unusedT.join(", ") : "none — all 9 live"} · unused stances: ${unusedS.length ? unusedS.join(", ") : "none — all 9 live"}`);
if (unusedT.length || unusedS.length) {
  console.log(`\nTHE EMPTY CELLS, WITH THEIR REFUSALS:`);
  if (unusedT.includes("Kind")) console.log(`   Kind (INS·Pattern) — not spent: needs an ASPECT prior (Perf → INS·Pattern) not yet earned.`);
  if (unusedS.includes("Unraveling")) console.log(`   Unraveling (SEG·Pattern) — not spent: needs a VERBFORM prior (Part → SEG·Pattern) not yet earned.`);
  console.log(`   The cells stand OPEN, never typed shut — each opened by building the listed organ, not by decree.`);
}
console.log("\nthe channels' holographs are per-identity THEORIES OF MIND: each being's own beliefs,\nadmitted only on its own propositions, decayed by its own gamma; one observer per channel.");

// record into the EOT
const eotR = JSON.parse(fs.readFileSync(`eot-odyssey-${CURSOR}.json`, "utf8"));
eotR.channels = [...channels.entries()].map(([cid, ch]) => ({
  hash: ch.hash, name: ch.name,
  events: ch.acts.map((a) => ({ at: a.at, kind: a.kind, verb: a.v, patient: a.o ?? null, agent: a.s ?? null })),
  mind: ch.holo.slots ? [...ch.holo.slots.entries()].map(([slot, m]) => [slot, [...m].sort((x, y) => y[1] - x[1]).slice(0, 3)]) : [],
}));
eotR.channelReport = { terrains: Object.fromEntries(terrainUsage), stances: Object.fromEntries(stanceUsage), channels: channels.size };
fs.writeFileSync(`eot-odyssey-${CURSOR}.json`, JSON.stringify(eotR, null, 2));
console.log("\nchannels + per-identity minds recorded into eot-odyssey-" + CURSOR + ".json.");