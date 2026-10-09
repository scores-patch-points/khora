// summarize.mjs — THE TELLING (spec: phases 1-4). No model.
//   1. CHAPTERS   — the record segments itself: a chapter is a run of reportable
//                   situations whose patient and cast hold together; a new chapter
//                   opens when the patient changes AND the scene-sum spikes (the
//                   boundary is a revision). No text markers.
//   2. EVENTS     — per reportable situation, ONE situation-sentence: patient (the
//                   affected) · act (the highest-learning bound proposition) ·
//                   outcome — in the literary present, story order.
//   3. VOICE      — the read's REPEAT defaults surface as the framing sentence.
//   4. LINT       — every sentence cites its grounds; patient/verb ungrounded or
//                   guessed (?) => invalid; refusals never promoted. Output:
//                   accepted | suppressed | unjustified.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { nominalClass } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/pos-grc.json`, "utf8"));
const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const { readGreek } = await import(`file://${process.cwd()}/reader.mjs`);
const { makeHyperlexicon, lexeme } = await import(`file://${process.cwd()}/lexeme.mjs`);

const CURSOR = Number(process.argv[2] || 150000);
const BOOK = Number(process.argv[3] ?? 1);
const r = await readGreek({ chars: CURSOR, out: `eot-odyssey-${CURSOR}.json` });
const { clauses, B, THR, journal, subjectRefOf, idOf, nameOfId, g } = r;
const talk = (id) => (id ? nameOfId(id) : null);   // the pretty-name swap, at talk

// scenes + reportable situations (the blinks). SCALE-AWARE (2026-10-08): the
// read grew 1,210 → 6,299 clauses when the unattested verbs surfaced; the old
// thresholds (scene>=4, floor 0.72) produced ~20 micro-chapters on the bigger
// read. A chapter is a story unit, not a blink — so scenes are larger (>=6
// clauses) and only the strong blink peak (floor 0.9) survives.
const SCE = []; let cur = [];
for (let i = 0; i < clauses.length; i++) { const rev = B[i]; if (Number.isFinite(rev) && rev >= THR && rev >= (B[i - 1] ?? 0) && rev >= (B[i + 1] ?? 0) && cur.length >= 6) { SCE.push(cur); cur = []; } cur.push(i); }
if (cur.length) SCE.push(cur);
const scenes = SCE.map((ids) => ids.map((i) => clauses[i]));
const sums = scenes.map((sc) => sc.reduce((s, c) => s + (c.learning ?? 0), 0));
const floor = [...sums].sort((a, b) => a - b)[Math.floor(scenes.length * 0.9)] ?? 0;
const blinks = scenes.map((sc, si) => ({ si, sum: sums[si], sc })).filter((x) => x.sum >= floor);
const named = (x) => { const f = face(x); if (!f) return null; if (nominalClass(f.toLowerCase(), posPrior) !== "PROPN") return null; const id = idOf(f); return id ? nameOfId(id) : null; };
const propOf = (c) => {
  const ci = r.clauses.indexOf(c);
  const s = subjectRefOf(c);
  const bound = r.epithetRes.has(ci) || !!r.bySentence.get(c.order) || !!r.zaBind.get(c.order) || !!named(c.subject);
  const who = talk(s) ?? named(c.subject) ?? (c.subject ? g(face(c.subject)) : null) ?? "?";
  const v = g(c.verb ?? "·");
  const o = c.object ? (named(c.object) ?? g(face(c.object)) ?? "") : "";
  const b = c.learning ?? 0;
  return { who, v, o, b, resolved: bound };
};
const situation = (bl) => {
  const props = bl.sc.map(propOf);
  const byC = {}; for (const p of props) if (p.who && !p.who.startsWith("?")) byC[p.who] = (byC[p.who] ?? 0) + 1;
  const patient = Object.entries(byC).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "the world";
  // prefer an act of a RESOLVED being that lands on an object, then most learning
  const act = props.filter((p) => !p.who.startsWith("?") && !p.v.startsWith("?") && p.who !== ".then")
    .sort((a, b) => (b.resolved - a.resolved) || (String(!!b.o <= !!a.o) ? -1 : 1) || (b.b - a.b))[0];
  const doing = act ? `${act.who} ${act.v}${act.o ? " " + act.o : ""}` : "";
  return { si: bl.si, sum: bl.sum, patient, doing, sc: bl.sc };
};

