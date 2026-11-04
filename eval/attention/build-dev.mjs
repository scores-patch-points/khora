// eval/attention/build-dev.mjs — the DEVELOPMENT set for the attention binder: 24 hand-labelled binding cases from five frozen texts that
// are NOT the Eiffel / Concorde / Cumberland texts PARA-GOLD scores on. Labelled by reading the text and its neighbouring sentences BEFORE
// the binder was written; tuned on, never scored on. Each case addresses one token (`surface`, the `nth` occurrence of it inside `sentence`)
// by UTF-8 byte offsets into the frozen text file, recomputed here and checked unique.
//
//   PARAGOLD_DIR=<folder holding text/*.txt> node eval/attention/build-dev.mjs [--write]
//
// `kind`:  "attended"      the token refers to the document's attended subject → `accept` lists the cast surfaces a right binding may carry
//          "elsewhere"     the token refers to something else (an earlier-named other thing); the attended subject is WRONG, a typed gap is right
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.PARAGOLD_DIR;
if (!DIR) { console.log("build-dev: set PARAGOLD_DIR to the folder holding text/<doc>.txt (the frozen PARA-GOLD texts)."); process.exit(0); }

const SOL = "wiki-Statue_of_Liberty", ARCH = "wiki-Gateway_Arch", DAM = "wiki-Hoover_Dam", MISS = "wiki-Mississippi_River", A11 = "wiki-Apollo_11";
const C = (id, doc, sentence, surface, nth, kind, accept, note) => ({ id, doc, sentence, surface, nth, kind, accept, note });
export const CASES = [
  C("d01", SOL, "The statue was dedicated on October 28, 1886.", "The statue", 0, "attended", ["Statue of Liberty"], "definite description, head of the first sentence's own noun"),
  C("d02", SOL, "The statue was built in France, shipped overseas in crates, and assembled on the completed pedestal on what was then called Bedloe's Island.", "The statue", 0, "attended", ["Statue of Liberty"], "definite description"),
  C("d03", SOL, "The statue became an icon of freedom and of the United States, seen as a symbol of welcome to immigrants arriving by sea.", "The statue", 0, "attended", ["Statue of Liberty"], "definite description"),
  C("d04", SOL, "The statue was administered by the United States Lighthouse Board until 1901 and then by the Department of War; since 1933, it has been maintained by the National Park Service", "it", 0, "attended", ["Statue of Liberty"], "pronoun in a later clause, other names in the sentence"),
  C("d05", SOL, "This statue is believed to have been over 100 feet (30 m) high, and it similarly stood at a harbor entrance and carried a light to guide ships.", "it", 0, "elsewhere", ["Colossus of Rhodes"], "TRAP: refers to the ancient Colossus of Rhodes of the previous sentence"),
  C("d06", ARCH, "Clad in stainless steel and built in the form of a weighted catenary arch, it is the world's tallest arch and Missouri's tallest accessible structure.", "it", 0, "attended", ["Gateway Arch"], "pronoun after a participial phrase"),
  C("d07", ARCH, "Some sources consider it the tallest human-made monument in the Western Hemisphere.", "it", 0, "attended", ["Gateway Arch"], "object pronoun"),
  C("d08", ARCH, "The monument opened to the public on June 10, 1967.", "The monument", 0, "attended", ["Gateway Arch"], "definite description with a head noun that is not in the name (earned from the first sentence's predicate)"),
  C("d09", ARCH, "It is located at the 1764 site of the founding of St.", "It", 0, "attended", ["Gateway Arch"], "pronoun, sentence cut at an abbreviation"),
  C("d10", ARCH, "It called upon the federal government to foot three-quarters of the bill ($22.5 million).", "It", 0, "elsewhere", ["association"], "TRAP: refers to the association of the previous sentence, not the arch"),
  C("d11", ARCH, "It first convened on December 19 in St.", "It", 0, "elsewhere", ["commission"], "TRAP: refers to the commission of the previous sentence"),
  C("d12", DAM, "Its construction was the result of a massive effort involving thousands of workers, and cost over 96 lives.", "Its", 0, "attended", ["Hoover Dam"], "possessive"),
  C("d13", DAM, "The dam's generators provide power for public and private utilities in Nevada, Arizona, and California.", "The dam", 0, "attended", ["Hoover Dam"], "definite description with a possessive clitic"),
  C("d14", DAM, "Bills passed by Congress during its construction referred to it as Hoover Dam (after President Herbert Hoover), but the Roosevelt administration named it Boulder Dam.", "its", 0, "attended", ["Hoover Dam"], "possessive, other names in the sentence"),
  C("d15", DAM, "Edison allowed land options it held on the river to lapse—including an option for what became the site of Hoover Dam.", "it", 0, "elsewhere", ["Southern California Edison", "Edison"], "TRAP: refers to the company Edison, in the sentence"),
  C("d16", DAM, "The river would carry off the smaller pieces of debris, and a dam would be built incorporating the remaining rubble.", "The river", 0, "attended", ["Colorado River"], "definite description whose referent is a river of the surrounding passage; the dam is not the answer"),
  C("d17", MISS, "It is the second-longest river in the U.S. after the Missouri.", "It", 0, "attended", ["Mississippi River"], "pronoun"),
  C("d18", MISS, "From its traditional source of Lake Itasca in northern Minnesota, it flows generally south for 2,340 miles (3,770 km) to the Mississippi River Delta in the Gulf of Mexico.", "it", 0, "attended", ["Mississippi River"], "pronoun with other names in the sentence"),
  C("d19", MISS, "The river either borders or passes through the states of Minnesota, Wisconsin, Iowa, Illinois, Missouri, Kentucky, Tennessee, Arkansas, Mississippi, and Louisiana.", "The river", 0, "attended", ["Mississippi River"], "definite description, a state called Mississippi in the sentence"),
  C("d20", MISS, "The river also became the subject of American literature, particularly in the writings of Mark Twain.", "The river", 0, "attended", ["Mississippi River"], "definite description"),
  C("d21", MISS, "With the Louisiana Purchase and the country's westward expansion, it became a convenient boundary line between the western and eastern halves of the country.", "it", 0, "attended", ["Mississippi River"], "pronoun after a prepositional phrase"),
  C("d22", A11, "It fulfilled a national goal set by President John F.", "It", 0, "attended", ["Apollo 11"], "pronoun, sentence cut at an initial"),
  C("d23", A11, "The mission was crewed by Commander Neil Armstrong, Command Module Pilot Michael Collins, and Lunar Module Pilot Edwin \"Buzz\" Aldrin, all of whom were on their second and", "The mission", 0, "attended", ["Apollo 11"], "definite description with a head noun not in the name (the first sentence says 'the American spaceflight')"),
  C("d24", A11, "Its success demonstrated that the USSR could potentially deliver nuclear weapons over intercontinental distances", "Its", 0, "elsewhere", ["Sputnik 1"], "TRAP: refers to Sputnik 1 of the previous sentence"),
];

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const out = { schema: "AttentionDev@1", created: "2026-11-03", note: "development set; tuned on, never scored on", cases: [], texts: {} };
for (const c of CASES) {
  const file = path.join(DIR, "text", c.doc + ".txt");
  const buf = fs.readFileSync(file);
  out.texts[c.doc] = sha(buf);
  const text = buf.toString("utf8");
  const at = text.indexOf(c.sentence);
  if (at < 0) throw new Error(`${c.id}: sentence not found in ${c.doc}`);
  if (text.indexOf(c.sentence, at + 1) >= 0) throw new Error(`${c.id}: sentence not unique in ${c.doc}`);
  // the nth WHOLE-WORD occurrence of the surface inside the sentence (a bare indexOf found "it" inside "United")
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${c.surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "gu");
  const hits = [...c.sentence.matchAll(re)];
  if (!hits[c.nth]) throw new Error(`${c.id}: token not in sentence`);
  const k = at + hits[c.nth].index;
  const sb = Buffer.byteLength(text.slice(0, at)), tb = Buffer.byteLength(text.slice(0, k));
  out.cases.push({ id: c.id, doc: c.doc, start: sb, end: sb + Buffer.byteLength(c.sentence), text: c.sentence, surface: c.surface, tokenStart: tb, tokenEnd: tb + Buffer.byteLength(c.surface), kind: c.kind, accept: c.accept, note: c.note });
}
const json = JSON.stringify(out, null, 1) + "\n";
console.log(`build-dev: ${out.cases.length} cases (${out.cases.filter((c) => c.kind === "attended").length} attended, ${out.cases.filter((c) => c.kind === "elsewhere").length} elsewhere), sha256 ${sha(Buffer.from(json))}`);
if (process.argv.includes("--write")) { fs.writeFileSync(path.join(HERE, "DEV-SET.json"), json); console.log("wrote DEV-SET.json"); }
