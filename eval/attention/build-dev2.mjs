// eval/attention/build-dev2.mjs — the ROUND-2 DEVELOPMENT set: the 24 round-1 dev cases (DEV-SET.json, unchanged), the 15 PARA-GOLD v0 binding cases
// (SPENT: scored once in round 1, now development material), and 22 new hand-labelled cases, mostly traps, from texts of the same frozen folder.
// Tuned on, never scored on. Round-2 scoring is on a fresh set released by the parent session after this code is frozen.
//
//   PARAGOLD_DIR=<folder holding text/*.txt and PARA-GOLD.json> node eval/attention/build-dev2.mjs [--write]
//
// `kind` attended | elsewhere | out_of_scope. `trapKind` (elsewhere only): entity (the antecedent is a thing the previous sentence introduced), event (the antecedent
// is a clause or an event), competing (another non-person candidate is named in the sentence), expletive (no referent at all).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.PARAGOLD_DIR;
if (!DIR) { console.log("build-dev2: set PARAGOLD_DIR."); process.exit(0); }
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const wholeWord = (s) => new RegExp(`(?<![\\p{L}\\p{N}])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "gu");

const N = (id, doc, sentence, surface, kind, accept, trapKind, note) => ({ id, doc, sentence, surface, nth: 0, kind, accept, trapKind, note });
const RU = "wiki-Mount_Rushmore", EI = "wiki-Eiffel_Tower", SO = "wiki-Statue_of_Liberty", GA = "wiki-Gateway_Arch", CO = "wiki-Concorde", MI = "wiki-Mississippi_River", HO = "wiki-Hoover_Dam", A = "wiki-Apollo_11";
const NEW = [
  N("n01", RU, "Its elevation at its highest point is 5,725 feet (1,745 m) above sea level.", "Its", "attended", ["Mount Rushmore"], null, "possessive"),
  N("n02", RU, "The sculpture at Mount Rushmore was built on land that was taken from the Sioux Nation in the 1870s.", "The sculpture", "attended", ["Mount Rushmore"], null, "description with a head noun not in the name"),
  N("n03", RU, "This conflict continues, leading some critics of the monument to refer to it as a", "it", "attended", ["Mount Rushmore"], null, "object pronoun after a demonstrative subject"),
  N("n04", RU, "It was conceived to commemorate the Native American leader while also serving as a response to Mount Rushmore.", "It", "elsewhere", ["Crazy Horse Memorial"], "competing", "the attended name is IN the sentence, the antecedent is another memorial"),
  N("n05", RU, "It was kept intact after the 1941 opening of the memorial", "It", "elsewhere", ["Sculptor's Studio"], "entity", "the studio of the previous sentence"),
  N("n06", EI, "Its base is square, measuring 125 metres (410 ft) on each side.", "Its", "attended", ["Eiffel Tower"], null, "possessive"),
  N("n07", EI, "It was originally reddish brown; this changed in 1968", "It", "attended", ["Eiffel Tower"], null, "attended although the previous sentence is about engravings"),
  N("n08", EI, "It was removed due to structural considerations", "It", "elsewhere", ["restaurant"], "entity", "the restaurant of the previous sentence"),
  N("n09", EI, "It was run by the multi-Michelin star chef Alain Ducasse", "It", "elsewhere", ["restaurant"], "entity", "the restaurant of the previous sentence"),
  N("n10", SO, "It was originally to be crowned with a pileus", "It", "elsewhere", ["Crawford's statue"], "entity", "another statue"),
  N("n11", SO, "It was thus, as he put it in a letter to Laboulaye", "It", "elsewhere", ["island"], "entity", "the island of the previous sentence"),
  N("n12", SO, "Sketches and models were made of the proposed work, though it was never erected.", "it", "elsewhere", ["proposed work"], "entity", "a noun of the same sentence"),
  N("n13", GA, "It was slated to be inserted at 10:00 a.m. local time", "It", "elsewhere", ["keystone"], "entity", "the keystone"),
  N("n14", GA, "On March 28 the Senate bill was reported out, and on April 5 it was turned over to the House Library Committee", "it", "elsewhere", ["Senate bill"], "entity", "the bill; the arch's association is not the subject"),
  N("n15", CO, "It was later revealed that the original STAC report", "It", "elsewhere", ["none"], "expletive", "extraposition with that"),
  N("n16", CO, "It has been pointed out that other, lower-flying, airliners", "It", "elsewhere", ["none"], "expletive", "extraposition with that"),
  N("n17", MI, "It was thought that the river's velocity would scour off bottom sediments", "It", "elsewhere", ["none"], "expletive", "extraposition with that"),
  N("n18", "hoover-project", "It took less than five years, in a harsh and barren land, to build the largest dam of its time.", "It", "elsewhere", ["none"], "expletive", "took … to: no complementizer 'that'; a known limit of the expletive rule"),
  N("n19", HO, "It took nine years (1938–47) under relative secrecy to complete the supplemental grout curtain.", "It", "elsewhere", ["none"], "expletive", "took … to: a known limit of the expletive rule"),
  N("n20", "miss-nps", "It takes about three months for water that leaves Lake Itasca", "It", "elsewhere", ["none"], "expletive", "takes … for: a known limit of the expletive rule"),
  N("n21", A, "Armstrong's moonwalk was broadcast live to an estimated 600 million viewers, roughly one-fifth of the world's population, making it among the most-watched", "it", "elsewhere", ["moonwalk"], "event", "the broadcast event"),
  N("n22", A, "It was then taken to Hickham Air Force Base", "It", "elsewhere", ["Columbia"], "entity", "the command module of the previous sentence"),
];

const out = { schema: "AttentionDev@2", created: "2026-11-03", note: "round-2 development set; tuned on, never scored on; includes the SPENT PARA-GOLD v0 binding cases and the round-1 dev cases", cases: [], texts: {} };
const textOf = (doc) => { const buf = fs.readFileSync(path.join(DIR, "text", doc + ".txt")); out.texts[doc] = sha(buf); return { buf, text: buf.toString("utf8") }; };
const place = (c, text, buf, at, spanLen) => {
  const hits = [...text.slice(at, at + spanLen).matchAll(wholeWord(c.surface))];
  if (!hits[c.nth ?? 0]) throw new Error(`${c.id}: token not in sentence`);
  const k = at + hits[c.nth ?? 0].index;
  const tb = Buffer.byteLength(text.slice(0, k));
  return { tokenStart: tb, tokenEnd: tb + Buffer.byteLength(c.surface) };
};
// 1 · round-1 development cases, unchanged (their hand labels and addresses)
for (const c of JSON.parse(fs.readFileSync(path.join(HERE, "DEV-SET.json"), "utf8")).cases) {
  textOf(c.doc);
  out.cases.push({ ...c, trapKind: c.kind === "elsewhere" ? ({ d05: "entity", d10: "entity", d11: "entity", d15: "competing", d24: "entity" }[c.id]) : null, origin: "dev-1" });
}
// 2 · the spent PARA-GOLD v0 binding cases
const gold = JSON.parse(fs.readFileSync(path.join(DIR, "PARA-GOLD.json"), "utf8"));
for (const b of gold.binding) {
  const { buf, text } = textOf(b.doc);
  const at = buf.subarray(0, b.start).toString("utf8").length, len = buf.subarray(b.start, b.end).toString("utf8").length;
  const kind = b.id === "b09" ? "elsewhere" : b.id === "b08" ? "out_of_scope" : "attended";
  out.cases.push({ id: b.id, doc: b.doc, start: b.start, end: b.end, text: b.text, surface: b.surface, ...place({ id: b.id, surface: b.surface }, text, buf, at, len), kind, trapKind: b.id === "b09" ? "event" : null, accept: [b.referent], note: b.note, origin: "gold-v0-spent" });
}
// 3 · the new cases
for (const c of NEW) {
  const { buf, text } = textOf(c.doc);
  const at = text.indexOf(c.sentence);
  if (at < 0) throw new Error(`${c.id}: sentence not found`);
  if (text.indexOf(c.sentence, at + 1) >= 0) throw new Error(`${c.id}: sentence not unique`);
  const sb = Buffer.byteLength(text.slice(0, at));
  out.cases.push({ id: c.id, doc: c.doc, start: sb, end: sb + Buffer.byteLength(c.sentence), text: c.sentence, surface: c.surface, ...place(c, text, buf, at, c.sentence.length), kind: c.kind, trapKind: c.trapKind, accept: c.accept, note: c.note, origin: "dev-2" });
}
const json = JSON.stringify(out, null, 1) + "\n";
const n = (f) => out.cases.filter(f).length;
console.log(`build-dev2: ${out.cases.length} cases: ${n((c) => c.kind === "attended")} attended, ${n((c) => c.kind === "elsewhere")} traps (${["entity", "event", "competing", "expletive"].map((k) => k + " " + n((c) => c.trapKind === k)).join(", ")}), ${n((c) => c.kind === "out_of_scope")} out of scope; sha256 ${sha(Buffer.from(json))}`);
if (process.argv.includes("--write")) { fs.writeFileSync(path.join(HERE, "DEV-SET-2.json"), json); console.log("wrote DEV-SET-2.json"); }