// ---- THE RECONSTRUCTION LAYER: THE TELLING'S UNIT IS THE BOUND CLAUSE, NOT
// THE BELIEF DELTA. A telling says who did what to whom. The base molecule is
// the proposition reconstructed into a world-sentence: subject · act (verb
// gloss) · patient (object gloss), in the literary present, story order, named
// through the for-whom CANON. Where no clause in a situation is bound (subject
// NULL, gloss ?), the situation is REFUSED — standing: gap, never laundered
// into a delta. The holographic delta survives as the footnote.
const COVERB = new Set(["·", "is", "are", "was", "were", "be", "to be", "having", "being", "having said", "having spoken", "having returned home", "of them", "of this"]);
const stripPer = (v) => String(v || "").replace(/^(i|you|we|they|he|she)\s/i, "").replace(/^[a-z]s\s+/i, "");
const situationEvents = (bl) => {
  const props = bl.sc.map(propOf);
  const acts = props
    .filter((p) => p.resolved && !p.who.startsWith("?") && !p.v.startsWith("?") && !COVERB.has(stripPer(p.v)))
    .map((p) => {
      const vv = stripPer(p.v);
      return { ...p, vv, sentence: `${p.who} ${vv}${p.o && p.o !== p.who ? " " + p.o + "." : "."}` };
    })
    .sort((a, b) => b.b - a.b);
  const head = acts[0] ?? null;
  const byC = {}; for (const p of props) if (p.who && !p.who.startsWith("?")) byC[p.who] = (byC[p.who] ?? 0) + 1;
  const patient = Object.entries(byC).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  if (!head) return { si: bl.si, sum: bl.sum, patient, head: null, refused: true, acts: [] };
  return { si: bl.si, sum: bl.sum, patient, head, refused: false, acts };
};
const evRec = blinks.map(situationEvents).sort((a, b) => a.si - b.si);
const refused = evRec.filter((e) => e.refused);
const acceptedE = evRec.filter((e) => !e.refused);

// PHASE 1 — CHAPTERS (self-segmentation), then COARSEN: merge singletons and
// cohort-overlapping chapters until stable — a chapter is a story unit, not a blink
const ev = evRec;
const chapters = []; let ch = [];
for (let i = 0; i < ev.length; i++) {
  const e = ev[i]; const prev = ev[i - 1];
  const spike = !prev || e.sum > prev.sum * 1.15;
  if (ch.length && e.patient && e.patient !== ch[ch.length - 1].patient && spike) { chapters.push(ch); ch = []; }
  ch.push(e);
}
if (ch.length) chapters.push(ch);
const coarsen = (chs) => {
  let c = chs.map((x) => x.slice());
  for (;;) {
    const out = []; let changed = false;
    for (let i = 0; i < c.length; i++) {
      if (!c[i].length) continue;
      if (!out.length) { out.push(c[i]); continue; }
      const prev = out[out.length - 1];
      const overlap = c[i].filter((e) => prev.some((x) => x.patient === e.patient)).length / Math.max(1, c[i].length);
      // a 1-2 event chapter is an atom, not a story unit — it joins the
      // telling before it; otherwise a chapter survives only when its cast
      // really departs (no midline cast continuity at all)
      if (c[i].length <= 2 || overlap > 0) { prev.push(...c[i]); changed = true; }
      else out.push(c[i]);
    }
    c = out.filter((x) => x.length);
    if (!changed || c.length <= 1) break;
  }
  return c;
};
const chaptersC = coarsen(chapters);
// Book N = the first real story-block: a 1-blink atom is not a telling — extend
// the picked chapter into the following one until the block holds >=3 events.
let book = chaptersC[Math.min(BOOK - 1, chaptersC.length - 1)] ?? [];
{
  let k = Math.min(BOOK - 1, chaptersC.length - 1);
  while (book.length < 3 && k + 1 < chaptersC.length) { k++; book = book.concat(chaptersC[k]); }
}

