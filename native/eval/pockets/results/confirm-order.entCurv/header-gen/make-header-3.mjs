// part 3: assemble the header text and write confirm.mjs (header only) + prereg.sha256
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PRED } from "./make-header-1.mjs";
import { RULES } from "./make-header-2.mjs";
const DIR = "/Users/mlacy/Documents/3.0/khora/native/eval/pockets/results/confirm-order.entCurv/";
if (fs.existsSync(DIR + "confirm.mjs")) { console.error("confirm.mjs already exists: refusing to overwrite"); process.exit(1); }
const man = JSON.parse(fs.readFileSync(DIR + "siblings-manifest.json", "utf8")), by = Object.fromEntries(man.map((r) => [r.id, r]));
const siblings = PRED.map((p) => { const m = by[p.id]; if (!m) throw new Error("no manifest row " + p.id);
  return { id: p.id, loader: p.loader, kind: p.kind, role: p.role, expect: p.expect, probExpectHolds: p.probExpectHolds, vRange: p.vRange, register: m.register, language: m.language, tokens: m.tokens, units: m.units, docs: m.docs,
    meanUnitLength: m.meanUnitLength, halfTokens: m.halfTokens, thin: m.thin, scored: !m.thin && p.role !== "explore", contentSha256: m.contentSha256, why: p.why }; });
