// notation-music_abc: the MUSIC adapter (adapters/notation/music_abc.js) and its INSTRUMENT (eval/notation-competence/music_abc.mjs) are
// regression-guarded here on TOY fixtures whose answer is known by construction: a perfect reader scores 1, a deranged control scores low,
// a lookahead cheat is caught by the causality licence, a control that ties or beats the real arm marks the INSTRUMENT BROKEN (pass=false; review fix A10),
// the ABC identifier needs a tune header and a tune body (A11), the R4/R5 pass rules FAIL a reader with a dropped tie, a shifted octave or a constant meter
// (A14-A22, mutation regression on TRAIN), and a missing corpus is a typed gap and never a throw.
//
// Every fixture below is AUTHORED by the model (labelled so) and hand-computed. None is natural data and nothing here measures real
// music: the natural-data card is eval/notation-competence/music_abc.mjs run on DEV / TEST. A few tests that need the real priors or the
// real DEV corpus are skipped when those files are absent (they can fail: that is the point).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  ear, read, identify, createIdentifier, loadPriors, preparePriors, Q, PRIOR_DIR, PRIOR_FILES, SYSTEMS,
} from "../adapters/notation/music_abc.js";
import {
  goldSlots, sutSlots, msetStats, f1, judgeControls, applyJudgement, wilsonUpper, labelGate, r4VerdictV2, derangedPriors, signTest, causalCheck, blindRead,
  PREREG_SHA256, RULES_V2_SHA256, RULES_V21_SHA256, RULES_V22_SHA256, headerDigest, FAMILY, R5_DERIVED_AGREEMENT,
} from "../eval/notation-competence/music_abc.mjs";
import { verifyEntry } from "../eval/notation-competence/music_abc-io.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HAVE_PRIORS = fs.existsSync(path.join(PRIOR_DIR, PRIOR_FILES.standard)) && fs.existsSync(path.join(PRIOR_DIR, PRIOR_FILES.lexicon));
const P = HAVE_PRIORS ? loadPriors() : null;
const need = (name, fn) => test(name, { skip: HAVE_PRIORS ? false : "priors/notation-music_abc-*.json absent" }, fn);

// ── gold tables in the gold's own shape (parts -> measures -> ev), written by hand ──────────────────────────────────────────────
const ev = (on, dur, k, midi = null, tie = null) => ({ on, dur, k, midi, tie });
const meas = (i, evs, meter, fifths) => ({ i, number: String(i + 1), start: "0", meter, fifths, ev: evs });
const goldOf = (...lines) => ({ ok: true, parts: lines.map((ms, ordinal) => ({ ordinal, measures: ms })) });

// AUTHORED ABC toy: accidentals carried within the bar, a triplet, a tie across a half bar, a chord, a rest.
const TOY_ABC = `X:1
T:Toy
M:3/4
L:1/8
K:G
G2 B2 d2 | ^f2 =f2 f2 | (3abc d2-d2 | [GBd]4 z2 |]
w: la la la
`;
const TOY_ABC_GOLD = goldOf([
  meas(0, [ev("0", "1", "n", 67), ev("1", "1", "n", 71), ev("2", "1", "n", 74)], "3/4", 1),
  meas(1, [ev("0", "1", "n", 78), ev("1", "1", "n", 77), ev("2", "1", "n", 77)], "3/4", 1),
  meas(2, [ev("0", "1/3", "n", 81), ev("1/3", "1/3", "n", 83), ev("2/3", "1/3", "n", 72), ev("1", "1", "n", 74, "start"), ev("2", "1", "n", 74)], "3/4", 1),
  meas(3, [ev("0", "2", "n", 67), ev("0", "2", "n", 71), ev("0", "2", "n", 74), ev("2", "1", "r")], "3/4", 1),
]);

// AUTHORED MusicXML toy: one part, two staves, divisions 6, 2/4, G major signature; a tied chord, a rest, a backup to a second staff, a
// grace note (skipped by design), a triplet (time-modification), a tie stop, a forward on the second staff.
const note = (step, oct, dur, { alter = null, chord = false, rest = false, grace = false, staff = 1, voice = 1, tie = null, tm = false } = {}) =>
  `<note>${grace ? "<grace/>" : ""}${chord ? "<chord/>" : ""}${rest ? "<rest/>" : `<pitch><step>${step}</step>${alter != null ? `<alter>${alter}</alter>` : ""}<octave>${oct}</octave></pitch>`}${grace ? "" : `<duration>${dur}</duration>`}${tie ? `<tie type="${tie}"/>` : ""}<voice>${voice}</voice>${tm ? "<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>" : ""}<staff>${staff}</staff></note>`;
