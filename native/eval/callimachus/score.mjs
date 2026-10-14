#!/usr/bin/env node
// score.mjs — score one drive run against the pre-registered rules (PREREG.md "What counts"). Pure: reads the pinned run directory only.
//
//   node native/eval/callimachus/score.mjs --run A [--root DIR] [--against B]   → results.<run>.json (+ agreement with --against)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const run = opt("--run") ?? "A";
const against = opt("--against");
const root = resolve(opt("--root") ?? "/Users/mlacy/Documents/3.0/callimachus-runs/drive-eval-2026-10-14");
const promptsFile = opt("--prompts") ?? "prompts.json";
const { prompts } = JSON.parse(readFileSync(join(here, promptsFile), "utf8"));
const { rows: baseline } = JSON.parse(readFileSync(join(here, "baseline-run3.json"), "utf8"));
const ARMS = ["line", "paragraph", "brief"];
const CATS = ["compute", "slot", "holder", "compound", "followup", "multilingual"];

// The language the question is asked in, and the question grammar the runner read it with (declared --qlang, else the runner's sniff).
const ML = { "multilingual#0": "es", "multilingual#1": "fr", "multilingual#2": "de", "multilingual#3": "ru", "multilingual#4": "zh", "multilingual#5": "it" };
const langOf = (p) => ML[p.id] ?? (promptsFile.includes(".es.") ? "es" : "en");
const grammarOf = (p) => opt("--qlang") ?? (/^[¿¡]|[áéíóúñ]/i.test(p.turns.at(-1)) ? "es" : "en");
const srcText = (segs) => (segs ?? []).filter((g) => g.kind === "source").map((g) => g.text).join(" ");

export function scorePrompt(p, dir) {
  const re = new RegExp(p.gold, "i");
  const recFile = join(dir, "record.json"), ansFile = join(dir, "answers.replay1.json");
  if (!existsSync(recFile) || !existsSync(ansFile)) {
    const refusal = { type: "run_error", detail: existsSync(recFile) ? "replay did not finish" : "collection did not finish" };
    return { id: p.id, category: p.category, lang: langOf(p), grammar: grammarOf(p), sources: 0, arms: Object.fromEntries(ARMS.map((a) => [a, { committed: false, correct: false, wrong: false, visible: false, lenient: false, refusal }])) };
  }
  const rec = JSON.parse(readFileSync(recFile, "utf8"));
  const ladder = JSON.parse(readFileSync(ansFile, "utf8")).find((l) => l.ask === p.turns.at(-1)) ?? null;
  const sources = rec.sources?.length ?? 0;
  const absences = (rec.absences ?? []).reduce((m, a) => ((m[a.type] = (m[a.type] ?? 0) + 1), m), {});
  const st2 = ladder?.stages.find((s) => s.stage === 2);
  const contest = st2?.contest?.verdict ?? null;
  const arms = {};
  for (const [k, arm] of ARMS.entries()) {
    const st = ladder?.stages.find((s) => s.stage === k + 1);
    const leadText = st?.text?.[0] ?? "";
    const leadSrc = srcText(st?.segments?.[0]);
    const anySrc = (st?.segments ?? []).map(srcText).join(" ");
    let refusal = null;
    if (!sources) refusal = { type: "collection_empty", detail: absences };
    else if (!ladder || !st) refusal = { type: "run_error", detail: "no ladder for the ask" };
    else if (st.verdict === "below_floor" || contest === "below_floor") refusal = { type: "below_floor" };
    else if (!st.lead) refusal = { type: "no_lawful_sentence" };
    else if (arm !== "line" && contest !== "bound") refusal = { type: `contest:${contest}` };
    const committed = !refusal;
    const correct = committed && re.test(leadSrc);
    // Seam density (Amendment 1): the stage's words by segment kind — copied source bytes, computed values, frame words, self:model.
    const seams = {};
    for (const sent of st?.segments ?? []) for (const g of sent) { const k = g.kind === "model" || g.kind === "self:model" ? "self:model" : g.kind; seams[k] = (seams[k] ?? 0) + (String(g.text).match(/[\p{L}\p{M}]+|\p{N}+/gu) ?? []).length; }
    arms[arm] = {
      committed, correct, wrong: committed && !correct, refusal, seams,
      visible: re.test(anySrc), lenient: committed && re.test(leadText),
      lead: leadText.slice(0, 400), witnesses: st?.lead?.witnesses ?? null,
    };
  }
  const tj = existsSync(join(dir, "telling.json")) ? JSON.parse(readFileSync(join(dir, "telling.json"), "utf8")).measures : null;
  const frac = (x) => (typeof x === "string" && /^\d+\/\d+$/.test(x) ? x.split("/").map(Number) : null);
  const telling = tj ? { lawful: frac(tj.lawful), verified: frac(tj.source_segments_verified) } : null;
  return { id: p.id, category: p.category, lang: langOf(p), grammar: grammarOf(p), sources, absences, telling, candidates: ladder?.candidates ?? 0, reading: ladder?.question ?? null, contest, margin: st2?.contest?.margin ?? null, bar: st2?.contest?.bar ?? null, arms };
}