// ---- PHASE 2b — the holographic delta: retained AS THE FOOTNOTE, what the
// read itself changed (the per-node belief delta around the telling's span).
// The headline is now the EVENT; the physics annotates it, never replaces it.
const lo = book.length ? Math.min(...book.map((e) => e.si)) : 0, hi = book.length ? Math.max(...book.map((e) => e.si)) : clauses.length;
const STAGE_GAP = 25;                                   // absence past this many clauses = left the stage
const STAGE_DELTA = 1.4;                                // a bound act above this = a revision
const stage = new Map();                                // being id -> last clause order seen
const stageProps = [];
for (let ci = 0; ci < clauses.length; ci++) {
  const c = clauses[ci];
  const sid = subjectRefOf(c);
  if (sid) {
    const last = stage.get(sid);
    const kind = last === undefined ? "enter" : (ci - last > STAGE_GAP ? "retur" : "keep");
    if (kind !== "keep") {
      const who = talk(sid);
      if (who && !who.startsWith("?")) stageProps.push({ at: ci, kind, who, delta: c.learning ?? 0 });
    }
    stage.set(sid, ci);
  }
  if ((c.learning ?? 0) >= STAGE_DELTA) {
    const p = propOf(c);
    if (p && !p.who.startsWith("?") && !p.v.startsWith("?")) stageProps.push({ at: ci, kind: "change", who: p.who, v: p.v, o: p.o, delta: c.learning });
  }
}
// THE PROPOSITION, HOLOGRAPHICALLY: what changed TO the node IS the per-slot
// belief-delta of its own admission. Stating the node implies its stage — the
// beat is the delta distribution on that node's slots (V deeds, O complements).
const nodeAgg = new Map();
const nodeHistory = new Map();   // node -> Map(value -> standing count) = the ACTIVATED history
for (let ci = 0; ci <= Math.min(clauses.length - 1, hi + 2); ci++) {
  const c = clauses[ci]; const ps = c.perSlot; if (!ps) continue;
  const S = ps.S?.value; if (!S) continue;
  if (!nodeHistory.has(S)) nodeHistory.set(S, new Map());
  if (ps.V?.value) nodeHistory.get(S).set(ps.V.value, (nodeHistory.get(S).get(ps.V.value) ?? 0) + 1);
  if (ps.O?.value) nodeHistory.get(S).set(ps.O.value, (nodeHistory.get(S).get(ps.O.value) ?? 0) + 1);
  if (ci < lo - 2 || ci > hi + 2) continue;                 // the DELTAS are the book's
  if (!nodeAgg.has(S)) nodeAgg.set(S, new Map());
  const m = nodeAgg.get(S);
  if (ps.V?.value && (ps.V?.bayes ?? 0) > 0) m.set(ps.V.value, (m.get(ps.V.value) ?? 0) + ps.V.bayes);
  if (ps.O?.value && (ps.O?.bayes ?? 0) > 0) m.set(ps.O.value, (m.get(ps.O.value) ?? 0) + ps.O.bayes);
}
const tops = [...nodeAgg.entries()]
  .map(([node, mv]) => [node, [...mv.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)])
  .filter(([, t]) => t.length)
  .sort((a, b) => (b[1][0]?.[1] ?? 0) - (a[1][0]?.[1] ?? 0));
// THE TELLING = RECONSTRUCTED EVENTS (who did what) as the headline, in story
// order, from the resolved situations inside the book's chapter-blocks; the
// per-node holographic DELTA is each event's footnote (the belief it moved).
const inBook = (si) => si >= lo - 2 && si <= hi + 2;
const pickedRec = acceptedE.filter((e) => inBook(e.si));
const toldKeys = new Set();
const telling = [];
for (const e of pickedRec) {
  const h = e.head;
  const key = h.sentence;
  if (toldKeys.has(key)) continue;                 // same headline twice = same beat, re-blinking
  toldKeys.add(key);
  const hist = (nodeHistory.get(h.who) ?? new Map());
  const histTxt = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v, n]) => `${v}×${n}`).join(", ");
  const asDelta = tops.find(([n2]) => n2 === h.who);
  const dl = asDelta ? asDelta[1][0][1] : (h.b ?? 0);
  telling.push({
    sentence: h.sentence,
    footnote: `(delta ${dl.toFixed(1)}; behind it: ${histTxt || "nothing new"})`,
    groundEdge: lo, patient: h.who, learning: dl, rollup: false, refused: false,
  });
}
// refused situations are reported honestly, never laundered: the read lacked a
// bound clause there, so the telling SHAKES THEM OUT, citing their position.
for (const e of refused.filter((e) => inBook(e.si))) {
  telling.push({ sentence: `[the read could not bind an act here — ${String(e.acts.length)} clause(s), none resolved].`, footnote: "", groundEdge: lo, patient: null, learning: null, rollup: false, refused: true });
}

