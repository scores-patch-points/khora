// opencode-worknotes.mjs — the stigmergic medium for parallel agents.
// No agent sees another's context; they share marks in a task directory:
//
//   <root>/<task>/<agent>.md           append-only marks, one line each (no writer contention)
//   <root>/<task>/<agent>.turns.md     that agent's own settled turns (single writer)
//   <root>/<task>/claims/<slug>.json   atomic claims (O_EXCL create); decay by TTL, cleared by done
//
// A mark line:  <iso-ts> · <agent> · <kind> · <text>      kinds: fact | claim | done | block
// Readers merge by timestamp. Claims that outlive their TTL without `done` lapse (pheromone decay).
//
// Handle: Grassé — after Pierre-Paul Grassé, who coined STIGMERGY (1959, from
// stigma + ergon, mark + work): the work itself is the message. Ants coordinate
// by depositing marks in a shared environment and reading the marks others
// left; no ant holds the plan. Here the task directory is the mound and the log
// is the medium — one writer per file, marks that persist, claims that decay.
// Grassé supplies the picture; the marks/claims/leases (O_EXCL, TTL) are our
// engineering (archon: grasse; dossier in the-fold/docs/archons/dossier). The
// kernel's own trails are named for others (Wilson, kernel/stigmergy.js; Atta,
// kernel/activation.js) — this handle is the opencode medium, the log itself.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { neutralize } from "./opencode-defang.mjs";
import { actOf as workplanActOf, markCell, scentResolution } from "./native/organs/workplan-acts.js";

export const KINDS = Object.freeze(["fact", "claim", "done", "block"]);
export const root = () => process.env.FOLD_WORKNOTES_DIR ?? path.join(os.homedir(), ".fold", "worknotes");
const DEFAULT_TTL = Number(process.env.FOLD_CLAIM_TTL_MS ?? 15 * 60_000);
export const ident = (s) => { const v = String(s ?? ""); return /^[\w.-]+$/.test(v) && v !== "." && v !== ".." ? v : null; };
export const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

const defaultUniverse = () => process.env.FOLD_UNIVERSE ?? "world";
export const universeDir = (task, universe = defaultUniverse()) => {
  const t = ident(task); const u = ident(universe);
  if (!t || !u) return null;
  if (u === "world") return taskDir(t);
  const d = taskDir(t); return d ? path.join(d, u) : null;
};
export const taskDir = (task) => { const t = ident(task); return t ? path.join(root(), t) : null; };
export const agentFile = (task, agent, universe = defaultUniverse()) => { const d = universeDir(task, universe); const a = ident(agent); return d && a ? path.join(d, `${a}.md`) : null; };
export const turnsFile = (task, agent, universe = defaultUniverse()) => { const d = universeDir(task, universe); const a = ident(agent); return d && a ? path.join(d, `${a}.turns.md`) : null; };

