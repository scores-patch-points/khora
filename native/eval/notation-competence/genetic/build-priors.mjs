// eval/notation-competence/genetic/build-priors.mjs — build the RECEIVED priors of the genetic family
// from TRAIN ONLY (and from the named standards).  node build-priors.mjs [--out <priorsDir>]
//
// Writes  priors/notation-genetic-codon-tables.json   giver: NCBI Genetic Codes (gc.prt v4.6)
//         priors/notation-genetic-alphabet.json       giver: IUPAC-IUB codes (Biopython IUPACData) + TRAIN letter profiles
//         priors/notation-genetic-orf.json            TRAIN-derived constants and GC-binned codon usage
//
// HELD-OUT DISCIPLINE. The only records read are those the manifest marks split==="train" (+ the
// train_* Rfam families). DEV and TEST are never opened here. Every derived constant records its grid and
// its TRAIN score in the file; nothing is tuned afterwards.
//
// AMENDMENT 2026-10-06 (after the independent review of the card, finding F2): the alphabet prior also carries a `nulls` block, the
// listener's LETTER background and goodness-of-fit refusals (see adapters/notation/genetic.js compileNulls). Its giver for the
// natural-language background is the UD treebank TRAIN splits of the stems listed in DECLARED.bgStems (permissive licences only, stems
// that are NOT negatives of any split of the instrument: eng/spa/deu/fra are excluded, so no leak by source). The fit tolerance for
// protein is derived on TRAIN (the max KL of the TRAIN streams analogous to the instrument's protein streams); nothing is opened from
// DEV or TEST. This block changes only notation-genetic-alphabet.json; the codon and orf priors are byte-identical to the pre-amendment ones.
//
// What is a STANDARD here (counts "from TRAIN" are marked under each file's `train` key):
//   * the 25 NCBI tables themselves (stops, starts, aa) come from gc.prt, cross-checked against Biopython's
//     CodonTable (independent implementation) — agreement is recorded; they are not learned from TRAIN;
//   * which tables are ATTESTED, how often each start/stop codon is used per table, the amino-acid support of
//     every codon, the default stop class, the bridge length B, the ORF length gates, the start nominees and the
//     GC-binned codon usage ARE learned from TRAIN.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { scanGenome, CODONS, foldResidues } from "../../../adapters/notation/genetic.js";
import * as lib from "../genetic-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const outDir = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : path.resolve(HERE, "../../../priors");
const TODAY = new Date().toISOString().slice(0, 10);
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

// ── declared constants (provisional, P4: stated, not tuned) ───────────────────────────────────────────
const DECLARED = {
  nMin: 8,               // fewest disputed-codon occurrences in long stop-free runs before a status is claimed
  alpha: 0.01,           // log-likelihood-ratio threshold ln(1/alpha) for stop-vs-sense
  minSeparation: 0.1,    // rho1 - rho0 must exceed this or the evidence cannot tell stop from sense
  kappa: 500,            // pseudo-codons of weight the TRAIN GC-binned usage prior carries against the prefix counts
  startShareMin: 0.05,   // a start codon is a NOMINEE iff >= 5% of TRAIN annotated starts use it
  gridB: [10, 15, 20, 30, 45, 60],
  gridL: [30, 45, 60, 75, 90, 100, 120, 150, 200, 250, 300, 400],
  precisionForConfident: 0.9,
  minCdsForMacro: 3,
  identify: { minLetters: 20, alpha: 0.01, notGeneticShare: 0.5 },
  // listener nulls (amendment above). Declared, not tuned: alphaFit = upper-tail probability of the chi-square sampling allowance;
  // eps = floor mixed into the protein composition profile (a letter the TRAIN proteins never use costs at most ln(1/eps)); rho = the
  // tolerated share of letters outside the nucleotide alphabet (0: the standard's alphabet REFUSES, it does not average).
  nulls: { alphaFit: 0.001, eps: 0.001, rhoNucleotide: 0, df: { protein: 19 }, streamLines: 40, lineWidth: 60, bgMaxBytes: 4 * 1024 * 1024 },
  bgRoot: "/private/tmp/claude-501/tb",
  bgStems: [
    ["por", "CC BY-SA 4.0"], ["ron", "CC BY-SA 4.0"], ["swe", "CC BY-SA 4.0"], ["nob", "CC BY-SA 4.0"], ["cat", "CC BY 4.0"], ["afr", "CC BY-SA 4.0"],
    ["slv", "CC BY-SA 4.0"], ["hrv", "CC BY-SA 4.0"], ["slk", "CC BY-SA 4.0"], ["lit", "CC BY-SA 4.0"], ["fin", "CC BY-SA 4.0"], ["ind", "CC BY-SA 4.0"],
    ["cym", "CC BY-SA 4.0"], ["ces", "CC BY-SA 4.0"],
  ],
};

