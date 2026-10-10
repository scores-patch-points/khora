// loaders/_sibling-para-notation.mjs — NEW notation pockets (the kind where para.prefixCopy is ABSENT in the atlas: protein and SMILES) for the SIBLING REPLICATION of para.prefixCopy (underscore: ignored by run-atlas.mjs).
// HELD-OUT DOCUMENTS of the atlas's own corpora, not new worlds (the same limit as the held-out BPMN siblings of the fig.introRight confirmation):
//  sp-protein-aa : the atlas pocket cd-protein-aa takes 91 of the 1198 blocks of 10 consecutive proteins (genome order) of the 66 RefSeq GenBank records (loaders/_cd_notation2.mjs: geneBlocks(10) + takeDocs("cd-protein-aa")).
//                  This loader recomputes that selection exactly (the atlas figures 293,973 tokens / 894 units / 91 documents are re-checked at load, meta.atlasCheck) and builds the pocket from the 1107 blocks the atlas did NOT take,
//                  whole blocks in sha256("sp-protein-aa":block) order up to the 300k cap. Same tokenisation (amino-acid letters), same unit (one protein), same document (a block of 10 genes in genome order).
//  sp-smiles-ccd : wwPDB Chemical Component Dictionary ligands (raw/ccd/Components-smiles-stereo-oe.smi, 51,513 components) whose ids are NOT among the 6,000 of the atlas pocket cd-smiles-ccd (corpus dev.json source=ccd). The atlas
//                  corpus is a seeded random sample in shuffled order, so the sibling is built the same way: the unseen components are shuffled with rngOf(seedOf("sp-smiles-ccd", "order")) and the first 6000 with >= 2 atom tokens are
//                  kept; blocks of 100 consecutive molecules; whole blocks in sha256 order. Same tokenisation (SMILES atoms, bonds/branches/digits dropped; uppercase marked by U+00B7).
//                  NOTE: because the molecule ORDER is a random shuffle in both the atlas pocket and the sibling, "no adjacency law" holds by construction in this pocket (it is an instrument check of the null, not a probe of text order).
import fs from "node:fs";
import { rngOf, seedOf, tokenCount } from "../lib/pocket.mjs";
import { blocksOf, takeDocs, makePocket, readText, sortedFiles, markCase } from "./_cd_util.mjs";
import { parseGbk } from "./_cd_notation2.mjs";
import { NOTATION, smilesAtoms } from "./_cd_notation1.mjs";

const GB = `${NOTATION}/genetic/raw/gbk`, CCD = `${NOTATION}/chem_smiles/raw/ccd/Components-smiles-stereo-oe.smi`, CORPUS = `${NOTATION}/chem_smiles/corpus`;
const aaUnit = (g) => g.aa.split("").filter((c) => /\p{L}/u.test(c));
let _gb = null;
function geneBlocks() { if (_gb) return _gb; const files = sortedFiles(GB, (f) => f.endsWith(".gb.gz")); return (_gb = files.flatMap((f) => blocksOf(parseGbk(f), 10).map((b) => ({ f, b })))); }
function proteinPocket() {
  const cands = geneBlocks(), load = (c) => c.b.map(aaUnit).filter((u) => u.length);
  const atlas = takeDocs("cd-protein-aa", cands, load), atlasKeys = new Set(atlas.docKeys), atlasTokens = tokenCount(atlas.units);
  const rest = cands.map((c, i) => ({ c, i })).filter((x) => !atlasKeys.has(x.i)).map((x) => x.c);
  const r = takeDocs("sp-protein-aa", rest, load);
  return makePocket({ id: "sp-protein-aa", register: "sequence", language: "x-protein", script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: "amino-acid letters of the CDS translation (20-letter alphabet plus rare x/u), lowercased; one unit = one protein (as atlas cd-protein-aa)", docDef: "block of 10 consecutive proteins (genes) in genome order; whole blocks in sha256(sp-protein-aa:blockIndex) order, cap 300000",
    source: `${GB} (66 NCBI RefSeq GenBank records) minus the ${atlas.docKeys.length} blocks of the atlas pocket cd-protein-aa`, atlasCheck: { atlasTokens, atlasUnits: atlas.units.length, atlasDocs: atlas.docKeys.length, atlasExpected: { tokens: 293973, units: 894, docs: 91 }, reproduced: atlasTokens === 293973 && atlas.units.length === 894 && atlas.docKeys.length === 91 },
    notes: `HELD-OUT blocks of the atlas protein corpus: ${rest.length} candidate blocks, ${r.docKeys.length} taken` } });
}
function ccdPocket() {
  const seen = new Set();
  for (const s of ["train", "dev", "test"]) for (const x of JSON.parse(readText(`${CORPUS}/${s}.json`)).records) if (x.source === "ccd") seen.add(x.id.replace(/^CCD:/, ""));
  const all = []; let total = 0;
  for (const line of readText(CCD).split("\n")) { const p = line.split("\t"); if (p.length < 2 || !p[0]) continue; total++; if (!seen.has(p[1].trim())) all.push({ id: p[1].trim(), smiles: p[0].trim() }); }
  const rnd = rngOf(seedOf("sp-smiles-ccd", "order"));
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  const units = []; for (const x of all) { const u = smilesAtoms(x.smiles); if (u.length >= 2) units.push(u); if (units.length >= 6000) break; }
  const r = takeDocs("sp-smiles-ccd", blocksOf(units, 100), (b) => b);
  return makePocket({ id: "sp-smiles-ccd", register: "notation", language: "x-smiles", script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: "SMILES atom tokens only (organic-subset and bracket atoms as single symbols; bonds, branches, ring-closure digits and dots dropped); uppercase letter X written as U+00B7+x (as atlas cd-smiles-ccd)",
    docDef: "block of 100 consecutive molecules of the seeded shuffled order; whole blocks in sha256(sp-smiles-ccd:blockIndex) order", source: `${CCD} minus the ${seen.size} ids of the atlas corpus; ${total} components in the file, ${all.length} unseen, ${units.length} used`,
    notes: "HELD-OUT wwPDB CCD ligands in seeded random order (exchangeable by construction, as the atlas pocket)" } });
}
export const IDS = ["sp-protein-aa", "sp-smiles-ccd"];
export async function load(onlyIds = null) {
  const out = [];
  if (!onlyIds || onlyIds.includes("sp-protein-aa")) if (fs.existsSync(GB)) out.push(proteinPocket());
  if (!onlyIds || onlyIds.includes("sp-smiles-ccd")) if (fs.existsSync(CCD)) out.push(ccdPocket());
  return out;
}
