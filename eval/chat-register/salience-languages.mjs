// EXPLORATORY (the models, the window of three sentences, the one-half level and the learning rate 0.1 were fixed before the run; DEV sets of CorefUD 1.3; 0.03 and 0.3 are reported as sensitivity, not chosen). THE OWNER,
// 2026-11-24: "try this on other languages, and let's have it learn these programs on the fly." Two questions, both falsifiable:
//   A. ZERO-SHOT: the shipped salience weights (native/adapters/text/salience/weights.json: trained on LitBank, Spanish and Catalan AnCora only) on every other CorefUD language, against a random pick, the latest mention, and
//      weights trained IN that language (its own train file): how far is one universal model from a model of the language?
//   B. ON THE FLY: starting from the shipped weights, the system reads a language's dev documents in order and learns as it goes (one gradient step per anaphor, learning rate 0.1), with four kinds of feedback:
//      FROZEN (none), ORACLE (the gold referent after every anaphor: a user who answers every time), WRONG-ONLY (the gold referent only after a wrong guess: a user who corrects mistakes), SELF (its own confident
//      guess, above one half, no gold at all). Scored PREQUENTIALLY: each anaphor is predicted before it is learned from; accuracy over the first, second and last third of the stream.
// Anaphors: single-token mentions that are third-person pronouns (UD Person=3) or dropped (empty-node) pronouns, with an earlier mention of their entity; candidates: every entity with a mention in the window (the sentence so
// far and the two before) when there are two or more; the anaphor's role from its relation. (The English given-name filter is NOT used: it is English only.) Right = the anaphor's gold entity.
//   node eval/chat-register/salience-languages.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const DATA = process.env.COREFUD_DIR ?? "/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data";
const { loadSalienceWeights, roleOfDeprel, WINDOW } = await import("file://" + ROOT + "/native/adapters/text/salience-prior.js"), SHIPPED = loadSalienceWeights();
if (!SHIPPED) { console.log("no shipped salience weights (run scripts/build-salience-prior.mjs)"); process.exit(1); }
const TRAINED_ON = new Set(["CorefUD_English-LitBank", "CorefUD_Spanish-AnCora", "CorefUD_Catalan-AnCora"]);
const CAP_TRAIN = 12000, LR = Number(process.env.SALIENCE_LR ?? 0.1);
function parse(file, maxSents = Infinity) {
  const docs = []; let doc = null, sent = null, n = 0;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# newdoc")) { doc = { sents: [] }; docs.push(doc); continue; } if (line === "") { sent = null; if (n >= maxSents) break; continue; } if (line.startsWith("#")) continue;
    const c = line.split("\t"); if (!/^\d+(\.\d+)?$/.test(c[0])) continue;   // regex-ok: a CoNLL-U token id, not language
    if (!sent) { sent = { toks: [], mentions: [], stack: [] }; (doc ?? (doc = { sents: [] }, docs.push(doc))).sents.push(sent); n++; }
    const zero = c[0].includes("."), t = { i: sent.toks.length, id: c[0], form: c[1], upos: c[3], feats: c[5], head: c[6], deprel: zero ? (c[8].split(":").slice(1).join(":") || "") : c[7], zero }; sent.toks.push(t);
    const ent = (c[9].split("|").find((x) => x.startsWith("Entity=")) ?? "").slice(7);
    for (let k = 0; k < ent.length;) { if (ent[k] === "(") { let j = k + 1; while (j < ent.length && ent[j] !== "(" && ent[j] !== ")") j++; sent.stack.push({ id: ent.slice(k + 1, j).split("-")[0], start: t.i }); k = j; } else if (ent[k] === ")") { const m = sent.stack.pop(); if (m) sent.mentions.push({ ...m, end: t.i }); k++; } else k++; }
  }
  return docs;
}
const headOf = (s, m) => { const toks = s.toks.slice(m.start, m.end + 1), ids = new Set(toks.map((x) => x.id)); return toks.find((x) => !ids.has(x.head)) ?? toks[0]; };
const RANK = { S: 3, O: 2, X: 1 }, RI = { S: 0, O: 1, X: 2, "-": 3 };
const roleIn = (doc, si, id, before = Infinity) => { let best = null; if (!doc.sents[si]) return "-"; for (const mm of doc.sents[si].mentions) if (mm.id === id && mm.start < before) { const r = roleOfDeprel(headOf(doc.sents[si], mm).deprel); if (!best || RANK[r] > RANK[best]) best = r; } return best ?? "-"; };
function cases(docs) {
  const out = [];
  for (const d of docs) { const seen = new Set();
    for (let si = 0; si < d.sents.length; si++) { const s = d.sents[si];
      for (const m of [...s.mentions].sort((a, b) => a.start - b.start)) { const t = s.toks[m.start], isPron = m.start === m.end && t.upos === "PRON";
        const anaph = isPron && (t.zero || /(^|\|)Person=3(\||$)/.test(t.feats ?? ""));   // regex-ok: a UD feature string
        if (!anaph) { seen.add(m.id); continue; } if (!seen.has(m.id)) { seen.add(m.id); continue; } seen.add(m.id);
        const aRole = t.zero ? "S" : roleOfDeprel(t.deprel), cand = new Map();
        for (let sj = Math.max(0, si - WINDOW + 1); sj <= si; sj++) for (const mm of d.sents[sj].mentions) { if (mm === m || (sj === si && mm.start >= m.start)) continue; cand.set(mm.id, (cand.get(mm.id) ?? 0) + 1); }
        if (cand.size < 2) continue;
        const cs = [...cand].map(([id, n]) => ({ id, mentions: n, roles: [0, 1, 2].map((j) => roleIn(d, si - j, id, j === 0 ? m.start : Infinity)), recent: 0 }));
        out.push({ anaphorRole: aRole, gold: m.id, candidates: cs, zero: t.zero }); } } }
  return out;
}
const sc = (w, c) => { let s = 0; for (let j = 0; j < 3; j++) s += w[j * 4 + RI[c.roles[j]]]; return s + w[12] * Math.log(1 + c.mentions); };
const soft = (w, cs) => { const s = cs.map((c) => sc(w, c)), mx = Math.max(...s), ex = s.map((v) => Math.exp(v - mx)), z = ex.reduce((a, b) => a + b, 0); return ex.map((v) => v / z); };
const step = (w, c, label, lr) => { const p = soft(w, c.candidates); c.candidates.forEach((x, i) => { const dlt = (x.id === label ? 1 : 0) - p[i]; for (let j = 0; j < 3; j++) w[j * 4 + RI[x.roles[j]]] += lr * dlt; w[12] += lr * dlt * Math.log(1 + x.mentions); }); };
const cloneW = (W) => ({ S: Float64Array.from(W.S), O: Float64Array.from(W.O), X: Float64Array.from(W.X) });
function batchTrain(cs) { const W = { S: new Float64Array(13), O: new Float64Array(13), X: new Float64Array(13) }; for (const role of ["S", "O", "X"]) { const tr = cs.filter((c) => c.anaphorRole === role && c.candidates.some((x) => x.id === c.gold)), w = W[role]; for (let ep = 0; tr.length && ep < 300; ep++) { const g = new Float64Array(13); for (const c of tr) { const p = soft(w, c.candidates); c.candidates.forEach((x, i) => { const dlt = (x.id === c.gold ? 1 : 0) - p[i]; for (let j = 0; j < 3; j++) g[j * 4 + RI[x.roles[j]]] += dlt; g[12] += dlt * Math.log(1 + x.mentions); }); } for (let i = 0; i < 13; i++) w[i] += 0.5 * (g[i] / tr.length - 1e-3 * w[i]); } } return W; }
const top = (w, c) => { const p = soft(w, c.candidates); let bi = 0; p.forEach((v, i) => { if (v > p[bi]) bi = i; }); return { id: c.candidates[bi].id, p: p[bi] }; };
const wilson = (k, n) => { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(2), +((c + m) / d).toFixed(2)]; };
const acc = (W, cs) => cs.reduce((a, c) => a + (top(W[c.anaphorRole], c).id === c.gold ? 1 : 0), 0);
function stream(cs, mode, lr) {
  const W = cloneW(SHIPPED.weights), hit = []; for (const c of cs) { const w = W[c.anaphorRole], pr = top(w, c), ok = pr.id === c.gold ? 1 : 0; hit.push(ok);
    if (mode === "oracle") step(w, c, c.gold, lr); else if (mode === "wrong-only") { if (!ok && c.candidates.some((x) => x.id === c.gold)) step(w, c, c.gold, lr); } else if (mode === "self") { if (pr.p > 0.5) step(w, c, pr.id, lr); } }
  const third = Math.floor(hit.length / 3), r = (a, b) => hit.slice(a, b).reduce((x, y) => x + y, 0) / Math.max(1, b - a); return [r(0, third), r(third, 2 * third), r(2 * third, hit.length)].map((v) => +v.toFixed(3));
}
const dirs = fs.readdirSync(DATA).filter((d) => d.startsWith("CorefUD_") && fs.statSync(path.join(DATA, d)).isDirectory()).sort(), rows = [];
for (const d of dirs) {
  const files = fs.readdirSync(path.join(DATA, d)), dev = files.find((f) => f.endsWith("-corefud-dev.conllu")), tr = files.find((f) => f.endsWith("-corefud-train.conllu")); if (!dev) continue;
  const lic = (fs.readFileSync(path.join(DATA, d, "README.md"), "utf8").match(/^License:\s*(.+)$/m) ?? [])[1] ?? "?";   // regex-ok: the README's licence line
  const dv = cases(parse(path.join(DATA, d, dev))); if (dv.length < 60) { console.log(`${d}: ${dv.length} dev cases: skipped (fewer than 60)`); continue; }
  const recKey = (x) => (x.roles[0] !== "-" ? 3 : x.roles[1] !== "-" ? 2 : x.roles[2] !== "-" ? 1 : 0), latestId = (c) => c.candidates.reduce((b, x) => (recKey(x) > recKey(b) ? x : b), c.candidates[0]).id;
  const rnd = dv.reduce((a, c) => a + 1 / c.candidates.length, 0), recent = dv.reduce((a, c) => a + (latestId(c) === c.gold ? 1 : 0), 0);
  const shipped = acc(SHIPPED.weights, dv); let own = null; if (tr) { const tc = cases(parse(path.join(DATA, d, tr), CAP_TRAIN)); if (tc.length >= 100) own = acc(batchTrain(tc), dv); }
  const row = { dataset: d, licence: lic, trainedOnByShipped: TRAINED_ON.has(d), devCases: dv.length, zeroShare: +(dv.filter((c) => c.zero).length / dv.length).toFixed(2), random: +(rnd / dv.length).toFixed(3), latest: +(recent / dv.length).toFixed(3), shipped: { right: shipped, rate: +(shipped / dv.length).toFixed(3), wilson: wilson(shipped, dv.length) }, ownBatch: own === null ? null : { right: own, rate: +(own / dv.length).toFixed(3) },
    stream: Object.fromEntries(["frozen", "oracle", "wrong-only", "self"].map((m) => [m, stream(dv, m, LR)])), streamLr: LR }; rows.push(row);
  console.log(`${d.replace("CorefUD_", "").padEnd(28)} n=${String(dv.length).padStart(5)} zero ${Math.round(100 * row.zeroShare)}% | random ${Math.round(100 * row.random)}% latest ${Math.round(100 * row.latest)}% | shipped ${Math.round(100 * row.shipped.rate)}% ${JSON.stringify(row.shipped.wilson)}${row.trainedOnByShipped ? " (trained on)" : ""} | own-language ${row.ownBatch ? Math.round(100 * row.ownBatch.rate) + "%" : "-"} | on the fly (thirds): frozen ${row.stream.frozen.map((v) => Math.round(100 * v)).join("/")} oracle ${row.stream.oracle.map((v) => Math.round(100 * v)).join("/")} wrong-only ${row.stream["wrong-only"].map((v) => Math.round(100 * v)).join("/")} self ${row.stream.self.map((v) => Math.round(100 * v)).join("/")}`);
}
const out = { stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY (CorefUD 1.3 DEV; shipped weights trained on LitBank, Spanish and Catalan AnCora train; learning rate 0.1, window of three sentences and the one-half level declared first)", commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })(), weightsProvenance: SHIPPED.provenance.trainedOn.map((t) => t.name) }, rows };
fs.writeFileSync(path.join(HERE, process.env.SALIENCE_LR ? `salience-languages.lr${process.env.SALIENCE_LR}.json` : "salience-languages.json"), JSON.stringify(out, null, 1) + "\n");
