// bench-time2.mjs -- TIMING ONLY (20 positive + 20 unlabelled eligible tokens with c>=4; impact values discarded). Not a test.
import { loadIrcDay, IRC_ROOT } from "../ablation-scope/lib-data.mjs";
import { indexAndCandidates } from "../ablation-scope/lib-pairs.mjs";
import { impactBatch, rngFor } from "../../impact.mjs";
const name = process.argv[2], M = 256, doc = loadIrcDay(`${IRC_ROOT}/${name}.txt`, name), cand = indexAndCandidates(doc, M), rnd = rngFor(5);
const pick = (a, k) => { const b = a.filter((r) => r.c >= 4 && r.i > 0).slice(); for (let q = b.length - 1; q > 0; q--) { const j = Math.floor(rnd() * (q + 1)); [b[q], b[j]] = [b[j], b[q]]; } return b.slice(0, k); };
const toks = [...pick(cand.P, 20), ...pick(cand.N, 20)].map((r) => ({ s: r.s, i: r.i, id: r.w }));
const t0 = Date.now(); const r = impactBatch(doc.stream, toks, { M, F: 0, modes: ["delete"], seedTag: "bench", maxSeconds: Infinity });
console.log(JSON.stringify({ name, tokens: toks.length, secondsPerToken: (Date.now() - t0) / 1000 / toks.length }));
