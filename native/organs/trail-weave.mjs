// organs/trail-weave.mjs — Wilson's deposits, handed to Penelope to weave into the shared log (pharos).
// Handle: Wilson (the environment is the medium) under Grassé (the stigmergic log). The weaver is Penelope.
//
// Before this file the kernel trails (kernel/stigmergy.js) were persisted only in each organ's own JSON file
// (current-facts' environment file, hard-read's learned file, the notebook's swarm-trails.json). Here every
// deposit is ALSO sent as a mark to Penelope's mark door, and she is the only hand that writes it to pharos
// (penelope organs/weave-mark.mjs: bylined, witnessed, kind declared as an entry, or refused). The organs' own
// files stay as they were: the entry in pharos is a second, shared record, not yet the source the order is read from.
//
// khora knows Penelope only by an ADDRESS, the way it knows the mouth (PENELOPE.md: nothing in native/ imports
// penelope as a library). It does not know pharos at all.
//   address = $PENELOPE_WEAVE_URL (e.g. http://127.0.0.1:11439). Unset: the sink is OFF and says so (status()).
// THERE IS NO WAY AROUND HER. When she is unreachable or refuses, the deposit is not written to pharos by any
// other path: it stays in the organ's own file and is COUNTED here (unreachable / refused, with the last reason).
// A deposit must never break or slow a read: sends are queued and awaited by no caller; after an unreachable send
// no further send is tried for `retryMs` ($KHORA_WEAVE_RETRY_MS, default 60000; an unmeasured typed constant).
//
// THE MARK (Penelope's WeaveMark@1), kind `trail-deposit`:
//   cell  SIG·Ground   a mark left in the ground for whoever comes next. A proposal of this file, not measured.
//   addr  trail:<head>
//   body  { head, route, ok, ms, at, organ, veto? }
//   witness { how: "observed" ... }  the organ tried the route and read its outcome; Penelope records this, she
//                                     does not re-verify it
//   log   $KHORA_WEAVE_LOG, default "khora"
import { STIGMERGY_SCHEMA, deposit } from "../kernel/stigmergy.js";

export const TRAIL_KIND = "trail-deposit";
export const TRAIL_CELL = "SIG·Ground";
const WHY = "one resolution attempt left in the environment by an organ: which route was tried for which head, whether it resolved, and what it cost";
const env = (k) => (typeof process !== "undefined" ? process.env?.[k] : undefined);

const state = { on: false, why: "not configured", url: null, sent: 0, woven: 0, refused: 0, unreachable: 0, skipped: 0, lastReason: null };
let cfg = { url: null, log: "khora", retryMs: 60000, fetch: null, now: () => Date.now() }, downUntil = 0, chain = Promise.resolve();

/** configure({ url, log, retryMs, fetch, now }) -> status. Called once at load from the environment; tests call it again. */
export function configure(o = {}) {
  const url = (o.url ?? env("PENELOPE_WEAVE_URL") ?? "").replace(/\/+$/, "") || null;
  cfg = { url, log: o.log ?? env("KHORA_WEAVE_LOG") ?? "khora", retryMs: Number(o.retryMs ?? env("KHORA_WEAVE_RETRY_MS") ?? 60000), fetch: o.fetch ?? globalThis.fetch ?? null, now: o.now ?? (() => Date.now()) };
  downUntil = 0; chain = Promise.resolve();
  Object.assign(state, { on: Boolean(url && cfg.fetch), why: !url ? "PENELOPE_WEAVE_URL is not set: deposits stay in the organs' own files only" : !cfg.fetch ? "no fetch in this runtime" : "sending to Penelope", url, sent: 0, woven: 0, refused: 0, unreachable: 0, skipped: 0, lastReason: null });
  return status();
}

/** markOf(entry, organ) -> the WeaveMark@1 body sent for one deposit. Pure. */
export function markOf(entry, organ) {
  const head = String(entry?.head ?? "");
  return {
    by: `khora.${String(organ).replace(/[^A-Za-z0-9._-]/g, "-")}`, log: cfg.log, kind: TRAIL_KIND, cell: TRAIL_CELL, addr: `trail:${head}`,
    body: { head, route: String(entry?.route ?? ""), ok: Boolean(entry?.ok), ms: Number(entry?.ms ?? 0), at: Number(entry?.at ?? 0), organ: String(organ), ...(entry?.veto ? { veto: true } : {}) },
    basis: { schema: STIGMERGY_SCHEMA },
    witness: { how: "observed: the organ tried this route for this head and read its outcome" },
    declare: { why: WHY },
  };
}

/** sendDeposit(entry, { organ }) -> void. Queues one send; never throws, never awaited by the caller. */
export function sendDeposit(entry, { organ = "unknown" } = {}) {
  if (!state.on) return;
  const mark = markOf(entry, organ);
  chain = chain.then(async () => {
    if (cfg.now() < downUntil) { state.skipped += 1; return; }
    state.sent += 1;
    try {
      const r = await cfg.fetch(`${cfg.url}/v1/weave/mark`, { method: "POST", headers: { "content-type": "application/json", "x-er7-surface": "khora", "x-er7-caller": mark.by }, body: JSON.stringify(mark) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { state.woven += 1; return; }
      state.refused += 1; state.lastReason = `${r.status} ${j.reason ?? j.error ?? "refused"}`;
      if (r.status === 503) downUntil = cfg.now() + cfg.retryMs; // her loom is off: do not ask again for a while
    } catch (e) { state.unreachable += 1; state.lastReason = String(e?.cause?.code ?? e?.message ?? e); downUntil = cfg.now() + cfg.retryMs; }
  });
}

/** depositLogged(trails, entry, organ) -> new trails. The kernel's pure deposit, plus the same deposit sent to
 *  Penelope when her address is set. This is the one call an organ makes; the kernel stays pure. */
export function depositLogged(trails, entry, organ) {
  const at = entry?.at ?? Date.now();
  sendDeposit({ ...entry, at }, { organ });
  return deposit(trails, { ...entry, at });
}

/** flush() -> resolves when every queued send has settled (tests, and a caller about to exit). */
export const flush = () => chain;
export const status = () => ({ ...state });

configure();