const PREREG = {
 law: "order.entCurv", family: "order", statId: "entCurv",
 statement: "(H(middle third) - mean(H(first third), H(last third))) / H(pooled) of the log2-rank-bin distribution by relative position inside a unit (fractional thirds with equal token mass, Miller-Madow), units >= 3 tokens; > 0 the middle of a unit is the richest (edges specialised), < 0 the edges are richer than the middle (U-shape)",
 protocolSha256: "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc", null: "within-unit", draws: 10, seedRule: "seedOf(pocketId, half, 'order', 'within-unit', k) for k = 0..9 exactly as run-atlas.mjs (fam.FAMILY = 'order', kind = 'within-unit')",
 atlasCounts: { N: 390, nPos: 126, nNeg: 53, nAbs: 58, nAmb: 153, heterogeneity: 1.872, sharedPropertyRegister: { eta2: 0.1922, p: 0.0005 }, signSplitRegister: { eta2: 0.5532, p: 0.0005 }, g1: { rhoTokens: -0.273, rhoUnitLength: -0.033 }, mostSimilar: { stat: "order.rareCurve", rho: 0.581 }, wordGrainOnly: { N: 296, nPos: 106, nNeg: 13 } },
 status: { "PRESENT+": "z >= 4 in both halves", "PRESENT-": "z <= -4 in both halves", ABSENT: "|z| < 2 in both halves", AMBIGUOUS: "anything else (uninformative: neither credit nor refutation)" },
 siblings, passRule: RULES.passRule, secondary: RULES.secondary, adversary: RULES.adversary,
};
const HEAD = `// results/confirm-order.entCurv/confirm.mjs — SIBLING REPLICATION of the atlas law order.entCurv.
// ===== PRE-REGISTRATION HEADER (written 2026-10-07 before any statistic was computed on any sibling; the sha256 of every byte of this file ABOVE the END marker line, that line included, is in prereg.sha256) =====
//
// DISCLOSURE (what I have seen before writing this header, 2026-10-07)
//  SEEN, ATLAS: PROTOCOL.md (sha256 3b7363c5...), lib/pocket.mjs, run-atlas.mjs, laws/order.mjs + laws/_order_prep.mjs + laws/_order_pos.mjs (the statistic's definition and code), results/law-table.json (the order.entCurv entry: counts, byGroup/byRegister/
//    byScript/byGrain, presentV quantiles, absent pocket list, sharedProperty and signSplit rows, g1 rhos, mostSimilar; also the selection, gates and falsePresent blocks), and the per-pocket atlas JSONs results/atlas/*.json for order.entCurv: z and v in both
//    halves of every atlas pocket (I printed registers novel, drama, children, memoir, code, markup, config, chat, treebank, academic, dialect, translation, treatise, history, poetry, scripture, and every control ct-* and planted pl-* world), and for
//    order.rareCurve (the 3 x 4 status contingency with entCurv over the 391 atlas pockets: P+|P+ 83, P+|P- 12, P-|P- 49, P-|P+ 1, ...). The predictions below are therefore NOT blind to the ATLAS (they are read off it by register and size); they are blind to the SIBLINGS.
//  SEEN, OTHER AGENTS' WORK: the loaders loaders/_sibling-ent-*.mjs of the confirmation of order.entSlope (read as CODE, to learn the atlas helper API and where the misfiled English books lie), the header of results/confirm-order.entSlope/confirm.mjs (lines 1-80 and
//    405-470: its disclosure, two of its sibling entries with their entSlope predictions, its pass rule and adversary definitions) and its prereg.sha256; file names and sizes of the other results/confirm-* directories. NOT OPENED: any pockets/*.json, report.json, posthoc*.json or
//    other data file of results/confirm-* (so I have seen NO statistic of any other agent's sibling pocket, including the entSlope siblings that share source files with some siblings below).
//  NOT SEEN: any law statistic (any family, any half, any null draw) of any pocket listed under 'siblings'. For the siblings I looked only at DESCRIPTIVE facts: token / unit / document counts, vocabulary size, unit-length quantiles, a few unit heads and tails,
//    the most frequent unit-initial tokens (to check that speaker labels were removed), the position of the boundary between pooled works, and the sha256 overlap of the code files with the atlas code corpus (0 hits). Cleaning rules (cuts, label removal, the pooling of
//    two plays and of two children's books) were fixed from reading raw files and that descriptive output, before and without any statistic.
//  DEVIATIONS FROM THE SIBLING PLAN (stated, not hidden): (1) the plan's 'UD train splits' do not exist on this machine (/private/tmp/claude-501/ud-eval holds dev.conllu and test.conllu only, 53 stems, the atlas read dev+test of 34 of them); the treebank sibling is
//    UD Latin-Perseus (train+test) from the fixtures of the eoreader7-latest checkout with three documents whose text is an atlas pocket removed (phi0690 Aeneid, phi1351 Tacitus, tlg0031 New Testament); it clears the 20,000-token floor barely (21,484) and each half holds
//    about 11k tokens: a WEAK sibling. (2) Lysistrata alone is thin (about 11k tokens), so A Doll's House and Lysistrata form ONE pooled drama pocket (34k tokens; the plan counted two). (3) Two children's books are pooled into one pocket (each alone is near the floor).
//    (4) Three text siblings (Yonge, Swisshelm, the Shakespeare plays) come from files outside the ethos tree that no atlas pocket reads (grep over loaders/*.mjs and the atlas manifests finds no path of those folders); six misfiled English books (Zola's Mouret, Chopin, Ibsen,
//    Aristophanes in Lindsay's translation, Milne, Stickney) come from ethos 11-multi-language/gutenberg-non-en, which the atlas skipped on purpose (_ml_skips.mjs ENGLISH_MISFILED). Mouret, Chopin's Awakening and the Doll's House part are the same source files, cleaned
//    the same way, as three siblings of the entSlope confirmation (a different statistic; I have not looked at its results). (5) NO new sibling of the registers dialect, chat, academic, diagram, nomenclature, scripture, legal, notation or markup could be built: within the time spent I
//    found no unused material for them: the WPA slave-narrative volumes are all read by atlas pockets (bk-wpa-*), the IRC logs are chosen by date window and I did not audit them file by file, and I did not search the holy-text or legal trees for unused files. The atlas
//    claim for those registers is UNTESTED here. (6) The atlas has no natural kind where entCurv is mostly ABSENT (ABSENT share by
//    register with n >= 10: treebank 12/34 = 35%, chat 5/20, poetry 3/13, dialect 3/13, then <= 19%; code 2/47, children 0/17, drama 0/12). For a REVERSAL the kind 'where it is not present with the + sign' is CODE (28 of 47 PRESENT-): its siblings (JS, TS) are predicted
//    PRESENT-, and two LAW-FREE shuffled controls are predicted ABSENT (they test the instrument, not the law).
//  KNOWN LIMITS OF THE ATLAS THE LAW COMES FROM: G0 did not fully pass (law-table gates.G0.pass false because cancelPass false; iid rate4 0.013 passed; entCurv is 'unmapped' to any planted phenomenon, but the planted worlds pl-frames and pl-mix, which have formulaic
//    frames, give strongly NEGATIVE entCurv (z -16 / -13 and -16 / -8)); z uses 10 null draws (sd estimated with 9 degrees of freedom); the PRESENT rule fires in 22,017 of 29,680 real atlas cells (74%) and entCurv has v of about 0.002-0.012 in most PRESENT+ pockets, so a
//    PRESENT cell is weak evidence by itself and the evidence offered here is the SIGN pattern across kinds and sizes.
//  INDEPENDENCE: all prose siblings are ENGLISH (Mouret, the Doll's House and Lysistrata are translations); the treebank sibling is Latin; the code siblings are JavaScript (the user's own repositories), TypeScript (one third-party repository) and Python (the
//    user's own). The siblings are new DOCUMENTS of the atlas kinds, not new LANGUAGES; this cannot test the law's reach across languages or scripts. Probabilities are my own subjective estimates from atlas analogues, not frequencies.
//
// ATLAS CLAIM UNDER TEST: 'Middle-third entropy minus mean edge-third entropy (rank-class distribution inside a unit) is positive (middle richer, edges specialised) in novels 15/25 (0 below), dialect 10/13, chat 9/20 (0 below), children 7/17, treebank 7/34, drama
//   6/12, academic 6/12, diagram 6/7, nomenclature 4/4; negative in code 28/47 (5 positive), markup 2/5, scripture 10/26, legal 4/31 and notation 2/16.' Verified against results/law-table.json: N 390, nPos 126, nNeg 53, nAbs 58, nAmb 153; heterogeneity 1.872; sharedProperty
//   register eta2 0.1922 p 0.0005; signSplit register eta2 0.5532 p 0.0005; g1 rho(tokens) -0.273, rho(unit length) -0.033, sizeConfounded false; word-grain only 106+ / 13- of 296. byRegister (PRESENT+ / PRESENT- / n) from the table: novel 15/0/25,
//   dialect 10/0/13, chat 9/0/20, children 7/0/17, treebank 7/0/34, drama 6/0/12, academic 6/0/12, diagram 6/0/7, nomenclature 4/0/4; code 5/28/47, markup 0/2/5, scripture 7/10/26, legal 7/4/31, notation 4/2/16. So the claim's numbers for the negative registers are
//   the counts of PRESENT- pockets (and its positive registers the counts of PRESENT+); the claim text matches the table.
//
// HOW THE STATISTIC AND ITS NULL ARE COMPUTED (identical to run-atlas.mjs): per pocket, halves(p) by sha256(id:doc) parity; per half the 'order' family compute(view) once on the real view and once on each of 10 nullView(view,'within-unit',seed) draws with
// seed = seedOf(p.id, half, 'order', 'within-unit', k), k = 0..9; v = observed value, nullMean/nullSd over the finite draws, z = (v - nullMean) / nullSd. All 11 order statistics are saved; only order.entCurv decides the verdict; order.rareCurve is the rival.
//
// The blind predictions, the pass rule and the adversaries are the data object PREREG below (single source of truth: the code under the END marker reads it).
export const PREREG = ${JSON.stringify(PREREG, null, 1)};
// ===== END OF PRE-REGISTRATION HEADER =====
`;
fs.writeFileSync(DIR + "confirm.mjs", HEAD);
const mk = "// ===== END OF PRE-REGISTRATION HEADER =====\n", sha = createHash("sha256").update(HEAD.slice(0, HEAD.indexOf(mk) + mk.length)).digest("hex");
fs.writeFileSync(DIR + "prereg.sha256", sha + "  confirm.mjs (header: bytes from the start of the file through the END marker line inclusive)\n");
console.log("header sha256", sha, "bytes", HEAD.length);
