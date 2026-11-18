#!/usr/bin/env node
// scripts/build-embed-personhood.mjs <GUM conllu> [--exclude ids.txt] [--out file] [--cache file] — centroids (person / not-person) of the three views of every non-pronoun GUM TRAIN gold mention (identity/novels PREREG-ROUND15.md + NOTE-1).
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
import { makeEmbedder, strFrame, roleFrame, markFrame, normalise, MODEL, PREFIX } from "../native/adapters/text/embed-personhood.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const args = process.argv.slice(2); const file = args[0]; const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const exclude = new Set(opt("--exclude") ? fs.readFileSync(opt("--exclude"), "utf8").split(/\s+/).filter(Boolean) : []);
const out = opt("--out") ?? path.join(HERE, "..", "native", "adapters", "text", "embed-personhood", "eng.json"); const emb = makeEmbedder(opt("--cache") ?? "/tmp/gum-data/embed-cache.json");
const text = fs.readFileSync(file, "utf8"); const sha = crypto.createHash("sha256").update(text).digest("hex");
const items = new Map(); // arm|frame|type -> [arm, frame, isPerson]
let doc = null, skip = false, sent = null, docs = 0, mentions = 0;
const flush = () => { if (!sent || skip || !sent.toks.length) { sent = null; return; }
  const toks = sent.toks; let p = 0; for (const t of toks) { const i = sent.text.indexOf(t.form, p); if (i >= 0) { t.s = i; t.e = i + t.form.length; p = t.e; } else { t.s = p; t.e = p; } }
  const open = [], ms = []; const re = /\((\d+)-([^()]*?)(\))?(?=\(|$|\d)|(\d+)\)/g;
  toks.forEach((t, i) => { let m; re.lastIndex = 0; while ((m = re.exec(t.ent))) { if (m[1] !== undefined) { const typ = m[2].split("-")[0]; if (m[3]) ms.push({ a: i, b: i, typ }); else open.push({ a: i, typ, id: m[1] }); } else { for (let k = open.length - 1; k >= 0; k--) if (open[k].id === m[4]) { ms.push({ a: open[k].a, b: i, typ: open[k].typ }); open.splice(k, 1); break; } } } });
  for (const m of ms) { const span = toks.slice(m.a, m.b + 1); const ids = new Set(span.map((t) => t.id)); const head = span.find((t) => !ids.has(t.head)) ?? span.at(-1); if (head.upos === "PRON") continue; mentions++;
    const a = span[0].s, b = span.at(-1).e; const str = sent.text.slice(a, b); const hv = toks.find((t) => t.id === head.head); const role = /^(nsubj|csubj)/.test(head.dep) ? "subj" : /^(obj|iobj)/.test(head.dep) ? "obj" : null; const lemma = hv && hv.upos === "VERB" ? hv.lemma.toLowerCase() : null; const person = m.typ === "person";
    for (const [arm, fr] of [["ES", strFrame(str)], ["ER", roleFrame(role, lemma, str)], ["EC", markFrame(sent.text, a, b)]]) items.set(arm + "|" + fr + "|" + person, [arm, fr, person]); }
  sent = null; };
for (const line of text.split("\n")) {
  if (line.startsWith("# newdoc id")) { flush(); doc = line.split("=")[1].trim(); skip = exclude.has(doc); docs++; continue; }
  if (line.startsWith("# text = ")) { sent ??= { toks: [], text: "" }; sent.text = line.slice(9); continue; }
  if (line.startsWith("#")) continue; if (!line.trim()) { flush(); continue; }
  const f = line.split("\t"); if (!/^\d+$/.test(f[0])) continue; sent ??= { toks: [], text: "" }; const e = /Entity=([^|]*)/.exec(f[9] ?? ""); sent.toks.push({ id: +f[0], form: f[1], lemma: f[2], upos: f[3], head: +f[6], dep: f[7], ent: e ? e[1] : "" });
}
flush();
let rs = opt("--permute") ? +opt("--permute") >>> 0 : null; const rnd = () => ((rs = (rs * 1664525 + 1013904223) >>> 0) / 2 ** 32); const cent = {}; const arms = ["ES", "ER", "EC"]; console.log(`docs ${docs} (excluded ${exclude.size}), non-pronoun mentions ${mentions}, distinct (arm,frame,type) ${items.size}`);
for (const arm of arms) { const L = [...items.values()].filter((x) => x[0] === arm); const vecs = []; const B = 512; for (let i = 0; i < L.length; i += B) { const v = await emb.embed(L.slice(i, i + B).map((x) => x[1])); vecs.push(...v); if ((i / B) % 10 === 0) { emb.save(); console.log(arm, i, "/", L.length); } }
  let labels = L.map((x) => x[2]); if (rs !== null) for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; } /* --permute: the labels are shuffled across frames (falsifier K) */ const dim = vecs[0].length; const sum = { p: new Float64Array(dim), n: new Float64Array(dim) }; let np = 0, nn = 0; L.forEach((x, i) => { const s = labels[i] ? sum.p : sum.n; labels[i] ? np++ : nn++; for (let k = 0; k < dim; k++) s[k] += vecs[i][k]; });
  cent[arm] = { person: [...normalise(sum.p)], not: [...normalise(sum.n)], nPerson: np, nNot: nn }; }
emb.save(); fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ schema: "EmbedPersonhood@1", language: "eng", model: MODEL, prefix: PREFIX, provenance: { source: "UD_English-GUM train (gold entity types)", license: "CC BY-SA 4.0", sha256: sha, documents: docs, excludedDocuments: exclude.size, mentions }, centroids: cent }) + "\n"); console.log("wrote", out);
