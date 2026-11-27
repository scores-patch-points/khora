// salience-adapt.js — LEARNING ON THE FLY, ONLY WHERE IT BEATS THE SHIPPED SALIENCE PRIOR. The owner (2026-11-24): "try this on other languages and let's have it learn these programs on the fly", then "build it" for per-language,
// per-user adaptation switched on only where the prior fits badly. What eval/chat-register/salience-languages.mjs found: the shipped weights are already about nine tenths of an in-language model (46% against 51% over 15
// CorefUD dev sets), one gradient step per anaphor from the shipped weights helps where they fit worst (French +10 points in the last third) and is neutral or harmful elsewhere, and learning from its own guesses with no gold is
// not safe. DESIGN 1 (kept as a finding, eval/chat-register/salience-adapt-eval.calibration-switch.json): switch on when the shipped prior is right fewer times than its own stated confidences promise (a calibration z-test).
// It FAILED where it mattered: French never switched on, because the prior is calibrated there and merely poor (it says 40% and is right 40%), and it switched on in ten sets where it bought almost nothing. A prior that fits
// badly is not the same as one that is overconfident. DESIGN 2 (this file) is a CHAMPION / CHALLENGER:
//   - ADAPTATION IS KEYED by (language, user) and lives in the pharos log as OBSERVATIONS, never in the shipped weights file. An observation is the features of one resolved anaphor (the anaphor's role, each candidate's roles
//     and mention count, which candidate was right): no text and no name. The state is rebuilt from the observations, in order, so it is append-only and restartable.
//   - A SHADOW copy of the weights learns from every observation (one gradient step each, rate 0.1, declared before the cross-language run), starting from the shipped weights. On each observation BOTH answers are scored
//     before the shadow learns from it (prequential): a = anaphors the shadow got right and the shipped prior got wrong, b = the reverse.
//   - THE SWITCH is a sign test on those disagreements, the conventional one-sided 5%: the shadow answers for the key once (a - b) / sqrt(a + b) is above 1.645 and there are at least 10 disagreements (the usual rule of
//     thumb for the normal approximation). The tally is cumulative, so it does NOT switch off again; the shadow keeps learning and follows the stream if it changes (tested), but a shadow that went on and later became worse
//     than the shipped prior would not be caught: a decayed tally is the open improvement. Until the switch the answers are the shipped prior's, with its held-out calibration.
//   - An adapted answer is NOT calibrated (`calibrated` is null; `adapted` says why); the key's own running record is in `status`.
//   - Feedback is the caller's: the user's answer to the chat's question, a correction, or the silence that confirms a binding. Learning from the system's own unconfirmed guess is NOT offered (it drifted in Turkish and Polish).
// Pure: no file, no clock. The log read and write (kind "anaphor-observation") belong to the caller.
import { makeSaliencePrior, loadSalienceWeights } from "./salience-prior.js";
const RI = { S: 0, O: 1, X: 2, "-": 3 };
export const DEFAULTS = Object.freeze({ lr: 0.1, z: 1.645, minDiscordant: 10 });
const sc = (w, c) => { let s = 0; for (let j = 0; j < 3; j++) s += w[j * 4 + (RI[c.roles?.[j] ?? "-"] ?? 3)]; return s + w[12] * Math.log(1 + (c.mentions ?? 0)); };
const soft = (w, cs) => { const s = cs.map((c) => sc(w, c)), mx = Math.max(...s), ex = s.map((v) => Math.exp(v - mx)), z = ex.reduce((a, b) => a + b, 0); return ex.map((v) => v / z); };
function step(w, cs, goldIndex, lr) { const p = soft(w, cs); cs.forEach((x, i) => { const dlt = (i === goldIndex ? 1 : 0) - p[i]; for (let j = 0; j < 3; j++) w[j * 4 + (RI[x.roles?.[j] ?? "-"] ?? 3)] += lr * dlt; w[12] += lr * dlt * Math.log(1 + (x.mentions ?? 0)); }); }
const cloneW = (W) => ({ S: Float64Array.from(W.S), O: Float64Array.from(W.O), X: Float64Array.from(W.X) });
/** observationOf({ anaphorRole, candidates, goldId, kind }) -> the record to write to the log: features and the index of the right candidate, no text and no ids; null when the right one is not among the candidates */
export function observationOf({ anaphorRole, candidates, goldId, kind = null }) { const i = (candidates ?? []).findIndex((c) => c.id === goldId); if (i < 0 || !(anaphorRole in { S: 1, O: 1, X: 1 })) return null; return { anaphorRole, kind, gold: i, candidates: candidates.map((c) => ({ roles: [0, 1, 2].map((j) => c.roles?.[j] ?? "-"), mentions: c.mentions ?? 0 })) }; }
/**
 * makeAdaptiveSalience({ table, lr, z, minDiscordant, alwaysOn }) -> { observe(key, obs), prior(key), status(key), fromLog(entries), keys() }
 *   observe(key, obs)  take one observation for key ("language|user"): score the shipped prior and the key's shadow on it, tally the disagreements, then let the shadow learn from it
 *   prior(key)         a prior with the shape of makeSaliencePrior ({ rank, decide, missing, table }) plus `adapted` and `why`: the key's shadow weights while the switch is on, else the shipped prior as it is
 *   status(key)        { n, shadowRight, shippedRight, a, b, z, adapted, why }
 *   fromLog(entries)   rebuild the state from pharos entries { kind: "anaphor-observation", body: { key, ...observation } } in log order
 *   alwaysOn           the shadow always answers (for evaluation: the thing the switch is meant to improve on)
 */