// ── 1. gc.prt: the giver of the genetic codes ─────────────────────────────────────────────────────────
function parseGcPrt(text) {
  const blocks = text.split(/\n \{\n/).slice(1);
  const out = {};
  for (const b of blocks) {
    const id = /\bid\s+(\d+)\s*,/.exec(b)?.[1];
    const aa = /ncbieaa\s+"([^"]+)"/.exec(b)?.[1];
    const st = /sncbieaa\s+"([^"]+)"/.exec(b)?.[1];
    if (!id || !aa || !st) continue;
    const names = [...b.matchAll(/\bname\s+"([^"]*)"/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
    out[id] = { id: Number(id), names, ncbieaa: aa, sncbieaa: st };
  }
  return out;
}
const gcText = fs.readFileSync(path.join(lib.ROOT, "raw", "gc.prt"), "utf8");
const gc = parseGcPrt(gcText);
const bio = lib.loadTablesGold(); // Biopython 1.88 CodonTable, an independent implementation
const crosscheck = { tables: Object.keys(gc).length, agree: [], disagree: [] };
for (const [id, t] of Object.entries(gc)) {
  const b = bio[id];
  if (!b) { crosscheck.disagree.push({ id, why: "absent in Biopython" }); continue; }
  const ours = t.ncbieaa.split("").map((a, i) => ({ c: CODONS[i], a }));
  const mism = ours.filter(({ c, a }) => (a === "*" ? !b.stops.includes(c) : b.forward[c] !== a));
  const starts = t.sncbieaa.split("").map((a, i) => (a === "M" ? CODONS[i] : null)).filter(Boolean).sort();
  const startsOk = JSON.stringify(starts) === JSON.stringify(b.starts);
  (mism.length === 0 && startsOk ? crosscheck.agree : crosscheck.disagree).push(mism.length === 0 && startsOk ? Number(id) : { id, mismatched: mism.map((x) => x.c), startsOk });
  t.stops = ours.filter((x) => x.a === "*").map((x) => x.c);
  t.starts = starts;
}

// ── 2. TRAIN records ──────────────────────────────────────────────────────────────────────────────────
const trainRecs = lib.splitRecords("train");
const discrepant = trainRecs.filter((r) => r.table_majority !== r.expected_table).map((r) => ({ acc: r.acc, expected: r.expected_table, annotated: r.table_majority }));
const train = trainRecs.map((r) => ({ ...r, gold: lib.loadGold(r.acc), seq: null }));
for (const r of train) r.seq = lib.loadGenomeSeq(r.acc);
console.log(`TRAIN records: ${train.length}, bp ${train.reduce((a, r) => a + r.length, 0)}`);

// per-table TRAIN counts
const tableStats = {};
const revcomp = (s) => { let o = ""; const C = { A: "T", C: "G", G: "C", T: "A", N: "N" }; for (let i = s.length - 1; i >= 0; i--) o += C[s[i]] ?? "N"; return o; };
const cdsNt = (seq, c) => { const s = seq.slice(c.start, c.end); return c.strand === -1 ? revcomp(s) : s; };
const classOf = (tid) => ({ tga: bio[tid].tga, agr: bio[tid].agr });
for (const r of train) {
  const tid = String(r.table_majority);
  const ts = (tableStats[tid] ??= { genomes: 0, cds: 0, firstCodons: {}, lastCodons: {}, internalAa: {}, accs: [] });
  ts.genomes++; ts.accs.push(r.acc);
  for (const c of r.gold.cds) {
    if (!c.evaluable) continue;
    const nt = cdsNt(r.seq, c);
    ts.cds++;
    ts.firstCodons[nt.slice(0, 3)] = (ts.firstCodons[nt.slice(0, 3)] ?? 0) + 1;
    ts.lastCodons[nt.slice(-3)] = (ts.lastCodons[nt.slice(-3)] ?? 0) + 1;
    const tr = c.translation;
    for (let k = 1; k < tr.length; k++) { // internal codons only (position 1 carries the initiator rule)
      const cod = nt.slice(3 * k, 3 * k + 3);
      const m = (ts.internalAa[cod] ??= {});
      m[tr[k]] = (m[tr[k]] ?? 0) + 1;
    }
  }
}
// default stop class: the majority over TRAIN genomes (annotated table -> class)
const dcount = { tga: { stop: 0, sense: 0 }, agr: { stop: 0, sense: 0 } };
for (const r of train) { const k = classOf(String(r.table_majority)); dcount.tga[k.tga]++; dcount.agr[k.agr]++; }
const defaults = { tga: dcount.tga.stop >= dcount.tga.sense ? "stop" : "sense", agr: dcount.agr.stop > dcount.agr.sense ? "stop" : "sense" };

