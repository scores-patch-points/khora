// opencode-residue.mjs — THE RESIDUE LEDGER: what share of what the window says is still the model's own.
//
// The end goal reads "the model spent last on a shrinking residue". The residue is measurable only if every answer
// sentence is on the record as FACING an addressed source or MARKED as the model's own. The door already types each
// sentence of an answer (opencode-finish.mjs profileOf: grounded | self:model | contradicted | unsupported |
// argument | unchecked) for the window's facing page, and until now that typing was shown and thrown away. Here it is
// written to the task's EOT log as one RESIDUE event per answer (counts + one row per sentence: a content hash, its
// standing, the address it rests on), and the ledger below is a pure projection of those events: per answer, per
// task, and across tasks, the marked share with its counts and whether it fell between consecutive answers on the
// same ask. Nothing here decides anything; a sentence's standing is the profile's, and the ledger only counts.
//
//   node opencode-residue.mjs                 every task's ledger
//   node opencode-residue.mjs <task>          one task, answer by answer
//   node opencode-residue.mjs --json [task]   the same as JSON
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as EOT from "./opencode-eot.mjs";

export const RESIDUE_OP = "RESIDUE";
export const RESIDUE_SCHEMA = "Residue@1";

const sha = (s) => crypto.createHash("sha256").update(String(s ?? "")).digest("hex").slice(0, 16);
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** A sentence's bucket: FACING rests on an addressed record; MARKED is the model's own (named as such, or nothing read
 *  states it); CONTRADICTED faces a record that says otherwise; headings and bare citations are not sentences. */
export function bucketOf(standing) {
  const s = String(standing ?? "").toLowerCase();
  if (s === "grounded" || s === "supported" || s === "material") return "facing";
  if (s === "contradicted" || s === "refuted") return "contradicted";
  if (s === "heading" || s === "citation" || s === "symbol") return null;
  return "marked"; // self:model, unsupported, argument, unchecked, and anything the profile did not type
}

/** The address a claim rests on, when the profile gave one: a byte ref, a source name or url, or a fact. */
const addressOf = (c) => {
  if (!c || typeof c !== "object") return null;
  if (typeof c.ref === "string" && c.ref) return c.ref;
  const src = Array.isArray(c.sources) ? c.sources.find((s) => s && (s.url || s.source || s.name)) : null;
  if (src) return String(src.url ?? src.source ?? src.name);
  if (c.evidence && typeof c.evidence === "object") return String(c.evidence.url ?? c.evidence.source ?? "") || null;
  if (typeof c.fact === "string" && c.fact) return `fact:${sha(c.fact)}`;
  return null;
};

/** The residue of one answer from the profile's claims: counts and one row per sentence. */
export function residueOf(claims = []) {
  const rows = [];
  for (const c of Array.isArray(claims) ? claims : []) {
    const text = clean(typeof c === "string" ? c : c?.text);
    if (!text) continue;
    const bucket = bucketOf(typeof c === "string" ? null : c?.standing);
    if (!bucket) continue;
    rows.push({ sha: sha(text), words: text.split(" ").length, standing: String(c?.standing ?? "untyped"), bucket, at: bucket === "marked" ? null : addressOf(c) });
  }
  const counts = { sentences: rows.length, facing: 0, marked: 0, contradicted: 0 };
  for (const r of rows) counts[r.bucket]++;
  const share = counts.sentences ? counts.marked / counts.sentences : null;
  return { schema: RESIDUE_SCHEMA, counts, share, rows };
}

/** Write one answer's residue to the task's log. Returns the append result; never throws. */
export function recordResidue({ task, agent, universe, ask = "", claims = [], now = Date.now() } = {}) {
  try {
    const r = residueOf(claims);
    if (!r.counts.sentences) return { ok: false, gap: "no-sentences" };
    const detail = { op: RESIDUE_OP, by: "khora:opencode-residue.recordResidue", schema: RESIDUE_SCHEMA, ask: sha(clean(ask)), counts: r.counts, share: r.share, rows: r.rows.slice(0, 400) };
    return EOT.append({ task, agent, stage: "reason", universe, detail, now });
  } catch (e) {
    return { ok: false, gap: String(e?.message ?? e) };
  }
}

const whenOf = (e) => Number(e?.ts ?? e?.now ?? e?.when ?? 0) || 0;
// the same answer grounded twice (the window re-grounds a text it re-sends) is one answer: same ask, same sentence hashes, inside a window
const DUP_MS = 10 * 60_000;
const sameAnswer = (a, b) => a && b && a.ask === b.ask && b.when - a.when < DUP_MS && a.rows.length === b.rows.length && a.rows.every((r, i) => r.sha === b.rows[i].sha);

/** The ledger of one task: every RESIDUE event in log order, with the marked share, and for consecutive answers to the
 *  same ask whether the share fell. */