export function makeAdaptiveSalience({ table = loadSalienceWeights(), lr = DEFAULTS.lr, z = DEFAULTS.z, minDiscordant = DEFAULTS.minDiscordant, alwaysOn = false } = {}) {
  const frozen = makeSaliencePrior({ table }), state = new Map();
  const get = (k) => { let s = state.get(k); if (!s) state.set(k, s = { n: 0, shadowRight: 0, shippedRight: 0, a: 0, b: 0, W: table ? cloneW(table.weights) : null }); return s; };
  const zOf = (s) => (s.a + s.b > 0 ? (s.a - s.b) / Math.sqrt(s.a + s.b) : 0), isOn = (s) => alwaysOn || (s.a + s.b >= minDiscordant && zOf(s) > z);
  function observe(key, obs) {
    if (!obs || !frozen || frozen.missing) return get(key); const s = get(key), ps = soft(table.weights[obs.anaphorRole], obs.candidates), pw = soft(s.W[obs.anaphorRole], obs.candidates);
    const ts = ps.indexOf(Math.max(...ps)), tw = pw.indexOf(Math.max(...pw)), shipped = ts === obs.gold, shadow = tw === obs.gold;
    s.n++; s.shippedRight += shipped ? 1 : 0; s.shadowRight += shadow ? 1 : 0; if (shadow && !shipped) s.a++; else if (shipped && !shadow) s.b++;
    step(s.W[obs.anaphorRole], obs.candidates, obs.gold, lr);   // the shadow learns AFTER both were scored
    return s;
  }
  function priorFor(key) { const s = state.get(key); if (!s || !isOn(s)) return { ...frozen, adapted: false, why: s ? `the shipped prior stands: the shadow won ${s.a} and lost ${s.b} of ${s.n} observations (z ${zOf(s).toFixed(2)}; needs z above ${z} and ${minDiscordant} disagreements)` : "no observations for this language and user" };
    const own = makeSaliencePrior({ table: { ...table, weights: { S: Array.from(s.W.S), O: Array.from(s.W.O), X: Array.from(s.W.X) } } });
    return { ...own, adapted: true, why: `adapted from ${s.n} observations: the learning won ${s.a} and lost ${s.b} against the shipped prior (z ${zOf(s).toFixed(2)})`, rank: (q) => ({ ...own.rank(q), calibrated: null }) }; }
  function status(key) { const s = state.get(key); if (!s) return { n: 0, shadowRight: 0, shippedRight: 0, a: 0, b: 0, z: 0, adapted: false, why: "no observations" }; const on = isOn(s); return { n: s.n, shadowRight: s.shadowRight, shippedRight: s.shippedRight, a: s.a, b: s.b, z: +zOf(s).toFixed(2), adapted: on, why: on ? "on: the learning beats the shipped prior on this language and user" : s.a + s.b < minDiscordant ? `off: only ${s.a + s.b} disagreements so far (needs ${minDiscordant})` : "off: the learning has not beaten the shipped prior" }; }
  const fromLog = (entries) => { for (const e of entries ?? []) if (e?.kind === "anaphor-observation" && e.body?.key && e.body.candidates) observe(e.body.key, e.body); return api; };
  const api = { observe, prior: priorFor, status, fromLog, keys: () => [...state.keys()] };
  return api;
}
