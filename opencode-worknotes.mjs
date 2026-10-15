// opencode-worknotes.mjs — the stigmergic medium for parallel agents.
// No agent sees another's context; they share marks in a task directory:
//
//   <root>/<task>/<agent>.md           append-only marks, one line each (no writer contention)
//   <root>/<task>/<agent>.turns.md     that agent's own settled turns (single writer)
//   <root>/<task>/claims/<slug>.json   atomic claims (O_EXCL create); decay by TTL, cleared by done
//
// A mark line:  <iso-ts> · <agent> · <kind> · <text>      kinds: fact | claim | done | block
// Readers merge by timestamp. Claims that outlive their TTL without `done` lapse (pheromone decay).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export const KINDS = Object.freeze(["fact", "claim", "done", "block"]);
const root = () => process.env.FOLD_WORKNOTES_DIR ?? path.join(os.homedir(), ".fold", "worknotes");
const DEFAULT_TTL = Number(process.env.FOLD_CLAIM_TTL_MS ?? 15 * 60_000);
const ident = (s) => { const v = String(s ?? ""); return /^[\w.-]+$/.test(v) && v !== "." && v !== ".." ? v : null; };
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

export const taskDir = (task) => { const t = ident(task); return t ? path.join(root(), t) : null; };
export const agentFile = (task, agent) => { const d = taskDir(task); const a = ident(agent); return d && a ? path.join(d, `${a}.md`) : null; };
export const turnsFile = (task, agent) => { const d = taskDir(task); const a = ident(agent); return d && a ? path.join(d, `${a}.turns.md`) : null; };

/** Append one mark. A single O_APPEND write of one short line: concurrent writers interleave whole lines, never bytes. */
export function mark({ task, agent, kind = "fact", text = "", now = Date.now() } = {}) {
  const file = agentFile(task, agent);
  if (!file || !KINDS.includes(kind)) return { ok: false, gap: "bad-address" };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const line = `${new Date(now).toISOString()} · ${agent} · ${kind} · ${oneLine(text).slice(0, 500)}\n`;
  fs.appendFileSync(file, line);
  return { ok: true, file };
}

const slugOf = (item) => `${oneLine(item).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "item"}-${crypto.createHash("sha1").update(oneLine(item).toLowerCase()).digest("hex").slice(0, 8)}`;
const readClaim = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
const live = (c, now, ttl) => c && !c.done && now - c.t <= (c.ttl ?? ttl);

/** Take an item. Atomic: exactly one concurrent caller creates the claim file. A lapsed claim can be taken over; a finished one cannot (done is final). */
export function claim({ task, agent, item, ttlMs = DEFAULT_TTL, now = Date.now() } = {}) {
  const dir = taskDir(task);
  if (!dir || !ident(agent) || !oneLine(item)) return { ok: false, gap: "bad-address" };
  fs.mkdirSync(path.join(dir, "claims"), { recursive: true });
  const file = path.join(dir, "claims", `${slugOf(item)}.json`);
  const body = JSON.stringify({ item: oneLine(item), agent, t: now, ttl: ttlMs });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, body, { flag: "wx" });
      mark({ task, agent, kind: "claim", text: item, now });
      return { ok: true };
    } catch (e) {
      if (e.code !== "EEXIST") return { ok: false, gap: e.code ?? "error" };
      const held = readClaim(file);
      if (held?.done) return { ok: false, holder: held.doneBy ?? held.agent, done: true };
      if (live(held, now, ttlMs)) return { ok: false, holder: held.agent, since: held.t };
      // lapsed: move the stale file aside (only one mover wins the rename), verify it was stale, retry the create
      const aside = `${file}.${process.pid}.${crypto.randomBytes(3).toString("hex")}`;
      try {
        fs.renameSync(file, aside);
        const moved = readClaim(aside);
        if (live(moved, now, ttlMs)) { try { fs.renameSync(aside, file); } catch { /* best effort */ } return { ok: false, holder: moved.agent, since: moved.t }; }
        fs.rmSync(aside, { force: true });
      } catch { /* another stealer won */ }
    }
  }
  return { ok: false, gap: "contended" };
}

/** Finish an item: marks it done so it never lapses back to open, and leaves the trace. */
export function done({ task, agent, item, now = Date.now() } = {}) {
  const dir = taskDir(task);
  if (!dir || !ident(agent) || !oneLine(item)) return { ok: false, gap: "bad-address" };
  const file = path.join(dir, "claims", `${slugOf(item)}.json`);
  const held = readClaim(file);
  if (held) fs.writeFileSync(file, JSON.stringify({ ...held, done: true, doneBy: agent, doneAt: now }));
  mark({ task, agent, kind: "done", text: item, now });
  return { ok: true };
}

/** The merged view of a task: marks by time, open claims, finished items. */
export function read({ task, now = Date.now(), ttlMs = DEFAULT_TTL, limit = 200 } = {}) {
  const dir = taskDir(task);
  if (!dir || !fs.existsSync(dir)) return { marks: [], open: [], finished: [] };
  const marks = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.endsWith(".turns.md")).flatMap((f) =>
    fs.readFileSync(path.join(dir, f), "utf8").split("\n").flatMap((line) => {
      const m = /^(\S+) · ([\w.-]+) · (fact|claim|done|block) · (.*)$/.exec(line);
      return m ? [{ t: Date.parse(m[1]), agent: m[2], kind: m[3], text: m[4] }] : [];
    }));
  marks.sort((a, b) => a.t - b.t);
  const cdir = path.join(dir, "claims");
  const claims = fs.existsSync(cdir) ? fs.readdirSync(cdir).filter((f) => f.endsWith(".json")).flatMap((f) => { const c = readClaim(path.join(cdir, f)); return c ? [c] : []; }) : [];
  return {
    marks: marks.slice(-limit),
    open: claims.filter((c) => live(c, now, ttlMs)).map((c) => ({ item: c.item, agent: c.agent, since: c.t })),
    finished: claims.filter((c) => c.done).map((c) => ({ item: c.item, agent: c.doneBy ?? c.agent })),
  };
}

/** The stigmergic note for a context window: what is taken, what is done, the latest facts and blocks, and how to leave a mark. */
export function noteFor({ task, agent, now = Date.now() } = {}) {
  const dir = taskDir(task);
  if (!dir) return "";
  const v = read({ task, now });
  const others = v.open.filter((c) => c.agent !== agent);
  const lines = [
    `worknotes: ${dir}`,
    ...(others.length ? [`taken by others (do not duplicate): ${others.map((c) => `${c.item} [${c.agent}]`).join("; ")}`] : []),
    ...(v.finished.length ? [`done: ${v.finished.slice(-8).map((c) => c.item).join("; ")}`] : []),
    ...v.marks.filter((m) => m.kind === "fact" || m.kind === "block").slice(-5).map((m) => `${m.kind} [${m.agent}]: ${m.text}`),
    `leave marks by appending lines "<iso-ts> · ${agent} · fact|claim|done|block · <text>" to ${path.join(dir, `${agent}.md`)}`,
  ];
  return lines.join("\n");
}
