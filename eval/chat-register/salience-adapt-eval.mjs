// EXPLORATORY (the switch, rate 0.1, the window and the feedback regimes were fixed before the run; CorefUD 1.3 DEV; the same cases as salience-languages.mjs). THE OWNER, 2026-11-24: build per-language, per-user adaptation
// switched on only where the prior fits badly. This runs the built module (native/adapters/text/salience-adapt.js) over each dev set as one user's stream, prequentially (each anaphor is answered before it is learned from):
//   FROZEN       the shipped weights, no learning (the reference)
//   ALWAYS       one gradient step from the shipped weights on every observation, switch off (the earlier "oracle" run: the thing the switch is meant to improve on)
//   SWITCHED     the built module: the shipped prior stands until it has been right fewer times than its own stated confidences promise (z below -1.645, variance at least 5), then it learns from every stored observation
// Feedback regimes: NOTICED 100% (the user answers every question and corrects every wrong binding) and NOTICED 50% (every other wrong binding goes unnoticed, so it is recorded as confirmed: a silent false confirmation).
// Reported: the mean over the 15 datasets the shipped weights were not trained on, the prequential accuracy overall and over the last third, which datasets switched and when, and the worst loss against FROZEN.
//   node eval/chat-register/salience-adapt-eval.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const DATA = process.env.COREFUD_DIR ?? "/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data";
const { parse, cases } = await import("./corefud-cases.mjs"), { makeAdaptiveSalience, observationOf, DEFAULTS } = await import("file://" + ROOT + "/native/adapters/text/salience-adapt.js"), { makeSaliencePrior, loadSalienceWeights } = await import("file://" + ROOT + "/native/adapters/text/salience-prior.js");
const TABLE = loadSalienceWeights(); if (!TABLE) { console.log("no shipped salience weights"); process.exit(1); }
const SPLIT = process.env.SPLIT === "train" ? "train" : "dev", LABEL = SPLIT === "train" ? "FRESH (the TRAIN files of the datasets the shipped weights never saw; the design of the switch was changed after the first run on DEV, so DEV is REUSED)" : "REUSED (DEV: the switch was redesigned after its first design failed on these same sets; the first design's result is kept)";
const TRAINED_ON = new Set(["CorefUD_English-LitBank", "CorefUD_Spanish-AnCora", "CorefUD_Catalan-AnCora"]);
const FROZEN = makeSaliencePrior({ table: TABLE });
const dirs = fs.readdirSync(DATA).filter((d) => d.startsWith("CorefUD_") && fs.statSync(path.join(DATA, d)).isDirectory()).sort();
function run(cs, mode, noticed, explicitOnly = false) {
  const ad = makeAdaptiveSalience({ table: TABLE }), key = "lang|user", hits = []; let onAt = null;
  const alwaysAd = mode === "always" ? makeAdaptiveSalience({ table: TABLE, alwaysOn: true }) : null;   // always-on: the shadow answers from the first observation
  cs.forEach((c, i) => {
    const pri = mode === "frozen" ? FROZEN : mode === "always" ? alwaysAd.prior(key) : ad.prior(key), r = pri.rank({ anaphorRole: c.anaphorRole, candidates: c.candidates, kind: c.zero ? "zero" : "person" }), hit = r.top === c.gold ? 1 : 0; hits.push(hit);
    if (mode === "frozen") return;
    // feedback: a right answer is confirmed; a wrong one is corrected if noticed, else recorded as confirmed (the false confirmation)
    const asked = r.confidence <= 0.5; if (explicitOnly && !asked && (hit || !(noticed >= 1 || i % 2 === 0))) return;   // explicit feedback only: the user answers a question (the chat asked) or corrects a wrong binding; silence records nothing
    const noticedNow = hit || asked ? true : noticed >= 1 ? true : (i % 2 === 0), goldId   /* a question the chat asked is always answered */ = hit || !noticedNow ? r.top : c.gold, obs = observationOf({ anaphorRole: c.anaphorRole, candidates: c.candidates, goldId, kind: c.zero ? "zero" : "person" });
    if (mode === "always") { alwaysAd.observe(key, obs); } else { ad.observe(key, obs); if (onAt === null && ad.status(key).adapted) onAt = i + 1; }
  });
  const third = Math.floor(hits.length / 3), r = (a, b) => hits.slice(a, b).reduce((x, y) => x + y, 0) / Math.max(1, b - a);
  return { overall: +r(0, hits.length).toFixed(3), last: +r(2 * third, hits.length).toFixed(3), onAt };
}
const rows = [];
for (const d of dirs) {
  const files = fs.readdirSync(path.join(DATA, d)), dev = files.find((f) => f.endsWith(`-corefud-${SPLIT}.conllu`)); if (!dev) continue; if (SPLIT === "train" && TRAINED_ON.has(d)) continue; const cs = cases(parse(path.join(DATA, d, dev), SPLIT === "train" ? 12000 : Infinity)); if (cs.length < 60) continue;
  const row = { dataset: d.replace("CorefUD_", ""), trainedOn: TRAINED_ON.has(d), cases: cs.length, frozen: run(cs, "frozen"), always: run(cs, "always", 1), switched: run(cs, "switched", 1), switchedHalf: run(cs, "switched", 0.5), explicit: run(cs, "switched", 1, true), explicitHalf: run(cs, "switched", 0.5, true) }; rows.push(row);
  console.log(`${row.dataset.padEnd(26)} n=${String(cs.length).padStart(5)} | overall: frozen ${(100 * row.frozen.overall).toFixed(0)} always ${(100 * row.always.overall).toFixed(0)} switched ${(100 * row.switched.overall).toFixed(0)} (on at ${row.switched.onAt ?? "never"}) switched-50% ${(100 * row.switchedHalf.overall).toFixed(0)} (on at ${row.switchedHalf.onAt ?? "never"}) explicit ${(100 * row.explicit.overall).toFixed(0)} (on at ${row.explicit.onAt ?? "never"}) explicit-50% ${(100 * row.explicitHalf.overall).toFixed(0)} | last third: frozen ${(100 * row.frozen.last).toFixed(0)} always ${(100 * row.always.last).toFixed(0)} switched ${(100 * row.switched.last).toFixed(0)} switched-50% ${(100 * row.switchedHalf.last).toFixed(0)} explicit ${(100 * row.explicit.last).toFixed(0)} explicit-50% ${(100 * row.explicitHalf.last).toFixed(0)}${row.trainedOn ? " (trained on)" : ""}`);
}
const held = rows.filter((r) => !r.trainedOn), mean = (f) => (100 * held.reduce((a, r) => a + f(r), 0) / held.length).toFixed(1);
const summary = { datasets: held.length, overall: { frozen: +mean((r) => r.frozen.overall), always: +mean((r) => r.always.overall), switched: +mean((r) => r.switched.overall), switchedHalf: +mean((r) => r.switchedHalf.overall), explicit: +mean((r) => r.explicit.overall), explicitHalf: +mean((r) => r.explicitHalf.overall) }, lastThird: { frozen: +mean((r) => r.frozen.last), always: +mean((r) => r.always.last), switched: +mean((r) => r.switched.last), switchedHalf: +mean((r) => r.switchedHalf.last), explicit: +mean((r) => r.explicit.last), explicitHalf: +mean((r) => r.explicitHalf.last) },
  switchedOn: held.filter((r) => r.switched.onAt !== null).map((r) => `${r.dataset} (at ${r.switched.onAt})`), neverSwitched: held.filter((r) => r.switched.onAt === null).map((r) => r.dataset), worstLossVsFrozen: held.map((r) => ({ d: r.dataset, loss: +(100 * (r.switched.overall - r.frozen.overall)).toFixed(1) })).sort((a, b) => a.loss - b.loss).slice(0, 3), alwaysWorstLoss: held.map((r) => ({ d: r.dataset, loss: +(100 * (r.always.overall - r.frozen.overall)).toFixed(1) })).sort((a, b) => a.loss - b.loss).slice(0, 3) };
console.log(`\nMEAN over the ${held.length} datasets not trained on: overall ${JSON.stringify(summary.overall)}; last third ${JSON.stringify(summary.lastThird)}\nswitched on: ${summary.switchedOn.join(", ")}\nnever switched: ${summary.neverSwitched.join(", ")}\nworst loss against frozen: switched ${JSON.stringify(summary.worstLossVsFrozen)}; always-learn ${JSON.stringify(summary.alwaysWorstLoss)}`);
fs.writeFileSync(path.join(HERE, SPLIT === "train" ? "salience-adapt-eval.fresh.json" : "salience-adapt-eval.json"), JSON.stringify({ stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: `EXPLORATORY, ${LABEL}`, defaults: DEFAULTS, commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })() }, summary, rows }, null, 1) + "\n");
