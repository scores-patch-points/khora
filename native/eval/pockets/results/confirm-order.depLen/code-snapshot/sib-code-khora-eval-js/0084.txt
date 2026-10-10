// build-rulebook.mjs — merges the hand-written rule files (rules-1..3.json, negatives.json) with the verification results and checks integrity (new file).
//
// PRE-REGISTRATION (FOLD-CONSTITUTION II.5), written before the first run of this script.
// KIND. Bookkeeping, no test and no data read except saved JSON. Checks: (1) every rule has the 10 required fields, ids are unique, at most 14 rules, effect numeric, confirmPlan === "carried";
//   (2) every evidence path listed below exists on disk (a guard against quoting a file that is not there); (3) every verify-*.json reports its checks, and any check that did NOT reproduce
//   is listed with the explanation recorded here; (4) a hard-rule audit: no rule's `observables` text mentions a capital-letter feature, and rules that need priors say PRIOR-BASED.
// DISCLOSURE. All rule text was written after reading the reports and after the verify scripts ran (their JSON outputs existed when the rules were written).
// BLIND PREDICTIONS. All paths exist; verify-beings has exactly the 3 non-reproduced checks already seen (two threshold counts, one stage label); every other check reproduces.
// END-HEADER
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { EVAL, OUT, readJson, headerSha, save } from "./lib.mjs";

