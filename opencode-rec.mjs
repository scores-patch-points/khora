// opencode-rec.mjs — REC: the only way a change enters the record.
// DEF (a referent + a real check) -> EVA (the check's exit code, never a model's say-so) -> REC (keep).
// Exit 0 appends one EOT block to <task>/EOT.md; anything else is REVERTED: no block, a `reverted`
// line in <task>/LOG.jsonl carrying the failure tail. fold(EOT) is last-wins per referent, so the
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

const HEADER = `# EOT log\n\nAppend-only. Current state = fold(log), last-wins per referent. A block exists only because its check exited 0 (REC).\n\n`;

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

export function recNote({ task, limit = 8 } = {}) {
  const cur = fold({ task });
  if (!cur.length) return "";
  return ["record (verified, last-wins):", ...cur.slice(-limit).map((b) => `- ${b.referent} [${b.id}]: ${b.delta.join("; ")} (check: ${b.check})`)].join("\n");
}

const tail = (s, n = 400) => { const t = String(s ?? "").trim(); return t.length > n ? t.slice(-n) : t; };

/** DEF -> EVA -> REC. Returns { ok, kept, id, judge, exitCode, tail } or { ok:false, gap }. */
export function rec({ task, agent, referent, delta, check, cwd, exitCode, address = "", source = "box", model = "box", provisional = false, action = null, by = null, now = Date.now() } = {}) {
  const f = files(task);
  if (!f || !/^[\w.-]+$/.test(String(agent ?? ""))) return { ok: false, gap: "bad-address" };
  if (!REFERENT.test(String(referent ?? "")) || !oneLine(delta)) return { ok: false, gap: "bad-referent" };
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
    seq, schema: "VoidLog@1", action: action ?? "REC", target: referent, by: by ?? agent, agent, judge, testExitCode: exit,
    verdict: kept ? "green" : provisional ? "carried" : "reverted", source, model, address, id: kept ? id : null,
    basis: oneLine(delta).slice(0, 300), dissent: kept ? "" : provisional ? "carried: suite still red elsewhere" : tail(output || `check exited ${exit}`),
  }) + "\n");
  if (kept) {
    if (!fs.existsSync(f.eot)) fs.appendFileSync(f.eot, HEADER);
    const date = new Date(now).toISOString().slice(0, 10);
    fs.appendFileSync(f.eot, [
      `### ${id} · ${date} · referent: \`${referent}\``,
      `supersedes: ${prior?.id ?? "none"}`,
      `+ ${oneLine(delta)}`,
      `+ source: ${source}${address ? `, address: ${address}` : ""}, rung: ${action ?? "REC"}, judge: ${judge}, model: ${model}`,
      `check: \`${oneLine(check)}\``,
      `◼ EOT`, "", "",
    ].join("\n"));
  }
  return { ok: true, kept, provisional, id: kept ? id : null, judge, exitCode: exit, tail: kept || provisional ? "" : tail(output || `check exited ${exit}`) };
}

/** An `onRec` sink for runVoidLoop (native/the-fold/code-loop.js): every draw the real test judged lands in the task's record. */
export const recSink = ({ task, agent }) => (r) => rec({ task, agent, ...r });