const TOY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1">
<measure number="1"><attributes><divisions>6</divisions><key><fifths>1</fifths></key><time><beats>2</beats><beat-type>4</beat-type></time><staves>2</staves></attributes>
${note("E", 5, 6, { tie: "start" })}${note("G", 5, 6, { alter: 1, chord: true })}${note("", 0, 6, { rest: true })}
<backup><duration>12</duration></backup>
${note("C", 3, 12, { staff: 2, voice: 2 })}
</measure>
<measure number="2">
${note("D", 5, 0, { grace: true })}${note("A", 4, 2, { tm: true })}${note("B", 4, 2, { tm: true })}${note("C", 5, 2, { tm: true })}${note("E", 5, 6, { tie: "stop" })}
<backup><duration>12</duration></backup>
<forward><duration>6</duration></forward>
${note("D", 3, 6, { staff: 2, voice: 2 })}
</measure>
</part></score-partwise>
`;
const TOY_XML_GOLD = goldOf(
  [meas(0, [ev("0", "1", "n", 76, "start"), ev("0", "1", "n", 80), ev("1", "1", "r")], "2/4", 1),
   meas(1, [ev("0", "1/3", "n", 69), ev("1/3", "1/3", "n", 71), ev("2/3", "1/3", "n", 72), ev("1", "1", "n", 76, "stop")], "2/4", 1)],
  [meas(0, [ev("0", "2", "n", 48)], "2/4", 1), meas(1, [ev("1", "1", "n", 50)], "2/4", 1)],
);

const slotsOf = (r) => sutSlots(r);
const slotF1 = (r, gold) => { const a = msetStats(goldSlots(gold).slots, slotsOf(r).slots); return f1(a.tp, a.nb - a.tp, a.na - a.tp); };
const claimF1 = (r, gold) => { const a = msetStats(goldSlots(gold).claims, slotsOf(r).claims); return f1(a.tp, a.nb - a.tp, a.na - a.tp); };
const pitchClaims = (m) => new Map([...m].filter(([k]) => k.split("|")[4] === "pitch"));
const pitchF1 = (r, gold) => { const a = msetStats(pitchClaims(goldSlots(gold).claims), pitchClaims(slotsOf(r).claims)); return f1(a.tp, a.nb - a.tp, a.na - a.tp); };

// deranged copies of the standard prior (the controls' mechanism): permute the pitch classes of the seven steps; swap note/measure roles
const mutate = (fn) => { const std = JSON.parse(JSON.stringify(P.standard)); fn(std); return preparePriors({ standard: std, lexicon: P.lexicon }); };
const derangedPitch = () => mutate((s) => {
  const rot = (o) => { const ks = Object.keys(o), vs = Object.values(o); ks.forEach((k, i) => { o[k] = vs[(i + 1) % vs.length]; }); };
  rot(s.musicxml.step_pc); rot(s.abc.pitch_class);
});
const swappedRoles = () => mutate((s) => { const R = s.musicxml.roles; [R.note, R.measure] = [R.measure, R.note]; });

// ═════ the priors ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
need("the standard prior names its givers and carries no TRAIN counts; the lexicon is TRAIN-only", () => {
  assert.equal(P.standard.schema, "MusicNotationStandardPrior@1");
  assert.equal(P.standard.train_counts, null);
  const ids = P.standard.givers.map((g) => g.id);
  for (const g of ["abc-2.1", "musicxml-4.1-xsd", "lilypond-nr"]) assert.ok(ids.includes(g), g);
  for (const g of P.standard.givers) assert.ok(g.url && g.licence_of_giver_text && g.accessed, `giver ${g.id} states url, licence, date`);
  assert.equal(P.lexicon.schema, "MusicNotationLexiconPrior@1");
  assert.equal(P.lexicon.split, "train");
  for (const s of SYSTEMS) assert.ok(P.lexicon.thresholds[s] > 0, `threshold for ${s} is derived`);
  assert.ok(P.standard.musicxml.element_vocabulary.length > 400, "the W3C XSD vocabulary is received");
});

need("a missing standard prior is a typed gap: nothing is read, nothing throws", () => {
  const none = preparePriors({ standard: null });
  assert.equal(read(TOY_ABC, { priors: none }).gaps[0].reason, "no_standard_prior");
  assert.equal(ear(TOY_ABC, { priors: none }).gaps[0].reason, "no_standard_prior");
  assert.equal(identify(TOY_ABC, { priors: none }).gap, "no_standard_prior");
});

// ═════ R0: identify ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
// AUTHORED snippets, one per system plus negatives and two NEAR-MISS dialects that are XML but not MusicXML
const SNIP = {
  abc: TOY_ABC,
  musicxml: TOY_XML,
  lilypond: `\\version "2.24.0"\n\\header { title = "Toy" }\n\\score {\n  \\new Staff { \\clef treble \\key g \\major \\time 3/4 \\relative c'' { g4 b d | fis2 r4 | } }\n  \\layout { }\n  \\midi { }\n}\n`,
};
const NEG = {
  prose: "The committee met on Tuesday to discuss the budget. Several members raised concerns about the timeline, and the chair promised a revised draft.\n",
  mei: `<?xml version="1.0" encoding="UTF-8"?>\n<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0"><meiHead><fileDesc><titleStmt><title>t</title></titleStmt></fileDesc></meiHead><music><body><mdiv><score><scoreDef><staffGrp><staffDef n="1"/></staffGrp></scoreDef><section><measure n="1"><staff n="1"><layer n="1"><note pname="c" oct="4" dur="4"/></layer></staff></measure></section></score></mdiv></body></music></mei>\n`,
  mscx: `<?xml version="1.0" encoding="UTF-8"?>\n<museScore version="3.02"><Score><Style/><Part><Staff id="1"/></Part><Staff id="1"><Measure><voice><Chord><durationType>quarter</durationType><Note><pitch>60</pitch></Note></Chord></voice></Measure></Staff></Score></museScore>\n`,
  email: "From: someone@example.org\nTo: other@example.org\nSubject: lunch\nDate: Mon, 5 Oct 2026 12:00:00 +0000\nK: maybe\nT: noon\n\nShall we?\n",
  latex: "\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\header{x} \\score{y} \\relative x\n\\end{document}\n",
};
need("R0: each system is identified from content alone; near-miss dialects and non-music are refused, with a typed reason", () => {
  for (const s of SYSTEMS) assert.equal(identify(SNIP[s], { priors: P }).system, s, s);
  for (const [k, text] of Object.entries(NEG)) {
    const r = identify(text, { priors: P });
    assert.equal(r.system, null, `${k} must not be called music`);
    assert.ok(r.gap, `${k} carries a typed gap`);
  }
  assert.match(identify(NEG.mei, { priors: P }).gap, /^refused:mei$/);
  assert.match(identify(NEG.mscx, { priors: P }).gap, /^refused:mscx$/);
});

need("R0 is causal: the verdict of a prefix is the identifier's own, and an early prefix is not forced", () => {
  const idr = createIdentifier({ priors: P });
  const stream = []; for (let i = 0; i < SNIP.musicxml.length; i += 64) stream.push(idr.feed(SNIP.musicxml.slice(i, i + 64)).system);
  assert.equal(identify(SNIP.musicxml.slice(0, 20), { priors: P }).system, null, "an XML declaration alone is not yet MusicXML");
  assert.equal(stream[stream.length - 1], "musicxml");
  // never decides a system, then recants to another, once decided on a growing prefix of the same document
  const decided = stream.filter((x) => x); assert.ok(decided.every((x) => x === "musicxml"));
});

need("R0 controls fail as built: a character-shuffled document and deranged signature labels are not identified", () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const shuf = (s) => { const a = [...s]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join(""); };
  for (const s of SYSTEMS) assert.equal(identify(shuf(SNIP[s]), { priors: P }).system, null, `${s} shuffled`);
  const perm = { abc: "musicxml", musicxml: "lilypond", lilypond: "abc" };
  const der = mutate((std) => { std.signatures = std.signatures.map((f) => ({ ...f, system: perm[f.system] })); });
  const lex = JSON.parse(JSON.stringify(P.lexicon)); const th = {}; for (const [s, v] of Object.entries(lex.thresholds)) th[perm[s]] = v; lex.thresholds = th;
  const derP = preparePriors({ standard: der.standard, lexicon: lex });
  for (const s of SYSTEMS) assert.notEqual(identify(SNIP[s], { priors: derP }).system, s, `${s} under deranged labels`);
});

