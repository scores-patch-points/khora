// eval/physics-handles/plant.mjs — POWER CHECK OF THE ATTRACTION ESTIMATOR ON PLANTED LAWS (READING-POLICY II.23 / II.4: a control built to fail, and a sham).
//
//   node eval/physics-handles/plant.mjs [--seeds 10] [--out FILE]
//
// ═══ PRE-REGISTRATION (written before the first run of this file; no corpus is read here) ═══════════════════════════════════════════════════════════
// QUESTION. Can the pipeline of gravity.mjs (attraction.mjs: pooledAttraction + summarizeAttraction, the SAME code path) recover a force law that was PLANTED in
// a synthetic text, tell a power law from an exponential, and return nothing when nothing was planted? If it cannot, every exponent gravity.mjs reports on real
// text is "underpowered", not "not falsified".
// GENERATOR (frozen here). 30 documents of 1,500 tokens (sentences of 15). Background: tokens drawn i.i.d. from a Zipf(1.0) distribution over V = 1,500 types
// (ids 0..1499). 120 BEINGS, each a distinct type (ids 1500..1619) that occurs at random positions with a Poisson rate chosen log-uniformly so that its expected
// count per document is between 0.3 and 1.3 (so about 8 to 40 over the corpus); each being owns a COMPANY of 12 types drawn once from background ids 300..1199.
// Planting: for every mention of a being at position o and every lag d in 1..128 on each side, the token at o+-d is REPLACED by a random member of that being's
// company with probability f(d); later plants overwrite earlier ones. Modes: POWER f(d) = 0.5 d^-alpha for alpha in {0.5, 1.0, 1.5}; EXP f(d) = 0.5 exp(-d / 12);
// NULL f(d) = 0. The pooled estimator is run on the 120 beings as bodies.
// PASS RULES (an instrument is VALID iff all hold; thresholds fixed here, typed, "bare provisional numbers" in the repo's SESOI practice):
//   V1 POWER recovery: for each planted alpha, in >= 8 of 10 seeds the fitted exponent is within +-0.15 of alpha (TV curve, the planted TV is linear in f) AND dAIC >= 4
//      in favour of the power law over the exponential.
//   V2 EXP discrimination: in >= 8 of 10 seeds the exponential beats the power law by dAIC <= -4 (power does NOT win).
//   V3 NULL: in >= 9 of 10 seeds the estimator returns the typed gap (fewer than 4 usable bins above the band): it finds no law where there is none.
//   V4 KL exponent: for the planted power laws the fitted KL exponent divided by the TV exponent has median in [1.5, 2.5] (the quadratic relation of a weak mixture).
// ═══ AMENDMENT (written after the FIRST run, before the second; the first run is kept in results/plant.first-run.json; header sha256 of v1 = be0a486101dc788ef839ad05cc328d8b22492c420e721a53360a543a6d5e5626) ═══
// FIRST RUN, read: V1 FAILED for every planted alpha (recovered 0/10, 6/10, 2/10; mean fitted alpha 0.15 / 0.88 / 0.83 against 0.5 / 1.0 / 1.5), V2 passed (10/10), V3 passed
// (10/10), V4 passed. DIAGNOSIS (debug script, planted alpha 0.5 and 1.0, curve against planted f(d)): the first estimator was the plug-in total variation, which saturates
// near 1 when a body has only a few dozen company tokens (most tokens are singletons), so the real and null values are both near 1 and their difference is compressed (measured
// A(1) = 0.015 against planted f(1) = 0.5). The ESTIMATOR was defective, not the pass rules. FIX: attraction.mjs now uses the unbiased excess-coincidence estimator (see its header);
// the force-like amplitude is a = sqrt(D). The pass rules V1, V2, V3 are UNCHANGED (same thresholds). V4 (the KL/TV exponent ratio) cannot be computed any more (KL was dropped
// as biased at small n) and is replaced by V4' below. V4' is new, written after seeing the first run, so it is labelled so wherever it is reported.
//   V4' BIAS: for each planted alpha the mean fitted alpha over the seeds is within +-0.10 of alpha (an unbiased estimator; V1 allows +-0.15 per seed).
// SECOND DIAGNOSIS (after the second run, before the third; the second run, with the amplitude estimator but the bin-selected log fit, gave: alpha 0.5 recovered 10/10 (mean 0.529),
// alpha 1.0 recovered 4/10 (mean 0.866), alpha 1.5 returned the gap in 8 of 10 seeds (2 usable bins), exponential 10/10, null 10/10 gaps): the log-linear fit used only the bins ABOVE
// the null band, which keeps noise-inflated tail values and drops deflated ones, biasing the exponent DOWN for steep laws (a selection bias). FIX: the fit now uses ALL bins by weighted
// least squares in linear space (attraction.mjs fitWeighted); the existence rule (>= 4 bins above the band, else the typed gap) is unchanged. Pass rules V1-V4' UNCHANGED. If alpha = 1.5
// still returns the gap, the instrument is reported as valid only over the planted range it passes (a range limit of the instrument, said in the report), not re-registered.
// THIRD RESULT (scale 1, weighted fit; kept in results/plant.third-run-scale1.json): alpha 0.5 recovered 10/10 (mean 0.524); alpha 1.0 recovered 4/10 within +-0.15 per seed but UNBIASED
// (mean 1.07, V4' passes); alpha 1.5 returns the gap in 8/10 seeds (only 2 bins above the band) and the 2 fits average 1.42; exponential 10/10; null 10/10 gaps. So at the registered
// scale (30 documents, ~2,400 mentions) the estimator is unbiased but its per-seed precision at alpha = 1 is about +-0.2 and it cannot see a law as steep as 1.5: V1 FAILS as registered,
// and the instrument is "valid" only for exponents up to about 1 with +-0.2 at that scale. ADDED (before running it): the same check at --scale 4 (120 documents, ~9,600 mentions, the
// order of the real corpora), same rules V1-V4'. Both scales are reported; a real-corpus exponent is stated with the validity of the scale nearest to its corpus.
// ═══ END OF AMENDMENT ═══
// REPORTED, not gated: the number of usable bins, the bias of the fitted alpha.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import { mulberry32, median, round, argv, headerSha256, sum } from "./lib.mjs";
import { buildIndex, pooledAttraction, summarizeAttraction } from "./attraction.mjs";

