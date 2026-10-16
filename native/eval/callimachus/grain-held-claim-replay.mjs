#!/usr/bin/env node
// eval/callimachus/grain-held-claim-replay.mjs — GRAIN-HELD-CLAIM-PREREG.md H8, H11: the permanent-dst replay arms, COMMITTED BEFORE IT IS RUN.
//
//   node native/eval/callimachus/grain-held-claim-replay.mjs --universe <permanent-dst copy> --whom <twin-reader whom dir> --out <results.json>
//
// COMMITTED BEFORE IT IS RUN, and not edited after. Reads the universe and the twin-reader W files, writes only --out. No model.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax, makeSpan, quoteOf, parseAddress } from "../../organs/pinax.js";
import { readCorpus } from "../../organs/callimachus.js";
import { candidatesOf, witnesses, scoreWith } from "../../organs/answer-ladder.js";
import { questionVoid } from "../../organs/question-void.js";
import { spansFromRecord, arrangementOf, foldGrain } from "../../organs/grain.js";
import { execSync } from "node:child_process";
import { writeFileSync as wf, rmSync } from "node:fs";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const UNIVERSE = opt("--universe") && resolve(opt("--universe"));
const WHOM = opt("--whom") && resolve(opt("--whom"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!UNIVERSE || !WHOM || !OUT) { console.error("usage: grain-held-claim-replay.mjs --universe <dir> --whom <dir> --out <results.json>"); process.exit(2); }
const ASK = "When did the House pass the Sunshine Protection Act?";
const SEEDS = Array.from({ length: 19 }, (_, i) => 301 + i);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const log = (...m) => console.error(new Date().toISOString().slice(11, 19), ...m);

// ---- the universe, replayed from its pinned layers (as grain-arms.mjs) ---------------------------------------------------------------
const EXTRACTOR = { name: "web.js#extractReadable", sha256: sha(readFileSync(join(here, "../../organs/web.js"))) };
const prior = JSON.parse(readFileSync(join(UNIVERSE, "record.json"), "utf8"));
const store = {};
const records = [];
for (const s of prior.sources) {
  const raw = readFileSync(join(UNIVERSE, "layers", `${s.id}.raw`));
  const text = readFileSync(join(UNIVERSE, "layers", `${s.id}.txt`), "utf8");
  const rec = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, fetch: s.fetch, raw: new Uint8Array(raw), text, extractor: EXTRACTOR });
  if (rec.entry.id !== s.id || rec.entry.text.sha256 !== s.text.sha256) { console.error(`replay: ${s.id} does not reproduce from its layers`); process.exit(3); }
  rec.declared = s.declared;
  store[rec.entry.id] = rec;
  records.push(rec);
}
const slice = async (address) => {
  const p = parseAddress(address);
  const rec = store[p.pinax];
  if (!rec) return null;
  const sp = await makeSpan(rec, p.layer, p.start, p.end);
  if (sp.ok === false) return null;
  const q = await quoteOf(sp, rec);
  return q.ok ? q.text : null;
};
const record = readCorpus(records, { question: prior.question, absences: prior.absences ?? [] });
const verdicts = { ...(prior.fixity ?? {}) };
const qg = (await import("../../adapters/text/question-grammar.en.js")).default;
const model = loadModel(JSON.parse(readFileSync(join(here, "../../priors/parser-eng-ewt.json"), "utf8")));
const qv = questionVoid(qg.readQuestion(ASK, { model }), record);
const cands = candidatesOf(record, verdicts);
const p1 = scoreWith(witnesses(cands, { question: qv, record }), ["perception"], cands.length);
const activation = new Map(cands.map((a, i) => [a.id, p1.s[i]]));
const region = (await spansFromRecord(record, { slice, activation })).filter((s) => s.activation > 0).sort((a, b) => b.activation - a.activation);
const regionKeys = new Set(region.map((s) => arrangementOf(s)).filter(Boolean));
log(`region: ${region.length} spans, ${regionKeys.size} distinct arrangements`);


// ---- the baseline: grain.js at 4050e1c7, imported from git at run time, same ladder, same arms ------------------------------------
const orgDir = join(here, "../../organs");
const baselinePath = join(orgDir, ".grain-baseline-4050e1c7.js");
wf(baselinePath, execSync("git show 4050e1c7:native/organs/grain.js", { cwd: here, maxBuffer: 1 << 26 }).toString());
const baseline = await import(baselinePath);
rmSync(baselinePath, { force: true });

