#!/usr/bin/env node
// cli/paraphrase-read.mjs — the khora runner of the paraphrase seam (2026-11-15).
// Reads every `text` entry in the shared log that has no `text-reading` yet, reads
// it with khora's own readFull, and weaves one `text-reading` per text through
// khora's own door (cli/pharos-door.mjs). Rerunning adds nothing. Khora calls no
// other repo; whoever needs the rows reads them from the log.
//
//   log name  $PHAROS_LOG       log directory  $PHAROS       pointer  $KHORA_PHAROS_JSON
//   priors    $KHORA_PRIORS_DIR (default ~/Documents/janus/priors, as the ledger's runs set it)
//
// Exit codes: 0 every text has a reading; 1 the door is off (nothing read, nothing
// written); 2 some text could not be read or its reading was refused (each is
// printed; a rerun retries it, since no entry was written in its place).
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDoor } from "./pharos-door.mjs";
import { TEXT_KIND, READING_KIND, READING_CELL, READING_WHY, toRead, readingInput } from "../native/organs/text-reading.mjs";

/** readTexts({ door, readFull }) -> { on, why, texts, read, woven, failed: [{ addr, why }], skipped }. readFull is injected so the loop is testable. */
export async function readTexts({ door, readFull }) {
  if (!door?.on) return { on: false, why: door?.why ?? "no door", texts: 0, read: 0, woven: 0, failed: [], skipped: [] };
  const texts = door.fold({ kind: TEXT_KIND }), readings = door.fold({ kind: READING_KIND });
  // a failed read of the log is a failure, never an empty log (review fix)
  if (!texts || !readings) return { on: true, why: `could not read the log: ${door.counts.lastReason}`, texts: 0, read: 0, woven: 0, failed: [{ addr: null, why: "fold failed" }], skipped: [] };
  const { todo, skipped } = toRead(texts, readings);
  if (todo.length && !door.declare(READING_KIND, READING_CELL, READING_WHY)) {
    return { on: true, why: `could not declare ${READING_KIND}: ${door.counts.lastReason}`, texts: texts.length, read: 0, woven: 0, failed: todo.map((t) => ({ addr: t.addr, why: "kind not declared" })), skipped };
  }
  let read = 0, woven = 0; const failed = [];
  for (const item of todo) {
    let R;
    try { R = await readFull(item.text, { language: item.language }); read += 1; }
    catch (e) { failed.push({ addr: item.addr, why: `readFull threw: ${e?.message ?? e}` }); continue; }
    const e = door.weave(readingInput(item, R));
    if (e) woven += 1; else failed.push({ addr: item.addr, why: `refused: ${door.counts.lastReason}` });
  }
  return { on: true, why: door.why, texts: texts.length, read, woven, failed, skipped };
}

async function main() {
  const door = await openDoor({ log: process.env.PHAROS_LOG ?? null, dir: process.env.PHAROS || null });
  if (!door.on) { console.error(`paraphrase-read: the door is off: ${door.why}`); process.exit(1); }
  process.env.KHORA_PRIORS_DIR ||= path.join(os.homedir(), "Documents", "janus", "priors");
  const { readFull } = await import("../native/reading-full.js");   // after the priors dir is set: the reader reads it at load
  const r = await readTexts({ door, readFull });
  const line = JSON.stringify({ log: door.log, texts: r.texts, read: r.read, woven: r.woven, failed: r.failed, skipped: r.skipped });
  process.stdout.write(line + "\n", () => process.exit(r.failed.length || r.skipped.length ? 2 : 0));   // flush before exit: the reader may hold handles open
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