// ═════ ear: lexemes and their class ═══════════════════════════════════════════════════════════════════════════════════════════
need("ear (ABC): a letter in a title, a lyric, a chord symbol or a field is never a note; lexemes carry their class and exact span", () => {
  const abc = `X:1\nT:A Bad Cab\nM:4/4\nL:1/4\nK:C\n"Am"A B c d | e4 |]\nw: bad cab fed\n`;
  const toks = ear(abc, { priors: P });
  const by = (c) => toks.filter((t) => t.class === c).map((t) => t.text);
  assert.deepEqual(by("note"), ["A", "B", "c", "d", "e4"]);
  assert.deepEqual(by("chord_symbol"), ['"Am"']);
  assert.equal(by("field").length, 5);
  assert.equal(by("lyric").length, 1);
  for (const t of toks) assert.equal(abc.slice(t.s, t.e), t.text, "span and text agree");
  // the notation-blind letter rule would call these notes; the reader refuses
  const blind = (abc.match(/[A-Ga-g]/g) ?? []).length;
  assert.ok(blind > by("note").length + 5, "the blind rule over-calls by construction");
});

need("ear (MusicXML): a <note> is a lexeme with a class from its content model; <rest/> and <chord/> are read, not guessed from the tag", () => {
  const toks = ear(TOY_XML, { priors: P });
  const notes = toks.filter((t) => t.name === "note").map((t) => t.class);
  assert.deepEqual(notes, ["pitched", "pitched_chord", "rest", "pitched", "grace", "pitched", "pitched", "pitched", "pitched", "pitched"], "classes in document order");
  assert.equal(toks.filter((t) => t.class === "measure").length, 2);
  for (const t of toks.filter((x) => x.name === "note")) assert.ok(t.text.startsWith("<note>") && t.text.endsWith("</note>"));
});

// ═════ R3 / R4: a perfect reader scores 1, deranged controls score low ══════════════════════════════════════════════════════
need("R3/R4 ABC: the reader recovers the hand-computed beings and claims exactly (F1 = 1)", () => {
  const r = read(TOY_ABC, { priors: P });
  assert.equal(r.system, "abc");
  assert.equal(slotF1(r, TOY_ABC_GOLD), 1);
  assert.equal(claimF1(r, TOY_ABC_GOLD), 1);
  assert.deepEqual(r.gaps, [], "a plain tune leaves no gap");
  const notes = r.beings.filter((b) => b.kind === "note");
  assert.equal(notes.length, 3 + 3 + 5 + 3);
  assert.deepEqual(notes.filter((b) => b.measure === 1).map((b) => b.midi), [78, 77, 77], "^f then =f then f: the natural carries to the end of the bar");
});

need("R3/R4 MusicXML: backup, forward, chord, grace, tie, tuplet and two staves are read (F1 = 1); the grace note is a typed gap", () => {
  const r = read(TOY_XML, { priors: P });
  assert.equal(r.system, "musicxml");
  assert.equal(slotF1(r, TOY_XML_GOLD), 1);
  assert.equal(claimF1(r, TOY_XML_GOLD), 1);
  assert.deepEqual(r.gaps.map((g) => g.reason), ["mx_grace_skipped"]);
  assert.equal(r.lines.length, 2, "two staves are two lines");
});

need("controls fail as built: deranged pitch table, ablated duration, swapped roles and the notation-blind reader", () => {
  for (const [text, gold] of [[TOY_ABC, TOY_ABC_GOLD], [TOY_XML, TOY_XML_GOLD]]) {
    const real = read(text, { priors: P });
    const dp = read(text, { priors: derangedPitch() });
    assert.equal(slotF1(dp, gold), 1, "a pitch table does not move a being");
    assert.ok(pitchF1(dp, gold) < 0.35, `deranged pitch table: pitch F1 ${pitchF1(dp, gold)}`);
    assert.ok(claimF1(dp, gold) < claimF1(real, gold) - 0.25);
    const ad = read(text, { priors: P, ablate: ["duration"] });
    assert.ok(slotF1(ad, gold) < 0.85, `durations forced to the unit move the onsets: ${slotF1(ad, gold)}`);
    const bl = blindRead(text);
    assert.ok(slotF1(bl, gold) < 0.3, `blind reader: ${slotF1(bl, gold)}`);
  }
  const sw = read(TOY_XML, { priors: swappedRoles() });
  assert.ok(slotF1(sw, TOY_XML_GOLD) < 0.2, "with the note role pointed at <measure> the beings are not found");
});

need("ablating the key signature and accidentals moves pitch claims and only pitch claims", () => {
  const ab = read(TOY_ABC, { priors: P, ablate: ["accidentals", "key"] });
  assert.equal(slotF1(ab, TOY_ABC_GOLD), 1, "no being moves");
  assert.ok(pitchF1(ab, TOY_ABC_GOLD) < 1, "the sharpened f is now wrong");
  const nonPitch = (m) => new Map([...m].filter(([k]) => k.split("|")[4] !== "pitch" && k.split("|")[4] !== "key"));  // durations, ties, meters
  const a = msetStats(nonPitch(goldSlots(TOY_ABC_GOLD).claims), nonPitch(slotsOf(ab).claims));
  assert.equal(a.tp, a.na); assert.equal(a.tp, a.nb); // durations, ties and meters are untouched
  assert.equal([...slotsOf(ab).claims.keys()].filter((k) => k.split("|")[4] === "key").length, 0, "the ablated reader makes no key claim");
});

