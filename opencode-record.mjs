// opencode-record.mjs — ADMIT: the only way a change enters the task's record.
// DEF (a referent + a real check) -> EVA (the check's exit code, never a model's say-so) -> admitted.
// This is EVA admitting, NOT REC: REC is the frame change a FAILED EVA calls for (code-loop.js, the
// void loop's REC'd slot DEF). Exit 0 appends one EOT block to <task>/EOT.md; anything else is
// REVERTED: no block, a `reverted` line in <task>/LOG.jsonl carrying the failure tail. fold(EOT) is last-wins per referent, so the
// context carries the current verified state, not the conversation that produced it.
//
// The judge is disclosed on every line: `box` (the door ran the declared check itself; opt-in with
// FOLD_REC_EXEC=1 and a cwd) or `reported` (the agent ran it under its own permissions and reported
// the exit code — weaker, said so). With neither, REC refuses: nothing is kept without a judge.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { taskDir } from "./opencode-worknotes.mjs";

const REFERENT = /^[\w.@:/-]{1,80}$/;
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const files = (task) => { const d = taskDir(task); return d ? { dir: d, eot: path.join(d, "EOT.md"), log: path.join(d, "LOG.jsonl") } : null; };

const HEADER = `# EOT log\n\nAppend-only. Current state = fold(log), last-wins per referent. A block exists only because its check exited 0 (EVA admitted it).\n\n`;

