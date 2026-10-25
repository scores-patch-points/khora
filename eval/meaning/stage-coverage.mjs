// eval/meaning/stage-coverage.mjs — PREREG run 23, bar S2: every gold atom that today's atoms meet is met by the atoms read back from their
// stage's arrangements (stage.js toArrangements → fromArrangements), by the mechanical recall proxy (atoms/proxy-recall.mjs metBy; the judges of
// runs 13–18 cannot be rerun). The atoms are the reader's own for the six atom sets, written by atoms/run.mjs (COREF_MODEL=atoms/coref-ranker.json).
//   node eval/meaning/stage-coverage.mjs <dir>=<system.json> …     (dir: atoms, atoms14 … atoms18, each with its sentences.json and gold.json)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { readStage, fromArrangements } = await import("../../native/organs/stage.js");
const { metBy } = await import("./atoms/proxy-recall.mjs");
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
let T = { gold: 0, before: 0, after: 0, lost: 0, gained: 0 };
for (const kv of process.argv.slice(2)) {
  const [dir, sysf] = kv.split("=");
  const S = new Map(read(path.join(HERE, dir, "sentences.json")).map((s) => [s.sid, s])), G = read(path.join(HERE, dir, "gold.json")), Y = new Map(read(sysf).sentences.map((s) => [s.sid, s]));
  const t = { gold: 0, before: 0, after: 0, lost: [], gained: 0 };
  for (const g of G.sentences) {
    const s = S.get(g.sid), y = Y.get(g.sid); if (!s || !y?.atoms) continue;
    const ents = new Map(); for (const a of y.atoms) for (const x of a.args ?? []) if (x.entity != null && !ents.has(x.entity)) ents.set(x.entity, { id: x.entity, name: x.name });
    const st = readStage({ atoms: y.atoms, entities: [...ents.values()], mentions: [], rows: [], page: [] }, { text: s.sentence, lang: s.lang, title: s.title, previous: s.previous });
    const back = fromArrangements(st), ctx = { mentions: g.mentions, entities: G.entities[s.title] ?? [] };
    g.atoms.forEach((ga, j) => {
      const b = metBy(ga, y.atoms, ctx).length > 0, a = metBy(ga, back, ctx).length > 0;
      t.gold++; if (b) t.before++; if (a) t.after++; if (b && !a) t.lost.push(`${g.sid}#${j} ${ga.pred}(${ga.args.join(", ")})`); if (a && !b) t.gained++;
    });
  }
  console.log(`${dir.padEnd(8)} gold ${t.gold}  met by today's atoms ${t.before}  by the arrangements read back ${t.after}  lost ${t.lost.length}  gained ${t.gained}`);
  for (const l of t.lost.slice(0, 10)) console.log(`   lost: ${l}`);
  T.gold += t.gold; T.before += t.before; T.after += t.after; T.lost += t.lost.length; T.gained += t.gained;
}
console.log(`all      gold ${T.gold}  met by today's atoms ${T.before}  by the arrangements read back ${T.after}  lost ${T.lost}  gained ${T.gained}  → S2 ${T.lost === 0 ? "PASS" : "FAIL"}`);
