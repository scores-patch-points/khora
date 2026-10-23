// score-ctx.mjs <out.jsonl> name=file.json[:sources.json]… — as score.mjs, but the premise names its referent: the page title, then the
// previous sentence of the page when the sources file has it, then the sentence (the pairs were written with "It" meaning the page title)
import fs from "node:fs";
import { AutoTokenizer, AutoModelForSequenceClassification, env } from "@huggingface/transformers";
env.allowRemoteModels = false; env.localModelPath = process.env.HOME + "/.cache/live_priors/";
const tok = await AutoTokenizer.from_pretrained("nli"), model = await AutoModelForSequenceClassification.from_pretrained("nli", { dtype: "fp32" });
const [, , out, ...sets] = process.argv; fs.writeFileSync(out, "");
const clean = (s) => s.replace(/\([^()]*[ˈˌːəɪʊæɑɔʃʒθðŋ][^()]*\)/g, "").replace(/\(\s*\)/g, "").replace(/\s+/g, " ").trim();
const titleOf = (p) => { try { return decodeURIComponent(p.source.url.split("/wiki/")[1]).replace(/_/g, " "); } catch { return null; } };
for (const kv of sets) { const [name, rest] = kv.split("="); const [f, sf] = rest.split(":"); const pairs = JSON.parse(fs.readFileSync(f, "utf8")).pairs;
  const pages = sf ? JSON.parse(fs.readFileSync(sf, "utf8")).pages : [];
  for (const p of pairs) {
    const t = p.source?.url ? titleOf(p) : null, page = pages.find((g) => g.url === p.source?.url);
    let prev = null; if (page) { const i = page.text.indexOf(p.sentence.slice(0, 40)); if (i > 0) { const before = page.text.slice(0, i).trim(); const m = before.match(/[^.!?。]*[.!?。]\s*$/); prev = m ? m[0].trim() : null; } }
    const premise = [t ? `${t.replace(/\s*\(.*\)/, "")}.` : null, prev, p.sentence].filter(Boolean).map(clean).join(" ");
    const i = await tok(premise, { text_pair: p.claim, padding: true, truncation: true, max_length: 384 }); const o = await model(i); const l = Array.from(o.logits.data), m = Math.max(...l), e = l.map((x) => Math.exp(x - m)), s = e.reduce((a, b) => a + b);
    fs.appendFileSync(out, JSON.stringify({ set: name, id: p.id, label: p.label, nli: e.map((x) => +(x / s).toFixed(4)), ctx: !!t }) + "\n"); }
  console.log(name, pairs.length); }