/** Parse EOT.md into blocks in file order. */
export function blocks(task) {
  const f = files(task);
  if (!f || !fs.existsSync(f.eot)) return [];
  return fs.readFileSync(f.eot, "utf8").split(/\n(?=### )/).flatMap((chunk) => {
    const head = /^### (\S+) · (\S+) · referent: `([^`]+)`/.exec(chunk);
    if (!head) return [];
    const sup = /^supersedes: (\S+)/m.exec(chunk)?.[1] ?? "none";
    return [{
      id: head[1], date: head[2], referent: head[3], supersedes: sup,
      delta: [...chunk.matchAll(/^\+ (.*)$/gm)].map((m) => m[1]),
      check: /^check: `([^`]*)`/m.exec(chunk)?.[1] ?? "",
    }];
  });
}

/** The current verified state: last block per referent, in order of first appearance. */
export function fold({ task } = {}) {
  const cur = new Map();
  for (const b of blocks(task)) cur.set(b.referent, b);
  return [...cur.values()];
}

/** The LIVE answers per referent: last-wins, with a fork kept parallel. A block
 *  that supersedes (`supersedes !== "none"`) replaces the block it names — a
 *  sequential update, absorbed. A block that answers a referent WITHOUT
 *  superseding it (`"none"` on an already-answered referent) is a PARALLEL
 *  answer: a second live verified answer. A referent with more than one live
 *  answer is a fork — the reopen signal. Computed over the record, never a model. */
export function liveAnswers(all) {
  const live = new Map(); // referent -> [{ id, delta0 }] distinct live answers
  for (const b of all) {
    const delta0 = b.delta[0] ?? "";
    const list = live.get(b.referent) ?? [];
    if (b.supersedes !== "none") {
      const idx = list.findIndex((x) => x.id === b.supersedes);
      if (idx >= 0) list[idx] = { id: b.id, delta0 };
      else if (!list.some((x) => x.delta0 === delta0)) list.push({ id: b.id, delta0 });
    } else if (!list.some((x) => x.delta0 === delta0)) {
      list.push({ id: b.id, delta0 });
    }
    live.set(b.referent, list);
  }
  return live;
}

/** live({ task }) — the LIVE answers as flat rows, one { referent, id, delta0 } per live
 *  answer (last-wins with a fork kept parallel: `liveAnswers` above). THE DOORWAY'S DOOR
 *  TO THE DREAM: feed these to native/organs/consolidation.js so a referent with two live
 *  answers arrives there as a disclosed discrepancy, never collapsed. Pure over the record. */
export function live({ task } = {}) {
  const out = [];
  for (const [referent, list] of liveAnswers(blocks(task))) for (const a of list) out.push({ referent, id: a.id, delta0: a.delta0 });
  return out;
}

/** REC applied to the heap: the fold is last-wins-per-referent (same as fold()),
 *  but reconcile also names the shape change the wins caused — the supersession
 *  edges (which block a later one redefined) and the contradictions left
 *  parallel. A supersession ABSORBS a fact-change: redefining a referent is
 *  progress, last-wins, never a contradiction. A contradiction is a PARALLEL
 *  fork only — a block answered the referent WITHOUT superseding the prior,
 *  leaving two live verified answers, kept and never resolved (the reopen
 *  signal). Computed over the record, never a model.
 *  Returns { fold, supersedes, disagreements }. */
export function reconcile({ task } = {}) {
  const all = blocks(task);
  const live = liveAnswers(all);
  const supersedes = all.filter((b) => b.supersedes !== "none").map((b) => ({ referent: b.referent, superseded: b.supersedes, supersededBy: b.id }));
  const disagreements = [...live.entries()].filter(([, list]) => list.length > 1).map(([referent, list]) => ({ referent, answers: list.map((x) => x.delta0) }));
  // REC reasoning, recorded: the supersession that changed the fold's shape, and
  // any contradiction left parallel (the reopen signal). model null — the fold
  // is arithmetic over the record, never a model's judgment.
  for (const s of supersedes) reason({ task, op: "REC", rule: "supersede", basis: [{ referent: s.referent, superseded: s.superseded, supersededBy: s.supersededBy }], to: s, by: "box", model: null });
  for (const d of disagreements) reason({ task, op: "REC", rule: "contradiction", basis: d.answers.map((a) => ({ referent: d.referent, answer: a })), to: d, by: "box", model: null });
  return { fold: fold({ task }), supersedes, disagreements };
}

/** Block -> operations adapter (pure; no I/O, no flag). Translates EOT blocks into the operations
 *  shape native/kernel/dynamics.js reads, so deriveSurprise(...) can see the record. The mapping is a
 *  PROPOSAL, not the repo's: a block whose check is present was admitted by exit 0, so it is preceded
 *  by an EVA; a first block for a referent is a DEF; a block carrying `supersedes:` is a REC (the
 *  frame change, naming the block it redefines as input and itself as output). A block that answers
 *  an already-answered referent without superseding is a DEF too (the parallel fork stays visible
 *  to the reader, not resolved here). Returns { operations } in record order. */
export function blocksToOperations(list = []) {
  const addr = { mode: "record", domain: "eot", grain: "block" };
  const operations = [];
  for (const b of list) {
    if (b.check) operations.push({ operator: "EVA", ...addr, inputs: [b.referent], outputs: [b.id], witness: b.check });
    if (b.supersedes && b.supersedes !== "none") operations.push({ operator: "REC", ...addr, inputs: [b.supersedes], outputs: [b.id], payload: { id: b.referent } });
    else operations.push({ operator: "DEF", ...addr, inputs: [], outputs: [b.id], payload: { id: b.referent } });
  }
  return { operations };
}

/** The void log (LOG.jsonl): every draw the declared test judged — green (kept
 *  as a block), carried (provisional, on disk while the suite is red elsewhere),
 *  or reverted (the test refuted it). Parsed, never guessed. A line that does
 *  not parse is dropped, never a kill. */
export function readLog(task) {
  const f = files(task);
  if (!f || !fs.existsSync(f.log)) return [];
  return fs.readFileSync(f.log, "utf8").split("\n").filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

/** nextVoid({ task } = {}) → the single next void the record nominates, with its
 *  record basis. THE STIGMERGIC DEF: where to go next is a pure function of the
 *  record (the verified blocks + the void log), never a model, never a network,
 *  never a guess. Every void cites the record entries that nominated it
 *  (`basis`), so a DEF with no basis — or one a model "decided" — cannot even
 *  be expressed here. `model` is null on every answer: the mouth's only contact
 *  is the `anchor` + `residue` it is handed.
 *
 *  Priority (strongest signal first):
 *    1. reopen   a referent with two LIVE verified answers — a PARALLEL fork
 *                (a block answered it WITHOUT superseding the prior), a
 *                contradiction in the fold. Re-open it: revise, do not fill.
 *                Both answers are kept parallel (`answers`); they are the
 *                finding, never resolved by this function. A supersession (a
 *                later block superseding the prior) is progress, never a fork.
 *    2. reverted a draw the declared test refuted (`verdict:"reverted"`) whose
 *                referent has no surviving green block. Fill it differently.
 *    3. carried  a provisional draw still on disk (`verdict:"carried"`) whose
 *                referent was never promoted to green. The suite is red elsewhere.
 *  Returns { ok:true, void:null } when the record holds no open void. */
export function nextVoid({ task } = {}) {
  const f = files(task);
  if (!f) return { ok: false, gap: "bad-address" };
  const log = readLog(task);
  const all = blocks(task);
  const greens = new Map(); // referent -> last surviving verified block
  for (const b of all) greens.set(b.referent, b);

  // 1. reopen: two LIVE verified answers to one referent — a genuine PARALLEL
  //    fork (a block answered it without superseding the prior). Kept parallel.
  const contested = [...liveAnswers(all).entries()].find(([, list]) => list.length > 1);
  if (contested) {
    const [referent, list] = contested;
    const v = {
      ok: true, kind: "reopen", referent, anchor: referent,
      residue: "re-open this referent: revise, do not fill",
      answers: list.map((x) => x.delta0), // the two verified answers, kept parallel
      basis: list.map((x) => ({ referent, block: x.id, delta: x.delta0 })),
      model: null,
    };
    reason({ task, op: "DEF", rule: "reopen", basis: v.basis, to: { referent, kind: "reopen", answers: v.answers }, by: "box", model: null });
    return v;
  }

  // 2. reverted: the test refuted the draw, and nothing green superseded it.
  const reverted = log.filter((l) => l.verdict === "reverted" && !greens.has(l.target));
  if (reverted.length) {
    const l = reverted[reverted.length - 1]; // freshest refutation
    const v = {
      ok: true, kind: "reverted", referent: l.target, anchor: l.target,
      residue: `fill ${l.target} — the test refuted the last draw`,
      basis: [{ seq: l.seq, target: l.target, verdict: "reverted", dissent: l.dissent }],
      model: null,
    };
    reason({ task, op: "DEF", rule: "reverted", basis: v.basis, to: { referent: l.target, kind: "reverted" }, by: "box", model: null });
    return v;
  }

  // 3. carried: a provisional draw on disk, never promoted to green.
  const carried = log.filter((l) => l.verdict === "carried" && !greens.has(l.target));
  if (carried.length) {
    const l = carried[carried.length - 1];
    const v = {
      ok: true, kind: "carried", referent: l.target, anchor: l.target,
      residue: `promote the carried draw for ${l.target} — the suite is still red elsewhere`,
      basis: [{ seq: l.seq, target: l.target, verdict: "carried" }],
      model: null,
    };
    reason({ task, op: "DEF", rule: "carried", basis: v.basis, to: { referent: l.target, kind: "carried" }, by: "box", model: null });
    return v;
  }

  return { ok: true, void: null };
}

// ── THE REASONING TRACE (REASON.jsonl) ───────────────────────────────────────
// The record holds ACTIONS (blocks, verdicts, supersession edges). This is the
// REASONING behind them: each move's derivation, append-only, with provenance.
//
// A ReasonTrace@1 line names the operator that reasoned (DEF — nextVoid's
// nomination; EVA — admit's verdict; REC — reconcile's supersession/contradiction),
// the RULE that fired, the record entries it was computed FROM (`basis` — the
// provenance), and the OUTCOME (`to`). `model` is null: reasoning here is
// MACHINE-DERIVED (II.9 — the mouth phrases, the kernel derives; a model may
// never reason to a conclusion). The mouth is disclosed as the draw's `model`
// on the EVA trace, never as a reasoner.
//
// The fold collapses repeats (latest per referent:op:rule), so a repeated
// identical nomination or audit does not grow the query surface — the trace is
// append-only, the fold is last-wins, exactly like EOT.md and LOG.jsonl.

const reasonFileOf = (task) => { const f = files(task); return f ? path.join(f.dir, "REASON.jsonl") : null; };

/** Append one reasoning step. A single O_APPEND line, so concurrent writers
 *  interleave whole lines, never bytes. Returns { ok, seq }. */
export function reason({ task, op, rule, basis = [], to = null, by = "box", model = null, now = Date.now() } = {}) {
  const file = reasonFileOf(task);
  if (!file) return { ok: false, gap: "bad-address" };
  if (!["DEF", "EVA", "REC", "NUL"].includes(op)) return { ok: false, gap: "bad-op" };
  if (!oneLine(rule)) return { ok: false, gap: "bad-rule" };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let seq = 0;
  try { seq = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length; } catch { /* first line */ }
  fs.appendFileSync(file, JSON.stringify({
    seq, schema: "ReasonTrace@1", when: new Date(now).toISOString(),
    op, rule,
    basis: Array.isArray(basis) ? basis : [],
    to: to ?? null,
    by, model,
  }) + "\n");
  return { ok: true, seq };
}

/** The reasoning trace, parsed in append order. A line that does not parse is
 *  dropped, never a kill (same contract as readLog). */
export function reasoning({ task } = {}) {
  const file = reasonFileOf(task);
  if (!file || !fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

/** reasonFor({ task, ask, limit }) — QUERY the reasoning, surf + fold + provenance.
 *  FOLD: latest step per referent:op:rule — superseded reasoning collapses, a
 *  repeated nomination leaves one survivor, the REC supersede/contradiction
 *  edges survive as the fold's own shape-change trace. SURF: the newest `limit`
 *  steps verbatim, the rest folded to one gist line by rule (Figure/Pattern, the
 *  same ladder surf.mjs runs over turns). PROVENANCE: every step carries its
 *  `basis` — the record entries it was computed from — and `model` discloses the
 *  draw's source (null = the box derived it). An ask whose words match nothing
 *  falls back to the newest steps, never to silence. */
export function reasonFor({ task, ask = "", limit = 6 } = {}) {
  const steps = reasoning({ task });
  if (!steps.length) return { note: "", steps: [], folded: 0, provenance: 0 };
  const latest = new Map();
  for (const s of steps) latest.set(`${s.to?.referent ?? ""}\u0000${s.op}\u0000${s.rule}`, s);
  const folded = [...latest.values()].sort((a, b) => a.seq - b.seq);
  const want = new Set(String(ask ?? "").toLowerCase().match(/[\w.@:/-]{2,}/g) ?? []);
  const matches = want.size
    ? folded.filter((s) => [...want].some((w) => String(s.to?.referent ?? "").toLowerCase().includes(w) || JSON.stringify(s.basis).toLowerCase().includes(w)))
    : folded;
  const relevant = matches.length ? matches : folded; // an ask that matches nothing still shows the newest, never silence
  const newest = relevant.slice(-Math.max(limit, 1));
  const older = relevant.slice(0, Math.max(0, relevant.length - Math.max(limit, 1)));
  const byRule = new Map();
  for (const s of older) byRule.set(s.rule, (byRule.get(s.rule) ?? 0) + 1);
  const line = (s) => {
    const ref = s.to?.referent ? ` \`${s.to.referent}\`` : "";
    const basis = (s.basis ?? []).map((b) => b.referent ?? b.block ?? b.target ?? b.seq ?? b.check ?? "").filter(Boolean).slice(0, 3).join("; ");
    const model = s.model ? ` (model: ${s.model})` : "";
    return `- ${s.op} ${s.rule}${ref} [seq ${s.seq}]${model}${basis ? ` — from ${basis}` : ""}`;
  };
  const lines = [
    ...(older.length ? [`- pattern: ${older.length} earlier step(s) folded — ${[...byRule].map(([r, n]) => `${r}×${n}`).join(", ")}`] : []),
    ...newest.map(line),
  ];
  return {
    note: [`<fold-reasoning steps="${steps.length}" folded="${older.length}" shown="${newest.length}">`, ...lines, "</fold-reasoning>"].join("\n"),
    steps: newest, folded: older.length, provenance: steps.length,
  };
}

export function recordNote({ task, limit = 8 } = {}) {
  const cur = fold({ task });
  if (!cur.length) return "";
  return ["record (verified, last-wins):", ...cur.slice(-limit).map((b) => `- ${b.referent} [${b.id}]: ${b.delta.join("; ")} (check: ${b.check})`)].join("\n");
}

const lastSeqFor = (logFile, referent) => {
  try {
    const rows = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].target === referent) return rows[i].seq;
  } catch { /* none yet */ }
  return null;
};

