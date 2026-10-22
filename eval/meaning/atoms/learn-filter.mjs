// learn-filter.mjs — a second stage after the producer: keep or drop each PRODUCED atom, trained on the precision judges' verdicts of run 17
// (stated / wrong), measured by leaving one page out at a time: on the left-out page, the judged precision of the produced atoms kept and the
// judged recall the kept ones still carry (gold atoms the recall judge found only through produced atoms, by its "by" lists).
//   node eval/meaning/atoms/learn-filter.mjs --cands <cands17.json> [--model out.json] [--chooser model.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), M = path.join(HERE, "..");
const { trainProducer, filterFeatures } = await import(path.join(HERE, "../../../native/organs/atom-produce.js"));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const D = path.join(M, "atoms17"), S = new Map(read(path.join(D, "sentences.json")).map((s) => [s.sid, s])), Y = new Map(read(path.join(D, "system.json")).sentences.map((s) => [s.sid, s]));
const C = new Map(read(arg("cands")).sentences.map((s) => [s.sid, s])), chooser = arg("chooser") ? read(arg("chooser")) : null;
const V = new Map(); for (let k = 0; k < 4; k++) for (const v of read(path.join(D, "judged", `judged-P${k}.json`))) V.set(`${v.sid}\t${v.i}`, v.verdict === "stated");
const R = []; for (let k = 0; k < 4; k++) R.push(...read(path.join(D, "judged", `judged-R${k}.json`)));
const key = (a) => a.entity ?? String(a.value ?? "").toLowerCase();
const items = [];
for (const [sid, y] of Y) {
  const cs = C.get(sid)?.cands ?? [];
  y.atoms.forEach((a, i) => { if (a.from !== "path") return;
    const c = cs.find((x) => x.pred === a.pred && x.args.map(key).join("\t") === a.args.map(key).join("\t"));
    if (!c || !V.has(`${sid}\t${i}`)) return;
    items.push({ sid, i, page: S.get(sid).title, f: filterFeatures(c, S.get(sid).lang, chooser), y: V.get(`${sid}\t${i}`) }); });
}
const pages = [...new Set(items.map((x) => x.page))];
const scored = [];
for (const p of pages) {
  const m = trainProducer(items.filter((x) => x.page !== p).map((x) => [x.f, x.y]), { epochs: 10 });
  for (const x of items.filter((x) => x.page === p)) scored.push({ ...x, s: x.f.reduce((a, k) => a + (m.w[k] ?? 0), 0) });
}
const base = R.filter((r) => r.found && (r.by ?? []).some((i) => Y.get(r.sid).atoms[i]?.from !== "path")).length;
const nP = [...V].length, baseStated = [...V].filter(([k, v]) => v && Y.get(k.split("\t")[0]).atoms[+k.split("\t")[1]]?.from !== "path").length, baseN = [...V].filter(([k]) => Y.get(k.split("\t")[0]).atoms[+k.split("\t")[1]]?.from !== "path").length;
console.log(`${items.length} judged produced atoms matched (of 419); ${pages.length} pages, left out one at a time`);
for (const t of [-1e9, -1, -0.5, 0, 0.5, 1, 2]) {
  const kept = scored.filter((x) => x.s > t), ks = new Set(kept.map((x) => `${x.sid}\t${x.i}`));
  const st = kept.filter((x) => x.y).length;
  const rec = R.filter((r) => r.found && ((r.by ?? []).some((i) => Y.get(r.sid).atoms[i]?.from !== "path") || (r.by ?? []).some((i) => ks.has(`${r.sid}\t${i}`)))).length;
  console.log(`  t=${t}: produced kept ${kept.length}, judged stated ${(100 * st / Math.max(1, kept.length)).toFixed(1)}%; whole set A1 ${(100 * (baseStated + st) / (baseN + kept.length)).toFixed(1)}%, A2 ${(100 * rec / R.length).toFixed(1)}% (atoms.js alone ${(100 * base / R.length).toFixed(1)}%)`);
}
if (arg("model")) { const m = trainProducer(items.map((x) => [x.f, x.y]), { epochs: 10 }); fs.writeFileSync(arg("model"), JSON.stringify({ ...m, schema: "ProducedFilter@1", threshold: +arg("threshold", 0) })); }
