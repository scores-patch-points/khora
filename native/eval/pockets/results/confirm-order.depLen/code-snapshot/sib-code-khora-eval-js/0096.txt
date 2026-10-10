// prep-windows.mjs: DATA PREPARATION (no outcome is computed; not a test). For each ud-eval stem, cut ONE contiguous window of TRAIN text with the same number of sentences as that stem's DEV
// (so stream size, hence the stream's own frequency ranks and FWC32, are comparable with the dev sample the rule was discovered on), at a seeded offset; write windows/<stem>.json.
// Train text of these stems was never read by name-company, the moderators lens, the family lens or the polarity lens for any company/name question (it was read by impact.mjs / window-prims.mjs for other law questions).
// kor uses tb/kor-gsd (the treebank of ud-eval/kor); verified by sent_id style. Run:  NAME_COMPANY_PAIRBLOCK=1 node prep-windows.mjs [stem ...]   (default: all stems)
import fs from "node:fs";
import path from "node:path";
import { HERE, UD, TB, readConllu, rngFor, seedFor, describe, round } from "./lib.mjs";
const OUT = path.join(HERE, "windows"); fs.mkdirSync(OUT, { recursive: true });
const stems = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(UD).sort();
for (const stem of stems) {
  const tp = path.join(TB, stem === "kor" ? "kor-gsd" : stem, "train.conllu"); if (!fs.existsSync(tp)) { console.error(stem, "NO TRAIN"); continue; }
  const S = readConllu(path.join(UD, stem, "dev.conllu")).sents.length, tr = readConllu(tp), N = tr.sents.length;
  const take = Math.min(S, N), off = take === N ? 0 : Math.floor(rngFor(seedFor("confirm-R1", "window", stem))() * (N - take + 1));
  const sents = tr.sents.slice(off, off + take), upos = tr.upos.slice(off, off + take), d = describe(sents), nP = upos.reduce((t, u) => t + u.filter((x) => x === "PROPN").length, 0);
  fs.writeFileSync(path.join(OUT, stem + ".json"), JSON.stringify({ stem, source: tp, devSentences: S, trainSentences: N, offset: off, taken: take, sents, upos }));
  console.error(stem, "dev", S, "train", N, "off", off, "taken", take, "tokens", d.tokens, "fwc32", round(d.fwc32), "propn", nP);
}
