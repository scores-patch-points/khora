// eval/physics-handles/clock-energy.mjs — IS PRESENCE DECAY A CLOCK? IS ANYTHING CONSERVED? (kernel/activation.js)
//
//   node eval/physics-handles/clock-energy.mjs [--out FILE]
//
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══════════════════════════════════════════════════════════════════════════════════
// DISCLOSURE. Seen before this header: from reader-handles wave 1, the distribution of the window that kernel dmdWindow measured for the sentence-level CAST conclusion (listening-cast
// deriveCast: the forms with >= 2 arrivals) in 150 windows of 129 sentences (257 for IRC) per corpus: in every corpus every window that was found equalled the TOP candidate (128 or 256)
// and 58-85% of the windows returned the typed gap reach_exceeds_candidates. That observation motivates E2 below; it was read before this header was written.
// E1 ACCOUNTING (deterministic, synthetic). createActivation({window: W}) fed random observations of random keys. (a) the sum over keys of activationOf equals snapshot().total to 1e-9 (an
//    accounting identity); (b) with a constant input of s tokens per tick the total converges to s * W (steady state of a leaky integrator with gamma = 1 - 1/W) within 2% after 12 W ticks;
//    (c) after the input stops, every key decays by the SAME factor gamma per tick (the ratio of activationOf after t ticks to the value at stopping, over keys, has spread < 1e-9):
//    the decay is a property of the reader's clock, not of the body. Prediction PE1: all three hold (they are consequences of the code, so this is a test of the claim that
//    "activation is a leaky integrator with one rate for every body", not of language). Consequence stated in advance: there is NO mechanism in kernel/activation.js by which a heavy
//    body ages more slowly; "time dilation" has no referent in the code.
// E2 IS THE MEASURED WINDOW A DURATION? On the first 1,024 sentences/messages of ud eng/spa/deu/fas/jpn (fold A), irc, wp, sms: observations = g consecutive sentences merged (g = 1, 2, 4),
//    conclusion = the cast of the listening cast, candidates = dyadic below the number of observations; dmdWindow (the real function). A window found at the TOP candidate or the typed
//    gap is a CEILING, not a measured reach. Rule: the window is a DURATION (a property of the material) only if the found windows, converted to sentences (W_g * g), agree across g within a
//    factor 1.5 and are below the top candidate in >= 50% of the (corpus, g) cells. Prediction PE2: the found windows are the top candidate or the gap in >= 90% of the cells, so the
//    cast-based dmdWindow clock is a ceiling and the activation's gamma is, for this conclusion, a declaration, not a measurement.
// E3 CONSERVATION (the reader, from reader-handles wave 1 / its report): the slot count is not conserved by a deletion (emptied >> born); reported there. Total shadow is additive (ditto).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createActivation, dmdWindow } from "../../kernel/activation.js";
import { HERE, loadUD, loadIRC, loadWP, loadLines, SMS_ROOT, mulberry32, round, mean, argv, headerSha256, readerVisible } from "./lib.mjs";

const { opt } = argv();
const out = { header: headerSha256(new URL(import.meta.url).pathname) };

// E1
{ const res = {}, rnd = mulberry32(7);
  for (const W of [8, 32, 128]) {
    const act = createActivation({ window: W }), keys = Array.from({ length: 200 }, (_, i) => `k${i}`), s = 12;
    for (let t = 0; t < 12 * W; t++) act.observe(Array.from({ length: s }, () => keys[Math.floor(rnd() * keys.length)]));
    const snap = act.snapshot(); let sumA = 0; for (const k of keys) sumA += act.activationOf(k);
    const identity = Math.abs(sumA - snap.total) < 1e-9 * Math.max(1, snap.total), steady = Math.abs(snap.total / (s * W) - 1) <= 0.02;
    const before = keys.map((k) => act.activationOf(k)); const t0 = act.now; for (let t = 0; t < 5; t++) act.observe([]);
    const ratios = keys.map((k, i) => (before[i] > 0 ? act.activationOf(k) / before[i] : null)).filter((x) => x !== null); const g = act.gamma ** (act.now - t0);
    res[`W${W}`] = { identity, steadyStateTotalOverSW: round(snap.total / (s * W), 4), steady, decayRatioSpread: Math.max(...ratios) - Math.min(...ratios), decayRatioMean: round(mean(ratios), 6), gammaPow: round(g, 6), sameForAllKeys: Math.max(...ratios) - Math.min(...ratios) < 1e-9 };
  }
  out.E1 = res; out.E1.pass = Object.values(res).every((r) => r.identity && r.steady && r.sameForAllKeys);
}
// E2
const dyadic = (n) => { const o = []; for (let d = 2; d < n; d *= 2) o.push(d); return o; };
const deriveCast = (obs) => { const c = new Map(); for (const keys of obs) for (const k of new Set(keys)) c.set(k, (c.get(k) ?? 0) + 1); return [...c].filter(([, n]) => n >= 2).map(([k]) => k).sort(); };
const corpora = [];
for (const s of ["eng", "spa", "deu", "fas", "jpn"]) { const c = loadUD(s, "A", { merge: true }); if (c) corpora.push(c); }
corpora.push(loadIRC(6, "irc-g"), await loadWP(), loadLines(SMS_ROOT, "sms-en"));
out.E2 = { cells: [] };
for (const c of corpora) {
  const sents = c.docs[0].sents.slice(c.kind === "ud" || c.kind === "novel" ? 0 : 0, 1024).map((s) => s.filter(readerVisible));
  for (const g of [1, 2, 4]) {
    const obs = []; for (let i = 0; i + g <= sents.length; i += g) obs.push(sents.slice(i, i + g).flat());
    const m = dmdWindow(obs, deriveCast, { candidates: dyadic(obs.length) }), top = dyadic(obs.length).pop();
    out.E2.cells.push({ corpus: c.name, g, observations: obs.length, window: m.window, gap: m.gap ?? null, topCandidate: top, ceiling: m.window === null || m.window === top, windowInSentences: m.window === null ? null : m.window * g });
  }
}
{ const cells = out.E2.cells; out.E2.ceilingShare = round(cells.filter((c) => c.ceiling).length / cells.length); out.E2.belowTopShare = round(cells.filter((c) => !c.ceiling).length / cells.length); out.E2.isDuration = out.E2.belowTopShare >= 0.5; out.E2.PE2 = out.E2.ceilingShare >= 0.9; }
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
fs.writeFileSync(opt("--out", path.join(HERE, "results", "clock-energy.json")), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ E1: out.E1, E2: { ceilingShare: out.E2.ceilingShare, belowTopShare: out.E2.belowTopShare, isDuration: out.E2.isDuration, PE2: out.E2.PE2, cells: out.E2.cells.length } }, null, 1));
