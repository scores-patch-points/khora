// gym/handmaidens/eurycleia.mjs — THE NURSE: keeps every thread NAMED.
//
// Penelope's old nurse, who alone recognized Odysseus by the scar and held
// the house together while the loom worked. Her duty is the record's
// completeness: a generation tool that is not named by any thread is a
// forgotten duty — one of the suitors at the door. She checks that the
// tapestry names the tools, and names the unnamed.
//
// THE DUTY: run check-tapestry, and list every generation file the cloth
// does not cover — an organ, adapter, door, or gym script that draws, and
// is named by no thread.
//
// THE SUITOR SHE HOLDS AT BAY: forgetfulness of duties — a process change
// (an organ, adapter, door/route, rung) that lands without the record
// changing with it (penelope's standing law, CLAUDE.md).
//
// FALSIFYING CONTROL: a generation tool that IS woven (named by a thread)
// reported as uncovered; or a tool that draws and is covered by no thread
// reported as clean — either proves her wrong.
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const SPEC = JSON.parse(readFileSync(path.join(ROOT, "gym", "tapestry.spec.json"), "utf8"));

// what counts as a generation tool — an organ, adapter, door, or gym script
// under the coverable paths, plus the mouth/voice/steersman layer.
function generationFiles() {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "handmaidens" || e.name === "arrangement-out") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (e.name.endsWith(".mjs") || e.name.endsWith(".js")) out.push(path.relative(ROOT, p));
    }
  };
  for (const d of ["organs", "gym", "mouth"]) walk(path.join(ROOT, d));
  return out;
}

const named = new Set(SPEC.threads.flatMap((t) => t.refs.map((r) => r.split("/").slice(-1)[0])));

// Does this file look like it generates (draws, prompts, or produces text)?
const draws = (rel) => {
  try {
    const src = readFileSync(path.join(ROOT, rel), "utf8");
    return /fetch\(|draw\(|askOllama|runDrawDoor|api\/generate|api\/chat|v1\/(ask|code|build)/.test(src);
  } catch { return false; }
};

export function audit() {
  const files = generationFiles();
  const unnamed = files.filter((f) => {
    const base = f.split("/").slice(-1)[0];
    return !named.has(base) && draws(f);
  });
  return {
    schema: "Handmaiden@1",
    member: "eurycleia",
    duty: "keep every generation thread named",
    suitor: "forgetfulness of duties",
    named: files.length - unnamed.length,
    unnamed,
    ok: unnamed.length === 0,
    falsifying: "a woven generation tool reported unnamed, or an unnamed drawing tool reported clean",
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const r = audit();
  console.log(JSON.stringify(r, null, 1));
  process.exit(r.ok ? 0 : 1);
}