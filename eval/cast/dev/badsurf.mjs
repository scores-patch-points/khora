process.env.KHORA_PRIORS_DIR ??= process.env.HOME + "/Downloads/workspace/janus/priors";
import fs from "node:fs"; import path from "node:path";
const K = (process.env.KDIR ?? process.env.HOME + "/Documents/khora-cast/khora") + "/native/";
const { readDocument } = await import(K + "reading.js"); const { localLexicon } = await import(K + "adapters/text/wiktionary-pack.js");
const [dir, mode] = process.argv.slice(2); let bad = 0, tot = 0; const ex = new Set();
for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".txt"))) {
  const r = await readDocument(fs.readFileSync(path.join(dir, f), "utf8"), { language: "en", minCharacters: 0, lexicon: localLexicon("en"), ...(mode === "on" ? { castIdentity: true } : {}) });
  for (const c of r.cast) { tot++; const all = [c.surface, ...c.allSurfaces]; if (all.some(s => /[^\p{L}\p{N}]$/u.test(s))) { bad++; if (ex.size < 6) ex.add(f.slice(5, 20) + ":" + JSON.stringify(all.filter(s => /[^\p{L}\p{N}]$/u.test(s)))); } }
}
console.log(dir, mode, "beings", tot, "with a surface ending in non-alphanumeric", bad, [...ex].join(" "));
