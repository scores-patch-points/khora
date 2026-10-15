// opencode-context.mjs — the door's two reads of an opencode session, each an
// EXISTING organ wired in, not a new one (feedback: read the full stack first).
//
//   lookNote   LOOK (native/organs/repo-look.js, CENNINI.md "the movement"):
//              from the ask's own words, which places in the workspace the ask
//              points at, as addresses. Hosted in a worker per workspace.
//   projectHistory   HOUDINI (the-fold fold-chat-houdini.js, docs/HOUDINI.md):
//              fold ALL the context into the shape the ask needs, at the moment
//              it needs it. Its units are exchanges; the door hands it the
//              session's exchanges and the settled turns as checked records,
//              and it says which ride, which are recalled by a rare anchor,
//              and which become a record gist ("Not shown: N").
//
// Both fail open with a TYPED gap: no workspace, no git, Houdini not on disk,
// a thrown error — the caller then sends nothing and opencode runs as upstream.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IDLE_MS = Number(process.env.FOLD_LOOK_IDLE_MS ?? 10 * 60_000);
const LOOK_TIMEOUT_MS = Number(process.env.FOLD_LOOK_TIMEOUT_MS ?? 800);

// ── look ─────────────────────────────────────────────────────────────────
const workers = new Map(); // root -> { worker, ready, idle, waiting: Map(id → resolve), seq }

function workerFor(root) {
  let w = workers.get(root);
  if (w) return w;
  const worker = new Worker(path.join(HERE, "opencode-look-worker.mjs"), { workerData: { root } });
  w = { worker, ready: false, gap: null, waiting: new Map(), seq: 0, idle: null };
  const drop = () => { clearTimeout(w.idle); workers.delete(root); worker.terminate().catch(() => {}); for (const r of w.waiting.values()) r({ gap: "worker-gone" }); };
  worker.on("message", (m) => {
    if (m.ready) { w.ready = true; w.gap = m.gap; return; }
    w.waiting.get(m.id)?.(m);
    w.waiting.delete(m.id);
  });
  worker.on("error", drop);
  worker.on("exit", drop);
  w.drop = drop;
  workers.set(root, w);
  return w;
}

/**
 * The places the ask points at in `workspace`, as a short addressed note.
 * The first ask of a workspace only STARTS the index (nothing is awaited): a
 * look that would stall the turn is declined and says so (`indexing`).
 */
export async function lookNote({ ask, workspace, limit = 5 } = {}) {
  if (typeof workspace !== "string" || !path.isAbsolute(workspace)) return { gap: "no-workspace" };
  const w = workerFor(workspace);
  clearTimeout(w.idle);
  w.idle = setTimeout(() => w.drop(), IDLE_MS);
  w.idle.unref?.();
  if (!w.ready) return { gap: "indexing" };
  if (w.gap) return { gap: w.gap };
  const id = ++w.seq;
  const answer = await new Promise((resolve) => {
    w.waiting.set(id, resolve);
    w.worker.postMessage({ id, ask, limit });
    setTimeout(() => { if (w.waiting.delete(id)) resolve({ gap: "timeout" }); }, LOOK_TIMEOUT_MS).unref?.();
  });
  if (answer.gap) return { gap: answer.gap };
  if (!answer.candidates.length) return { gap: answer.gaps?.[0]?.kind ?? "nothing-found" };
  const lines = answer.candidates.map((c) => {
    const at = c.matches.map((m) => `${m.word}:${m.line}`).join(" ");
    return `- ${c.path}${c.named ? " (named in the ask)" : ""}${at ? ` — ${at}` : ""}`;
  });
  return {
    note: ["<fold-look>", `Places in this workspace the ask's own words point at (of ${answer.ofRanked} ranked, ${answer.N} files):`, ...lines, "</fold-look>"].join("\n"),
    places: answer.candidates.map((c) => c.path),
  };
}

// ── houdini ──────────────────────────────────────────────────────────────
const HOUDINI_PATH = process.env.FOLD_HOUDINI_PATH ?? path.resolve(HERE, "the-fold-houdini-wired", "fold-chat-houdini.js");
let houdiniModule = null;
async function houdini() {
  if (houdiniModule) return houdiniModule;
  houdiniModule = await import(pathToFileURL(HOUDINI_PATH).href);
  return houdiniModule;
}

const clipText = (text, n) => { const t = String(text ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };

/**
 * exchanges: [{ id, q, a, files?, failed?, open?, chars }] oldest first, the
 * CURRENT ask excluded. Returns { keep, drop, record, plan } where `drop` are
 * exchange ids to leave out of the model's context and `record` is the text
 * that stands in for them (Houdini's own ON RECORD block and its count).
 */
export async function projectHistory({ ask, exchanges } = {}) {
  if (!Array.isArray(exchanges) || exchanges.length === 0) return { gap: "no-history" };
  let mod;
  try { mod = await houdini(); } catch (e) { return { gap: "no-houdini", why: String(e.message).slice(0, 120) }; }
  try {
    const history = exchanges.flatMap((e) => [
      { role: "user", content: e.q },
      { role: "assistant", content: e.a },
    ]);
    // A turn that finished and passed is a CHECKED record (its gist and the
    // places it touched); one that failed or was left open is PINNED — it rides
    // before any other record and is shed last, Houdini's own guard.
    const records = exchanges.map((e, i) => ({
      turn: i + 1,
      gist: clipText(`${e.q} — ${e.a}`, 280),
      refs: (e.files ?? []).slice(0, 4),
      channels: [],
      unsupported: e.failed ? [`${e.failed} tool call${e.failed === 1 ? "" : "s"} failed in this turn`] : [],
      open: e.open ? ["the turn did not finish"] : [],
    }));
    const total = exchanges.reduce((n, e) => n + (e.chars ?? 0), 0);
    const { messages, plan } = mod.houdini(
      { basePrompt: "", summary: { records, language: null }, history, question: String(ask ?? ""), budget: { chars: Math.max(total, 1) } },
      {},
    );
    // Which exchanges ride in the raw suffix and which are recalled whole.
    const rawEx = plan.raw?.exchanges ?? 0;
    const recalled = new Set((plan.recalled ?? []).map((r) => r.at));
    const keep = new Set();
    exchanges.forEach((e, i) => {
      if (i >= exchanges.length - rawEx || recalled.has(2 * i)) keep.add(e.id);
    });
    const record = messages.find((m) => m.role === "system")?.content ?? "";
    return {
      keep: [...keep],
      drop: exchanges.filter((e) => !keep.has(e.id)).map((e) => e.id),
      record,
      plan: { raw: plan.raw, recalled: plan.recalled, gaps: plan.gaps, need: { terms: plan.need?.terms, leans: plan.need?.leans } },
    };
  } catch (e) {
    return { gap: "houdini-threw", why: String(e.message).slice(0, 120) };
  }
}

export function shutdown() {
  for (const w of [...workers.values()]) w.drop();
}
