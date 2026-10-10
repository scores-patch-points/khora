// bench-time.mjs -- TIMING ONLY (reads 6 random eligible tokens of one day; the impact values are discarded). Not a test.
import { loadIrcDay, IRC_ROOT } from "../ablation-scope/lib-data.mjs";
import { impactBatch, rngFor } from "../../impact.mjs";
const name = process.argv[2], M = 256;
const doc = loadIrcDay(`${IRC_ROOT}/${name}.txt`, name), rnd = rngFor(11), n = doc.stream.length, sample = [];
while (sample.length < 6) { const s = M + Math.floor(rnd() * (n - M)); const i = Math.floor(rnd() * doc.stream[s].length); if (doc.stream[s][i].length >= 3) sample.push({ s, i, id: doc.stream[s][i] }); }
const t0 = Date.now(); const r = impactBatch(doc.stream, sample, { M, F: 0, modes: ["delete"], seedTag: "bench", maxSeconds: Infinity });
console.log(JSON.stringify({ name, units: n, tokens: sample.length, secondsPerToken: (Date.now() - t0) / 1000 / sample.length }));
