// EXPLORATORY. Can the social acts (thanks, apology, acknowledgement, greeting, farewell, laughter) be told apart without a vocabulary typed in English?
// Asked by the chat session (b1e36f): every social act gets "Okay." because the reader only separates INTJ from not-INTJ; a giver-backed way to tell an apology
// from an acknowledgement is wanted, to key an authored reply table by the state found.
// Two independent routes to what a one-word message DOES, compared:
//   USAGE   what people answer it with. In 195,547 IRC lines, every line that is one interjection is followed by another speaker's line; the first word of that
//           line is the feature. "thanks" is followed by "np", "welcome"; "sorry" by "np", "no". Forms with similar answers do the same act.
//   GLOSS   what the dictionary says it is for (kaikki, a giver): the glosses of each form embedded with the frozen embedder (nomic-embed-text, a codec, no
//           generation) and averaged.
// Test (rule: agreement across readers measured, against a shuffled null): the correlation, over all pairs of forms, between the two similarities; and whether a
// form's nearest neighbour by usage is among its 3 nearest by gloss. The null permutes which gloss belongs to which form (2,000 times).
//   node eval/chat-register/social-acts.mjs   -> eval/chat-register/social-acts.json
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const ZEN = process.env.ZENODOTUS || path.resolve(ROOT, "..", "Zenodotus"), IRC_DIR = path.join(ZEN, "19-organic-community", "ubuntu-irc");
const KAIKKI = process.env.KAIKKI_EN || "/tmp/given-pharos/kaikki-en.jsonl";
const K = pathToFileURL(path.join(ROOT, "native") + "/").href;
const { rowsOfFor } = await import(K + "reading.js");
const { makeEmbedder, normalise, cosine } = await import(K + "adapters/text/embed-personhood.js");
const parser = await rowsOfFor("eng");
// DECLARED DIAL, with its reason: a form (or an answer-word) must occur at least MIN times, so that each share rests on >= 30 observations (a share's standard error is then <= 0.09)
const MIN = 30, WINDOW = 3;   // WINDOW: the answer is the first line by ANOTHER speaker within the next 3 lines (the same window the conversation measurement used for question answers was 5; 3 keeps the answer adjacent)
const word = (t) => String(t).toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g, "");   // regex-ok: strips punctuation around a token (surface), not language
const first = (t) => word(String(t).trim().split(/\s+/)[0] ?? "");   // regex-ok: the first whitespace-delimited token of a line
const oneWord = (t) => /^[A-Za-z']{2,12}[.!?]*$/.test(String(t).trim());   // regex-ok: a line that is exactly one short alphabetic token (surface shape of the line)
const IRC = /^<([^>]+)> (.*)$/;   // regex-ok: the IRC log line format
// ---- 1. the lines, per file, and the one-word lines
const files = ["ubuntu", "kubuntu"].flatMap((d) => fs.readdirSync(path.join(IRC_DIR, d)).filter((f) => f.endsWith(".txt")).map((f) => path.join(IRC_DIR, d, f)));
const logs = files.map((f) => { const t = fs.readFileSync(f, "utf8"), m = t.match(/^---\n[\s\S]*?\n---\n/); return (m ? t.slice(m[0].length) : t).split("\n").map((l) => IRC.exec(l)).filter(Boolean).map((m) => ({ nick: m[1], text: m[2].trim() })); });   // regex-ok: frontmatter of a file
const lines = logs.reduce((a, l) => a + l.length, 0);
const counts = new Map(); for (const lg of logs) for (const l of lg) if (oneWord(l.text)) { const w = word(l.text); counts.set(w, (counts.get(w) ?? 0) + 1); }
const frequent = [...counts].filter(([, n]) => n >= MIN).map(([w]) => w);
// ---- 2. which of them the READER calls an interjection (read alone, as the message)
const intj = frequent.filter((w) => { const rows = parser.rowsOf(w) ?? [], root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT"); return root?.upos === "INTJ"; });
const other = frequent.filter((w) => !intj.includes(w)).map((w) => { const rows = parser.rowsOf(w) ?? [], root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT"); return `${w}/${root?.upos ?? "?"}`; });
console.log(`frequent one-word lines the reader does NOT call interjections: ${other.join(" ")}`);
console.log(`${lines} IRC lines; ${counts.size} distinct one-word lines, ${frequent.length} occur >= ${MIN} times; the reader calls ${intj.length} of those interjections: ${intj.slice(0, 40).join(" ")}`);
// ---- 3. usage vectors: the first word of the next other-speaker line
const ans = new Map(), total = new Map();
for (const w of frequent) ans.set(w, new Map());
for (const lg of logs) lg.forEach((l, i) => { if (!oneWord(l.text)) return; const w = word(l.text); if (!ans.has(w)) return; const nxt = lg.slice(i + 1, i + 1 + WINDOW).find((y) => y.nick !== l.nick); if (!nxt) return; const f = first(nxt.text); if (!f) return; const m = ans.get(w); m.set(f, (m.get(f) ?? 0) + 1); total.set(f, (total.get(f) ?? 0) + 1); });
const feats = [...total].filter(([, n]) => n >= MIN).map(([f]) => f).sort();
const usage = new Map(frequent.map((w) => { const m = ans.get(w), v = feats.map((f) => Math.sqrt((m.get(f) ?? 0))), n = Math.hypot(...v) || 1; return [w, v.map((x) => x / n)]; }));   // square-root counts: the Hellinger geometry of two answer distributions
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const top = (w) => [...ans.get(w)].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f, n]) => `${f} ${n}`).join(", ");
// ---- 4. glosses from the giver, embedded
const want = new Set(intj), glosses = new Map(intj.map((w) => [w, []]));
if (!fs.existsSync(KAIKKI)) { console.error(`no dictionary giver at ${KAIKKI}: set KAIKKI_EN (a typed gap, nothing was guessed)`); process.exit(2); }
for await (const line of readline.createInterface({ input: fs.createReadStream(KAIKKI), crlfDelay: Infinity })) {
  if (!line.startsWith('{"addr":"lemma:')) continue; const lemma = line.slice(15, line.indexOf('"', 15)); if (!want.has(lemma)) continue;
  try { const g = JSON.parse(line).body?.gloss; if (g) glosses.get(lemma).push(g); } catch { /* torn line */ }
}
// the giver's first glosses for EVERY frequent one-word form, not only the reader's interjections: where a gloss is a cross-reference ("Abbreviation of thanks.") the giver itself maps the form to its canonical one
const wantAll = new Set(frequent), firstGl = new Map(frequent.map((w) => [w, []]));
for await (const line of readline.createInterface({ input: fs.createReadStream(KAIKKI), crlfDelay: Infinity })) { if (!line.startsWith('{"addr":"lemma:')) continue; const lemma = line.slice(15, line.indexOf('"', 15)); if (!wantAll.has(lemma)) continue; try { const g = JSON.parse(line).body?.gloss; const a = firstGl.get(lemma); if (g && a.length < 2) a.push(g); } catch { /* torn line */ } }
console.log("\nwhat the giver says about each frequent one-word form (first two glosses):"); for (const w of frequent) console.log(`  ${w.padEnd(8)} ${intj.includes(w) ? "INTJ" : "    "} ${(firstGl.get(w).join(" | ") || "(no entry)").slice(0, 150)}`);
const withGloss = intj.filter((w) => glosses.get(w).length);
const emb = makeEmbedder(), gv = new Map();
for (const w of withGloss) { const vs = (await emb.embed(glosses.get(w))).map(normalise), mean = vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0) / vs.length); gv.set(w, normalise(mean)); }
emb.save();
const forms = withGloss; console.log(`${forms.length} of ${intj.length} interjections have glosses in the giver (${intj.filter((w) => !glosses.get(w).length).join(" ") || "none missing"})`);
// ---- 5. agreement
const n = forms.length, U = [], G = [], idx = [];
for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { U.push(dot(usage.get(forms[i]), usage.get(forms[j]))); G.push(cosine(gv.get(forms[i]), gv.get(forms[j]))); idx.push([i, j]); }
const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); let i = 0; while (i < o.length) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; };
const pearson = (a, b) => { const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
const ru = rank(U), rho = pearson(ru, rank(G));
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const permute = () => { const p = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p; };
const gm = (i, j) => cosine(gv.get(forms[i]), gv.get(forms[j]));
const nnHit = (perm) => { let hit = 0; for (let i = 0; i < n; i++) { let bu = -1, bs = -Infinity; for (let j = 0; j < n; j++) if (j !== i) { const s = dot(usage.get(forms[i]), usage.get(forms[j])); if (s > bs) { bs = s; bu = j; } } const mine = Array.from({ length: n }, (_, j) => j).filter((j) => j !== i).sort((a, b) => gm(perm[i], perm[b]) - gm(perm[i], perm[a])).slice(0, 3); if (mine.includes(bu)) hit++; } return hit / n; };
const ident = Array.from({ length: n }, (_, i) => i), nn = nnHit(ident);
const R = 2000, nullRho = [], nullNN = [];
for (let r = 0; r < R; r++) { const p = permute(); nullRho.push(pearson(ru, rank(idx.map(([i, j]) => gm(p[i], p[j]))))); if (r < 300) nullNN.push(nnHit(p)); }
const pRho = (nullRho.filter((x) => x >= rho).length + 1) / (R + 1), pNN = (nullNN.filter((x) => x >= nn).length + 1) / (nullNN.length + 1);
const sorted = (a) => [...a].sort((x, y) => x - y), q = (a, p) => sorted(a)[Math.floor(p * (a.length - 1))];
console.log(`\nSpearman rho between usage similarity and gloss similarity over ${U.length} pairs of ${n} forms: ${rho.toFixed(3)}  (shuffled null: median ${q(nullRho, 0.5).toFixed(3)}, 95th ${q(nullRho, 0.95).toFixed(3)}; p = ${pRho.toFixed(4)})`);
console.log(`a form's usage-nearest form is among its 3 gloss-nearest: ${(nn * 100).toFixed(0)}% (null median ${(q(nullNN, 0.5) * 100).toFixed(0)}%, 95th ${(q(nullNN, 0.95) * 100).toFixed(0)}%; p = ${pNN.toFixed(4)})`);
// ---- 6. the acts the GLOSS route finds (mutual 3-nearest-neighbours above the all-pairs mean + 2.5 sd of the gloss similarities, the rule used for the verb classes), and the
//         test that matters for the chat: are the forms the giver groups together ANSWERED alike (usage similarity within a group, against the same sizes drawn at random)?
const gmean = G.reduce((a, b) => a + b, 0) / G.length, gsd = Math.sqrt(G.reduce((a, b) => a + (b - gmean) ** 2, 0) / G.length), gtau = gmean + 2.5 * gsd;
const GS = (i, j) => cosine(gv.get(forms[i]), gv.get(forms[j])), gnear = forms.map((_, i) => new Set(Array.from({ length: n }, (_, j) => j).filter((j) => j !== i).sort((a, b) => GS(i, b) - GS(i, a)).slice(0, 3)));
const up = forms.map((_, i) => i), find = (x) => { while (up[x] !== x) { up[x] = up[up[x]]; x = up[x]; } return x; };
for (let i = 0; i < n; i++) for (const j of gnear[i]) if (gnear[j].has(i) && GS(i, j) >= gtau) up[find(i)] = find(j);
const comps = new Map(); forms.forEach((w, i) => { const r = find(i); (comps.get(r) ?? comps.set(r, []).get(r)).push(i); });
const groups = [...comps.values()].filter((c) => c.length >= 2).sort((a, b) => b.length - a.length);
const withinMean = (gs, perm) => { let s = 0, c = 0; for (const g of gs) for (let a = 0; a < g.length; a++) for (let b = a + 1; b < g.length; b++) { s += dot(usage.get(forms[perm[g[a]]]), usage.get(forms[perm[g[b]]])); c++; } return c ? s / c : NaN; };
const allMean = U.reduce((a, b) => a + b, 0) / U.length, obs = groups.length ? withinMean(groups, ident) : null, nullW = []; if (groups.length) for (let r = 0; r < R; r++) nullW.push(withinMean(groups, permute()));
const pW = groups.length ? (nullW.filter((x) => x >= obs).length + 1) / (R + 1) : null;
console.log(`\nacts by GLOSS (mutual 3-NN, threshold ${gtau.toFixed(2)} = mean ${gmean.toFixed(2)} + 2.5 sd): ${groups.length} groups over ${groups.reduce((a, g) => a + g.length, 0)} of ${n} forms`);
for (const g of groups) console.log(`  ${g.map((i) => forms[i]).join(", ")}   | glosses: ${g.slice(0, 2).map((i) => glosses.get(forms[i])[0]).join(" / ").slice(0, 150)}`);
console.log(groups.length ? `forms answered alike? mean usage similarity within the gloss groups ${obs.toFixed(3)} vs all pairs ${allMean.toFixed(3)}; same group sizes drawn at random: median ${q(nullW, 0.5).toFixed(3)}, 95th ${q(nullW, 0.95).toFixed(3)}; p = ${pW.toFixed(4)}` : `no gloss group formed (the data-derived threshold ${gtau.toFixed(2)} is above what any pair reaches), so "answered alike" was not tested and no p is reported`);
const acts = groups.map((g) => g.map((i) => forms[i]));

// ---- 7. usage alone, over ALL the frequent one-word forms (no giver, no embedder, no reader tag): who is answered like whom?
const allUse = frequent.filter((w) => [...ans.get(w).values()].reduce((a, b) => a + b, 0) >= MIN), simU = (a, b) => dot(usage.get(a), usage.get(b));
console.log(`\nUSAGE ALONE: each one-word form's 3 nearest forms by what it is answered with (${allUse.length} forms answered >= ${MIN} times):`);
const nbrs = {};
for (const w of allUse) { const nb = allUse.filter((x) => x !== w).sort((a, b) => simU(w, b) - simU(w, a)).slice(0, 3); nbrs[w] = nb.map((x) => ({ form: x, sim: +simU(w, x).toFixed(2) })); console.log(`  ${w.padEnd(8)} answered with: ${top(w).padEnd(40)} nearest: ${nb.map((x) => `${x} ${simU(w, x).toFixed(2)}`).join(", ")}`); }
fs.writeFileSync(path.join(HERE, "social-acts.json"), JSON.stringify({ stamp: { when: new Date().toISOString(), split: "EXPLORATORY", dials: { MIN, WINDOW, nullDraws: R }, ircLines: lines, giver: "kaikki-en", embedder: "nomic-embed-text (frozen codec)" }, forms, answeredWith: Object.fromEntries(forms.map((w) => [w, top(w)])), glossesPerForm: Object.fromEntries(forms.map((w) => [w, glosses.get(w).length])), agreement: { pairs: U.length, rho: +rho.toFixed(3), nullMedian: +q(nullRho, 0.5).toFixed(3), null95: +q(nullRho, 0.95).toFixed(3), p: +pRho.toFixed(4), nnHit: +nn.toFixed(3), nnNullMedian: +q(nullNN, 0.5).toFixed(3), nnNull95: +q(nullNN, 0.95).toFixed(3), nnP: +pNN.toFixed(4) }, glossActs: acts, glossTau: +gtau.toFixed(3), withinUsage: groups.length ? { observed: +obs.toFixed(3), allPairs: +allMean.toFixed(3), nullMedian: +q(nullW, 0.5).toFixed(3), null95: +q(nullW, 0.95).toFixed(3), p: +pW.toFixed(4) } : { tested: false, why: "no gloss group formed" }, notInterjectionsToTheReader: other, usageNeighbours: nbrs, giverFirstGlosses: Object.fromEntries(frequent.map((w) => [w, firstGl.get(w)])) }, null, 1));
process.exit(0);
