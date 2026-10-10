// attack-read.mjs -- EXECUTOR of the attack designs: reads with the confirmer's instrument (impact.mjs impactBatch, delete, F=0, M=256, prior-free readers, seed tag "<doc>:ac[:cond]") every designed token that the confirmer did NOT already read.
// Holds NO threshold, score or prediction. Controls per (document, condition): K1 sham ablation of 8 tokens must be 100% null; K6 determinism re-read of 8 tokens; K7 INSTRUMENT IDENTITY: up to 6 tokens that the confirmer already read are re-read and their record hash must equal the stored one.
//   node attack-read.mjs --design data/design-a2.json --out data/read-a2 --shard K --of N
import fs from "node:fs";
import path from "node:path";
import { impactBatch } from "../../impact.mjs";
import { mOf, seedTagOf } from "../confirm-ablscope-1-slot-ircB-c4plus/lib.mjs";
import { HERE, CONF, loadDocAny, readMaps } from "./lib-a.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SHARD = Number(opt("--shard", 0)), OF = Number(opt("--of", 1)), DESIGN = path.resolve(HERE, opt("--design")), OUT = path.resolve(HERE, opt("--out"));
fs.mkdirSync(OUT, { recursive: true });
const design = JSON.parse(fs.readFileSync(DESIGN, "utf8")), confReads = readMaps([path.join(CONF, "data", "read")]);
const slim = (rec) => ({ counts: Array.from(rec.counts), span: Array.from(rec.span, (x) => Number(Number(x).toFixed(6))), extent: rec.extent, isNull: rec.isNull, noSlot: rec.noSlot, nTokenSlots: rec.nTokenSlots, laterEdges: rec.laterEdges, hash: rec.hash });
const groups = new Map();
for (const t of design.tokens) { const g = `${t.doc}|${t.cond}`; const o = groups.get(g) ?? groups.set(g, { doc: t.doc, cond: t.cond, toks: new Map() }).get(g); o.toks.set(`${t.s}:${t.i}`, { s: t.s, i: t.i, id: t.w }); }
const list = [...groups.values()].sort((a, b) => b.toks.size - a.toks.size || (a.doc + a.cond < b.doc + b.cond ? -1 : 1)).filter((_, k) => k % OF === SHARD);
const t00 = Date.now();
for (const g of list) {
  const base = `${g.doc.replace(/[/:]/g, "_")}.${g.cond}`, file = path.join(OUT, `${base}.jsonl`), t0 = Date.now(), have = confReads.get(`${g.doc}|${g.cond}`) ?? new Map();
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).k) : []);
  const todo = [...g.toks.entries()].filter(([k]) => !done.has(k) && !have.has(k));
  const doc = loadDocAny(g.doc, g.cond), M = mOf(g.doc), seedTag = seedTagOf(g.doc, g.cond);
  let gaps = 0;
  for (let a = 0; a < todo.length; a += 250) {
    const chunk = todo.slice(a, a + 250), res = impactBatch(doc.stream, chunk.map(([, t]) => t), { M, F: 0, modes: ["delete"], seedTag, maxSeconds: Infinity });
    const lines = []; chunk.forEach(([k], j) => { const r = res.records.delete[j]; if (!r || r.gap) { gaps += 1; return; } lines.push(JSON.stringify({ k, rec: slim(r) })); });
    fs.appendFileSync(file, lines.map((l) => l + "\n").join(""));
  }
  const all = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [], mine = new Map(all.map((o) => [o.k, o.rec.hash]));
  const ctl = all.slice(0, 8).map((o) => { const [s, i] = o.k.split(":").map(Number); return { s, i, id: doc.stream[s][i] }; });
  const old = [...have.keys()].slice(0, 6).map((k) => { const [s, i] = k.split(":").map(Number); return { k, s, i, id: doc.stream[s][i] }; });
  const sham = ctl.length ? impactBatch(doc.stream, ctl, { M, F: 0, modes: ["sham"], seedTag, maxSeconds: Infinity }) : null;
  const redo = ctl.length ? impactBatch(doc.stream, ctl, { M, F: 0, modes: ["delete"], seedTag, maxSeconds: Infinity }) : null;
  const k7 = old.length ? impactBatch(doc.stream, old, { M, F: 0, modes: ["delete"], seedTag, maxSeconds: Infinity }) : null;
  const summary = { doc: g.doc, cond: g.cond, M, seedTag, tokens: g.toks.size, fresh: all.length, reusedFromConfirmer: g.toks.size - todo.length + 0, gaps,
    K1_sham: { n: ctl.length, nullShare: ctl.length ? sham.records.sham.filter((r) => r && r.isNull).length / ctl.length : null },
    K6_determinism: { n: ctl.length, same: ctl.filter((t, j) => redo.records.delete[j] && mine.get(`${t.s}:${t.i}`) === redo.records.delete[j].hash).length },
    K7_identity: { n: old.length, same: old.filter((t, j) => k7.records.delete[j] && have.get(t.k).hash === k7.records.delete[j].hash).length }, seconds: (Date.now() - t0) / 1000 };
  fs.writeFileSync(path.join(OUT, `${base}.summary.json`), JSON.stringify(summary));
  console.error(`${g.doc} ${g.cond}: fresh ${all.length}/${todo.length} todo, K7 ${summary.K7_identity.same}/${summary.K7_identity.n}, ${summary.seconds.toFixed(1)} s (total ${((Date.now() - t00) / 1000).toFixed(0)} s)`);
}
console.log(JSON.stringify({ shard: SHARD, of: OF, groups: list.length, seconds: (Date.now() - t00) / 1000 }));