// ═════ ABC grammar details the derived corpus does not exercise (AUTHORED, hand-computed) ═══════════════════════════════════
const durs = (r) => r.beings.filter((b) => b.kind === "note" || b.kind === "rest").map((b) => b.dur);
need("ABC lengths, broken rhythm, default unit note length, bar and overlay, voices", () => {
  const len = read(`X:1\nM:4/4\nL:1/8\nK:C\nA/ A// A3/2 A4 A/2 |\n`, { priors: P });
  assert.deepEqual(durs(len), ["1/4", "1/8", "3/4", "2", "1/4"]);
  const brk = read(`X:1\nM:4/4\nL:1/8\nK:C\nA>B c<d A>>B |\n`, { priors: P });
  assert.deepEqual(durs(brk), ["3/4", "1/4", "1/4", "3/4", "7/8", "1/8"]);
  const deflt = (m, l = "") => durs(read(`X:1\n${m}\n${l}K:C\nA |\n`, { priors: P }))[0];
  assert.equal(deflt("M:2/4"), "1/4", "2/4 = 0.5 < 0.75: default unit 1/16");
  assert.equal(deflt("M:4/4"), "1/2", "4/4: default unit 1/8");
  assert.equal(deflt("M:6/8"), "1/2", "6/8 = 0.75: default unit 1/8");
  assert.equal(deflt("M:C|"), "1/2", "C| : 1/8");
  assert.equal(deflt("M:2/4", "L:1/4\n"), "1", "an explicit L: wins");
  const ov = read(`X:1\nM:4/4\nL:1/4\nK:C\nC D E F & x2 G2 | c4 |\n`, { priors: P });
  const g = ov.beings.filter((b) => b.kind === "note").map((b) => `${b.measure}@${b.onset}:${b.midi}`);
  assert.deepEqual(g, ["0@0:60", "0@1:62", "0@2:64", "0@3:65", "0@2:67", "1@0:72"], "& returns to the bar start; x is a spacer, not a being");
  const vv = read(`X:1\nM:4/4\nL:1/4\nK:C\nV:1\nV:2\n[V:1] C D E F | G4 |]\n[V:2] C,2 D,2 | E,4 |]\n`, { priors: P });
  assert.equal(vv.lines.length, 2);
  assert.deepEqual(vv.beings.filter((b) => b.kind === "note" && b.line === 1).map((b) => b.midi), [48, 50, 52]);
});

need("ABC idioms the derived corpus lacks (AUTHORED): repeats and endings are bars, decorations are not beings, modes map to the standard's key table", () => {
  const rep = read(`X:1\nM:2/4\nL:1/4\nK:C\n|: A B | c d :| [1 e f |2 g a |]\n`, { priors: P });
  const at = (r) => r.beings.filter((b) => b.kind === "note").map((b) => `${b.measure}:${b.midi}`);
  assert.deepEqual(at(rep), ["0:69", "0:71", "1:72", "1:74", "2:76", "2:77", "3:79", "3:81"], "repeat signs end measures; [1 and |2 mark endings, they do not add beings");
  const dec = read(`X:1\nM:4/4\nL:1/4\nK:C\n!trill!A ~B .C H D !fermata!E |\n`, { priors: P });
  assert.equal(dec.beings.filter((b) => b.kind === "note").length, 5);
  assert.deepEqual(ear(`X:1\nM:4/4\nL:1/4\nK:C\n!trill!A ~B .C H D |\n`, { priors: P }).filter((t) => t.class === "decoration").map((t) => t.text), ["!trill!", "~", ".", "H"]);
  const fifths = (k) => read(`X:1\nM:4/4\nL:1/4\n${k}\nA |\n`, { priors: P }).relations.find((r) => r.label === "key").end2;
  const table = { "K:G": 1, "K:Gm": -2, "K:Ador": 1, "K:Dmix": 1, "K:F#m": 3, "K:C lyd": 1, "K:Bphr": 1, "K:Eloc": -1, "K:Bb": -2, "K:Cb": -7, "K:Am": 0, "K:Gmaj": 1, "K:Dmin": -1 };
  for (const [k, f] of Object.entries(table)) assert.equal(fifths(k), `fifths:${f}`, k);
  const mixed = read(`X:1\nM:4/4\nL:1/4\nK:Ador\nF f |\n`, { priors: P });
  assert.deepEqual(mixed.beings.filter((b) => b.kind === "note").map((b) => b.midi), [66, 78], "A dorian has the sharpened F of G major");
  const tup = read(`X:1\nM:6/8\nL:1/8\nK:C\n(5ABCDE F |\n`, { priors: P });
  assert.equal(tup.beings.find((b) => b.kind === "note").dur, "3/10", "(5 in compound time (6/8): five eighths in the time of three, 3/10 of a quarter each");
});

need("ABC accidental propagation: the standard's default and abcjs's differ; the reader follows the standard and COUNTS the cases", () => {
  const r = read(`X:1\nM:4/4\nL:1/4\nK:C\n^f f' F f |\n`, { priors: P });
  assert.deepEqual(r.beings.filter((b) => b.kind === "note").map((b) => b.midi), [78, 90, 66, 78], "pitch propagation: the sharp reaches f' (F#6) and F (F#4), not only f");
  assert.ok(r.gaps.some((g) => g.reason === "accidental_propagation_ambiguous" && g.count === 2), "f' and F are the two notes where octave-wise and pitch-wise propagation differ");
  const plain = read(`X:1\nM:4/4\nL:1/4\nK:C\n^f =f f g |\n`, { priors: P });
  assert.ok(!plain.gaps.some((g) => g.reason === "accidental_propagation_ambiguous"), "a tune where the two readings agree has no gap");
});

need("ABC typed gaps: grace notes and an unknown symbol are counted, never dropped silently", () => {
  const r = read(`X:1\nM:4/4\nL:1/4\nK:C\n{g}A B @ c |\n`, { priors: P });
  const reasons = Object.fromEntries(r.gaps.map((g) => [g.reason, g.count]));
  assert.equal(reasons.abc_grace_skipped, 1);
  assert.equal(reasons.abc_unknown_symbol, 1);
  assert.equal(r.beings.filter((b) => b.kind === "note").length, 3);
});

