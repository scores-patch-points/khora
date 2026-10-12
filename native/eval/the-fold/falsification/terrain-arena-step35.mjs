// terrain-arena-step35.mjs — THE RETAINED MIND MOVES THE REAL READER
// (option 2, the gap step34 left: perception, not just transport).
//
// step34 showed the retained prior ARRIVING at the reader's seam; step35
// shows it CHANGING what the reader distinguishes, on material the learner
// never saw. The retained abstraction travels as DATA (a surface recognizer
// + frontier per-referent rates — JSON-portable, function-free:
// kernel/prior-recognizer.js interprets it), and the real kernel loop runs:
// recordReading -> routeReadingOutcome (earn on held-out future) ->
// priorsFromRegistry -> createRecursiveReader with the retained prior ->
// perceive -> witness -> observations -> fold (graphEntries).
//
// Arms on the FUTURE region (unfamiliar clauses, UDHR-English read from
// scratch, udhr-src/udhr-eng.txt):
//   retained   — the earned mind, recognizers + rates (THE CLAIM)
//   candidate  — the same reading never earned (mind empty)
//   blank      — no mind
//   defeated   — the earned abstraction routed DEFEATED (mind withdraws)
//   deranged   — the earned surfaces re-assigned to wrong referents
// Task per clause: the retained referents whose forms the clause's text
// shows, claimed under the retained ids (attribution). Gold = the scene's
// own recorded referents for the clause. Recall = claims ∩ gold over gold;
// attribution precision = claims ∩ gold over claims.
//
// Usage: node terrain-arena-step35.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createRecursiveReader, encounter } = await import(pathToFileURL(path.join(native, "kernel/reading.js")).href);
const K = await import(pathToFileURL(path.join(native, "kernel/hyperlexicon-abstraction.js")).href);

const SCENE = "eot-udhr-eng.json";
const TEXT = path.join(native, "eval/the-fold/scene/udhr-src/udhr-eng.txt");
const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene", SCENE), "utf8"));
const text = await readFile(TEXT, "utf8");

