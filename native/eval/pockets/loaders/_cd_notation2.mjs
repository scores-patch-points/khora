// loaders/_cd_notation2.mjs — genetic sequences (amino acids, codons, gene-product names from 66 RefSeq GenBank records) and IPA word-forms (WikiPron) pockets.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { markCase, blocksOf, takeDocs, makePocket, entry, readText, proseLine, newStats, sortedFiles } from "./_cd_util.mjs";
import { NOTATION } from "./_cd_notation1.mjs";

const GB = `${NOTATION}/genetic/raw/gbk`;
const RC = { a: "t", c: "g", g: "c", t: "a" };
const revcomp = (s) => s.split("").reverse().map((c) => RC[c] ?? "n").join("");
const _gcache = new Map();

/** Minimal GenBank parser: genes (CDS with a single contiguous location) -> {codons: "atgaaa...", aa, product}. */
export function parseGbk(file) {
  if (_gcache.has(file)) return _gcache.get(file);
  const txt = zlib.gunzipSync(fs.readFileSync(file)).toString("latin1");
  const fi = txt.indexOf("\nFEATURES"), oi = txt.indexOf("\nORIGIN");
  const seq = txt.slice(oi + 7, txt.indexOf("\n//", oi)).replace(/[^acgtn]/gi, "").toLowerCase();
  const feats = []; let cur = null, q = null;
  for (const line of txt.slice(fi, oi).split("\n").slice(1)) {
    const k = /^ {5}(\S+)\s+(\S.*)$/.exec(line);
    if (k) { cur = { key: k[1], loc: k[2], quals: {} }; q = null; feats.push(cur); continue; }
    if (!cur || !/^ {21}/.test(line)) continue;
    const t = line.slice(21), m = /^\/([A-Za-z_]+)(?:=(.*))?$/.exec(t);
    if (m) { q = m[1]; cur.quals[q] = (m[2] ?? "").replace(/^"/, ""); } else if (q) cur.quals[q] += (q === "translation" ? "" : " ") + t.replace(/^"/, ""); else cur.loc += t;
  }
  const genes = [];
  for (const f of feats) {
    if (f.key !== "CDS") continue;
    const m = /^(complement\()?(\d+)\.\.(\d+)\)?$/.exec(f.loc.replace(/\s/g, ""));
    if (!m || (f.quals.codon_start && f.quals.codon_start !== "1")) continue;
    let s = seq.slice(Number(m[2]) - 1, Number(m[3])); if (m[1]) s = revcomp(s);
    if (s.length % 3 || s.length < 30) continue;
    const aa = (f.quals.translation ?? "").replace(/"$/, "").toLowerCase();
    genes.push({ codons: s, aa, product: (f.quals.product ?? "").replace(/"$/, "").replace(/\s+/g, " ").trim() });
  }
  _gcache.set(file, genes); if (_gcache.size > 80) _gcache.clear();
  return genes;
}
const gbkFiles = () => (fs.existsSync(GB) ? sortedFiles(GB, (f) => f.endsWith(".gb.gz")) : []);
const geneBlocks = (n) => gbkFiles().flatMap((f) => blocksOf(parseGbk(f), n).map((b) => ({ f, b })));

function geneticPocket(id, register, language, size, toUnit, tokenisation, unitDoc, notes) {
  return entry(id, () => {
    const cands = geneBlocks(size), r = takeDocs(id, cands, (c) => c.b.map(toUnit).filter((u) => u.length));
    return makePocket({ id, register, language, script: "latn", units: r.units, docOf: r.docOf, meta: { tokenisation, docDef: unitDoc, source: `${GB} (66 NCBI RefSeq GenBank records, single-contiguous-location CDS features only)`, notes: `${notes}; ${r.docKeys.length} blocks taken of ${cands.length}` } });
  });
}

// ---- IPA: WikiPron word-forms, pooled by orthography script ----
const IPA = `${NOTATION}/ipa/corpus`;
export function ipaFiles() {
  const best = new Map();
  for (const s of ["train", "dev", "test"]) if (fs.existsSync(`${IPA}/${s}`)) for (const f of sortedFiles(`${IPA}/${s}`, (x) => x.endsWith(".tsv"))) {
    const b = path.basename(f, ".tsv"), key = b.replace(/_(broad|narrow)$/, ""), broad = /_broad$/.test(b);
    if (!best.has(key) || (broad && !/_broad$/.test(best.get(key).b))) best.set(key, { f, b, key, script: key.split("_")[1] });
  }
  return [...best.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}
function ipaUnits(file) {
  const seen = new Set(), units = [];
  for (const l of readText(file).split("\n")) {
    const p = l.split("\t"); if (p.length < 2 || seen.has(p[0])) continue; seen.add(p[0]);
    const u = p[1].trim().split(/\s+/).map((t) => markCase(t.normalize("NFC"))).filter((t) => t && !/^[\p{P}]+$/u.test(t) && !/^\p{N}+$/u.test(t));
    if (u.length) units.push(u);
  }
  return units;
}
function ipaPocket(id, pred, label) {
  return entry(id, () => {
    const files = ipaFiles().filter((x) => pred(x.script));
    const cands = files.flatMap((x) => blocksOf(ipaUnits(x.f), 50).map((b) => ({ x, b })).filter((c) => c.b.length >= 25));
    const r = takeDocs(id, cands, (c) => c.b), langs = new Set(r.docKeys.map((i) => cands[i].x.key.split("_")[0]));
    return makePocket({ id, register: "notation", language: "mul", script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: "IPA phones as segmented by the source (space-separated; digraphs, length marks and diacritics stay attached); one unit = one word's pronunciation; first listed pronunciation per word only; any uppercase letter X written as U+00B7+x",
      docDef: "block of 50 consecutive words of one language file; whole blocks in sha256(id:blockIndex) order", source: `${IPA}/{train,dev,test}/*.tsv WikiPron; ${label}; broad transcription preferred over narrow for each language`,
      notes: `mixed-language pocket (language 'mul'): ${langs.size} languages in the pocket out of ${files.length} language files in the class; script field is the transcription alphabet (IPA, Latin-based), the class is the orthography script of the source word` } });
  });
}
export function notation2Entries() {
  const out = [];
  if (gbkFiles().length) {
    const aaTok = "amino-acid letters of the CDS translation (20-letter alphabet plus rare x/u), lowercased; one unit = one protein", pd = "block of 10 consecutive proteins (genes) in genome order; whole blocks in sha256(id:blockIndex) order";
    out.push(geneticPocket("cd-protein-aa", "sequence", "x-protein", 10, (g) => g.aa.split("").filter((c) => /\p{L}/u.test(c)), aaTok, pd, "NCBI translations of RefSeq CDS; a pocket whose alphabet is 20 letters, i.e. a tiny-vocabulary universe"));
    out.push(geneticPocket("cd-codons", "sequence", "x-dna-codons", 10, (g) => g.codons.match(/.{3}/g).filter((c) => /^[acgt]{3}$/.test(c)), "CDS DNA read as codon triplets (64-word vocabulary; stop codon kept), reverse-complemented for complement() genes; one unit = one gene", pd, "bacterial/archaeal/organelle/yeast-chromosome genes, genetic code tables vary by genome"));
    out.push(geneticPocket("cd-gene-products", "nomenclature", "en", 50, (g) => proseLine(g.product, newStats()), "/product qualifier text of each CDS as prose words (letters/marks/digits/underscore, inner apostrophes, lowercased, numeric-initial dropped); one unit = one product name", "block of 50 consecutive CDS products in genome order; whole blocks in sha256 order", "protein-name phrases such as 'ABC transporter permease'; heavy repetition of 'hypothetical protein' is a real property of the source"));
  }
  if (fs.existsSync(`${IPA}/train`)) for (const [s, l] of [["latn", "orthography script Latin"], ["cyrl", "Cyrillic"], ["arab", "Arabic"], ["hani", "Han (Chinese varieties)"], ["other", "all other orthography scripts"]]) out.push(ipaPocket(`cd-ipa-${s}`, s === "other" ? (x) => !["latn", "cyrl", "arab", "hani"].includes(x) : (x) => x === s, l));
  return out;
}