// start nominees: codons used by >= startShareMin of ALL TRAIN annotated starts
const firstAll = {}; let firstN = 0;
for (const ts of Object.values(tableStats)) for (const [c, n] of Object.entries(ts.firstCodons)) { firstAll[c] = (firstAll[c] ?? 0) + n; firstN += n; }
const startNominees = Object.entries(firstAll).filter(([, n]) => n / firstN >= DECLARED.startShareMin).sort((a, b) => b[1] - a[1]).map(([c]) => c);
console.log("start nominees", startNominees, Object.entries(firstAll).sort((a, b) => b[1] - a[1]).slice(0, 8));

// ── 5. GC-binned codon usage (in-frame vs shadow frames), equal weight per genome ────────────────────────────
const gcOf = (s) => { let g = 0, a = 0; for (const ch of s) { if (ch === "G" || ch === "C") g++; else if (ch === "A" || ch === "T") a++; } return g / Math.max(1, g + a); };
const genomeGcs = train.map((r) => r.gold.gc).sort((a, b) => a - b);
const q = (p) => genomeGcs[Math.min(genomeGcs.length - 1, Math.floor(p * genomeGcs.length))];
const edges = [+q(1 / 3).toFixed(4), +q(2 / 3).toFixed(4)];
const binOf = (g) => (g < edges[0] ? 0 : g < edges[1] ? 1 : 2);
const perGenomeBin = []; // [{bin: {in: Float64Array64, sh: Float64Array64, nIn}}]
const cidx = new Map(CODONS.map((c, i) => [c, i]));
for (const r of train) {
  const acc = [0, 1, 2].map(() => ({ inn: new Float64Array(64), sh: new Float64Array(64), nIn: 0, nSh: 0 }));
  for (const c of r.gold.cds) {
    if (!c.evaluable || c.end - c.start < 300) continue;
    const nt = cdsNt(r.seq, c);
    const b = binOf(gcOf(nt));
    const A = acc[b];
    for (let p = 0; p + 6 <= nt.length; p += 3) { // exclude the stop codon (last triplet)
      const i = cidx.get(nt.slice(p, p + 3)); if (i != null) { A.inn[i]++; A.nIn++; }
      for (const s of [1, 2]) { if (p + s + 3 <= nt.length - 3) { const j = cidx.get(nt.slice(p + s, p + s + 3)); if (j != null) { A.sh[j]++; A.nSh++; } } }
    }
  }
  perGenomeBin.push(acc);
}
const usageBins = [0, 1, 2].map((b) => {
  const contrib = perGenomeBin.map((a) => a[b]).filter((a) => a.nIn >= 300);
  const inn = new Float64Array(64), sh = new Float64Array(64);
  for (const a of contrib) { for (let i = 0; i < 64; i++) { inn[i] += a.inn[i] / a.nIn; sh[i] += a.sh[i] / Math.max(1, a.nSh); } }
  const scale = 100000 / Math.max(1, contrib.length);
  return {
    gc: [b === 0 ? 0 : edges[b - 1], b === 2 ? 1 : edges[b]], genomes: contrib.length, genomesAccs: undefined,
    nIn: 100000, nShadow: 100000,
    inFrame: Object.fromEntries(CODONS.map((c, i) => [c, Math.round(inn[i] * scale)])),
    shadow: Object.fromEntries(CODONS.map((c, i) => [c, Math.round(sh[i] * scale)])),
  };
});
console.log("GC bin edges", edges, "genomes per bin", usageBins.map((b) => b.genomes));