// COREFERENCE TO THE CANONICAL NAMES — the for-whom layer: the epic's lens names
// the appellatives; the read's OWN point-binds defeat it locally (if a different
// named being was bound at that point, the canonical default yields there).
const CANON = { father: "Odysseus", son: "Telemachus", daughter: "Nausicaa", god: "Zeus", man: "Odysseus", goddess: "Athena", child: "Telemachus" };
const defeatFor = new Map();
for (const [ci, id] of (r.epithetRes ?? new Map())) {
  const c = r.clauses[ci]; if (!c || c.order < lo - 2 || c.order > hi + 2) continue;
  if (!id || !id.startsWith("N:")) continue;
  const subj = String(face(c.subject) ?? "").toLowerCase().replace(/^\(\?|\)$/g, "");
  const who = nameOfId(id);
  if (subj && who) { if (!defeatFor.has(subj)) defeatFor.set(subj, new Set()); defeatFor.get(subj).add(who); }
}
for (const t of telling) {
  if (t.refused) { t.provenance = "gap"; continue; }
  const ep = String(t.patient ?? "").toLowerCase();
  const canon = CANON[ep];
  const apply = canon && !(defeatFor.get(ep)?.has(canon) ?? false);
  if (apply) {
    const lead = `${t.patient} `;
    if (t.sentence.startsWith(lead)) t.sentence = t.sentence.replace(lead, `${canon} `);
  }
  t.provenance = apply ? "forWhom" : (defeatFor.get(ep)?.size ? `defeated:${[...defeatFor.get(ep)].join("/")}` : "read");
}

// PHASE 3 — THE VOICE: the chapter's REPEAT defaults as framing
const frameGap = 120;
const chapterFrames = [];
for (const e of book) {
  for (const j of journal) {
    if (j.kind !== "REPEAT") continue;
    const who = talk(j.whoId), from = talk(j.fromId);
    if (!who || !from) continue;
    const key = `${who}\u0000${from}`;
    const here = clauses.some((c) => c.order === j.at && Math.abs(c.order - e.si) < 40);
    if (here && !chapterFrames.includes(key)) { chapterFrames.push(key); telling.push({ sentence: `The read has heard: “${from}” keeps meaning the one with “${who}” — every time, unless a named other appears.`, groundEdge: j.at, patient: who, learning: null }); }
  }
}

// PHASE 4 — LINT: every sentence's patient/verb must be grounded (hashed/glossed), never '?'
const referentNames = new Set(r.eot ? r.eot.referents.map((x) => x.name) : []);
const CUBE = { SEG_FIGURE: "SEG·Figure", CON_FIGURE: "CON·Figure", SYN_FIGURE: "SYN·Figure", EVA_PATTERN: "EVA·Pattern", DEF_GROUND: "DEF·Ground", REC_GROUND: "REC·Ground", REC_PATTERN: "REC·Pattern" };
const lint = telling.map((t) => {
  const chips = [];
  if ((t.sentence.match(/\?/g) ?? []).length) chips.push("guessed_?");
  if (t.refused) chips.push("unbound");
  const cell = t.rollup ? CUBE.REC_GROUND : CUBE.REC_PATTERN;      // the telling is the generate·interpretation act
  if (cell !== CUBE.REC_GROUND && cell !== CUBE.REC_PATTERN) chips.push("off_cube");
  return { sentence: t.sentence, verdict: t.refused ? "refused" : (chips.length ? "unjustified" : "accepted"), grounds: [t.groundEdge ?? null].filter(Boolean), chips, cell };
});
// the stack in the cube: each stratum at its (operator·grain) address
const stack = [
  ["clauses (the seam)", "SEG", "Differentiate·Structure", "Figure", "terrain Entity · stance Cutting"],
  ["beings (referents)", "SIG", "Relate·Existence", "Figure", "the wheel's spokes — fold at a point"],
  ["propositions (edges)", "CON", "Relate·Structure", "Figure", "the link between beings"],
  ["situations (G·F·P)", "SYN", "Generate·Structure", "Figure → Pattern", "the born unit of the world"],
  ["kinds", "INS", "Generate·Existence", "Pattern", "induction"],
  ["learning", "EVA", "Relate·Interpretation", "Pattern", "the delta of belief"],
  ["the voice", "DEF", "Differentiate·Interpretation", "Ground", "the lens over everything"],
  ["the record", "REC", "Generate·Interpretation", "Ground", "the store generated"],
  ["the fold", "CON", "Relate·Structure", "Pattern", "the wheel's rim"],
  ["THE TELLING", "REC", "Generate·Interpretation", "Pattern → Ground", "the roll-up: the paradigm told"],
];

