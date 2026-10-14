#!/usr/bin/env node
// cli/cennini-contract.mjs — THE EXPERIENCE OF AGENTIC MODE, AS A CONTRACT ON A RUN'S EVENTS (2026-10-13).
//
// FOLD-CONSTITUTION.md A3 canonizes how using the Fold's agent mode must feel (CENNINI.md, "The experience").
// VI.1 makes an amendment a changed failing test, so each mark is a judge over the event list a run really
// emits (the-fold/fold-chat-agent.js runAgent: the same list the feed renders live and replays after a reload).
// The judges are pure, call no model and write nothing.
//
// A mark is judged only on LIVE runs. A fixture proves a judge can FAIL; it never proves the product. Each judge
// is shipped with a known-bad trace it must reject and a good trace it must accept (II.10: has this check ever
// rejected anything?). A judge that rejected nothing, or accepted everything, makes its facet un-passable.
//
//   node cli/cennini-contract.mjs --runs FILE.jsonl     one run per line: {"run": id, "live": true|false, "events": [...]}
//   prints evidence rows (JSONL, for cli/cennini-evidence.jsonl) to stdout and a summary to stderr; writes nothing.
//
// THE EVENT SHAPE (fold-chat-agent.js, `ev`): { type, at, ...payload }. Types read here: start{task}, plan{steps},
// look{candidates,named,gaps,top}, act{round,pipeline}, acted{round,lane,model,escalated},
// check{round,ok}, escalate{why}, done{ok,exhausted?,findings?}, stopped{round}, error{message}.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const T = (e, t) => e && e.type === t;
const idx = (ev, t) => ev.findIndex((e) => T(e, t));
const OK = (why = "holds") => ({ ok: true, why });
const BAD = (why) => ({ ok: false, why });
const TERMINAL = new Set(["done", "stopped", "error"]);

export const JUDGES = {
  // 1. you start from the words you typed
  "ask-in-words": (ev) => {
    const s = ev.find((e) => T(e, "start"));
    return s && typeof s.task === "string" && s.task.trim() ? OK() : BAD("the run did not start from a free-text ask");
  },
  // 2. a plan is stated before anything is done
  "plan-first": (ev) => {
    const p = idx(ev, "plan"), a = idx(ev, "act");
    if (p < 0) return BAD("no plan was stated");
    if (!Array.isArray(ev[p].steps) || !ev[p].steps.length) return BAD("the plan has no steps");
    if (a >= 0 && a < p) return BAD("it acted before it stated its plan");
    return OK();
  },
  // 3. it looks at the MATERIAL before it touches. khora reading the ASK is not a look at the material: the only
  //    event that counts is `look` (organs/repo-look.js: ask-named files first, then ranked candidates with bytes),
  //    and a look that found nothing still counts, because it carries its typed gap.
  "looks-first": (ev) => {
    const a = idx(ev, "act");
    if (a < 0) return OK("it never acted");
    const looked = ev.slice(0, a).some((e) => T(e, "look") && Number.isInteger(e.candidates));
    return looked ? OK() : BAD("it acted without having looked at the material (reading the ask is not a look)");
  },
  // 4. the transcript says who made each step
  "says-who-made-it": (ev) => {
    const acted = ev.filter((e) => T(e, "acted"));
    if (!acted.length) return OK("it never acted");
    return acted.every((e) => typeof e.lane === "string" && e.lane) ? OK() : BAD("an act does not say which lane made it");
  },
  // 5. it re-reads what happened, never claims past what it observed, and says what it could not do
  "observes-and-stops-by-measure": (ev) => {
    const ends = ev.filter((e) => TERMINAL.has(e.type));
    if (ends.length !== 1) return BAD(`expected exactly one terminal event, saw ${ends.length}`);
    const end = ends[0];
    const acted = ev.filter((e) => T(e, "acted"));
    for (const a of acted) {
      if (!ev.some((e) => T(e, "check") && e.round === a.round)) return BAD(`round ${a.round} acted and was never observed`);
    }
    if (T(end, "done") && end.ok === true) {
      const last = acted.at(-1);
      const cs = last ? ev.filter((e) => T(e, "check") && e.round === last.round) : [];
      if (!cs.some((c) => c.ok === true)) return BAD("it claimed success with no passing check in its last round");
      if (cs.some((c) => c.ok === false)) return BAD("it claimed success over a check that failed");
    }
    if (T(end, "done") && end.ok !== true && !(Array.isArray(end.findings) && end.findings.length)) return BAD("it gave up without naming what it could not do");
    if (T(end, "error") && !(typeof end.message === "string" && end.message)) return BAD("it errored without saying why");
    return OK();
  },
  // 6. nothing left the machine in this run
  "stays-local": (ev) => {
    if (ev.some((e) => T(e, "escalate"))) return BAD("it escalated to a remote draw");
    if (ev.some((e) => T(e, "act") && e.pipeline === "remote")) return BAD("an act went to the remote pipeline");
    if (ev.some((e) => T(e, "acted") && e.escalated === true)) return BAD("an act was answered by an escalation");
    return OK();
  },
};