// the same in-memory priors the reader will load, so the derivation sees the reader as it will run (tables + attested + usage)
const scratchPriors = {
  codon: { tables: Object.fromEntries(Object.entries(gc).map(([id, t]) => [id, { id: t.id, names: t.names, ncbieaa: t.ncbieaa, sncbieaa: t.sncbieaa, stops: t.stops, starts: t.starts }])), train: { tables: Object.fromEntries(Object.entries(tableStats).map(([id, st]) => [id, { genomes: st.genomes }])), defaults } },
  alphabet: null, orf: { params: null, usage: { gcBinEdges: edges, bins: usageBins } }, gaps: [],
};

// ── 3. derive B (coding-window length, in codons) on TRAIN (needs the usage prior above) ─────────────────────────────────────────────────────────────────
const usable = train.filter((r) => !discrepant.some((d) => d.acc === r.acc));
const derivB = { grid: DECLARED.gridB, correct: {}, statistic: "coding continuation (see scanGenome)", rule: "argmax over the grid of (# TRAIN genomes whose inferred TGA status and AGR status both equal the annotated table's); unknown counts wrong; ties -> smaller B; discrepant records (annotated table != assigner's expectation) excluded", excluded: discrepant, perGenome: {} };
for (const B of DECLARED.gridB) {
  let ok = 0, n = 0; const per = {};
  for (const r of usable) {
    const sc = scanGenome(foldResidues(r.seq).seq, { priors: scratchPriors, params: { B, nMin: DECLARED.nMin, alpha: DECLARED.alpha, minSeparation: DECLARED.minSeparation, startNominees }, noUsage: true });
    const k = classOf(String(r.table_majority));
    const tga = sc.evidence.tga.status, agr = sc.evidence.agr.status;
    per[r.acc] = { gold: `${k.tga}/${k.agr}`, got: `${tga}/${agr}`, nTga: sc.evidence.tga.N, nAgr: sc.evidence.agr.N, rho0: +sc.evidence.rho0.toFixed(3), rho1: +sc.evidence.rho1.toFixed(3) };
    n++; if (tga === k.tga && agr === k.agr) ok++;
  }
  derivB.correct[B] = `${ok}/${n}`; derivB.perGenome[B] = per;
  console.log(`B=${B}: ${ok}/${n} TRAIN genomes with the right (TGA, AGR) status`);
}
let bestB = DECLARED.gridB[0], bestOk = -1;
for (const B of DECLARED.gridB) { const ok = Number(derivB.correct[B].split("/")[0]); if (ok > bestOk) { bestOk = ok; bestB = B; } }
derivB.chosen = bestB;

// ── 4. derive Lmin, Lconf on TRAIN (gold code fixed, no usage evidence: the length gate alone) ──────────────
const derivL = { grid: DECLARED.gridL, macroF1: {}, macroPrecision: {}, macroRecall: {}, rule: "Lmin = argmax macro-F1 (per-genome F1 averaged over TRAIN genomes with >= 3 evaluable CDS) of the length-gated ORF reader with the genome's gold stop class fixed; Lconf = smallest grid L >= Lmin whose macro-precision >= 0.90 (else the largest grid value); match = same strand + same 3' end" };
const perL = Object.fromEntries(DECLARED.gridL.map((L) => [L, []]));
for (const r of train.filter((x) => x.gold.n_evaluable >= DECLARED.minCdsForMacro)) {
  const k = classOf(String(r.table_majority));
  const sc = scanGenome(foldResidues(r.seq).seq, { fixedState: k, params: { Lmin: Math.min(...DECLARED.gridL), B: bestB, startNominees }, noUsage: true });
  for (const L of DECLARED.gridL) perL[L].push(lib.matchBeings(sc.beings.filter((b) => b.codons >= L), r.gold));
}
for (const L of DECLARED.gridL) {
  derivL.macroF1[L] = +lib.mean(perL[L].map((m) => m.f1)).toFixed(4);
  derivL.macroPrecision[L] = +lib.mean(perL[L].map((m) => m.precision)).toFixed(4);
  derivL.macroRecall[L] = +lib.mean(perL[L].map((m) => m.recall)).toFixed(4);
}
let Lmin = DECLARED.gridL[0];
for (const L of DECLARED.gridL) if (derivL.macroF1[L] > derivL.macroF1[Lmin]) Lmin = L;
let Lconf = DECLARED.gridL[DECLARED.gridL.length - 1];
for (const L of DECLARED.gridL) if (L >= Lmin && derivL.macroPrecision[L] >= DECLARED.precisionForConfident) { Lconf = L; break; }
derivL.chosen = { Lmin, Lconf };
console.log("derived", { B: bestB, Lmin, Lconf }, derivL.macroF1, derivL.macroPrecision);

