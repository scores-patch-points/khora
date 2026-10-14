// scene/collision-reading.mjs — THE REPUBLIC READ BY TWO MINDS, AND WHERE THEY COLLIDE.  (2026-10-14)
//
//   node eval/the-fold/scene/collision-reading.mjs [--draws 5000]
//
// GROUND  (Strauss) the text as itself. What does the Republic ASSERT of slaves? — the main clauses in which a slave is the one who
//         acts or is said to be something (the subject of a root clause): the substance, in the speakers' own terms.
// FIGURE  (Foucault) context used to show the natural is contingent. Where is the slave PRESENT but not asserted — carried in a
//         relative or adverbial clause, or only ever the object of someone else's verb? That is the grammar of the presupposed:
//         the institution the argument stands on and never takes up.
// COLLISION the sections where the text asserts RULES in main clauses and the slave is only ever backgrounded or patient. There the
//         ground is silent about the very thing the figure says the rule rests on.
//
// The measure is grammatical, off the nested-clause parser (clause depth and role), never lexical overlap. Its null is a LABEL
// PERMUTATION over the pooled occurrences of two sets of persons in the same dialogue: slaves (slave, servant, bondman) and a declared
// set of other human groups (citizens, guardians, rulers, women, children, soldiers, craftsmen, farmers, merchants...). If the slave
// is no more backgrounded than the groups it is read against, "presupposed" is not the slave's position, it is how the Republic
// talks about anyone it is not addressing. The report quotes the Jowett sentences, the Greek page beside, and a verified witness
// from a later reader of the same Greek world (Condorcet, 1790s), shown as witness, not as a third mind.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, analyse, tokenize } from "../../../adapters/text/english-parser.js";
import { clausesOf } from "../../../adapters/text/nested-clauses.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DRAWS = Number(opt("--draws", 5000));
const ENGLISH = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const GREEK = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/plato-republic.txt";
const CONDORCET = "/Users/mlacy/Documents/3.0/eo-teachings/manifest/condorcet-greek-slavery.json";
const SEED = 20261014;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

