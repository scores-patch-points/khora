// opencode-cost-gate.mjs — THE BREAK-EVEN GATE for a compaction cut.
//
// A cut that rewrites the head of the request throws away the provider's cached prefix: the tokens that were
// being read at the cache-read price are billed again at the (cache-write or uncached) price. So a cut is not
// "fewer tokens, therefore cheaper". It pays only when the tokens it keeps out of the remaining calls cost more
// than the cache it burns. Measured 2026-10-16 (see memory context-reduction-cost-facts): cache reads are 2% of
// uncached input on deepseek/muse and 10% on claude-sonnet, so a naive cut can cost up to ~50x what it saves.
//
// Two arms for one ask, priced over the R calls still to come in it:
//   keep  the history rides as it is.   H tokens per call, at the cache-read price once cached.
//   cut   the history is replaced by a note of N tokens. N per call, but the head changed, so the note is
//         re-billed at the write price on its first call.
//
//   cost(arm) = R · tokens(arm) · p_cr  +  uncached(arm) · (p_w − p_cr)
//   keep: tokens = H,  uncached = H when the cache is cold or the last arm was a cut (a flip rebuilds the
//         history from nothing), else 0.
//   cut:  tokens = N,  uncached = N (the note changes every ask; it is re-billed whether the cache is warm or not).
//   FIRE the cut iff cost(cut) < cost(keep).
//
// Warm, after a keep, this is exactly the inequality in the memory note:
//   (H − N) · R · p_cr  >  N · (p_w − p_cr)
// Cold, the cache is already gone: the cut wins whenever it removes anything (H > N).
//
// HORIZON: one ask. Later asks would also carry the saved tokens, which only favours the cut, so the gate is
// conservative toward keeping. That is deliberate: a wrong cut costs ~50x what a wrong keep does.
// UNPRICED: a provider with no cache discount (cache price absent or zero) has p_cr = p_w = p_in, so the penalty
// term vanishes and the gate fires whenever H > N.
// UNDECIDABLE: a missing quantity is "ungated" (the old behaviour), disclosed in `basis`, never guessed.
//
// PURE of any model and of the filesystem. The decision is returned whole so the caller can log it as an EOT event.
export const COST_GATE_SCHEMA = "OpenCodeCostGate@1";
const CHARS_PER_TOKEN = 4;
const num = (x) => (Number.isFinite(Number(x)) && x !== null && x !== "" ? Number(x) : null);
const usd = (tokens, perMtok) => (tokens * perMtok) / 1_000_000;

/** Price both arms; return the decision and every quantity it was made from. */
export function breakEven({ removedChars, noteChars, remainingCalls = 1, priceIn, priceCacheRead, priceCacheWrite, cold = false, lastArm = null } = {}) {
  const removed = num(removedChars), note = num(noteChars), pin = num(priceIn);
  if (removed === null || removed <= 0 || note === null || note < 0 || pin === null || pin <= 0) {
    const missing = [removed === null || removed <= 0 ? "removedChars" : null, note === null || note < 0 ? "noteChars" : null, pin === null || pin <= 0 ? "priceIn" : null].filter(Boolean);
    return { schema: COST_GATE_SCHEMA, decided: false, fire: true, arm: "cut", basis: `ungated: ${missing.join(", ")} not given — the cut proceeds as before`, inputs: { removedChars, noteChars, priceIn } };
  }
  const pcrRaw = num(priceCacheRead), pwRaw = num(priceCacheWrite);
  const cached = pcrRaw !== null && pcrRaw > 0 && pcrRaw < pin;
  const pcr = cached ? pcrRaw : pin;
  const pw = cached ? (pwRaw !== null && pwRaw > 0 ? Math.max(pwRaw, pcr) : pin) : pin;
  const R = Math.max(1, Math.round(num(remainingCalls) ?? 1));
  const H = removed / CHARS_PER_TOKEN;
  const N = note / CHARS_PER_TOKEN;
  const keepUncached = cold || lastArm === "cut" ? H : 0;
  const cutUncached = N;
  const costKeep = usd(R * H, pcr) + usd(keepUncached, pw - pcr);
  const costCut = usd(R * N, pcr) + usd(cutUncached, pw - pcr);
  const fire = costCut < costKeep;
  const margin = costKeep - costCut;
  const basis = !cached
    ? `no cache discount priced: ${fire ? "the cut removes" : "the cut would not remove"} tokens (${Math.round(H)} → ${Math.round(N)})`
    : fire
      ? `cut saves $${margin.toExponential(2)} over ${R} call(s): ${Math.round(H - N)} tokens kept out at $${pcr}/M outweigh re-billing ${Math.round(N)} at $${pw}/M${cold ? " (cache cold)" : lastArm === "cut" ? " (last arm was a cut)" : ""}`
      : `cut refused: it would cost $${(-margin).toExponential(2)} more over ${R} call(s) — re-billing ${Math.round(N)} tokens at $${pw}/M burns more cache than the ${Math.round(H - N)} tokens kept out save at $${pcr}/M`;
  return {
    schema: COST_GATE_SCHEMA, decided: true, fire, arm: fire ? "cut" : "keep", basis, margin, costKeep, costCut,
    inputs: { H: Math.round(H), N: Math.round(N), R, pin, pcr, pw, cached, cold: !!cold, lastArm },
  };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/**
 * Per-session bookkeeping for the gate: when the cache last saw this session (cold?), how many calls an ask
 * usually takes (the R of the inequality), and which arm this ask already took. The arm is decided ONCE, at the
 * ask's first call, and reused: switching arms mid-ask would rewrite the prefix that call one just wrote.
 */
export function makeGateTracker({ ttlMs = 300_000, defaultCalls = 4, maxSessions = 500 } = {}) {
  const sessions = new Map();
  return {
    observe({ session, ask, now = Date.now() }) {
      const key = String(session ?? "");
      let s = sessions.get(key);
      if (!s) {
        if (sessions.size >= maxSessions) sessions.delete(sessions.keys().next().value);
        s = { ask: null, calls: 0, hist: [], lastAt: null, lastArm: null, arm: null };
        sessions.set(key, s);
      }
      const askKey = String(ask ?? "");
      const first = s.ask !== askKey;
      const cold = s.lastAt === null ? true : now - s.lastAt > ttlMs;
      if (first) {
        if (s.ask !== null) s.hist.push(s.calls);
        s.ask = askKey; s.calls = 1; s.arm = null;
      } else s.calls += 1;
      s.lastAt = now;
      const recent = s.hist.slice(-5);
      const est = recent.length >= 2 ? Math.max(1, Math.round(median(recent))) : defaultCalls;
      return { first, cold: first ? cold : false, calls: s.calls, remainingCalls: Math.max(1, est - s.calls + 1), callsSource: recent.length >= 2 ? `median of ${recent.length} earlier asks` : "assumed", lastArm: s.lastArm, arm: s.arm };
    },
    settle({ session, arm }) {
      const s = sessions.get(String(session ?? ""));
      if (s) { s.arm = arm; s.lastArm = arm; }
    },
    size: () => sessions.size,
  };
}