// ── 6. alphabet profiles ─────────────────────────────────────────────────────────────────────────────────────
const iupac = JSON.parse(fs.readFileSync(path.join(lib.ROOT, "gold", "iupac.json"), "utf8"));
const count = (acc, s) => { for (const ch of s.toUpperCase()) acc[ch] = (acc[ch] ?? 0) + 1; };
const dnaC = {}, rnaC = {}, protC = {}; let rnaRecs = 0, rnaSkippedT = 0;
for (const r of train) { count(dnaC, r.seq); for (const p of lib.loadProteins(r.acc)) count(protC, p.seq); }
const rnaFiles = fs.readdirSync(path.join(lib.ROOT, "raw", "rna")).filter((f) => f.startsWith("train_"));
for (const f of rnaFiles) for (const rec of lib.parseFasta(fs.readFileSync(path.join(lib.ROOT, "raw", "rna", f), "utf8"))) {
  const u = rec.seq.toUpperCase();
  if (u.includes("U") && !u.includes("T")) { count(rnaC, u); rnaRecs++; } else rnaSkippedT++;
}
const keepAlpha = (c, set) => Object.fromEntries(Object.entries(c).filter(([k]) => set.has(k)));
const nucSet = new Set([...Object.keys(iupac.ambiguous_dna_values), ...Object.keys(iupac.ambiguous_rna_values)]);
const aaSet = new Set(iupac.extended_protein_letters.split("").concat(["*"]));
const aaClass = Object.fromEntries(iupac.extended_protein_letters.split("").map((c) => [c, "ACDEFGHIKLMNPQRSTVWY".includes(c) ? "standard" : "ambiguous-or-rare"]));