need("a very large score is heard and read without overflowing the call stack (regression: push(...tokens))", () => {
  const n = 130000;
  const big = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>${"<note><rest/><duration>1</duration></note>".repeat(n)}</measure></part></score-partwise>`;
  const toks = ear(big, { priors: P, system: "musicxml" });
  assert.ok(toks.length > n, `${toks.length} tokens`);
  const r = read(big, { priors: P, system: "musicxml" });
  assert.equal(r.beings.filter((b) => b.kind === "rest").length, n);
});

// ═════ causality ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
need("the causal licence check passes the real reader and CATCHES a reader that uses whole-text information", () => {
  const items = [{ text: TOY_ABC }];
  const itemsXml = [{ text: TOY_XML }];
  assert.equal(causalCheck(items, "abc", P).violations, 0);
  assert.equal(causalCheck(itemsXml, "musicxml", P).violations, 0);
  // a cheat: the unit note length is decided from the PARITY of the text length (a statistic of the whole text), so a prefix and the
  // full text disagree about every duration
  const cheat = (text, o) => read(text.replace(/^L:.*$/m, `L:1/${text.length % 2 ? 8 : 16}`), o);
  const bad = causalCheck(items, "abc", P, cheat);
  assert.ok(bad.violations > 0, "lookahead is detected");
});

// ═════ the instrument's statistics ═══════════════════════════════════════════════════════════════════════════════════════════
test("exact one-sided sign test", () => {
  assert.ok(Math.abs(signTest(5, 0).p - 1 / 32) < 1e-9);
  assert.equal(signTest(0, 0).p, 1);
  assert.ok(Math.abs(signTest(8, 2).p - 56 / 1024) < 1e-9);
  assert.ok(signTest(0, 10).p > 0.99);
});

test("a control that TIES or BEATS the real arm marks the instrument broken (pass=false); one that fails by a clear margin is licensed; a weak-power one is only reported", () => {
  const real = { score: 0.95, perUnit: Array(30).fill(0.95) };
  const same = { score: 0.95, perUnit: Array(30).fill(0.95) };
  const better = { score: 0.97, perUnit: Array(30).fill(0.97) };
  const low = { score: 0.3, perUnit: Array(30).fill(0.3) };
  const j = judgeControls(real, { same, better, low });
  assert.equal(j.licence.same, false);
  assert.equal(j.licence.low, true);
  assert.equal(j.best.name, "low");
  assert.deepEqual(j.broken.sort(), ["better", "same"], "a control that ties or beats the real arm is the II.23 failure: it is returned, not dropped");
  assert.equal(j.status.same, "tied_or_beaten"); assert.equal(j.status.low, "licensed");
  const none = judgeControls(real, { same });
  assert.equal(none.best, null, "no licensed control");
  // underpowered: real > control but too few units for the sign test to reject: reported, never gating, never broken
  const few = judgeControls({ score: 0.9, perUnit: [0.9, 0.9, 0.9] }, { c: { score: 0.2, perUnit: [0.2, 0.2, 0.2] } });
  assert.equal(few.status.c, "underpowered"); assert.deepEqual(few.broken, []); assert.deepEqual(few.underpowered, ["c"]);
  // the rung is failed by the flag, and says why
  const rung = { pass: true, notes: [], details: {} };
  applyJudgement(rung, { "": j });
  assert.equal(rung.pass, false); assert.deepEqual(rung.details.instrument_broken.sort(), ["better", "same"]); assert.match(rung.notes[0], /INSTRUMENT BROKEN/);
  const clean = { pass: true, notes: [], details: {} }; applyJudgement(clean, { "": judgeControls(real, { low }) });
  assert.equal(clean.pass, true); assert.deepEqual(clean.details.instrument_broken, []);
  // a null score is unmeasured, not broken
  assert.equal(judgeControls({ score: null, perUnit: [] }, { c: { score: 0.1, perUnit: [] } }).status.c, "unmeasured");
});

test("Wilson 95% upper bound: 0 of 33 cannot be bounded under 0.05, 0 of 899 can (review finding: n=33 is too few)", () => {
  assert.ok(wilsonUpper(0, 33) > 0.1, `0/33 -> ${wilsonUpper(0, 33)}`);
  assert.ok(wilsonUpper(0, 899) < 0.005, `0/899 -> ${wilsonUpper(0, 899)}`);
  assert.ok(wilsonUpper(0, 60) < 0.0610 && wilsonUpper(0, 60) > 0.0590, "0/60 is just above 0.05");
  assert.ok(wilsonUpper(5, 100) > 0.05 && wilsonUpper(5, 100) < 0.12);
  assert.equal(wilsonUpper(0, 0), null);
  assert.ok(wilsonUpper(10, 10) <= 1);
});

// ═════ R4 v2 label gates (RULES-V2 A14, V2.1 A17) ═══════════════════════════════════════════════════════════════════════════════════
const acc = (real, ctl, n, gold, modal = 0.4, perReal = null, perCtl = null) => ({ real, ctl, n, gold, modalShare: modal, perReal: perReal ?? Array(n).fill(real[0] / Math.max(1, real[0] + real[1] / 2 + real[2] / 2)), perCtl: perCtl ?? Array(n).fill(ctl[0] / Math.max(1, ctl[0] + ctl[1] / 2 + ctl[2] / 2)) });
test("labelGate: a label passes only with F1 >= 0.90 AND a licensed control at margin >= 0.30; a tie label with too few pieces is unmeasured, never a pass", () => {
  const good = labelGate("tie", acc([100, 0, 0], [0, 0, 100], 20, 100, 1));
  assert.equal(good.status, "pass"); assert.equal(good.f1, 1); assert.equal(good.control_f1, 0); assert.equal(good.control, "no_tie_claims");
  assert.equal(labelGate("tie", acc([100, 0, 0], [0, 0, 100], 1, 1, 1)).status, "unmeasured", "ONE piece with a tie (the DEV situation) leaves the label unmeasured");
  const dropped = labelGate("tie", acc([0, 0, 100], [0, 0, 100], 20, 100, 1));
  assert.equal(dropped.status, "instrument_broken", "a reader that drops every tie ties the no-tie control: the broken-control rule fires first (F1 0 = control 0)");
  const low = labelGate("pitch", acc([80, 20, 20], [1, 99, 99], 20, 100));
  assert.equal(low.status, "fail"); assert.match(low.why, /F1/);
  const weak = labelGate("dur", acc([100, 0, 0], [75, 25, 25], 20, 100));
  assert.equal(weak.status, "fail"); assert.match(weak.why, /margin/, "a control that keeps 75% of the claims is a weak gate (margin 0.25 < 0.30): reported as a failure, not rescued");
  const stratum = labelGate("pitch_black", acc([10, 0, 0], [0, 0, 10], 20, 10));
  assert.equal(stratum.status, "unmeasured", "the black-key stratum needs >= 30 gold claims");
  // degenerate gold: a constant-guess control ties the real arm because the gold is one value -> typed, never a pass
  const deg = labelGate("meter", acc([100, 0, 0], [100, 0, 0], 20, 100, 1));
  assert.equal(deg.status, "no_gate_possible"); assert.equal(deg.degenerate_gold, true);
  const notDeg = labelGate("meter", acc([100, 0, 0], [100, 0, 0], 20, 100, 0.5));
  assert.equal(notDeg.status, "instrument_broken", "a tie on a non-degenerate label is the instrument");
});
test("r4VerdictV2: false on any failed label, null while any label is unmeasured or ungated, true only when every label passed", () => {
  const g = (status) => ({ status });
  assert.equal(r4VerdictV2([g("pass"), g("pass")], 0.99), true);
  assert.equal(r4VerdictV2([g("pass"), g("unmeasured")], 0.99), null, "A17: an unmeasured label leaves the claim unproven");
  assert.equal(r4VerdictV2([g("pass"), g("no_gate_possible")], 0.99), null);
  assert.equal(r4VerdictV2([g("pass"), g("fail")], 0.99), false);
  assert.equal(r4VerdictV2([g("pass"), g("instrument_broken")], 0.99), false);
  assert.equal(r4VerdictV2([g("pass")], 0.5), false, "micro F1 below 0.90");
  assert.equal(r4VerdictV2([], 0.99), null);
});

// ═════ R0 anchors and the larger negative set (RULES-V2 A11) ══════════════════════════════════════════════════════════════════════
need("R0 anchors: ABC needs a tune header AND a tune body; body-like regexes in code, header-only key-value text and note-letter prose are refused with a typed gap", () => {
  const abc = identify(TOY_ABC, { priors: P });
  assert.equal(abc.system, "abc");
  // AUTHORED look-alikes (the review's false positives were chord-shaped [a,b] and tuplet-shaped (3a in minified JavaScript)
  const minjs = "function a(b,c){var d=[b,c,e];return (3a)+d[0]}function f(g,a){return [a,b,c,d]>3?a[1]:(2*g)};".repeat(30) + "\n";
  const m = identify(minjs, { priors: P });
  assert.equal(m.system, null); assert.ok(m.hits.some((h) => /^abc\.(chord|tuplet|note_run_bar)$/.test(h)), "the body-like features DO fire on the look-alike");
  const header = "X: 1\nT: Gamma Signal\nM: 4/4\nL: 1/8\nK: C\n";
  assert.equal(identify(header, { priors: P }).system, null, "an ABC header with no body is not identified");
  assert.equal(identify(header, { priors: P }).gap, "anchor_missing:abc");
  const email = "From: a@example.org\nX: 3\nT: noon\nM: 4/4\nK: C\nSubject: x\n\nA B C D | E F G A |\n";
  assert.equal(identify(email, { priors: P }).system, null, "X: ... K: followed by an RFC822 body is not a tune body");
  const prose = "In the key of G the scale runs A B C D E F G | and the bar line is | and z is a rest. K: G\n";
  assert.equal(identify(prose, { priors: P }).system, null);
  const noX = "M:4/4\nL:1/8\nK:D\n|:A2 d d2 e|f2 d d2 B|A2 d d2 e|f2 e e2 :|\n";
  assert.equal(identify(noX, { priors: P }).system, null, "a bare tune fragment without X: is refused by design (typed gap)");
  assert.ok(P.standard.identify.anchors.abc.length === 2, "the anchors are DECLARED in the standard prior, with their giver");
  assert.equal(P.standard.signatures.find((f) => f.id === "abc.header_structure").giver, "abc-2.1#2.2.2");
  assert.ok(!("musicxml" in P.standard.identify.anchors) && !("lilypond" in P.standard.identify.anchors), "systems without an anchor entry are unchanged");
});

need("the lexicon is rebuilt from NATURAL TRAIN negatives only: the AUTHORED stress fixtures never enter it, and thresholds follow from the larger negative set", () => {
  assert.ok(P.lexicon.n_docs.negatives >= 800, `negatives ${P.lexicon.n_docs.negatives}`);
  assert.equal(P.lexicon.n_docs.drifted_files_skipped, 0);
  assert.ok(Object.keys(P.lexicon.n_docs.negatives_by_kind).every((k) => !/authored/.test(k)));
  assert.ok(P.lexicon.thresholds.abc > 10, `abc threshold ${P.lexicon.thresholds.abc} is derived from negatives that fire body features`);
  for (const f of ["abc.chord", "abc.rest_len", "abc.tuplet"]) assert.ok(P.lexicon.signature_weights[f] < 4.5, `${f} weight ${P.lexicon.signature_weights[f]}: a body-like feature that fires on negatives weighs little`);
});

test("verifyEntry: a negative read in place is dropped as drifted when its first 4096 bytes no longer match the manifest hash", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mabc-"));
  const f = path.join(dir, "x.txt"); fs.writeFileSync(f, "hello world\n");
  const sha = (t) => createHash("sha256").update(Buffer.from(t)).digest("hex");
  const e = { file: f, absolute: true, head_sha256: sha("hello world\n") };
  assert.equal(verifyEntry(e), true);
  fs.writeFileSync(f, "hello there\n");
  assert.equal(verifyEntry(e), false);
  assert.equal(verifyEntry({ file: path.join(dir, "gone.txt"), absolute: true, head_sha256: "00" }), false);
  assert.equal(verifyEntry({ file: f, absolute: true }), true, "no recorded hash: nothing to verify");
});

// ═════ LilyPond deranged prior (RULES-V2.1 A18) and the ABC lexeme gold conventions (A12) ════════════════════════════════════════
need("the roles-deranged prior now touches LilyPond: its pitches and rests are no longer heard (the control was a no-op that equalled the real arm)", () => {
  const ly = `\\version "2.24.0"\n\\relative c' { c4 d e f | g1 r1 | }\n`;
  const heard = (pri) => ear(ly, { system: "lilypond", priors: pri }).filter((t) => t.class === "pitch" || t.class === "rest").length;
  assert.ok(heard(P) >= 6, `real ear hears ${heard(P)} pitches and rests`);
  assert.equal(heard(derangedPriors("roles")), 0, "with the seven note names and the rest names replaced, none is heard as a pitch or a rest");
});
need("ABC lexemes (the SUT's side of A12): a whole-bar rest z8 is a rest, a tie belongs to its note, a tied chord is one chord lexeme", () => {
  const toks = ear(`X:1\nM:4/4\nL:1/8\nK:C\n^C4- C2 G2 | [CE]4- [CE]2 z2 | z8 | Z2 |\n`, { priors: P });
  const by = (c) => toks.filter((t) => t.class === c).map((t) => t.text);
  assert.deepEqual(by("note"), ["^C4-", "C2", "G2"], "the tie is part of the note lexeme");
  assert.deepEqual(by("chord"), ["[CE]4-", "[CE]2"]);
  assert.deepEqual(by("rest"), ["z2", "z8", "Z2"], "z8 is a rest whatever abcjs types it");
});

