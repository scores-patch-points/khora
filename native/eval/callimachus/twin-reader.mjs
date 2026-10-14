#!/usr/bin/env node
// eval/callimachus/twin-reader.mjs — the twin-reader experiment, exactly as pre-registered in TWIN-READER-PREREG.md (committed first).
//
//   node native/eval/callimachus/twin-reader.mjs --universe <pinned run dir> --base <khora checkout at 3b084a80 + replay hunk> --out <dir>
//
// Every arm is a `callimachus-run.mjs --replay` over its own copy of the pinned universe. W files are written under --out (local only,
// never committed: the results carry their sha256s, not their bytes). No model anywhere.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const UNIVERSE = resolve(opt("--universe"));
const BASE = resolve(opt("--base"));
const OUT = resolve(opt("--out"));
const RUNNER = join(here, "../../scripts/callimachus-run.mjs");
const QUESTION = JSON.parse(readFileSync(join(UNIVERSE, "record.json"), "utf8")).question;
const ASK = "When did the House pass the Sunshine Protection Act?";
const TURN = "What did the House and the Senate do on the Sunshine Protection Act?";
const REGRESSION_ASKS = ["Should the United States make daylight saving time permanent?", "Who opposes permanent daylight saving time?", ASK, "Did the Senate pass the bill?", "¿Quién se opone al horario de verano permanente?"];
const NULL_DRAWS = 19;
mkdirSync(OUT, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const draw = (pool, k, seed) => { const rnd = mulberry(seed); const c = pool.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c.slice(0, k); };

/** One arm: a fresh copy of the universe, one replay. Returns the parsed outputs. */
function arm(name, { runner = RUNNER, asks = [ASK], langs = "en", whom = undefined } = {}) {
  const dir = join(OUT, "arms", name);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(UNIVERSE, "layers"), join(dir, "layers"), { recursive: true });
  cpSync(join(UNIVERSE, "record.json"), join(dir, "record.json"));
  const argv = [runner, "--question", QUESTION, "--replay", "--lang", langs, "--out", dir, ...asks.flatMap((a) => ["--ask", a]), ...(whom !== undefined ? ["--whom", whom] : [])];
  execFileSync(process.execPath, argv, { stdio: ["ignore", "ignore", "ignore"], maxBuffer: 1 << 28 });
  const rd = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f)) : null);
  return { dir, rd, answers: JSON.parse(rd("answers.json")), folds: rd("folds.json") ? JSON.parse(rd("folds.json")) : null, telling: JSON.parse(rd("telling.addressed.json")) };
}
/** W as a file of blank-line-separated blocks. */
function whomFile(name, blocks) {
  const dir = join(OUT, "whom", name);
  mkdirSync(dir, { recursive: true });
  const text = blocks.map((b) => String(b).replace(/\n\s*\n/g, "\n")).join("\n\n") + "\n";
  writeFileSync(join(dir, "thread.md"), text);
  return { path: dir, sha256: sha(text), blocks: blocks.length };
}
const S = (a) => new Set(a.folds[0].crease.copied);
const d = (x, y) => { const A = S(x), B = S(y); const inter = [...A].filter((v) => B.has(v)).length; const uni = new Set([...A, ...B]).size; return uni ? 1 - inter / uni : 0; };
const stages = (a) => a.answers[0].stages.slice(0, 3);
const leadText = (a, i = 0) => stages(a)[i]?.text?.[0] ?? null;
const log = (...m) => console.error(new Date().toISOString().slice(11, 19), ...m);
const results = { prereg: "native/eval/callimachus/TWIN-READER-PREREG.md", universe: UNIVERSE, question: QUESTION, ask: ASK, arms: {}, predictions: {} };

