// opencode-weft-record.mjs — an agent's settled turns, predigested, appended to THE WEFT STORE (the EOT masterfile).
// The raw bytes stay where they are (<task>/<agent>.turns.md, written by the door); the store keeps only the DISTINCTIONS THAT MAKE A
// DIFFERENCE (weft-lean.mjs): INS the beings a turn names, CON the relations it states at a byte, EVA only where one is negated.
// Every CON's `at` is an ABSOLUTE byte offset into turns.md, so a record re-expands to the sentence it came from (weft-lean `expand`).
//   key   = <task>/<agent>.turns.md@<answer byte offset>   (a turn already in the store is skipped; a rerun resumes)
//   store = $FOLD_WEFT_DIR, else ~/.fold/weft              (one store for every task; FOLD_WEFT=0 turns it off)
// Fails open: the store never blocks a turn. A missing prior is a typed gap, not a silent bare read.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openStore, keyOf } from "./native/the-fold/weft-store.mjs";
import { predigest, loadRegister } from "./opencode-predigest.mjs";

// a test (or any caller) that points the worknotes elsewhere gets a sibling store, never the user's own
export const weftDir = () => process.env.FOLD_WEFT_DIR ?? (process.env.FOLD_WORKNOTES_DIR ? `${process.env.FOLD_WORKNOTES_DIR.replace(/[\\/]+$/, "")}.weft` : path.join(os.homedir(), ".fold", "weft"));

/** One writer at a time per store: weft-store names a segment by count+1, so two concurrent appends would collide. O_EXCL lock, stale after 10s. */
function withLock(dir, fn) {
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, ".lock");
  for (let i = 0; i < 400; i++) {
    try { fs.writeFileSync(lock, String(process.pid), { flag: "wx" }); break; }
    catch (e) {
      if (e.code !== "EEXIST") throw e;
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 10_000) fs.rmSync(lock, { force: true }); } catch { /* raced */ }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
    }
    if (i === 399) throw new Error("weft store lock timeout");
  }
  try { return fn(); } finally { fs.rmSync(lock, { force: true }); }
}

/** Where each turn's ANSWER starts in the turns file, in bytes. Sections are ordered, so each search moves forward. */
function answerOffsets(text, turns) {
  const out = new Map(); let pos = 0;
  const heads = turns.map((t) => { const i = text.indexOf(`## turn ${t.n}\n`, pos); if (i >= 0) pos = i + 1; return i; });
  turns.forEach((t, k) => {
    if (heads[k] < 0) return;
    const end = heads.slice(k + 1).find((h) => h >= 0) ?? text.length;
    const answer = t.answer || "(no text reply)";
    const rel = text.slice(heads[k], end).lastIndexOf(answer);
    if (rel >= 0) out.set(t.n, { chars: heads[k] + rel, answer });
  });
  return out;
}

export function recordTurnsToWeft({ task, agent, turns = [], file, declared = new Set(), dir = weftDir() } = {}) {
  if (process.env.FOLD_WEFT === "0") return { skipped: "off" };
  // a test run that has pointed neither the store nor the worknotes elsewhere must never write the user's own store
  if (process.env.NODE_TEST_CONTEXT && !process.env.FOLD_WEFT_DIR && !process.env.FOLD_WORKNOTES_DIR) return { skipped: "test-run" };
  if (!file || !turns.length) return { skipped: "nothing" };
  const reg = loadRegister(); if (reg.gap) return { gap: reg.gap };
  const text = fs.readFileSync(file, "utf8");
  const addr = `${task}/${agent}.turns.md`, offs = answerOffsets(text, turns);
  return withLock(dir, () => {
    const store = openStore(dir), have = store.keys(), base = store.count(), lean = [];
    for (const t of turns) {
      const o = offs.get(t.n); if (!o) continue;
      const ws = Buffer.byteLength(text.slice(0, o.chars));
      if (have.has(`${addr}@${ws}`)) continue;
      const d = predigest(o.answer, { declared });
      const abs = (c) => ws + Buffer.byteLength(o.answer.slice(0, c));
      lean.push({ a: addr, l: "turn", g: "en", w: ws, ws, s: base + lean.length, ins: d.ins.map(([s]) => s), seg: [],
        con: d.con.map(([e1, label, e2, at]) => [e1, label, e2, abs(at), 0, 0, `t${t.n}`]),
        eva: d.con.flatMap((c, i) => (c[4] ? [["con", i]] : [])) });
    }
    const written = store.append(lean);
    return { ok: true, appended: lean.length, segment: written ? path.basename(written) : null };
  });
}
export { keyOf };
