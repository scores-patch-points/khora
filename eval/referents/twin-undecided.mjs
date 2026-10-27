// eval/referents/twin-undecided.mjs — THE NAME/FUNCTION-WORD TWIN: undecided with the tied set, against UD_English-GUM; bars from PREREG-TWIN.md.
//
// A form that is BOTH a name and a function word ("US"/"us", "May"/"may") used to be decided by counts the case-folded treebank mostly spends on the other
// reading. surfaces.js now returns it UNDECIDED with tied = ["name", "function word"] (not a candidate, never a hit or a miss), unless the text separates the
// readings by the form heading a capitalised run ("US Army"). This reads whole GUM documents through the master pipeline (reading.js::readDocument), with the
// same lexicon, documents and dials, under the arms below, and counts what moved.
//
//   GUM_TRAIN=/path/to/en_gum-ud-train.conllu node eval/referents/twin-undecided.mjs [--set F|A|E] [--json out.json]
//
// Sets (pronoun-golden.mjs::slicesOf, cast-initial.mjs::setsOf): A design (spent), E khora#80's confirmation set (spent), F the 35 of the 65 set-aside documents
// that E did not draw: the confirmation set of this registration, scored once. Arms: none (rule off), v1 (khora#80: counts only, no twin field), v2 (default),
// K2 "everything undecided" and K3 "shuffled giver" (the prior's counts permuted across forms, seed 20261160), both built to fail.
import fs from "node:fs";
import crypto from "node:crypto";
import { parseGum, slicesOf, GUM_TRAIN_SHA256 } from "./pronoun-golden.mjs";
import { setsOf, shuffledPrior } from "./cast-initial.mjs";
import { readDocument } from "../../native/reading.js";
import { localLexicon } from "../../native/adapters/text/wiktionary-pack.js";
import { priorsFor } from "../../native/the-fold/read-core.mjs";
import { formUsageOf } from "../../native/adapters/text/form-usage.js";
import { createSurfaceEvidence, accumulateSurfaceEvidence } from "../../native/adapters/text/surfaces.js";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0;
const pct = (a, b) => (b ? `${(100 * a / b).toFixed(2)}%` : "n/a");

/** The sets: A and E from cast-initial.mjs, F = the set-aside documents E did not draw. */
export function setsWithF(docs) {
  const s = slicesOf(docs), { A, E } = setsOf(docs), inE = new Set(E.map((d) => d.id));
  return { A, E, F: s.aside.filter((d) => !inE.has(d.id)) };
}

const noTwin = (use) => (s) => { const u = use(s); return u && { nominal: u.nominal, other: u.other }; };      // khora#80's usage: counts only
const everyTwin = (use) => (s) => { const u = use(s); return u && { ...u, twin: true }; };                      // K2: every measured form is a twin

async function readArm(docs, readOpts) {
  const out = [];
  for (const d of docs) {
    const text = d.sents.map((s) => s.text).join(" ");
    const e = await readDocument(text, { language: "en", minCharacters: 0, ...readOpts });
    const offs = []; { let p = 0; for (const s of d.sents) { offs.push(p); p += s.text.length + 1; } }
    const gold = []; d.sents.forEach((s, si) => s.mentions.forEach((m) => gold.push([offs[si] + m.c0, offs[si] + m.c1])));
    const ev = accumulateSurfaceEvidence(e.sentences.map((s, i) => ({ text: s.text, order: i })), createSurfaceEvidence());
    out.push({
      id: d.id, gold,
      cast: (e.cast ?? []).map((c) => ({ surfaces: c.allSurfaces, spans: c.mentionSpans ?? [] })),
      report: e.formUsageReport ? { undecided: e.formUsageReport.undecided ?? [], separated: e.formUsageReport.separated ?? [] } : null,
      lower: (s) => ev.lowerCounts.get(s.toLowerCase()) ?? 0,
    });
  }
  return out;
}