// record the telling back into the EOT (hash-addressed, corrections-on-projection)
const eotFile = `eot-odyssey-${CURSOR}.json`;
const eot = JSON.parse(fs.readFileSync(eotFile, "utf8"));
eot.chapters = chapters.map((c, i) => ({ id: i + 1, events: c.map((e) => ({ si: e.si, patient: hashOr(e.patient, r), learning: +e.sum.toFixed(0) })) }));
function hashOr(name, rr) { const h = [...(rr.eot?.referents ?? [])].find((x) => x.name === name); return h ? h.hash : `s:${String(name).slice(0, 8)}`; }
eot.telling = telling.map((t) => ({ ...t }));
eot.lint = lint;
fs.writeFileSync(eotFile, JSON.stringify(eot, null, 2));

console.log(`THE TELLING — Book ${Math.min(BOOK, chaptersC.length)} of the machine's own chapters (cursor ${CURSOR}, read ${clauses.length} clauses):\n`);
console.log(`· ${chaptersC.length} chapters found by the record itself (center-shift + edge-spike, then coarsened)`);
for (let i = 0; i < chaptersC.length; i++) console.log(`  ch ${i + 1}: ${chaptersC[i].length} events, around ${[...new Set(chaptersC[i].map((e) => e.patient))].slice(0, 3).join(", ")}`);
console.log("\n· " + "·".repeat(32) + "\n");
for (const t of telling) console.log(`  ${t.sentence}${t.footnote ? "  " + t.footnote : ""}`);
console.log("\n· " + "·".repeat(32));
const accepted = lint.filter((l) => l.verdict === "accepted").length;
console.log(`\nLINT: ${accepted} accepted · ${lint.filter((l) => l.verdict === "unjustified").length} unjustified`);
lint.filter((l) => l.verdict === "unjustified").forEach((l) => console.log(`   ! ${l.chips.join(", ")} — ${l.sentence}`));
console.log("\nTHE STACK IN THE CUBE (each stratum is a MOVE, admitted under a cell):");
for (const [name, op, stance, grain, note] of stack) console.log(`   ${name.padEnd(24)} ${String(op).padEnd(4)}·${String(grain).padEnd(12)} (${stance}) — ${note}`);
console.log(`\nThe telling stands at REC·Ground (Generate·Interpretation, the ambient) — ` + (accepted === telling.length && accepted > 0 ? "REACHED the Ground row, the cube's emptiest." : "still tentative — has `?` seams to heal before the Ground row is earned."));
console.log("\nTHE HYPERLEXICON — any word is looked up, nothing a hard “?” wall:\n");
const hyper = makeHyperlexicon(r.clauses);
const dictOf = (w) => g(w);
const found = new Set();
for (const t of telling) for (const m of t.sentence.matchAll(/\?([\p{L}\u0300-\u036f]+)/gu)) {
  const w = m[1];
  if (found.has(w)) continue; found.add(w);
  const lx = lexeme(w, { relations: hyper.relations, popular: hyper.popular, dict: dictOf });
  console.log(`   ?${w} → [${lx.tier}] ${lx.text}`);
}
console.log("\ntelling + chapters + lint + cells written back into " + eotFile + " (hash ids, corrections on projection).");