// results/confirm-para.formulaCov/sizes.mjs — build sibling pockets and COUNT them only (tokens, units, documents, vocabulary, mean unit length); no law statistic is computed.
//   node sizes.mjs <loaderFile> [id1,id2]
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validate } from "../../lib/pocket.mjs";
const [file, ids] = process.argv.slice(2);
const m = await import(pathToFileURL(path.resolve("../../loaders", file)).href);
const t0 = process.hrtime.bigint();
for (const p of await m.load(ids ? ids.split(",") : null)) {
  const v = validate(p), vocab = new Set(p.units.flat()).size;
  console.log(JSON.stringify({ id: p.id, register: p.register, language: p.language, tokens: v.tokens, units: v.units, docs: v.docs, thin: v.thin, overCap: v.overCap, vocab, meanUnitLen: +(v.tokens / v.units).toFixed(3), notes: String(p.meta?.notes ?? "").slice(0, 400) }));
}