const inCast = (doc, surface) => doc.cast.some((c) => c.surfaces.includes(surface));
const goldOf = (doc, row) => row.spans.some(([a, b]) => doc.gold.some(([x, y]) => overlap(a, b, x, y)));

/** Every bar of the registration for one arm against the rule-off (`none`) and counts-only (`v1`) reads. */
export function measure(none, v1, arm, truth) {
  const m = { twins: 0, covered: 0, undecidedInCast: 0, v1Gold: 0, leftGold: 0, leftNonTwin: 0, addedNonSeparated: 0, removedNonTwin: 0, separated: 0, separatedGold: 0, undecided: 0, undecidedGold: 0, events: [] };
  none.forEach((doc, i) => {
    const a = arm[i], b = v1[i], rep = a.report ?? { undecided: [], separated: [] };
    const reported = new Map([...rep.undecided.map((u) => [u.surface, "undecided"]), ...rep.separated.map((u) => [u.surface, "separated"])]);
    // the oracle: one-word rule-off cast beings, no lower-case occurrence, a twin by the TRUE prior
    for (const c of doc.cast) {
      const s = c.surfaces[0];
      if (!c.surfaces.every((x) => !/\s/.test(x)) || doc.lower(s) > 0 || !truth(s)?.twin) continue;
      m.twins++;
      const status = reported.get(s) ?? null, tied = [...rep.undecided, ...rep.separated].find((u) => u.surface === s)?.tied;
      if (status && tied?.length === 2 && tied[0] === "name" && tied[1] === "function word") m.covered++;
      const gold = goldOf(doc, c);
      if (status === "separated") { m.separated++; if (gold) m.separatedGold++; }
      if (status === "undecided") { m.undecided++; if (gold) m.undecidedGold++; }
      m.events.push({ doc: doc.id, surface: s, status: status ?? "decided by counts", v1: inCast(b, s) ? "kept" : "refused", gold, mentions: c.spans.length });
    }
    for (const u of rep.undecided) if (inCast(a, u.surface)) m.undecidedInCast++;
    // the cost and the collateral against v1
    for (const c of b.cast) {
      const kept = inCast(a, c.surfaces[0]) || c.surfaces.some((x) => inCast(a, x));
      if (goldOf(doc, c)) m.v1Gold++;
      if (!kept) { const twin = truth(c.surfaces[0])?.twin; if (goldOf(doc, c)) m.leftGold++; if (!twin) m.leftNonTwin++; if (!twin) m.removedNonTwin++; }
    }
    for (const c of a.cast) if (!inCast(b, c.surfaces[0]) && !c.surfaces.some((x) => inCast(b, x)) && reported.get(c.surfaces[0]) !== "separated") m.addedNonSeparated++;
  });
  return m;
}

export function bars(m) {
  const t1 = m.twins < 5 ? { r: "untestable", n: `${m.covered} of ${m.twins} twin candidates covered (fewer than 5)` } : { r: m.covered === m.twins && m.undecidedInCast === 0 ? "held" : "FAILED", n: `${m.covered} of ${m.twins} twin candidates reported undecided or separated with both readings named; ${m.undecidedInCast} undecided in the cast` };
  const t3 = { r: m.v1Gold && m.leftGold / m.v1Gold <= 0.005 ? "held" : (m.v1Gold ? "FAILED" : "untestable"), n: `${m.leftGold} gold-overlapping beings left the cast of ${m.v1Gold} = ${pct(m.leftGold, m.v1Gold)} (bar <= 0.50%)` };
  const t4 = { r: m.removedNonTwin === 0 && m.addedNonSeparated === 0 ? "held" : "FAILED", n: `${m.removedNonTwin} non-twin beings removed, ${m.addedNonSeparated} beings added that are not separated twins` };
  const t5 = m.separated < 5 ? { r: "untestable", n: `${m.separatedGold} of ${m.separated} separated twins have a gold mention (fewer than 5)` } : { r: m.separatedGold / m.separated >= 0.8 ? "held" : "FAILED", n: `${m.separatedGold} of ${m.separated} = ${pct(m.separatedGold, m.separated)} (bar >= 80%)` };
  return { T1: t1, T3: t3, T4: t4, T5: t5 };
}