// ── 6b. NULLS for the listener: natural-language letter background + protein composition tolerance (TRAIN only) ───────────────────────
const letters26 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const foldAz = (t) => t.normalize("NFD").replace(/\p{M}+/gu, "").replace(/[^A-Za-z]/g, "").toUpperCase();
const bgSources = [];
for (const [stem, lic] of DECLARED.bgStems) {
  const f = path.join(DECLARED.bgRoot, stem, "train.conllu");
  if (!fs.existsSync(f)) { bgSources.push({ stem, license: lic, missing: true }); continue; }
  const fd = fs.openSync(f, "r"); const buf = Buffer.alloc(DECLARED.nulls.bgMaxBytes); const nb = fs.readSync(fd, buf, 0, buf.length, 0); fs.closeSync(fd);
  const text = buf.subarray(0, nb).toString("utf8");
  const cnt = Object.fromEntries(letters26.map((c) => [c, 0])); let n = 0;
  for (const line of text.split("\n")) { if (!line.startsWith("# text = ")) continue; for (const ch of foldAz(line.slice(9))) { cnt[ch]++; n++; } }
  bgSources.push({ stem, license: lic, file: `${stem}/train.conllu (first ${nb} bytes)`, sha16: sha(buf.subarray(0, nb)), letters: n, counts: cnt });
}
const bgUsed = bgSources.filter((b) => !b.missing && b.letters > 0);
const bgFreq = Object.fromEntries(letters26.map((c) => [c, lib.mean(bgUsed.map((b) => b.counts[c] / b.letters))])); // equal weight per treebank (source)
const bgCounts = Object.fromEntries(letters26.map((c) => [c, Math.round(bgFreq[c] * 1e6)]));
// protein composition tolerance: TRAIN streams analogous to the instrument's protein streams (first 40 lines of 60 aa, with and without FASTA headers)
const protQ = (() => { let t = 0; for (const c of letters26) t += protC[c] ?? 0; return letters26.map((c) => (((protC[c] ?? 0) / t) + DECLARED.nulls.eps) / (1 + 26 * DECLARED.nulls.eps)); })();
const klOf = (cnt) => { let N = 0; for (const c of letters26) N += cnt[c] ?? 0; let k = 0; letters26.forEach((c, i) => { const v = cnt[c] ?? 0; if (v) { const p = v / N; k += p * Math.log(p / protQ[i]); } }); return { kl: k, N }; };
const protWindows = [];
for (const r of train) {
  const prot = lib.loadProteins(r.acc); if (!prot.length) continue;
  const lines = [], bare = [];
  for (const p of prot) { lines.push(">" + p.id); for (const x of p.seq.match(new RegExp(`.{1,${DECLARED.nulls.lineWidth}}`, "g")) ?? []) { lines.push(x); bare.push(x); } if (lines.length > DECLARED.nulls.streamLines + 5) break; }
  const bareAll = []; for (const p of prot) for (const x of p.seq.match(new RegExp(`.{1,${DECLARED.nulls.lineWidth}}`, "g")) ?? []) bareAll.push(x);
  for (const [variant, ls] of [["fasta", lines], ["bare", bareAll]]) {
    const cnt = {}; for (const x of ls.slice(0, DECLARED.nulls.streamLines)) if (!x.startsWith(">")) for (const ch of x.toUpperCase()) cnt[ch] = (cnt[ch] ?? 0) + 1;
    const k = klOf(cnt); protWindows.push({ acc: r.acc, variant, N: k.N, kl: +k.kl.toFixed(5) });
  }
}
const protDelta = Math.max(...protWindows.map((w) => w.kl));
console.log("listener nulls: bg stems used", bgUsed.map((b) => b.stem).join(","), "| protein window KL max (delta)", protDelta.toFixed(4), "over", protWindows.length, "TRAIN windows");
const nullsBlock = {
  schema: "GeneticListenerNulls@1",
  note: "NULLS (the listener's refusal basis). background = natural-language letter profile; flat = uniform over A-Z (maximum entropy, no giver needed); fit = per-notation refusal. The listener names a notation only if it beats BOTH nulls by ln(1/alpha) and fits.",
  background: {
    giver: "Universal Dependencies treebanks, TRAIN splits (one profile per treebank, equal weight), `# text =` sentences folded to A-Z (NFD, diacritics dropped); stems chosen so that none is a negative of any split of the instrument (eng, spa, deu, fra are NOT used) and only CC BY / CC BY-SA treebanks are read",
    url: "https://universaldependencies.org/ (treebank files as fetched into /private/tmp/claude-501/tb/<stem>/, see tb/fetch.log and each stem's LICENSE.txt / README.md)",
    counts: bgCounts, countsScale: "equal-weight mean letter frequency x 1e6", sources: bgSources, fetched: "see tb/fetch.log (UD files as fetched by the natural-language workflow)",
  },
  fit: {
    alphaFit: DECLARED.nulls.alphaFit, eps: DECLARED.nulls.eps,
    byNotation: {
      protein: { mode: "composition", delta: protDelta, df: DECLARED.nulls.df.protein, rule: "accept iff KL(prefix letter composition || TRAIN protein profile mixed with eps uniform) <= delta + chi2_{df, 1-alphaFit}/(2N); delta = max KL over the TRAIN streams analogous to the instrument's protein streams (first 40 lines of 60 aa per TRAIN genome, with and without FASTA headers)", windows: protWindows },
      dna: { mode: "support", rho: DECLARED.nulls.rhoNucleotide, rule: "refuse iff the share of letters outside the IUPAC-IUB nucleotide alphabet (+U) exceeds rho; composition is free (genome GC runs 0.15-0.75 in the corpus)" },
      rna: { mode: "support", rho: DECLARED.nulls.rhoNucleotide, rule: "same as dna" },
    },
  },
};