const K = "/Users/mlacy/Documents/3.0/khora/native/", E = (p) => path.join(EVAL, p);
const EVID = {
  "COMPANY-FIRST-LEFT": [E("law/results/name-company-pairblocks/report.json"), E("law/NAME-COMPANY-RESULTS.md"), E("law/name-company.mjs"), "verify-signals.json"],
  "COMPANY-LATER-BOTH": [E("law/results/name-company-pairblocks/report.json"), E("law/NAME-COMPANY-RESULTS.md"), E("law/name-company-diag.mjs"), "verify-signals.json"],
  "COMPANY-CHAT-WITHIN-REGISTER": [E("law/results/name-company-pairblocks/report.json"), E("law/NAME-COMPANY-RESULTS.md"), "verify-signals.json"],
  "EDGE-SLOT": [E("law/NAME-RULE-RESULTS.md"), E("kinds-swarm/ant-shape/results/extras.json"), E("kinds-swarm/ant-kinds-chat/results/induce.irc.json"), E("kinds-swarm/ant-adversary/kind_position.mjs"), "kind_position.rerun.out", E("kinds-swarm/ant-kinds-novel/REPORT.md"), "verify-signals.json"],
  "IRC-SENTRY-MATCHED": [E("kinds-swarm/ant-adversary/results/irc_analysis_C.json"), E("kinds-swarm/ant-adversary/PREREG_IRC_A2.md"), E("kinds-swarm/ant-adversary/CRITIQUE.md"), E("kinds-swarm/ant-kinds-chat/REPORT.md"), "verify-signals.json"],
  "UD-NOUN-ROLE": [E("kinds-swarm/ant-adversary/results/ud_confound.json"), E("kinds-swarm/ant-adversary/ud_confound.mjs"), E("kinds-swarm/ant-kinds-ud/REPORT.md"), "verify-signals.json"],
  "KIND-COARSE-COMPANY": [E("kinds-swarm/ant-kinds-chat/results/induce.irc.json"), E("kinds-swarm/ant-kinds-chat/REPORT.md"), E("kinds-swarm/ant-kinds-ud/REPORT.md"), E("kinds-swarm/ant-kinds-novel/REPORT.md"), E("kinds-swarm/ant-adversary/CRITIQUE.md"), "verify-signals.json"],
  "CODE-IDENTIFIER-DIVERSITY": [E("kinds-swarm/ant-code/results/summary.txt"), E("kinds-swarm/ant-code/results/js-np-PA.json"), E("kinds-swarm/ant-code/results/transfer.json"), E("kinds-swarm/ant-code/results/joint-report.json"), E("kinds-swarm/ant-code/PREREG.md")],
  "BEINGS-STANDING-NAMES-EXEMPT": [E("BEINGS-LADDER.md"), E("beings-ladder-results/t1/eng.json"), E("beings-ladder-results/t2/eng.json"), E("rules-structure-results.json"), "verify-beings.part1.json"],
  "BEINGS-CONTRACTION-EAR": [E("BEINGS-LADDER.md"), E("beings-ladder-results/t1/ita.json"), E("beings-ladder-results/t2/ita.json"), K + "priors/contractions-ita.json", "verify-beings.part1.json"],
  "BEINGS-REFUSAL-LOSS-BOUNDED": [E("BEINGS-LADDER.md"), E("beings-ladder-results/t1/eng.json"), K + "priors/refusal-eng.json", "verify-beings.part1.json"],
  "BEINGS-EVIDENCE-ORDER-AND-SINGLE-MENTION": [E("beings-graded.mjs"), E("beings-graded-results/g0-foldA/eng.json"), E("beings-graded-results/g0-foldB/eng.json"), E("rules-structure-results.json"), E("competence/CARD.md"), "verify-graded.json"],
  "PHYS-SHADOW-ADDITIVE-FLOOR": [E("physics-handles/REPORT.md"), E("physics-handles/PHYSICS-HANDLES.md"), E("physics-handles/results/reader/_report.w1.json"), E("physics-handles/results/reader/_report.w2.json"), E("kinds-swarm/ant-kinds-novel/results/frag-wp.report.json"), "verify-physics.json", "verify-physics-auc.json"],
  "PHYS-LOCAL-ATTRACTION": [E("physics-handles/REPORT.md"), E("physics-handles/results/gravity/_report.json"), E("physics-handles/attraction.mjs"), E("physics-handles/plant.mjs"), "verify-physics.json"],
};
const NOT_REPRODUCED = { "L3.t1.Aup": "report says 12 stems up for A; at |effect| > 0.0005 it is 12, at the 0.002 threshold used here 10 (fold A) and 9 (fold B): a threshold difference, not a number difference", "L3.t2.Aup": "same as L3.t1.Aup", "L5.dev.salienceAUC": "the reported 0.52 is the stage-s0 value (0.5238); the final configuration gives 0.447 (DEV s4), 0.416 (fold A), 0.448 (fold B)" };
const rules = ["rules-1.json", "rules-2.json", "rules-3.json"].flatMap((f) => readJson(path.join(OUT, f))), negatives = readJson(path.join(OUT, "negatives.json"));
const need = ["id", "statement", "scope", "outOfScope", "observables", "discovery", "effect", "confirmPlan", "passIf", "failIf"], problems = [];
if (rules.length > 14) problems.push(`too many rules: ${rules.length}`);
const ids = new Set();
for (const r of rules) {
  for (const k of need) if (r[k] === undefined || r[k] === "") problems.push(`${r.id}: missing ${k}`);
  if (ids.has(r.id)) problems.push(`duplicate id ${r.id}`); ids.add(r.id);
  if (typeof r.effect !== "number") problems.push(`${r.id}: effect not numeric`);
  if (r.confirmPlan !== "carried") problems.push(`${r.id}: confirmPlan ${r.confirmPlan}`);
  if (/\bcapital(s)? (letter|case)|\bcasing\b/i.test(r.observables) && !/no capital|no casing|No capital/i.test(r.observables)) problems.push(`${r.id}: observables mention capitals without negating`);
  if (/BEINGS-/.test(r.id) && !/PRIOR-BASED/.test(r.observables + r.outOfScope)) problems.push(`${r.id}: prior-based rule not labelled`);
  const ev = (EVID[r.id] ?? []).map((p) => (path.isAbsolute(p) ? p : path.join(OUT, p)));
  if (!ev.length) problems.push(`${r.id}: no evidence paths`);
  r.evidenceFiles = ev.map((p) => ({ path: p, exists: fs.existsSync(p) })); for (const e of r.evidenceFiles) if (!e.exists) problems.push(`${r.id}: missing evidence ${e.path}`);
}
const ver = {}; for (const f of fs.readdirSync(OUT).filter((x) => /^verify-.*\.json$/.test(x))) { const d = readJson(path.join(OUT, f)); ver[f] = { script: d.script, headerSha256: d.headerSha256, summary: d.summary ?? d.verdicts ?? null }; }
const bad = Object.entries(ver).flatMap(([f, v]) => (v.summary?.notReproduced ?? []).map((id) => ({ file: f, id })));
for (const b of bad) if (!NOT_REPRODUCED[b.id]) problems.push(`unexplained non-reproduced check ${b.file}:${b.id}`);
const book = { builtBy: "build-rulebook.mjs", headerSha256: headerSha(import.meta.url), lens: "carried-rules", n: rules.length, problems, verification: ver, nonReproducedExplained: bad.map((b) => ({ ...b, why: NOT_REPRODUCED[b.id] })), rules, negatives, sourceFileSha256: Object.fromEntries(["rules-1.json", "rules-2.json", "rules-3.json", "negatives.json"].map((f) => [f, createHash("sha256").update(fs.readFileSync(path.join(OUT, f))).digest("hex")])) };
save("RULEBOOK.json", book); console.log(JSON.stringify({ n: rules.length, negatives: negatives.length, problems, ver: Object.fromEntries(Object.entries(ver).map(([f, v]) => [f, v.summary])) }, null, 1));
