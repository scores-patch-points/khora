// loaders/_sibling-rigidl-chem.mjs — NEW notation pockets for the SIBLING REPLICATION of comp.rigidL (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// The atlas pocket where comp.rigidL is ABSENT is cd-smiles-pubchem (PubChem random compounds, Kekule SMILES: the single atom token 'C' is 72% of all tokens, so the shuffled null already sits at 0.46).
//  rl-smiles-pubchem-heldout : the 3,000 PubChem compounds of /private/tmp/claude-501/notation/chem_smiles/raw/pubchem/props.jsonl (9,000 seeded random CIDs) that are NOT among the corpus records (corpus/{train,dev,test}.json,
//     every source) that the four atlas SMILES pockets read, and whose InChI skeleton (formula, /c, /h, /q, /p layers: a proxy for the InChIKey connectivity block that the corpus builder used) is not that of a corpus record either.
//     Same tokenisation as the atlas (smilesAtoms from _cd_notation1.mjs: SMILES atom tokens only, uppercase letter X written U+00B7+x). Molecules are ordered by sha256("rl-smiles-pubchem-heldout:" + CID) (a seeded shuffle, the
//     corpus order is also a seeded shuffle), blocks of 100 consecutive molecules are the documents, whole blocks, cap 300000 (not reached).
//  rl-codons-heldout : codon triplets of the 66 RefSeq GenBank records (the atlas pocket cd-codons, v 0.007, PRESENT with z 11.6 and 9.3 = the weakest PRESENT cell of a real pocket), built from the blocks of 10 consecutive genes
//     that the atlas did NOT take (the atlas selection is recomputed with takeDocs("cd-codons") and re-checked against the atlas figures 292,852 tokens / 894 units / 92 documents, stored in meta.atlasCheck).
//     HELD-OUT BLOCKS OF THE SAME GENOMES (different genes), not new genomes: weaker independence than a new corpus.
import fs from "node:fs";
import { rngOf, seedOf, sha256, tokenCount } from "../lib/pocket.mjs";
import { blocksOf, takeDocs, makePocket, readText, sortedFiles } from "./_cd_util.mjs";
import { parseGbk } from "./_cd_notation2.mjs";
import { NOTATION, smilesAtoms } from "./_cd_notation1.mjs";

const CORPUS = `${NOTATION}/chem_smiles/corpus`, RAW = `${NOTATION}/chem_smiles/raw/pubchem/props.jsonl`, GB = `${NOTATION}/genetic/raw/gbk`;
const skeleton = (inchi) => { const p = inchi.split("/"); return [p[0], p[1], ...p.slice(2).filter((x) => "chqp".includes(x[0]))].join("/"); };

function pubchemPocket() {
  const id = "rl-smiles-pubchem-heldout", seenId = new Set(), seenKey = new Set();
  for (const s of ["train", "dev", "test"]) for (const r of JSON.parse(readText(`${CORPUS}/${s}.json`)).records) { seenId.add(r.id); if (r.inchi) seenKey.add(skeleton(r.inchi)); }
  const raw = readText(RAW).split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.SMILES && r.InChI);
  const dropped = { inCorpusById: 0, skeletonInCorpus: 0, repeatedSkeleton: 0, under2atoms: 0 }, local = new Set(), cand = [];
  for (const r of raw) {
    if (seenId.has(`CID:${r.CID}`)) { dropped.inCorpusById++; continue; }
    const k = skeleton(r.InChI);
    if (seenKey.has(k)) { dropped.skeletonInCorpus++; continue; }
    if (local.has(k)) { dropped.repeatedSkeleton++; continue; }
    local.add(k); cand.push(r);
  }
  cand.sort((a, b) => { const x = sha256(`${id}:${a.CID}`), y = sha256(`${id}:${b.CID}`); return x < y ? -1 : x > y ? 1 : 0; });
  const units = []; for (const r of cand) { const u = smilesAtoms(r.SMILES); if (u.length >= 2) units.push(u); else dropped.under2atoms++; }
  const r = takeDocs(id, blocksOf(units, 100), (b) => b);
  return makePocket({ id, register: "notation", language: "x-smiles", script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: "SMILES atom tokens only (organic-subset atoms and bracket atoms as single symbols; bonds, branches, ring-closure digits and dots dropped); uppercase letter X written as U+00B7+x (as atlas cd-smiles-pubchem)",
    docDef: "block of 100 consecutive molecules in sha256(id:CID) order; whole blocks in sha256(id:blockIndex) order, cap 300000", source: `${RAW} (${raw.length} records) minus corpus ids and InChI skeletons; ${cand.length} candidates, ${units.length} molecules with >= 2 atoms`,
    notes: `HELD-OUT PubChem random compounds, same selection procedure as the atlas pocket; dropped ${JSON.stringify(dropped)}` } });
}

let _gb = null;
function geneBlocks() { if (_gb) return _gb; const files = sortedFiles(GB, (f) => f.endsWith(".gb.gz")); return (_gb = files.flatMap((f) => blocksOf(parseGbk(f), 10).map((b) => ({ f, b })))); }
const codonUnit = (g) => g.codons.match(/.{3}/g).filter((c) => /^[acgt]{3}$/.test(c));
function codonPocket() {
  const id = "rl-codons-heldout", cands = geneBlocks(), load = (c) => c.b.map(codonUnit).filter((u) => u.length);
  const atlas = takeDocs("cd-codons", cands, load), keys = new Set(atlas.docKeys), atlasTokens = tokenCount(atlas.units);
  const rest = cands.filter((_, i) => !keys.has(i)), r = takeDocs(id, rest, load);
  return makePocket({ id, register: "sequence", language: "x-dna-codons", script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: "CDS DNA read as codon triplets (64-word vocabulary), as atlas cd-codons; one unit = one gene", docDef: "block of 10 consecutive genes in genome order; whole blocks in sha256(id:blockIndex) order, cap 300000",
    source: `${GB} (66 NCBI RefSeq GenBank records) minus the ${atlas.docKeys.length} blocks of the atlas pocket cd-codons`,
    atlasCheck: { atlasTokens, atlasUnits: atlas.units.length, atlasDocs: atlas.docKeys.length, expected: { tokens: 292852, units: 894, docs: 92 }, reproduced: atlasTokens === 292852 && atlas.units.length === 894 && atlas.docKeys.length === 92 },
    notes: `HELD-OUT gene blocks of the atlas genomes: ${rest.length} candidate blocks, ${r.docKeys.length} taken` } });
}
export const IDS = ["rl-smiles-pubchem-heldout", "rl-codons-heldout"];
export async function load(onlyIds = null) {
  const out = [];
  if ((!onlyIds || onlyIds.includes(IDS[0])) && fs.existsSync(RAW)) out.push(pubchemPocket());
  if ((!onlyIds || onlyIds.includes(IDS[1])) && fs.existsSync(GB)) out.push(codonPocket());
  return out;
}