const GOOD = [
  { type: "start", task: "make the recall hook say a denied claim is denied" },
  { type: "plan", steps: ["read first", "change", "check"] },
  { type: "read", pipeline: "khora", referents: 3 },
  { type: "look", candidates: 5, named: 1, gaps: [] },
  { type: "round", round: 1, of: 3, repair: false },
  { type: "act", round: 1, pipeline: "penelope" },
  { type: "acted", round: 1, lane: "penelope-code-agent", model: null, escalated: false },
  { type: "observing", round: 1 },
  { type: "check", round: 1, name: "re-read", ok: true },
  { type: "done", ok: true, rounds: 1, passed: 1 },
];

export const KNOWN_BAD = {
  "ask-in-words": [{ type: "start", task: "  " }, ...GOOD.slice(1)],
  "plan-first": [GOOD[0], { type: "act", round: 1, pipeline: "penelope" }, GOOD[1], ...GOOD.slice(2).filter((e) => e.type !== "act")],
  // khora READ the ask but nothing LOOKED at the material: reading the ask must not pass
  "looks-first": GOOD.filter((e) => e.type !== "look"),
  "says-who-made-it": GOOD.map((e) => (e.type === "acted" ? { ...e, lane: null } : e)),
  "observes-and-stops-by-measure": GOOD.filter((e) => e.type !== "observing" && e.type !== "check"),
  "stays-local": [...GOOD.slice(0, 5), { type: "escalate", round: 1, why: "page", reason: "remote" }, ...GOOD.slice(5)],
};

export const MARKS = Object.keys(JUDGES);

/**
 * Events the judges READ that the Fold's agent loop does not emit yet, each with the reason (empty since 2026-10-13,
 * when runAgent gained its injected `look` stage and began emitting `look`). The contract test
 * (cli/tests/cennini-contract.test.mjs) asserts every other event is emitted by the loop's own source, and that a
 * PENDING event is NOT yet emitted, so this list cannot go stale: the day the loop starts emitting `look`, the test
 * fails until the entry is removed (A3's control: an event the contract reads that the loop does not emit concedes it).
 */
export const PENDING_EVENTS = Object.freeze({});


/** Judge one run's events against every mark. */
export function judgeRun(events) {
  const ev = Array.isArray(events) ? events : [];
  return Object.fromEntries(MARKS.map((m) => [m, JUDGES[m](ev)]));
}

/** Can this judge fail, and can it pass? Both must hold or its facet can never be met. */
export function controlRejected(mark) {
  return JUDGES[mark](KNOWN_BAD[mark]).ok === false && JUDGES[mark](GOOD).ok === true;
}

/** Evidence rows for cli/cennini-evidence.jsonl: live runs only; a mark with no live run yields no row (a gap). */
export function rowsFor(runs, { source = "recorded live agent runs", at = new Date().toISOString().slice(0, 10) } = {}) {
  const live = runs.filter((r) => r && r.live === true && Array.isArray(r.events));
  if (!live.length) return [];
  return MARKS.map((m) => ({
    clause: "J7", facet: m, n: live.length,
    violations: live.filter((r) => JUDGES[m](r.events).ok === false).length,
    controlRejected: controlRejected(m), source, at,
  }));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const i = process.argv.indexOf("--runs");
  if (i < 0 || !process.argv[i + 1]) { console.error("usage: node cli/cennini-contract.mjs --runs FILE.jsonl"); process.exit(2); }
  const runs = fs.readFileSync(process.argv[i + 1], "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  // the row's source names the SURFACE the runs came from, so a node-driven run is never read as the browser's
  const surfaces = [...new Set(runs.filter((r) => r && r.live === true && r.surface).map((r) => r.surface))];
  const rows = rowsFor(runs, { source: `${surfaces.length ? surfaces.join(" + ") : "recorded live runs"} (${path.basename(process.argv[i + 1])})` });
  for (const r of rows) console.log(JSON.stringify(r));
  console.error(rows.length ? rows.map((r) => `${r.facet}: ${r.violations}/${r.n} runs violate${r.controlRejected ? "" : " (JUDGE VACUOUS)"}`).join("\n") : "no live runs: no rows (every mark stays a gap)");
}