const model = loadModel(JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/parser-eng-ewt.json", "utf8")));
const SLAVE_L = new Set(["slave", "servant", "bondman", "bondsman"]);
const GROUP_L = new Set(["citizen", "guardian", "ruler", "woman", "child", "soldier", "craftsman", "husbandman", "farmer", "workman", "artisan", "merchant", "trader", "auxiliary", "warrior", "magistrate", "poet", "physician", "judge"]);
const RULEWORD = /\b(rules?|rulers?|ruling|ruled|laws?|lawgivers?|commands?|obey\w*|govern\w*|tyrants?|tyranny|authority|must|ought|shall)\b/i;
const SLAVEWORD = /\b(slaves?|slavery|enslave\w*|servants?|bondmen|bondman|bondage)\b/i;

// ── the Republic by Stephanus section ────────────────────────────────────────────────────────────────────────────────────────
const eRaw = fs.readFileSync(ENGLISH, "utf8");
const start = eRaw.indexOf("I went down yesterday to the Piraeus");
const marks = []; { const re = /\*(\d{3})([A-Ea-e])?\*/g; re.lastIndex = start; let m, last = 326; while ((m = re.exec(eRaw)) !== null) { const p = Number(m[1]); if (p >= last && p <= 621) { marks.push({ page: p, letter: (m[2] ?? "A").toUpperCase(), idx: m.index, end: m.index + m[0].length }); last = p; } } }
const clean = (t) => t.replace(/\[Footnote[\s\S]*?\]/g, " ").replace(/\[Sidenote[\s\S]*?\]/g, " ").replace(/\{\d+\}/g, " ");
const secs = marks.map((mk, i) => ({ sec: `${mk.page}${mk.letter}`, page: mk.page, letter: mk.letter, text: norm(clean(eRaw.slice(mk.end, i + 1 < marks.length ? marks[i + 1].idx : mk.end + 3000))) }));
const gRaw = fs.readFileSync(GREEK, "utf8");
const greekOf = (page, letter) => { const mk = `[ ${page}${letter.toLowerCase()} ]`; const i = gRaw.indexOf(mk); if (i < 0) return ""; const j = gRaw.indexOf("[ ", i + mk.length); return norm(gRaw.slice(i + mk.length, j < 0 ? i + 600 : j)).slice(0, 200); };
const inPlay = new Set(secs.filter((s) => SLAVEWORD.test(s.text) && RULEWORD.test(s.text)).map((s) => s.sec));

// ── every occurrence of a slave or of another group: where it sits in the clause tree ────────────────────────────────────────────
const sentencesOf = (t) => (t.match(/[^.!?]+[.!?]+/g) ?? []).map(norm).filter((s) => s.length >= 20);
const occ = []; const mainRules = new Map();            // sec → main-clause sentences that assert a rule
let parsed = 0;
for (const s of secs) {
  for (const sent of sentencesOf(s.text)) {
    const hasSet = /\b(slaves?|servants?|bondm[ae]n|citizens?|guardians?|rulers?|women|woman|children|child|soldiers?|craftsm[ae]n|husbandm[ae]n|farmers?|workm[ae]n|artisans?|merchants?|traders?|auxiliar\w+|warriors?|magistrates?|poets?|physicians?|judges?)\b/i.test(sent);
    const hasRule = RULEWORD.test(sent);
    if (!hasSet && !hasRule) continue;
    const toks = tokenize(sent); if (toks.length < 4 || toks.length > 70) continue;
    const rows = analyse(model, toks.map((t) => t.form)); const cl = clausesOf(rows); parsed += 1;
    if (hasRule) for (const c of cl) if (c.depth === 0 && RULEWORD.test(c.own.text)) { const a = mainRules.get(s.sec) ?? []; a.push(sent); mainRules.set(s.sec, a); break; }
    for (const r of rows) {
      const lem = String(r.lemma ?? r.form).toLowerCase();
      const set = SLAVE_L.has(lem) ? "slave" : GROUP_L.has(lem) ? "group" : null; if (!set || !/NOUN/.test(r.upos)) continue;
      const c = cl.find((x) => x.own.tokens.includes(r.id)); if (!c) continue;
      const role = c.subject?.head?.toLowerCase() === r.form.toLowerCase() ? "subject" : c.object?.head?.toLowerCase() === r.form.toLowerCase() ? "object" : "other";
      occ.push({ sec: s.sec, set, lemma: lem, role, main: c.depth === 0, relation: c.relation, depth: c.depth, pred: c.predicate?.lemma ?? "", polarity: c.polarity, clause: c.own.text, sentence: sent });
    }
  }
}
console.log(`the Republic: ${secs.length} sections, ${inPlay.size} where slaves and rules meet · sentences parsed ${parsed} · occurrences: ${occ.filter((o) => o.set === "slave").length} slave, ${occ.filter((o) => o.set === "group").length} group`);

// ── the measure and its born null (permute the set label among pooled occurrences) ───────────────────────────────────────────────
const asserted = (o) => o.main && o.role === "subject";           // the slave/group acts, or is said to be, in a root clause
const patient = (o) => o.role === "object";
const background = (o) => !o.main;                                // carried in a relative / adverbial / complement clause
const share = (a, f) => (a.length ? a.filter(f).length / a.length : 0);
const S = occ.filter((o) => o.set === "slave"), G = occ.filter((o) => o.set === "group");
const stats = { slave: { n: S.length, asserted: share(S, asserted), patient: share(S, patient), background: share(S, background) }, group: { n: G.length, asserted: share(G, asserted), patient: share(G, patient), background: share(G, background) } };
const diff = (a, b, f) => share(a, f) - share(b, f);
const obs = { asserted: diff(S, G, asserted), patient: diff(S, G, patient), background: diff(S, G, background) };
const nullD = { asserted: [], patient: [], background: [] };
for (let d = 0; d < DRAWS; d++) { const p = shuffle(occ); const a = p.slice(0, S.length), b = p.slice(S.length); for (const k of Object.keys(nullD)) nullD[k].push(diff(a, b, k === "asserted" ? asserted : k === "patient" ? patient : background)); }
const pOf = (k) => (nullD[k].filter((x) => Math.abs(x) >= Math.abs(obs[k])).length + 1) / (DRAWS + 1);
console.log(`\nslaves (${S.length}) vs other groups (${G.length}) — share of occurrences:`);
for (const k of ["asserted", "patient", "background"]) console.log(`  ${k.padEnd(10)} slave ${(stats.slave[k] * 100).toFixed(1)}% · groups ${(stats.group[k] * 100).toFixed(1)}% · diff ${(obs[k] * 100).toFixed(1)} pts · label-permutation p=${pOf(k).toFixed(4)} (null range ${(Math.min(...nullD[k]) * 100).toFixed(1)}…${(Math.max(...nullD[k]) * 100).toFixed(1)})`);

// ── the reading, section by section ───────────────────────────────────────────────────────────────────────────────────────────
const bySec = new Map(); for (const o of occ) { const a = bySec.get(o.sec) ?? []; a.push(o); bySec.set(o.sec, a); }
const sections = [...inPlay].map((sec) => {
  const os = (bySec.get(sec) ?? []).filter((o) => o.set === "slave");
  const strauss = os.filter(asserted), foucault = os.filter((o) => !asserted(o));
  const rules = mainRules.get(sec) ?? [];
  return { sec, slaveOcc: os.length, strauss, foucault, rules, collision: rules.length > 0 && os.length > 0 && strauss.length === 0 };
});
const withSlaves = sections.filter((x) => x.slaveOcc > 0), collisions = sections.filter((x) => x.collision);
console.log(`\nsections in play ${sections.length} · with a slave-word parsed ${withSlaves.length} · the text asserts of a slave in a root clause in ${withSlaves.filter((x) => x.strauss.length).length} · COLLISION (rules asserted, slave only backgrounded or patient) in ${collisions.length}`);

// section-level born null. The sections in play are DEFINED by a slave-word, so slave occurrences sit in them by construction; the
// null therefore permutes the slave/group label only among occurrences INSIDE the in-play sections (same pool, same count of slaves).
const pool = occ.filter((o) => inPlay.has(o.sec)); const nSl = pool.filter((o) => o.set === "slave").length;
const nullColl = [];
for (let d = 0; d < Math.min(DRAWS, 2000); d++) {
  const p = shuffle(pool); const lab = new Set(p.slice(0, nSl));
  let c = 0;
  for (const sec of inPlay) { const os = pool.filter((o) => o.sec === sec && lab.has(o)); if ((mainRules.get(sec) ?? []).length && os.length && !os.some(asserted)) c += 1; }
  nullColl.push(c);
}
console.log(`  (pool: ${pool.length} occurrences inside the in-play sections, ${nSl} slave)`);
const meanColl = nullColl.reduce((s, x) => s + x, 0) / nullColl.length;
const pColl = (nullColl.filter((x) => x >= collisions.length).length + 1) / (nullColl.length + 1);
console.log(`  collision sections: observed ${collisions.length} · label-permutation null mean ${meanColl.toFixed(1)}, max ${Math.max(...nullColl)} → p=${pColl.toFixed(4)}`);

// ── the report ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let cq = ""; try { cq = norm(JSON.parse(fs.readFileSync(CONDORCET, "utf8")).quote); } catch { /* witness unavailable */ }
const md = [`# The Republic read by two minds — and where they collide`, "",
  `*Ground (Strauss): what the Republic itself asserts of slaves — a slave as the subject of a root clause. Figure (Foucault): where the slave is present but never asserted — a relative, adverbial or complement clause, or only the object of another's verb. Collision: sections where the text asserts a rule in a main clause and the slave is only backgrounded or patient. Grammatical, off the nested-clause parser; the null permutes the label slave/other-group among the ${occ.length} pooled occurrences.*`, "",
  `**Slaves ${S.length} occurrences vs ${G.length} of other groups.** Asserted (subject of a root clause): slaves ${(stats.slave.asserted * 100).toFixed(1)}% vs groups ${(stats.group.asserted * 100).toFixed(1)}% (p=${pOf("asserted").toFixed(3)}). Patient (object): ${(stats.slave.patient * 100).toFixed(1)}% vs ${(stats.group.patient * 100).toFixed(1)}% (p=${pOf("patient").toFixed(3)}). Backgrounded: ${(stats.slave.background * 100).toFixed(1)}% vs ${(stats.group.background * 100).toFixed(1)}% (p=${pOf("background").toFixed(3)}).`, "",
  `**Collision sections:** ${collisions.length} of ${withSlaves.length} sections where a slave-word parsed and the discussion is in play (label permutation inside the in-play sections: null mean ${meanColl.toFixed(1)}, max ${Math.max(...nullColl)}, p=${pColl.toFixed(3)}).`, "",
  ...(cq ? [`> **A later reader of the same Greek world (witness, not a mind) — Condorcet, public domain, \`eo-teachings/manifest/condorcet-greek-slavery.json\`:** “${cq.replace(/\s+/g, " ")} …”`, ""] : []),
  ...sections.filter((x) => x.slaveOcc > 0 || x.rules.length).flatMap((x) => {
    const [page, letter] = [Number(x.sec.slice(0, 3)), x.sec.slice(3)];
    return [`## ${x.sec}${x.collision ? "  ·  COLLISION" : ""}`, `> ${greekOf(page, letter)}`, "",
      `**Ground — what the text asserts of slaves:** ${x.strauss.length ? "" : "_nothing: no root clause makes a slave its subject_"}`, ...x.strauss.slice(0, 3).map((o) => `- “${o.clause.slice(0, 220)}”  _(${o.pred}${o.polarity === "-" ? ", negated" : ""})_`),
      `**Figure — where a slave is present but not asserted:** ${x.foucault.length ? "" : "_none_"}`, ...x.foucault.slice(0, 3).map((o) => `- [${o.main ? "root" : o.relation}, ${o.role}] “${o.sentence.slice(0, 240)}”`),
      ...(x.rules.length ? [`**The rule asserted here:** “${x.rules[0].slice(0, 240)}”`] : []), ""];
  })];
fs.writeFileSync(path.join(HERE, "collision-reading.republic.md"), md.join("\n") + "\n");
fs.writeFileSync(path.join(HERE, "collision-reading.republic.json"), JSON.stringify({ at: new Date().toISOString(), seed: SEED, draws: DRAWS, occurrences: { slave: S.length, group: G.length }, stats, observedDiff: obs, p: { asserted: pOf("asserted"), patient: pOf("patient"), background: pOf("background") }, sectionsInPlay: sections.length, withSlaves: withSlaves.length, collisions: collisions.map((x) => x.sec), collisionRecords: collisions.map((x) => ({ sec: x.sec, rule: x.rules[0], slave: x.foucault.map((o) => ({ sentence: o.sentence, main: o.main, role: o.role, relation: o.relation, clause: o.clause })) })), inPlaySections: [...inPlay], collisionNull: { mean: meanColl, max: Math.max(...nullColl), p: pColl } }, null, 2) + "\n");
console.log(`\nfirst collisions:`);
for (const x of collisions.slice(0, 4)) { console.log(`\n ${x.sec}  RULE: ${x.rules[0].slice(0, 170)}`); for (const o of x.foucault.slice(0, 2)) console.log(`        slave [${o.main ? "root" : o.relation}/${o.role}]: ${o.sentence.slice(0, 170)}`); }
console.log(`\n→ ${path.join(HERE, "collision-reading.republic.md")}`);
