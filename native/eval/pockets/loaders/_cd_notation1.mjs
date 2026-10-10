// loaders/_cd_notation1.mjs — chess (SAN movetext) and chemistry (SMILES atoms, nomenclature words, ChEBI definitions) pockets from /private/tmp/claude-501/notation.
import fs from "node:fs";
import { markCase, blocksOf, takeDocs, makePocket, entry, readText, proseLine, newStats, sumStats } from "./_cd_util.mjs";

export const NOTATION = "/private/tmp/claude-501/notation";
const jsonl = (f) => readText(f).split("\n").filter(Boolean).map((l) => JSON.parse(l));

// ---- chess: one unit = one game's SAN moves ----
const SAN = /^(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?)[+#]?(?:[!?]{1,2})?$/;
export function sanMoves(pgn) {
  const i = pgn.lastIndexOf("]\n\n"), mt = (i >= 0 ? pgn.slice(i + 3) : pgn).replace(/\{[^}]*\}/g, " ").replace(/\([^)]*\)/g, " ").replace(/;[^\n]*/g, " ");
  const out = [];
  for (const t of mt.split(/\s+/)) {
    if (!SAN.test(t)) continue;
    const m = t.replace(/[+#!?]+$/, "");
    out.push(/^O-O/.test(m) ? m.toLowerCase() : markCase(m));
  }
  return out;
}
function chessPocket(id, splits, label) {
  return entry(id, () => {
    const games = splits.flatMap((s) => jsonl(`${NOTATION}/chess_pgn/corpus/${s}/games.jsonl`));
    const units = games.map((g) => sanMoves(g.text)).filter((u) => u.length >= 4);
    const blocks = blocksOf(units, 25), r = takeDocs(id, blocks, (b) => b);
    return makePocket({ id, register: "notation", language: "x-chess-san", script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: "SAN moves from PGN movetext (tags, comments {..}, variations, move numbers, results, annotation glyphs and +/# check marks dropped); each uppercase letter X written as U+00B7+x so piece moves (Bxc6) differ from pawn captures (bxc6); castling o-o / o-o-o; unit = one game (>= 4 plies)",
      docDef: "block of 25 consecutive games; whole blocks in sha256(id:blockIndex) order", source: `${NOTATION}/chess_pgn/corpus/{${splits.join(",")}}/games.jsonl (${label}); ${games.length} games read, ${units.length} kept`,
      notes: "Lichess games; tag section (player names) never read into tokens. Sibling pocket of the other chess pocket (amateur online play vs tournament broadcast)." } });
  });
}

// ---- chemistry ----
const ATOM = /\[[^\]]+\]|Br|Cl|[BCNOPSFI]|[bcnops]|\*/g;
export const smilesAtoms = (s) => (s.match(ATOM) ?? []).map(markCase);
const NAMEWORD = /\p{L}[\p{L}\p{M}]*/gu;
export const nameWords = (s) => (s.normalize("NFC").match(NAMEWORD) ?? []).map((w) => w.toLowerCase().normalize("NFC")).filter((w) => w === w.toLowerCase());
const chem = (s) => JSON.parse(readText(`${NOTATION}/chem_smiles/corpus/${s}.json`));
const bySrc = (src) => ["train", "dev", "test"].flatMap((s) => chem(s).records.filter((r) => r.source === src));

function smilesPocket(src, label) {
  const id = `cd-smiles-${src}`;
  return entry(id, () => {
    const units = bySrc(src).map((r) => smilesAtoms(r.smiles)).filter((u) => u.length >= 2);
    const r = takeDocs(id, blocksOf(units, 100), (b) => b);
    return makePocket({ id, register: "notation", language: "x-smiles", script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: "SMILES atom tokens only: organic-subset atoms and bracket atoms ([C@@H], [nH], [O-]) as single symbols; bonds, branches, ring-closure digits and dots are punctuation/numbers and are dropped; uppercase letter X written as U+00B7+x (aromatic c vs aliphatic C stay distinct)",
      docDef: "block of 100 consecutive molecules of one database (file order); whole blocks in sha256(id:blockIndex) order", source: `${NOTATION}/chem_smiles/corpus/{train,dev,test}.json records with source=${src} (${label})`,
      notes: `${units.length} molecules; sibling pockets cd-smiles-{chebi,chembl,ccd,pubchem} share the notation and differ in database and selection` } });
  });
}
function namesPocket(src, label) {
  const id = `cd-iupac-${src}`;
  return entry(id, () => {
    const ids = new Set(bySrc(src).map((r) => r.id));
    const units = ["train", "dev", "test"].flatMap((s) => chem(s).names).filter((n) => ids.has(n.id)).map((n) => nameWords(n.text)).filter((u) => u.length);
    const r = takeDocs(id, blocksOf(units, 100), (b) => b);
    return makePocket({ id, register: "nomenclature", language: "x-chem-name", script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: "systematic chemical names split into maximal letter runs (locants, digits, brackets, hyphens and commas dropped), lowercased NFC; unit = one compound name",
      docDef: "block of 100 consecutive names (file order); whole blocks in sha256(id:blockIndex) order", source: `${NOTATION}/chem_smiles/corpus names with ids from source=${src} (${label})`,
      notes: `${units.length} names; nomenclature style differs by registry (ChEBI IUPAC field, wwPDB CCD OpenEye-style names, PubChem Lexichem names)` } });
  });
}
function defsPocket() {
  const id = "cd-chebi-defs";
  return entry(id, () => {
    const st = newStats(), units = chem("train").english.map((s) => proseLine(s, st)).filter((u) => u.length);
    const r = takeDocs(id, blocksOf(units, 50), (b) => b);
    return makePocket({ id, register: "encyclopedia", language: "en", script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: "prose words: letters/marks/digits/underscore runs with inner apostrophes, lowercased NFC, numeric-initial tokens dropped; unit = one definition sentence", docDef: "block of 50 consecutive definitions; whole blocks in sha256 order",
      source: `${NOTATION}/chem_smiles/corpus/train.json .english (ChEBI term definitions; the dev/test .english lists are UD English-EWT sentences and are NOT used)`, notes: `${units.length} definitions; technical chemistry-biology English; counters ${JSON.stringify(st)}` } });
  });
}

export function notation1Entries() {
  const out = [];
  if (fs.existsSync(`${NOTATION}/chess_pgn/corpus/train/games.jsonl`)) out.push(chessPocket("cd-chess-lichess", ["train"], "Lichess standard rated games 2013-01 and 2020-01, amateur online play"), chessPocket("cd-chess-broadcast", ["dev", "test"], "Lichess broadcast tournament games 2023-01 and 2024-01"));
  if (fs.existsSync(`${NOTATION}/chem_smiles/corpus/train.json`)) {
    for (const [s, l] of [["chebi", "ChEBI curated compounds"], ["chembl", "ChEMBL bioactive molecules"], ["ccd", "wwPDB chemical component dictionary ligands"], ["pubchem", "PubChem random compounds"]]) out.push(smilesPocket(s, l));
    for (const [s, l] of [["chebi", "ChEBI"], ["ccd", "wwPDB CCD"], ["pubchem", "PubChem"]]) out.push(namesPocket(s, l));
    out.push(defsPocket());
  }
  return out;
}
