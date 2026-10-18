// opencode-ledger-migrate.mjs — Phase B3: fold an existing task's LOG.jsonl + EOT.md into weft.jsonl ONCE,
// idempotently (by content address). The legacy stores stay on disk as read-compat; the ledger becomes the
// one store. Re-running is a no-op (the ledger's own repeat gate dedups on (schema, block)).
import fs from "node:fs";
import { taskDir } from "./opencode-worknotes.mjs";
import { append, rows, lean, _forget } from "./opencode-ledger.mjs";
import { readLog, blocks } from "./opencode-record.mjs";

const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

export function migrate({ task } = {}) {
  const dir = taskDir(task);
  if (!dir) return { ok: false, gap: "bad-address" };
  let wrote = 0, skipped = 0;
  // 1. the VoidLog rows (LOG.jsonl) → EOTBlock@1 lean rows, keyed by their seq
  for (const l of readLog(task)) {
    const referent = l.target ?? l.referent ?? null;
    if (!referent) { skipped++; continue; }
    const env = lean(task, { layer: "record", ins: [referent], con: l.parent != null ? [[referent, "follows", String(l.parent)]] : [], eva: l.verdict === "green" ? [] : [["con", 0]], clause: l.id ?? "" });
    const r = append(task, {
      schema: "EOTBlock@1", op: l.verdict === "green" ? "ADMIT" : "REC", task, referent, ...env,
      block: `log:${l.seq}`, dmd: true,
      m: { verdict: l.verdict, judge: l.judge, exitCode: l.testExitCode, check: l.check ?? null, id: l.id ?? null, migratedFrom: "LOG.jsonl" },
    });
    if (r?.skipped) skipped++; else wrote++;
  }
  // 2. the EOT blocks (EOT.md) → EOTBlock@1 lean rows, keyed by block id (idempotent)
  for (const b of blocks(task)) {
    const env = lean(task, { layer: "record", ins: [b.referent], con: b.supersedes !== "none" ? [[b.referent, "supersedes", b.supersedes]] : [], clause: b.id });
    const r = append(task, {
      schema: "EOTBlock@1", op: b.supersedes !== "none" ? "REC" : "ADMIT", task, referent: b.referent, ...env,
      block: `eot:${b.id}`, dmd: true,
      m: { verdict: "green", delta: b.delta, check: b.check, id: b.id, date: b.date, migratedFrom: "EOT.md" },
    });
    if (r?.skipped) skipped++; else wrote++;
  }
  _forget();
  return { ok: true, task, wrote, skipped, ledgerRows: rows(task).length };
}

// ── B2 PROJECTIONS: EOT.md / LOG.jsonl rendered FROM the ledger (read-compat) ──
const HEADER = "# EOT log\n\nAppend-only. Current state = fold(log), last-wins per referent. A block exists only because its check exited 0 (EVA admitted it).\n\n";

/** The EOT.md text, projected from the ledger's admitted blocks (last-wins per referent). */
export function renderEot({ task } = {}) {
  const cur = new Map();
  for (const r of rows(task, { schema: "EOTBlock@1" })) {
    if (r.op !== "ADMIT" && r.op !== "REC") continue;
    const b = r.m ?? {};
    if (b.verdict && b.verdict !== "green") continue;
    cur.set(r.referent, r);
  }
  const body = [...cur.values()].map((r) => {
    const b = r.m ?? {};
    const delta = Array.isArray(b.delta) && b.delta.length ? b.delta.join(" ") : (b.check ?? "");
    return [
      `### ${b.id ?? r.id} · ${b.date ?? ""} · referent: \`${r.referent}\``,
      `supersedes: ${b.prior ?? "none"}`,
      `+ ${oneLine(delta)}`,
      `check: \`${oneLine(b.check ?? "")}\``,
      `◼ EOT`, "", "",
    ].join("\n");
  });
  return HEADER + body.join("\n");
}

/** The LOG.jsonl text, projected from the ledger's EOTBlock rows (every verdict, in order). */
export function renderLog({ task } = {}) {
  return rows(task, { schema: "EOTBlock@1" }).map((r) => JSON.stringify({
    seq: r.seq ?? null, schema: "VoidLog@1", action: r.op, target: r.referent, by: r.m?.by ?? null,
    verdict: r.m?.verdict ?? null, judge: r.m?.judge ?? null, testExitCode: r.m?.exitCode ?? null, id: r.m?.id ?? null,
    basis: (r.m?.delta ?? [])[0] ?? r.m?.check ?? "", migratedFrom: r.m?.migratedFrom ?? "ledger",
  })).join("\n");
}