export function residueLedger({ task } = {}) {
  let events = [];
  try { events = EOT.read(task)?.events ?? []; } catch { events = []; }
  const answers = events
    .filter((e) => e?.detail?.op === RESIDUE_OP && e.detail.counts)
    .map((e) => ({ id: e.event_id ?? null, when: whenOf(e), agent: e.agent ?? null, ask: e.detail.ask ?? null, counts: e.detail.counts, share: e.detail.share ?? (e.detail.counts.sentences ? e.detail.counts.marked / e.detail.counts.sentences : null), rows: e.detail.rows ?? [] }))
    .sort((a, b) => a.when - b.when)
    .filter((a, i, arr) => !(i > 0 && sameAnswer(arr[i - 1], a)));
  const lastByAsk = new Map();
  for (const a of answers) {
    const prev = lastByAsk.get(a.ask);
    a.fell = prev && prev.share != null && a.share != null ? a.share < prev.share : null;
    a.previousShare = prev?.share ?? null;
    lastByAsk.set(a.ask, a);
  }
  const total = answers.reduce((acc, a) => { for (const k of ["sentences", "facing", "marked", "contradicted"]) acc[k] += a.counts[k] ?? 0; return acc; }, { sentences: 0, facing: 0, marked: 0, contradicted: 0 });
  const unclassed = answers.reduce((n, a) => n + Math.max(0, (a.counts.sentences ?? 0) - ((a.counts.facing ?? 0) + (a.counts.marked ?? 0) + (a.counts.contradicted ?? 0))), 0);
  const first = answers[0]?.share ?? null, last = answers.at(-1)?.share ?? null;
  return { task, answers: answers.length, total, share: total.sentences ? total.marked / total.sentences : null, unclassed, first, last, shrinking: first != null && last != null && answers.length > 1 ? last < first : null, runs: answers };
}

/** A LONGFORM job's ledger from its section grades (opencode-longform.mjs records one longform-section event per round): the
 *  accepted round of each section counts, supported sentences FACING their material, the rest MARKED; a freeform section was never
 *  judged, so every sentence of it is the model's own. */
export function longformLedger({ task } = {}) {
  let events = [];
  try { events = EOT.read(task)?.events ?? []; } catch { events = []; }
  const secs = events.filter((e) => e?.detail?.kind === "longform-section").map((e) => ({ id: e.event_id ?? null, when: whenOf(e), ...e.detail }));
  const last = new Map();
  for (const x of secs) if (x.accepted || !last.has(x.section)) last.set(x.section, x); // the accepted round stands; else the last attempt
  const runs = [...last.values()].sort((a, b) => a.when - b.when).map((x) => { const n = Number(x.sentences) || 0, sup = x.freeform ? 0 : Math.min(n, Number(x.supported) || 0); return { id: x.id ?? null, when: x.when, agent: "longform", ask: `${task}:${x.section}`, section: x.section, freeform: !!x.freeform, stitched: !!x.stitched, admit: /#admit/.test(String(x.section)), counts: { sentences: n, facing: sup, marked: n - sup, contradicted: 0 }, share: n ? (n - sup) / n : null, rows: [], fell: null, previousShare: null }; });
  const total = runs.reduce((acc, a) => { for (const k of ["sentences", "facing", "marked", "contradicted"]) acc[k] += a.counts[k]; return acc; }, { sentences: 0, facing: 0, marked: 0, contradicted: 0 });
  return { task, kind: "longform", freeform: runs.length > 0 && runs.every((r) => r.freeform), answers: runs.length, total, share: total.sentences ? total.marked / total.sentences : null, unclassed: 0, first: runs[0]?.share ?? null, last: runs.at(-1)?.share ?? null, shrinking: null, runs };
}

/** Every task under the worknotes root that has a RESIDUE event, and every longform job with graded sections. */
export function residueAcross({ root = process.env.FOLD_WORKNOTES_DIR ?? path.join(process.env.HOME ?? "", ".fold", "worknotes") } = {}) {
  let tasks = [];
  try { tasks = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, "eot"))).map((d) => d.name); } catch { tasks = []; }
  const ledgers = tasks.map((t) => (t.startsWith("longform-") ? longformLedger({ task: t }) : residueLedger({ task: t }))).filter((l) => l.answers > 0);
  const total = ledgers.reduce((acc, l) => { for (const k of ["sentences", "facing", "marked", "contradicted"]) acc[k] += l.total[k]; return acc; }, { sentences: 0, facing: 0, marked: 0, contradicted: 0 });
  return { schema: RESIDUE_SCHEMA, tasks: ledgers.length, answers: ledgers.reduce((n, l) => n + l.answers, 0), total, share: total.sentences ? total.marked / total.sentences : null, unclassed: ledgers.reduce((n, l) => n + l.unclassed, 0), ledgers: ledgers.sort((a, b) => (b.runs.at(-1)?.when ?? 0) - (a.runs.at(-1)?.when ?? 0)) };
}

const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(0)}%`);
export function renderLedger(l) {
  const lines = [`residue · ${l.task ?? "all tasks"} · ${l.answers} answer(s) · ${l.total.sentences} sentences · facing ${l.total.facing} · marked ${l.total.marked} · contradicted ${l.total.contradicted} · marked share ${pct(l.share)}${l.unclassed ? ` · UNCLASSED ${l.unclassed}` : ""}`];
  for (const r of l.runs ?? []) lines.push(`  ${new Date(r.when).toISOString().slice(0, 19)} ${String(r.agent ?? "").slice(0, 14).padEnd(14)} ask ${r.ask ?? "-"} · ${r.counts.sentences} sentences · marked ${pct(r.share)}${r.fell == null ? "" : r.fell ? " ↓ fell" : " ↑ did not fall"}`);
  if (l.ledgers) for (const t of l.ledgers) lines.push(`  ${t.task.slice(0, 40).padEnd(40)} ${String(t.answers).padStart(3)} ${t.kind === "longform" ? "sections" : "answers "} · marked ${pct(t.share)}${t.freeform ? " · freeform, unjudged" : ""}${t.shrinking == null ? "" : t.shrinking ? " · shrinking" : " · not shrinking"}`);
  return lines.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const task = args.find((a) => !a.startsWith("--"));
  const l = task ? (task.startsWith("longform-") ? longformLedger({ task }) : residueLedger({ task })) : residueAcross({});
  console.log(json ? JSON.stringify(l, null, 1) : renderLedger(l));
}
