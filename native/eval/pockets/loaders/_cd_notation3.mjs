// loaders/_cd_notation3.mjs — music notation (ABC notes, lieder lyric syllables, LilyPond), diagram languages (BPMN lineages, DOT, Mermaid, SBGN) and taxonomic treatments.
import fs from "node:fs";
import zlib from "node:zlib";
import { codeText, proseSentences, proseLine, markCase, newStats, sumStats, takeDocs, makePocket, entry, readText, sortedFiles } from "./_cd_util.mjs";
import { NOTATION } from "./_cd_notation1.mjs";

const ABC = `${NOTATION}/music_abc/derived`, LY = `${NOTATION}/music_abc/raw/mutopia`, UB = `${NOTATION}/uml_bpmn/corpus`, TX = `${NOTATION}/taxonomy/corpus`;
const abcFiles = (src) => (fs.existsSync(ABC) ? sortedFiles(ABC, (f) => f.startsWith(src + "__") && f.endsWith(".abc")) : []);
const FIELD = /^[A-Za-z]:/;

/** ABC music line -> note/rest/chord tokens (bar lines, decorations "!..!", quoted chord symbols, inline fields and slur parens removed). */
export function abcNotes(text) {
  const units = [];
  for (const raw of text.split("\n")) {
    if (!raw || raw[0] === "%" || FIELD.test(raw)) continue;
    const s = raw.replace(/"[^"]*"/g, " ").replace(/![^!]*!/g, " ").replace(/\[[A-Za-z]:[^\]]*\]/g, " ").replace(/[|:]*\|[|:\]]*|\[\||[(){}]/g, " ");
    const u = s.split(/\s+/).filter((t) => /[A-Ga-gz]/.test(t) && !/^[A-Za-z]:/.test(t)).map(markCase);
    if (u.length) units.push(u);
  }
  return units;
}
export const abcLyrics = (text) => text.split("\n").filter((l) => l.startsWith("w:")).map((l) => proseLine(l.slice(2), newStats())).filter((u) => u.length);

function filePocket(id, files, toUnits, o) {
  return entry(id, () => {
    const per = new Map(), r = takeDocs(id, files, (f, i) => { const s = newStats(); const u = toUnits(f, s); per.set(i, s); return u; });
    return makePocket({ id, register: o.register, language: o.language, script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: o.tokenisation, docDef: o.docDef ?? "one file = one document; whole files in sha256(id:fileIndex) order (files sorted by name)", source: o.source,
      notes: `${o.notes ?? ""} ${r.docKeys.length} files taken of ${files.length}; counters ${JSON.stringify(sumStats(r.docKeys.map((i) => per.get(i)).filter(Boolean)))}`.trim() } });
  });
}
const ABC_TOK = "ABC music-line tokens: whitespace-separated note/rest/chord items with pitch, accidental, octave case and duration kept in one token (e3/2, ^f, [ceg]2); header fields, w: lyric lines, bar lines, slur parentheses, decorations and quoted chord symbols removed; each uppercase letter X written as U+00B7+x (ABC octave: C lower, c higher); unit = one printed music line";
const ABC_NOTE = "ABC here is DERIVED from MusicXML by the notation project's converter (derived/*.abc), not hand-authored ABC";

