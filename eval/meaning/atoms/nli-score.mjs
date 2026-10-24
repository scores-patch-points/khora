// score.mjs <out.jsonl> name=file.json… — NLI (entail, neutral, contradict) for every pair: the sentence as premise, the claim as hypothesis
import fs from "node:fs";
import { AutoTokenizer, AutoModelForSequenceClassification, env } from "@huggingface/transformers";
env.allowRemoteModels = false; env.localModelPath = process.env.HOME + "/.cache/live_priors/";
const tok = await AutoTokenizer.from_pretrained("nli"), model = await AutoModelForSequenceClassification.from_pretrained("nli", { dtype: "fp32" });
const [, , out, ...sets] = process.argv; fs.writeFileSync(out, "");
const clean = (s) => s.replace(/\([^()]*[ˈˌːəɪʊæɑɔʃʒθðŋ][^()]*\)/g, "").replace(/\(\s*\)/g, "").replace(/\s+/g, " ");
for (const kv of sets) { const [name, f] = kv.split("="); const pairs = JSON.parse(fs.readFileSync(f, "utf8")).pairs;
  for (const p of pairs) { const i = await tok(clean(p.sentence), { text_pair: p.claim, padding: true, truncation: true, max_length: 256 }); const o = await model(i); const l = Array.from(o.logits.data), m = Math.max(...l), e = l.map((x) => Math.exp(x - m)), s = e.reduce((a, b) => a + b);
    fs.appendFileSync(out, JSON.stringify({ set: name, id: p.id, label: p.label, nli: e.map((x) => +(x / s).toFixed(4)) }) + "\n"); }
  console.log(name, pairs.length); }