// ── UNIVERSES (P3) ───────────────────────────────────────────────────────────
const UNIVERSE_KINDS = Object.freeze(["world", "counterfactual", "hypothetical", "stipulated", "score", "workspace"]);
export function tellUniverse({ task, name, kind = "counterfactual", stipulations = [], sources = [], fork = null, now = Date.now() } = {}) {
  const t = ident(task); const n = ident(name);
  if (!t || !n) return { ok: false, gap: "bad-address" };
  if (!UNIVERSE_KINDS.includes(kind)) return { ok: false, gap: "bad-kind" };
  const dir = universeDir(t, n);
  if (!dir) return { ok: false, gap: "bad-universe" };
  fs.mkdirSync(dir, { recursive: true });
  const body = { kind, name: n, stipulations: Array.isArray(stipulations) ? stipulations : [], sources: Array.isArray(sources) ? sources : [], fork: fork ?? `world@${new Date(now).toISOString()}`, createdAt: new Date(now).toISOString() };
  fs.writeFileSync(path.join(dir, "UNIVERSE.json"), JSON.stringify(body, null, 2));
  return { ok: true, dir, universe: n };
}
export function universeInfo({ task, universe } = {}) {
  const u = universe ?? defaultUniverse();
  const dir = universeDir(task, u);
  if (!dir) return null;
  try { return JSON.parse(fs.readFileSync(path.join(dir, "UNIVERSE.json"), "utf8")); } catch { return u === "world" ? { kind: "world", name: "world" } : null; }
}
export function promoteUniverse({ task, from, addr, now = Date.now() } = {}) {
  // Promotion requires a witnessed check; this function only writes the EOT row into world/eot/.
  // The caller (door) gates on witnessed exit 0. We record parent=from/<task>#addr.
  const worldDir = taskDir(task);
  if (!worldDir) return { ok: false, gap: "bad-task" };
  const target = path.join(worldDir, "eot");
  fs.mkdirSync(target, { recursive: true });
  const row = { promotedFrom: from, addr, at: new Date(now).toISOString(), parent: `${from}/${task}#${addr}` };
  const file = path.join(target, `promoted-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(row, null, 2));
  return { ok: true, file };
}

/** Append one mark. A single O_APPEND write of one short line: concurrent writers interleave whole lines, never bytes. */
export function mark({ task, agent, kind = "fact", text = "", now = Date.now(), universe, cell } = {}) {
  const file = agentFile(task, agent, universe ?? defaultUniverse());
  if (!file || !KINDS.includes(kind)) return { ok: false, gap: "bad-address" };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // THE FIREWALL, on this store too: a forged <fold-…>/[[snip:…]]/evt_…/src_… marker in one agent's
  // text is defanged before it can reach another agent's note (same strip as the EOT log).
  // THE CELL (workplan-acts.js): a mark is one of the 27 phaseposts — its kind names the act, and the
  // cell rides the line so a reader (and the plan surface) sees WHERE the move stands, not a free word.
  const c = cell ?? markCell(kind);
  const line = `${new Date(now).toISOString()} · ${agent} · ${kind} · ${c ? `cell=${c} · ` : ""}${neutralize(oneLine(text)).slice(0, 500)}\n`;
  fs.appendFileSync(file, line);
  return { ok: true, file };
}

const slugOf = (item) => `${oneLine(item).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "item"}-${crypto.createHash("sha1").update(oneLine(item).toLowerCase()).digest("hex").slice(0, 8)}`;
const readClaim = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
// A claim is live only if it has STARTED. An agent that stamps a future `now` used to hold an item
// forever (now - t stays negative); a start more than a small skew in the future is not yet in force.
const CLOCK_SKEW_MS = 2000;
const live = (c, now, ttl) => c && !c.done && now >= c.t - CLOCK_SKEW_MS && now - c.t <= (c.ttl ?? ttl);

/** Take an item. Atomic: exactly one concurrent caller creates the claim file. A lapsed claim can be taken over; a finished one cannot (done is final). */
export function claim({ task, agent, item, ttlMs = DEFAULT_TTL, now = Date.now(), universe } = {}) {
  const u = universe ?? defaultUniverse();
  const dir = universeDir(task, u);
  if (!dir || !ident(agent) || !oneLine(item)) return { ok: false, gap: "bad-address" };
  fs.mkdirSync(path.join(dir, "claims"), { recursive: true });
  const file = path.join(dir, "claims", `${slugOf(item)}.json`);
  const body = JSON.stringify({ item: oneLine(item), agent, t: now, ttl: ttlMs, cell: workplanActOf("mark:claim").cell });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, body, { flag: "wx" });
      mark({ task, agent, kind: "claim", text: item, now, universe: u });
      return { ok: true };
    } catch (e) {
      if (e.code !== "EEXIST") return { ok: false, gap: e.code ?? "error" };
      const held = readClaim(file);
      if (held?.done) return { ok: false, holder: held.doneBy ?? held.agent, done: true };
      if (held && !held.done && held.agent === agent) {
        // the holder is touching it again: the trace is refreshed (decay restarts), not contended
        try { fs.writeFileSync(file, JSON.stringify({ ...held, t: now, ttl: ttlMs })); } catch { /* best effort */ }
        return { ok: true, refreshed: true };
      }
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
export function done({ task, agent, item, now = Date.now(), universe } = {}) {
  const u = universe ?? defaultUniverse();
  const dir = universeDir(task, u);
  if (!dir || !ident(agent) || !oneLine(item)) return { ok: false, gap: "bad-address" };
  const file = path.join(dir, "claims", `${slugOf(item)}.json`);
  const held = readClaim(file);
  if (held) fs.writeFileSync(file, JSON.stringify({ ...held, done: true, doneBy: agent, doneAt: now }));
  mark({ task, agent, kind: "done", text: item, now, universe: u });
  return { ok: true };
}

/** The merged view of a task: marks by time, open claims, finished items. */
export function read({ task, now = Date.now(), ttlMs = DEFAULT_TTL, limit = 200, universe } = {}) {
  const u = universe ?? defaultUniverse();
  const dir = universeDir(task, u);
  if (!dir || !fs.existsSync(dir)) return { marks: [], open: [], finished: [], lapsed: [], conflicts: [], universe: u };
  const readDir = (d, tag) => {
    if (!fs.existsSync(d)) return [];
    return fs.readdirSync(d).filter((f) => f.endsWith(".md") && !f.endsWith(".turns.md")).flatMap((f) => {
      const owner = f.slice(0, -3);
      if (!ident(owner)) return [];
      return fs.readFileSync(path.join(d, f), "utf8").split("\n").flatMap((line) => {
        const m = /^(\S+) · ([\w.-]+) · (fact|claim|done|block) · (?:cell=([A-Z]+·[A-Za-z]+) · )?(.*)$/.exec(line);
        return m ? [{ t: Date.parse(m[1]), agent: owner, kind: m[3], cell: m[4] ?? null, text: neutralize(m[5]), universe: tag }] : [];
      });
    });
  };
  let marks = readDir(dir, u);
  const conflicts = [];
  if (u !== "world") {
    const worldDir = taskDir(task);
    const worldMarks = readDir(worldDir, "world");
    // parent-chain read-through: world marks are visible in every universe
    marks = [...worldMarks, ...marks];
    // conflict detection: a non-world mark that contradicts a world mark (same agent+kind, differing text for same referent) → conflict line
    const worldKeys = new Set(worldMarks.map((m) => `${m.agent}\\u0000${m.kind}\\u0000${m.text}`));
    for (const m of marks.filter((x) => x.universe === u)) {
      const w = worldMarks.find((wm) => wm.agent === m.agent && wm.kind === m.kind && wm.text !== m.text);
      if (w) conflicts.push({ a: u, b: "world", line: `! ${u}≠world: ${m.agent} ${m.kind}: ${m.text.slice(0, 60)}` });
    }
  }
  marks.sort((a, b) => a.t - b.t);
  const cdir = path.join(dir, "claims");
  const claims = fs.existsSync(cdir) ? fs.readdirSync(cdir).filter((f) => f.endsWith(".json")).flatMap((f) => { const c = readClaim(path.join(cdir, f)); return c ? [c] : []; }) : [];
  return {
    marks: marks.slice(-limit),
    open: claims.filter((c) => live(c, now, ttlMs)).map((c) => ({ item: c.item, agent: c.agent, since: c.t, cell: c.cell ?? null })),
    finished: claims.filter((c) => c.done).map((c) => ({ item: c.item, agent: c.doneBy ?? c.agent, cell: c.cell ?? null })),
    // THE OWED NULL, PAID (workplan-acts.js, the pairing rule): a claim that lapsed — not done, not live —
    // is a build that never completed. It is surfaced with the null its cell owes (INS·Figure · INCOMPLETE),
    // never silently forgotten: a positive that lands without its null reads silence as support.
    lapsed: claims.filter((c) => !c.done && !live(c, now, ttlMs)).map((c) => ({ item: c.item, agent: c.agent, since: c.t, cell: workplanActOf("claim:lapsed").cell, null: workplanActOf("claim:lapsed").null })),
    conflicts,
    universe: u,
  };
}

// ── SCENTS — THE PHEROMONE TRAIL (P1) — TENSION AND RELEASE ──────────────────────────────────────────────────
// A drill-down (snip/read/grep) declares the void it serves — an OPEN QUESTION anchored at the address it
// motivated. The void is a TENSION; it must RELEASE, and every release is TYPED (THE-NULL-STATES: "a void
// re-zeros on one arrival"; "a declared absence is a NUL"; THE-THEORY-OF-PATHOS: release === 0 is a bankruptcy):
//
//   <root>/<task>/scents/<agent>.md
//   <iso> · <agent> · scent · q="…" · at="…" · parent="…" · open|released|walled · passes=N · by=<reason>
//
//   open      the tension rides (a <fold-trail> line)
//   released  RELEASE BY ARRIVAL (by=arrival) or BY REFRAME (by=reframe) — the void re-zeroed, the filling named
//   walled    RELEASE BY WALL (by=wall) — re-asked past FOLD_SCENT_STUCK: an honest terminal NUL, never a re-feed
//
// RELEASE IS STICKY: re-asking a released question (same q at the same address) does NOT re-open it (Bharata: a
// superseded expectation does not un-supersede). A genuinely new question at the same address opens anew. One
// writer per file (O_APPEND), read defanged (the same firewall the marks use).
const SCENT_TTL = () => Number(process.env.FOLD_SCENT_TTL_MS ?? 15 * 60_000);
const SCENT_GAMMA = 0.7;
const scentFile = (task, agent, universe = defaultUniverse()) => { const d = universeDir(task, universe); const a = ident(agent); return d && a ? path.join(d, "scents", `${a}.md`) : null; };
const scentLine = (s) => {
  const val = (v, n) => neutralize(oneLine(v)).replace(/"/g, "'").slice(0, n);
  // THE CELL (workplan-acts.js): a scent is a declared void (DEF·Ground) while open; a release is a
  // re-zero (REC), a merge an ascent (SYN·Ground); a wall is a terminal NUL (REC·Ground · not_earned).
  const a = workplanActOf(scentResolution(s.state, s.by));
  const cellPart = a.gap ? "" : `cell=${a.cell} · `;
  return `${new Date(s.t).toISOString()} · ${s.agent} · scent · q="${val(s.q, 200)}" · at="${val(s.at, 80)}" · parent="${val(s.parent, 80)}" · ${s.state} · ${cellPart}passes=${s.passes} · by=${s.by ?? "none"}\n`;
};

/** Declare (open) one tension. A released/walled question with the same q is NOT re-opened (sticky release). */
export function scent({ task, agent, q, at, parent = "", now = Date.now(), universe } = {}) {
  const u = universe ?? defaultUniverse();
  const file = scentFile(task, agent, u);
  if (!file || !oneLine(at)) return { ok: false, gap: "bad-address" };
  if (!oneLine(q)) return { ok: false, gap: "no-question" };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = scentsRaw({ task, universe: u }).find((s) => s.agent === agent && s.at === oneLine(at));
  if (existing && existing.state !== "open" && existing.q === oneLine(q)) return { ok: false, gap: "already-released", state: existing.state };
  const passes = existing && existing.state === "open" && existing.q === oneLine(q) ? existing.passes + 1 : 1;
  fs.appendFileSync(file, scentLine({ t: now, agent, q: oneLine(q), at, parent, state: "open", passes, by: "none" }));
  return { ok: true, file, passes };
}

/** RELEASE a tension — the single move the loop was missing. `by:"arrival"` (the bytes landed) → released;
 *  `by:"wall"` (re-asked past the threshold) → walled; `by:"reframe"` (REC, a coarser note replaces it) → released. */
export function scentClose({ task, agent, at, by = "arrival", now = Date.now(), universe } = {}) {
  const a = ident(agent);
  const u = universe ?? defaultUniverse();
  const file = scentFile(task, agent, u);
  if (!file || !a || !oneLine(at)) return { ok: false, gap: "bad-address" };
  const existing = scentsRaw({ task, universe: u }).find((s) => s.agent === a && s.at === oneLine(at));
  if (!existing) return { ok: false, gap: "no-scent" };
  if (existing.state !== "open") return { ok: false, gap: "already-released", state: existing.state };
  const state = by === "wall" ? "walled" : "released";
  fs.appendFileSync(file, scentLine({ t: now, agent: a, q: existing.q, at: oneLine(at), parent: existing.parent, state, passes: existing.passes, by }));
  return { ok: true, state, by };
}

const SCENT_RE = /^(\S+) · ([\w.-]+) · scent · q="([^"]*)" · at="([^"]*)" · parent="([^"]*)" · (open|released|walled) · (?:cell=([A-Z]+·[A-Za-z]+) · )?passes=(\d+)(?: · by=([\w-]*))?$/;
function scentsRaw({ task, universe } = {}) {
  const u = universe ?? defaultUniverse();
  const dir = universeDir(task, u);
  const sdir = dir && path.join(dir, "scents");
  if (!sdir || !fs.existsSync(sdir)) return [];
  const byAt = new Map();
  for (const f of fs.readdirSync(sdir).filter((x) => x.endsWith(".md"))) {
    const owner = f.slice(0, -3);
    if (!ident(owner)) continue;
    let buf; try { buf = fs.readFileSync(path.join(sdir, f), "utf8"); } catch { continue; }
    for (const line of buf.split("\n")) {
      const m = SCENT_RE.exec(line);
      if (!m) continue;
      byAt.set(`${owner}\u0000${m[4]}`, { t: Date.parse(m[1]), agent: owner, q: neutralize(m[3]), at: m[4], parent: m[5], state: m[6], cell: m[7] ?? null, passes: Number(m[8]), by: m[9] || "none" });
    }
  }
  return [...byAt.values()];
}

/** The open trail, warmest first. Warmth is RECENCY ONLY (gamma^minutes) — never repetition. A question the
 *  model re-asks without resolution is a LOOP, not a lead: past FOLD_SCENT_STUCK it is dropped here and WALLED
 *  by the door, so the trail cannot echo the model's own meta-questions back and amplify the loop. */
export function scentsOf({ task, now = Date.now(), ttlMs = SCENT_TTL(), limit = 12, stuckAt = Number(process.env.FOLD_SCENT_STUCK ?? 3), universe } = {}) {
  return scentsRaw({ task, universe })
    .filter((s) => s.state === "open" && now - s.t <= ttlMs)
    .map((s) => ({ ...s, ageMs: now - s.t, warm: Math.pow(SCENT_GAMMA, Math.max(0, (now - s.t) / 60_000)), stuck: s.passes >= stuckAt }))
    .filter((s) => !s.stuck)
    .sort((a, b) => b.warm - a.warm || b.t - a.t)
    .slice(0, limit);
}

/** The tensions re-asked past the threshold without release — a LOOP, to be WALLED (typed), never re-fed. */
export function stuckScents({ task, now = Date.now(), ttlMs = SCENT_TTL(), stuckAt = Number(process.env.FOLD_SCENT_STUCK ?? 3), universe } = {}) {
  return scentsRaw({ task, universe }).filter((s) => s.state === "open" && now - s.t <= ttlMs && s.passes >= stuckAt);
}

// RELEASE BY ARRIVAL-IN-PROSE. The model often answers a question in its own prose without drilling the address;
// that answer IS the arrival. Mechanical word overlap on CONTENT terms (function words never count), so a question
// the answer bears on releases and one it ignores stays open. This is the second arrival path beside snip-success.
const FUNCTION_WORDS = new Set(["the", "this", "that", "these", "those", "what", "which", "where", "when", "why", "how", "is", "are", "was", "were", "be", "been", "being", "to", "of", "in", "on", "for", "and", "or", "with", "from", "into", "about", "over", "under", "it", "its", "a", "an", "i", "we", "you", "they", "do", "does", "did", "can", "will", "would", "should", "could", "my", "our", "your", "their", "if", "then", "than", "so", "as", "at", "by", "not", "no", "yes", "have", "has", "had"]);
const contentWords = (t) => [...new Set(String(t ?? "").toLowerCase().match(/[\p{L}\p{N}_]{4,}/gu) ?? [])].filter((w) => !FUNCTION_WORDS.has(w));

/** Release every open tension for the ASK itself — the void is the question, the address only where the model
 *  looked. A drill that finally lands (at any address) re-zeros the ask's tension, not just the one address tried. */
export function releaseByQuestion({ task, agent = null, q, by = "arrival", now = Date.now() } = {}) {
  const qw = contentWords(q);
  if (!qw.length) return { ok: false, gap: "no-question", released: 0 };
  let released = 0;
  for (const s of scentsRaw({ task })) {
    if (s.state !== "open" || (agent && s.agent !== agent)) continue;
    const sw = contentWords(s.q);
    if (!sw.length) continue;
    if (qw.filter((w) => sw.includes(w)).length >= Math.min(2, Math.min(qw.length, sw.length))) {
      try { if (scentClose({ task, agent: s.agent, at: s.at, by, now }).ok) released++; } catch { /* skip */ }
    }
  }
  return { ok: true, released };
}

// VOIDS ARE NESTED (Koestler's holarchy): an address is a holon — `turn 5` contains `turn 5.s2`, a file contains
// its spans. A coarse arrival releases the parts it covers; a PART never releases the whole (low sets possibility
// for high — a sub-part cannot carry what its part asserts). Pure string refinement, no model.
const nestsUnder = (parent, child) => {
  const p = oneLine(parent), c = oneLine(child);
  if (!p || !c) return false;
  if (p === c) return true;
  if (!c.startsWith(p)) return false;
  const rest = c.slice(p.length);
  return rest.startsWith(".") || rest.startsWith("#");
};

/** Release address P and every tension NESTED under it (children covered by a coarse arrival / wall / merge). */
export function releaseNested({ task, agent = null, at, by = "arrival", now = Date.now() } = {}) {
  let released = 0;
  for (const s of scentsRaw({ task })) {
    if (s.state !== "open" || (agent && s.agent !== agent)) continue;
    if (!nestsUnder(at, s.at)) continue;
    try { if (scentClose({ task, agent: s.agent, at: s.at, by, now }).ok) released++; } catch { /* skip */ }
  }
  return { ok: true, released };
}

/** Release every open tension this answer's own words bear on (its arrival). Returns how many were released. */
export function releaseAnswered({ task, agent = null, text, now = Date.now() } = {}) {
  const words = new Set(contentWords(text));
  if (!words.size) return { ok: false, gap: "no-text", released: 0 };
  let released = 0;
  for (const s of scentsRaw({ task })) {
    if (s.state !== "open" || (agent && s.agent !== agent)) continue;
    const qw = contentWords(s.q);
    if (!qw.length) continue;
    if (qw.filter((w) => words.has(w)).length >= Math.min(2, qw.length)) {
      try { if (scentClose({ task, agent: s.agent, at: s.at, by: "arrival", now }).ok) released++; } catch { /* skip */ }
    }
  }
  return { ok: true, released };
}

// RELEASE BY MERGE — THE MECHANICAL ASCENT. Never a model act: the MACHINE observes that the task's SETTLED
// material (its turns, single-writer files this module already reads) now covers a tension's terms, and releases
// the tension by reframe — the question is answered at the coarser turn/thread grain, so the ladder climbs without
// the model saying a word. This is the missing rung beside arrival (snip/answer) and wall (re-ask): the ascent.
export function releaseByMerge({ task, now = Date.now() } = {}) {
  const settled = new Set(contentWords(turnsOf({ task }).map((t) => `${t.ask} ${t.text}`).join(" ")));
  if (!settled.size) return { ok: false, gap: "no-settled", released: 0 };
  let released = 0;
  for (const s of scentsRaw({ task })) {
    if (s.state !== "open") continue;
    const qw = contentWords(s.q);
    if (!qw.length) continue;
    if (qw.filter((w) => settled.has(w)).length >= Math.min(2, qw.length)) {
      try { if (scentClose({ task, agent: s.agent, at: s.at, by: "merge", now }).ok) released++; } catch { /* skip */ }
    }
  }
  return { ok: true, released };
}

/** What this agent needs to know, structured (the door packs it under a budget): claims others hold
 *  and blocks others raised, newest first. Nothing else is ever required to coordinate. */
export function stateFor({ task, agent, now = Date.now(), universe } = {}) {
  const v = read({ task, now, universe });
  return {
    taken: v.open.filter((c) => c.agent !== agent).map((c) => ({ item: c.item, agent: c.agent, cell: c.cell ?? null })),
    blocks: v.marks.filter((m) => m.kind === "block" && m.agent !== agent).slice(-3).map((m) => ({ text: m.text, agent: m.agent })),
  };
}

/** The stigmergic note for a context window: what is taken, what is done, the latest facts and blocks, and how to leave a mark. */
export function noteFor({ task, agent, now = Date.now(), universe } = {}) {
  const u = universe ?? defaultUniverse();
  const dir = universeDir(task, u);
  if (!dir) return "";
  const v = read({ task, now, universe: u });
  const others = v.open.filter((c) => c.agent !== agent);
  const lines = [
    `worknotes: ${dir}`,
    ...(others.length ? [`taken by others (do not duplicate): ${others.map((c) => `${c.item} [${c.agent}]`).join("; ")}`] : []),
    ...(v.finished.length ? [`done: ${v.finished.slice(-8).map((c) => c.item).join("; ")}`] : []),
    ...v.marks.filter((m) => m.kind === "fact" || m.kind === "block").slice(-5).map((m) => `${m.kind} [${m.agent}]: ${m.text}`),
    `leave marks by appending lines "<iso-ts> · ${agent} · fact|claim|done|block · [cell=OP·Grain · ]<text>" to ${path.join(dir, `${agent}.md`)}`,
  ];
  return lines.join("\n");
}

/** Every task's work plan, newest first: its marks, open claims, and each agent's settled turns (the ask, the tools,
 *  and the text the agent wrote - reasoning included - exactly as it was kept). Read-only; a missing root is no plans. */
/**
 * The turns file: one section per turn, length-framed so the answer's bytes come back EXACT whatever they contain
 * (a line that looks like a header, trailing blank lines, code fences). The header stays `## turn N\n` for the weft
 * store, which finds turns by it. A section with no `answer-bytes:` line is the older, unframed shape and is read as before.
 */
const SECTION = (t) => {
  const answer = t.answer || "(no text reply)";
  const ask = String(t.ask ?? "").replace(/\s*\n\s*/g, " ");
  const tools = t.grounds?.length ? `tools: ${t.grounds.join(", ")}\n` : "";
  return `## turn ${t.n}\n\nask: ${ask}\n${tools}answer-bytes: ${Buffer.byteLength(answer)}\n\n${answer}\n`;
};
export function parseTurnsFile(buf) {
  const out = [];
  let i = buf.indexOf("## turn ");
  while (i >= 0 && i < buf.length) {
    const nextOld = buf.indexOf("\n## turn ", i + 1);
    const ab = buf.indexOf("\nanswer-bytes: ", i);
    const framed = ab >= 0 && (nextOld < 0 || ab < nextOld);
    if (framed) {
      const line = buf.indexOf("\n", ab + 1);
      const len = Number(buf.subarray(ab + "\nanswer-bytes: ".length, line).toString());
      const head = buf.subarray(i, ab).toString("utf8");
      const start = line + 2; // the blank line after the frame
      const text = buf.subarray(start, start + len).toString("utf8");
      out.push({ n: Number(/^## turn (\d+)/.exec(head)?.[1] ?? 0), ask: /^ask: (.*)$/m.exec(head)?.[1] ?? "", tools: (/^tools: (.*)$/m.exec(head)?.[1] ?? "").split(",").map((t) => t.trim()).filter(Boolean), text });
      const nx = buf.indexOf("## turn ", start + len);
      i = nx;
    } else {
      const part = buf.subarray(i + "## turn ".length, nextOld < 0 ? buf.length : nextOld).toString("utf8");
      const n = Number(/^(\d+)/.exec(part)?.[1] ?? 0);
      const ask = /^ask: (.*)$/m.exec(part)?.[1] ?? "";
      const tools = (/^tools: (.*)$/m.exec(part)?.[1] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
      const body = part.replace(/^\d+\s*\n/, "").replace(/^ask: .*\n?/m, "").replace(/^tools: .*\n?/m, "").trim();
      out.push({ n, ask, tools, text: body });
      i = nextOld < 0 ? -1 : nextOld + 1;
    }
  }
  return out;
}

/** Write this agent's turns, MERGED by turn number with what the file already holds: the host passes only the window
 *  it still carries, and a later, shorter window must never erase an older turn's bytes. Single writer; atomic rename. */
export function writeTurnsFile({ file, agent, turns, universe } = {}) {
  let have = [];
  try { have = parseTurnsFile(fs.readFileSync(file)).map((t) => ({ n: t.n, ask: t.ask, grounds: t.tools, answer: t.text })); } catch { /* first write */ }
  const byN = new Map(have.map((t) => [t.n, t]));
  for (const t of turns) byN.set(t.n, t);
  const merged = [...byN.values()].sort((a, b) => a.n - b.n);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `# turns ${agent}\n\n${merged.map(SECTION).join("\n")}`);
  fs.renameSync(tmp, file);
  return merged.length;
}

/** Every agent's settled turns in a task, parsed from its single-writer `<agent>.turns.md`. */
export function turnsOf({ task, universe } = {}) {
  const u = universe ?? defaultUniverse();
  const collect = (d) => {
    const out = [];
    if (!d || !fs.existsSync(d)) return out;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".turns.md"))) {
      const agent = f.replace(/\\.turns\\.md$/, "");
      let buf;
      try { buf = fs.readFileSync(path.join(d, f)); } catch { continue; }
      for (const t of parseTurnsFile(buf)) out.push({ agent, ...t, universe: u });
    }
    return out;
  };
  const turns = collect(universeDir(task, u));
  if (u !== "world") {
    const worldTurns = collect(taskDir(task));
    // parent-chain read-through: world turns visible, tagged
    for (const t of worldTurns) turns.push({ ...t, universe: "world" });
  }
  return turns;
}

export function projectRoot(workspace) {
  const w = String(workspace ?? "");
  if (!path.isAbsolute(w)) return null;
  try {
    let at = fs.realpathSync(w);
    if (!fs.statSync(at).isDirectory()) at = path.dirname(at);
    let rootDir = at;
    for (let i = 0; i < 40; i++) {
      if (fs.existsSync(path.join(at, ".git"))) { rootDir = at; break; }
      const up = path.dirname(at);
      if (up === at) break;
      at = up;
    }
    return rootDir;
  } catch { return null; }
}

/** The project a workspace belongs to, as a task name: its git root's basename plus a short hash of
 *  the root's path, so every agent working in one repository shares one medium. */
export function projectKey(workspace) {
  const rootDir = projectRoot(workspace);
  if (!rootDir) return null;
  // A home directory (or the filesystem root, or anything above home) is not a project: sessions the
  // app starts with no project report it as their workspace, and keying on it pools UNRELATED sessions
  // into one medium, so one session's sentences would reach another's prompt through the commons.
  // Such a workspace gets no project key; the caller falls back to the session alone.
  try {
    const home = fs.realpathSync(os.homedir());
    if (rootDir === home || home.startsWith(rootDir + path.sep) || rootDir === path.parse(rootDir).root) return null;
  } catch { /* home unreadable: do not guess */ }
  const base = path.basename(rootDir).replace(/[^\w.-]+/g, "-").replace(/^\.+/, "") || "root";
  return `proj-${base.slice(0, 40)}-${crypto.createHash("sha1").update(rootDir).digest("hex").slice(0, 6)}`;
}

export function plans({ limit = 20, turnLimit = 40, now = Date.now() } = {}) {
  const base = root();
  if (!fs.existsSync(base)) return [];
  const tasks = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory() && ident(d.name)).map((d) => {
    const dir = path.join(base, d.name);
    let updated = 0;
    try { updated = fs.statSync(dir).mtimeMs; } catch { /* unreadable: sorts last */ }
    return { task: d.name, dir, updated };
  }).sort((a, b) => b.updated - a.updated).slice(0, Math.min(Math.max(limit, 1), 100));
  return tasks.map(({ task, dir, updated }) => {
    const turns = turnsOf({ task });
    const notes = read({ task, now });
    return { task, updated, marks: notes.marks, open: notes.open, finished: notes.finished, turns: turns.slice(-turnLimit) };
  });
}
