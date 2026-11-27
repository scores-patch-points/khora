// EXPLORATORY. The module AS SHIPPED (native/adapters/text/gender-of-words.js over the table built by scripts/build-name-gender-dictionary.mjs) scored on the same gold as
// name-gender-giver.mjs: the pronouns a held-out novel binds to a named being (8+, 90% one side), by the being's most frequent surface form. The FRESH rows were read before
// (name-gender-giver.mjs ran on them once, with the rules frozen); scoring the module on them again is a REUSED scoring and is labelled so. Beats the last-letter baseline?
//   node eval/chat-register/gender-module-score.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", ".."), K = pathToFileURL(path.join(ROOT, "native") + "/").href;
const { makeNameGenderPrior, loadNameGenderDictionary } = await import(K + "adapters/text/gender-of-words.js"); const { snapshotGiverFrom, Q } = await import(K + "adapters/text/wikidata-name-giver.js");
const dictionary = loadNameGenderDictionary(); if (!dictionary) { console.error("no table: run scripts/build-name-gender-dictionary.mjs"); process.exit(2); }
const wilson = (k, n) => { if (!n) return [0, 0]; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.round(100 * (c - w) / d), Math.round(100 * (c + w) / d)]; };
const snapshot = snapshotGiverFrom(path.join(ROOT, "identity/givers/wikidata-given-names-en.json"));
const variants = { "title and name": makeNameGenderPrior({ dictionary }), "title, name, then the snapshot": makeNameGenderPrior({ dictionary, snapshot, snapshotIds: { male: Q.male, female: Q.female, unisex: Q.unisex } }) };
const out = { stamp: { when: new Date().toISOString(), split: "DEV and FRESH (the fresh books were scored before by name-gender-giver.mjs: this is a REUSED scoring); EXPLORATORY" } };
for (const [name, prior] of Object.entries(variants)) for (const split of ["dev", "fresh", "test", "pooled"]) {
  if (split !== "pooled" && !fs.existsSync(path.join(HERE, `name-gender-giver.${split}.json`))) continue;
  const rows = (split === "pooled" ? ["dev", "fresh", "test"].filter((x) => fs.existsSync(path.join(HERE, `name-gender-giver.${x}.json`))) : [split]).flatMap((s) => JSON.parse(fs.readFileSync(path.join(HERE, `name-gender-giver.${s}.json`), "utf8")).rows);
  const scored = rows.map((r) => ({ ...r, e: prior.explain(String(r.name).split(/\s+/)) })), says = scored.filter((r) => r.e.gender), right = says.filter((r) => r.e.gender === r.gold), ending = rows.filter((r) => r.ending === "m" || r.ending === "f"), endingRight = ending.filter((r) => r.ending === r.gold);
  const bySrc = {}; for (const r of says) { const k = r.e.source; (bySrc[k] ??= { says: 0, right: 0 }).says++; if (r.e.gender === r.gold) bySrc[k].right++; }
  const [lo, hi] = wilson(right.length, says.length), [bl, bh] = wilson(endingRight.length, ending.length);
  (out[name] ??= {})[split] = { gold: rows.length, says: says.length, coverage: +(says.length / rows.length).toFixed(2), right: right.length, rightRate: says.length ? +(right.length / says.length).toFixed(2) : null, ci95: [lo, hi], bySource: bySrc, endingBaseline: { says: ending.length, right: endingRight.length, ci95: [bl, bh] }, wrong: says.filter((r) => r.e.gender !== r.gold).map((r) => `${r.name} (text ${r.gold}, ${r.e.source}: ${r.e.word})`) };
  const o = out[name][split]; console.log(`${name.padEnd(32)} ${split.padEnd(7)} says ${String(o.says).padStart(3)} of ${String(o.gold).padStart(3)} (${(o.coverage * 100).toFixed(0)}%), right ${o.right} = ${o.rightRate != null ? (o.rightRate * 100).toFixed(0) : "-"}% [${lo}-${hi}]; baseline ${(100 * endingRight.length / ending.length).toFixed(0)}% [${bl}-${bh}]; by source ${JSON.stringify(bySrc)}`);
}
console.log("\nwrong (title and name, pooled):", out["title and name"].pooled.wrong.join("; "));
fs.writeFileSync(path.join(HERE, "gender-module-score.json"), JSON.stringify(out, null, 1));
