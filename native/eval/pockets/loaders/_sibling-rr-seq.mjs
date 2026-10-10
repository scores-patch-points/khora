// loaders/_sibling-rr-seq.mjs — SIBLING pockets (genetic sequence) for the replication of comp.rigidR (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// MATERIAL: the 66 NCBI RefSeq GenBank records of /private/tmp/claude-501/notation/genetic/raw/gbk. The atlas pockets cd-protein-aa and cd-codons each took 91-92 of the 1198 blocks (10 consecutive genes, genome order, per
//   record; single-contiguous-location CDS only) in sha256(id:blockIndex) order up to the 300k cap (loaders/_cd_notation2.mjs). The two atlas selections differ (the hash order depends on the pocket id), so the atlas read the
//   UNION of both block sets; the blocks in NEITHER set are the material here (held-out GENES of the same 66 genomes). The atlas selections are re-derived with the atlas's own parseGbk/blocksOf/takeDocs.
//   rr-seq-protein  amino-acid letters of the CDS translation (same unit rule as cd-protein-aa) — the KIND where comp.rigidR is not PRESENT in the atlas (cd-protein-aa)
//   rr-seq-codons   the same genes read as codon triplets (same unit rule as cd-codons) — the KIND where comp.rigidR IS PRESENT (cd-codons)
// BOTH siblings use the SAME held-out blocks (chosen once, by the protein token count under the id "rr-seq"), so they differ only in the notation.
// HONEST LIMIT: new genes of the same genomes (and, for the vertebrate mitochondrial records, orthologous genes), not a new biological world; one tiny alphabet (20 letters) and one 64-word vocabulary.
import { blocksOf, takeDocs, makePocket, sortedFiles } from "./_cd_util.mjs";
import { NOTATION } from "./_cd_notation1.mjs";
import { parseGbk } from "./_cd_notation2.mjs";
import fs from "node:fs";

const GB = `${NOTATION}/genetic/raw/gbk`;
const gbkFiles = () => (fs.existsSync(GB) ? sortedFiles(GB, (f) => f.endsWith(".gb.gz")) : []);
const geneBlocks = (n) => gbkFiles().flatMap((f) => blocksOf(parseGbk(f), n).map((b) => ({ f, b })));
const aaUnit = (g) => g.aa.split("").filter((c) => /\p{L}/u.test(c));                       // = cd-protein-aa toUnit
const codonUnit = (g) => g.codons.match(/.{3}/g).filter((c) => /^[acgt]{3}$/.test(c));      // = cd-codons toUnit
export const IDS = ["rr-seq-protein", "rr-seq-codons"];
let _sel = null;
function selection() {
  if (_sel) return _sel;
  const cands = geneBlocks(10);
  const atlasP = takeDocs("cd-protein-aa", cands, (c) => c.b.map(aaUnit).filter((u) => u.length));
  const atlasC = takeDocs("cd-codons", cands, (c) => c.b.map(codonUnit).filter((u) => u.length));
  const used = new Set([...atlasP.docKeys, ...atlasC.docKeys]);
  const left = cands.filter((_, i) => !used.has(i));
  const mine = takeDocs("rr-seq", left, (c) => c.b.map(aaUnit).filter((u) => u.length));
  return (_sel = { cands: cands.length, atlasP: atlasP.docKeys.length, atlasC: atlasC.docKeys.length, usedUnion: used.size, left: left.length, chosen: mine.docKeys.map((i) => left[i]), picked: mine.docKeys.length });
}
function pocket(id, toUnit, language, tokenisation, notes) {
  const S = selection(), r = { units: [], docOf: [] };
  S.chosen.forEach((c, k) => { for (const g of c.b) { const u = toUnit(g); if (u.length) { r.units.push(u); r.docOf.push(k); } } });
  const p = makePocket({ id, register: "sequence", language, script: "latn", units: r.units, docOf: r.docOf, meta: { tokenisation,
    docDef: "block of 10 consecutive genes (genome order, one record each); whole blocks of the held-out set, chosen once for both siblings in sha256(rr-seq:blockIndex) order up to the 300k cap",
    source: `${GB} (66 NCBI RefSeq GenBank records, single-contiguous-location CDS features only)`,
    notes: `${notes}; ${S.picked} blocks taken of ${S.left} held-out (${S.cands} blocks in all; atlas cd-protein-aa took ${S.atlasP}, cd-codons ${S.atlasC}, union ${S.usedUnion})`, atlasKin: id === "rr-seq-protein" ? "cd-protein-aa" : "cd-codons", sibling: true } });
  return { ...p, group: "sib" };
}
export async function load(onlyIds = null) {
  const out = [];
  if (!fs.existsSync(GB)) return out;
  if (!onlyIds || onlyIds.includes("rr-seq-protein")) out.push(pocket("rr-seq-protein", aaUnit, "x-protein", "amino-acid letters of the CDS translation (20-letter alphabet plus rare x/u), lowercased; one unit = one protein", "held-out genes of the cd-protein-aa source"));
  if (!onlyIds || onlyIds.includes("rr-seq-codons")) out.push(pocket("rr-seq-codons", codonUnit, "x-dna-codons", "CDS DNA read as codon triplets (64-word vocabulary; stop codon kept), reverse-complemented for complement() genes; one unit = one gene", "the same held-out genes as rr-seq-protein, read as codons"));
  return out;
}
