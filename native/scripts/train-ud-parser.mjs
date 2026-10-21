// native/scripts/train-ud-parser.mjs <treebank-dir> [iterations] [unimorph-file] — train ud-parser.js on a UD treebank's train split, score it on
// its test split (punctuation excluded) and write the model, pruned (|w| >= PRUNE, default 1) and gzipped, to OUT (default priors/ud-parser-<prefix>.json.gz).
// The treebank's own name, file hash and scores go into the model's meta (the provenance law of train-english-parser.mjs).
//   node native/scripts/train-ud-parser.mjs ~/data/ud/UD_English-EWT 10 ~/data/unimorph/eng/eng
import fs from "node:fs"; import path from "node:path";
import crypto from "node:crypto"; import zlib from "node:zlib"; import { fileURLToPath } from "node:url";
const K = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { parseConllu } = await import(`${K}/kernel/eot-rich.js`);
const U = await import(`${K}/adapters/text/ud-parser.js`);
const [dir, it = "10", um = ""] = process.argv.slice(2);
const lex = um && fs.existsSync(um) ? U.unimorphLexicon(fs.readFileSync(um, "utf8")) : null;
// word clusters from unlabelled text (build-word-clusters.mjs), read as tagger and parser features: CLUSTERS=priors/clusters-<lang>.json.gz
const clusters = process.env.CLUSTERS ? await U.loadClustersFile(process.env.CLUSTERS) : null;
const files = fs.readdirSync(dir), pick = (s) => files.find((f) => f.endsWith(`-ud-${s}.conllu`));
const trainF = pick("train"), testF = pick("test") ?? pick("dev");
const sents = parseConllu(fs.readFileSync(path.join(dir, trainF), "utf8")).filter((s) => s.tokens.every((t) => Number.isInteger(t.head)));
const t0 = Date.now();
const json = U.train(sents, { iterations: +it, seed: path.basename(dir), lex, lexSource: lex ? um : null, clusters, clustersSource: process.env.CLUSTERS ? path.basename(process.env.CLUSTERS) : null, beam: +(process.env.BEAM ?? 1), log: (m) => console.log("  ", m, `${((Date.now() - t0) / 1000).toFixed(0)}s`) });
const trainBytes = fs.readFileSync(path.join(dir, trainF)), prefix = trainF.replace(/-ud-train\.conllu$/, "");
json.meta = { ...json.meta, treebank: path.basename(dir), file: trainF, sha256: crypto.createHash("sha256").update(trainBytes).digest("hex"), giver: `Universal Dependencies ${path.basename(dir)} (github.com/UniversalDependencies/${path.basename(dir)}), see its LICENSE` };
const PRUNE = +(process.env.PRUNE ?? 1);
const prune = (p) => { const w = {}; for (const [f, pairs] of Object.entries(p.w)) { const o = []; for (let i = 0; i < pairs.length; i += 2) if (Math.abs(pairs[i + 1]) >= PRUNE) o.push(pairs[i], Math.round(pairs[i + 1] * 1000) / 1000); if (o.length) w[f] = o; } return { ...p, w }; };
const shipped = { ...json, parser: prune(json.parser), tagger: prune(json.tagger) };
const model = U.loadModel(shipped, { lex, clusters }), test = parseConllu(fs.readFileSync(path.join(dir, testF), "utf8"));
let n = 0, up = 0, uas = 0, las = 0;
for (const s of test) { const rows = U.analyse(model, s.tokens.map((t) => t.form)); s.tokens.forEach((g, k) => { if (g.upos === "PUNCT") return; n++; const r = rows[k]; if (r.upos === g.upos) up++; if (r.head === g.head) { uas++; if (r.deprel.split(":")[0] === g.deprel.split(":")[0]) las++; } }); }
const scores = { test: testF, sentences: test.length, words: n, upos: +(100 * up / n).toFixed(1), uas: +(100 * uas / n).toFixed(1), las: +(100 * las / n).toFixed(1), punct: "excluded", prune: PRUNE };
shipped.meta.scores = scores;
const out = process.env.OUT ?? path.join(K, "priors", `ud-parser-${prefix}.json.gz`);
fs.writeFileSync(out, zlib.gzipSync(JSON.stringify(shipped), { level: 9 }));
console.log(JSON.stringify({ treebank: path.basename(dir), train: sents.length, ...scores, secs: Math.round((Date.now() - t0) / 1000), model: out }));