// ---- P4: W = ∅ reproduces today's output byte for byte (all five registered asks, en + es) ----------------------------------------
log("P4 base");
const FILES = ["answers.json", "answers.md", "telling.txt", "telling.md", "claim-sheet.md", "dossier.md", "telling.es.txt", "telling.es.md"];
const base = arm("p4-base", { runner: join(BASE, "native/scripts/callimachus-run.mjs"), asks: REGRESSION_ASKS, langs: "en,es" });
log("P4 branch, no --whom");
const noWhom = arm("p4-void-nowhom", { asks: REGRESSION_ASKS, langs: "en,es" });
mkdirSync(join(OUT, "whom", "empty"), { recursive: true });
log("P4 branch, --whom <empty dir>");
const emptyWhom = arm("p4-void-emptydir", { asks: REGRESSION_ASKS, langs: "en,es", whom: join(OUT, "whom", "empty") });
const cmp = (x) => Object.fromEntries(FILES.map((f) => [f, { same: Buffer.compare(base.rd(f), x.rd(f)) === 0, base: sha(base.rd(f)).slice(0, 12), arm: sha(x.rd(f)).slice(0, 12) }]));
results.predictions.P4 = { noWhom: cmp(noWhom), emptyDir: cmp(emptyWhom) };
results.predictions.P4.holds = [...Object.values(results.predictions.P4.noWhom), ...Object.values(results.predictions.P4.emptyDir)].every((c) => c.same);
results.seams_void_all_asks = noWhom.folds.map((f) => ({ ask: f.ask, lang: f.lang, seams: f.seams }));

// ---- the void reader on the experiment's ask --------------------------------------------------------------------------------------
log("void");
const voidArm = arm("void");
const cands = voidArm.folds[0].candidates;
const hs = cands.filter((c) => /\b(House|Senate)\b/.test(c.sentence ?? ""));
log(`candidates ${cands.length}, House/Senate ${hs.length}`);

// ---- the dense reader (twice: P7) ------------------------------------------------------------------------------------------------
const Wd = whomFile("dense", [TURN, ...hs.map((c) => c.sentence)]);
log("dense ×2");
const dense = arm("dense", { whom: Wd.path });
const dense2 = arm("dense-again", { whom: Wd.path });

// ---- null: re-dealt spans ---------------------------------------------------------------------------------------------------------
const nulls = [];
for (let k = 1; k <= NULL_DRAWS; k++) {
  const W = whomFile(`null-${k}`, [TURN, ...draw(cands, hs.length, k).map((c) => c.sentence)]);
  log(`null ${k}`);
  const a = arm(`null-${k}`, { whom: W.path });
  nulls.push({ seed: k, d: d(a, voidArm), lead: stages(a).map((s) => s.lead?.atom ?? null), sha256: W.sha256 });
}

// ---- the third arm: B reads A's fold, asks again ----------------------------------------------------------------------------------
const foldText = (a) => stages(a).flatMap((s) => s.text);
const Wb = whomFile("B", foldText(voidArm));
log("B");
const B = arm("B", { whom: Wb.path });
const bnulls = [];
for (let k = 101; k < 101 + NULL_DRAWS; k++) {
  const W = whomFile(`bnull-${k}`, draw(cands, Wb.blocks, k).map((c) => c.sentence));
  log(`B-null ${k}`);
  const a = arm(`bnull-${k}`, { whom: W.path });
  bnulls.push({ seed: k, d: d(a, voidArm), sha256: W.sha256 });
}

// ---- reported: C reads B's fold, D reads C's, … until the fold stops moving (a repeat) or nothing answers ------------------------
const chain = [{ reader: "A (void)", lead: stages(voidArm)[0].lead?.atom ?? null, corner: stages(voidArm)[0].corner?.says, line: leadText(voidArm) }, { reader: "B", lead: stages(B)[0].lead?.atom ?? null, corner: stages(B)[0].corner?.says, line: leadText(B) }];
const seen = [JSON.stringify(voidArm.folds[0].crease), JSON.stringify(B.folds[0].crease)];
let prev = B;
for (let step = 0; step < 20; step++) {
  const name = String.fromCharCode(67 + step);
  const W = whomFile(`chain-${name}`, foldText(prev));
  log(`chain ${name}`);
  const a = arm(`chain-${name}`, { whom: W.path });
  const key = JSON.stringify(a.folds[0].crease);
  chain.push({ reader: name, lead: stages(a)[0].lead?.atom ?? null, corner: stages(a)[0].corner?.says, line: leadText(a), repeats: seen.indexOf(key) });
  if (seen.includes(key) || !stages(a)[0].lead) break;
  seen.push(key); prev = a;
}
results.chain = chain;

