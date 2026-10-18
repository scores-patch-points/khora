// scripts/opencode-ledger-shadow.mjs — the shadow pass for the ledger checker: replay every settled
// task's turns through checkAnswer (turn n judged against turns < n) and report what it would have
// flagged, on REAL sessions, before trusting the wired display. Measurement only: reads the
// worknotes medium, writes nothing, touches no turn.
//
// Usage:
//   FOLD_WORKNOTES_DIR=~/.fold/worknotes \
//   FOLD_ENG_PRIOR_DIR=…/Zenodotus/derived-priors/engineering-priors FOLD_POS_PRIOR=…/janus/priors/pos-eng.json \
//   node --preserve-symlinks --preserve-symlinks-main scripts/opencode-ledger-shadow.mjs [--turns 25] [--samples 8]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { turnsOf } from "../opencode-worknotes.mjs";
import { checkAnswer } from "../opencode-ledger-check.mjs";
import { loadRegister } from "../opencode-predigest.mjs";

const arg = (name, d) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const CAP = arg("turns", 25);
const SAMPLES = arg("samples", 8);
const root = process.env.FOLD_WORKNOTES_DIR ?? path.join(os.homedir(), ".fold", "worknotes");

if (loadRegister().gap) { console.error(`register gap: ${JSON.stringify(loadRegister().gap)} — set FOLD_ENG_PRIOR_DIR/FOLD_POS_PRIOR`); process.exit(1); }

const tasks = fs.existsSync(root) ? fs.readdirSync(root).filter((t) => fs.statSync(path.join(root, t)).isDirectory()) : [];
let turns = 0, replays = 0, retold = 0, fresh = 0, contested = 0, flagTurns = 0;
const samples = [], perTask = [];
for (const task of tasks) {
  const all = turnsOf({ task }).filter((t) => String(t.text ?? "").trim().length >= 40);
  if (all.length < 2) continue;
  const seq = all.sort((a, b) => (Number(a.n) || 0) - (Number(b.n) || 0)).slice(-CAP);
  turns += seq.length;
  let tFlags = 0;
  for (let i = 1; i < seq.length; i++) {
    const r = checkAnswer({ turns: seq.slice(0, i), text: seq[i].text, capTurns: CAP });
    if (!r.ok) { console.error(`check gap on ${task} turn ${seq[i].n}: ${r.gap}`); continue; }
    replays++;
    retold += r.summary.retold;
    fresh += r.summary.new;
    if (r.summary.contested > 0) {
      contested += r.summary.contested;
      flagTurns++;
      tFlags += r.summary.contested;
      if (samples.length < SAMPLES)
        samples.push({ task, n: seq[i].n, agent: seq[i].agent, detail: r.flags[0].detail, text: seq[i].text.slice(0, 300) });
    }
  }
  if (tFlags) perTask.push(`${task}: ${tFlags}`);
}
console.log(`shadow over ${tasks.length} task(s): ${turns} turn(s), ${replays} replayed judgment(s)`);
console.log(`would-have-flagged: ${flagTurns} turn(s) with ${contested} contest(s) — regions: ${perTask.join(" · ") || "none"}`);
console.log(`retold: ${retold} · new: ${fresh} (of ${replays} turn(s) judged)`);
for (const s of samples) console.log(`\n— ${s.task} · turn ${s.n} (${String(s.agent).slice(0, 10)})\n  flag: ${s.detail}\n  answer: ${s.text.replace(/\s+/g, " ").slice(0, 240)}`);
