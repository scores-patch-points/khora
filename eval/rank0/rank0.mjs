#!/usr/bin/env node
// rank0.mjs <khora dir> <questions.json> <texts dir> <out.json>  — runs every RANK-0 arm and prints the measures and the bars.
// Needs KHORA_PRIORS_DIR set (see PREREG-RANK-0.md) and the local ollama with nomic-embed-text:latest. Optional env: RANK0_CACHE (a dir for
// read/embedding caches; leave unset for a clean run). Questions: {"new":[{"id","q","doc","gold_start":[...]}]} as QSET-1.json.
import fs from "node:fs";
import { runAll, bars, table, modelDigest, MODEL_DIGEST_PREFIX, FUSION_SMELL_ARM, sha } from "./rank0-lib.mjs";
const [K, QF, TD, OUT] = process.argv.slice(2);
if (!K || !QF || !TD || !OUT) { console.error("usage: rank0.mjs <khora dir> <questions.json> <texts dir> <out.json>"); process.exit(2); }
if (!process.env.KHORA_PRIORS_DIR) { console.error("KHORA_PRIORS_DIR is not set"); process.exit(2); }
const digest = await modelDigest();
if (!digest || !digest.startsWith(MODEL_DIGEST_PREFIX)) { console.error(`embedding model digest ${digest} is not ${MODEL_DIGEST_PREFIX}…`); process.exit(2); }
const qs = JSON.parse(fs.readFileSync(QF, "utf8"));
const questions = qs.new ?? [];
const cache = process.env.RANK0_CACHE || null;
if (cache) fs.mkdirSync(cache, { recursive: true });
const res = await runAll(K, questions, TD, { cacheDir: cache, embCache: cache ? `${cache}/emb.json` : null, log: (s) => console.error(s) });
const b = bars(res.measures, res.fusionArm);
const { _read, _D, ...out } = res;
// secondary, descriptive only (no bar): the pool is every text in the dir, as the Ask pools. Skipped when RANK0_SECONDARY=0.
if (process.env.RANK0_SECONDARY !== "0") {
  const r2 = await runAll(K, questions, TD, { cacheDir: cache, embCache: cache ? `${cache}/emb.json` : null, poolMode: "dir", log: (s) => console.error(s) });
  const { _read: _a, _D: _b, perQuestion, ...o2 } = r2; out.secondaryAllTexts = { ...o2, perQuestion: perQuestion.map((p) => ({ id: p.id, pool: p.pool, ranks: p.ranks, stratum: p.stratum, lowOverlap: p.lowOverlap })) };
}
out.bars = b; out.questionsSha256 = sha(fs.readFileSync(QF, "utf8")); out.modelDigest = digest; out.fusionArm = FUSION_SMELL_ARM;
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`RANK-0  questions ${out.nQuestions} (scored ${out.nScored}, unmatched gold ${out.unmatchedGold.length})  fusion arm ${out.fusionArm}  median overlap ${out.median.toFixed(3)}`);
console.log(table(out.measures));
if (out.secondaryAllTexts) { console.log("\n-- SECONDARY (descriptive, no bar): pool = all texts in the dir --"); console.log(table(out.secondaryAllTexts.measures)); }
console.log("\nBARS", JSON.stringify(b, null, 1));
