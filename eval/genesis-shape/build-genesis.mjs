// scratch: Genesis from christos-c/bible-corpus (CC0) -> genesis-all.json { name: { iso, verses: { "GEN.c.v": text } } }. A file-format reader, not a reading of language.
import fs from "node:fs";
const dir = "corpus/bibles", out = {}; let skipped = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".xml"))) {
  const x = fs.readFileSync(`${dir}/${f}`, "utf8"), iso = (x.match(/<language[^>]*iso639="([^"]+)"/) ?? x.match(/<language[^>]*id="([^"]+)"/) ?? [])[1] ?? null; // regex-ok: XML attributes of a corpus file format
  const verses = {}; for (const m of x.matchAll(/<seg id="b\.GEN\.(\d+)\.(\d+)"[^>]*>([\s\S]*?)<\/seg>/g)) { const t = m[3].replace(/\s+/g, " ").trim(); if (t) verses[`GEN.${m[1]}.${m[2]}`] = t; } // regex-ok: verse ids of the corpus file format
  if (Object.keys(verses).length < 100) { skipped.push(f); continue; } out[f.replace(/\.xml$/, "")] = { iso, verses };
}
fs.writeFileSync("genesis-all.json", JSON.stringify(out)); console.log(Object.keys(out).length, "editions with Genesis;", skipped.length, "without"); console.log(Object.entries(out).map(([n, v]) => `${n}:${v.iso}:${Object.keys(v.verses).length}`).join(" ").slice(0, 1500));