// ── 7. write the three prior files ─────────────────────────────────────────────────────────────────────────────
const trainAccs = trainRecs.map((r) => r.acc);
const trainBlock = { split: "train", records: trainAccs, built: TODAY, manifestSha: sha(fs.readFileSync(path.join(lib.ROOT, "manifest.json"), "utf8")) };
const files = {
  "notation-genetic-codon-tables.json": {
    schema: "GeneticCodonTablePrior@1", family: "genetic",
    provenance: {
      giver: "NCBI Genetic Codes (gc.prt, version 4.6): the standard genetic code and its 24 variants",
      url: "https://ftp.ncbi.nlm.nih.gov/entrez/misc/data/gc.prt", fetched: "2026-10-06", license: "NCBI places no restrictions on use of the table (public domain, US government work)",
      crosscheck: { engine: "Biopython 1.88 Bio.Data.CodonTable", ...crosscheck },
      note: "stops/aa/starts are the standard's; only the `train` block is counted from TRAIN genomes. Tables absent from TRAIN are kept (the standard names them) but the reader refuses to nominate them (typed gap table_not_attested_in_train).",
    },
    tables: Object.fromEntries(Object.entries(gc).map(([id, t]) => [id, { id: t.id, names: t.names, ncbieaa: t.ncbieaa, sncbieaa: t.sncbieaa, stops: t.stops, starts: t.starts }])),
    train: { ...trainBlock, defaults, defaultCounts: dcount, discrepantAnnotation: discrepant, tables: Object.fromEntries(Object.entries(tableStats).map(([id, s]) => [id, { genomes: s.genomes, cds: s.cds, accs: s.accs, firstCodons: s.firstCodons, lastCodons: s.lastCodons, internalAa: s.internalAa }])) },
  },
  "notation-genetic-alphabet.json": {
    schema: "GeneticAlphabetPrior@1", family: "genetic",
    provenance: {
      giver: iupac.giver, url: "https://biopython.org/docs/1.88/api/Bio.Data.IUPACData.html", fetched: "2026-10-06", license: "Biopython License (BSD-3-Clause-like) for the encoding of the IUPAC-IUB tables; the codes themselves are a standard",
      profilesNote: "letter profiles are COUNTED from TRAIN sequences: dna = TRAIN genome FASTA letters, protein = TRAIN NCBI fasta_cds_aa letters, rna = TRAIN Rfam families (records written with U and no T only; records of an RNA family written in the DNA alphabet are NOT rna notation and are skipped, counted below).",
    },
    iupacNucleotide: iupac.ambiguous_dna_values, iupacRnaExtra: { U: "U" }, iupacAmino: aaClass,
    smoothing: 1e-4,
    nulls: nullsBlock,
    profiles: { dna: { counts: keepAlpha(dnaC, nucSet), source: "train genomes", records: train.length }, rna: { counts: keepAlpha(rnaC, nucSet), source: rnaFiles, records: rnaRecs, skippedWrittenWithT: rnaSkippedT }, protein: { counts: keepAlpha(protC, aaSet), source: "train fasta_cds_aa" } },
    train: trainBlock,
  },
  "notation-genetic-orf.json": {
    schema: "GeneticOrfPrior@1", family: "genetic",
    provenance: {
      giver: "TRAIN split of the corpus: NCBI RefSeq annotation (CDS locations, /transl_table) read with Biopython 1.88; the standard tables above",
      note: "every constant below is either DECLARED (stated, provisional) or DERIVED on TRAIN (its grid and score are in `derivation`). Nothing was chosen after seeing DEV or TEST.",
    },
    params: { B: bestB, Lmin, Lconf, nMin: DECLARED.nMin, alpha: DECLARED.alpha, minSeparation: DECLARED.minSeparation, kappa: DECLARED.kappa, startNominees, identify: DECLARED.identify },
    declared: { nMin: DECLARED.nMin, alpha: DECLARED.alpha, minSeparation: DECLARED.minSeparation, kappa: DECLARED.kappa, startShareMin: DECLARED.startShareMin, gridB: DECLARED.gridB, gridL: DECLARED.gridL, precisionForConfident: DECLARED.precisionForConfident },
    derivation: { B: derivB, L: derivL, startNominees: { shareMin: DECLARED.startShareMin, firstCodonCounts: firstAll, n: firstN }, gcBinEdges: { rule: "tertiles of TRAIN genome GC", edges } },
    usage: { gcBinEdges: edges, binRule: "TRAIN CDS assigned by the CDS's own GC; equal weight per genome within a bin; counts rescaled to 100000 codons", bins: usageBins },
    train: trainBlock,
  },
};
fs.mkdirSync(outDir, { recursive: true });
for (const [name, obj] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(obj));
  console.log("wrote", path.join(outDir, name), fs.statSync(path.join(outDir, name)).size, "bytes");
}
console.log("crosscheck gc.prt vs Biopython:", crosscheck.agree.length, "agree,", crosscheck.disagree.length, "disagree", JSON.stringify(crosscheck.disagree).slice(0, 300));