const tail = (s, n = 400) => { const t = String(s ?? "").trim(); return t.length > n ? t.slice(-n) : t; };

/** DEF -> EVA -> admit. Returns { ok, kept, id, judge, exitCode, tail } or { ok:false, gap }. */
export function admit({ task, agent, referent, delta, check, cwd, exitCode, address = "", source = "box", model = "box", provisional = false, parallel = false, action = null, by = null, before = null, after = null, rungs = [], def = null, draw = null, refused = null, now = Date.now() } = {}) {
  const f = files(task);
  if (!f || !/^[\w.-]+$/.test(String(agent ?? ""))) return { ok: false, gap: "bad-address" };
  if (!REFERENT.test(String(referent ?? "")) || !oneLine(delta)) return { ok: false, gap: "bad-referent" };
  if (refused) {
    // Refused by the form witness before any test ran: a scar, shared like any other, but never a
    // block and never counted as a test verdict (testExitCode null, judge "shape").
    fs.mkdirSync(f.dir, { recursive: true });
    let seq0 = 0;
    try { seq0 = fs.readFileSync(f.log, "utf8").split("\n").filter(Boolean).length; } catch { /* first line */ }
    fs.appendFileSync(f.log, JSON.stringify({
      seq: seq0, schema: "VoidLog@1", action: action ?? "REC", target: referent, by: by ?? agent, agent, judge: "shape", testExitCode: null,
      verdict: "refused", source, model, address, id: null, basis: oneLine(delta).slice(0, 300), dissent: String(refused).slice(0, 400),
      before, after, rungs: Array.isArray(rungs) ? rungs : [], def, draw: draw ? String(draw).slice(0, 300) : null, parent: lastSeqFor(f.log, referent),
    }) + "\n");
    return { ok: true, kept: false, refused: true, judge: "shape", id: null, exitCode: null, tail: String(refused).slice(0, 400) };
  }
  let judge, exit, output = "";
  if (typeof exitCode === "number" && Number.isFinite(exitCode)) { judge = "reported"; exit = exitCode; }
  else if (check && cwd && process.env.FOLD_REC_EXEC === "1" && path.isAbsolute(cwd) && fs.existsSync(cwd)) {
    const r = spawnSync("sh", ["-c", String(check)], { cwd, timeout: 60_000, encoding: "utf8" });
    judge = "box"; exit = r.status ?? 1; output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  } else return { ok: false, gap: "no-judge" };

  fs.mkdirSync(f.dir, { recursive: true });
  const prior = fold({ task }).find((b) => b.referent === referent);
  const id = `e${now.toString(36)}-${agent}`;
  // provisional: the draw is on disk but the suite is red elsewhere (carried). Logged, never a block.
  const kept = exit === 0 && !provisional;
  let seq = 0;
  try { seq = fs.readFileSync(f.log, "utf8").split("\n").filter(Boolean).length; } catch { /* first line */ }
  fs.appendFileSync(f.log, JSON.stringify({
    seq, schema: "VoidLog@1", action: action ?? "ADMIT", target: referent, by: by ?? agent, agent, judge, testExitCode: exit,
    verdict: kept ? "green" : provisional ? "carried" : "reverted", source, model, address, id: kept ? id : null,
    basis: oneLine(delta).slice(0, 300), dissent: kept ? "" : provisional ? "carried: suite still red elsewhere" : tail(output || `check exited ${exit}`),
    // provenance: the byte chain, the REC rungs this DEF stood on, the digest of the ground it was
    // handed, the draw itself, and the draw it follows for this referent.
    before, after, rungs: Array.isArray(rungs) ? rungs : [], def, draw: draw ? String(draw).slice(0, 300) : null,
    parent: lastSeqFor(f.log, referent),
  }) + "\n");
  if (kept) {
    if (!fs.existsSync(f.eot)) fs.appendFileSync(f.eot, HEADER);
    const date = new Date(now).toISOString().slice(0, 10);
    fs.appendFileSync(f.eot, [
      `### ${id} · ${date} · referent: \`${referent}\``,
      `supersedes: ${parallel ? "none" : (prior?.id ?? "none")}`,
      `+ ${oneLine(delta)}`,
      `+ source: ${source}${address ? `, address: ${address}` : ""}, rung: ${action ?? "ADMIT"}, judge: ${judge}, model: ${model}`,
      `check: \`${oneLine(check)}\``,
      `◼ EOT`, "", "",
    ].join("\n"));
  }
  // EVA reasoning, recorded: WHY this draw was admitted / carried / reverted —
  // the check that judged it, the judge, the exit code, and the block it
  // supersedes. The mouth is disclosed as `model`, never as the reasoner.
  reason({
    task, op: "EVA", rule: kept ? "admit" : provisional ? "carry" : "revert",
    basis: [{ referent, check: oneLine(check), judge, exitCode: exit, prior: prior?.id ?? "none" }],
    to: { referent, id: kept ? id : null, verdict: kept ? "green" : provisional ? "carried" : "reverted" },
    by: by ?? agent, model: model ?? "box", now,
  });
  return { ok: true, kept, provisional, id: kept ? id : null, judge, exitCode: exit, tail: kept || provisional ? "" : tail(output || `check exited ${exit}`) };
}

