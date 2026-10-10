// chem_smiles — the INSTRUMENT is regression-guarded here, and the ADAPTER is pinned against hand-written gold
// (every toy fact below was cross-checked with RDKit when the fixture was written; RDKit is not a test dependency).
//   * a perfect reader scores 1 on every rung it is measured at and PASSES;
//   * a deranged reader (the answers of the NEXT molecule) scores low and FAILS;
//   * a reader that merely equals a control is refused (margin <= 0: instrument or mechanism broken);
//   * the causality licence catches a lookahead reader;
//   * missing data is a typed gap (pass: null), never a throw.
// The only cases that touch the shipped priors check the adapter's hand-gold facts; the real-corpus case skips when the corpus is absent.
// AMENDMENT 1 (review round 1) is regression-guarded too: order-blind R0 baselines, the bracket-aware capitalisation control and the stratified R2,
// the fair ring-only control and the ring-F1 headline of R3, the gold-scored R5(a) with degraded-reader controls, and the append-only pre-registration.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as adapter from "../adapters/notation/chem_smiles.js";
import {
  PARAMS, withParams, runLadder, scoreR0, scoreR2Smiles, scoreR2Inchi, scoreR3Smiles, scoreR3Inchi, scoreR4Smiles, scoreR5SmilesInchi, scoreR5Name, causalViolations, measure, loadData, wlHash, signTest, derangement, mulberry32, r0Items,
  buildBaselines, trainItemsOf, naiveRingsSmiles, naiveRingsInchi, capsBracketAwareAtoms, expandFormulaLayer, DEGRADERS, R2_STRATA, ROOT, PREREG_SHA256, PREREG_V1_SHA256, PREREG_V1_RECOMPUTED_SHA256,
} from "../eval/notation-competence/chem_smiles.mjs";