async function main() {
  const file = process.env.GUM_TRAIN || arg("--gum", null);
  if (!file || !fs.existsSync(file)) { console.log("twin-undecided: skipped — set GUM_TRAIN to UD_English-GUM's en_gum-ud-train.conllu (CC BY-SA, not vendored)."); return; }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  console.log(`GUM train sha256 ${sha}${sha === GUM_TRAIN_SHA256 ? " (the file the README's numbers were measured on)" : " — NOT the file the README's numbers were measured on"}`);
  const lexicon = localLexicon("en");
  await lexicon.want(["office"]);
  if (!lexicon.giver) { console.log(`twin-undecided: skipped — no lexicon giver on this machine (${lexicon.log.at(-1)?.gap ?? "no answer"}).`); return; }
  const posPrior = priorsFor("eng").posPrior;
  if (!posPrior) { console.log("twin-undecided: skipped — no pos prior (pos-eng.json) on this machine."); return; }
  const setName = arg("--set", "F"), docs = setsWithF(parseGum(file))[setName];
  if (!docs) { console.log(`twin-undecided: no set ${setName} (A, E or F)`); return; }
  console.log(`set ${setName}: ${docs.length} documents`);
  const truth = formUsageOf(posPrior);
  const none = await readArm(docs, { lexicon, readerOptions: { formUsage: null } });
  const v1 = await readArm(docs, { lexicon, readerOptions: { formUsage: noTwin(truth) } });
  const v2 = await readArm(docs, { lexicon });
  const k2 = await readArm(docs, { lexicon, readerOptions: { formUsage: everyTwin(truth) } });
  const k3 = await readArm(docs, { lexicon, readerOptions: { formUsage: formUsageOf(shuffledPrior(posPrior)) } });

  const m = measure(none, v1, v2, truth), B = bars(m);
  console.log(`\ntwin candidates (one-word, no lower-case twin in the text, a twin by the prior): ${m.twins}; undecided ${m.undecided} (${m.undecidedGold} with a gold mention), separated ${m.separated} (${m.separatedGold} with one)`);
  for (const [k, v] of Object.entries(B)) console.log(`${k}  ${v.r.padEnd(10)} ${v.n}`);
  console.log("\nevery twin event (an undecided is neither met nor missed):");
  for (const e of m.events) console.log(`  ${e.doc.padEnd(28)} ${e.surface.padEnd(6)} ${e.status.padEnd(18)} v1 ${e.v1.padEnd(7)} ${e.gold ? "gold" : "no gold"}  mentions ${e.mentions}`);
  const k1 = measure(none, v1, v1, truth), k1b = bars(k1);
  console.log(`\nK1 counts only, the twin decided by khora#80 (built to fail T1)   T1 ${k1b.T1.r}: ${k1b.T1.n}`);
  const k2m = measure(none, v1, k2, truth), k2b = bars(k2m);
  console.log(`K2 everything undecided (built to fail T3)                         T3 ${k2b.T3.r}: ${k2b.T3.n}`);
  const k3m = measure(none, v1, k3, truth), k3b = bars(k3m);
  const k3f = Object.entries(k3b).filter(([, v]) => v.r === "FAILED").map(([k]) => k);
  console.log(`K3 shuffled giver (built to fail T1)                               ${k3f.length ? "failed " + k3f.join(", ") : "held all: the bars cannot tell a giver from noise"}`);
  for (const [k, v] of Object.entries(k3b)) console.log(`     ${k}  ${v.r.padEnd(10)} ${v.n}`);
  const json = arg("--json", null);
  if (json) fs.writeFileSync(json, JSON.stringify({ set: setName, ids: docs.map((d) => d.id), main: { ...m, events: m.events }, bars: B, k1: k1b, k2: k2b, k3: k3b }, null, 1));
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