/** An `onRecord` sink for runVoidLoop (native/the-fold/code-loop.js): every draw the real test judged lands in the task's record. */
export const recordSink = ({ task, agent }) => (r) => admit({ task, agent, ...r });

/** PROVENANCE: the work tree walked as a chain. Per referent, every judged action in order with its
 *  byte link (before -> after). A `break` is an action whose `before` is not the `after` of the last
 *  action that left the file in place (something changed those bytes outside the log). A
 *  `regression` is a referent that had a green block and was later refuted. Pure, from the log. */
export function provenance({ task } = {}) {
  const log = readLog(task);
  const byReferent = new Map();
  for (const l of log) {
    if (!byReferent.has(l.target)) byReferent.set(l.target, []);
    byReferent.get(l.target).push(l);
  }
  const referents = [], breaks = [], regressions = [];
  for (const [referent, rows] of byReferent) {
    let standing = null; // the `after` of the last action that stayed on disk (green or carried)
    let sawGreen = null;
    const chain = rows.map((l) => {
      const linked = standing === null || l.before == null || l.before === standing;
      if (!linked) breaks.push({ referent, seq: l.seq, expected: standing, found: l.before });
      if (l.verdict === "green" || l.verdict === "carried") standing = l.after ?? standing;
      if (l.verdict === "green") sawGreen = l.seq;
      if (l.verdict === "reverted" && sawGreen !== null) regressions.push({ referent, green: sawGreen, refuted: l.seq, dissent: l.dissent });
      return { seq: l.seq, by: l.by, verdict: l.verdict, judge: l.judge, rung: l.action, rungs: l.rungs ?? [], def: l.def ?? null, before: l.before ?? null, after: l.after ?? null, parent: l.parent ?? null };
    });
    referents.push({ referent, actions: chain, standing });
  }
  return { referents, breaks, regressions };
}

/** The bodies the real test already refuted for a unit, across EVERY agent of the task: the scars
 *  any later draw must not repeat. Newest last; deduped by content. */
export function refusalsFor({ task, unit, file = null } = {}) {
  const seen = new Set();
  return readLog(task).flatMap((l) => {
    const sameUnit = String(l.target ?? "").endsWith(`:${unit}`) && (file ? String(l.target).startsWith(`${file}:`) : true);
    if (!sameUnit || (l.verdict !== "reverted" && l.verdict !== "refused") || !l.draw || seen.has(l.draw)) return [];
    seen.add(l.draw);
    return [l.draw];
  });
}
