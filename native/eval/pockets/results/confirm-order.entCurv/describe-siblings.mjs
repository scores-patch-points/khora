// results/confirm-order.entCurv/describe-siblings.mjs — DESCRIPTIVE facts of the sibling pockets (tokens, units, documents, half sizes, content hash). No law statistic is computed here.
//   node describe-siblings.mjs > siblings-manifest.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, tokenCount, sha256 } from "../../lib/pocket.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), L = path.resolve(HERE, "../../loaders");
export const LOADERS = ["_sibling-entcurv-en-yonge.mjs", "_sibling-entcurv-en-mouret.mjs", "_sibling-entcurv-en-awakening.mjs", "_sibling-entcurv-en-swisshelm.mjs", "_sibling-entcurv-en-children.mjs",
  "_sibling-entcurv-en-shakespeare.mjs", "_sibling-entcurv-en-dolls-lysistrata.mjs", "_sibling-entcurv-ud-lat-perseus.mjs", "_sibling-entcurv-code.mjs", "_sibling-entcurv-ctl.mjs"];
export async function loadAll(onlyIds = null) {
  const out = [];
  for (const f of LOADERS) { const m = await import(pathToFileURL(path.join(L, f)).href); for (const p of await m.load(onlyIds)) if (!onlyIds || onlyIds.includes(p.id)) out.push(p); }
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = [];
  for (const p of await loadAll()) {
    const v = validate(p), H = halves(p), voc = new Set(p.units.flat()).size;
    rows.push({ id: p.id, group: p.group, register: p.register, language: p.language, tokens: v.tokens, units: v.units, docs: v.docs, thin: v.thin, vocab: voc, meanUnitLength: +(v.tokens / v.units).toFixed(2),
      halfTokens: { discover: tokenCount(H.discover.units), confirm: tokenCount(H.confirm.units) }, halfDocs: { discover: new Set(H.discover.docOf).size, confirm: new Set(H.confirm.docOf).size },
      contentSha256: sha256(JSON.stringify({ units: p.units, docOf: p.docOf })), source: p.meta?.source ?? null });
    console.error(`${p.id}: ${v.tokens} tokens ${v.units} units ${v.docs} docs thin=${v.thin}`);
  }
  console.log(JSON.stringify(rows, null, 1));
}