const { opt } = argv();
const SCALE = Number(opt("--scale", 1));
const NDOC = 30 * SCALE, LEN = 1500, SENT = 15, V = 1500, NB = 120, NCOMP = 12;

function generate(mode, alpha, seed) {
  const rnd = mulberry32(seed);
  const zipf = new Float64Array(V); let z = 0; for (let r = 1; r <= V; r++) { z += 1 / r; zipf[r - 1] = z; }
  const draw = () => { const u = rnd() * z; let lo = 0, hi = V - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (zipf[m] >= u) hi = m; else lo = m + 1; } return lo; };
  const comp = Array.from({ length: NB }, () => Array.from({ length: NCOMP }, () => 300 + Math.floor(rnd() * 900)));
  const rate = Array.from({ length: NB }, () => 0.3 * Math.exp(rnd() * Math.log(1.3 / 0.3)) / LEN);
  const f = (d) => (mode === "power" ? 0.5 * d ** -alpha : mode === "exp" ? 0.5 * Math.exp(-d / 12) : 0);
  const docs = [];
  for (let di = 0; di < NDOC; di++) {
    const t = Array.from({ length: LEN }, draw);
    const mentions = [];
    for (let b = 0; b < NB; b++) for (let p = 0; p < LEN; p++) if (rnd() < rate[b]) mentions.push([b, p]);
    for (const [b, o] of mentions) for (let d = 1; d <= 128; d++) for (const q of [o - d, o + d]) { if (q < 0 || q >= LEN) continue; if (rnd() < f(d)) t[q] = comp[b][Math.floor(rnd() * NCOMP)]; }
    for (const [b, o] of mentions) t[o] = V + b;
    const sents = []; for (let i = 0; i < LEN; i += SENT) sents.push(t.slice(i, i + SENT).map((x) => `w${x}`));
    docs.push({ sents });
  }
  return docs;
}

