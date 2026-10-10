// eval/notation-competence/music_abc-build-priors.mjs — builds the two RECEIVED priors of the music adapter.
//
//   priors/notation-music_abc-standard.json   tables from named standards; NO TRAIN counts (every table names its giver)
//   priors/notation-music_abc-lexicon.json    counts from TRAIN only: signature weights, thresholds, documentary vocabulary counts
//
// Run:  node eval/notation-competence/music_abc-build-priors.mjs
// Inputs: the corpus manifest (TRAIN rows only are read for the lexicon), giver/musicxml-xsd-facts.json (a facts extract of the W3C
// MusicXML 4.1 XSD, scripts/xsd_facts.py). The standard prior states which of its sections are facts from a giver and which are
// declared by this card (a declared choice is labelled "declared", never presented as received).
//
// THE ONLY THRESHOLD RULES (every threshold is declared or derived, P4):
//   weight_f   = max(0, ln( (pos_f + .5)/(N_pos + 1) ) - ln( (neg_f + .5)/(N_neg + 1) ) )   (TRAIN log-odds, Laplace; a feature that
//                does not separate positives from negatives weighs nothing)
//   tau_s      = (max over TRAIN negatives of score_s) + 1 nat                                (derived from TRAIN negatives)
//   min_features = 2 distinct signature features per system (declared: one witness is not an identification — the same principle as
//                "capitalisation is ONE witness" in the language cards)
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadManifest, loadText, verifyEntry, CORPUS_DIR } from "./music_abc-io.mjs";
import { preparePriors, PRIOR_DIR, SYSTEMS } from "../../adapters/notation/music_abc.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const XSD_FACTS = path.join(CORPUS_DIR, "giver/musicxml-xsd-facts.json");
const PREFIX = 4096;
const DATE = "2026-10-06";

// ── ABC 2.1 (giver: the standard; facts only — its text is CC BY-NC-SA 3.0 and is not reproduced) ────────────────────────
const INFO_FIELDS = {
  A: "area", B: "book", C: "composer", D: "discography", F: "file_url", G: "group", H: "history", I: "instruction", K: "key", L: "unit_note_length",
  M: "meter", m: "macro", N: "notes", O: "origin", P: "parts", Q: "tempo", R: "rhythm", r: "remark", S: "source", s: "symbol_line", T: "title",
  U: "user_defined", V: "voice", W: "words_after", w: "words_aligned", X: "reference_number", Z: "transcription",
};
const abc = {
  giver: "abc-2.1",
  pitch_class: { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 },
  accidentals: { "^^": 2, "^": 1, "=": 0, "_": -1, "__": -2 },
  octave: { up: "'", down: ",", upper_letter_octave: 4, lower_letter_octave: 5, note: "C = middle C (scientific octave 4); c = the octave above" },
  rests: { z: "rest", x: "invisible_rest", Z: "multimeasure_rest", X: "multimeasure_invisible_rest", y: "spacer" },
  decoration_shortcuts: ".~HLMOPSTuv",
  info_fields: Object.fromEntries(Object.entries(INFO_FIELDS).map(([k, v]) => [k, { name: v }])),
  key: {
    fifths_major: { Cb: -7, Gb: -6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7 },
    modes: { maj: 0, ion: 0, mix: -1, dor: -2, min: -3, m: -3, aeo: -3, phr: -4, loc: -5, lyd: 1 },
    sharps_order: "FCGDAEB", flats_order: "BEADGCF",
    note: "mode = first three letters, case-insensitive; `m` alone = minor (standard 3.1.14)",
  },
  meter: {
    shorthand: { C: [4, 4], "C|": [2, 2] },
    default_unit: { threshold: 0.75, below: [1, 16], at_or_above: [1, 8], free: [1, 8], note: "no L: field: meter as a decimal < 0.75 -> 1/16, else 1/8; C, C| and none -> 1/8 (standard 3.1.7)" },
  },
  tuplet: { default_q: { 2: 3, 3: 2, 4: 3, 5: "n", 6: 2, 7: "n", 8: 3, 9: "n" }, n_simple: 2, n_compound: 3, compound_meters: ["6/8", "9/8", "12/8"], note: "(p:q:r = p notes in the time of q for the next r notes; q, r default (standard 4.13)" },
  propagate_accidentals_default: "pitch",
  propagate_note: "standard 11.3 (volatile) gives %%propagate-accidentals default `pitch` (all octaves to the bar end); abcjs applies the accidental per octave. The reader follows the standard and counts every note where the two differ.",
};

