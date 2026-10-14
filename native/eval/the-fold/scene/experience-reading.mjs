// scene/experience-reading.mjs — READ THE REPUBLIC'S DISCUSSION OF SLAVES AND RULES FROM A POINT OF VIEW.  (2026-10-14)
//
//   node eval/the-fold/scene/experience-reading.mjs [--draws 20] [--max-sentences 120]
//
// "What I want is for the reader to experience the discussion of slaves and rules with a point of view" (the user, 2026-10-14).
// A point of view here is not an adjective. It is WHAT THE READER HOLDS: the voices of the people who were ruled — the formerly
// enslaved who told their own lives to the WPA interviewers, the witnesses of the TRC, the struggle's own documents — as the
// ground the Republic's sentences land on or fail to land on. The reading goes through the discussion IN ORDER (the Stephanus
// sections where slave-words and rule-words meet), and for each sentence the reader either HOLDS something said by someone who
// lived under such a rule, or says plainly it holds nothing.
//
// WHAT MAKES IT A POINT OF VIEW AND NOT A SEARCH, and the test: the same sentences are read through the same retrieval under
// RANDOM subsets of the foundation of exactly the same size (the cocoa farmers, the hurricane interviews, the storybooks, a
// random draw of everyone). If the point of view of the ruled holds no more of this discussion than a random point of view of the
// same size, then it is not a point of view, it is a corpus. The count of sentences held is read against the best of N random
// draws; the sign cue (does the lived sentence assert or deny what the Republic's sentence does) is shown, never counted.
//
// The Greek page of each section is printed beside the English so the reader sees where the words are Plato's.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FOLD = "/Users/mlacy/Documents/3.0/the-fold";
const { indexOf, mindPassagesFor, contentStems } = await import(path.join(FOLD, "fold-chat-foundation.js"));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DRAWS = Number(opt("--draws", 20)), MAXS = Number(opt("--max-sentences", 120));
const ENGLISH = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const GREEK = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/plato-republic.txt";
const SEED = 20261014;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// ── the discussion: sections where a slave-word and a rule-word meet ────────────────────────────────────────────────────────
const SLAVE = /\b(slaves?|slavery|enslave\w*|servants?|bondmen|bondman|masters?|bondage)\b/i;
const RULE = /\b(rules?|rulers?|ruling|ruled|laws?|lawgivers?|commands?|obey\w*|obedien\w*|govern\w*|tyrants?|tyranny|authority|subjects?)\b/i;
const eRaw = fs.readFileSync(ENGLISH, "utf8");
const start = eRaw.indexOf("I went down yesterday to the Piraeus");
const secs = []; {
  const re = /\*(\d{3})([A-Ea-e])?\*/g; re.lastIndex = start; const marks = []; let m, last = 326;
  while ((m = re.exec(eRaw)) !== null) { const p = Number(m[1]); if (p >= last && p <= 621) { marks.push({ page: p, letter: (m[2] ?? "A").toUpperCase(), idx: m.index, end: m.index + m[0].length }); last = p; } }
  for (let i = 0; i < marks.length; i++) secs.push({ ...marks[i], text: eRaw.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].idx : marks[i].end + 3000) });
}
const hits = secs.filter((s) => SLAVE.test(s.text) && RULE.test(s.text));
console.log(`the Republic's dialogue: ${secs.length} Stephanus sections · slaves and rules meet in ${hits.length} (pages ${hits[0]?.page}–${hits[hits.length - 1]?.page})`);
// the Greek text of a section, for the page beside it
const gRaw = fs.readFileSync(GREEK, "utf8");
const greekOf = (page, letter) => { const mk = `[ ${page}${letter.toLowerCase()} ]`; const i = gRaw.indexOf(mk); if (i < 0) return ""; const j = gRaw.indexOf("[ ", i + mk.length); return norm(gRaw.slice(i + mk.length, j < 0 ? i + 600 : j)).slice(0, 220); };

// sentences of each hit section that carry the field (so the reading is of the discussion, not the page)
const sentencesOf = (t) => (t.replace(/\[Footnote[\s\S]*?\]/g, " ").replace(/\[Sidenote[\s\S]*?\]/g, " ").replace(/\{\d+\}/g, " ").match(/[^.!?]+[.!?]+/g) ?? []).map(norm).filter((s) => s.length >= 30 && (SLAVE.test(s) || RULE.test(s)));
let items = [];
for (const s of hits) for (const sent of sentencesOf(s.text)) items.push({ page: s.page, letter: s.letter, sentence: sent, slave: SLAVE.test(sent), rule: RULE.test(sent) });
const total = items.length;
if (items.length > MAXS) { const step = items.length / MAXS; items = Array.from({ length: MAXS }, (_, i) => items[Math.floor(i * step)]); }   // an even stride through the discussion, order kept
console.log(`sentences in those sections that speak of slaves or of rule: ${total}; reading ${items.length} (even stride, in order)`);

