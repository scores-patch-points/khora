// native/chat/janus-door.mjs — MOUNT JANUS: its organs (the reasoning spiral, kinship) and its own door onto the shared log.
// The ruling (janus pharos-door.mjs, 2026-11-14): no repo reports to another; each writes its OWN entries to the log and reads the
// others' from it. So the chat does not write janus's verdicts for it: a janus verdict is woven through janus's door, with writer
// "janus", by janus's own organs; the chat mounts them and reads the log. A checkout of janus that is not there is a typed gap that
// says how to get it, never a silent degrade (nexus rule 2).
//
//   janus checkout = $JANUS_HOME, else <workspace>/janus (if it has its organs), else ~/Documents/janus
//   the log        = the chat's own (name "fold-demo", dir LOG_DIR): janus's file in it is janus.jsonl, the chat's khora-chat.jsonl
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPIRAL = path.join("native", "organs", "reasoning-spiral.js");
const where = () => [process.env.JANUS_HOME, path.resolve(HERE, "..", "..", "..", "janus"), path.join(os.homedir(), "Documents", "janus")].filter(Boolean);

export function janusHome() { return where().find((d) => fs.existsSync(path.join(d, SPIRAL))) ?? null; }

/** mountJanus({ dir, log }) -> { on, why, home, door, spiral, kinship, rules, lexicon }. Never throws. */
export async function mountJanus({ dir, log = "fold-demo" } = {}) {
  const off = (why) => ({ on: false, why, home: null, door: null, spiral: null, kinship: null, rules: null });
  const home = janusHome();
  if (!home) return off(`no janus checkout found (looked in ${where().join(", ")}): clone scores-patch-points/janus beside khora, or set JANUS_HOME`);
  try {
    const at = (f) => import(pathToFileURL(path.join(home, "native", "organs", f)).href);
    const [{ openDoor }, spiral, kinship] = await Promise.all([at("pharos-door.mjs"), at("reasoning-spiral.js"), at("kinship.js")]);
    const door = await openDoor({ log, ...(dir ? { dir } : {}) });
    if (!door.on) return off(`janus's own pharos door is off: ${door.why}`);
    const lexPath = path.join(home, "priors", "kin-lexicon.json");
    const lexicon = fs.existsSync(lexPath) ? JSON.parse(fs.readFileSync(lexPath, "utf8")) : null;
    return { on: true, why: "open", home, door, spiral, kinship, lexicon, rules: lexicon ? kinship.rulesFromLexicon(lexicon) : null };
  } catch (e) { return off(`could not mount janus at ${home}: ${String(e?.message ?? e).slice(0, 160)}`); }
}