// ---- the predictions ------------------------------------------------------------------------------------------------------------
const textOf = (a) => JSON.stringify(stages(a).map((s) => s.text));
results.predictions.P1 = { holds: textOf(dense) !== textOf(voidArm) };
const heldAtoms = new Set(dense.folds[0].reader?.held.map((h) => h.atom) ?? []);
const denseLeads = stages(dense).map((s) => s.lead?.atom ?? null);
results.predictions.P2 = { leads: denseLeads, heldByW: denseLeads.map((x) => heldAtoms.has(x)), holds: denseLeads.every((x) => x && !heldAtoms.has(x)) };
const w1 = stages(dense)[0].lead?.witnesses ?? {};
const content = ["anchor", "actor", "relation", "words"].some((k) => w1[`perception.${k}`]);
results.predictions.P2b = { witnesses: w1, content, admits: !!w1["perception.admits"], corner: stages(dense)[0].corner?.says, holds: content && !!w1["perception.admits"] && stages(dense)[0].corner?.says !== "neither" };
const cellOf = (a) => new Map(a.telling.sentences.map((s) => [s.text, s.cell]));
const structural = (a) => { const cells = cellOf(voidArm); const t = stages(a)[2].text; const st = t.filter((x) => /·(Ground|Pattern)$/.test(cells.get(x) ?? "")); return { sentences: t.length, structural: st.length, share: t.length ? +(st.length / t.length).toFixed(3) : 0 }; };
results.predictions.P3 = { void: structural(voidArm), dense: structural(dense) };
results.predictions.P3.holds = results.predictions.P3.void.share > results.predictions.P3.dense.share;
const dDense = d(dense, voidArm);
results.predictions.P5 = { d: +dDense.toFixed(4), nullMax: +Math.max(...nulls.map((n) => n.d)).toFixed(4), nulls: nulls.map((n) => +n.d.toFixed(4)), beats: nulls.filter((n) => dDense > n.d).length, of: nulls.length, holds: nulls.every((n) => dDense > n.d) };
const voidQuoted = new Set(stages(voidArm).flatMap((s) => s.segments.flat().filter((x) => x.address).map((x) => x.address)));
const atomSpan = new Map(JSON.parse(readFileSync(join(voidArm.dir, "record.json"), "utf8")).atoms.map((a) => [a.id, a.span]));
const bLead = stages(B)[0].lead?.atom ?? null;
const dB = d(B, voidArm);
// "Quoted in A": a copied segment of A's fold overlaps the lead atom's bytes (same page layer, intersecting byte range).
const rng = (addr) => { const m = String(addr).match(/^(.*)#b(\d+)-(\d+)$/); return m ? { k: m[1], s: +m[2], e: +m[3] } : null; };
const overlaps = (x, y) => { const a = rng(x), b = rng(y); return !!a && !!b && a.k === b.k && a.s < b.e && b.s < a.e; };
results.predictions.P6 = { differs: textOf(B) !== textOf(voidArm), bLead, bLeadQuotedInA: bLead ? [...voidQuoted].some((q) => overlaps(q, atomSpan.get(bLead))) : null, d: +dB.toFixed(4), nullMax: +Math.max(...bnulls.map((n) => n.d)).toFixed(4), nulls: bnulls.map((n) => +n.d.toFixed(4)), beats: bnulls.filter((n) => dB > n.d).length, of: bnulls.length };
results.predictions.P6.holds = results.predictions.P6.differs && results.predictions.P6.bLeadQuotedInA === false && results.predictions.P6.beats === bnulls.length;
results.predictions.P7 = { answers: Buffer.compare(dense.rd("answers.json"), dense2.rd("answers.json")) === 0, folds: Buffer.compare(dense.rd("folds.json"), dense2.rd("folds.json")) === 0 };
results.predictions.P7.holds = results.predictions.P7.answers && results.predictions.P7.folds;

// ---- reported, not predicted ----------------------------------------------------------------------------------------------------
const summary = (a) => ({ population: a.folds[0].reader?.population ?? { record: cands.length, reader: cands.length }, held: a.folds[0].reader?.held.length ?? 0, dmd: a.folds[0].dmd ? { window: a.folds[0].dmd.window, of: a.folds[0].reader.units, tried: a.folds[0].dmd.tried } : null, seams: a.folds[0].seams, stages: stages(a).map((s) => ({ size: s.size, corner: s.corner?.says, contest: s.contest?.verdict, lead: s.lead?.atom ?? null, witnesses: s.lead?.witnesses, text: s.text })) });
results.arms = { void: summary(voidArm), dense: { whom: { sha256: Wd.sha256, blocks: Wd.blocks }, ...summary(dense) }, B: { whom: { sha256: Wb.sha256, blocks: Wb.blocks }, ...summary(B) } };
results.counts = { candidates: cands.length, houseSenate: hs.length };
writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(results.predictions).map(([k, v]) => [k, v.holds])), null, 1));