export function notation3Entries() {
  const out = [];
  if (fs.existsSync(ABC)) {
    for (const [src, label, reg] of [["openscore_lieder", "OpenScore Lieder (voice and piano)", "lieder"], ["openscore_quartets", "OpenScore string quartets", "quartets"]])
      out.push(filePocket(`cd-abc-${reg}`, abcFiles(src), (f, s) => { const u = abcNotes(readText(f)); s.tokens += u.reduce((n, x) => n + x.length, 0); return u; },
        { register: "notation", language: "x-abc", tokenisation: ABC_TOK, source: `${ABC}/${src}__*.abc (${label})`, notes: ABC_NOTE + "; score pitch class and rhythm only (no lyrics)." }));
    out.push(filePocket("cd-abc-lyrics", abcFiles("openscore_lieder"), (f, s) => { const u = abcLyrics(readText(f)); s.tokens += u.reduce((n, x) => n + x.length, 0); return u; },
      { register: "lyrics", language: "mul", tokenisation: "lyric syllables from the w: lines of the derived ABC: letter/mark runs (apostrophes inside kept), lowercased NFC; melisma '*' and hyphen/space syllable breaks dropped, so the grain is the SYLLABLE not the word (word boundaries are not recoverable); unit = one lyric line",
        source: `${ABC}/openscore_lieder__*.abc w: lines`, notes: "sung text of OpenScore Lieder (mostly German with some French/English/Italian: language 'mul'); " + ABC_NOTE }));
  }
  if (fs.existsSync(LY)) out.push(filePocket("cd-lilypond", sortedFiles(LY, (f) => f.endsWith(".ly")), (f, s) => codeText(readText(f), s),
    { register: "notation", language: "x-lilypond", tokenisation: "LilyPond source read as code: runs of letters/marks/digits/underscore lowercased (note+duration such as d8 stay glued; octave marks, ties and slurs are punctuation and dropped); numeric-initial tokens dropped; unit = physical line", source: `${LY}/*.ly (Mutopia Project scores, hand-authored LilyPond)`, notes: "includes the header block with title/composer text" }));
  const MX = `${NOTATION}/music_abc/raw`;
  if (fs.existsSync(`${MX}/scorewriter`)) {
    const xml = ["scorewriter", "zenodo_ciciban", "zenodo_leone"].flatMap((d) => sortedFiles(`${MX}/${d}`, (f) => /\.(xml|musicxml)$/.test(f)));
    out.push(filePocket("cd-musicxml", xml, (f, s) => codeText(readText(f), s), { register: "notation", language: "x-musicxml", tokenisation: "MusicXML read as code: runs of letters/marks/digits/underscore lowercased NFC (element and attribute names, step letters, lyric words); numeric-initial tokens dropped (octave, duration and pitch numbers vanish); unit = physical line",
      source: `${MX}/{scorewriter,zenodo_ciciban,zenodo_leone}/*.xml (${xml.length} MusicXML files exported by Dorico, Finale, MuseScore, Sibelius)`, notes: "tool-exported score XML; lyric text inside <text> elements is included as words" }));
  }
  if (fs.existsSync(`${MX}/mscx`)) out.push(filePocket("cd-mscx", sortedFiles(`${MX}/mscx`, (f) => f.endsWith(".mscx")), (f, s) => codeText(readText(f), s), { register: "notation", language: "x-mscx", tokenisation: "MuseScore .mscx XML read as code (same rule as cd-musicxml)", source: `${MX}/mscx/*.mscx (24 MuseScore 3 score files)`, notes: "native MuseScore XML; style/layout elements dominate the vocabulary" }));
  if (fs.existsSync(UB)) {
    const all = ["train", "dev", "test"].flatMap((s) => sortedFiles(`${UB}/${s}`, (f) => f.endsWith(".txt")));
    const D = [["bpmn-miwg", /\/bpmn-miwg-test-suite--/, "BPMN 2.0 XML, BPMN Model Interchange Working Group test suite (many vendors' exporters)", "diagram"], ["bpmn-kogito", /\/kogito-(runtimes|examples)--/, "BPMN 2.0 XML from Kogito (jBPM lineage)", "diagram"],
      ["bpmn-activiti", /\/(Activiti|flowable-engine)--/, "BPMN 2.0 XML from Activiti and Flowable (Activiti lineage)", "diagram"], ["bpmn-camunda", /\/(camunda-bpm-platform|camunda-modeler|bpmn-moddle)--/, "BPMN 2.0 XML from Camunda and bpmn-io (Camunda lineage)", "diagram"],
      ["dot", /\/dot-/, "Graphviz DOT graphs from GitHub", "diagram"], ["mermaid", /\/mermaid--/, "Mermaid diagram sources", "diagram"], ["sbgn", /\/libsbgn--/, "SBGN-ML process-description XML (libsbgn)", "diagram"]];
    for (const [k, re, label, reg] of D) out.push(filePocket(`cd-${k}`, all.filter((f) => re.test(f)), (f, s) => codeText(readText(f), s),
      { register: reg, language: `x-${k.split("-")[0]}`, tokenisation: "XML/DOT/Mermaid read as code: runs of letters/marks/digits/underscore lowercased NFC (tag names, attribute names and values, labels, hex ids); numeric-initial tokens dropped (ids that begin with a digit vanish), tokens > 64 characters dropped; unit = physical line", source: `${UB}/{train,dev,test}/*.txt (${label})`,
        notes: "machine-generated or tool-exported diagram files; ids and GUID fragments are word-like literals" }));
  }
  if (fs.existsSync(`${TX}/train.jsonl.gz`)) out.push(entry("cd-taxon-en", () => {
    const docs = ["train", "dev", "test"].flatMap((s) => zlib.gunzipSync(fs.readFileSync(`${TX}/${s}.jsonl.gz`)).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))).filter((d) => d.lang === "en");
    const per = new Map(), r = takeDocs("cd-taxon-en", docs, (d, i) => { const s = newStats(); const u = proseSentences(d.text, s); per.set(i, s); return u; });
    return makePocket({ id: "cd-taxon-en", register: "academic", language: "en", script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: "prose words: letters/marks/digits/underscore runs with inner apostrophes, lowercased NFC, numeric-initial tokens dropped; unit = sentence/citation line (paragraph re-joined, split after . ! ? + whitespace)", docDef: "one taxonomic treatment = one document; whole treatments in sha256(id:index) order",
      source: `${TX}/{train,dev,test}.jsonl.gz, lang=en only (${docs.length} treatments)`, notes: `Plazi TreatmentBank (CC0) taxonomic treatments: synonymy lists with author-year citations, type material, localities, descriptions; ${r.docKeys.length} treatments taken; counters ${JSON.stringify(sumStats(r.docKeys.map((i) => per.get(i))))}` } });
  }));
  return out;
}
