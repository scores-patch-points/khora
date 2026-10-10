// gym/handmaidens/iphthime.mjs — THE THIRD: keeps every CLAIM grounded.
//
// Iphthime, the sister Penelope dreamed of — the one who came to her in a
// dream and told her the truth while the suitors pressed. Her duty is the
// record's truthfulness: every law entry (GL-*) that claims a mechanism
// must descend to a real file, and a claimed thread must exist. A law that
// names nothing real is a hallucination — the second suitor.
//
// THE DUTY: cross-check the EOT (GLAUCA-EOT.md) against the actual
// machinery. A GL-* entry that asserts a thread, an organ, or a seam that
// does not exist in the code is a hallucination (the swarm found one:
// GL-WP-05 asserts a "WPH thread" the spec never grew).
//
// THE SUITOR SHE HOLDS AT BAY: hallucinations that creep in — a claim with
// nothing beneath it (the constitution's Article II, "confabulation, a
// rendered thing with nothing beneath it").
//
// FALSIFYING CONTROL: a law entry whose asserted path actually exists and
// is reported as a hallucination; or a law entry naming a thread that is
// genuinely absent and reported as sound — either proves her wrong.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const EOT = readFileSync(path.join(ROOT, "GLAUCA-EOT.md"), "utf8");
const SPEC = JSON.parse(readFileSync(path.join(ROOT, "gym", "tapestry.spec.json"), "utf8"));
const LEGEND = readFileSync(path.join(ROOT, "gym", "tapestry.legend.json"), "utf8");

// every GL-* id the EOT declares
const declared = new Set([...EOT.matchAll(/^### (GL-[A-Z]+-\d+)\b/gm)].map((m) => m[1]));
// every GL-* id the tapestry threads actually cite
const cited = new Set(SPEC.threads.flatMap((t) => t.refs.filter((r) => /^GL-/.test(r))));

// a thread NAME the EOT asserts (a "thread" mention in a law entry) that the
// spec's threads do not carry
const specThreadNames = new Set(SPEC.threads.map((t) => t.name));
const assertedThreads = [...EOT.matchAll(/\b(?:the )?([A-Z]{2,4}) thread\b/g)].map((m) => m[1]).filter((n) => n !== "EOT");

export function audit() {
  // 1. a law that cites a GL id no thread weaves — its enforcement has no
  //    seat on the cloth (the reverse of check-tapestry's REF, which is one-way)
  const uncited = [...declared].filter((id) => !cited.has(id)).sort();
  // 2. a thread the laws assert that the spec never grew
  const ghostThreads = [...new Set(assertedThreads)].filter((n) => !specThreadNames.has(n));
  // 3. a law whose claim has no evidence path (a hallucination marker)
  const noPath = [...EOT.matchAll(/^### (GL-[A-Z]+-\d+)[^\n]*\n- pipeline: [^\n]*\n- status: [^\n]*\n- evidence: ([^\n]*)/gm)]
    .filter((m) => !/\.mjs|\.js|\.json|\.md|measured|:\d+/.test(m[2]))
    .map((m) => m[1]);
  return {
    schema: "Handmaiden@1",
    member: "iphthime",
    duty: "keep every claim grounded in a real thing",
    suitor: "hallucinations that creep in",
    declared: declared.size,
    cited: cited.size,
    uncited,           // law entries no thread weaves
    ghostThreads,      // threads asserted but never grown
    noPath,            // law entries with no evidence path
    ok: uncited.length === 0 && ghostThreads.length === 0,
    falsifying: "a grounded law reported as a hallucination, or an ungrounded law reported as sound",
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const r = audit();
  console.log(JSON.stringify(r, null, 1));
  process.exit(r.ok ? 0 : 1);
}