// ═════ the RULES stamps: the header and the rule blocks are frozen ═══════════════════════════════════════════════════════════════
test("the header digest never changed; the rule blocks carry stamps and a later edit is visible", () => {
  assert.equal(PREREG_SHA256, "0016dd6b4a3cb3f60714a248718c3c8e68f3359d50f60a151ff9a387f57ae2e4", "the pre-registration header is the first version's, byte for byte");
  assert.equal(RULES_V2_SHA256, "4fee2c816fe7309c198883e1dbb9dd9330024ebfa49d1619107c6741baa262f1", "RULES-V2 as written before the first re-run");
  assert.equal(RULES_V21_SHA256, "835e4cb98675e75bf5ff27307d31a648715063666664e5c4b2aea3f4e41141e6", "RULES-V2.1 as written after the first re-run");
  assert.equal(RULES_V22_SHA256, "b40ddf50411af7f2145a37182f5f4101dd18b680cadc94caade88b061e686774", "RULES-V2.2 as written after the TRAIN mutation diagnostic");
  assert.equal(R5_DERIVED_AGREEMENT, 0.98);
});

test("the pre-registration is stamped: the digest is the sha256 of the leading comment block and is stable", () => {
  assert.match(PREREG_SHA256, /^[0-9a-f]{64}$/);
  assert.equal(headerDigest(), PREREG_SHA256);
  assert.equal(FAMILY, "music_abc");
  const head = fs.readFileSync(path.join(HERE, "../eval/notation-competence/music_abc.mjs"), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n");
  for (const must of ["PRE-REGISTRATION", "CLAIM", "GOLD AUTHORITIES", "SPLITS", "PREDICTIONS", "DERIVED data ONLY", "TEST IS RUN ONCE"]) assert.ok(head.includes(must), must);
});

test("measure() never throws: a missing corpus is a typed gap and pass is null, never true", () => {
  const out = execFileSync(process.execPath, ["--input-type=module", "-e",
    `import { measure } from ${JSON.stringify(path.join(HERE, "../eval/notation-competence/music_abc.mjs"))};
     const r = await measure({ split: "dev", limit: 3 }); process.stdout.write(JSON.stringify(r));`],
  { env: { ...process.env, MUSIC_ABC_DIR: path.join(os.tmpdir(), "no-such-music-abc-corpus") }, encoding: "utf8" });
  const res = JSON.parse(out);
  assert.equal(res.family, "music_abc");
  for (const id of ["r0", "r1", "r2", "r3", "r4", "r5"]) {
    const r = res.rungs[id]; assert.ok(r, id);
    assert.equal(r.pass, null, `${id}: pass is null`);
    assert.ok(r.gaps.length && /unmeasured/.test(r.gaps[0].reason), `${id}: typed gap names what is missing`);
    for (const k of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(k in r, `${id}.${k}`);
  }
});

// ═════ the real card, only when the corpus and priors are on disk ═══════════════════════════════════════════════════════════════
const CORPUS = process.env.MUSIC_ABC_DIR || "/private/tmp/claude-501/notation/music_abc";
test("measure({split:'dev', limit}) returns the result shape for every rung on the real DEV corpus (skipped when absent)", { skip: !HAVE_PRIORS || !fs.existsSync(path.join(CORPUS, "manifest.json")) ? "corpus or priors absent" : false, timeout: 120000 }, async () => {
  const { measure } = await import("../eval/notation-competence/music_abc.mjs");
  const res = await measure({ split: "dev", limit: 4 });
  assert.equal(Object.keys(res.rungs).join(","), "r0,r1,r2,r3,r4,r5");
  for (const [id, r] of Object.entries(res.rungs)) {
    assert.ok(r.pass === null || typeof r.pass === "boolean", id);
    assert.ok(Array.isArray(r.gaps) && Array.isArray(r.notes) && r.details && typeof r.controls === "object", id);
    assert.equal(r.details.prereg_sha256, res.prereg_sha256, `${id} carries the pre-registration digest`);
  }
  // the controls were built to fail: where one is licensed it sits below the real arm
  for (const id of ["r1", "r2", "r3"]) { const r = res.rungs[id]; if (r.score != null && r.control != null) assert.ok(r.control < r.score, id); }
});

// ═════ the real corpus: gold conventions, structural certification, R0 negatives, mutation regression (skipped when the corpus is absent) ═══════
const HAVE_CORPUS = HAVE_PRIORS && fs.existsSync(path.join(CORPUS, "manifest.json")) && fs.existsSync(path.join(CORPUS, "derived/structure.json")) && fs.existsSync(path.join(CORPUS, "gold/abclex"));
const needCorpus = (name, opts, fn) => test(name, { skip: HAVE_CORPUS ? false : "music_abc corpus (manifest, gold/abclex, derived/structure.json) absent", ...opts }, fn);

needCorpus("ABC lexeme gold (A12): no lexeme is dropped as disputed, and every lexeme that starts with z or Z is a rest (the first gold labelled whole-bar rests and tied notes 'disputed' and removed them)", {}, () => {
  const dir = path.join(CORPUS, "gold/abclex"); let total = 0, disputed = 0, zrests = 0, tied = 0, bad = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const g = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); if (!g.ok) continue;
    const txt = fs.readFileSync(path.join(CORPUS, "derived", f.replace(/\.json$/, ".abc")), "utf8");
    for (const x of g.lex) {
      total++; if (!x.agree) disputed++;
      const t = txt.slice(x.s, x.e);
      if (/^[zZ]\d/.test(t)) { zrests++; if (x.k !== "rest") bad.push(`${f}:${t}:${x.k}`); }
      if (/^[^\s\[]+-$/.test(t) && (x.k === "note")) tied++;
      if (x.k === "bar" && /^\s|\s$/.test(t)) bad.push(`bar span with whitespace ${f}`);
    }
  }
  assert.ok(total > 100000, `${total} gold lexemes`); assert.equal(disputed, 0, "no lexeme is dropped as disputed");
  assert.ok(zrests > 500, `${zrests} z<digit> lexemes (the first gold dropped 1,169 of them)`); assert.ok(tied > 100, `${tied} tied notes with the tie inside the span`);
  assert.deepEqual(bad, []);
});

needCorpus("independent structural certification of the derived ABC gold (A13): abcjs agrees with the gold on meter and key for EVERY admitted piece, and certifies >= 95% of pieces on every facet", {}, () => {
  const st = JSON.parse(fs.readFileSync(path.join(CORPUS, "derived/structure.json"), "utf8"));
  const sum = st.__summary; assert.ok(sum.pieces >= 300);
  assert.ok(sum.certified / sum.pieces >= 0.95, `certified ${sum.certified} of ${sum.pieces}`);
  let meterKeyBad = 0;
  for (const [id, r] of Object.entries(st)) { if (id === "__summary") continue; for (const ln of r.lines ?? []) if (ln.facets && (!ln.facets.meter || !ln.facets.key)) meterKeyBad++; }
  assert.equal(meterKeyBad, 0, "the meter and key claims of the derived gold are independently confirmed");
  // the uncertified ones are named with a reason, never dropped silently
  for (const [id, r] of Object.entries(st)) if (id !== "__summary" && !r.certified) assert.ok(r.why && r.why !== "ok", id);
});

needCorpus("R0 on the real DEV negatives: no natural non-music file is called music, with a Wilson bound; the authored stress stratum is a separate, labelled stratum", { timeout: 300000 }, async () => {
  const { measureR0 } = await import("../eval/notation-competence/music_abc.mjs");
  const r = measureR0({ split: "dev", limit: 250 });
  const nat = r.details.natural_negatives;
  assert.ok(nat.n >= 200, `${nat.n} natural negatives with limit 250 (the whole DEV class is ~900)`);
  assert.equal(nat.music, 0, "no false music verdict on natural negatives (the review's census found 6 in ~4,180 files, all ABC)");
  assert.ok(nat.wilson95_upper < 0.02, `Wilson upper ${nat.wilson95_upper}`);
  assert.ok(r.details.authored_stress_stratum.n >= 20); assert.match(r.details.authored_stress_stratum.label, /AUTHORED/);
  assert.ok(r.details.near_miss_refused_rate >= 0.99, "MEI near-misses are refused");
  assert.ok(r.gaps.some((g) => /anchor/.test(g.reason)), "the cost of the anchor is stated as a gap");
  for (const sys of ["abc", "musicxml", "lilypond"]) assert.ok(r.details.recall_by_class[sys] >= 0.9, `${sys} recall ${r.details.recall_by_class[sys]}`);
});

needCorpus("R1/R2 report what the gold drops as disputed, per class and per source, and a LilyPond roles-deranged control that is a no-op would be caught", { timeout: 300000 }, async () => {
  const { measureR1R2 } = await import("../eval/notation-competence/music_abc.mjs");
  const { r1 } = measureR1R2({ split: "dev", limit: 12 });
  const rep = r1.details.formats.abc.gold_dispute_report;
  assert.ok(rep.gold_lexemes > 500 && rep.disputed_dropped === 0 && rep.share_dropped === 0);
  assert.ok("note" in rep.by_class && "rest" in rep.by_class && Object.keys(rep.by_source).length >= 1);
  for (const fmt of Object.values(r1.details.formats)) assert.deepEqual(fmt.broken, [], "no control ties or beats the real arm on any format");
  assert.ok(r1.details.formats.lilypond.controls.deranged_prior < r1.details.formats.lilypond.f1 - 0.02, "the LilyPond deranged prior moves the statistic");
});

// MUTATION REGRESSION (RULES-V2 A16, A19, A22). The R3-R5 code path runs on TRAIN (OpenScore Lieder, 60 pieces per format; ties are absent from DEV): an INSTRUMENT diagnostic, never a card.
// A mutant reader is injected through `readFn`. Each must FAIL the R4 rule on the label it breaks; the micro F1 the header rule looks at barely moves, which is why the header rule could not see it.
needCorpus("mutation regression on TRAIN: dropped ties, a shifted ABC octave, a constant meter and a dropped key each FAIL R4 (and the octave also R5); the exact reader passes both", { timeout: 900000 }, async () => {
  const { measureR3R4R5 } = await import("../eval/notation-competence/music_abc.mjs");
  const dropRel = (labels) => (t, o) => { const r = read(t, o); return { ...r, relations: r.relations.filter((x) => !labels.includes(x.label)) }; };
  const constMeter = (t, o) => { const r = read(t, o); return { ...r, relations: r.relations.map((x) => (x.label === "meter" ? { ...x, end2: "4/4" } : x)) }; };
  const octShift = (t, o) => { if (o.system !== "abc") return read(t, o); const std = JSON.parse(JSON.stringify(o.priors.standard)); std.abc.octave.lower_letter_octave += 1; return read(t, { ...o, priors: preparePriors({ standard: std, lexicon: o.priors.lexicon }) }); };
  const only = (sys, fn) => (t, o) => (o.system === sys ? fn(t, o) : read(t, o));
  const run = (readFn) => measureR3R4R5({ split: "train", limit: 60, readFn });
  const base = run(read);
  assert.equal(base.r4.pass, true, "the exact reader passes R4 v2 on TRAIN");
  assert.equal(base.r5.pass, true, "and R5 v2");
  for (const fmt of ["musicxml", "abc"]) assert.deepEqual(base.r4.details.formats[fmt].r4.label_gates.map((g) => g.status), ["pass", "pass", "pass", "pass", "pass", "pass"], fmt);
  const cases = [
    ["abc tie dropped", only("abc", dropRel(["tie"])), "abc", "tie"],
    ["musicxml tie dropped", only("musicxml", dropRel(["tie"])), "musicxml", "tie"],
    ["abc lowercase octave +1", octShift, "abc", "pitch"],
    ["constant 4/4 meter (abc)", only("abc", constMeter), "abc", "meter"],
    ["key claims dropped", dropRel(["key"]), "musicxml", "key"],
  ];
  for (const [name, fn, fmt, label] of cases) {
    const res = run(fn);
    const f = res.r4.details.formats[fmt].r4;
    assert.equal(res.r4.pass, false, `${name}: R4 must fail`);
    assert.ok(f.failed_labels.includes(label), `${name}: label ${label} fails (${f.failed_labels})`);
    if (label === "tie") assert.equal(f.per_label_f1.tie, 0, `${name}: tie F1 0`);
    if (label === "tie") assert.ok(f.f1 > 0.98, `${name}: the micro F1 the header rule gates on is still ${f.f1}: it could not see this`);
    if (name.includes("octave")) { assert.equal(res.r5.pass, false, "the shifted octave must fail R5 (pitch-only agreement under 0.98)"); assert.ok(res.r5.details.pitch_only.agreement < R5_DERIVED_AGREEMENT); }
  }
});

needCorpus("a control that is a copy of the real arm breaks the instrument in a real R3-R5 run (the II.23 flag fires on real data, not only on toy arrays)", { timeout: 300000 }, async () => {
  const { measureR3R4R5 } = await import("../eval/notation-competence/music_abc.mjs");
  // a reader that ignores `ablate` makes every ablation control equal to the real arm: the controls tie it
  const stubborn = (t, o) => read(t, { ...o, ablate: [] });
  const res = measureR3R4R5({ split: "dev", limit: 12, readFn: stubborn });
  assert.equal(res.r3.pass, false, "ablate_duration equals the real arm: R3 is failed, not silently passed");
  assert.ok(res.r3.details.instrument_broken.some((x) => /ablate_duration/.test(x)), String(res.r3.details.instrument_broken));
  assert.match(res.r3.notes.join(" "), /INSTRUMENT BROKEN/);
  assert.equal(res.r4.pass, false);
});