function estimate(docs, seed) {
  const ix = buildIndex(docs);
  const bodies = []; for (let b = 0; b < NB; b++) { const id = ix.id.get(`w${V + b}`); if (id !== undefined && ix.count[id] >= 8) bodies.push(id); }
  const pooled = pooledAttraction(ix, bodies, { seed });
  return { bodies: bodies.length, s: summarizeAttraction(pooled, { B: 100, seed }) };
}

const SEEDS = Number(opt("--seeds", 10));
const out = { header: headerSha256(new URL(import.meta.url).pathname), modes: {} };
const cases = [["power", 0.5], ["power", 1.0], ["power", 1.5], ["exp", 0], ["null", 0]];
for (const [mode, alpha] of cases) {
  const key = mode === "power" ? `power${alpha}` : mode, rows = [];
  for (let sd = 1; sd <= SEEDS; sd++) {
    const t0 = Date.now(), r = estimate(generate(mode, alpha, 1000 * sd + (mode === "power" ? alpha * 10 : mode === "exp" ? 7 : 3)), sd);
    const f = r.s.fit ?? {};
    rows.push({ seed: sd, bodies: r.bodies, usable: f.usable ?? 0, gap: f.gap ?? null, alpha: f.alpha ?? null, dAIC: f.dAIC ?? null, aboveBand: r.s.binsAboveBand, sec: round((Date.now() - t0) / 1000, 1) });
    console.error(key, sd, JSON.stringify(rows[rows.length - 1]));
  }
  out.modes[key] = rows;
}
const ok = (rows, f) => rows.filter(f).length;
const v = {};
for (const a of [0.5, 1.0, 1.5]) { const rows = out.modes[`power${a}`]; v[`V1_power${a}`] = { recovered: ok(rows, (r) => r.alpha !== null && Math.abs(r.alpha - a) <= 0.15 && r.dAIC >= 4), of: rows.length, meanAlpha: round(sum(rows.map((r) => r.alpha ?? 0)) / rows.length), pass: ok(rows, (r) => r.alpha !== null && Math.abs(r.alpha - a) <= 0.15 && r.dAIC >= 4) >= 0.8 * rows.length }; }
{ const rows = out.modes.exp; v.V2_exp = { expWins: ok(rows, (r) => r.dAIC !== null && r.dAIC <= -4), of: rows.length, pass: ok(rows, (r) => r.dAIC !== null && r.dAIC <= -4) >= 0.8 * rows.length }; }
{ const rows = out.modes.null; v.V3_null = { gaps: ok(rows, (r) => r.gap !== null || r.usable < 4), of: rows.length, pass: ok(rows, (r) => r.gap !== null || r.usable < 4) >= 0.9 * rows.length }; }
for (const a of [0.5, 1.0, 1.5]) { const al = out.modes[`power${a}`].filter((r) => r.alpha !== null).map((r) => r.alpha); v[`V4p_bias${a}`] = { meanAlpha: round(al.length ? sum(al) / al.length : null), n: al.length, pass: al.length >= 5 && Math.abs(sum(al) / al.length - a) <= 0.10 }; }
out.verdict = v; out.valid = Object.values(v).every((x) => x.pass);
const file = opt("--out", new URL(`./results/plant.scale${SCALE}.json`, import.meta.url).pathname);
fs.mkdirSync(new URL(".", `file://${file}`).pathname, { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ valid: out.valid, verdict: v }, null, 1));