// ── MusicXML 4.1 (giver: the W3C XSD) ────────────────────────────────────────────────────────────────────────────────────
const CLASS_LISTS = {
  note_event: ["note"],
  measure: ["measure"], part: ["part"],
  structure: ["score-partwise", "score-timewise", "part-list", "score-part", "part-group", "part-name", "part-abbreviation", "movement-title", "movement-number"],
  state: ["attributes", "divisions", "key", "fifths", "mode", "time", "beats", "beat-type", "clef", "sign", "line", "staves", "transpose", "staff-details", "measure-style"],
  time_motion: ["backup", "forward"],
  note_content: ["pitch", "step", "alter", "octave", "rest", "unpitched", "chord", "grace", "cue", "duration", "tie", "tied", "voice", "staff", "type", "dot", "accidental", "time-modification", "stem", "beam", "notehead", "instrument", "display-step", "display-octave", "actual-notes", "normal-notes"],
  notation: ["notations", "articulations", "ornaments", "technical", "slur", "tuplet", "fermata", "arpeggiate", "glissando", "slide", "accent", "staccato", "tenuto", "trill-mark", "turn", "mordent"],
  direction: ["direction", "direction-type", "dynamics", "wedge", "words", "metronome", "sound", "rehearsal", "segno", "coda", "pedal", "octave-shift", "dashes", "bracket"],
  barline: ["barline", "repeat", "ending", "bar-style"],
  harmony: ["harmony", "root", "root-step", "root-alter", "kind", "bass", "bass-step", "degree", "function"],
  lyric: ["lyric", "syllabic", "text", "extend", "elision"],
  metadata: ["identification", "creator", "rights", "encoding", "software", "encoding-date", "encoder", "supports", "source", "relation", "work", "work-number", "work-title", "opus", "credit", "credit-words", "credit-type", "credit-image", "miscellaneous", "miscellaneous-field"],
  layout: ["defaults", "page-layout", "system-layout", "staff-layout", "print", "appearance", "scaling", "page-margins", "page-height", "page-width", "system-margins", "system-distance", "top-system-distance", "staff-distance", "left-margin", "right-margin", "top-margin", "bottom-margin", "millimeters", "tenths", "lyric-font", "word-font", "music-font", "line-width", "note-size", "distance", "glyph", "other-appearance", "measure-layout", "measure-numbering", "part-symbol", "system-dividers"],
};
const ROLES = { part: "part", measure: "measure", note: "note", chord: "chord", grace: "grace", cue: "cue", rest: "rest", unpitched: "unpitched", pitch: "pitch", step: "step", alter: "alter", octave: "octave", duration: "duration", tie: "tie", staff: "staff", attributes: "attributes", divisions: "divisions", staves: "staves", key: "key", fifths: "fifths", time: "time", beats: "beats", beatType: "beat-type", backup: "backup", forward: "forward" };

// ── LilyPond (giver: the Notation Reference; facts only) ────────────────────────────────────────────────────────────────
const lilypond = {
  giver: "lilypond-nr",
  note_names: ["c", "d", "e", "f", "g", "a", "b"],
  accidental_suffixes: ["is", "es", "isis", "eses", "ih", "eh"],
  rest_names: ["r", "R", "s"],
  nonmusic_blocks: ["header", "paper", "layout", "midi", "with", "bookpart", "book"],
  commands: ["version", "header", "relative", "absolute", "fixed", "score", "new", "context", "key", "time", "clef", "layout", "midi", "paper", "with", "lyricmode", "lyrics", "addlyrics", "lyricsto", "markup", "markuplist", "bar", "tempo", "set", "override", "revert", "repeat", "alternative", "partial", "transpose", "tuplet", "times", "grace", "acciaccatura", "appoggiatura", "fermata", "major", "minor", "break", "pageBreak", "include", "language", "chordmode", "drummode", "figuremode", "relative", "autoBeamOff", "voiceOne", "voiceTwo", "oneVoice", "stemUp", "stemDown", "p", "f", "mf", "mp", "pp", "ff", "sf", "sfz", "cresc", "decresc", "unfoldRepeats", "bookpart", "book", "simultaneous", "sequential", "change", "mark", "ottava", "slurUp", "slurDown", "tieUp", "tieDown", "hideNotes", "unHideNotes", "numericTimeSignature", "defaultTimeSignature"],
};

