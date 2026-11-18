#!/usr/bin/env node
// scripts/embed-given-names.mjs — embed every given-name label of the Wikidata snapshot into the vector library (nomic-embed-text, "classification: " prefix). PREREG-ROUND20 NOTE-5.
import fs from "node:fs"; import path from "node:path"; import { pathToFileURL, fileURLToPath } from "node:url";
const KH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const { makeEmbedder } = await import(pathToFileURL(path.join(KH, "native/adapters/text/embed-personhood.js")).href);
const j = JSON.parse(fs.readFileSync(path.join(KH, "identity/givers/wikidata-given-names-en.json"), "utf8")); const U = new Set(j.unisex); const F = new Set(j.female), M = new Set(j.male);
const names = [...new Set([...j.male, ...j.female])].filter((n) => !(M.has(n) && F.has(n)) && !U.has(n)); console.log("names to embed", names.length);
const emb = makeEmbedder(); const t0 = Date.now(); for (let i = 0; i < names.length; i += 2000) { await emb.embed(names.slice(i, i + 2000)); emb.save(); console.log("embedded", Math.min(names.length, i + 2000), "of", names.length, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } console.log("done");
