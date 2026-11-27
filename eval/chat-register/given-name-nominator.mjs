// EXPLORATORY (written before the run; gold = UD English PUD's own UPOS, the test treebank, 1,000 sentences, not used to build the table or the snapshot). THE READER SESSION'S DESIGN (2026-11-24): a
// sentence-initial capitalised word the parser tags as an ordinary word (Riley/ADJ, Avery/DET, Taylor/NOUN) may be a name; a GIVER NOMINATES it and the parse JUDGES. The nominator here is
// isGivenName (the given-name table, then the Wikidata snapshot). Its cost is the false nomination ("Will", "Mark", "May", "Grace", "Bill" begin ordinary sentences). Measured on every sentence-initial
// capitalised token: how many it nominates, how many of those are proper nouns in the gold, and what the judge would have to refuse. Also, of the gold sentence-initial proper nouns, how many the nominator finds.
//   node eval/chat-register/given-name-nominator.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const FILE = process.env.PUD ?? "/Users/mlacy/Downloads/workspace/ud-treebanks/UD_English-PUD/en_pud-ud-test.conllu";
const { makeDefaultNameGenderPrior } = await import("file://" + ROOT + "/native/adapters/text/gender-of-words.js"), P = makeDefaultNameGenderPrior({});
const wilson = (k, n) => { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(2), +((c + m) / d).toFixed(2)]; };
const first = []; let sent = null;
for (const line of fs.readFileSync(FILE, "utf8").split("\n")) { if (line === "") { sent = null; continue; } if (line.startsWith("#")) continue; const c = line.split("\t"); if (!/^\d+$/.test(c[0])) continue; if (!sent) { sent = true; first.push({ form: c[1], upos: c[3], next: null }); } }   // regex-ok: a CoNLL-U token id
const cap = first.filter((t) => /^\p{Lu}/u.test(t.form)), nominated = cap.filter((t) => P.isGivenName(t.form).is), goldPropn = cap.filter((t) => t.upos === "PROPN"), found = goldPropn.filter((t) => P.isGivenName(t.form).is);
const right = nominated.filter((t) => t.upos === "PROPN"), wrong = nominated.filter((t) => t.upos !== "PROPN");
const out = { stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY (UD English PUD test treebank; not used to build the table or the snapshot)", commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })(), file: FILE },
  sentences: first.length, capitalisedInitial: cap.length, nominated: nominated.length, nominatedAreNames: { right: right.length, of: nominated.length, wilson: wilson(right.length, nominated.length) }, goldInitialProperNouns: goldPropn.length, found: { right: found.length, of: goldPropn.length, wilson: wilson(found.length, goldPropn.length) },
  falseNominations: wrong.map((t) => `${t.form}/${t.upos}`), missedNames: goldPropn.filter((t) => !P.isGivenName(t.form).is).map((t) => t.form).slice(0, 40) };
fs.writeFileSync(path.join(HERE, "given-name-nominator.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`${first.length} sentences; ${cap.length} begin with a capital; the nominator nominates ${nominated.length}: ${right.length} are proper nouns in the gold (${JSON.stringify(out.nominatedAreNames.wilson)}), ${wrong.length} are not: ${out.falseNominations.join(", ")}\nof the ${goldPropn.length} sentence-initial proper nouns in the gold it finds ${found.length} (${JSON.stringify(out.found.wilson)}); missed (first 40): ${out.missedNames.join(", ")}`);
