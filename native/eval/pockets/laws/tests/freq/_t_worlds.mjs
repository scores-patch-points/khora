// laws/tests/freq/_t_worlds.mjs — inline synthetic worlds for the freq test (the planted pockets cover bursts, length laws, frames; these add what they lack).
// iid: law-free replicate worlds (calibration).  topical: documents with a topic vocabulary (contiguity).  rhythm: AR(1) unit lengths with document-specific means.
import { rngOf, seedOf } from "../../../lib/pocket.mjs";
import { lexicon, zipfW, cdfOf, drawCdf, makeLen, gauss } from "../../../loaders/_planted-core.mjs";

const LEX = lexicon("A"), ZC = cdfOf(zipfW(5000, 1.0)), D1 = makeLen("D1"), DOCTOK = 1000;
const mk = (id, ndocs, docMaker) => {
  const units = [], docOf = [];
  for (let d = 0; d < ndocs; d++) { const rnd = rngOf(seedOf("freq-test-world", id, d)), make = docMaker(rnd, d); let t = 0; while (t < DOCTOK) { const u = make(); units.push(u.map((i) => LEX[i])); docOf.push(d); t += u.length; } }
  return { id, which: "discover", units, docOf };
};
export const iidWorld = (id, ndocs) => mk(id, ndocs, (rnd) => () => Array.from({ length: D1(rnd) }, () => drawCdf(ZC, rnd())));
const TV = 300, TC = cdfOf(zipfW(TV, 1.0));
/** each document picks one of 10 topics; with prob 0.5 a token comes from that topic's 300-type Zipf vocabulary (types 200 + 300*topic ...), else from the global Zipf */
export const topicalWorld = (id, ndocs) => mk(id, ndocs, (rnd) => { const topic = Math.floor(rnd() * 10); return () => Array.from({ length: D1(rnd) }, () => (rnd() < 0.5 ? 200 + 300 * topic + drawCdf(TC, rnd()) : drawCdf(ZC, rnd()))); });
/** unit ln-length AR(1) (phi 0.4, innovation sd 0.5) around a document mean ln(9) + 0.35 N(0,1); tokens iid Zipf */
export const rhythmWorld = (id, ndocs) => mk(id, ndocs, (rnd) => {
  const mu = Math.log(9) + 0.35 * gauss(rnd); let x = mu;
  return () => { x = mu + 0.4 * (x - mu) + Math.sqrt(1 - 0.16) * 0.5 * gauss(rnd); const L = Math.max(1, Math.min(60, Math.round(Math.exp(x)))); return Array.from({ length: L }, () => drawCdf(ZC, rnd())); };
});
