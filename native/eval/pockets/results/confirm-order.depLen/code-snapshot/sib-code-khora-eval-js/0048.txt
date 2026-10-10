// bench.mjs — TIMING ONLY (not a test; output is seconds per token impact; no impact value is read or kept).
import { loadWp, loadIrcDay, ircPool } from "./lib-data.mjs";
import { impactBatch, rngFor } from "../../impact.mjs";
const which = process.argv[2];
let doc, M;
if (which === "wp") { doc = loadWp(); M = 128; } else { const p = ircPool()[0]; doc = loadIrcDay(p.path, p.name); M = 256; }
const rnd = rngFor(7), n = doc.stream.length, sample = [];
while (sample.length < 6) { const s = M + Math.floor(rnd() * (n - M)); const i = Math.floor(rnd() * doc.stream[s].length); if (doc.stream[s][i].length >= 3) sample.push({ s, i, id: doc.stream[s][i] }); }
const t0 = Date.now();
const r = impactBatch(doc.stream, sample, { M, F: 0, modes: ["delete"], seedTag: "bench", maxSeconds: Infinity });
console.log(JSON.stringify({ which, M, sentences: n, tokens: sample.length, secondsPerToken: (Date.now() - t0) / 1000 / sample.length, cost: r.cost }));