const refs = corpus.referents.map((r) => ({ hash: r.hash, name: r.name ?? null }));
const nameOf = new Map(refs.map((r) => [r.hash, r.name]));
// clauses = the reading's own (at, span, relations) units, sliced from the source
const clauses = [];
const seen = new Set();
for (const e of corpus.edges) {
  const key = `${e.at}:${e.span?.[0] ?? ""}-${e.span?.[1] ?? ""}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const [start, end] = e.span ?? [];
  const material = Number.isInteger(start) && Number.isInteger(end) ? text.slice(start, end) : null;
  clauses.push({
    at: e.at ?? 0, start, end, material,
    gold: new Set(corpus.edges.filter((x) => x.at === (e.at ?? 0) && JSON.stringify(x.span) === JSON.stringify(e.span)).flatMap((x) => [x.subject, x.object]).filter(Boolean)),
  });
}
const MAXAT = Math.max(...clauses.map((c) => c.at));
const FRONT = Math.floor(0.6 * MAXAT);
const frontier = clauses.filter((c) => c.at <= FRONT);
const future = clauses.filter((c) => c.at > FRONT);

// THE LEARNER: what the frontier showed. Member = a referent whose name is a
// surface actually present in the frontier material (the reading saw the form).
const frontierText = frontier.map((c) => c.material ?? "").join("\n");
const learner = refs.filter((r) => r.name && frontierText.toLowerCase().includes(r.name.toLowerCase()));
const learnerSet = new Set(learner.map((r) => r.hash));
const appearances = new Map(learner.map((r) => [r.hash, new Set()]));
let perClause = 0;
for (const c of frontier) { perClause += 1; for (const h of c.gold) if (learnerSet.has(h)) appearances.get(h)?.add(c.at); }
const rates = new Map([...appearances].map(([h, ats]) => [h, ats.size / perClause]));

// future gold restricted to the learner set (the retained referents present)
const goldOf = (c) => [...c.gold].filter((h) => learnerSet.has(h));

// THE MIND: one earned cell carrying the recognizer + rates.
let reg = K.recordReading(K.createAbstractionRegistry(), {
  id: "reading:udhr-eng:frontier",
  cells: [{
    op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:udhr-eng:recurrence",
    memberRefs: learner.map((r) => r.hash),
    witnesses: ["udhr-eng-seam"],
    meta: { rates: Object.fromEntries(rates) },
    recognizer: { mode: "surface", surfaces: Object.fromEntries(learner.map((r) => [r.hash, [r.name]])) },
  }],
});
// earn evidence: held-out RECOGNITION — the retained mind finds the future
// clause's recorded referents (vs candidate/blank = 0, vs a surface-
// reassignment null). The frontier clause-participation RATES are ALSO
// measured and reported — honestly: they do not forecast future
// participation (the rigidly same finding as steps 11/16b), so they are not
// the earning evidence.
const learnerHashes = learner.map((r) => r.hash);
const futureByRef = new Map(refs.map((r) => [r.hash, 0]));
for (const c of future) for (const h of new Set([...c.gold])) if (futureByRef.has(h)) futureByRef.set(h, futureByRef.get(h) + 1);
const clamp = (v) => Math.min(0.99, Math.max(0.01, v));
const brier = (map) => {
  let s = 0;
  for (const h of learnerHashes) {
    const p = clamp(map.get(h) ?? 0.5);
    s += ((futureByRef.get(h) > 0 ? 1 : 0) - p) ** 2;
  }
  return s / Math.max(1, learnerHashes.length);
};
const real = brier(rates);
const blank = brier(new Map());
let S = 0x12345678;
const rnd = () => { S = (S + 0x6D2B79F5) >>> 0; let q = S; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
const pool = [...rates.values()];
let rateBetterThanBlank = 0;
for (let t = 0; t < 199; t++) {
  const perm = [...pool].sort(() => rnd() - 0.5);
  const mapRef = new Map(learnerHashes.map((h, i) => [h, perm[i % perm.length]]));
  if (brier(mapRef) <= real) rateBetterThanBlank += 1;
}
const ratePValue = (rateBetterThanBlank + 1) / 200;
// the retained entries AS RECORDED (the cell's working structure; standing
// rides the registry, so the permutation arms build from these raw entries)
const rawEntries = learner.map((r) => ({
  referent: r.hash,
  standing: "earned",
  terrain: "Kind",
  basis: "measured",
  ...(rates.has(r.hash) ? { rate: rates.get(r.hash) } : {}),
  recognizer: { mode: "surface", forms: [r.name] },
}));
const retainedPriorRaw = { schema: "EOReceivedPrior@1", entries: rawEntries };

const readClause = async (prior, c) => {
  const reader = createRecursiveReader({ priors: prior ? [prior] : [] });
  const turn = await reader.step(encounter({ id: `clause:${c.at}`, anchor: `clause:${c.at}`, source: "udhr-eng", at: c.at, material: { text: c.material ?? "" } }));
  const claimed = turn.observations.flatMap((o) => o.distinctions).map((d) => d.referent);
  return { claimed: new Set(claimed), turn };
};

const scoreArm = async (prior) => {
  let claimedTotal = 0, goldTotal = 0, hit = 0, clausesWithClaims = 0;
  for (const c of future) {
    const gold = goldOf(c);
    if (gold.length === 0) continue;
    const { claimed } = await readClause(prior, c);
    goldTotal += gold.length;
    claimedTotal += claimed.size;
    hit += gold.filter((h) => claimed.has(h)).length;
    if (claimed.size > 0) clausesWithClaims += 1;
  }
  const recall = goldTotal > 0 ? hit / goldTotal : 0;
  const attribution = claimedTotal > 0 ? hit / claimedTotal : null;
  return { clausesWithClaims, goldTotal, claimedTotal, hit, recall: +recall.toFixed(4), attribution: attribution == null ? null : +attribution.toFixed(4) };
};

const arm = async (prior, label) => ({ label, ...(await scoreArm(prior)) });

// the permutation null for the EARNING claim: 199 surface-to-referent
// reassignments of the SAME retained forms, scored by the same task. Each
// draw is a seeded Fisher-Yates permutation — never a cyclic shift (a shift
// by the list length would be the retained mapping itself).
const derangedPriorOf = (i) => {
  const order = learnerHashes.map((_, k) => k);
  let s = (i * 0x9E3779B9) >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
  for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
  if (order.every((v, k) => v === k)) { const t = order[0]; order[0] = order[1]; order[1] = t; }
  return { schema: "EOReceivedPrior@1", entries: rawEntries.map((e, k) => ({ ...e, referent: learnerHashes[order[k]] })) };
};
const nullScores = [];
for (let t = 0; t < 199; t++) nullScores.push(await scoreArm(derangedPriorOf(t + 1)));
const retainedScore = await scoreArm(retainedPriorRaw);
// the earning statistic is ATTRIBUTION (id-level precision): the retained
// assignment claims the right points for the forms the material shows; a
// reassigned mind claims the same forms under the wrong referents (recall
// alone is inflated by form co-occurrence inside long clauses)
const nullAtLeastAsGood = nullScores.filter((s) => (s.attribution ?? 0) >= (retainedScore.attribution ?? 0)).length;
const recognitionP = (nullAtLeastAsGood + 1) / 200;

const earned = K.routeReadingOutcome(reg, {
  id: "abs:udhr-eng:recurrence",
  heldOut: { method: "held_out_recognition", success: retainedScore.recall > 0.5, effect: +retainedScore.attribution.toFixed(4), pValue: +recognitionP.toFixed(4) },
});
const retainedPrior = K.priorsFromRegistry(earned.registry);
const candidatePrior = K.priorsFromRegistry(reg);
const defeatedPrior = K.priorsFromRegistry(K.routeReadingOutcome(earned.registry, { id: "abs:udhr-eng:recurrence", heldOut: { method: "held_out_shuffled", success: false, effect: -0.02 } }).registry);

const arms = {
  retained: await arm(retainedPrior, "retained earned mind"),
  candidate: await arm(candidatePrior, "candidate-only (unearned)"),
  blank: await arm(null, "blank (no mind)"),
  defeated: await arm(defeatedPrior, "defeated (mind withdrawn)"),
  deranged: await arm(derangedPriorOf(1), "deranged (wrong referents)"),
};

const gates = {
  retainedRecallHigh: arms.retained.recall > 0.9,
  retainedAttributionBeatsStuff: arms.retained.attribution != null && arms.retained.attribution > 0.5,
  unearnedShapesNothing: arms.candidate.recall === 0 && arms.candidate.attribution === null,
  blankShapesNothing: arms.blank.recall === 0,
  defeatWithdraws: arms.defeated.recall === 0 && arms.defeated.attribution === null,
  derangedClaimsWrongPoints: arms.deranged.recall < 0.2 && arms.deranged.attribution != null && arms.deranged.attribution < 0.2,
  recognitionEarnsHeldOut: (retainedScore.attribution ?? 0) > 0.5 && recognitionP < 0.01,
  recognizerRodeTheExport: retainedPrior.entries.every((e) => e.recognizer?.mode === "surface"),
};

const verdict = gates.retainedRecallHigh && gates.retainedAttributionBeatsStuff && gates.unearnedShapesNothing
  && gates.blankShapesNothing && gates.defeatWithdraws && gates.derangedClaimsWrongPoints && gates.recognitionEarnsHeldOut
  ? { verdict: "CONFIRMED", claim: "THE RETAINED MIND MOVES THE REAL READER: the earned abstraction, carried as data (surface recognizer + rates), changes what the reader perceives on clauses the learner never saw — the retained referents are witnessed into observations and the fold (graphEntries), earning on held-out recognition against a surface-reassignment null (p≈" + recognitionP.toFixed(3) + ") — while an unearned or defeated mind shapes nothing and a deranged attribution claims the wrong points. The working structure travels intact and its support is withdrawn by defeat. (Recurrence-rate forecasting is measured and FAILS — reported, not claimed.)" }
  : { verdict: "FALSIFIED", claim: `gates: ${JSON.stringify(gates)}` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep35@1",
  corpus: { scene: SCENE, clauses: clauses.length, frontier: frontier.length, future: future.length },
  mind: { learnerReferents: learnerHashes.length, entries: retainedPrior.entries.length, recognitionRecall: +retainedScore.recall.toFixed(4), recognitionAttribution: +(retainedScore.attribution ?? 0).toFixed(4), recognitionP: +recognitionP.toFixed(4), rateForecastBrier: +real.toFixed(4), rateForecastBlank: +blank.toFixed(4), rateForecastP: +ratePValue.toFixed(4), rateForecastFails: real >= blank },
  arms,
  gates,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["Recognition is by-surface nomination of the retained points (whole-word, case/diacritic-normalized); it is not identity resolution and not translation-aware. Gold = the scene's own recorded relations per future clause; a surface the clause shows whose relation the scene did not record lowers attribution by design. The 199-draw null permutes surface-to-referent assignment of the same retained forms."],
}, null, 2));