// ── R0 signature features: what each standard says opens or fills such a document (regexes are DECLARED by this card from those standards) ─
const SIGNATURES = [
  // ABC 2.1: file identification (2.2.1), tune header (2.2.2), information fields (3), bar symbols (4.8), chords (4.17), tuplets (4.13)
  { id: "abc.file_id", system: "abc", re: "^%abc", flags: "", giver: "abc-2.1#2.2.1" },
  { id: "abc.reference_number", system: "abc", re: "(?:^|\\n)X:[ \\t]*\\d+[ \\t]*(?:\\r?\\n|$)", flags: "", giver: "abc-2.1#3.1.1" },
  { id: "abc.key_field", system: "abc", re: "(?:^|\\n)K:[ \\t]*(?:[A-G][#b]?[ \\t]*(?:[A-Za-z]{1,10})?[ \\t]*|none|H[pP])(?:\\r?\\n|\\s|$)", flags: "", giver: "abc-2.1#3.1.14" },
  { id: "abc.meter_field", system: "abc", re: "(?:^|\\n)M:[ \\t]*(?:\\d+/\\d+|C\\|?|none)", flags: "", giver: "abc-2.1#3.1.6" },
  { id: "abc.unit_field", system: "abc", re: "(?:^|\\n)L:[ \\t]*1/\\d+", flags: "", giver: "abc-2.1#3.1.7" },
  { id: "abc.title_field", system: "abc", re: "(?:^|\\n)T:[ \\t]*\\S", flags: "", giver: "abc-2.1#3.1.2" },
  { id: "abc.voice_field", system: "abc", re: "(?:^|\\n)V:[ \\t]*\\S", flags: "", giver: "abc-2.1#7.1" },
  { id: "abc.lyric_field", system: "abc", re: "(?:^|\\n)w:[ \\t]*\\S", flags: "", giver: "abc-2.1#5" },
  { id: "abc.note_run_bar", system: "abc", re: "[A-Ga-g][,']*\\d*/?\\d*[ \\t]+[A-Ga-gz][,']*\\d*/?\\d*[ \\t]*\\|", flags: "", giver: "abc-2.1#4.1-4.8" },
  { id: "abc.bar_end", system: "abc", re: "\\|\\]|\\|:|:\\|", flags: "", giver: "abc-2.1#4.8" },
  { id: "abc.chord", system: "abc", re: "\\[[\\^_=]*[A-Ga-g][,']*[\\^_=A-Ga-g,'\\d/]*\\]", flags: "", giver: "abc-2.1#4.17" },
  { id: "abc.tuplet", system: "abc", re: "\\(\\d+(?::\\d*)*[\\^_=]*[A-Ga-g]", flags: "", giver: "abc-2.1#4.13" },
  { id: "abc.rest_len", system: "abc", re: "(?:^|[\\s|])[zx]\\d*/?\\d*(?:[\\s|]|$)", flags: "m", giver: "abc-2.1#4.5" },
  // STRUCTURE (review fix, 2026-10-06): the standard's tune header (2.2.2: X: first, K: last) and the tune body that follows it (2.2.3). Declared by this card from
  // those clauses. They are the ANCHORS the identifier requires before it says `abc` (identify.anchors below): body-like regexes alone (a chord-shaped `[a,b]`, a
  // tuplet-shaped `(3a`, a rest-shaped `x ` in code) never suffice. The body regex accepts a line made only of music-code characters (the note, rest and spacer letters, the decoration shorthand letters HLMOPSTuv of 4.14, digits, any punctuation, a quoted annotation, a !decoration!, an inline field) that holds a bar line and a note letter; its alternatives start with disjoint characters, so it is linear on a 4 KB prefix.
  { id: "abc.header_structure", system: "abc", re: "(?:^|\\n)X:[ \\t]*\\d+[ \\t]*\\r?\\n(?:(?:[A-Za-z]:|%)[^\\n]*\\r?\\n)*K:[^\\n]*(?:\\r?\\n|$)", flags: "", giver: "abc-2.1#2.2.2" },
  { id: "abc.body_after_header", system: "abc", re: "(?:^|\\n)K:[^\\n]*\\r?\\n(?:(?:[A-Za-z]:|%)[^\\n]*\\r?\\n)*(?=[^\\n]*\\|)(?=[^\\n]*[A-Ga-gzZxXy])(?:[A-Ga-gzZxXyHLMOPSTuv0-9]|[^A-Za-z0-9\\n\"!\\[]|\"[^\"\\n]*\"|![^!\\n]*!|\\[[IKLMmNPQRrsTUVWw]:[^\\]\\n]*\\]|\\[)+\\r?(?:\\n|$)", flags: "", giver: "abc-2.1#2.2.3" },
  // MusicXML 4.1: document element, doctype, part list, measure, attributes, divisions
  { id: "mx.xml_decl", system: "musicxml", re: "^\\s*<\\?xml", flags: "", giver: "xml-1.0#2.8" },
  { id: "mx.doctype", system: "musicxml", re: "<!DOCTYPE\\s+score-(?:partwise|timewise)", flags: "", giver: "musicxml-4.1" },
  { id: "mx.root", system: "musicxml", re: "<score-(?:partwise|timewise)[\\s>]", flags: "", giver: "musicxml-4.1-xsd" },
  { id: "mx.part_list", system: "musicxml", re: "<part-list[\\s>]", flags: "", giver: "musicxml-4.1-xsd" },
  { id: "mx.score_part", system: "musicxml", re: "<score-part\\s+id=", flags: "", giver: "musicxml-4.1-xsd" },
  { id: "mx.part_id", system: "musicxml", re: "<part\\s+id=", flags: "", giver: "musicxml-4.1-xsd" },
  { id: "mx.measure", system: "musicxml", re: "<measure[\\s>]", flags: "", giver: "musicxml-4.1-xsd" },
  { id: "mx.attributes", system: "musicxml", re: "<attributes>", flags: "", giver: "musicxml-4.1-xsd" },
  { id: "mx.divisions", system: "musicxml", re: "<divisions>\\s*\\d+\\s*</divisions>", flags: "", giver: "musicxml-4.1-xsd" },
  { id: "mx.pitch", system: "musicxml", re: "<pitch>\\s*<step>[A-G]</step>", flags: "", giver: "musicxml-4.1-xsd" },
  { id: "mx.identification", system: "musicxml", re: "<identification>", flags: "", giver: "musicxml-4.1-xsd" },
  // LilyPond NR: version statement, header, relative, score/new Staff, key/time/clef commands, layout/midi
  { id: "ly.version", system: "lilypond", re: "\\\\version\\s+\"\\d+\\.\\d+", flags: "", giver: "lilypond-nr#version" },
  { id: "ly.header", system: "lilypond", re: "\\\\header\\s*\\{", flags: "", giver: "lilypond-nr#header" },
  { id: "ly.relative", system: "lilypond", re: "\\\\relative\\b", flags: "", giver: "lilypond-nr#relative" },
  { id: "ly.score", system: "lilypond", re: "\\\\score\\s*\\{", flags: "", giver: "lilypond-nr#score" },
  { id: "ly.new_staff", system: "lilypond", re: "\\\\new\\s+(?:Staff|Voice|PianoStaff|StaffGroup|ChoirStaff|Lyrics|GrandStaff|TabStaff)", flags: "", giver: "lilypond-nr#contexts" },
  { id: "ly.key", system: "lilypond", re: "\\\\key\\s+[a-g](?:is|es|s)*\\s+\\\\(?:major|minor|dorian|mixolydian)", flags: "", giver: "lilypond-nr#key" },
  { id: "ly.time", system: "lilypond", re: "\\\\time\\s+\\d+/\\d+", flags: "", giver: "lilypond-nr#time" },
  { id: "ly.clef", system: "lilypond", re: "\\\\clef\\s+\"?[a-z]+", flags: "", giver: "lilypond-nr#clef" },
  { id: "ly.layout_midi", system: "lilypond", re: "\\\\(?:layout|midi)\\s*\\{", flags: "", giver: "lilypond-nr#layout" },
  { id: "ly.note_dur", system: "lilypond", re: "(?:^|\\s)[a-g](?:is|es|s)*[',]*\\d+\\.?(?:\\s|$)", flags: "", giver: "lilypond-nr#pitches" },
];
// REFUSALS: a document that carries one of these is a different system (a near-miss dialect); the identifier says so, it does not guess
const REFUSALS = [
  { id: "refuse.mei", re: "<mei[\\s>]", flags: "", refuses: "musicxml", dialect: "mei", giver: "mei-guidelines" },
  { id: "refuse.musescore", re: "<museScore\\b", flags: "", refuses: "musicxml", dialect: "mscx", giver: "musescore-mscx" },
  { id: "refuse.latex", re: "\\\\(?:documentclass|begin\\{document\\}|usepackage)", flags: "", refuses: "lilypond", dialect: "latex", giver: "latex" },
];

