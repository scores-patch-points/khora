// ask.mjs — THE QUESTION-OBJECT ORGAN. The walk attends; this organ ASKS.
// At each noticed tension (a being that is hot right now), it raises an
// INTERROGATIVE from what the record shows, probes the EOT at the address to
// BIND or REFUSE an answer, and feeds the resolution back into the focus.
// No model: a question is a claim-shaped request the record answers with a
// bound edge or a refusal. Curiosity is attention that demands answers.
//
// The three moves of a question:
//   ask-who   — WHO is acting near this being right now?
//   ask-what  — WHAT is happening to {being} here?
//   ask-design— WHY is {being} aligned with {other}? (the recorded relation)
// Each is ANSWERED by the EOT's own edges at the address, or REFUSED.
import fs from "node:fs";

const path = process.argv[2] || "eot-english-pnp.json";
const eot = JSON.parse(fs.readFileSync(path, "utf8"));
const name = new Map(eot.referents.map((r) => [r.hash, r.name]));
const edges = eot.edges ?? [];
const scene = eot.sceneSignal ?? [];
const ROLE_PRON = new Set(["i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "that", "this", "there", "one", "who", "which"]);

// the question library — each raises an interrogative and answers it against
// the record. Answer shape: { answer, at, subject, verb, object } or { refused }.
const askWho = (being, at) => {
  // WHO is acting near being right now? → the edges at/near `at` where being
  // is patient (someone acts toward it) or with it.
  const near = edges.filter((e) => Math.abs(e.at - at) <= 3);
  const actors = new Set();
  for (const e of near) { const s = name.get(e.subject); const o = name.get(e.object); if (o === being && s && !ROLE_PRON.has(s)) actors.add(s); }
  if (actors.size) return { answer: "acting toward it", who: [...actors].slice(0, 3).join(", "), near: near.filter((e) => name.get(e.object) === being).length };
  return { refused: "no recorded being acts toward it here" };
};
const askWhat = (being, at) => {
  // WHAT is happening to being here? → its own edges at/near this span.
  const near = edges.filter((e) => (e.subject === (byName(being)) || e.object === byName(being)) && Math.abs(e.at - at) <= 4);
  const acts = near.slice(0, 3).map((e) => {
    const s = name.get(e.subject), o = name.get(e.object);
    return s === being ? `${being} ${e.action}${o ? " " + o : ""}` : o === being ? `${s || "the unbound seat"} ${e.action} ${being}` : `${s || "×"} ${e.action}`;
  });
  if (acts.length) return { answer: acts[0], variants: acts };
  return { refused: "this being is not recorded acting here" };
};
const askDesign = (being, other, at) => {
  // WHY is being aligned with other? → the recorded relation between them.
  const rels = edges.filter((e) =>
    (e.subject === byName(being) && e.object === byName(other)) ||
    (e.object === byName(being) && e.subject === byName(other))
  );
  if (rels.length) {
    const top = rels.slice(0, 3).map((e) => `${name.get(e.subject)} ${e.action} ${name.get(e.object)}`).join(" · ");
    return { answer: "the record links them", via: top, n: rels.length };
  }
  return { refused: "no recorded edge links them" };
};
// ── THE THREE GRAINS (2026-10-09) — Figure · Pattern · Ground ─────────────
// The question-organ now ASKS AT THE GEOMETRY'S OWN THREE DEPTHS, the same
// ladder the whole fold climbs. Grain is not a decoration: each depth asks a
// different thing and answers from a different register of the record.
//
// FIGURE (the being + its act at a moment): what is happening right here.
const askFigure = (being, at) => askWhat(being, at);
// PATTERN (the recurrence, the kind): what does this being DO over the whole
// read? Its acts aggregated into a standing mode — the mode is the kind the
// being comes to mean (elizabeth: refuses, walks, feels — her Pattern).
const askPattern = (being, at) => {
  const deeds = edges.filter((e) => e.subject === byName(being));
  const acts = new Map();
  for (const e of deeds) { const a = String(e.action ?? ""); if (a.length > 2) acts.set(a, (acts.get(a) ?? 0) + 1); }
  if (!acts.size) return { refused: "this being has no recurring recorded act" };
  const mode = [...acts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, n]) => `${a}×${n}`).join(", ");
  return { answer: "its own pattern across the read", kind: mode, deeds: deeds.length };
};
// GROUND (the standing frame at the address): who is ALSO present around the
// being at this span — the cast the scene stands on, the unchanging backdrop
// (the Void: what the present difference is measured against).
const askGround = (being, at) => {
  const near = edges.filter((e) => Math.abs(e.at - at) <= 12);
  const co = new Set();
  for (const e of near) {
    const s = name.get(e.subject), o = name.get(e.object);
    for (const b of [s, o]) if (b && b !== being && !ROLE_PRON.has(b) && b.length > 2 && (prominence.get(b) ?? 0) >= 3) co.add(b);
  }
  if (!co.size) return { refused: "the read holds no standing cast around it here" };
  return { answer: "the standing frame here", cast: [...co].slice(0, 5).join(", "), n: co.size };
};
const byName = (n) => { const h = eot.referents.find((r) => r.name === n); return h ? h.hash : null; };

