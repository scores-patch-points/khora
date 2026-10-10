#!/usr/bin/env node
// javascript-priors-posthoc.mjs: POST-HOC diagnosis of the two failures and one unlicensed check in the FIRST run of
// build-javascript-priors.mjs (N3a precision fail, R3 attestation fail, N4 genericity unlicensed). READING-POLICY II.5: this file was written AFTER
// those results were seen. Nothing here changes a verdict or a shipped prior; it is exploratory, labelled post_hoc in the card it writes, and its
// numbers are never pass/fail evidence for the pre-registered checks. TRAIN only (the manifest's javascript TRAIN rows); no dev or test file is opened.
//
//   node eval/coding-competence/javascript-priors-posthoc.mjs [--out DIR]
//
// It answers three questions the failures raise:
//   P1 which of the three recipe patterns carries the precision failure? (per-pattern precision against the grammar's CORE defs)
//   P2 would a tightened const-arrow pattern, proposed (not applied) as a fix to BOTH adapters/text/code-structure.js and
//      scripts/build-code-name-prior-split.mjs, repair it without losing recall of function-bound consts? (precision, targeted recall, per-node recall)
//   P3 does the genericity statistic have any power when the names are the GRAMMAR's CORE definition names (methods included, as in
//      priors/code-name-train-js.json) instead of the recipe's? (leave-one-repository-out lift with the same control as N4)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { goldBatch, CORE_DEF_KINDS } from "./gold.mjs";
import { verifyTrain, loroLift, controlLifts, decideN4, recipeVsGold, MANIFEST } from "./build-python-priors.mjs";
import { RECIPES, RECIPE_EXTS, TARGET_NODES, CONSTS, inRecipeFamily } from "./build-javascript-priors.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "/private/tmp/claude-501/coding-competence/javascript-priors";

// the PROPOSED tightening of the third pattern: the arrow must follow a balanced-looking parameter list or a single bare parameter,
// instead of the lazy `[^=]*?` that can span any text up to the next `=>`
const TIGHT_CONST_ARROW = String.raw`^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^()]*\)|[A-Za-z_$][\w$]*)\s*=>`;

