#!/usr/bin/env node
// scripts/build-attach-prior.mjs — AttachPrior@1 for ONE language, from its Universal Dependencies treebank, scored on the held-out dev split.
//   node native/scripts/build-attach-prior.mjs --code=en --dir=UD_English-EWT [--adps=to] [--ud=data/ud] [--out=<dir>] [--dry=1]
// Pre-registered: eval/meaning/ATTACH-PRIOR-PREREG.md (bars B1-B4 and the control). Train split builds the prior; the official dev split scores it;
// the test split is not opened. The giver is the treebank; the file and its sha256 travel with the prior (the provenance law).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseConllu } from "../kernel/eot-rich.js";
import { buildPrior, decide, instancesOf, ATTACH_SCHEMA } from "../kernel/attach-prior.js";
import { RECIPIENT } from "../adapters/text/grammar-packs.js";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const CODE = arg("code"), DIR = arg("dir") ?? arg("dirs"); if (!CODE || !DIR) { console.error("--code and --dir are required"); process.exit(2); }
const UD = path.resolve(process.cwd(), arg("ud", "data/ud")), OUT = arg("out", null), DRY = arg("dry", "0") === "1";
const adps = new Set((arg("adps", RECIPIENT[CODE] ?? "")).split(",").filter(Boolean).map((x) => x.toLowerCase()));
// --dir=UD_X (one treebank) or --dirs=UD_X,UD_Y (Amendment 1: a language's treebanks pooled, each needing a train and a dev split)
const DIRS = DIR.split(",");
const splits = DIRS.map((d) => { const fs_ = fs.readdirSync(path.join(UD, d)), pk = (x) => fs_.find((f) => f.endsWith(`-ud-${x}.conllu`)) ?? null; return { dir: d, train: pk("train"), dev: pk("dev") }; });
const usable = splits.filter((x) => x.train && x.dev);
if (!usable.length) { console.error(`${DIR}: no treebank has both a train and a dev split`); process.exit(3); }
const readOf = (d, f) => parseConllu(fs.readFileSync(path.join(UD, d, f), "utf8")).filter((s) => s.tokens.length && s.tokens.every((t) => t.head !== null));
const sha = (d, f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(UD, d, f))).digest("hex");
const trainFile = usable.map((x) => x.train).join("+"), devFile = usable.map((x) => x.dev).join("+");
const train = usable.flatMap((x) => readOf(x.dir, x.train)), dev = usable.flatMap((x) => readOf(x.dir, x.dev));
const prior = buildPrior(train, { adps }), second = buildPrior(train, { adps });
const deterministic = JSON.stringify(prior) === JSON.stringify(second);   // B4 (and the file bytes below)
const trainInst = train.flatMap((s) => instancesOf(s, { adps })), devInst = dev.flatMap((s) => instancesOf(s, { adps }));
const tv = trainInst.filter((i) => i.attach === "verb").length, tn = trainInst.length - tv, majority = tv >= tn ? "verb" : "noun";   // lemma-blind class of TRAIN
const score = (P) => { const d = devInst.filter((i) => decide(P, i.verb)); return { decided: d.length, correct: d.filter((i) => decide(P, i.verb) === i.attach).length }; };
const real = score(prior);
// the control built to fail: each lemma's counts given to the next lemma (sorted), so the prior is a prior of something, but not of that verb
const lemmas = Object.keys(prior), deranged = Object.fromEntries(lemmas.map((l, i) => [l, prior[lemmas[(i + 1) % lemmas.length]]]));
const ctl = score(deranged);
const base = (d) => d.decided ? d.correct / d.decided : null;
const majorityOnDecided = (() => { const d = devInst.filter((i) => decide(prior, i.verb)); return d.length ? d.filter((i) => i.attach === majority).length / d.length : null; })();
const result = {
  code: CODE, treebank: usable.map((x) => x.dir).join("+"), adps: [...adps], trainInstances: trainInst.length, devInstances: devInst.length, lemmas: lemmas.length,
  trainMajorityClass: majority, devCoverage: devInst.length ? real.decided / devInst.length : null,
  priorAccuracyOnDecided: base(real), majorityClassAccuracyOnDecided: majorityOnDecided, derangedControlAccuracy: base(ctl),
  B1: base(real) != null && majorityOnDecided != null && base(real) > majorityOnDecided, B3_enough: devInst.length >= 30, B4: deterministic,
  controlFell: base(ctl) != null && majorityOnDecided != null && base(ctl) <= majorityOnDecided,
};
console.log(JSON.stringify(result));
if (OUT && !DRY) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `attach-${CODE}.json`), JSON.stringify({ schema: ATTACH_SCHEMA, code: CODE, treebank: DIR, trainFile, trainSha256: usable.map((x) => sha(x.dir, x.train)).join("+"), adps: [...adps], dativeFeature: "Case=Dat",
    split: `train ${trainFile}; scored on the official dev ${devFile}; test not opened`, rule: "verb iff verb > noun; noun iff noun > verb; a tie or an unseen lemma abstains",
    heldOut: { ...result }, giver: `Universal Dependencies ${DIR} (github.com/UniversalDependencies/${DIR}); licence per the treebank's own README`, builder: "native/scripts/build-attach-prior.mjs", prior }, null, 1) + "\n");
}