const REG = { verbs: new Set(record.vocab) };
const blocksOf = (text) => text.split(/\n\s*\n/).map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
let pinN = 0;
async function wSpansOf(blocks) {
  const text = blocks.join("\n\n") + "\n";
  const rec = await makePinax({ url: `held-claim:${pinN++}`, raw: new Uint8Array(Buffer.from(text, "utf8")), text, extractor: { name: "grain-held-claim replay: local text" } });
  store[rec.entry.id] = rec;
  const r = readCorpus([rec], { question: "", received: REG });
  return spansFromRecord(r, { slice, side: "W" });
}
const arms = {
  void: [],
  dense: await wSpansOf(blocksOf(readFileSync(join(WHOM, "dense", "thread.md"), "utf8"))),
  B: await wSpansOf(blocksOf(readFileSync(join(WHOM, "B", "thread.md"), "utf8"))),
  shown: await wSpansOf(region.map((s) => s.text.replace(/\s+/g, " ").trim())),
};
for (let i = 1; i <= 19; i++) arms[`null-${i}`] = await wSpansOf(blocksOf(readFileSync(join(WHOM, `null-${i}`, "thread.md"), "utf8")));
const itemsOf = (f) => JSON.stringify(f.modes.map((x) => x.items.map((it) => (it.spans ?? []).join("|"))));
const nul = (f) => ({ H: f.distance.held, A: f.distance.absent, mean: f.distance.null.mean, exceeded: f.distance.null.exceeded, permutations: f.distance.null.permutations, p: f.distance.null.p, real: f.distance.null.real });
const rows = {};
for (const [name, whom] of Object.entries(arms)) {
  const b = baseline.foldGrain({ region, whom });
  const a = foldGrain({ region, whom, held: "arrangement" });
  const c = foldGrain({ region, whom, held: "claim" });
  const hB = new Set(region.filter((u) => whom.some((w) => arrangementOf(w) === arrangementOf(u) && arrangementOf(u))).map((u) => u.address));
  const related = new Set((c.related ?? []).map((r) => r.address));
  const claimH = new Set(region.filter((u) => hB.has(u.address) && !related.has(u.address)).map((u) => u.address));
  rows[name] = {
    equalToBaseline: b.grain === a.grain && b.distance.held === a.distance.held && b.distance.absent === a.distance.absent && b.distance.null.p === a.distance.null.p && itemsOf(b) === itemsOf(a),
    claimSubsetOfArrangement: [...claimH].every((x) => hB.has(x)),
    leftHAreRelated: [...hB].filter((x) => !claimH.has(x)).every((x) => related.has(x)),
    related: related.size, kinds: (c.related ?? []).reduce((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {}),
    grain: { baseline: b.grain, arrangement: a.grain, claim: c.grain }, arrangement: nul(a), claim: nul(c),
  };
}
const all = Object.values(rows);
const out = {
  ladder: { khoraHead: execSync("git rev-parse HEAD", { cwd: here }).toString().trim(), baselineGrain: "4050e1c7", region: region.length, note: "permanent-dst House ask at the current ladder (b733f9af and later: 51 touched spans, not 92; L48)" },
  H8: { arms: all.length, equalToBaseline: all.filter((r) => r.equalToBaseline).length, claimSubset: all.filter((r) => r.claimSubsetOfArrangement).length, leftHAreRelated: all.filter((r) => r.leftHAreRelated).length, holds: all.every((r) => r.equalToBaseline && r.claimSubsetOfArrangement && r.leftHAreRelated) },
  reported: { relatedTotal: all.reduce((a, r) => a + r.related, 0), armsWithRelated: all.filter((r) => r.related > 0).map((r, i) => Object.keys(rows)[all.indexOf(r)]), grainChangedByClaim: Object.entries(rows).filter(([, r]) => r.grain.arrangement !== r.grain.claim).map(([k, r]) => [k, r.grain.arrangement, r.grain.claim]) },
  rows,
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
log("wrote", OUT);
console.log(JSON.stringify({ ladder: out.ladder, H8: out.H8, reported: out.reported, dense: rows.dense, B: rows.B, shown: rows.shown }, null, 1));