// ── the point of view: the voices of the ruled ───────────────────────────────────────────────────────────────────────────────
const load = (f) => { try { const j = JSON.parse(fs.readFileSync(path.join(FOLD, "mind", f), "utf8")); return j.schema === "FoundationIndex@1" ? j : null; } catch { return null; } };
const pub = load("foundation-index.json"), loc = load("foundation-index.local.json");
if (!pub && !loc) { console.error("no foundation index"); process.exit(1); }
let all = pub ?? loc;
if (pub && loc) { const off = pub.docs.length; all = { ...pub, docs: [...pub.docs, ...loc.docs], units: [...pub.units, ...loc.units.map((u) => [u[0] + off, u[1], u[2]])] }; }
const RULED = new Set(["oral-history-us", "testimony-trc", "testimony"]);
const povUnits = all.units.filter((u) => RULED.has(all.docs[u[0]].layer));
const restUnits = all.units.filter((u) => !RULED.has(all.docs[u[0]].layer));
const subset = (units) => indexOf({ ...all, units });
console.log(`the foundation: ${all.docs.length} documents, ${all.units.length} sentences · the point of view (the ruled's own voices: WPA narrators, TRC witnesses, the struggle's documents): ${povUnits.length} sentences`);

const heldCount = (index) => { let n = 0; const perItem = []; for (const it of items) { const r = mindPassagesFor({ question: it.sentence, index }); const held = r.passages.length > 0; if (held) n += 1; perItem.push(r); } return { n, perItem }; };
const povIndex = subset(povUnits);
const pov = heldCount(povIndex);
// the null: equal-size random subsets of the WHOLE foundation (so the voices of the ruled can come up by chance in proportion)
const nullCounts = [];
for (let d = 0; d < DRAWS; d++) {
  const idx = all.units.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  nullCounts.push(heldCount(subset(idx.slice(0, povUnits.length).map((i) => all.units[i]))).n);
}
const nullMean = nullCounts.reduce((s, x) => s + x, 0) / nullCounts.length, nullBest = Math.max(...nullCounts);
// and the opposite point of view: everyone who was NOT in the ruled's layers, same size
const oppIdx = subset(restUnits.length > povUnits.length ? restUnits.slice().sort(() => rnd() - 0.5).slice(0, povUnits.length) : restUnits);
const opp = heldCount(oppIdx);
console.log(`\nHELD (the reader holds something said by someone who lived it) of ${items.length} sentences:`);
console.log(`  the ruled's point of view:            ${pov.n}`);
console.log(`  random points of view, same size:     mean ${nullMean.toFixed(1)}, best of ${DRAWS} = ${nullBest}`);
console.log(`  everyone else's voices, same size:    ${opp.n}`);
console.log(`  → the point of view ${pov.n > nullBest ? "MAKES a difference" : "does NOT make a difference above random points of view"}`);

// ── the reading ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const NEG = /\b(?:not|never|no|nobody|none|nothing|neither|nor|cannot|without)\b|n['’]t\b/i;
const lines = [`# The Republic's discussion of slaves and rules, read as the ruled`, "", `*${items.length} sentences from ${hits.length} Stephanus sections (${total} in the discussion), in order. The point of view is ${povUnits.length} sentences spoken by people who were ruled: formerly enslaved narrators (WPA), TRC witnesses, the struggle's documents. A sentence is HELD only where the reader's born-null bar licenses a lived sentence for it; otherwise it is said to be unheld.*`, "", `**Held ${pov.n} of ${items.length}.** Random points of view of the same size hold ${nullMean.toFixed(1)} on average, ${nullBest} at best; everyone else's voices hold ${opp.n}.`, ""];
let lastSec = "";
items.forEach((it, i) => {
  const sec = `${it.page}${it.letter}`;
  if (sec !== lastSec) { lines.push(`## ${sec}`, `> ${greekOf(it.page, it.letter)}`, ""); lastSec = sec; }
  lines.push(`**Plato (Jowett):** ${it.sentence}${NEG.test(it.sentence) ? "  _(negated)_" : ""}`);
  const r = pov.perItem[i];
  if (!r.passages.length) lines.push(`- _holds nothing_ (${r.gap})`);
  for (const p of r.passages.slice(0, 2)) lines.push(`- **${p.layer}** — ${p.title.slice(0, 60)}: “${p.text.slice(0, 260)}”${NEG.test(p.text) !== NEG.test(it.sentence) ? "  _(opposite sign)_" : ""}  \`${p.address.file}#${p.address.at}\``);
  lines.push("");
});
const out = path.join(HERE, "experience-reading.slaves-and-rules.md");
fs.writeFileSync(out, lines.join("\n"));
fs.writeFileSync(path.join(HERE, "experience-reading.slaves-and-rules.json"), JSON.stringify({ at: new Date().toISOString(), seed: SEED, sections: hits.length, sentencesInDiscussion: total, read: items.length, pointOfView: { units: povUnits.length, held: pov.n }, nullDraws: DRAWS, nullMean, nullBest, nullCounts, everyoneElse: { units: povUnits.length, held: opp.n }, makesDifference: pov.n > nullBest }, null, 2) + "\n");
console.log(`\nfirst held readings:`);
let shown = 0; items.forEach((it, i) => { if (shown >= 5 || !pov.perItem[i].passages.length) return; shown += 1; const p = pov.perItem[i].passages[0]; console.log(`\n ${it.page}${it.letter}  PLATO: ${it.sentence.slice(0, 190)}\n       [${p.layer}] ${p.text.slice(0, 220)}`); });
console.log(`\n→ ${out}`);