// THE LOOP: walk the read; at each moment, the HOTTEST being (max local
// participation) is the subject of the next question. The question is formed
// from what the record shows; it is answered by the record or refused. Every
// step names the question asked, the answer, and where it came from.
const WIN = 18;
const asked = new Set();
const qlog = [];
const PREAMBLE = new Set(["chapter", "page", "copyright", "heading", "preface", "content", "title", "transcriber", "text", "edition", "book", "image", "illustration", "the", "a", "an", "it", "bit", "truth", "minds", "park", "wife", "girls", "woman", "beauty", "way", "reply"]);
// PROMINENCE: a being's total participation is who the read is ABOUT. The organ
// walks the read's OWN edges (not a unique-at list), and at each asks the most
// prominent edge-participant nearby whose edges are actually present there.
const prominence = new Map();
for (const e of edges) {
  const s = name.get(e.subject), o = name.get(e.object);
  for (const b of [s, o]) if (b && !ROLE_PRON.has(b) && b.length > 2 && !PREAMBLE.has(b)) prominence.set(b, (prominence.get(b) ?? 0) + 1);
}
function hotWindow(at) {
  const near = new Set();
  for (let a = Math.max(0, at - WIN); a < Math.min(edges.length, at + WIN); a++) {
    const s = name.get(edges[a].subject), o = name.get(edges[a].object);
    for (const b of [s, o]) if (b && !ROLE_PRON.has(b) && b.length > 2 && !PREAMBLE.has(b) && (prominence.get(b) ?? 0) >= 5) near.add(b);
  }
  if (!near.size) return null;
  let best = null, bestScore = 0;
  for (const b of near) { const p = prominence.get(b) ?? 0; if (p > bestScore && !asked.has(b)) { best = b; bestScore = p; } }
  return best;
}
let questions = 0;
let qSeq = 0;
// ASK THE CAST, AT THEIR OWN DEEDS: iterate the most prominent beings in
// order; for each, ask about the edges where THEY act — "who is doing what at
// a given time" = who, at their own action-address, in the read's order.
const castOrder = [...prominence].sort((a, b) => b[1] - a[1]).map(([b]) => b);
const byActor = new Map();
for (const e of edges) {
  const s = name.get(e.subject);
  if (s && prominence.has(s)) { if (!byActor.has(s)) byActor.set(s, []); byActor.get(s).push(e); }
}
for (const being of castOrder) {
  if (questions >= Number(process.argv[3] || 40)) break;
  if (asked.has(being)) continue;
  const deeds = byActor.get(being) ?? [];
  if (!deeds.length) continue;
  const at = deeds[0].at;
  asked.add(being);
  // THE THREE GRAINS, ROTATED: Figure (the act), Pattern (the recurrence),
  // Ground (the standing frame) — the cube's grain ladder, asked in order.
  const grain = ["Figure", "Pattern", "Ground"][qSeq++ % 3];
  let r;
  if (grain === "Figure") r = askFigure(being, at);
  else if (grain === "Pattern") r = askPattern(being, at);
  else r = askGround(being, at);
  const qTxt = grain === "Figure" ? `${being}'s act here?` : grain === "Pattern" ? `what ${being} does across the read?` : `who stands with ${being} here?`;
  qlog.push({ at, being, grain, q: qTxt, ...r });
  questions++;
}

console.log(`THE QUESTIONS — an interrogative reading at the THREE GRAINS of ${path.split("/").pop()} (no model):\n`);
for (const q of qlog) {
  const verb = q.refused ? "REFUSED" : "ANSWERED";
  console.log(`  [${q.grain.padEnd(7)} at ${String(q.at).padStart(4)}] ${q.being} — ${q.q}`);
  if (q.refused) console.log(`       ✗ ${q.refused}`);
  else if (q.grain === "Pattern") console.log(`       ✓ ${q.answer}: ${q.kind}`);
  else if (q.grain === "Ground") console.log(`       ✓ ${q.answer}: ${q.cast}`);
  else console.log(`       ✓ ${q.answer}${q.who ? ` by ${q.who}` : ""}${q.via ? ` via ${q.via}` : ""}`);
}
console.log(`\n${questions} questions asked at 3 grains; ${qlog.filter((x) => !x.refused).length} answered, ${qlog.filter((x) => x.refused).length} refused.`);