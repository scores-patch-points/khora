// does the repair read an English prior for another language? node langguard.mjs <priors dir> <lang> <text file>
process.env.KHORA_PRIORS_DIR = process.argv[2];
import fs from "node:fs";
const K = process.env.HOME + "/Documents/khora-cast/khora/native/";
const { readDocument } = await import(K + "reading.js");
const [, , , lang, file] = process.argv; const text = fs.readFileSync(file, "utf8");
const r = await readDocument(text, { language: lang, minCharacters: 0, lexicon: false, castIdentity: true });
const g = (r.gaps || []).map(x => x.gap); const c = r.castIdentity;
console.log(lang, "| language.source:", r.language.source, "stem:", r.language.stem, "| gaps:", [...new Set(g)].join(",") || "none", "| noPosGap:", g.includes("cast_identity_no_pos_prior"), "| rescued", c.rescued.length, "dropped", c.dropped.length, "folded", c.folded.length, "claimed", c.claimed.length, "| edges", JSON.stringify({ rewritten: c.edges?.rewritten, split: c.edges?.split }));
