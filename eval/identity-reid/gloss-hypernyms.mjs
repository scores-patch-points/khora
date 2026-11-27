// EXPLORATORY: OUR OWN VERB HYPERNYMS, from the glosses, through the reader (the giver, wiktionary, records almost none for verbs).
//   1. glosses   the dictionary's (kaikki) senses of each verb: the ones that read as an infinitive ("To utter words.")
//   2. genus     each gloss is READ with khora's reader; its root verb (and the verbs it coordinates with) is the genus, the roles filled under the
//                root are the differentia ("to utter" + words). The genus's own gloss gives the next step up, three steps in all.
//   3. classes   (a) a genus shared by 3 to 40 verbs is a class; the most specific such ancestor is the verb's class
//                (b) where glosses use different words for similar things, the frozen embedder (nomic-embed-text, a codec, no generation) groups them:
//                    mutual 3-nearest-neighbours whose cosine exceeds the all-pairs mean + 2.5 sd (the references's own spread), connected components of 3 to 40
// Writes classes.json (verb -> class id) and labels. usage: node gloss-hypernyms.mjs <parse.json> <out classes.json>
import fs from "node:fs";
import readline from "node:readline";
const K = new URL("../../native/", import.meta.url).href, KAI = process.env.KAIKKI_EN || "/tmp/given-pharos/kaikki-en.jsonl";
const { rowsOfFor } = await import(K + "reading.js");
const { makeEmbedder, normalise, cosine } = await import(K + "adapters/text/embed-personhood.js");
const parse = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), OUT = process.argv[3] ?? "classes.json";
const vc = new Map(); for (const p of parse) for (const r of p.rows) if (r.upos === "VERB") { const l = String(r.lemma ?? r.form).toLowerCase(); vc.set(l, (vc.get(l) ?? 0) + 1); }
const verbs = [...vc].filter(([, n]) => n >= 5).map(([v]) => v);
// 1. glosses for every lemma that has an infinitive-reading sense (the first two), so a genus can be looked up too
const gl = new Map();
for await (const line of readline.createInterface({ input: fs.createReadStream(KAI), crlfDelay: Infinity })) {
  if (!line.startsWith('{"addr":"lemma:') || !line.includes('"gloss":"To ')) continue;
  const lemma = line.slice(15, line.indexOf('"', 15)); let a = gl.get(lemma); if (a && a.length >= 2) continue;
  try { const g = JSON.parse(line).body?.gloss; if (g?.startsWith("To ")) { if (!a) gl.set(lemma, (a = [])); a.push(g); } } catch { /* torn line */ }
}
console.log(`verbs (>= 5 uses in the book): ${verbs.length}; with an infinitive gloss in the dictionary: ${verbs.filter((v) => gl.has(v)).length}`);
// 2. genus by reading the gloss
const P = await rowsOfFor("eng"), memo = new Map();
const genusOf = (v) => { if (memo.has(v)) return memo.get(v); let out = null; const g = gl.get(v)?.[0]; if (g) { const rows = P.rowsOf(g) ?? [], root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT"); if (root?.upos === "VERB") { const lem = (r) => String(r.lemma ?? r.form).toLowerCase(); const gs = [root, ...rows.filter((r) => r.head === root.id && r.deprel === "conj" && r.upos === "VERB")].map(lem).filter((x) => x !== v); const dif = rows.filter((r) => r.head === root.id && r.karaka && r.upos !== "PUNCT").map((r) => lem(r)).slice(0, 4); out = { genus: gs, differentia: dif }; } } memo.set(v, out); return out; };
const chain = (v) => { const out = []; let cur = v; for (let i = 0; i < 3; i++) { const g = genusOf(cur)?.genus?.[0]; if (!g || out.includes(g) || g === v) break; out.push(g); cur = g; } return out; };
let withGenus = 0; const members = new Map(); const chains = new Map();
for (const v of verbs) { const c = chain(v); chains.set(v, c); if (c.length) withGenus++; for (const a of c) { let s = members.get(a); if (!s) members.set(a, (s = new Set())); s.add(v); } }
console.log(`verbs whose gloss, read by the reader, names a genus: ${withGenus} of ${verbs.length}`);
const klass = new Map(), labelOf = new Map();
for (const v of verbs) { const a = chains.get(v).find((x) => members.get(x).size >= 3 && members.get(x).size <= 40); if (a) { klass.set(v, `g:${a}`); labelOf.set(`g:${a}`, a); } }
const gc = new Map(); for (const [v, c] of klass) { let s = gc.get(c); if (!s) gc.set(c, (s = [])); s.push(v); }
console.log(`(a) genus classes of 3 to 40 verbs: ${gc.size}, placing ${klass.size} verbs. The biggest:`);
for (const [c, vs] of [...gc].sort((a, b) => b[1].length - a[1].length).slice(0, 14)) console.log(`   ${labelOf.get(c)}: ${vs.sort((x, y) => vc.get(y) - vc.get(x)).slice(0, 9).join(", ")}${vs.length > 9 ? " …" : ""}  (${vs.length})`);
// 3b. the embedder over the glosses
const gv = verbs.filter((v) => gl.has(v)), emb = makeEmbedder(), vecs = (await emb.embed(gv.map((v) => `${v}: ${gl.get(v)[0]}`))).map(normalise); emb.save();
const n = gv.length, S = new Float32Array(n * n); let sum = 0, sq = 0, cnt = 0;
for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const c = cosine(vecs[i], vecs[j]); S[i * n + j] = S[j * n + i] = c; sum += c; sq += c * c; cnt++; }
const mean = sum / cnt, sd = Math.sqrt(sq / cnt - mean * mean), tau = mean + 2.5 * sd;
const nn = (i) => Array.from({ length: n }, (_, j) => j).filter((j) => j !== i).sort((a, b) => S[i * n + b] - S[i * n + a]).slice(0, 3);
const near = gv.map((_, i) => new Set(nn(i))), up = gv.map((_, i) => i);
const find = (x) => { while (up[x] !== x) { up[x] = up[up[x]]; x = up[x]; } return x; };
for (let i = 0; i < n; i++) for (const j of near[i]) if (near[j].has(i) && S[i * n + j] >= tau) up[find(i)] = find(j);
const comps = new Map(); gv.forEach((v, i) => { const r = find(i); let s = comps.get(r); if (!s) comps.set(r, (s = [])); s.push(v); });
const ec = [...comps.values()].filter((s) => s.length >= 3 && s.length <= 40);
console.log(`\n(b) embeddings of the glosses: ${n} verbs; all-pairs cosine mean ${mean.toFixed(2)}, sd ${sd.toFixed(2)}, threshold ${tau.toFixed(2)}; mutual 3-NN components of 3 to 40 verbs: ${ec.length}, placing ${ec.reduce((a, s) => a + s.length, 0)} verbs. A sample:`);
for (const s of ec.sort((a, b) => b.length - a.length).slice(0, 12)) console.log(`   ${s.sort((x, y) => vc.get(y) - vc.get(x)).slice(0, 10).join(", ")}${s.length > 10 ? " …" : ""}  (${s.length})`);
// the embedding classes LEAD (their neighbours are the right ones); a genus class fills in only where the embedding found none, because a gloss whose genus is a light verb ("to have", "to cause", "to give") lumps unrelated verbs
const genusClass = new Map(klass); klass.clear();
ec.forEach((s, i) => { for (const v of s) { klass.set(v, `e:${i}`); } labelOf.set(`e:${i}`, s.slice(0, 3).join("/")); });
for (const [v, c] of genusClass) if (!klass.has(v)) klass.set(v, c);
console.log("\nnearest verbs by gloss embedding:");
for (const w of ["say", "kiss", "interrupt", "marry", "look", "ride", "die", "love", "refuse"]) { const i = gv.indexOf(w); if (i < 0) { console.log(`   ${w}: no gloss`); continue; } console.log(`   ${w}: ${nn(i).map((j) => `${gv[j]} ${S[i * n + j].toFixed(2)}`).join(", ")}   | genus: ${chains.get(w).join(" > ") || "none"}`); }
fs.writeFileSync(OUT, JSON.stringify({ klass: Object.fromEntries(klass), labels: Object.fromEntries(labelOf) }));
console.log(`\nclasses for ${klass.size} of ${verbs.length} verbs written to ${OUT}`);