function pairsOf(files, sources) {
  const perRepo = new Map();
  for (const f of files) {
    if (!perRepo.has(f.repo)) perRepo.set(f.repo, new Set());
    for (const src of sources) {
      const re = new RegExp(src, "gm");
      let m;
      while ((m = re.exec(f.text))) perRepo.get(f.repo).add(m[1]);
    }
  }
  return perRepo;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const tv = verifyTrain(manifest, "javascript");
if (tv.problems.length) { console.error("TRAIN purity failed", tv.problems.slice(0, 3)); process.exit(1); }
const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8") }));
const golds = await goldBatch(files.map((f) => ({ language: "javascript", text: f.text, fileName: f.rel })));
const docs = files.map((f, i) => ({ ...f, gold: golds[i] })).filter((d) => !d.gold.error);
const rdocs = docs.filter((d) => inRecipeFamily(d.rel));

const goldCore = new Set(), goldTarget = new Set(), nodeOf = new Map();
for (const d of rdocs) for (const df of d.gold.defs) {
  if (!CORE_DEF_KINDS.includes(df.kind)) continue;
  const k = `${d.repo}\t${df.name}`;
  goldCore.add(k);
  if (TARGET_NODES.includes(df.node)) goldTarget.add(k);
  if (!nodeOf.has(df.node)) nodeOf.set(df.node, new Set());
  nodeOf.get(df.node).add(k);
}
const recipeSources = RECIPES.map((r) => r.source);
const stat = (sources) => {
  const per = pairsOf(rdocs, sources);
  const r = recipeVsGold(per, goldCore);
  let tHit = 0; for (const p of goldTarget) { const [repo, n] = p.split("\t"); if (per.get(repo)?.has(n)) tHit++; }
  const byNode = {};
  for (const [node, set] of nodeOf) { let h = 0; for (const p of set) { const [repo, n] = p.split("\t"); if (per.get(repo)?.has(n)) h++; } byNode[node] = { pairs: set.size, seen: h, recall: h / set.size }; }
  return { pairs: r.regexPairs, precision: r.precision, recall: r.recall, targetedRecall: goldTarget.size ? tHit / goldTarget.size : null, byNode, falsePositiveExamples: r.onlyRegexExamples.slice(0, 10) };
};

const P1 = RECIPES.map((r, i) => ({ pattern: i, kind: r.kind, source: r.source, ...stat([r.source]) }));
const P2 = { current: stat(recipeSources), tightened: stat([recipeSources[0], recipeSources[1], TIGHT_CONST_ARROW]), tightPattern: TIGHT_CONST_ARROW, onlyTheTwoDeclarationPatterns: stat([recipeSources[0], recipeSources[1]]) };

// P3: genericity over the grammar's CORE definition names, all 240 TRAIN files, methods included
const perRepoGold = new Map();
for (const d of docs) {
  if (!perRepoGold.has(d.repo)) perRepoGold.set(d.repo, new Set());
  for (const df of d.gold.defs) if (CORE_DEF_KINDS.includes(df.kind)) perRepoGold.get(d.repo).add(df.name);
}
const real = loroLift(perRepoGold, CONSTS.GENERIC_FLOOR);
const control = controlLifts(perRepoGold, CONSTS.CONTROL_DRAWS, CONSTS.SEED + "|posthoc");
const P3 = { names: [...new Set([...perRepoGold.values()].flatMap((s) => [...s]))].length, namesAtOrAboveFloor: (() => { const c = new Map(); for (const s of perRepoGold.values()) for (const n of s) c.set(n, (c.get(n) || 0) + 1); return [...c].filter(([, v]) => v >= 2).map(([n, v]) => [n, v]); })(), real, control, verdictByN4Rule: decideN4(real, control, CONSTS) };

const card = { schema: "JavascriptPriorsPostHoc@1", post_hoc: true, note: "written after the first run's results were seen; exploratory; never pass/fail evidence for the pre-registered checks", split: "train", repos: tv.repos, files: docs.length, recipeFiles: rdocs.length, P1, P2, P3, builtAt: new Date().toISOString() };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "card-javascript-priors-posthoc.json"), JSON.stringify(card, null, 1));
const f3 = (x) => (x == null ? "n/a" : x.toFixed(3));
console.log("P1 per-pattern precision vs CORE defs:");
for (const p of P1) console.log(`  pattern ${p.pattern} (${p.kind}): pairs ${p.pairs} precision ${f3(p.precision)} recall ${f3(p.recall)} targetedRecall ${f3(p.targetedRecall)}  fp: ${p.falsePositiveExamples.slice(0, 6).join(" | ")}`);
console.log("P2 current vs proposed tightening of pattern 3:");
for (const k of ["current", "onlyTheTwoDeclarationPatterns", "tightened"]) console.log(`  ${k}: pairs ${P2[k].pairs} precision ${f3(P2[k].precision)} recall ${f3(P2[k].recall)} targetedRecall ${f3(P2[k].targetedRecall)} variable_declarator recall ${f3(P2[k].byNode.variable_declarator?.recall)}`);
console.log(`P3 gold CORE names (methods included): ${P3.names} distinct, ${P3.namesAtOrAboveFloor.length} at floor 2: ${P3.namesAtOrAboveFloor.map(([n, v]) => `${n}(${v})`).join(", ")}`);
console.log(`   pooled lift ${f3(real.pooled.lift)} (G=${real.pooled.G}, hitG=${real.pooled.hitG}, S=${real.pooled.S}, hitS=${real.pooled.hitS}); control median ${f3(control.median)} max ${f3(control.max)}; N4 rule says: ${P3.verdictByN4Rule}`);
console.log(`   folds: ${real.folds.map((f) => `${f.heldOut}: G=${f.G} hitG=${f.hitG} lift=${f3(f.lift)}`).join(" ; ")}`);
