// edge-end identity metrics, option off vs on: node edgemetrics.mjs <khora dir> <text dir> <inventory.json> <out.json>
process.env.KHORA_PRIORS_DIR ??= process.env.HOME + "/Downloads/workspace/janus/priors";
import fs from "node:fs"; import path from "node:path";
const [K, dir, invF, outF] = process.argv.slice(2);
const { readDocument } = await import(path.join(path.resolve(K), "native/reading.js")); const { localLexicon } = await import(path.join(path.resolve(K), "native/adapters/text/wiktionary-pack.js"));
const inv = JSON.parse(fs.readFileSync(invF, "utf8")).docs; const lx = localLexicon("en");
const nz = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]s\b/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const sub = (a, b) => (" " + b + " ").includes(" " + a + " ");
const res = { off: { forms: 0, exact: 0, face: 0, none: 0, entities: 0, distinct: 0, edges: 0 }, on: { forms: 0, exact: 0, face: 0, none: 0, entities: 0, distinct: 0, edges: 0 } };
const per = {};
for (const doc of Object.keys(inv)) {
  const text = fs.readFileSync(path.join(dir, doc + ".txt"), "utf8");
  for (const mode of ["off", "on"]) {
    const r = await readDocument(text, { language: "en", minCharacters: 0, lexicon: lx, ...(mode === "on" ? { castIdentity: true } : {}) });
    const ends = new Set(), faces = new Set(); for (const e of r.edges) { ends.add(nz(e.end1)); ends.add(nz(e.end2)); if (e.end1Face) faces.add(nz(e.end1Face)); if (e.end2Face) faces.add(nz(e.end2Face)); } ends.delete("");
    res[mode].edges += r.edges.length;
    for (const [name, forms] of Object.entries(inv[doc].entities)) {
      const mine = new Set(), mineF = new Set(); let any = false;
      for (const f of forms) {
        const n = nz(f); if (!text.includes(f)) continue; res[mode].forms++;
        if (ends.has(n)) res[mode].exact++; if (faces.has(n)) res[mode].face++;
        let hit = false; for (const e of ends) if (e.length >= 3 && (sub(n, e) || sub(e, n))) { hit = true; mine.add(e); }
        if (!hit) res[mode].none++; for (const e of faces) if (e.length >= 3 && (sub(n, e) || sub(e, n))) mineF.add(e);
        any = any || hit;
      }
      if (mine.size) { res[mode].entities++; res[mode].distinct += mine.size; } if (mineF.size) { res[mode].fEntities = (res[mode].fEntities ?? 0) + 1; res[mode].fDistinct = (res[mode].fDistinct ?? 0) + mineF.size; }
      (per[doc] ??= {})[name] ??= {}; per[doc][name][mode] = [...mine];
    }
  }
}
fs.writeFileSync(outF, JSON.stringify({ res, per }, null, 1));
const f = (m) => `${m}: forms ${res[m].forms}, exact edge end ${res[m].exact} (${(100 * res[m].exact / res[m].forms).toFixed(1)}%), exact face ${res[m].face}, in no edge ${res[m].none}, distinct ends per entity ${(res[m].distinct / res[m].entities).toFixed(2)} (${res[m].entities} entities), edges ${res[m].edges}, distinct faces per entity ${((res[m].fDistinct ?? 0) / (res[m].fEntities || 1)).toFixed(2)} (${res[m].fEntities ?? 0})`;
console.log(path.basename(dir), "|", f("off"), "|", f("on"));