// ── toy corpus: smiles, atoms [sym,z,arom,charge,iso,explicitH,noImplicit], bonds [i,j,type], rings, comps, inchi, inchi gold ──
const A = (sym, arom = 0, chg = 0, iso = 0, h = 0, noimp = 0) => [sym, 0, arom, chg, iso, h, noimp];
const six = (n) => Array.from({ length: n }, () => A("C", 1));
const toy = [
  { smiles: "CCO", atoms: [A("C"), A("C"), A("O")], bonds: [[0, 1, "single"], [1, 2, "single"]], rings: [], comps: [[0, 1, 2]], tok: [[0, 1], [1, 2], [2, 3]], inchi: "InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3", ig: { atoms: ["C", "C", "O"], bonds: [[0, 1], [1, 2]], rings: [], comps: [[0, 1, 2]] } },
  { smiles: "c1ccccc1", atoms: six(6), bonds: [[0, 1, "aromatic"], [1, 2, "aromatic"], [2, 3, "aromatic"], [3, 4, "aromatic"], [4, 5, "aromatic"], [0, 5, "aromatic"]], rings: [[0, 1, 2, 3, 4, 5]], comps: [[0, 1, 2, 3, 4, 5]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]].slice(0, 8), inchi: "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H", ig: { atoms: Array(6).fill("C"), bonds: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]], rings: [[0, 1, 2, 3, 4, 5]], comps: [[0, 1, 2, 3, 4, 5]] } },
  { smiles: "CC(=O)O", atoms: [A("C"), A("C"), A("O"), A("O")], bonds: [[0, 1, "single"], [1, 2, "double"], [1, 3, "single"]], rings: [], comps: [[0, 1, 2, 3]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]], inchi: "InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)", ig: { atoms: ["C", "C", "O", "O"], bonds: [[0, 1], [1, 2], [1, 3]], rings: [], comps: [[0, 1, 2, 3]] } },
  { smiles: "CCCl", atoms: [A("C"), A("C"), A("Cl")], bonds: [[0, 1, "single"], [1, 2, "single"]], rings: [], comps: [[0, 1, 2]], tok: [[0, 1], [1, 2], [2, 4]], inchi: "InChI=1S/C2H5Cl/c1-2-3/h2H2,1H3", ig: { atoms: ["C", "C", "Cl"], bonds: [[0, 1], [1, 2]], rings: [], comps: [[0, 1, 2]] } },
  { smiles: "C1CC1", atoms: [A("C"), A("C"), A("C")], bonds: [[0, 1, "single"], [1, 2, "single"], [0, 2, "single"]], rings: [[0, 1, 2]], comps: [[0, 1, 2]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], inchi: "InChI=1S/C3H6/c1-2-3-1/h1-3H2", ig: { atoms: ["C", "C", "C"], bonds: [[0, 1], [0, 2], [1, 2]], rings: [[0, 1, 2]], comps: [[0, 1, 2]] } },
  { smiles: "CC(=O)[O-].[Na+]", atoms: [A("C"), A("C"), A("O"), A("O", 0, -1, 0, 0, 1), A("Na", 0, 1, 0, 0, 1)], bonds: [[0, 1, "single"], [1, 2, "double"], [1, 3, "single"]], rings: [], comps: [[0, 1, 2, 3], [4]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 10], [10, 11], [11, 16]], inchi: "InChI=1S/C2H4O2.Na/c1-2(3)4;/h1H3,(H,3,4);/q;+1/p-1", ig: { atoms: ["C", "C", "O", "O", "Na"], bonds: [[0, 1], [1, 2], [1, 3]], rings: [], comps: [[0, 1, 2, 3], [4]] } },
  { smiles: "[nH]1cccc1", atoms: [A("N", 1, 0, 0, 1, 1), A("C", 1), A("C", 1), A("C", 1), A("C", 1)], bonds: [[0, 1, "aromatic"], [1, 2, "aromatic"], [2, 3, "aromatic"], [3, 4, "aromatic"], [0, 4, "aromatic"]], rings: [[0, 1, 2, 3, 4]], comps: [[0, 1, 2, 3, 4]], tok: [[0, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]].slice(0, 7), inchi: "InChI=1S/C4H5N/c1-2-4-5-3-1/h1-5H", ig: { atoms: ["C", "C", "C", "C", "N"], bonds: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]], rings: [[0, 1, 2, 3, 4]], comps: [[0, 1, 2, 3, 4]] } },
  { smiles: "C[C@H](F)Cl", atoms: [A("C"), A("C", 0, 0, 0, 1, 1), A("F"), A("Cl")], bonds: [[0, 1, "single"], [1, 2, "single"], [1, 3, "single"]], rings: [], comps: [[0, 1, 2, 3]], tok: [[0, 1], [1, 6], [6, 7], [7, 8], [8, 9], [9, 11]], inchi: "InChI=1S/C2H4ClF/c1-2(3)4/h2H,1H3/t2-/m0/s1", ig: { atoms: ["C", "C", "Cl", "F"], bonds: [[0, 1], [1, 2], [1, 3]], rings: [], comps: [[0, 1, 2, 3]] } },
  { smiles: "[13CH3]O", atoms: [A("C", 0, 0, 13, 3, 1), A("O")], bonds: [[0, 1, "single"]], rings: [], comps: [[0, 1]], tok: [[0, 7], [7, 8]], inchi: "InChI=1S/CH4O/c1-2/h2H,1H3/i1+1", ig: { atoms: ["C", "O"], bonds: [[0, 1]], rings: [], comps: [[0, 1]] } },
  { smiles: "C=CC#N", atoms: [A("C"), A("C"), A("C"), A("N")], bonds: [[0, 1, "double"], [1, 2, "single"], [2, 3, "triple"]], rings: [], comps: [[0, 1, 2, 3]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]], inchi: "InChI=1S/C3H3N/c1-2-3-4/h2H,1H2", ig: { atoms: ["C", "C", "C", "N"], bonds: [[0, 1], [1, 2], [2, 3]], rings: [], comps: [[0, 1, 2, 3]] } },
  { smiles: "c1ccc2ccccc2c1", atoms: six(10), bonds: [[0, 1, "aromatic"], [1, 2, "aromatic"], [2, 3, "aromatic"], [3, 4, "aromatic"], [4, 5, "aromatic"], [5, 6, "aromatic"], [6, 7, "aromatic"], [7, 8, "aromatic"], [8, 9, "aromatic"], [0, 9, "aromatic"], [3, 8, "aromatic"]], rings: [[0, 1, 2, 3, 8, 9], [3, 4, 5, 6, 7, 8]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]], tok: Array.from({ length: 14 }, (_, i) => [i, i + 1]), inchi: "InChI=1S/C10H8/c1-2-6-10-8-4-3-7-9(10)5-1/h1-8H", ig: { atoms: Array(10).fill("C"), bonds: [[0, 1], [0, 4], [1, 5], [2, 3], [2, 6], [3, 7], [4, 8], [5, 9], [6, 8], [7, 9], [8, 9]], rings: [[0, 1, 4, 5, 8, 9], [2, 3, 6, 7, 8, 9]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]] } },
  { smiles: "OCCO", atoms: [A("O"), A("C"), A("C"), A("O")], bonds: [[0, 1, "single"], [1, 2, "single"], [2, 3, "single"]], rings: [], comps: [[0, 1, 2, 3]], tok: [[0, 1], [1, 2], [2, 3], [3, 4]], inchi: "InChI=1S/C2H6O2/c3-1-2-4/h3-4H,1-2H2", ig: { atoms: ["C", "C", "O", "O"], bonds: [[0, 1], [0, 2], [1, 3]], rings: [], comps: [[0, 1, 2, 3]] } },
  { smiles: "CC(C)C", atoms: [A("C"), A("C"), A("C"), A("C")], bonds: [[0, 1, "single"], [1, 2, "single"], [1, 3, "single"]], rings: [], comps: [[0, 1, 2, 3]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]], inchi: "InChI=1S/C4H10/c1-4(2)3/h4H,1-3H3", ig: { atoms: ["C", "C", "C", "C"], bonds: [[0, 3], [1, 3], [2, 3]], rings: [], comps: [[0, 1, 2, 3]] } },
  { smiles: "c1ccccc1-c1ccccc1", atoms: six(12), bonds: [[0, 1, "aromatic"], [1, 2, "aromatic"], [2, 3, "aromatic"], [3, 4, "aromatic"], [4, 5, "aromatic"], [0, 5, "aromatic"], [5, 6, "single"], [6, 7, "aromatic"], [7, 8, "aromatic"], [8, 9, "aromatic"], [9, 10, "aromatic"], [10, 11, "aromatic"], [6, 11, "aromatic"]], rings: [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]], tok: Array.from({ length: 17 }, (_, i) => [i, i + 1]), inchi: "InChI=1S/C12H10/c1-3-7-11(8-4-1)12-9-5-2-6-10-12/h1-10H", ig: { atoms: Array(12).fill("C"), bonds: [[0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [3, 7], [4, 8], [5, 9], [6, 10], [7, 10], [8, 11], [9, 11], [10, 11]], rings: [[0, 2, 3, 6, 7, 10], [1, 4, 5, 8, 9, 11]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]] } },
  { smiles: "CC(C)(C)O", atoms: [A("C"), A("C"), A("C"), A("C"), A("O")], bonds: [[0, 1, "single"], [1, 2, "single"], [1, 3, "single"], [1, 4, "single"]], rings: [], comps: [[0, 1, 2, 3, 4]], tok: Array.from({ length: 9 }, (_, i) => [i, i + 1]), inchi: "InChI=1S/C4H10O/c1-4(2,3)5/h5H,1-3H3", ig: { atoms: ["C", "C", "C", "C", "O"], bonds: [[0, 3], [1, 3], [2, 3], [3, 4]], rings: [], comps: [[0, 1, 2, 3, 4]] } },
  { smiles: "CC(C)(C)C", atoms: [A("C"), A("C"), A("C"), A("C"), A("C")], bonds: [[0, 1, "single"], [1, 2, "single"], [1, 3, "single"], [1, 4, "single"]], rings: [], comps: [[0, 1, 2, 3, 4]], tok: Array.from({ length: 9 }, (_, i) => [i, i + 1]), inchi: "InChI=1S/C5H12/c1-5(2,3)4/h1-4H3", ig: { atoms: ["C", "C", "C", "C", "C"], bonds: [[0, 4], [1, 4], [2, 4], [3, 4]], rings: [], comps: [[0, 1, 2, 3, 4]] } },
  { smiles: "CC(C)O", atoms: [A("C"), A("C"), A("C"), A("O")], bonds: [[0, 1, "single"], [1, 2, "single"], [1, 3, "single"]], rings: [], comps: [[0, 1, 2, 3]], tok: Array.from({ length: 6 }, (_, i) => [i, i + 1]), inchi: "InChI=1S/C3H8O/c1-3(2)4/h3-4H,1-2H3", ig: { atoms: ["C", "C", "C", "O"], bonds: [[0, 2], [1, 2], [2, 3]], rings: [], comps: [[0, 1, 2, 3]] } },
  { smiles: "ClCCl", atoms: [A("Cl"), A("C"), A("Cl")], bonds: [[0, 1, "single"], [1, 2, "single"]], rings: [], comps: [[0, 1, 2]], tok: [[0, 2], [2, 3], [3, 5]], inchi: "InChI=1S/CH2Cl2/c2-1-3/h1H2", ig: { atoms: ["C", "Cl", "Cl"], bonds: [[0, 1], [0, 2]], rings: [], comps: [[0, 1, 2]] } },
  { smiles: "BrCBr", atoms: [A("Br"), A("C"), A("Br")], bonds: [[0, 1, "single"], [1, 2, "single"]], rings: [], comps: [[0, 1, 2]], tok: [[0, 2], [2, 3], [3, 5]], inchi: "InChI=1S/CH2Br2/c2-1-3/h1H2", ig: { atoms: ["C", "Br", "Br"], bonds: [[0, 1], [0, 2]], rings: [], comps: [[0, 1, 2]] } },
  { smiles: "ClC(Cl)Cl", atoms: [A("Cl"), A("C"), A("Cl"), A("Cl")], bonds: [[0, 1, "single"], [1, 2, "single"], [1, 3, "single"]], rings: [], comps: [[0, 1, 2, 3]], tok: [[0, 2], [2, 3], [3, 4], [4, 6], [6, 7], [7, 9]], inchi: "InChI=1S/CHCl3/c2-1(3)4/h1H", ig: { atoms: ["C", "Cl", "Cl", "Cl"], bonds: [[0, 1], [0, 2], [0, 3]], rings: [], comps: [[0, 1, 2, 3]] } },
  { smiles: "C[NH3+]", atoms: [A("C"), A("N", 0, 1, 0, 3, 1)], bonds: [[0, 1, "single"]], rings: [], comps: [[0, 1]], tok: [[0, 1], [1, 7]], inchi: "InChI=1S/CH5N/c1-2/h2H2,1H3/p+1", ig: { atoms: ["C", "N"], bonds: [[0, 1]], rings: [], comps: [[0, 1]] } },
  { smiles: "O=[N+]([O-])c1ccccc1", atoms: [A("O"), A("N", 0, 1, 0, 0, 1), A("O", 0, -1, 0, 0, 1), A("C", 1), A("C", 1), A("C", 1), A("C", 1), A("C", 1), A("C", 1)], bonds: [[0, 1, "double"], [1, 2, "single"], [1, 3, "single"], [3, 4, "aromatic"], [3, 8, "aromatic"], [4, 5, "aromatic"], [5, 6, "aromatic"], [6, 7, "aromatic"], [7, 8, "aromatic"]], rings: [[3, 4, 5, 6, 7, 8]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8]], tok: [[0, 1], [1, 2], [2, 6], [6, 7], [7, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 20]], inchi: "InChI=1S/C6H5NO2/c8-7(9)6-4-2-1-3-5-6/h1-5H", ig: { atoms: ["C", "C", "C", "C", "C", "C", "N", "O", "O"], bonds: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [5, 6], [6, 7], [6, 8]], rings: [[0, 1, 2, 3, 4, 5]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8]] } },
  { smiles: "[Na+].[Cl-]", atoms: [A("Na", 0, 1, 0, 0, 1), A("Cl", 0, -1, 0, 0, 1)], bonds: [], rings: [], comps: [[0], [1]], tok: [[0, 5], [5, 6], [6, 11]], inchi: "InChI=1S/ClH.Na/h1H;/q;+1/p-1", ig: { atoms: ["Cl", "Na"], bonds: [], rings: [], comps: [[0], [1]] } },
  // substituted and fused rings written with a branch INSIDE the closure interval, multi-character tokens included (RDKit 2026.03.6 gold, generated with the repo's own gold functions): the naive interval ring reads these wrong
  { smiles: "c1cc(Cl)ccc1", atoms: [A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("Cl", 0, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0)], bonds: [[0, 1, "aromatic"], [0, 6, "aromatic"], [1, 2, "aromatic"], [2, 3, "single"], [2, 4, "aromatic"], [4, 5, "aromatic"], [5, 6, "aromatic"]], rings: [[0, 1, 2, 4, 5, 6]], comps: [[0, 1, 2, 3, 4, 5, 6]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12]], inchi: "InChI=1S/C6H5Cl/c7-6-4-2-1-3-5-6/h1-5H", ig: { atoms: ["C", "C", "C", "C", "C", "C", "Cl"], bonds: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [5, 6]], rings: [[0, 1, 2, 3, 4, 5]], comps: [[0, 1, 2, 3, 4, 5, 6]] } },
  { smiles: "C1CC(Br)CC1", atoms: [A("C", 0, 0, 0, 0, 0), A("C", 0, 0, 0, 0, 0), A("C", 0, 0, 0, 0, 0), A("Br", 0, 0, 0, 0, 0), A("C", 0, 0, 0, 0, 0), A("C", 0, 0, 0, 0, 0)], bonds: [[0, 1, "single"], [0, 5, "single"], [1, 2, "single"], [2, 3, "single"], [2, 4, "single"], [4, 5, "single"]], rings: [[0, 1, 2, 4, 5]], comps: [[0, 1, 2, 3, 4, 5]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 7], [7, 8], [8, 9], [9, 10], [10, 11]], inchi: "InChI=1S/C5H9Br/c6-5-3-1-2-4-5/h5H,1-4H2", ig: { atoms: ["C", "C", "C", "C", "C", "Br"], bonds: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [4, 5]], rings: [[0, 1, 2, 3, 4]], comps: [[0, 1, 2, 3, 4, 5]] } },
  { smiles: "c1ccc(Br)cc1", atoms: [A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("Br", 0, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0)], bonds: [[0, 1, "aromatic"], [0, 6, "aromatic"], [1, 2, "aromatic"], [2, 3, "aromatic"], [3, 4, "single"], [3, 5, "aromatic"], [5, 6, "aromatic"]], rings: [[0, 1, 2, 3, 5, 6]], comps: [[0, 1, 2, 3, 4, 5, 6]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 8], [8, 9], [9, 10], [10, 11], [11, 12]], inchi: "InChI=1S/C6H5Br/c7-6-4-2-1-3-5-6/h1-5H", ig: { atoms: ["C", "C", "C", "C", "C", "C", "Br"], bonds: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [5, 6]], rings: [[0, 1, 2, 3, 4, 5]], comps: [[0, 1, 2, 3, 4, 5, 6]] } },
  { smiles: "c1ccc2[nH]ccc2c1", atoms: [A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("N", 1, 0, 0, 1, 1), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0)], bonds: [[0, 1, "aromatic"], [0, 8, "aromatic"], [1, 2, "aromatic"], [2, 3, "aromatic"], [3, 4, "aromatic"], [3, 7, "aromatic"], [4, 5, "aromatic"], [5, 6, "aromatic"], [6, 7, "aromatic"], [7, 8, "aromatic"]], rings: [[0, 1, 2, 3, 7, 8], [3, 4, 5, 6, 7]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16]], inchi: "InChI=1S/C8H7N/c1-2-4-8-7(3-1)5-6-9-8/h1-6,9H", ig: { atoms: ["C", "C", "C", "C", "C", "C", "C", "C", "N"], bonds: [[0, 1], [0, 2], [1, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 8], [6, 7], [7, 8]], rings: [[0, 1, 2, 3, 6, 7], [4, 5, 6, 7, 8]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8]] } },
  { smiles: "c1ccc2nc(Cl)ccc2c1", atoms: [A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("N", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("Cl", 0, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0)], bonds: [[0, 1, "aromatic"], [0, 10, "aromatic"], [1, 2, "aromatic"], [2, 3, "aromatic"], [3, 4, "aromatic"], [3, 9, "aromatic"], [4, 5, "aromatic"], [5, 6, "single"], [5, 7, "aromatic"], [7, 8, "aromatic"], [8, 9, "aromatic"], [9, 10, "aromatic"]], rings: [[0, 1, 2, 3, 9, 10], [3, 4, 5, 7, 8, 9]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], tok: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18]], inchi: "InChI=1S/C9H6ClN/c10-9-6-5-7-3-1-2-4-8(7)11-9/h1-6H", ig: { atoms: ["C", "C", "C", "C", "C", "C", "C", "C", "C", "Cl", "N"], bonds: [[0, 1], [0, 2], [1, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 8], [6, 7], [7, 10], [8, 9], [8, 10]], rings: [[0, 1, 2, 3, 6, 7], [4, 5, 6, 7, 8, 10]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]] } },
  { smiles: "Clc1ccc2ccccc2c1", atoms: [A("Cl", 0, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0), A("C", 1, 0, 0, 0, 0)], bonds: [[0, 1, "single"], [1, 2, "aromatic"], [1, 10, "aromatic"], [2, 3, "aromatic"], [3, 4, "aromatic"], [4, 5, "aromatic"], [4, 9, "aromatic"], [5, 6, "aromatic"], [6, 7, "aromatic"], [7, 8, "aromatic"], [8, 9, "aromatic"], [9, 10, "aromatic"]], rings: [[1, 2, 3, 4, 9, 10], [4, 5, 6, 7, 8, 9]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], tok: [[0, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16]], inchi: "InChI=1S/C10H7Cl/c11-10-6-5-8-3-1-2-4-9(8)7-10/h1-7H", ig: { atoms: ["C", "C", "C", "C", "C", "C", "C", "C", "C", "C", "Cl"], bonds: [[0, 1], [0, 2], [1, 3], [2, 7], [3, 8], [4, 5], [4, 7], [5, 9], [6, 8], [6, 9], [7, 8], [9, 10]], rings: [[0, 1, 2, 3, 7, 8], [4, 5, 6, 7, 8, 9]], comps: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]] } },
];
// the toy gold needs a token list that matches the real strings; the two hand-typed aromatic ones are rebuilt from the text
toy[1].tok = Array.from({ length: 8 }, (_, i) => [i, i + 1]);
toy[6].tok = [[0, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]];
toy[13].tok = Array.from({ length: 17 }, (_, i) => [i, i + 1]);
toy[10].tok = Array.from({ length: 14 }, (_, i) => [i, i + 1]);

