// eval/make-fold-priors.mjs — held-out slices of the TRAIN treebanks that nothing has ever read, with priors rebuilt without them.
//
//   node eval/make-fold-priors.mjs --out DIR [--frac 0.2] [--stems a,b] [--side tail|head]
//
// For each stem: the treebank's sentence blocks are cut at (1 - frac). The first part trains EVERY prior the reader loads (POS, frame,
// refusal floor, contraction, and the Arabic/Hebrew proclitic and Korean enclitic priors) by the SAME builders that built the shipped ones;
// the last `frac` is written to DIR/<stem>/tail.conllu and is the confirmation text of eval/beings-ladder.mjs --source tail --tail-dir DIR.
// Neither the priors nor any diagnostic has seen those sentences: this is the fresh draw the spent TEST split cannot be.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TB_DIR } from "./competence/lib.mjs";

const NATIVE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
const TRAIN_DIRS = { kor: "kor-gsd" };
const OWN_EAR = new Set(["arb", "heb", "kor"]); // proclitic / enclitic priors already peel for these; the contraction layer is not stacked on them
const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const SIDE = opt("--side", "tail"); // tail: hold out the LAST frac (fold A); head: hold out the FIRST frac (fold B, a second fresh draw)
const OUT = opt("--out"), FRAC = Number(opt("--frac", "0.2")), STEMS = opt("--stems", null)?.split(",") ?? STEMS25;
if (!OUT) { console.error("usage: make-fold-priors.mjs --out DIR [--frac 0.2] [--stems a,b]"); process.exit(2); }
const priors = path.join(OUT, "priors");
fs.mkdirSync(priors, { recursive: true });
const run = (script, ...args) => { try { return execFileSync("node", [path.join(NATIVE, "scripts", script), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").pop(); } catch (e) { return `FAILED ${script}: ${String(e.stderr || e.message).trim().split("\n").pop()}`; } };
for (const stem of STEMS) {
  const src = path.join(TB_DIR, TRAIN_DIRS[stem] ?? stem, "train.conllu");
  if (!fs.existsSync(src)) { console.log(`${stem}: no train treebank`); continue; }
  const blocks = fs.readFileSync(src, "utf8").split(/\n\s*\n/).filter((b) => b.trim());
  const nHeld = Math.floor(blocks.length * FRAC);
  const [trainBlocks, heldBlocks] = SIDE === "head" ? [blocks.slice(nHeld), blocks.slice(0, nHeld)] : [blocks.slice(0, blocks.length - nHeld), blocks.slice(blocks.length - nHeld)];
  const cut = trainBlocks.length;
  const dir = path.join(OUT, stem); fs.mkdirSync(dir, { recursive: true });
  const head = path.join(dir, "head.conllu");
  fs.writeFileSync(head, trainBlocks.join("\n\n") + "\n\n");
  fs.writeFileSync(path.join(dir, "tail.conllu"), heldBlocks.join("\n\n") + "\n\n");
  const lines = [];
  lines.push(run("build-pos-prior.mjs", head, path.join(priors, `pos-${stem}.json`), stem, `fold-${stem}`, "fold slice (evaluation only)"));
  lines.push(run("build-frame-prior.mjs", head, path.join(priors, `frame-${stem}.json`), stem));
  lines.push(run("build-refusal-floor.mjs", head, path.join(priors, `refusal-${stem}.json`), stem));
  if (!OWN_EAR.has(stem)) lines.push(run("build-contraction-prior.mjs", head, path.join(priors, `contractions-${stem}.json`), stem)); // arb heb kor have their own ear
  if (stem === "arb" || stem === "heb") lines.push(run("build-proclitic-prior.mjs", head, path.join(priors, `proclitics-${stem}.json`), stem, `fold-${stem}`, "100"));
  if (stem === "kor") lines.push(run("build-enclitic-prior.mjs", head, path.join(priors, `enclitics-${stem}.json`), stem, "30"));
  console.log(`${stem}: ${blocks.length} sentences, train ${cut} / held out ${heldBlocks.length} (${SIDE})\n   ${lines.filter(Boolean).map((l) => l.slice(0, 150)).join("\n   ")}`);
}
