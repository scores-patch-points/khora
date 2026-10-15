// opencode-look-worker.mjs — LOOK, off the proxy's event loop.
//
// repo-look's index is a pure function of a worktree's files, and building it
// reads thousands of them (2,251 files in 2.2 s on khora). That must never run
// on the proxy's own loop, so this worker holds one workspace's index and
// answers looks over messages. The organ itself (native/organs/repo-look.js) is
// untouched: this file only hosts it.
import { parentPort, workerData } from "node:worker_threads";
import { indexWorktree, look } from "./native/organs/repo-look.js";

const started = Date.now();
const index = indexWorktree(workerData.root);
parentPort.postMessage({ ready: true, gap: index.gap ?? null, files: index.N ?? 0, ms: Date.now() - started });

parentPort.on("message", ({ id, ask, limit }) => {
  if (index.gap) return parentPort.postMessage({ id, gap: index.gap });
  const r = look({ index, ask, limit });
  parentPort.postMessage({
    id,
    named: r.named,
    gaps: r.gaps,
    candidates: r.candidates.map((c) => ({ path: c.path, named: c.named, score: c.score, matches: c.matches.slice(0, 3).map((m) => ({ word: m.word, line: m.line })) })),
    N: r.N,
    ofRanked: r.ofRanked,
  });
});