const HEAVY_SET = new Set(["C", "N", "O", "Cl", "F", "Na"]);
function buildToy() {
  const records = toy.map((m, i) => ({ id: `T${i}`, source: "toy", smiles: m.smiles, inchi: m.inchi, name: null, formula: null }));
  const gold = new Map();
  toy.forEach((m, i) => {
    const mu = m.bonds.length - m.atoms.length + m.comps.length;
    gold.set(`T${i}`, { id: `T${i}`, smi: { ok: true, atoms: m.atoms, bonds: m.bonds.map((b) => [Math.min(b[0], b[1]), Math.max(b[0], b[1]), b[2]]), rings: m.rings, comps: m.comps, mu, resolved: null, h_total: null, elements: [...new Set(m.atoms.map((a) => a[0]))] }, tok: { tokens: m.tok, reason: null }, inchi: { ok: true, atoms: m.ig.atoms, bonds: m.ig.bonds, rings: m.ig.rings, comps: m.ig.comps }, same_compound: true });
  });
  const corpus = {
    records,
    names: Array.from({ length: 12 }, (_, i) => ({ id: `N${i}`, text: ["2-chlorobutane", "propan-2-ol", "N-methylacetamide", "pyridine-3-carboxylic acid", "cyclohexane", "ethyl acetate", "1,2-dibromoethane", "benzene-1,4-diol", "acetonitrile", "3-aminopropanoic acid", "tetrahydrofuran", "dimethyl sulfoxide"][i] })),
    english: ["The weather was lovely and we walked to the harbour.", "She said that nobody had seen the letter since Tuesday.", "They are going to build a new bridge across the river.", "He could not remember where he had left his keys.", "The committee will meet again next month to decide.", "After dinner the children played quietly in the garden.", "It was the best of times and it was the worst of times.", "We should have taken the earlier train from the station.", "Nothing in the report suggested that the plan would fail.", "The old man smiled and told them a long story."],
    formula: ["C6H12O6", "H2O", "C2H6O", "NaCl", "C9H8O4", "CH4", "C6H6", "NH3", "CO2", "C12H22O11"].map((t, i) => ({ id: `F${i}`, text: t })),
    selfies: ["[C][C][O]", "[C][=C][C][=C][C][=C][Ring1][=Branch1]", "[C][C][Branch1][C][=O][O]", "[C][C][Cl]", "[N][#C][C]", "[C][C][=Branch1][C][=O][N]", "[O][C][C][O]", "[C][C][Branch1][C][C][C]"].map((t, i) => ({ id: `S${i}`, text: t })),
  };
  return { corpus, gold };
}

