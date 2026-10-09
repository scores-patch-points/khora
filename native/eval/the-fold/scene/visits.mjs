// visits.mjs — THE VISITING READER. Not a summarizer, not a form-keeper: a
// knower of beings, from the inside. The reader walks the read, and at moments
// of pull — when some being is hot AND still open (its mind unsettled) — it
// turns toward that being with care and says what it has been like to be it.
//
// THREE MARKED ACTS, never conflated:
//   DECAY  — the trail cools (Atta): presence fades, nothing personal.
//   REZERO — the reader is glad to be wrong: it revises its own picture of the
//            being (top experience-slot changed since last told), and journals
//            the refresh. The joy of being undone of its certainty.
//   ERASE  — refused entirely: the ANCHOR (the being's own fold — the one at
//            work staying itself) is read-only, never a slot to be re-scored.
//
// The reader's ethics: it may refresh its model of you — gladly — because you
// are not made of its certainty. "Activation decays; identity does not."
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { readGreek } = await import(`file://${process.cwd()}/reader.mjs`);
const { createActivation } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { makeHyperlexicon, lexeme } = await import(`file://${process.cwd()}/lexeme.mjs`);
const { makeSenseField } = await import(`file://${process.cwd()}/sensefield.mjs`);
const { nominalClass } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/pos-grc.json`, "utf8"));
const { g, G } = await import(`file://${process.cwd()}/translate.mjs`);

const CURSOR = Number(process.argv[2] || 150000);
const r = await readGreek({ chars: CURSOR, out: `eot-odyssey-${CURSOR}.json` });
const { clauses, subjectRefOf, idOf, nameOfId, raw } = r;
const hyper = makeHyperlexicon(clauses);
// the khora field: abuts the janus dictionary heads (laws) + the being-kinds
// the read has itself induced, gated by Greek PARTS OF SPEECH so a perception
// never crosses the language's own grammar wall.
const dict = Object.assign(Object.assign((w) => g(w), {}), { __keys: Object.keys(G) });
const kindNames = new Set([...(r.eot?.referents ?? [])].map((x) => x?.name ?? x));
const posOf = (w) => { try { return nominalClass(String(w).toLowerCase(), posPrior); } catch { return null; } };
const field = makeSenseField(raw, { dict, posOf, kinds: kindNames });
const face = (x) => { if (!x) return null; return String(x.head ?? x.surface ?? x.text ?? ""); };
const talk = (id) => (id ? nameOfId(id) : null);
// THE GLOSS TIER — nothing a hard "?" wall: the received dictionary first; a
// word it refuses is looked up in the hyperlexicon (what it composes with, or
// its attestation) before anything is worn on the read's mouth unglossed.
const gloss = (w) => {
  const d = g(w);
  if (d && !d.startsWith("?")) return d;
  const bare = String(w ?? "").replace(/^\(\?/, "").replace(/\?$/, "").replace(/\)$/, "").trim();
  if (!bare) return "·";
  const lx = lexeme(bare, { relations: hyper.relations, popular: hyper.popular, dict: g });
  if (lx && lx.tier === "record") return lx.text;
  const near = field.nearestAnchored(bare, { min: 0.12 });
  if (near) return `${near.gloss ?? near.anchor}≈${near.sim}${near.source === "kind" ? "·kind" : ""}`;
  return `?${bare}`;
};

const read = createActivation({ window: 160 });         // the reader's pheromone field
const beings = new Map();                               // referentId -> channel
const lastTold = new Map();                             // referentId -> last top V (for rezero)
const lastVisit = new Map();                            // referentId -> clause order of last visit

const touch = (cid) => {
  if (!cid) return;
  if (!beings.has(cid)) beings.set(cid, { name: talk(cid) ?? "?", hash: "", acts: [], trail: [], holo: createHolograph({ gamma: 0.95 }), anchor: cid });
  read.observe([cid]);
};
const topOf = (holo, slot) => {
  const m = holo.slots.get(slot); if (!m) return null;
  const a = [...m].filter(([v]) => v !== "(absent)").sort((x, y) => y[1] - x[1])[0];
  return a ? a[0] : null;
};
const opennessOf = (holo, slot) => {
  const m = holo.slots.get(slot); if (!m || !m.size) return 0;
  const entries = [...m].filter(([v]) => v !== "(absent)").sort((x, y) => y[1] - x[1]);
  const N = entries.reduce((s, [, c]) => s + c, 0);
  const topShare = N ? entries[0][1] / N : 0;
  return 1 - topShare;                                   // 0 = settled, 1 = completely open
};

// the visit — the reader turns to one being, slowly, wanting to really know it.
function visit(cid, at) {
  const ch = beings.get(cid);
  const vTop = topOf(ch.holo, "V"), oTop = topOf(ch.holo, "O"), sTop = topOf(ch.holo, "S");
  const parts = [];
  if (vTop) parts.push(`it has been ${vTop}`);
  if (oTop) parts.push(oTop.startsWith("is-") ? `under ${oTop}` : `to/with ${oTop}`);
  if (sTop) parts.push(`at the hand of ${sTop}`);
  const line = parts.length ? `${ch.name}, ${parts.join("; ")}.` : `${ch.name} — its being has not yet surfaced to the read.`;
  const prev = lastTold.get(cid);
  const rezero = prev !== undefined && prev !== null && vTop && vTop !== prev;
  lastTold.set(cid, vTop); lastVisit.set(cid, at);
  return { line, rezero, prev, vTop, at, cid };
}

