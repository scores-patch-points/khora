// wire-unit-priors.mjs — put the two STAGED unit-cells priors into the priors home, with the owner's word (2026-11-24, "Yes, wire them").
// Never overwrites: a file that exists is left alone and reported. The staged originals are kept untouched. The operator-name mapping is DERIVED
// (the study's metadata names each operator's position and triad; the kernel's cube says which current operator sits there), never typed.
//
//   node wire-unit-priors.mjs --dry   print what would be written
//   node wire-unit-priors.mjs         write
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { priorsHome } from "../../../native/the-fold/prior-source.mjs";
import { cellOf } from "../../../native/kernel/cube.js";
import { caveatsFor, ATTACK } from "./caveats.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDY = process.env.EO_LEX ?? "/Users/mlacy/eo-lexical-analysis";
const DRY = process.argv.includes("--dry");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

/** the study's operator name -> the current cube's, matched by position x triad */
export function operatorNames() {
  const cells = JSON.parse(fs.readFileSync(`${STUDY}/output/phasepost_centroids_meta.json`, "utf8")).cells, byPos = new Map();
  for (const op of ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]) { const c = cellOf(op, "Figure"); byPos.set(`${c.mode}|${c.domain}`, op); }
  const names = {};
  for (const v of Object.values(cells)) { const now = byPos.get(`${v.pos}|${v.tri}`); if (!now) throw new Error(`no current operator at ${v.pos} x ${v.tri}`); if (names[v.op] && names[v.op] !== now) throw new Error(`${v.op} maps to two operators`); names[v.op] = now; }
  if (Object.keys(names).length !== 9 || new Set(Object.values(names)).size !== 9) throw new Error("the mapping is not a bijection of nine operators");
  return names;
}
const GRAIN = { GROUND: "Ground", FIGURE: "Figure", PATTERN: "Pattern" };
const classNameOf = (cls, names) => { const [op, ref] = cls.split("|"); return ref ? `${names[op]}·${GRAIN[ref]}` : names[op]; };

// the caveats and the attack summary live in caveats.mjs, so a re-wire carries what the amendment added


function wire() {
  const names = operatorNames(), home = priorsHome().dir, written = [];
  if (!home || !fs.existsSync(home)) throw new Error(`the priors home does not exist: ${home}`);
  for (const head of ["op", "cell"]) {
    const name = `unit-cells-qwen3-embedding_4b-${head}.json`, from = path.join(HERE, "stage", name), to = path.join(home, name);
    const raw = fs.readFileSync(from, "utf8"), j = JSON.parse(raw);
    if (j.meta.falsification?.verdict !== "SUPPORTED") throw new Error(`${name}: the staged verdict is ${j.meta.falsification?.verdict}, not SUPPORTED; refusing to wire`);
    const classNames = Object.fromEntries(Object.keys(j.classes).map((c) => [c, classNameOf(c, names)]));
    j.meta = { ...j.meta, status: "WIRED 2026-11-24 with the owner's word; use as a PROPOSER only", wiredAt: new Date().toISOString(), stagedFile: `identity/novels/ablation-sniffer/stage/${name}`, stagedSha256: sha(raw), useAs: "proposer", classNames, operatorNamesGiver: `the study's operator names mapped to the current cube by position x triad (eo-lexical-analysis/output/phasepost_centroids_meta.json against native/kernel/cube.js): ${JSON.stringify(names)}`, caveats: caveatsFor(head), attack: ATTACK, evidence: "identity/novels/ablation-sniffer/RESULTS-UNIT-SNIFFER.md (preregistered, one run, reused split; post-hoc section exploratory)", licenceNote: "centroids (means of embeddings), not words; the word lists come from eo-lexical-analysis (verb classifications of VerbNet, WordNet, FrameNet and native-language lexicons); the licences of those lists were not audited" };
    const out = JSON.stringify(j);
    if (fs.existsSync(to)) { written.push({ name, wrote: false, why: "exists; left alone" }); continue; }
    if (!DRY) fs.writeFileSync(to, out, { flag: "wx" });
    written.push({ name, wrote: !DRY, to, bytes: out.length, sha256: sha(out), classes: Object.keys(j.classes).length, sample: Object.entries(classNames).slice(0, 4) });
  }
  return { home, names, written };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) console.log(JSON.stringify(wire(), null, 1));