// ── readers built from the gold ──
function tokOf(goldTok, text) { return goldTok.tokens.map(([s, e]) => ({ start: s, end: e, cls: "x", text: text.slice(s, e) })); }
function perfectReader({ data, shift = 0, inchiShift = null }) {
  const recs = data.corpus.records;
  const byS = new Map(recs.map((r, i) => [r.smiles, i])), byI = new Map(recs.map((r, i) => [r.inchi, i]));
  const at = (i, sh = shift) => recs[(i + sh) % recs.length];
  const smilesRead = (i) => {
    const r = at(i), g = data.gold.get(r.id).smi, tok = data.gold.get(r.id).tok.tokens;
    const atomSpans = tok.filter(([s, e]) => /^(\[[^\]]+\]|Br|Cl|B|C|N|O|S|P|F|I|b|c|n|o|s|p|\*)$/.test(r.smiles.slice(s, e))).map((x) => x[0]);
    const beings = [
      ...g.atoms.map((a, k) => ({ id: `a${k}`, kind: "atom", span: [atomSpans[k], atomSpans[k] + 1], element: a[0], aromatic: !!a[2], charge: a[3], isotope: a[4], h: a[5], bracket: !!a[6] || a[5] > 0 })),
      ...g.rings.map((m, k) => ({ id: `r${k}`, kind: "ring", members: m })),
      ...g.comps.map((m, k) => ({ id: `c${k}`, kind: "component", members: m })),
    ];
    return { system: "smiles", beings, relations: g.bonds.map((b) => ({ end1: `a${b[0]}`, label: b[2], end2: `a${b[1]}`, explicit: false })), gaps: [], graph: { atoms: g.atoms.map((a) => ({ element: a[0] })), edges: g.bonds.map((b) => [b[0], b[1]]) } };
  };
  const inchiRead = (i) => {
    const r = at(i, inchiShift ?? shift), g = data.gold.get(r.id).inchi;
    const beings = [...g.atoms.map((e, k) => ({ id: `a${k}`, kind: "atom", element: e })), ...g.rings.map((m, k) => ({ id: `r${k}`, kind: "ring", members: m })), ...g.comps.map((m, k) => ({ id: `c${k}`, kind: "component", members: m }))];
    return { system: "inchi", beings, relations: g.bonds.map((b) => ({ end1: `a${b[0]}`, label: "bond", end2: `a${b[1]}` })), gaps: [], graph: { atoms: g.atoms.map((e) => ({ element: e })), edges: g.bonds.slice() } };
  };
  const classOf = new Map();
  for (const it of r0Items(data.corpus, 600)) classOf.set(it.text, it.gold);
  return {
    identify: (t) => ({ system: classOf.get(t) ?? null }),
    ear: (text, { system }) => (system === "smiles" ? tokOf(data.gold.get(recs[byS.get(text)].id).tok, text) : adapter.ear(text, { system })),
    // a PREFIX of a toy string is not in the lookup: the shipped adapter reads it (the causality licence needs prefix reads)
    read: (text, o) => (o.system === "smiles" ? (byS.has(text) ? smilesRead(byS.get(text)) : adapter.read(text, o)) : byI.has(text) ? inchiRead(byI.get(text)) : adapter.read(text, o)),
    graphOf: adapter.graphOf,
    nameElements: () => ({ elements: new Set() }),
    elementSymbols: () => ["C", "N", "O", "Cl", "F", "Na", "H"],
  };
}

const { corpus: TOY_CORPUS, gold: TOY_GOLD } = buildToy();
const DATA = { corpus: TOY_CORPUS, gold: TOY_GOLD };
// the toy fixture is tiny: strata need a smaller support floor than the 100 atoms declared for real splits (declared HERE, in the test, never in the instrument)
// (ALPHA too: a paired sign test over 4 informative toy molecules cannot reach the real-split significance level; the toy asserts the MECHANICS, not significance)
const TOY_PARAMS = withParams({ ALPHA: 0.1, R2: { smiles: { MIN_STRATUM: 5 }, inchi: { MIN_DECISIVE: 1 } } });
const TOY_TRAIN = { records: TOY_CORPUS.records, names: TOY_CORPUS.names, english: TOY_CORPUS.english, formula: TOY_CORPUS.formula, selfies: TOY_CORPUS.selfies };