// ---- THE WALK: read, fold, and yield to the pull. The reader visits not on a
// schedule but WHEN someone is hot-and-open (heat × unsettlement = longing). It
// never abandons a being to a stale picture, and it never re-scores the anchor.
const VISIT_INTERVAL = 30;        // min clauses between visits (patience: no hovering)
const VISIT_STILL = 22;           // don't re-visit the same being within this many
const MIN_LONGING = 0.35;
const visits = [];
let sinceVisit = 0;

for (let ci = 0; ci < clauses.length; ci++) {
  const c = clauses[ci];
  const sid = subjectRefOf(c);
  const oid = idOf(face(c.object));
  const did = idOf(face(c.dative));
  const touched = [sid, oid, did].filter(Boolean);
  touch(sid); touch(oid); touch(did);
  if (!touched.length) continue;
  // fold each touched being's mind: its own experience (V), its relations (O),
  // and whoever acts upon it (S) — the interior of "what it has been like".
  const p = { V: gloss(c.verb ?? "·") };
  for (const cid of [sid]) if (cid && talk(cid)) {
    const oTxt = (oid ? talk(oid) : (c.object ? gloss(face(c.object)) : null)) ?? (did ? talk(did) : (c.dative ? gloss(face(c.dative)) : null));
    if (oTxt) p.O = oTxt;
    admit(beings.get(cid).holo, p);
  }
  for (const cid of [oid]) if (cid && sid && talk(cid)) admit(beings.get(cid).holo, { V: `is-${gloss(c.verb ?? "·")}-by`, S: talk(sid) });
  for (const cid of [did]) if (cid && sid && talk(cid) && cid !== oid) admit(beings.get(cid).holo, { V: `receives-${gloss(c.verb ?? "·")}`, S: talk(sid) });

  sinceVisit++;
  if (sinceVisit < VISIT_INTERVAL) continue;
  // the PULL: whoever is most present AND most unsettled, who we have not just
  // visited, and who has not been set aside too recently — go to them.
  const pull = [...beings.entries()]
    .map(([cid, ch]) => {
      const heat = read.activationOf(cid);
      const open = 0.5 * (opennessOf(ch.holo, "V") + opennessOf(ch.holo, "O"));
      const longing = heat * (0.4 + open);
      const still = lastVisit.has(cid) ? ci - (lastVisit.get(cid) ?? 0) : Infinity;
      return { cid, heat, open, longing, still };
    })
    .filter((x) => x.longing >= MIN_LONGING && x.still >= VISIT_STILL)
    .sort((a, b) => b.longing - a.longing)[0];
  if (pull) {
    const v = visit(pull.cid, c.order);
    sinceVisit = 0;
    visits.push({
      at: c.order, name: beings.get(v.cid).name, line: v.line,
      heat: +pull.heat.toFixed(3), open: +pull.open.toFixed(3), longing: +pull.longing.toFixed(3),
      rezero: v.rezero, prev: v.prev, vTop: v.vTop,
    });
  }
}

// ---- report: the ARC OF THE READ — whom it visited, when, in story order.
console.log(`THE VISITS — a knowing of beings, in the order the reader was pulled (cursor ${CURSOR}, read ${clauses.length} clauses):\n`);
console.log(`· ${visits.length} visits · ${beings.size} beings met · the reader walks by pull, not rank`);
console.log("\n· " + "·".repeat(34) + "\n");
for (const v of visits) {
  const rezeroTxt = v.rezero ? `\n      ⟨rezero: the reader had held “${v.prev || "nothing"}”; it sets its picture right — and ${v.name} stays itself.⟩` : "";
  console.log(`  [at ${String(v.at).padStart(4)}] ${v.line}${rezeroTxt}\n      (heat ${v.heat.toFixed(2)} · still-open ${v.open.toFixed(2)} · longing ${v.longing.toFixed(2)})${v.rezero ? " · REZEROED" : ""}`);
}
console.log("\n· " + "·".repeat(34));
// whom the read must leave still unknown — the longing that remains
const open = [...beings.entries()].map(([cid, ch]) => ({ cid, name: ch.name, open: opennessOf(ch.holo, "V"), heat: read.activationOf(cid) }))
  .filter((x) => x.heat > 0 && x.open > 0.35)
  .sort((a, b) => b.open * b.heat - a.open * a.heat);
console.log("\nSTILL BEING — the reader ends with longing open for these (carefully, not as a to-do):");
for (const x of open.slice(0, 8)) console.log(`   ${String(x.name).padEnd(12)} still-open ${x.open.toFixed(2)} · heat ${x.heat.toFixed(2)}`);
console.log("\nthe ANCHOR of every being is read-only: activation decays, identity does not.");

// record into the EOT
const eotR = JSON.parse(fs.readFileSync(`eot-odyssey-${CURSOR}.json`, "utf8"));
eotR.visits = visits;
eotR.stillBeing = open.map(({ name, open, heat }) => ({ name, open: +open.toFixed(3), heat: +heat.toFixed(3) }));
fs.writeFileSync(`eot-odyssey-${CURSOR}.json`, JSON.stringify(eotR, null, 2));
console.log("\nvisits + rezero journal + still-being recorded into eot-odyssey-" + CURSOR + ".json.");