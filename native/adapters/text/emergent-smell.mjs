// organs/emergent-smell.mjs — the PINNED emergent per-token smell: a frozen dictionary (word type -> cluster -> dominant UD tag), built once by experiments/pos-smell/train-pinned.mjs from a treebank's own tokens (PPMI neighbour vectors, spherical k-means), and read here with no recomputation.
// A form is unnameable (null) when it was not clustered (unseen, or count < 5): no evidence is not a vote (GL-CL-01, GL-SM-01..04). The smell is a REVISABLE PRESSURE, never a verdict, and its calibration cards live in the ledger (GL-SM-01..04), not here.
// Pinned per language by sha256 (first 16 hex) so a changed model is refused, never assumed (as organs/pos-sniff.mjs pins its model). This file does no I/O except reading its own pinned models.
import fs from "node:fs"; import crypto from "node:crypto";
export const SCHEMA = "EmergentSmell@1";
export const MODELS = Object.freeze({ eng: "9c22cff32fe90b31", grc: "b6b59b901f3c0150", zh: "1f40dbcab2869459", sa: "660e7f4c47255bbb" });
export const LANGS = Object.freeze(["eng", "grc", "zh", "sa"]);
export class EmergentSmellGap extends Error { constructor(code, why) { super(`${code}: ${why}`); this.code = code; this.why = why; } }
const sha16 = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
export function loadModel(lang = "eng") {
  if (!MODELS[lang]) throw new EmergentSmellGap("no_model_for_language", "the emergent smell was built for " + JSON.stringify(LANGS) + "; " + JSON.stringify(lang) + " has no pinned model");
  const file = new URL(`./emergent-smell/emergent-smell-${lang}.json`, import.meta.url);
  const bytes = fs.readFileSync(file);
  if (sha16(bytes) !== MODELS[lang]) throw new EmergentSmellGap("bad_model_pin", "the model file is not the pinned emergent-smell-" + lang + ".json (sha256 mismatch): re-pin, never assume");
  return JSON.parse(bytes.toString("utf8"));
}
/** smell({ model, form }) -> { cls, margin } | null. cls = the cluster's dominant UD tag; margin = dominant share minus second share; null = the form is not in the frozen vocabulary (unnameable). */
export function smell({ model, form }) {
  if (!model || model.schema !== SCHEMA) throw new EmergentSmellGap("bad_model", "a smell needs its pinned model (schema " + SCHEMA + ")");
  const w = (form ?? "").toLowerCase();
  const c = model.vocab[w];
  if (c === undefined) return null;
  const dist = model.clusterDist?.[c];
  if (!dist) return null;
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  const cls = entries[0][0], top = entries[0][1], second = entries.length > 1 ? entries[1][1] : 0;
  return { cls, margin: +(top - second).toFixed(4) };
}
/** the smell as a known()-refusing vote, for the ledger: a form the smell can name is "known", an unnameable form is the refusal (matches organs/clitic-slice.mjs's need for nameable host / unnameable whole). */
export const nameable = (smellOutcome) => smellOutcome !== null && !!smellOutcome.cls;