export function buildStandard() {
  const xsd = JSON.parse(fs.readFileSync(XSD_FACTS, "utf8"));
  const cls = {};
  for (const el of xsd.elements) cls[el] = "other";
  for (const [c, names] of Object.entries(CLASS_LISTS)) for (const n of names) cls[n] = c;
  return {
    schema: "MusicNotationStandardPrior@1",
    family: "music_abc",
    built: DATE,
    note: "Tables from named standards. NO counts from TRAIN. Sections marked declared are choices of this card, not received facts.",
    givers: [
      { id: "abc-2.1", name: "The abc music standard 2.1 (Chris Walshaw)", url: "https://abcnotation.com/wiki/abc:standard:v2.1", licence_of_giver_text: "CC BY-NC-SA 3.0 (wiki footer). Facts only are encoded (symbol tables, rules); no prose is reproduced.", accessed: DATE },
      { id: "musicxml-4.1-xsd", name: "W3C MusicXML 4.1 XSD", url: xsd.url, git_commit: xsd.git_commit, licence_of_giver_text: xsd.licence, accessed: DATE },
      { id: "lilypond-nr", name: "LilyPond Notation Reference 2.24 (Writing pitches)", url: "https://lilypond.org/doc/v2.24/Documentation/notation/writing-pitches.html", licence_of_giver_text: "GNU FDL (page footer). Facts only: note names and accidental suffixes.", accessed: DATE },
    ],
    train_counts: null,
    abc,
    musicxml: {
      giver: "musicxml-4.1-xsd",
      roles: ROLES,
      step_pc: { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 },
      element_vocabulary: xsd.elements,
      content_model: xsd.content_model,
      enums: xsd.enums,
      element_class: cls,
      note_subclass: ["pitched", "pitched_chord", "rest", "grace", "cue", "unpitched"],
      class_note: "element_class is DECLARED by this card over the XSD vocabulary (the XSD does not classify); the vocabulary and content model are received",
    },
    lilypond,
    signatures: SIGNATURES,
    refusals: REFUSALS,
    identify: {
      min_features: 2, unit_threshold: 3,
      anchors: { abc: [["abc.file_id", "abc.header_structure"], ["abc.body_after_header"]] },
      note: "declared: one witness is not an identification; the standard-only variant needs 3 hits at unit weight. ANCHORS (review fix 2026-10-06): a nomination of `abc` is REFUSED unless, for each anchor group, at least one of its features is present: a tune header (the %abc file identification, or X: ... K: per abc-2.1 2.2.2) AND a tune body line after a K: line (2.2.3). A system without an anchor entry is unchanged.",
    },
  };
}

