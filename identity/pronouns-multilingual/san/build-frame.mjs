// build-frame.mjs — FramePrior@1 for Sanskrit from UD_Sanskrit-Vedic train (CC BY-SA 4.0). native/scripts/build-frame-prior.mjs imports ./lib/frame-build.mjs, which is not in the repo, so this follows that
// script's own documented algorithm: for each form seen exactly once (a hapax), tally its gold UPOS under the classes of its two neighbours (a neighbour's class is its form's majority UPOS, or UNK when the form is a hapax or has no majority, PUNCT for punctuation, ^ and $ at the edges), with backoffs P|*, *|N, *|*; frames below 5 observations are dropped (the file's min_frame).
// Usage: node build-frame.mjs <train.conllu> <out.json>
import fs from "node:fs"; import { readConllu, iast } from "./conllu.mjs";
const [IN, OUT] = process.argv.slice(2); const sents = readConllu(IN);
const forms = new Map(); for (const s of sents) for (const t of s.toks) { if (t.upos === "PUNCT") continue; const f = iast(t.form), m = forms.get(f) ?? {}; m[t.upos] = (m[t.upos] ?? 0) + 1; forms.set(f, m); }
const tot = (m) => Object.values(m).reduce((a, b) => a + b, 0);
const cls = (t) => { if (!t) return null; if (t.upos === "PUNCT") return "PUNCT"; const m = forms.get(iast(t.form)); if (!m || tot(m) < 2) return "UNK"; const [u, n] = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return n / tot(m) >= 0.5 ? u : "UNK"; };
const frames = {}, marginal = {}; let hapax = 0; const add = (k, u) => { (frames[k] ??= {})[u] = (frames[k][u] ?? 0) + 1; };
for (const s of sents) s.toks.forEach((t, i) => {
  if (t.upos === "PUNCT" || tot(forms.get(iast(t.form)) ?? {}) !== 1) return; hapax++;
  const p = i === 0 ? "^" : cls(s.toks[i - 1]), n = i === s.toks.length - 1 ? "$" : cls(s.toks[i + 1]);
  marginal[t.upos] = (marginal[t.upos] ?? 0) + 1; for (const k of [`${p}|${n}`, `${p}|*`, `*|${n}`, "*|*"]) add(k, t.upos);
});
const MIN_FRAME = 5, kept = {}; let dropped = 0; for (const [k, v] of Object.entries(frames)) if (k === "*|*" || tot(v) >= MIN_FRAME) kept[k] = v; else dropped++;
fs.writeFileSync(OUT, JSON.stringify({ schema: "FramePrior@1", language: "san", provenance: { giver: "Universal Dependencies treebank (train split), human-annotated gold — https://github.com/UniversalDependencies/UD_Sanskrit-Vedic (CC BY-SA 4.0)", builder: "identity/pronouns-multilingual/san/build-frame.mjs (the algorithm of khora native/scripts/build-frame-prior.mjs; its lib/frame-build.mjs is absent from the repo)", basis: "UPOS distribution of treebank hapax forms conditioned on the majority class of the previous and next token", min_frame: MIN_FRAME, frames_dropped_below_floor: dropped, sentences: sents.length, hapax }, marginal, frames: kept }));
console.log("sentences", sents.length, "hapax", hapax, "frames kept", Object.keys(kept).length, "dropped", dropped, "marginal", JSON.stringify(marginal));
