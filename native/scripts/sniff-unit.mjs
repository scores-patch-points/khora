#!/usr/bin/env node
// sniff-unit.mjs — sniff which cube cells a unit (a word or a clause, in any language the embedder reads) acts in, from the wired unit-cells prior.
//
//   (run from the khora-clone folder; from the workspace folder above it, use node khora-clone/native/scripts/sniff-unit.mjs)
//   node native/scripts/sniff-unit.mjs [--head=op|cell] [--top=3] [--model=qwen3-embedding:4b] <text> [<text> ...]
//   printf 'tappaa\nto give\n' | node native/scripts/sniff-unit.mjs --head=cell
//
// A PROPOSER, never a decider (identity/novels/ablation-sniffer/RESULTS-UNIT-SNIFFER.md): the nearest centroids, ranked, with the margin; plain accuracy
// is below always answering INS, so read the list, not only the first row. No parse, no generation; the embedder is a frozen local model on localhost.
import { loadUnitCanon, sniffTexts } from "../adapters/text/unit-sniffer.mjs";

const args = process.argv.slice(2), opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).slice(k.length + 3);
const head = opt("head", "op"), top = Number(opt("top", "3")), model = opt("model", "qwen3-embedding:4b"), OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";
let texts = args.filter((a) => !a.startsWith("--"));
if (!texts.length && !process.stdin.isTTY) { let s = ""; for await (const c of process.stdin) s += c; texts = s.split("\n").map((x) => x.trim()).filter(Boolean); }
if (!texts.length) { console.error("usage: sniff-unit.mjs [--head=op|cell] [--top=3] [--model=...] <text> ..."); process.exit(2); }
const prior = loadUnitCanon(model, head);
if (!prior) { console.error(`typed gap: no unit-cells prior for model ${model}, head ${head}, in the priors home (never another model's centroids)`); process.exit(2); }
const embed = async (ts) => {
  let r; try { r = await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, input: ts, keep_alive: "10m" }) }); } catch (e) { console.error(`the embedder is not reachable at ${OLLAMA}: ${e.message}`); process.exit(3); }
  if (!r.ok) { console.error(`embed ${r.status}: ${(await r.text()).slice(0, 200)}`); process.exit(3); }
  return (await r.json()).embeddings.map((v) => Float32Array.from(v));
};
const names = prior.meta.classNames ?? {}, show = (c) => names[c] ?? c;
const out = await sniffTexts(embed, texts, prior.canon, prior.bounds);
texts.forEach((t, i) => {
  const r = out[i]; if (r.gap) { console.log(`${t}\n  gap: ${r.gap}`); return; }
  console.log(`${t}\n  ${r.ranked.slice(0, top).map((x, k) => `${k + 1}. ${show(x.cls)} ${x.cos.toFixed(3)}${x.claimed ? "*" : ""}`).join("   ")}   margin ${r.margin?.toFixed(3)}   (* clears its own null bound)`);
});
const caveats = prior.meta.caveats ?? [], junk = caveats.find((c) => c.startsWith("Strings that are not words"));
console.error(`\nproposer only: ${caveats[0] ?? "see identity/novels/ablation-sniffer/RESULTS-UNIT-SNIFFER.md"}`);
if (junk) console.error(`non-words: ${junk}`);