function trainDocs() {
  const man = loadManifest();
  if (!man) throw new Error("no manifest at " + CORPUS_DIR);
  // AUTHORED stress fixtures (role negative_authored) never enter the lexicon: a prior is built from natural TRAIN data only
  return man.filter((m) => m.split === "train" && m.role !== "negative_authored");
}

export function buildLexicon(standard) {
  const P = preparePriors({ standard, lexicon: null });
  const docs = trainDocs();
  const rows = [];
  let drifted = 0;
  const counts = { xmlElements: new Map(), xmlDocs: 0 };
  for (const e of docs) {
    const text = loadText(e);
    if (text == null) continue;
    if (!verifyEntry(e)) { drifted++; continue; }     // the file on disk is no longer the one the manifest recorded
    const gold = e.role === "positive" ? e.system : "other";
    rows.push({ id: e.id, gold, source: e.source, kind: e.kind ?? e.format, hits: new Set(P.sig.filter((f) => f.rx.test(text.slice(0, PREFIX))).map((f) => f.id)) });
    if (e.system === "musicxml") {
      counts.xmlDocs++;
      for (const m of text.matchAll(/<([A-Za-z][\w:.-]*)/g)) counts.xmlElements.set(m[1], (counts.xmlElements.get(m[1]) ?? 0) + 1);
    }
  }
  const nPos = Object.fromEntries(SYSTEMS.map((s) => [s, rows.filter((r) => r.gold === s).length]));
  const nNeg = rows.filter((r) => r.gold === "other").length;
  const weights = {}, detail = {};
  for (const f of P.sig) {
    const posC = rows.filter((r) => r.gold === f.system && r.hits.has(f.id)).length;
    const negC = rows.filter((r) => r.gold !== f.system && r.hits.has(f.id)).length; // anything not of this system, incl. other systems
    const nNegAll = rows.length - nPos[f.system];
    const w = Math.max(0, Math.log((posC + 0.5) / (nPos[f.system] + 1)) - Math.log((negC + 0.5) / (nNegAll + 1)));
    weights[f.id] = Number(w.toFixed(4));
    detail[f.id] = { system: f.system, pos: posC, of_pos: nPos[f.system], neg: negC, of_neg: nNegAll };
  }
  const thresholds = {};
  for (const s of SYSTEMS) {
    let mx = 0;
    for (const r of rows) {
      if (r.gold === s) continue;
      let sc = 0; for (const f of P.sig) if (f.system === s && r.hits.has(f.id)) sc += weights[f.id];
      mx = Math.max(mx, sc);
    }
    thresholds[s] = Number((mx + 1).toFixed(4));
  }
  const bySource = {};
  for (const r of rows) { if (r.gold === "other" && r.source.includes(":")) { const k = r.source.split(":")[0]; bySource[k + ":*"] = (bySource[k + ":*"] ?? 0) + 1; } else bySource[r.source] = (bySource[r.source] ?? 0) + 1; }
  const negByKind = {};
  for (const r of rows) if (r.gold === "other") negByKind[r.kind] = (negByKind[r.kind] ?? 0) + 1;
  return {
    schema: "MusicNotationLexiconPrior@1",
    family: "music_abc",
    built: DATE,
    split: "train",
    note: "Counts and weights from the TRAIN split ONLY. Weights and thresholds follow the rules in the builder header (derived, not tuned).",
    givers: ["abc-2.1", "musicxml-4.1-xsd", "lilypond-nr (signature features); the corpus itself for the counts"],
    train_sources: bySource,
    n_docs: { positives: nPos, negatives: nNeg, negatives_by_kind: negByKind, drifted_files_skipped: drifted },
    signature_weights: weights,
    signature_detail: detail,
    thresholds,
    threshold_rule: "tau_s = (max over TRAIN documents not of system s of score_s) + 1 nat",
    musicxml_element_counts: { docs: counts.xmlDocs, elements: Object.fromEntries([...counts.xmlElements.entries()].sort((a, b) => b[1] - a[1])) },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const std = buildStandard();
  fs.mkdirSync(PRIOR_DIR, { recursive: true });
  fs.writeFileSync(path.join(PRIOR_DIR, "notation-music_abc-standard.json"), JSON.stringify(std, null, 1) + "\n");
  const lex = buildLexicon(std);
  const body = JSON.stringify(lex, null, 1) + "\n";
  lex.builder_sha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url))).digest("hex");
  fs.writeFileSync(path.join(PRIOR_DIR, "notation-music_abc-lexicon.json"), JSON.stringify(lex, null, 1) + "\n");
  void body;
  console.log(JSON.stringify({ standard_bytes: JSON.stringify(std).length, lexicon: { n_docs: lex.n_docs, thresholds: lex.thresholds, sources: lex.train_sources } }, null, 1));
  const w = Object.entries(lex.signature_weights).sort((a, b) => b[1] - a[1]);
  console.log("weights:", w.map(([k, v]) => `${k}=${v}`).join(" "));
}