const rows = prompts.map((p) => scorePrompt(p, join(root, run, p.id.replace("#", "-"))));
const tally = (rs, arm) => {
  const t = { n: rs.length, committed: 0, correct: 0, wrong: 0, visible: 0, lenient: 0, refusals: {} };
  t.seams = {}; t.seamShareMean = {}; t.belowFloor = 0;
  const shares = [];
  for (const r of rs) {
    const a = r.arms[arm]; const sm = a.seams ?? {}; const tot = Object.values(sm).reduce((x, y) => x + y, 0);
    for (const [k, v] of Object.entries(sm)) t.seams[k] = (t.seams[k] ?? 0) + v;
    if (tot) shares.push(Object.fromEntries(Object.entries(sm).map(([k, v]) => [k, v / tot])));
    if (a.refusal?.type === "below_floor") t.belowFloor++;
  }
  for (const k of new Set(shares.flatMap((x) => Object.keys(x)))) t.seamShareMean[k] = +(shares.reduce((x, y) => x + (y[k] ?? 0), 0) / shares.length).toFixed(3);
  const tw = Object.values(t.seams).reduce((x, y) => x + y, 0);
  t.seamSharePooled = Object.fromEntries(Object.entries(t.seams).map(([k, v]) => [k, +(v / tw).toFixed(3)]));
  for (const r of rs) { const a = r.arms[arm]; t.committed += a.committed; t.correct += a.correct; t.wrong += a.wrong; t.visible += a.visible; t.lenient += a.lenient; if (a.refusal) t.refusals[a.refusal.type] = (t.refusals[a.refusal.type] ?? 0) + 1; }
  return t;
};
const baseCorrect = (rs) => rs.filter((r) => baseline[r.id]?.committed_correct).length;
const baseVisible = (rs) => rs.filter((r) => ["committed_correct", "gold_in_shown"].includes(baseline[r.id]?.verdict)).length;
const summary = {};
for (const arm of ARMS) {
  const all = tally(rows, arm);
  const vs = { win: [], loss: [], tie: 0 };
  for (const r of rows) { const b = !!baseline[r.id]?.committed_correct, a = r.arms[arm].correct; if (a && !b) vs.win.push(r.id); else if (b && !a) vs.loss.push(r.id); else vs.tie++; }
  summary[arm] = {
    ...all, B1: all.wrong === 0, B2: all.correct >= 10, pass: all.wrong === 0 && all.correct >= 10, withinNoise: Math.abs(all.correct - 9) <= 7, vs,
    byLanguage: Object.fromEntries([...new Set(rows.map((r) => r.lang))].map((l) => { const rs = rows.filter((r) => r.lang === l); return [l, { grammars: [...new Set(rs.map((r) => r.grammar))], ...tally(rs, arm) }]; })),
    byCategory: Object.fromEntries(CATS.filter((c) => rows.some((r) => r.category === c)).map((c) => { const rs = rows.filter((r) => r.category === c); return [c, { ...tally(rs, arm), baselineCorrect: baseCorrect(rs), baselineVisible: baseVisible(rs) }]; })),
  };
}
let agreement = null;
if (against) {
  const other = prompts.map((p) => scorePrompt(p, join(root, against, p.id.replace("#", "-"))));
  const key = (a) => (a.correct ? "correct" : a.wrong ? "wrong" : a.refusal?.type);
  agreement = Object.fromEntries(ARMS.map((arm) => [arm, rows.filter((r, i) => key(r.arms[arm]) === key(other[i].arms[arm])).length + "/" + rows.length]));
  agreement.other = Object.fromEntries(ARMS.map((arm) => { const t = tally(other, arm); return [arm, { correct: t.correct, wrong: t.wrong, committed: t.committed, visible: t.visible }]; }));
}
const pool = (k) => rows.reduce((a, r) => (r.telling?.[k] ? [a[0] + r.telling[k][0], a[1] + r.telling[k][1]] : a), [0, 0]);
const tellingPooled = { lawful: pool("lawful").join("/"), verified: pool("verified").join("/"), records: rows.filter((r) => r.telling).length };
const out = { run, prompts: promptsFile, scored: new Date().toISOString(), tellingPooled, baseline: promptsFile === "prompts.json" ? { correct: 9, visible: 29, wrong: 0, n: 48 } : null, summary, agreement, rows };
writeFileSync(join(here, `results.${run}.json`), JSON.stringify(out, null, 1));
console.log("telling", JSON.stringify(tellingPooled));
for (const arm of ARMS) { const s = summary[arm]; console.log(`${arm.padEnd(9)} committed ${s.committed}  correct ${s.correct}  WRONG ${s.wrong}  visible ${s.visible}  lenient ${s.lenient}  B1 ${s.B1} B2 ${s.B2}  refusals ${JSON.stringify(s.refusals)}  seams ${JSON.stringify(s.seamSharePooled)}`); }
if (agreement) console.log("agreement with", against, JSON.stringify(agreement));
