// eval/contest/run.mjs — the synthetic set of PREREG.md (frozen first; sha in PREREG.sha), generated from a seed, run through contests(), scored.
//
// Pairs of units on shared referents, each pair with its own invented proper name so pairs cannot cross-contest by design; the LABEL is generated with
// the pair and never read from the module. Everything goes into ONE graph (so cross-pair edges exist and the shuffled null means something).
//
//   node eval/contest/run.mjs [--seed 7] [--pairs 300] [--shuffles 20] [--weighting surprisal|none] [--tag run4]
//     writes eval/contest/RESULTS-<tag>-seed<N>.md and results-<tag>-seed<N>.json (RESULTS.md / results.json when no --tag)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { claimGraph, contests, shuffleEnds } from "../../opencode-contest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SEED = Number(arg("--seed", 7)), PAIRS = Number(arg("--pairs", 300)), SHUFFLES = Number(arg("--shuffles", 20));
const WEIGHTING = arg("--weighting", "surprisal"), TAG = arg("--tag", null);
const OUT = TAG ? `RESULTS-${TAG}-seed${SEED}` : "RESULTS", OUTJ = TAG ? `results-${TAG}-seed${SEED}` : "results";

/** mulberry32: a seeded generator, so the set is the same bytes for the same seed. */
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = rngOf(SEED);
const pick = (xs) => xs[Math.floor(rng() * xs.length)];
const int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

