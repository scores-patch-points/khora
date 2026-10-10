// read-pairs.mjs -- EXECUTOR of the registered design (data/design.json): reads every designed token with the ablation instrument (impact.mjs impactBatch, delete, frame-causal F=0, prior-free readers)
// and stores the slim record. It holds NO threshold, score or prediction (those live in the pre-registration header of analyse.mjs, written before this file was first run).
//   node read-pairs.mjs --shard K --of N [--arms E_CORE,E_SRV,...]
// Controls per (document, condition): K1 sham ablation of 8 tokens must be 100% null; K6 determinism: 8 tokens re-read must reproduce their hash.
import fs from "node:fs";
import path from "node:path";
import { impactBatch } from "../../impact.mjs";
import { HERE, mOf, loadDocCond, seedTagOf } from "./lib.mjs";

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SHARD = Number(opt("--shard", 0)), OF = Number(opt("--of", 1)), ARMS = opt("--arms", "").split(",").filter(Boolean);
const design = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design.json"), "utf8"));
const OUT = path.join(HERE, "data", "read"); fs.mkdirSync(OUT, { recursive: true });
const slim = (rec) => ({ counts: Array.from(rec.counts), span: Array.from(rec.span, (x) => Number(Number(x).toFixed(6))), extent: rec.extent, isNull: rec.isNull, noSlot: rec.noSlot, nTokenSlots: rec.nTokenSlots, laterEdges: rec.laterEdges, hash: rec.hash });

const groups = new Map();
for (const t of design.tokens) {
  if (ARMS.length && !ARMS.includes(t.arm)) continue;
  const g = `${t.doc}|${t.cond}`; let o = groups.get(g); if (!o) groups.set(g, (o = { doc: t.doc, cond: t.cond, toks: new Map() }));
  o.toks.set(`${t.s}:${t.i}`, { s: t.s, i: t.i, id: t.w });
}
const list = [...groups.values()].sort((a, b) => b.toks.size - a.toks.size || (a.doc + a.cond < b.doc + b.cond ? -1 : 1)).filter((_, k) => k % OF === SHARD);
const t00 = Date.now();
for (const g of list) {
  const base = `${g.doc.replace(/[/:]/g, "_")}.${g.cond}`, file = path.join(OUT, `${base}.jsonl`), t0 = Date.now();
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).k) : []);
  const todo = [...g.toks.entries()].filter(([k]) => !done.has(k));
  const doc = loadDocCond(g.doc, g.cond), M = mOf(g.doc), seedTag = seedTagOf(g.doc, g.cond);
  let gaps = 0;
  for (let a = 0; a < todo.length; a += 250) {
    const chunk = todo.slice(a, a + 250), res = impactBatch(doc.stream, chunk.map(([, t]) => t), { M, F: 0, modes: ["delete"], seedTag, maxSeconds: Infinity });
    const lines = []; chunk.forEach(([k], j) => { const r = res.records.delete[j]; if (!r || r.gap) { gaps += 1; return; } lines.push(JSON.stringify({ k, rec: slim(r) })); });
    fs.appendFileSync(file, lines.map((l) => l + "\n").join(""));
  }
  const all = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)), ctl = [...g.toks.values()].slice(0, 8);
  const sham = ctl.length ? impactBatch(doc.stream, ctl, { M, F: 0, modes: ["sham"], seedTag, maxSeconds: Infinity }) : null;
  const redo = ctl.length ? impactBatch(doc.stream, ctl, { M, F: 0, modes: ["delete"], seedTag, maxSeconds: Infinity }) : null;
  const byK = new Map(all.map((o) => [o.k, o.rec.hash]));
  const summary = { doc: g.doc, cond: g.cond, M, seedTag, tokens: g.toks.size, stored: all.length, gaps, K1_sham: { n: ctl.length, nullShare: ctl.length ? sham.records.sham.filter((r) => r && r.isNull).length / ctl.length : null },
    K6_determinism: { n: ctl.length, same: ctl.filter((t, j) => redo.records.delete[j] && byK.get(`${t.s}:${t.i}`) === redo.records.delete[j].hash).length }, seconds: (Date.now() - t0) / 1000 };
  fs.writeFileSync(path.join(OUT, `${base}.summary.json`), JSON.stringify(summary));
  console.error(`${g.doc} ${g.cond}: ${all.length}/${g.toks.size} tokens ${summary.seconds.toFixed(1)} s (total ${((Date.now() - t00) / 1000).toFixed(0)} s)`);
}
console.log(JSON.stringify({ shard: SHARD, of: OF, groups: list.length, seconds: (Date.now() - t00) / 1000 }));
