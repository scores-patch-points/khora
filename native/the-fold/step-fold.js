// step-fold.js — a long agent loop's window, bounded and still oriented. Pure: no fs, no model, no clock.
//
// The loop this serves sends each turn the task plus the LAST action's result (sandboxed-agent.js) or the whole
// transcript (a chat-history loop). The first forgets its own steps and re-reads what it just read; the second
// grows with every step. Measured on a regex-engine task (197 differential cases, six phases, same model):
// whole history ~64k input tokens/step; last-result-only re-read files 329 times against 8 writes and stalled;
// receipts + a bounded view of the files the loop touched reached 197/197 at ~22k tokens/step.
//
// So a turn carries three things, each bounded: one receipt per earlier step (what was done, how it ended), the
// CURRENT bytes of the files touched (the medium, as it is now, newest last, capped), and the last result in full.

export const VIEW_CHARS = Number(process.env.FOLD_AGENT_VIEW_CHARS ?? 8000);
export const RECEIPT_LINES = Number(process.env.FOLD_AGENT_RECEIPTS ?? 14);

const squash = (t, n) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** One line per round: {turn, action, path, contentChars, ok, output, gap}. Newest RECEIPT_LINES kept, the rest counted. */
export function receiptsOf(rounds = [], max = RECEIPT_LINES) {
  const line = (r) => {
    if (r.gap && !r.action) return `step ${r.turn}: reply was not a recognized action`;
    if (r.gap) return `step ${r.turn}: ${r.action} ${r.path ?? ""} refused (${squash(r.gap.reason ?? r.gap.kind, 90)})`;
    if (r.action === "list") return `step ${r.turn}: listed ${r.files?.length ?? 0} file(s)`;
    if (r.action === "read") return `step ${r.turn}: read ${r.path} (${r.contentChars} chars)`;
    if (r.action === "write") return `step ${r.turn}: wrote ${r.path} (${r.contentChars} chars)`;
    if (r.action === "run") return `step ${r.turn}: ran code, ${r.ok ? "ok" : "failed"}: ${squash(r.output, 120) || "(no output)"}`;
    return `step ${r.turn}: ${r.action}`;
  };
  const shown = rounds.slice(-max).map(line);
  const older = rounds.length - shown.length;
  return [...(older > 0 ? [`(${older} earlier step(s) not listed)`] : []), ...shown].join("\n");
}

/** Current bytes of the files the loop touched, newest touch last, within `cap` chars (the newest always fits, clipped). */
export function workspaceView(files, rounds = [], cap = VIEW_CHARS) {
  const order = [];
  for (const r of rounds) if ((r.action === "read" || r.action === "write") && r.path && files.has(r.path) && !r.gap) { const i = order.indexOf(r.path); if (i >= 0) order.splice(i, 1); order.push(r.path); }
  for (const p of files.keys()) if (!order.includes(p)) order.unshift(p);
  const picked = [];
  let used = 0;
  for (const p of [...order].reverse()) {
    const bytes = files.get(p) ?? "";
    if (picked.length && used + bytes.length > cap) continue;
    picked.push([p, picked.length ? bytes : bytes.slice(0, cap)]);
    used += picked.at(-1)[1].length;
  }
  const names = [...files.keys()];
  const omitted = names.filter((p) => !picked.some(([q]) => q === p));
  return { text: picked.reverse().map(([p, b]) => `--- ${p} ---\n${b}`).join("\n") + (omitted.length ? `\n(not shown: ${omitted.join(", ")} — ACTION: read shows any file)` : ""), omitted };
}

/** The task text for a turn after the first: facts of the situation, nothing the mouth must obey beyond the grammar. */
export function stepTask({ task, rounds, files, lastNote, actionFormat }) {
  const view = workspaceView(files, rounds);
  return [
    task,
    rounds.length ? `Steps so far:\n${receiptsOf(rounds)}` : "",
    files.size ? `Files in the sandbox now (current contents):\n${view.text}` : "",
    lastNote,
    actionFormat,
  ].filter(Boolean).join("\n\n");
}