// ── fixtures (data, not rules) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const PRE = ["Ash", "Cald", "Dun", "Els", "Fen", "Gar", "Holm", "Ick", "Kel", "Lan", "Mor", "Nor", "Ox", "Pem", "Rad", "Sel", "Thorn", "Ux", "Var", "Wel", "Yar", "Brae", "Cor", "Dal"];
const SUF = ["bury", "mere", "ford", "wick", "by", "row", "ley", "ham", "worth", "ton", "stead", "combe", "moor", "dale"];
const TYPES = ["Lighthouse", "Bridge", "Tower", "Castle", "Hall", "Station", "Priory", "Abbey"];
const HEADS = ["species", "members", "inhabitants", "residents", "students", "employees", "branches", "volumes", "rooms", "floors", "steps", "bells", "islands", "villages", "keepers", "lamps"];
const UNITS = ["metres", "kilometres", "years", "percent"];
const RELATIONS = ["completed", "opened", "built", "founded", "closed", "restored"];
const MONTHS = ["January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December"];

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function words(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  if (n < 1000 && n % 100 === 0) return ONES[n / 100] + " hundred";
  if (n >= 1000 && n % 1000 === 0 && n < 100000) return words(n / 1000) + " thousand";
  return null;
}
/** A number in one of its written forms: digits (comma-grouped), or words when the language has a short form for it. */
function render(n) {
  const w = words(n);
  const digits = n.toLocaleString("en-US");
  if (w && rng() < 0.45) return w;
  return digits;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ── phrasings: at least four per kind ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const COUNT = [
  (X, n, h) => `${X} has ${n} ${h}.`,
  (X, n, h) => `There are ${n} ${h} at ${X}.`,
  (X, n, h) => `${cap(n)} ${h} are recorded at ${X}.`,
  (X, n, h) => `${X} counts ${n} ${h}.`,
  (X, n, h) => `${X} | ${h} | ${n}`,
];
const MEASURE = [
  (X, n, u) => `${X} is ${n} ${u} long.`,
  (X, n, u) => `${X} measures ${n} ${u}.`,
  (X, n, u) => `At ${n} ${u}, ${X} is the longest of its kind.`,
  (X, n, u) => `${X} | length | ${n} ${u}`,
  (X, n, u) => `${X} stretches ${n} ${u}.`,
];
const DATE = [
  (X, y, r) => `${X} was ${r} in ${y}.`,
  (X, y, r) => `${cap(r)} in ${y}, ${X} still stands.`,
  (X, y, r) => `In ${y} ${X} was ${r}.`,
  (X, y, r) => `${X} | ${r} | ${y}`,
  (X, y, r) => `The records say ${X} was ${r} in ${y}.`,
];

let nameSeq = 0;
function freshName() {
  const i = nameSeq; nameSeq += 1;
  return `${PRE[i % PRE.length]}${SUF[Math.floor(i / PRE.length) % SUF.length]} ${TYPES[Math.floor(i / (PRE.length * SUF.length)) % TYPES.length]}`;
}

// ── one pair per condition and kind; the label travels with the pair ───────────────────────────────────────────────────────────────────────────
const KINDS = ["count", "measure", "year", "yearmonth"];
const CONDS = ["conflict", "conflict", "settled-third", "settled-scope", "settled-narrow", "consistent-equal", "consistent-range", "consistent-round", "unrelated-head", "unrelated-relation", "unrelated-ordinal", "unrelated-referent"];

function pair(id) {
  const kind = pick(KINDS), cond = pick(CONDS);
  const X = freshName(), Y = freshName();
  const units = [];
  const add = (text, tag) => units.push({ text, standing: "grounded", at: `p${id}-${tag}`, kind: /\|/.test(text) ? "table" : "prose", pair: id });
  let label = cond.startsWith("conflict") || cond.startsWith("settled") ? (cond === "conflict" ? "contest" : "settled") : "none";
  let applicable = true;
  if (kind === "count" || kind === "measure") {
    const h = kind === "count" ? pick(HEADS) : pick(UNITS);
    const P = kind === "count" ? COUNT : MEASURE;
    const a = rng() < 0.2 ? int(2, 9) * 1000 : int(3, 95);
    const far = a >= 1000 ? a + int(2, 6) * 1000 : a + int(2, 20);
    switch (cond) {
      case "conflict": add(pick(P)(X, render(a), h), "a"); add(pick(P)(X, rng() < 0.4 ? `${render(far)} to ${render(far + int(2, 9))}` : render(far), h), "b"); break;
      case "settled-third": add(pick(P)(X, render(a), h), "a"); add(pick(P)(X, render(far), h), "b"); add(`${X}'s ${h} rose from ${render(a)} to ${render(far)}.`, "c"); break;
      case "settled-scope": { const u = pick(P)(X, render(a), h); add(`In ${int(1950, 2020)} ${u.startsWith(X) ? u : u.replace(/^./, (c) => c.toLowerCase())}`, "a"); add(pick(P)(X, render(far), h), "b"); break; }
      case "settled-narrow": if (kind !== "count") { applicable = false; break; } add(`${render(a)} ${h} of ${X} are kept at ${Y}.`, "a"); add(pick(P)(X, render(far), h), "b"); break;
      case "consistent-equal": add(pick(P)(X, render(a), h), "a"); add(pick(P)(X, render(a), h), "b"); break;
      case "consistent-range": add(pick(P)(X, render(a), h), "a"); add(pick(P)(X, `between ${render(Math.max(1, a - int(1, 5)))} and ${render(a + int(1, 5))}`, h), "b"); break;
      case "consistent-round": { const exact = int(2, 9) * 1000 + int(1, 499); add(pick(P)(X, exact.toLocaleString("en-US"), h), "a"); add(pick(P)(X, `about ${(Math.round(exact / 1000) * 1000).toLocaleString("en-US")}`, h), "b"); break; }
      case "unrelated-head": { const h2 = pick((kind === "count" ? HEADS : UNITS).filter((z) => z !== h)); add(pick(P)(X, render(a), h), "a"); add(pick(P)(X, render(far), h2), "b"); break; }
      case "unrelated-relation": applicable = false; break;
      case "unrelated-ordinal": add(`The third ${X} has ${render(a)} ${h}.`, "a"); add(`The fourth ${X} has ${render(far)} ${h}.`, "b"); break;
      case "unrelated-referent": add(pick(P)(X, render(a), h), "a"); add(pick(P)(Y, render(far), h), "b"); break;
    }
  } else {
    const r = pick(RELATIONS);
    const y = int(1500, 1990);
    const y2 = y + int(1, 120);
    const m = pick(MONTHS), m2 = pick(MONTHS.filter((z) => z !== m));
    const ym = kind === "yearmonth";
    switch (cond) {
      case "conflict": add(pick(DATE)(X, ym ? `${m} ${y}` : String(y), r), "a"); add(pick(DATE)(X, ym ? `${m2} ${y}` : String(y2), r), "b"); break;
      case "settled-third": add(pick(DATE)(X, String(y), r), "a"); add(pick(DATE)(X, String(y2), r), "b"); add(`${X} was ${r} between ${y} and ${y2}.`, "c"); break;
      case "settled-scope": applicable = false; break;
      case "settled-narrow": applicable = false; break;
      case "consistent-equal": add(pick(DATE)(X, String(y), r), "a"); add(pick(DATE)(X, String(y), r), "b"); break;
      case "consistent-range": add(pick(DATE)(X, ym ? `${int(1, 28)} ${m} ${y}` : `${m} ${y}`, r), "a"); add(pick(DATE)(X, ym ? `${m} ${y}` : String(y), r), "b"); break;
      case "consistent-round": applicable = false; break;
      case "unrelated-head": applicable = false; break;
      case "unrelated-relation": { const r2 = pick(RELATIONS.filter((z) => z !== r)); add(pick(DATE)(X, String(y), r), "a"); add(pick(DATE)(X, String(y2), r2), "b"); break; }
      case "unrelated-ordinal": add(`The third ${X} was ${r} in ${y}.`, "a"); add(`The fourth ${X} was ${r} in ${y2}.`, "b"); break;
      case "unrelated-referent": add(pick(DATE)(X, String(y), r), "a"); add(pick(DATE)(Y, String(y2), r), "b"); break;
    }
  }
  if (!applicable) return null;
  return { id, kind, cond, label, units, settler: cond === "settled-third" ? `p${id}-c` : cond === "settled-scope" || cond === "settled-narrow" ? `p${id}-a` : null };
}

const pairs = [];
for (let id = 0; pairs.length < PAIRS && id < PAIRS * 4; id += 1) { const p = pair(pairs.length); if (p) pairs.push(p); }
// distractors with no value, one per ten pairs, on their own names
const distractors = Array.from({ length: Math.ceil(PAIRS / 10) }, (_, i) => ({ text: `${freshName()} is much visited in summer.`, standing: "grounded", at: `d${i}`, kind: "prose", pair: null }));
const claims = [...pairs.flatMap((p) => p.units), ...distractors];

const graph = await claimGraph({ claims }, { weighting: WEIGHTING });
const cs = contests({ graph });
const pairOfAt = new Map(claims.map((c) => [c.at, c.pair]));

// ── scoring ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const hit = new Map(); // pair id -> contests found within the pair
let cross = 0;
for (const c of cs) {
  const pa = pairOfAt.get(c.a.at), pb = pairOfAt.get(c.b.at);
  if (pa == null || pb == null || pa !== pb) { cross += 1; continue; }
  (hit.get(pa) ?? hit.set(pa, []).get(pa)).push(c);
}
const planted = pairs.filter((p) => p.label !== "none");
const clean = pairs.filter((p) => p.label === "none");
const recall = planted.filter((p) => hit.has(p.id)).length / planted.length;
const falseRate = clean.filter((p) => hit.has(p.id)).length / clean.length;
const settledRight = pairs.filter((p) => p.label === "settled").filter((p) => (hit.get(p.id) ?? []).some((c) => c.settled?.by === p.settler));
const settledAll = pairs.filter((p) => p.label === "settled");
const perCond = {};
for (const p of pairs) { const k = `${p.kind}/${p.cond}`; perCond[k] ??= { n: 0, found: 0 }; perCond[k].n += 1; if (hit.has(p.id)) perCond[k].found += 1; }

// the null: ends dealt across claims
const nullRng = rngOf(SEED + 1);
let nullSum = 0, nullFalseSum = 0;
for (let k = 0; k < SHUFFLES; k += 1) {
  const sc = contests({ graph: shuffleEnds(graph, nullRng) });
  nullSum += sc.length;
  const inClean = new Set();
  for (const c of sc) { const pa = pairOfAt.get(c.a.at), pb = pairOfAt.get(c.b.at); if (pa != null && pa === pb && pairs[pa].label === "none") inClean.add(pa); }
  nullFalseSum += inClean.size / clean.length;
}
const nullMean = nullSum / SHUFFLES;

// the dolphins pair, beside the set
const dolph = await claimGraph({ claims: [
  { text: "Thirty-six dolphin species are found in every ocean.", at: "essay#1" },
  { text: "There are around forty to forty-five dolphin species living in nearly all aquatic environments, from oceans to fresh water, at temperatures below 0°C to above 30°C.", at: "essay#2" },
] });
const dolphins = contests({ graph: dolph });

const B1 = recall >= 0.9, B2 = falseRate <= 0.05, B3 = nullMean <= 0.1 * cs.length;
const missesByCond = Object.entries(perCond).filter(([k, v]) => k.split("/")[1].startsWith("conflict") || k.split("/")[1].startsWith("settled")).filter(([, v]) => v.found < v.n);
const falsesByCond = Object.entries(perCond).filter(([k]) => !(k.split("/")[1].startsWith("conflict") || k.split("/")[1].startsWith("settled"))).filter(([, v]) => v.found > 0);

const results = { seed: SEED, weighting: WEIGHTING, hubs: graph.hubs, pairs: pairs.length, claims: claims.length, planted: planted.length, clean: clean.length, contests: cs.length, cross, recall, falseRate, settledRight: settledRight.length, settledAll: settledAll.length, nullMean, nullFalseMean: nullFalseSum / SHUFFLES, bars: { B1, B2, B3 }, perCond, dolphins: dolphins.length, gaps: graph.gaps.length };
fs.writeFileSync(path.join(here, `${OUTJ}.json`), JSON.stringify({ ...results, contestsList: cs, pairs: pairs.map((p) => ({ id: p.id, kind: p.kind, cond: p.cond, label: p.label, found: hit.has(p.id), settledBy: (hit.get(p.id) ?? []).map((c) => c.settled?.by ?? null), units: p.units.map((u) => u.text) })) }, null, 1));

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const md = `# Contest: synthetic run (seed ${SEED}, weighting ${WEIGHTING}${WEIGHTING === "none" ? " — DIAGNOSTIC comparison, not a run of the frame" : ""})

PREREG: eval/contest/PREREG.md, sha256 in PREREG.sha (frozen before this runner and this set existed). Generated: ${pairs.length} pairs (${planted.length} planted
contradictions of which ${settledAll.length} with a settling fact, ${clean.length} consistent/unrelated), ${distractors.length} distractors, ${claims.length} units in one graph. ${graph.gaps.length} typed gaps
(${["no_ends", "no_value", "hub_ends"].map((g) => `${g} ${graph.gaps.filter((x) => x.gap === g).length}`).join(", ")}). Hub ends (above the pool's chance floor, Amendment 3): ${graph.hubs.length}${graph.hubs.length ? ` — ${graph.hubs.slice(0, 24).join(", ")}${graph.hubs.length > 24 ? ", …" : ""}` : ""}.

| bar | value | bar | holds |
|---|---|---|---|
| B1 recall of planted contradictions | ${pct(recall)} | >= 90% | ${B1 ? "yes" : "NO"} |
| B2 false contests on clean pairs | ${pct(falseRate)} | <= 5% | ${B2 ? "yes" : "NO"} |
| B3 shuffled-ends null (mean of ${SHUFFLES}) | ${nullMean.toFixed(1)} contests vs ${cs.length} real (${pct(cs.length ? nullMean / cs.length : 0)}) | <= 10% of real | ${B3 ? "yes" : "NO"} |

Descriptive: ${cross} contests across different pairs (claims that share only a head word or a building type; counted here, not in B2 since they are not labelled pairs);
concessions naming the planted settling address: ${settledRight.length} of ${settledAll.length}; shuffled false-contest rate on clean pairs: ${pct(nullFalseSum / SHUFFLES)}.
The dolphins pair from the essay, run alone: ${dolphins.length} contest${dolphins.length === 1 ? "" : "s"}${dolphins[0] ? ` (${dolphins[0].values.join(" vs ")}, ${dolphins[0].settled ? "conceded" : "resting"})` : ""}.

## Per kind and condition (found = the pair raised at least one contest)
| kind/condition | pairs | found |
|---|---|---|
${Object.entries(perCond).sort().map(([k, v]) => `| ${k} | ${v.n} | ${v.found} |`).join("\n")}

## Misses (planted contradictions not raised)
${missesByCond.length ? missesByCond.map(([k, v]) => `- ${k}: ${v.n - v.found} of ${v.n}`).join("\n") : "- none"}

## False contests (clean pairs raised)
${falsesByCond.length ? falsesByCond.map(([k, v]) => `- ${k}: ${v.found} of ${v.n}`).join("\n") : "- none"}

${B1 && B2 && B3 ? "All three bars hold on this synthetic set. The set tests the design the PREREG declared; the held-out real set (labelled by a person) is the test that counts." : "A bar is MISSED. Per the plan's law this is reported, not retuned on this set: a frame change (REC) is proposed in the report, and the next run is a new PREREG amendment."}
`;
fs.writeFileSync(path.join(here, `${OUT}.md`), md);
console.log(md);