// ───────────────────────────── the instrument, on toy data ─────────────────────────────
test("a perfect reader scores 1 on R1..R4 (SMILES and InChI) and passes; the shape is the declared RESULT SHAPE", () => {
  const reader = perfectReader({ data: DATA });
  const out = runLadder({ data: DATA, reader, split: "toy", params: TOY_PARAMS });
  assert.equal(out.family, "chem_smiles");
  for (const k of ["r0", "r1", "r2", "r3", "r4", "r5"]) {
    const c = out.rungs[k];
    for (const f of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(f in c, `${k} lacks ${f}`);
  }
  for (const k of ["r1", "r2", "r3", "r4"]) assert.ok(out.rungs[k].details.systems, `${k}: ${JSON.stringify(out.rungs[k].gaps)}`);
  const s = (r, sys) => out.rungs[r].details.systems[sys];
  assert.equal(s("r1", "smiles").score, 1);
  assert.equal(s("r2", "smiles").score, 1);
  assert.equal(s("r2", "inchi").score, 1);
  assert.equal(s("r3", "smiles").score, 1);
  assert.equal(s("r3", "inchi").score, 1);
  assert.equal(s("r4", "smiles").score, 1);
  assert.equal(s("r4", "inchi").score, 1);
  assert.equal(s("r4", "smiles").pass, true);
  assert.equal(s("r4", "inchi").pass, true, JSON.stringify({ c: s("r4", "inchi").controls, d: s("r4", "inchi").details }));
  assert.equal(s("r3", "smiles").pass, true);
  assert.equal(s("r2", "smiles").pass, true);
  assert.equal(s("r1", "smiles").pass, true, JSON.stringify({ c: s("r1", "smiles").controls, d: s("r1", "smiles").details, m: s("r1", "smiles").margin }));
  assert.equal(s("r1", "inchi").pass, null, "InChI lexeme gold is mechanical: no pass is asserted");
  assert.equal(s("r2", "inchi").pass, null, "R2 InChI is MECHANICAL (Amendment 1): no pass is asserted");
  assert.ok(s("r2", "inchi").gaps.some((g) => g.reason === "mechanical_rung"));
  assert.equal(s("r3", "inchi").pass, true, JSON.stringify({ c: s("r3", "inchi").controls, d: s("r3", "inchi").details }));
  // no TRAIN corpus and no injected baselines: R0 cannot be passed (A1), and says so with a typed gap
  assert.equal(s("r0", "multiclass").pass, null);
  assert.ok(s("r0", "multiclass").gaps.some((g) => g.reason === "order_blind_baselines_unavailable"));
});

test("R5 SMILES<->InChI: the perfect reader agrees on every gold-agreeing pair and a deranged pairing does not", () => {
  const out = runLadder({ data: DATA, reader: perfectReader({ data: DATA }), split: "toy", params: TOY_PARAMS });
  const c = out.rungs.r5.details.systems.smiles_inchi;
  assert.equal(c.score, 1);
  assert.ok(c.controls.deranged_pairs < 0.2);
  assert.equal(c.pass, true);
  // the toy gold has no OPSIN-verified names: R5 names is a TYPED GAP, not a pass
  assert.equal(out.rungs.r5.details.systems.iupac_name.pass, null);
  assert.ok(out.rungs.r5.details.systems.iupac_name.gaps.some((g) => g.reason === "unmeasured"));
  assert.equal(out.rungs.r5.details.systems.natural_languages.applicable, false);
});

test("a deranged reader (the NEXT molecule's answers) scores low and fails R3 and R4", () => {
  const out = runLadder({ data: DATA, reader: perfectReader({ data: DATA, shift: 1 }), split: "toy", params: TOY_PARAMS });
  const r3 = out.rungs.r3.details.systems.smiles, r4 = out.rungs.r4.details.systems.smiles;
  assert.ok(r3.score < 0.6, `r3 ${r3.score}`);
  assert.ok(r4.score < 0.6, `r4 ${r4.score}`);
  assert.equal(r3.pass, false);
  assert.equal(r4.pass, false);
  // R5: shift ONLY the InChI side: SMILES and InChI now describe different compounds and must disagree
  const r5 = runLadder({ data: DATA, reader: perfectReader({ data: DATA, shift: 0, inchiShift: 1 }), split: "toy", params: TOY_PARAMS }).rungs.r5.details.systems.smiles_inchi;
  assert.ok(r5.score < 0.3, `r5 ${r5.score}`);
  assert.equal(r5.pass, false);
});

test("a reader that merely EQUALS the chain-only control is refused: margin <= 0, no pass", () => {
  const base = perfectReader({ data: DATA });
  const chainOnly = {
    ...base,
    read: (text, o) => {
      const r = base.read(text, o);
      if (o.system !== "smiles") return r;
      const atoms = r.beings.filter((b) => b.kind === "atom");
      const comps = r.beings.filter((b) => b.kind === "component");
      const rel = [];
      for (const c of comps) for (let k = 0; k + 1 < c.members.length; k++) { const a = atoms[c.members[k]], b = atoms[c.members[k + 1]]; rel.push({ end1: `a${c.members[k]}`, label: a.aromatic && b.aromatic ? "aromatic" : "single", end2: `a${c.members[k + 1]}`, explicit: false }); }
      return { ...r, relations: rel };
    },
  };
  const out = runLadder({ data: DATA, reader: chainOnly, split: "toy", params: TOY_PARAMS });
  const r4 = out.rungs.r4.details.systems.smiles;
  assert.ok(r4.margin <= 0.05, `margin ${r4.margin}`);
  assert.equal(r4.pass, false);
});

test("the causality licence catches a LOOKAHEAD reader and passes the real one (prefix reads are subsets of the whole)", () => {
  const real = causalViolations(TOY_CORPUS.records, { ear: adapter.ear, read: adapter.read }, "smiles", { sample: 50 });
  assert.equal(real.violations, 0, JSON.stringify(real.examples));
  assert.ok(real.checked > 5);
  const lookahead = (t, final) => {
    const r = adapter.read(t, { system: "smiles", final });
    const n = r.beings.filter((b) => b.kind === "atom").length;
    const re = (id) => (id[0] === "a" ? `a${n - 1 - +id.slice(1)}` : id);
    return { ...r, beings: r.beings.map((b) => (b.kind === "atom" ? { ...b, id: re(b.id) } : b)), relations: r.relations.map((x) => ({ ...x, end1: re(x.end1), end2: re(x.end2) })) };
  };
  const bad = causalViolations(TOY_CORPUS.records, { ear: adapter.ear, read: adapter.read }, "smiles", { sample: 50, readFn: lookahead });
  assert.ok(bad.violations > 0, "a reader numbering atoms from the end of what it has read must be caught");
});

test("R0: a perfect identifier scores 1 and passes ONLY against weak baselines; shuffled strings and label derangement score low", () => {
  const reader = perfectReader({ data: DATA });
  const items = r0Items(DATA.corpus, 600);
  // an injected, deliberately weak baseline (the order-blind baselines of the real card are built from TRAIN: see the buildBaselines tests)
  const weak = { always_smiles: { name: "always_smiles", orderBlind: false, usesOrder: false, classify: () => "smiles" } };
  const c = scoreR0({ items, verdict: (t) => reader.identify(t).system, reader, split: "toy", baselines: weak });
  assert.equal(c.score, 1);
  assert.ok(c.controls.content_shuffled < 0.2);
  assert.ok(c.controls.label_derangement < 0.4);
  assert.equal(c.pass, true);
  assert.equal(c.details.coverage, 1);
  // an identifier that always says "smiles" hides: low score, fails
  const hide = scoreR0({ items, verdict: () => "smiles", reader, split: "toy", baselines: weak });
  assert.ok(hide.score < 0.35);
  assert.equal(hide.pass, false);
  // no baselines: the pass is NULL with a typed gap, never a pass (A1)
  const none = scoreR0({ items, verdict: (t) => reader.identify(t).system, reader, split: "toy" });
  assert.equal(none.pass, null);
  assert.ok(none.gaps.some((g) => g.reason === "order_blind_baselines_unavailable"));
});

test("R0 (A1): an identifier that is merely a character histogram, or a character bigram model, is REFUSED: margin <= 0, no pass", () => {
  const reader = perfectReader({ data: DATA });
  const items = r0Items(DATA.corpus, 600);
  const BL = buildBaselines(TOY_TRAIN);
  assert.deepEqual(Object.keys(BL), ["char_unigram_nb", "char_bigram_nb", "length_only", "case_mask_nb"]);
  for (const name of ["char_unigram_nb", "char_bigram_nb"]) {
    const c = scoreR0({ items, verdict: (t) => BL[name].classify(t), reader, split: "toy", baselines: BL });
    assert.ok(c.margin <= 0, `${name}: margin ${c.margin}`);
    assert.equal(c.pass, false, name);
    assert.ok(c.notes.some((x) => /broken/.test(x)), "a control that does as well as the real arm is flagged as instrument/mechanism broken");
  }
  // the shuffle control was the v1 'strongest' control: it is NOT enough any more. The order-blind baseline is far above it.
  const real = scoreR0({ items, verdict: (t) => reader.identify(t).system, reader, split: "toy", baselines: BL });
  assert.ok(real.controls.char_unigram_nb > real.controls.content_shuffled, "an order-blind baseline outscores the content-shuffled control");
  assert.notEqual(real.details.strongest_control, "content_shuffled");
  assert.equal(real.details.headroom, +(1 - real.control).toFixed(4));
  // the curve beside the baselines is reported at every declared prefix
  for (const p of PARAMS.R0.PREFIXES) assert.ok("char_bigram_nb" in real.details.prefix_accuracy[p].baselines || real.details.prefix_accuracy[p].n === 0, `prefix ${p}`);
});

test("R0 (A1): the baselines are what they claim. Order-blind ones are shuffle-INVARIANT, the bigram model is not, and the TRAIN recipe is the system prior's", () => {
  const train = { records: [], names: [], english: [], formula: [], selfies: [] };
  for (let i = 0; i < 20; i++) { train.records.push({ smiles: "ab", inchi: "InChI=1S/zz" }); train.names.push({ text: "ba" }); train.english.push("zz"); train.formula.push({ text: "ee" }); train.selfies.push({ text: "ff" }); }
  const BL = buildBaselines(train);
  // "ab" and "ba" have the same characters: a histogram cannot tell them apart, a bigram model can
  assert.equal(BL.char_unigram_nb.classify("ab"), BL.char_unigram_nb.classify("ba"));
  assert.equal(BL.char_bigram_nb.classify("ab"), "smiles");
  assert.equal(BL.char_bigram_nb.classify("ba"), "iupac_name");
  // exact invariance of the order-blind ones on real-looking strings
  const rng = mulberry32(3);
  const BT = buildBaselines(TOY_TRAIN);
  for (const r of TOY_CORPUS.records) for (const name of ["char_unigram_nb", "length_only", "case_mask_nb"]) {
    const sh = [...r.smiles].sort(() => rng() - 0.5).join("");
    assert.equal(BT[name].classify(sh), BT[name].classify(r.smiles), `${name} on ${r.smiles}`);
  }
  // length_only sees nothing but the length; case_mask_nb sees nothing but U/l/d/s/p
  assert.equal(BT.length_only.classify("C".repeat(10)), BT.length_only.classify("N".repeat(10)));
  assert.equal(BT.case_mask_nb.classify("CCO"), BT.case_mask_nb.classify("NNS"));
  // the recipe of chem_smiles-data/build-system-prior.mjs: every other InChI has its header stripped
  const items = trainItemsOf(TOY_TRAIN);
  assert.ok(items.inchi[0].startsWith("InChI=") && !items.inchi[1].startsWith("InChI="));
  assert.equal(buildBaselines({ records: [] }), null);
  // the licence check of the instrument records the invariance and the movement
  const reader = perfectReader({ data: DATA });
  const c = scoreR0({ items: r0Items(DATA.corpus, 600), verdict: (t) => reader.identify(t).system, reader, split: "toy", baselines: BT });
  assert.equal(c.details.licence.char_unigram_nb_shuffle_invariant.licensed, true);
  assert.equal(c.details.licence.length_only_shuffle_invariant.licensed, true);
  assert.equal(c.details.licence.case_mask_nb_shuffle_invariant.licensed, true);
  assert.ok("char_bigram_nb_moves_under_shuffle" in c.details.licence);
});

test("R5 names: Youden's J is chance-corrected: evidence scores high, a deranged pairing and a constant guess score ~0", () => {
  const recs = [], gold = new Map();
  for (let i = 0; i < 80; i++) {
    const cl = i % 2 === 0, s = i % 3 === 0;
    const atoms = [["C"], ...(cl ? [["Cl"]] : []), ...(s ? [["S"]] : []), ["O"]];
    recs.push({ id: `R${i}`, name: `n${i}` });
    gold.set(`R${i}`, { smi: { ok: true, atoms }, name_opsin: { ok: true, consistent: true } });
  }
  const truth = (i) => new Set([...(i % 2 === 0 ? ["Cl"] : []), ...(i % 3 === 0 ? ["S"] : []), "O"]);
  const perfect = { nameElements: (name) => ({ elements: truth(+name.slice(1)) }) };
  const c = scoreR5Name({ recs, gold, reader: perfect, split: "toy" });
  assert.equal(c.score, 1);
  assert.ok(c.controls.deranged_pairs < 0.3);
  assert.equal(c.pass, true);
  const constant = { nameElements: () => ({ elements: new Set(["O"]) }) };
  const k = scoreR5Name({ recs, gold, reader: constant, split: "toy" });
  assert.ok(k.score < 0.2);
  assert.equal(k.pass, false);
});

test("wlHash separates different graphs and is invariant to atom order", () => {
  const a = { labels: ["C", "C", "O"], edges: [[0, 1], [1, 2]] };
  const b = { labels: ["O", "C", "C"], edges: [[2, 1], [1, 0]] };
  const c = { labels: ["C", "O", "C"], edges: [[0, 1], [1, 2]] };
  assert.equal(wlHash(a), wlHash(b));
  assert.notEqual(wlHash(a), wlHash(c));
});

test("signTest and derangement: exact tail, no fixed points", () => {
  assert.ok(signTest(8, 0).p < 0.01);
  assert.equal(signTest(0, 0).p, 1);
  const p = derangement(20, mulberry32(1));
  assert.ok(p.every((x, i) => x !== i));
  assert.equal(derangement(1, mulberry32(1)), null);
});

test("measure(): missing data is a typed gap (pass: null), never a throw; the pre-registration digest is stamped", async () => {
  const out = await measure({ split: "no-such-split" });
  assert.equal(out.family, "chem_smiles");
  for (const k of ["r0", "r1", "r2", "r3", "r4", "r5"]) {
    assert.equal(out.rungs[k].pass, null);
    assert.equal(out.rungs[k].gaps[0].reason, "unmeasured");
  }
  assert.equal(loadData("no-such-split"), null);
  assert.match(PREREG_SHA256, /^[0-9a-f]{64}$/);
});

// ───────────────────────────── the adapter, pinned on hand-written gold ─────────────────────────────
test("adapter SMILES: tokens, atoms, bonds, rings and components equal the hand gold for every toy molecule", () => {
  toy.forEach((m, i) => {
    const toks = adapter.ear(m.smiles, { system: "smiles" }).map((t) => [t.start, t.end]);
    assert.deepEqual(toks, m.tok, `tokens of ${m.smiles}`);
    const r = adapter.read(m.smiles, { system: "smiles" });
    const atoms = r.beings.filter((b) => b.kind === "atom");
    assert.equal(atoms.length, m.atoms.length, m.smiles);
    atoms.forEach((a, k) => {
      assert.equal(a.element, m.atoms[k][0], `${m.smiles} atom ${k}`);
      assert.equal(a.aromatic, !!m.atoms[k][2]);
      assert.equal(a.charge, m.atoms[k][3]);
      assert.equal(a.isotope, m.atoms[k][4]);
      if (a.bracket) assert.equal(a.h, m.atoms[k][5]);
    });
    const edges = r.relations.map((x) => [+x.end1.slice(1), +x.end2.slice(1)].sort((p, q) => p - q).join("-")).sort();
    assert.deepEqual(edges, m.bonds.map((b) => `${Math.min(b[0], b[1])}-${Math.max(b[0], b[1])}`).sort(), `edges of ${m.smiles}`);
    const rings = r.beings.filter((b) => b.kind === "ring").map((b) => b.members.join(",")).sort();
    assert.deepEqual(rings, m.rings.map((x) => x.join(",")).sort(), `rings of ${m.smiles}`);
    const comps = r.beings.filter((b) => b.kind === "component").map((b) => b.members.join(",")).sort();
    assert.deepEqual(comps, m.comps.map((x) => x.join(",")).sort());
    // labels as written
    for (const rel of r.relations) {
      const key = [+rel.end1.slice(1), +rel.end2.slice(1)].sort((p, q) => p - q);
      const gb = m.bonds.find((b) => b[0] === key[0] && b[1] === key[1]);
      assert.equal(rel.label, gb[2], `${m.smiles} bond ${key}`);
    }
  });
});

test("adapter SMILES: Cl and Br are one token, an unknown bracket symbol is REFUSED, a bad character is a typed gap, nothing throws", () => {
  assert.deepEqual(adapter.ear("CCl", { system: "smiles" }).map((t) => t.text), ["C", "Cl"]);
  assert.deepEqual(adapter.ear("CBr", { system: "smiles" }).map((t) => t.text), ["C", "Br"]);
  const refused = adapter.read("C[Xx]C", { system: "smiles" });
  assert.ok(refused.gaps.some((g) => g.reason === "symbol_not_element"));
  assert.equal(refused.beings.filter((b) => b.kind === "atom").length, 2, "the refused bracket names no atom");
  const bad = adapter.read("C~C?C", { system: "smiles" });
  assert.ok(bad.gaps.some((g) => g.reason === "char_not_in_grammar"));
  for (const s of ["", "(", ")", "[", "C1", "C%", "InChI=", ".."]) { adapter.read(s, { system: "smiles" }); adapter.read(s, { system: "inchi" }); adapter.identify(s); }
});

test("adapter: capitalisation is ONE witness: 'se' (aromatic selenium) and 'Se' are told apart by the bracket grammar, not by the case alone", () => {
  const a = adapter.read("[se]1cccc1", { system: "smiles" }).beings.find((b) => b.kind === "atom");
  assert.equal(a.element, "Se");
  assert.equal(a.aromatic, true);
  const b = adapter.read("[Se]C", { system: "smiles" }).beings.find((x) => x.kind === "atom");
  assert.equal(b.element, "Se");
  assert.equal(b.aromatic, false);
});

test("adapter InChI: atoms from the formula (C first, H never numbered), bonds from /c incl. repeats and empty components, rings at closure", () => {
  const eth = adapter.read("InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3", { system: "inchi" });
  assert.deepEqual(eth.beings.filter((b) => b.kind === "atom").map((b) => b.element), ["C", "C", "O"]);
  assert.equal(eth.relations.length, 2);
  const two = adapter.read("InChI=1S/2C2H6O/c2*1-2-3/h2*3H,2H2,1H3", { system: "inchi" });
  assert.deepEqual(two.relations.map((r) => [r.end1, r.end2]), [["a0", "a1"], ["a1", "a2"], ["a3", "a4"], ["a4", "a5"]]);
  const salt = adapter.read("InChI=1S/C2H4O2.Na/c1-2(3)4;/h1H3,(H,3,4);/q;+1/p-1", { system: "inchi" });
  assert.equal(salt.beings.filter((b) => b.kind === "component").length, 2);
  assert.ok(salt.gaps.some((g) => g.reason === "bond_order_not_in_notation"));
  const ring = adapter.read("InChI=1S/C3H6/c1-2-3-1/h1-3H2", { system: "inchi" });
  assert.equal(ring.beings.filter((b) => b.kind === "ring").length, 1);
});

test("adapter R0: identifies each system on the toy strings; a prefix is read as a prefix; WLN is a typed gap", () => {
  assert.equal(adapter.identify("CC(=O)Oc1ccccc1C(=O)O").system, "smiles");
  assert.equal(adapter.identify("InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3").system, "inchi");
  assert.equal(adapter.identify("C2H6O/c1-2-3/h3H,2H2,1H3").system, "inchi", "header stripped");
  assert.equal(adapter.identify("2-chloro-3-methylbutanoic acid").system, "iupac_name");
  assert.equal(adapter.identify("The committee will meet again next month to decide.").system, "english");
  assert.equal(adapter.identify("[C][C][Branch1][C][=O][O]").system, "selfies");
  const w = adapter.read("1VQ", { system: "wln" });
  assert.equal(w.gaps[0].reason, "no_received_prior");
  assert.ok(w.gaps[0].missing.includes("WLN"));
  // a prefix of a SMILES is not an error: closure is 'na' until the text is complete
  const v = adapter.identify("c1ccccc", { complete: false });
  assert.notEqual(v.features.smiles_viol, "yes");
  assert.equal(v.features.smiles_closed, "na");
});

test("adapter degrades to a typed gap when a prior is absent (never throws)", () => {
  const empty = adapter.loadPriors({ dir: "/nonexistent-dir" });
  assert.equal(empty.elements, null);
  const r = adapter.read("CCO", { system: "smiles", priors: empty });
  assert.ok(r.gaps[0].reason.startsWith("prior_missing"));
  const v = adapter.identify("CCO", { priors: empty });
  assert.equal(v.system, null);
  assert.ok(v.gap.startsWith("prior_missing"));
});

test("name evidence: halogens are heard from TRAIN-tallied n-grams; absence of evidence names nothing", () => {
  const e = adapter.nameElements("2-chloro-1-fluoroethane").elements;
  assert.ok(e.has("Cl") && e.has("F"));
  assert.equal(adapter.nameElements("ethane").elements.size, 0);
});

// ───────────────────────────── AMENDMENT 1: R2 / R3 / R5 and the append-only pre-registration ─────────────────────────────
const ELEMENTS = Object.keys(adapter.loadPriors().elements.symbols);
const readsOf = (reader, recs) => recs.map((r) => reader.read(r.smiles, { system: "smiles" }));
const inchiReadsOf = (reader, recs) => recs.map((r) => reader.read(r.inchi, { system: "inchi" }));

test("A2: the capitalisation control is bracket-aware, scores per atom, and fails exactly where capitalisation is not the signal", () => {
  // v1 read the 'H' inside [C@H] / [nH] as an extra atom and zeroed the molecule; the replacement does not
  assert.deepEqual(capsBracketAwareAtoms("C[C@H](F)Cl", ELEMENTS).map((a) => a.element), ["C", "C", "F", "Cl"]);
  const nh = capsBracketAwareAtoms("[nH]1cccc1", ELEMENTS);
  assert.equal(nh.length, 5);
  assert.deepEqual([nh[0].element, nh[0].aromatic, nh[0].bracket, nh[0].h], ["N", true, true, 0]);
  const iso = capsBracketAwareAtoms("[13CH3]O", ELEMENTS);
  assert.deepEqual(iso.map((a) => [a.element, a.isotope, a.charge]), [["C", 0, 0], ["O", 0, 0]], "isotope and charge are NOT read by capitalisation");
  // capitalisation as THE signal fails where the case is ambiguous: 'Cn' is the element copernicium to a case-reader, 'C' + aromatic 'n' to the grammar
  assert.equal(capsBracketAwareAtoms("Cn1cccc1", ELEMENTS).length, 5);
  assert.equal(adapter.read("Cn1cccc1", { system: "smiles" }).beings.filter((b) => b.kind === "atom").length, 6);
});

test("A2: R2 SMILES is stratified (organic / aromatic / bracket); a perfect reader passes; a capitalisation-only reader is REFUSED on the decisive stratum", () => {
  const reader = perfectReader({ data: DATA });
  const recs = TOY_CORPUS.records;
  const args = { recs, gold: TOY_GOLD, reads: readsOf(reader, recs), reader, split: "toy", elements: ELEMENTS, params: TOY_PARAMS };
  const c = scoreR2Smiles(args);
  assert.deepEqual(Object.keys(c.details.strata), R2_STRATA);
  assert.ok(c.details.strata.bracket.n >= 5 && c.details.strata.aromatic.n > 0 && c.details.strata.organic.n > 0);
  assert.equal(c.score, 1);
  assert.equal(c.details.micro_v1_rule.pass, true, "the v1 micro rule is a CONJUNCT of the v2 pass (Amendment 1b)");
  assert.equal(c.pass, true, JSON.stringify({ c: c.controls, l: c.details.licence, m: c.details.micro_v1_rule }));
  assert.ok(c.controls.caps_bracket_aware < 0.5, "capitalisation reads no charge, isotope or H: it cannot score on bracket atoms that carry them");
  // a reader that reads atoms by capitalisation only (the finding's mutant): its decisive score IS the control's: refused
  const E = new Set(ELEMENTS);
  const capsReader = { ...reader, read: (t, o) => { const r = reader.read(t, o); if (o.system !== "smiles") return r; const caps = capsBracketAwareAtoms(t, ELEMENTS); return { ...r, beings: r.beings.map((b) => (b.kind === "atom" && caps[+b.id.slice(1)] ? { ...b, ...caps[+b.id.slice(1)] } : b)) }; } };
  void E;
  const m = scoreR2Smiles({ ...args, reads: readsOf(capsReader, recs), reader: capsReader });
  assert.ok(m.margin <= 0.05, `margin ${m.margin}`);
  assert.equal(m.pass, false);
  // the shipped support floor (100 atoms) is not met by the toy: the decisive stratum is unsupported -> typed gap, NO pass
  const g = scoreR2Smiles({ ...args, params: PARAMS });
  assert.equal(g.pass, null);
  assert.ok(g.gaps.some((x) => x.reason === "decisive_stratum_unsupported"));
  // no aromatic atoms in a split (PubChem is Kekule-written): that stratum is a typed gap, never a pass
  const kek = recs.map((_, i) => i).filter((i) => !TOY_GOLD.get(recs[i].id).smi.atoms.some((a) => a[2] === 1));
  const sub = kek.map((i) => recs[i]);
  const k = scoreR2Smiles({ ...args, recs: sub, reads: readsOf(reader, sub) });
  assert.ok(k.gaps.some((x) => x.reason === "stratum_unsupported" && x.stratum === "aromatic"));
});

test("A2: R2 InChI is MECHANICAL: formula_order_only is the reader's own rule (margin 0), alphabetical numbering is a promoted control, and no pass is asserted", () => {
  const reader = perfectReader({ data: DATA });
  const recs = TOY_CORPUS.records;
  const c = scoreR2Inchi({ recs, gold: TOY_GOLD, reads: inchiReadsOf(reader, recs), split: "toy", params: TOY_PARAMS });
  assert.equal(c.pass, null);
  assert.ok(c.gaps.some((g) => g.reason === "mechanical_rung"));
  for (const k of ["deranged_elements", "always_carbon", "alphabetical_numbering", "formula_order_only"]) assert.ok(k in c.controls, k);
  assert.equal(c.controls.formula_order_only, c.score, "the honest control IS the reader's own rule");
  // Hill order: C first, then alphabetical; alphabetical alone puts Br before C
  assert.deepEqual(expandFormulaLayer("InChI=1S/C6H5Br/c7-6-4-2-1-3-5-6/h1-5H"), ["C", "C", "C", "C", "C", "C", "Br"]);
  assert.deepEqual(expandFormulaLayer("InChI=1S/C6H5Br/c7-6-4-2-1-3-5-6/h1-5H", { alphabetical: true }), ["Br", "C", "C", "C", "C", "C", "C"]);
  assert.deepEqual(expandFormulaLayer("InChI=1S/2C2H6O/c2*1-2-3/h2*3H,2H2,1H3"), ["C", "C", "O", "C", "C", "O"]);
  assert.ok(c.details.decisive_subset.molecules >= 2, "bromo compounds are in the decisive subset");
  assert.equal(c.details.decisive_subset.formula_order_only, 1);
  assert.ok(c.details.decisive_subset.alphabetical_numbering < 1, "alphabetical numbering is wrong exactly on the decisive subset");
  // a reader that numbers alphabetically scores BELOW the mechanical rule
  const alpha = { ...reader, read: (t, o) => { const r = reader.read(t, o); if (o.system !== "inchi") return r; const el = expandFormulaLayer(t, { alphabetical: true }); let i = 0; return { ...r, beings: r.beings.map((b) => (b.kind === "atom" ? { ...b, element: el[i++] ?? b.element } : b)) }; } };
  const m = scoreR2Inchi({ recs, gold: TOY_GOLD, reads: inchiReadsOf(alpha, recs), split: "toy", params: TOY_PARAMS });
  assert.ok(m.score < m.controls.formula_order_only);
});

test("A3: naive_rings credits atoms and components and replaces only ring logic; the ring-F1 headline and the per-kind floor refuse what macro-F1 hid", () => {
  // the textual interval is right for a bare ring and wrong when a substituent is written inside the closure interval
  assert.deepEqual(naiveRingsSmiles("c1ccccc1", [0, 1, 2, 3, 4, 5]), ["0,1,2,3,4,5"]);
  const starts = adapter.read("c1ccc(Br)cc1", { system: "smiles" }).beings.filter((b) => b.kind === "atom").map((b) => b.span[0]);
  assert.deepEqual(naiveRingsSmiles("c1ccc(Br)cc1", starts), ["0,1,2,3,4,5,6"], "the Br atom is wrongly inside the ring");
  const iso = adapter.read("[13CH3]c1ccccc1", { system: "smiles" }).beings.filter((b) => b.kind === "atom").map((b) => b.span[0]);
  assert.deepEqual(naiveRingsSmiles("[13CH3]c1ccccc1", iso), ["1,2,3,4,5,6"], "digits inside brackets are not closures");
  assert.deepEqual(naiveRingsInchi("InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H", [0]), ["0,1,2,3,4,5"]);
  assert.deepEqual(naiveRingsInchi("InChI=1S/2C3H6/c2*1-2-3-1/h2*1-3H2", [0, 3]), ["0,1,2", "3,4,5"], "'2*' expands the repeated component");
  const reader = perfectReader({ data: DATA });
  const recs = TOY_CORPUS.records;
  const args = { recs, gold: TOY_GOLD, reads: readsOf(reader, recs), reader, split: "toy", params: TOY_PARAMS };
  const c = scoreR3Smiles(args);
  assert.equal(c.score, c.details.per_kind.rings.f1, "the headline IS ring F1");
  assert.ok(c.controls.naive_rings < 1 && c.controls.naive_rings > 0.3, `naive_rings ${c.controls.naive_rings}`);
  assert.deepEqual(c.details.naive_rings_per_kind.atoms, c.details.per_kind.atoms, "atoms are CREDITED to the control");
  assert.deepEqual(c.details.naive_rings_per_kind.comps, c.details.per_kind.comps, "components are CREDITED to the control");
  assert.ok(c.details.naive_text_strawman_per_kind.atoms.f1 < 0.9, "the v1 strawman is kept as a diagnostic only");
  assert.equal(c.pass, true, JSON.stringify({ c: c.controls, d: c.details.licence }));
  // a reader whose rings ARE the naive rings equals the strongest control: margin 0, refused
  const asNaive = { ...reader, read: (t, o) => { const r = reader.read(t, o); if (o.system !== "smiles") return r; const st = r.beings.filter((b) => b.kind === "atom").map((b) => b.span[0]); return { ...r, beings: [...r.beings.filter((b) => b.kind !== "ring"), ...naiveRingsSmiles(t, st).map((k, i) => ({ id: `r${i}`, kind: "ring", members: k.split(",").map(Number) }))] }; } };
  const n = scoreR3Smiles({ ...args, reads: readsOf(asNaive, recs), reader: asNaive });
  assert.ok(n.margin <= 0.001, `margin ${n.margin}`);
  assert.equal(n.pass, false);
  // PER-KIND FLOOR: drop the rings of just enough polycyclic molecules (4 rings of 17): atoms and components stay perfect so macro-F1 stays >= 0.9,
  // while ring F1 falls below the per-kind floor. The v1 rule (macro-F1) could not see it.
  const dropped = new Set();
  let nDropped = 0;
  for (const r of recs) { const k = TOY_GOLD.get(r.id).smi.rings.length; if (k >= 2 && nDropped < 4) { dropped.add(r.smiles); nDropped += k; } }
  const dropPoly = { ...reader, read: (t, o) => { const r = reader.read(t, o); return o.system === "smiles" && dropped.has(t) ? { ...r, beings: r.beings.filter((b) => b.kind !== "ring") } : r; } };
  const f = scoreR3Smiles({ ...args, reads: readsOf(dropPoly, recs), reader: dropPoly });
  assert.ok(f.details.per_kind.rings.f1 < PARAMS.R3.MIN_KIND_F1, `ring F1 ${f.details.per_kind.rings.f1}`);
  assert.ok(f.details.macro_f1.real >= PARAMS.R3.MIN_MACRO_F1, `macro ${f.details.macro_f1.real}: the v1 rule would not have seen the ring failure`);
  assert.equal(f.details.kind_floor_ok, false);
  assert.equal(f.pass, false);
  // InChI: the same shape
  const ci = scoreR3Inchi({ recs, gold: TOY_GOLD, reads: inchiReadsOf(reader, recs), reader, split: "toy", params: TOY_PARAMS });
  assert.equal(ci.score, ci.details.per_kind.rings.f1);
  assert.ok("naive_rings" in ci.controls && "formula_only" in ci.controls && "deranged" in ci.controls);
  assert.equal(ci.pass, true, JSON.stringify({ c: ci.controls, d: ci.details.licence }));
});

test("A4: R5(a) is scored against the gold graph; an edgeless, atom-count-only or bond-scrambled reader is REFUSED though it is self-consistent", () => {
  const reader = perfectReader({ data: DATA });
  const recs = TOY_CORPUS.records;
  const base = { recs, gold: TOY_GOLD, smilesReads: readsOf(reader, recs), inchiReads: inchiReadsOf(reader, recs), split: "toy", params: TOY_PARAMS };
  const real = scoreR5SmilesInchi({ ...base, reader });
  assert.equal(real.score, 1);
  assert.equal(real.pass, true, JSON.stringify(real.controls));
  for (const k of ["edge_deleted", "bond_scrambled", "atom_count_only", "deranged_pairs"]) assert.ok(k in real.controls, k);
  assert.ok(real.details.licence.degraded_readers_fall.licensed);
  // the v1 statistic: an edgeless reader is perfectly self-consistent (reported!) but scores ~0 against the gold graph
  assert.equal(real.details.diagnostics.self_consistency_of_edge_deleted_reader, 1);
  assert.equal(real.details.diagnostics.self_consistency_of_atom_count_only_reader, 1);
  const rng = mulberry32(5);
  for (const [name, mutate] of [["edge_deleted", (g) => DEGRADERS.edge_deleted(g)], ["atom_count_only", (g) => DEGRADERS.atom_count_only(g)], ["bond_scrambled", (g) => DEGRADERS.bond_scrambled(g, rng)]]) {
    const bad = { ...reader, graphOf: (res) => mutate(adapter.graphOf(res)) };
    const c = scoreR5SmilesInchi({ ...base, reader: bad });
    assert.ok(c.score < 0.5, `${name}: score ${c.score}`);
    assert.equal(c.pass, false, name);
    if (name !== "bond_scrambled") assert.equal(c.details.diagnostics.self_consistency_v1_statistic, 1, `${name}: the v1 statistic is blind to it`);
  }
  // each reader graph is scored against the RDKit gold digest, not only against the other notation
  assert.equal(real.details.diagnostics.smiles_vs_gold, 1);
  assert.equal(real.details.diagnostics.inchi_vs_gold, 1);
  const shifted = scoreR5SmilesInchi({ ...base, reader, inchiReads: inchiReadsOf(perfectReader({ data: DATA, shift: 1 }), recs) });
  assert.ok(shifted.details.diagnostics.inchi_vs_gold < 0.5);
});

test("the pre-registration is APPEND-ONLY: the v1 block still hashes to its published digest; the amendment is stamped; the card carries both", async () => {
  assert.match(PREREG_V1_SHA256, /^[0-9a-f]{64}$/);
  assert.equal(PREREG_V1_RECOMPUTED_SHA256, PREREG_V1_SHA256, "the original claim was edited after the fact");
  assert.notEqual(PREREG_SHA256, PREREG_V1_SHA256, "the amendment is part of the stamped digest");
  const src = fs.readFileSync(new URL("../eval/notation-competence/chem_smiles.mjs", import.meta.url), "utf8");
  const head = src.slice(0, src.indexOf("// ═══ END PRE-REGISTRATION"));
  for (const tag of ["AMENDMENT 1 (2026-10-06", "AMENDMENT 1b (2026-10-06", "A1  R0", "A2  R2", "A3  R3", "A4  R5(a)", "DISCLOSURE"]) assert.ok(head.includes(tag), tag);
  assert.ok(head.indexOf("// ═══ AMENDMENT 1") > head.indexOf("TYPED GAPS"), "the amendment follows the original block");
});

// ───────────────────────────── the real corpus (skipped when absent) ─────────────────────────────
test("real DEV slice: the shipped adapter, measured, has the declared shape and reads atoms and bonds perfectly", { skip: !fs.existsSync(`${ROOT}/gold/dev.jsonl`) }, async () => {
  const out = await measure({ split: "dev", limit: 40 });
  for (const k of ["r0", "r1", "r2", "r3", "r4", "r5"]) { assert.ok(k in out.rungs); assert.ok(out.rungs[k].pass === true || out.rungs[k].pass === false || out.rungs[k].pass === null); }
  assert.ok(out.rungs.r3.details.systems.smiles.details.macro_f1.real > 0.9);
  assert.equal(out.rungs.r3.details.systems.smiles.score, out.rungs.r3.details.systems.smiles.details.per_kind.rings.f1, "R3 headline = ring F1");
  assert.deepEqual(Object.keys(out.rungs.r0.details.systems.multiclass.details.baselines), ["char_unigram_nb", "char_bigram_nb", "length_only", "case_mask_nb"], "R0 baselines are fitted on TRAIN and reported");
  assert.equal(out.rungs.r2.details.systems.inchi.pass, null, "R2 InChI is mechanical");
  assert.ok("caps_bracket_aware" in out.rungs.r2.details.systems.smiles.controls);
  assert.ok("edge_deleted" in out.rungs.r5.details.systems.smiles_inchi.controls);
  assert.equal(out.provenance.prereg_v1_text_unchanged, true);
  assert.equal(out.provenance.baselines_fitted_on.split, "train");
  assert.equal(out.rungs.r4.details.systems.smiles.score, 1);
  assert.equal(out.rungs.r3.details.systems.smiles.details.causality.violations, 0);
  assert.ok(out.rungs.r3.details.systems.smiles.details.causality_licence_lookahead_reader.violations > 0);
  assert.equal(out.provenance.prereg_sha256, PREREG_SHA256);
});
