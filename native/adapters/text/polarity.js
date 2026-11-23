// polarity.js — the evaluative polarity of a word: EVA, the calculus operator, now wired as a giver.
//
// A word's polarity is its SIGNED position along the evaluative axis — sign(z) where z is the
// apoha's score for the "pos" class. The axis is a ground of evaluative anchors (Osgood 1957
// semantic differential, evaluative factor — a MEASURED result, never a hand-waved list), the
// vectors are the frozen codec (nomic-embed-text), and the formula is the apoha (Dignāga's
// contrast axis: a word is scored by which side of the line separates the positive class from the
// rest of the ground, RELATIVE to the ground's own centroid and spread). A word is CLAIMED only
// when |z| clears the null — the 95th percentile of the same score under shuffled labels — and
// otherwise it abstains, because a polarity you cannot falsify is not a polarity.
//
// Why the counts could not do this (the recorded falsification): co-occurrence conflates antonyms
// ("good and bad" sit together), and no arithmetic (no sign) or geometry (no value) can recover a
// direction that is not in the input. The sign lives in the embedding and is read by the apoha.
//
//   const p = makePolarity(); await p.polarity(["gentle","brutal","day","night"]) -> [{word, z, sign, claimed, null}]
import { makeEmbedder } from "./embed-personhood.js";
import { makeGround } from "./apoha.js";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const OSGOOD_POS = Object.freeze(["good", "love", "happy", "dear", "kind", "pleasure", "hope"]);
export const OSGOOD_NEG = Object.freeze(["bad", "hate", "sad", "fear", "cruel", "evil", "danger"]);

export function makePolarity({ pos = OSGOOD_POS, neg = OSGOOD_NEG, seed = 1 } = {}) {
  const embedder = makeEmbedder();
  let ground = null;
  const ensure = async () => {
    if (ground) return ground;
    const anchors = [...pos, ...neg];
    const vecs = await embedder.embed(anchors);
    const members = [
      ...pos.map((w, i) => ({ id: w, vec: Float32Array.from(vecs[i]), cls: "pos" })),
      ...neg.map((w, i) => ({ id: w, vec: Float32Array.from(vecs[pos.length + i]), cls: "neg" })),
    ];
    ground = makeGround({ kind: "evaluative", members, seed });
    return ground;
  };
  return {
    /** signed polarity of each word: z along the pos axis, its sign, and whether it clears the null */
    async polarity(words) {
      const g = await ensure();
      const vecs = await embedder.embed(words);
      return words.map((w, i) => {
        const v = Float32Array.from(vecs[i]);
        const z = g.score(v, "pos");
        const c = g.claim(v);
        return { word: w, z, sign: z > 0 ? "pos" : z < 0 ? "neg" : "neutral", claimed: c.claimed, null: c.null };
      });
    },
    save: () => embedder.save(),
  };
}

// ————— WRITE TO PHAROS ————— the sign becomes a woven fact, not a return value. Khora writes its own
// EVA·Figure entries (addr lemma:<word>, body {z, sign, claimed, null}), so a surface can project a word's
// polarity off the log without calling the giver.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
let P = null;
async function pharosLib() {
  if (P) return P;
  const roots = [process.env.PHAROS_HOME, path.join(ROOT, "..", "pharos")].filter(Boolean);
  for (const r of roots) { try { P = await import(pathToFileURL(path.join(r, "lib", "pharos.mjs")).href); return P; } catch { /* next */ } }
  return null;
}

export async function recordPolarity(words, { pos = OSGOOD_POS, neg = OSGOOD_NEG, pharosDir = null, writer = "khora" } = {}) {
  const lib = await pharosLib();
  if (!lib) return null;
  const res = await makePolarity({ pos, neg }).polarity(words);
  const h = lib.open("khora", { dir: pharosDir, writer });
  if (!lib.entries(h).some((e) => e.kind === "kind" && e.addr === "kind:polarity")) lib.weave(h, { cell: "DEF·Figure", kind: "kind", addr: "kind:polarity", body: { name: "polarity", cell: "EVA·Figure" } });
  for (const r of res) lib.weave(h, { cell: "EVA·Figure", kind: "polarity", addr: `lemma:${r.word}`, body: { z: r.z, sign: r.sign, claimed: r.claimed, null: r.null } });
  return res;
}
